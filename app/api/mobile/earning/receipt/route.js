/**
 * Receipt Upload API — Submit a fuel receipt for reward
 * Reward: ₹5 (500 paise)
 * Requirements:
 *   - Bunk name, amount, timestamp (provided by mobile/OCR)
 *   - GPS within 300m of bunk
 *   - Duplicate receipt hash → block reward
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'
import { checkGPS, checkReceiptDuplicate, logFraudFlag } from '@/lib/antifraud'
import { generateReceiptHash } from '@/lib/hashUtils'
import { GPS_RADIUS } from '@/lib/geoUtils'

export const dynamic = 'force-dynamic'
export const revalidate = 0


const REWARD_PAISE = 500 // ₹5

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

        const receipt_file = formData.get('receipt')
        const vehicle_id = formData.get('vehicle_id')        // optional — which vehicle was fueled
        const bunk_name = formData.get('bunk_name')           // OCR-extracted or user input
        const amount_detected = formData.get('amount_detected') // OCR-extracted or user input
        const timestamp_detected = formData.get('timestamp_detected') // OCR or user
        const latitude = formData.get('latitude')
        const longitude = formData.get('longitude')
        const target_latitude = formData.get('target_latitude')   // Bunk location
        const target_longitude = formData.get('target_longitude')

        // --- Validations ---
        if (!receipt_file || typeof receipt_file === 'string') {
            return successResponse('Receipt photo is required', { reward_given: false, reason: 'missing_receipt' })
        }
        if (!latitude || !longitude) {
            return successResponse('GPS location is required', { reward_given: false, reason: 'missing_gps' })
        }

        // Upload receipt
        const receiptResult = await uploadFile(receipt_file, 'receipts', user.user_id)
        if (!receiptResult) {
            return successResponse('Receipt upload failed', { reward_given: false, reason: 'upload_failed' })
        }

        const receiptHash = generateReceiptHash(receiptResult.buffer)

        // Duplicate check
        const dupCheck = await checkReceiptDuplicate(receiptHash)
        if (!dupCheck.valid) {
            await logFraudFlag(user.user_id, 'duplicate_receipt', 'high', 'receipt', null, { receiptHash })
            return successResponse('Duplicate receipt detected', { reward_given: false, reason: 'duplicate_receipt' })
        }

        // GPS validation (within 300m of bunk if target provided)
        let gpsValid = true
        if (target_latitude && target_longitude) {
            const gpsCheck = checkGPS(
                parseFloat(latitude), parseFloat(longitude),
                parseFloat(target_latitude), parseFloat(target_longitude),
                GPS_RADIUS.RECEIPT_GPS
            )
            if (!gpsCheck.valid) {
                gpsValid = false
                await logFraudFlag(user.user_id, 'gps_mismatch', 'medium', 'receipt', null, {
                    userLat: latitude, userLng: longitude,
                    bunkLat: target_latitude, bunkLng: target_longitude
                })
            }
        }

        // Create receipt submission
        const { data: submission, error: subError } = await supabaseAdmin
            .from('receipt_submissions')
            .insert({
                user_id: user.user_id,
                photo_url: receiptResult.url,
                receipt_hash: receiptHash,
                bunk_name: bunk_name || null,
                amount_detected: amount_detected ? parseFloat(amount_detected) : null,
                timestamp_detected: timestamp_detected || null,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                target_latitude: target_latitude ? parseFloat(target_latitude) : null,
                target_longitude: target_longitude ? parseFloat(target_longitude) : null,
                status: gpsValid ? 'completed' : 'rejected',
                rejection_reason: gpsValid ? null : 'gps_out_of_range'
            })
            .select('id')
            .single()

        if (subError) throw subError

        // Process reward only if GPS valid
        if (!gpsValid) {
            return successResponse('Receipt submitted but GPS validation failed', {
                submission_id: submission.id,
                reward_given: false,
                reason: 'gps_out_of_range'
            })
        }

        const rewardResult = await processReward({
            userId: user.user_id,
            actionType: 'receipt_upload',
            amountPaise: REWARD_PAISE,
            referenceType: 'receipt_submission',
            referenceId: submission.id,
            metadata: { bunk_name, amount_detected, vehicle_id }
        })

        if (rewardResult.transaction_id) {
            await supabaseAdmin
                .from('receipt_submissions')
                .update({ reward_tx_id: rewardResult.transaction_id })
                .eq('id', submission.id)
        }

        return successResponse('Receipt submitted', {
            submission_id: submission.id,
            reward_given: rewardResult.reward_given,
            reason: rewardResult.reason,
            amount_paise: rewardResult.reward_given ? REWARD_PAISE : 0,
            transaction_id: rewardResult.transaction_id
        })

    } catch (err) {
        console.error('[Receipt] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
