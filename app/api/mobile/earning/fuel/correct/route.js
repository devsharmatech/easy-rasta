/**
 * Fuel Correct API — Submit a correction for a disputed fuel report
 * Reward: ₹10 (1000 paise) to corrector, original scout gets ₹0
 * Triggered when: verifier taps NO
 * Requires: full new data, new receipt, odometer > last reading
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward, freezeTransaction } from '@/lib/earningEngine'
import { checkReceiptDuplicate, checkOdometerValid, logFraudFlag } from '@/lib/antifraud'
import { generatePhotoHash, generateReceiptHash } from '@/lib/hashUtils'

const REWARD_PAISE = 1000 // ₹10

// Helper: upload file
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
        const vehicle_id = formData.get('vehicle_id')       // optional — which vehicle
        const price_petrol = formData.get('price_petrol')
        const price_diesel = formData.get('price_diesel')
        const odometer_reading = formData.get('odometer_reading')
        const latitude = formData.get('latitude')
        const longitude = formData.get('longitude')
        const photo_file = formData.get('photo')
        const receipt_file = formData.get('receipt')

        if (!original_report_id) {
            return successResponse('original_report_id is required', { reward_given: false, reason: 'missing_report_id' })
        }

        // --- Fetch original report ---
        const { data: originalReport, error: fetchError } = await supabaseAdmin
            .from('fuel_reports')
            .select('*')
            .eq('id', original_report_id)
            .single()

        if (fetchError || !originalReport) {
            return successResponse('Original report not found', { reward_given: false, reason: 'report_not_found' })
        }

        // --- Must be disputed (verifier said NO) ---
        if (originalReport.status !== 'disputed') {
            return successResponse('Report is not disputed, cannot correct', { reward_given: false, reason: 'not_disputed' })
        }

        // --- Cannot correct own report ---
        if (originalReport.scout_user_id === user.user_id) {
            return successResponse('Cannot correct your own report', { reward_given: false, reason: 'self_correction' })
        }

        // --- Already corrected ---
        if (originalReport.corrected_by_user_id) {
            return successResponse('Report already corrected', { reward_given: false, reason: 'already_corrected' })
        }

        // --- Validations ---
        if (!photo_file || typeof photo_file === 'string') {
            return successResponse('New photo is required for correction', { reward_given: false, reason: 'missing_photo' })
        }
        if (!price_petrol && !price_diesel) {
            return successResponse('At least one fuel price is required', { reward_given: false, reason: 'missing_price' })
        }
        if (!receipt_file || typeof receipt_file === 'string') {
            return successResponse('New receipt is required for correction', { reward_given: false, reason: 'missing_receipt' })
        }

        // --- Upload photo ---
        const photoResult = await uploadFile(photo_file, 'fuel-reports/corrections/photos', user.user_id)
        if (!photoResult) {
            return successResponse('Photo upload failed', { reward_given: false, reason: 'upload_failed' })
        }
        const photoHash = generatePhotoHash(photoResult.buffer)

        // --- Upload receipt ---
        const receiptResult = await uploadFile(receipt_file, 'fuel-reports/corrections/receipts', user.user_id)
        if (!receiptResult) {
            return successResponse('Receipt upload failed', { reward_given: false, reason: 'upload_failed' })
        }
        const receiptHash = generateReceiptHash(receiptResult.buffer)

        // --- Receipt duplicate check ---
        const receiptDupCheck = await checkReceiptDuplicate(receiptHash)
        if (!receiptDupCheck.valid) {
            return successResponse('Duplicate receipt detected', { reward_given: false, reason: 'duplicate_receipt' })
        }

        // --- Odometer validation ---
        let odometerValue = null
        if (odometer_reading) {
            odometerValue = parseInt(odometer_reading)
            const odometerCheck = await checkOdometerValid(user.user_id, odometerValue)
            if (!odometerCheck.valid) {
                return successResponse('Odometer reading must be higher than last reading', {
                    reward_given: false,
                    reason: odometerCheck.reason
                })
            }
        }

        // --- Create correction report ---
        const { data: correctionReport, error: corrError } = await supabaseAdmin
            .from('fuel_reports')
            .insert({
                bunk_place_id: originalReport.bunk_place_id,
                scout_user_id: user.user_id,
                photo_url: photoResult.url,
                photo_hash: photoHash,
                price_petrol: price_petrol ? parseFloat(price_petrol) : null,
                price_diesel: price_diesel ? parseFloat(price_diesel) : null,
                odometer_reading: odometerValue,
                receipt_url: receiptResult.url,
                receipt_hash: receiptHash,
                latitude: parseFloat(latitude || originalReport.latitude),
                longitude: parseFloat(longitude || originalReport.longitude),
                status: 'verified', // Correction is auto-verified
                correction_report_id: original_report_id
            })
            .select('id')
            .single()

        if (corrError) throw corrError

        // --- Update original report ---
        await supabaseAdmin
            .from('fuel_reports')
            .update({
                status: 'corrected',
                corrected_by_user_id: user.user_id,
                corrected_at: new Date().toISOString(),
                correction_report_id: correctionReport.id
            })
            .eq('id', original_report_id)

        // --- Freeze original scout's reward (scout gets ₹0 on correction) ---
        if (originalReport.scout_reward_tx_id) {
            await freezeTransaction(originalReport.scout_reward_tx_id, 'report_corrected')
        }

        // --- Process corrector reward ---
        const rewardResult = await processReward({
            userId: user.user_id,
            actionType: 'fuel_corrector',
            amountPaise: REWARD_PAISE,
            referenceType: 'fuel_report',
            referenceId: correctionReport.id,
            metadata: { original_report_id, bunk_place_id: originalReport.bunk_place_id }
        })

        // Link reward
        if (rewardResult.transaction_id) {
            await supabaseAdmin
                .from('fuel_reports')
                .update({ corrector_reward_tx_id: rewardResult.transaction_id })
                .eq('id', correctionReport.id)
        }

        // Update odometer
        if (odometerValue) {
            await supabaseAdmin
                .from('users')
                .update({ last_odometer_reading: odometerValue })
                .eq('id', user.user_id)
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
        console.error('[FuelCorrect] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
