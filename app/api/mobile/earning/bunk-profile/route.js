/**
 * Bunk Profile API — Submit complete bunk profile + amenities
 * 
 * Full Profile Reward: ₹15 (1500 paise) — requires name+brand, 2 amenities (with photos), 1 offer
 * Per Amenity Reward: ₹3 (300 paise) each — photo required
 * 
 * Amenity types: air_pump, ev_charging, food, 24hr_open, tyre_repair, oil_service, car_wash
 * Expiry: food/tyre/oil → 90d, 24hr → 180d, permanent → no expiry
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'
import { generatePhotoHash } from '@/lib/hashUtils'

const FULL_PROFILE_PAISE = 1500  // ₹15
const AMENITY_PAISE = 300         // ₹3

const AMENITY_EXPIRY_DAYS = {
    air_pump: null,     // permanent
    ev_charging: null,  // permanent
    food: 90,
    '24hr_open': 180,
    tyre_repair: 90,
    oil_service: 90,
    car_wash: null      // permanent
}

const VALID_AMENITIES = Object.keys(AMENITY_EXPIRY_DAYS)

const uploadFile = async (file, folder, userId) => {
    if (!file || typeof file === 'string' || file.size === 0) return null
    const ext = file.name.split('.').pop()
    const fileName = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error } = await supabaseAdmin.storage
        .from('media')
        .upload(fileName, buffer, { contentType: file.type, upsert: true })
    if (error) throw error
    const { data: urlData } = supabaseAdmin.storage.from('media').getPublicUrl(fileName)
    return { url: urlData.publicUrl, buffer }
}

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const formData = await request.formData()

        const place_id = formData.get('place_id')
        const brand = formData.get('brand')
        const display_name = formData.get('display_name')
        const amenities_json = formData.get('amenities')  // JSON array: [{ type, photo_index }]
        const offer_text = formData.get('offer_text')

        if (!place_id) {
            return successResponse('place_id is required', { reward_given: false, reason: 'missing_place_id' })
        }

        // --- Get or create bunk profile ---
        let { data: bunkProfile } = await supabaseAdmin
            .from('bunk_profiles')
            .select('*')
            .eq('place_id', place_id)
            .single()

        if (!bunkProfile) {
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('bunk_profiles')
                .insert({
                    place_id,
                    brand: brand || null,
                    display_name: display_name || null,
                    submitted_by_user_id: user.user_id
                })
                .select()
                .single()

            if (createError) throw createError
            bunkProfile = newProfile
        } else if (brand || display_name) {
            // Update brand/name if provided
            const updates = {}
            if (brand) updates.brand = brand
            if (display_name) updates.display_name = display_name
            await supabaseAdmin
                .from('bunk_profiles')
                .update(updates)
                .eq('id', bunkProfile.id)
        }

        const rewards = []

        // --- Process amenities ---
        let amenitiesAdded = 0
        if (amenities_json) {
            try {
                const amenities = JSON.parse(amenities_json)
                if (Array.isArray(amenities)) {
                    for (const amenity of amenities) {
                        if (!amenity.type || !VALID_AMENITIES.includes(amenity.type)) continue

                        // Check if this amenity already exists for this bunk (non-expired)
                        let existsQuery = supabaseAdmin
                            .from('bunk_amenities')
                            .select('id')
                            .eq('bunk_profile_id', bunkProfile.id)
                            .eq('amenity_type', amenity.type)

                        const expiryDays = AMENITY_EXPIRY_DAYS[amenity.type]
                        if (expiryDays) {
                            existsQuery = existsQuery.gte('expires_at', new Date().toISOString())
                        }

                        const { data: existingAmenity } = await existsQuery.limit(1)
                        if (existingAmenity && existingAmenity.length > 0) continue // Already exists

                        // Upload amenity photo
                        const photoKey = `amenity_photo_${amenity.type}`
                        const photoFile = formData.get(photoKey)
                        if (!photoFile || typeof photoFile === 'string') continue // Photo required

                        const photoResult = await uploadFile(photoFile, 'bunk-amenities', user.user_id)
                        if (!photoResult) continue

                        const photoHash = generatePhotoHash(photoResult.buffer)

                        // Calculate expiry
                        let expiresAt = null
                        if (expiryDays) {
                            expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
                        }

                        // Insert amenity
                        const { data: newAmenity, error: amenityError } = await supabaseAdmin
                            .from('bunk_amenities')
                            .insert({
                                bunk_profile_id: bunkProfile.id,
                                amenity_type: amenity.type,
                                photo_url: photoResult.url,
                                photo_hash: photoHash,
                                submitted_by_user_id: user.user_id,
                                expires_at: expiresAt
                            })
                            .select('id')
                            .single()

                        if (amenityError) {
                            console.error('[BunkProfile] Amenity insert error:', amenityError)
                            continue
                        }

                        amenitiesAdded++

                        // Reward per amenity
                        const amenityReward = await processReward({
                            userId: user.user_id,
                            actionType: 'bunk_amenity',
                            amountPaise: AMENITY_PAISE,
                            referenceType: 'bunk_amenity',
                            referenceId: newAmenity.id,
                            metadata: { amenity_type: amenity.type, place_id }
                        })

                        if (amenityReward.transaction_id) {
                            await supabaseAdmin
                                .from('bunk_amenities')
                                .update({ reward_tx_id: amenityReward.transaction_id })
                                .eq('id', newAmenity.id)
                        }

                        rewards.push({
                            type: 'amenity',
                            amenity_type: amenity.type,
                            reward_given: amenityReward.reward_given,
                            amount_paise: amenityReward.reward_given ? AMENITY_PAISE : 0
                        })
                    }
                }
            } catch (parseErr) {
                console.error('[BunkProfile] Amenity parse error:', parseErr)
            }
        }

        // --- Check full profile completion ---
        // Requires: brand + 2 amenities + 1 offer
        if (!bunkProfile.profile_complete) {
            const { count: amenityCount } = await supabaseAdmin
                .from('bunk_amenities')
                .select('*', { count: 'exact', head: true })
                .eq('bunk_profile_id', bunkProfile.id)

            const { count: offerCount } = await supabaseAdmin
                .from('bunk_offers')
                .select('*', { count: 'exact', head: true })
                .eq('bunk_profile_id', bunkProfile.id)

            const hasBrand = !!(bunkProfile.brand || brand)
            const hasEnoughAmenities = (amenityCount || 0) >= 2
            const hasOffer = (offerCount || 0) >= 1 || !!offer_text

            if (hasBrand && hasEnoughAmenities && hasOffer) {
                // Full profile reward
                const profileReward = await processReward({
                    userId: user.user_id,
                    actionType: 'bunk_full_profile',
                    amountPaise: FULL_PROFILE_PAISE,
                    referenceType: 'bunk_profile',
                    referenceId: bunkProfile.id,
                    metadata: { place_id }
                })

                await supabaseAdmin
                    .from('bunk_profiles')
                    .update({
                        profile_complete: true,
                        reward_tx_id: profileReward.transaction_id
                    })
                    .eq('id', bunkProfile.id)

                rewards.push({
                    type: 'full_profile',
                    reward_given: profileReward.reward_given,
                    amount_paise: profileReward.reward_given ? FULL_PROFILE_PAISE : 0
                })
            }
        }

        return successResponse('Bunk profile updated', {
            bunk_profile_id: bunkProfile.id,
            amenities_added: amenitiesAdded,
            rewards
        })

    } catch (err) {
        console.error('[BunkProfile] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
