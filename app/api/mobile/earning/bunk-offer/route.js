/**
 * Bunk Offer API — Submit community-spotted offers
 * Reward: ₹5 (500 paise)
 * Auto-expires in 7 days
 * Photo hash required
 * OCR text extracted by mobile client
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'
import { checkPhotoDuplicate, logFraudFlag } from '@/lib/antifraud'
import { generatePhotoHash } from '@/lib/hashUtils'

const REWARD_PAISE = 500 // ₹5
const OFFER_EXPIRY_DAYS = 7

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
        const offer_text = formData.get('offer_text')
        const ocr_text = formData.get('ocr_text')  // OCR-extracted text from mobile
        const photo_file = formData.get('photo')

        if (!place_id) {
            return successResponse('place_id is required', { reward_given: false, reason: 'missing_place_id' })
        }
        if (!offer_text) {
            return successResponse('offer_text is required', { reward_given: false, reason: 'missing_offer_text' })
        }
        if (!photo_file || typeof photo_file === 'string') {
            return successResponse('Photo is required', { reward_given: false, reason: 'missing_photo' })
        }

        // Get bunk profile
        let { data: bunkProfile } = await supabaseAdmin
            .from('bunk_profiles')
            .select('id')
            .eq('place_id', place_id)
            .single()

        if (!bunkProfile) {
            // Create bunk profile if not exists
            const { data: newProfile } = await supabaseAdmin
                .from('bunk_profiles')
                .insert({ place_id, submitted_by_user_id: user.user_id })
                .select('id')
                .single()
            bunkProfile = newProfile
        }

        // Upload photo
        const photoResult = await uploadFile(photo_file, 'bunk-offers', user.user_id)
        if (!photoResult) {
            return successResponse('Photo upload failed', { reward_given: false, reason: 'upload_failed' })
        }

        const photoHash = generatePhotoHash(photoResult.buffer)

        // Photo dedup check
        const dupCheck = await checkPhotoDuplicate(photoHash, 'bunk_offers')
        if (!dupCheck.valid) {
            await logFraudFlag(user.user_id, 'duplicate_photo', 'medium', 'bunk_offer', null, { photoHash })
            return successResponse('Duplicate offer photo detected', { reward_given: false, reason: 'duplicate_photo' })
        }

        // Calculate expiry
        const expiresAt = new Date(Date.now() + OFFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

        // Insert offer
        const { data: offer, error: offerError } = await supabaseAdmin
            .from('bunk_offers')
            .insert({
                bunk_profile_id: bunkProfile.id,
                source: 'community',
                offer_text,
                photo_url: photoResult.url,
                photo_hash: photoHash,
                ocr_text: ocr_text || null,
                submitted_by_user_id: user.user_id,
                expires_at: expiresAt
            })
            .select('id')
            .single()

        if (offerError) throw offerError

        // Process reward
        const rewardResult = await processReward({
            userId: user.user_id,
            actionType: 'bunk_offer_spotted',
            amountPaise: REWARD_PAISE,
            referenceType: 'bunk_offer',
            referenceId: offer.id,
            metadata: { place_id, offer_text }
        })

        if (rewardResult.transaction_id) {
            await supabaseAdmin
                .from('bunk_offers')
                .update({
                    reward_tx_id: rewardResult.transaction_id,
                    wallet_credited: rewardResult.reward_given
                })
                .eq('id', offer.id)
        }

        return successResponse('Bunk offer submitted', {
            offer_id: offer.id,
            expires_at: expiresAt,
            reward_given: rewardResult.reward_given,
            reason: rewardResult.reason,
            amount_paise: rewardResult.reward_given ? REWARD_PAISE : 0,
            transaction_id: rewardResult.transaction_id
        })

    } catch (err) {
        console.error('[BunkOffer] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
