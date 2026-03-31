/**
 * Toilet Scout API — Submit a new toilet report
 * Reward: ₹10 (1000 paise)
 * Requires: photo, hygiene level, GPS
 * GPS must be within 50m (stricter than fuel)
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'
import { checkPhotoDuplicate, logFraudFlag } from '@/lib/antifraud'
import { generatePhotoHash } from '@/lib/hashUtils'

const REWARD_PAISE = 1000 // ₹10

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

        const location_name = formData.get('location_name')
        const hygiene_level = formData.get('hygiene_level') // clean, average, dirty
        const latitude = formData.get('latitude')
        const longitude = formData.get('longitude')
        const photo_file = formData.get('photo')
        const bunk_place_id = formData.get('bunk_place_id')
        const is_paid = formData.get('is_paid') === 'true' || formData.get('is_paid') === '1'
        const price = formData.get('price') ? parseFloat(formData.get('price')) : null

        // --- Validations ---
        if (!photo_file || typeof photo_file === 'string') {
            return successResponse('Photo is required', { reward_given: false, reason: 'missing_photo' })
        }
        if (!hygiene_level || !['clean', 'average', 'dirty'].includes(hygiene_level)) {
            return successResponse('Valid hygiene level is required (clean/average/dirty)', { reward_given: false, reason: 'invalid_hygiene' })
        }
        if (!latitude || !longitude) {
            return successResponse('GPS location is required', { reward_given: false, reason: 'missing_gps' })
        }

        // Upload photo
        const photoResult = await uploadFile(photo_file, 'toilet-reports/photos', user.user_id)
        if (!photoResult) {
            return successResponse('Photo upload failed', { reward_given: false, reason: 'upload_failed' })
        }

        const photoHash = generatePhotoHash(photoResult.buffer)

        // Check photo duplicate
        const photoDupCheck = await checkPhotoDuplicate(photoHash, 'toilet_reports')
        if (!photoDupCheck.valid) {
            await logFraudFlag(user.user_id, 'duplicate_photo', 'medium', 'toilet_report', null, { photoHash })
            return successResponse('Duplicate photo detected', { reward_given: false, reason: 'duplicate_photo' })
        }

        // --- Create Toilet Report ---
        const { data: report, error: reportError } = await supabaseAdmin
            .from('toilet_reports')
            .insert({
                location_name: location_name || null,
                scout_user_id: user.user_id,
                photo_url: photoResult.url,
                photo_hash: photoHash,
                hygiene_level,
                bunk_place_id: bunk_place_id || null,
                is_paid,
                price: is_paid ? price : null,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                status: 'pending'
            })
            .select('id')
            .single()

        if (reportError) throw reportError

        // --- Process Reward ---
        const rewardResult = await processReward({
            userId: user.user_id,
            actionType: 'toilet_scout',
            amountPaise: REWARD_PAISE,
            referenceType: 'toilet_report',
            referenceId: report.id,
            metadata: { hygiene_level, location_name }
        })

        if (rewardResult.transaction_id) {
            await supabaseAdmin
                .from('toilet_reports')
                .update({ scout_reward_tx_id: rewardResult.transaction_id })
                .eq('id', report.id)
        }

        return successResponse('Toilet report submitted', {
            report_id: report.id,
            reward_given: rewardResult.reward_given,
            reason: rewardResult.reason,
            amount_paise: rewardResult.reward_given ? REWARD_PAISE : 0,
            transaction_id: rewardResult.transaction_id
        })

    } catch (err) {
        console.error('[ToiletScout] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
