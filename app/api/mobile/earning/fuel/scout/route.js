/**
 * Fuel Scout API — Submit a new fuel bunk report
 * Reward: ₹10 (1000 paise)
 * Requires: photo, price, odometer (OCR from mobile), GPS match, unique receipt hash
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'
import { checkGPS, checkReceiptDuplicate, checkPhotoDuplicate, checkOdometerValid, logFraudFlag } from '@/lib/antifraud'
import { generatePhotoHash, generateReceiptHash } from '@/lib/hashUtils'
import { GPS_RADIUS } from '@/lib/geoUtils'

const REWARD_PAISE = 1000 // ₹10

// Helper: upload file to Supabase Storage
const uploadFile = async (file, folder, userId) => {
    try {
        if (!file || typeof file === 'string' || file.size === 0) return null
        const ext = file.name ? file.name.split('.').pop() : 'jpg'
        const fileName = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        
        console.log('[UploadFile] File object keys:', Object.keys(file))
        console.log('[UploadFile] File details:', { size: file.size, type: file.type, name: file.name })
        
        let buffer;
        try {
            buffer = Buffer.from(await file.arrayBuffer())
            console.log('[UploadFile] Buffer created, length:', buffer.length)
        } catch(bErr) {
            console.error('[UploadFile Exception converting to Buffer]:', bErr.message || bErr)
            throw bErr
        }

        const { error: uploadError } = await supabaseAdmin.storage
            .from('media')
            .upload(fileName, buffer, { contentType: file.type || 'image/jpeg', upsert: true })
        
        if (uploadError) {
            console.error('[Upload Error Supabase]:', uploadError.message || uploadError)
            throw uploadError
        }
        
        const { data: urlData } = supabaseAdmin.storage.from('media').getPublicUrl(fileName)
        return { url: urlData.publicUrl, buffer }
    } catch (err) {
        console.error('[Upload Function Exception]:', err.message, err.stack)
        return null
    }
}

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const formData = await request.formData()

        const bunk_place_id = formData.get('bunk_place_id')
        const vehicle_id = formData.get('vehicle_id')       // optional — which vehicle was fueled
        const price_petrol = formData.get('price_petrol')
        const price_diesel = formData.get('price_diesel')
        const odometer_reading = formData.get('odometer_reading')
        const latitude = formData.get('latitude')
        const longitude = formData.get('longitude')
        const bunk_latitude = formData.get('bunk_latitude')
        const bunk_longitude = formData.get('bunk_longitude')
        const photo_file = formData.get('photo')
        const receipt_file = formData.get('receipt')

        // --- Validations ---
        if (!photo_file || typeof photo_file === 'string') {
            return successResponse('Photo is required', { reward_given: false, reason: 'missing_photo' })
        }
        if (!price_petrol && !price_diesel) {
            return successResponse('At least one fuel price is required', { reward_given: false, reason: 'missing_price' })
        }
        if (!latitude || !longitude) {
            return successResponse('GPS location is required', { reward_given: false, reason: 'missing_gps' })
        }

        // Upload photo
        const photoResult = await uploadFile(photo_file, 'fuel-reports/photos', user.user_id)
        if (!photoResult) {
            return successResponse('Photo upload failed', { reward_given: false, reason: 'upload_failed' })
        }

        // Generate photo hash for dedup
        const photoHash = generatePhotoHash(photoResult.buffer)

        // Check photo duplicate
        const photoDupCheck = await checkPhotoDuplicate(photoHash, 'fuel_reports')
        if (!photoDupCheck.valid) {
            await logFraudFlag(user.user_id, 'duplicate_photo', 'medium', 'fuel_report', null, { photoHash })
            return successResponse('Duplicate photo detected', { reward_given: false, reason: 'duplicate_photo' })
        }

        // Upload receipt if provided
        let receiptUrl = null
        let receiptHash = null
        if (receipt_file && typeof receipt_file !== 'string' && receipt_file.size > 0) {
            const receiptResult = await uploadFile(receipt_file, 'fuel-reports/receipts', user.user_id)
            if (receiptResult) {
                receiptUrl = receiptResult.url
                receiptHash = generateReceiptHash(receiptResult.buffer)

                // Check receipt duplicate
                const receiptDupCheck = await checkReceiptDuplicate(receiptHash)
                if (!receiptDupCheck.valid) {
                    await logFraudFlag(user.user_id, 'duplicate_receipt', 'high', 'fuel_report', null, { receiptHash })
                    return successResponse('Duplicate receipt detected', { reward_given: false, reason: 'duplicate_receipt' })
                }
            }
        }

        // GPS validation (if bunk location provided)
        let gpsValid = true
        if (bunk_latitude && bunk_longitude) {
            const gpsCheck = checkGPS(
                parseFloat(latitude), parseFloat(longitude),
                parseFloat(bunk_latitude), parseFloat(bunk_longitude),
                GPS_RADIUS.FUEL_VERIFY
            )
            if (!gpsCheck.valid) {
                gpsValid = false
                await logFraudFlag(user.user_id, 'gps_mismatch', 'medium', 'fuel_report', null, {
                    userLat: latitude, userLng: longitude,
                    bunkLat: bunk_latitude, bunkLng: bunk_longitude
                })
                // Report is still saved, but reward is skipped per spec
            }
        }

        // Odometer validation
        let odometerValue = null
        let odometerValid = true
        if (odometer_reading) {
            odometerValue = parseInt(odometer_reading)
            const odometerCheck = await checkOdometerValid(user.user_id, odometerValue)
            if (!odometerCheck.valid) {
                odometerValid = false
                // Allow report but note the issue
                await logFraudFlag(user.user_id, 'odometer_invalid', 'low', 'fuel_report', null, {
                    newReading: odometerValue, reason: odometerCheck.reason
                })
            }
        }

        // --- Create Fuel Report ---
        const { data: report, error: reportError } = await supabaseAdmin
            .from('fuel_reports')
            .insert({
                bunk_place_id: bunk_place_id || null,
                scout_user_id: user.user_id,
                photo_url: photoResult.url,
                photo_hash: photoHash,
                price_petrol: price_petrol ? parseFloat(price_petrol) : null,
                price_diesel: price_diesel ? parseFloat(price_diesel) : null,
                odometer_reading: odometerValue,
                receipt_url: receiptUrl,
                receipt_hash: receiptHash,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                status: 'pending'
            })
            .select('id')
            .single()

        if (reportError) throw reportError

        // --- Process Reward (only if GPS valid) ---
        let rewardResult = { reward_given: false, reason: 'gps_out_of_range', transaction_id: null }
        if (gpsValid) {
            rewardResult = await processReward({
                userId: user.user_id,
                actionType: 'fuel_scout',
                amountPaise: REWARD_PAISE,
                referenceType: 'fuel_report',
                referenceId: report.id,
                metadata: { bunk_place_id, vehicle_id, odometer_reading: odometerValue }
            })

            // Link reward transaction to report
            if (rewardResult.transaction_id) {
                await supabaseAdmin
                    .from('fuel_reports')
                    .update({ scout_reward_tx_id: rewardResult.transaction_id })
                    .eq('id', report.id)
            }
        }

        // Update odometer only if validation passed
        if (odometerValue && odometerValid) {
            await supabaseAdmin
                .from('users')
                .update({ last_odometer_reading: odometerValue })
                .eq('id', user.user_id)
        }

        return successResponse('Fuel report submitted', {
            report_id: report.id,
            reward_given: rewardResult.reward_given,
            reason: rewardResult.reason,
            amount_paise: rewardResult.reward_given ? REWARD_PAISE : 0,
            transaction_id: rewardResult.transaction_id
        })

    } catch (err) {
        console.error('[FuelScout] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
