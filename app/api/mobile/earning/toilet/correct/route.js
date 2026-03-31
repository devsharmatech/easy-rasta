/**
 * Toilet Correct API — Submit a correction for a disputed toilet report
 * Reward: ₹10 (1000 paise) to corrector, original scout gets ₹0
 * Requires: new photo
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward, freezeTransaction } from '@/lib/earningEngine'
import { checkPhotoDuplicate } from '@/lib/antifraud'
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

        const original_report_id = formData.get('original_report_id')
        const hygiene_level = formData.get('hygiene_level')
        const latitude = formData.get('latitude')
        const longitude = formData.get('longitude')
        const photo_file = formData.get('photo')

        if (!original_report_id) {
            return successResponse('original_report_id is required', { reward_given: false, reason: 'missing_report_id' })
        }

        // Fetch original
        const { data: originalReport } = await supabaseAdmin
            .from('toilet_reports')
            .select('*')
            .eq('id', original_report_id)
            .single()

        if (!originalReport) {
            return successResponse('Original report not found', { reward_given: false, reason: 'report_not_found' })
        }

        if (originalReport.status !== 'disputed') {
            return successResponse('Report is not disputed', { reward_given: false, reason: 'not_disputed' })
        }

        if (originalReport.scout_user_id === user.user_id) {
            return successResponse('Cannot correct your own report', { reward_given: false, reason: 'self_correction' })
        }

        if (originalReport.corrected_by_user_id) {
            return successResponse('Report already corrected', { reward_given: false, reason: 'already_corrected' })
        }

        if (!photo_file || typeof photo_file === 'string') {
            return successResponse('New photo is required for correction', { reward_given: false, reason: 'missing_photo' })
        }

        if (!hygiene_level || !['clean', 'average', 'dirty'].includes(hygiene_level)) {
            return successResponse('Valid hygiene level required', { reward_given: false, reason: 'invalid_hygiene' })
        }

        // Upload photo
        const photoResult = await uploadFile(photo_file, 'toilet-reports/corrections', user.user_id)
        if (!photoResult) {
            return successResponse('Photo upload failed', { reward_given: false, reason: 'upload_failed' })
        }
        const photoHash = generatePhotoHash(photoResult.buffer)

        // Photo dedup
        const photoDupCheck = await checkPhotoDuplicate(photoHash, 'toilet_reports')
        if (!photoDupCheck.valid) {
            return successResponse('Duplicate photo detected', { reward_given: false, reason: 'duplicate_photo' })
        }

        // Create correction report
        const { data: correctionReport, error: corrError } = await supabaseAdmin
            .from('toilet_reports')
            .insert({
                location_name: originalReport.location_name,
                scout_user_id: user.user_id,
                photo_url: photoResult.url,
                photo_hash: photoHash,
                hygiene_level,
                latitude: parseFloat(latitude || originalReport.latitude),
                longitude: parseFloat(longitude || originalReport.longitude),
                status: 'verified',
                correction_report_id: original_report_id
            })
            .select('id')
            .single()

        if (corrError) throw corrError

        // Update original
        await supabaseAdmin
            .from('toilet_reports')
            .update({
                status: 'corrected',
                corrected_by_user_id: user.user_id,
                corrected_at: new Date().toISOString(),
                correction_report_id: correctionReport.id
            })
            .eq('id', original_report_id)

        // Freeze original scout's reward
        if (originalReport.scout_reward_tx_id) {
            await freezeTransaction(originalReport.scout_reward_tx_id, 'report_corrected')
        }

        // Process corrector reward
        const rewardResult = await processReward({
            userId: user.user_id,
            actionType: 'toilet_corrector',
            amountPaise: REWARD_PAISE,
            referenceType: 'toilet_report',
            referenceId: correctionReport.id,
            metadata: { original_report_id, hygiene_level }
        })

        if (rewardResult.transaction_id) {
            await supabaseAdmin
                .from('toilet_reports')
                .update({ corrector_reward_tx_id: rewardResult.transaction_id })
                .eq('id', correctionReport.id)
        }

        return successResponse('Correction submitted', {
            correction_report_id: correctionReport.id,
            original_report_id,
            reward_given: rewardResult.reward_given,
            reason: rewardResult.reason,
            amount_paise: rewardResult.reward_given ? REWARD_PAISE : 0,
            transaction_id: rewardResult.transaction_id
        })

    } catch (err) {
        console.error('[ToiletCorrect] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
