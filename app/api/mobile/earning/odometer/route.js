/**
 * Odometer Reading API — Submit odometer reading for reward
 * Reward: ₹5 (500 paise)
 * Must increase vs last reading. OCR first, manual fallback allowed.
 * Every 1000km milestone → additional ₹5
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'
import { checkOdometerValid } from '@/lib/antifraud'

export const dynamic = 'force-dynamic'
export const revalidate = 0


const REWARD_PAISE = 500   // ₹5
const MILESTONE_PAISE = 500 // ₹5 per 1000km milestone
const MILESTONE_KM = 1000

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
    return urlData.publicUrl
}

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const formData = await request.formData()

        const reading = formData.get('reading')
        const vehicle_id = formData.get('vehicle_id')
        const ocr_extracted = formData.get('ocr_extracted') // 'true' or 'false'
        const photo_file = formData.get('photo')

        if (!reading) {
            return successResponse('Odometer reading is required', { reward_given: false, reason: 'missing_reading' })
        }

        const readingValue = parseInt(reading)

        // --- Odometer validation ---
        const odometerCheck = await checkOdometerValid(user.user_id, readingValue)
        if (!odometerCheck.valid) {
            return successResponse('Odometer reading must be higher than your last reading', {
                reward_given: false,
                reason: odometerCheck.reason,
                last_reading: odometerCheck.lastReading || 0
            })
        }

        // Upload photo if provided
        let photoUrl = null
        if (photo_file && typeof photo_file !== 'string' && photo_file.size > 0) {
            photoUrl = await uploadFile(photo_file, 'odometer', user.user_id)
        }

        // Create odometer submission
        const { data: submission, error: subError } = await supabaseAdmin
            .from('odometer_submissions')
            .insert({
                user_id: user.user_id,
                vehicle_id: vehicle_id || null,
                reading: readingValue,
                previous_reading: odometerCheck.lastReading || 0,
                photo_url: photoUrl,
                ocr_extracted: ocr_extracted === 'true'
            })
            .select('id')
            .single()

        if (subError) throw subError

        // Process reading reward
        const rewardResult = await processReward({
            userId: user.user_id,
            actionType: 'odometer_reading',
            amountPaise: REWARD_PAISE,
            referenceType: 'odometer_submission',
            referenceId: submission.id,
            metadata: { reading: readingValue, previous: odometerCheck.lastReading }
        })

        if (rewardResult.transaction_id) {
            await supabaseAdmin
                .from('odometer_submissions')
                .update({ reward_tx_id: rewardResult.transaction_id })
                .eq('id', submission.id)
        }

        // Update user's last odometer reading
        await supabaseAdmin
            .from('users')
            .update({ last_odometer_reading: readingValue })
            .eq('id', user.user_id)

        // --- Check mileage milestone ---
        let milestoneReward = null
        const previousReading = odometerCheck.lastReading || 0
        const previousMilestone = Math.floor(previousReading / MILESTONE_KM)
        const currentMilestone = Math.floor(readingValue / MILESTONE_KM)

        if (currentMilestone > previousMilestone) {
            const milestonesToAward = currentMilestone - previousMilestone

            for (let i = 0; i < milestonesToAward; i++) {
                const milestoneResult = await processReward({
                    userId: user.user_id,
                    actionType: 'mileage_milestone',
                    amountPaise: MILESTONE_PAISE,
                    referenceType: 'odometer_submission',
                    referenceId: submission.id,
                    metadata: {
                        milestone_km: (previousMilestone + i + 1) * MILESTONE_KM,
                        reading: readingValue
                    }
                })
                milestoneReward = milestoneResult
            }

            // Link last milestone tx
            if (milestoneReward?.transaction_id) {
                await supabaseAdmin
                    .from('odometer_submissions')
                    .update({ milestone_reward_tx_id: milestoneReward.transaction_id })
                    .eq('id', submission.id)
            }
        }

        return successResponse('Odometer reading submitted', {
            submission_id: submission.id,
            reading: readingValue,
            previous_reading: previousReading,
            reward_given: rewardResult.reward_given,
            reason: rewardResult.reason,
            amount_paise: rewardResult.reward_given ? REWARD_PAISE : 0,
            milestone_awarded: currentMilestone > previousMilestone,
            milestones_count: Math.max(0, currentMilestone - previousMilestone),
            milestone_paise: Math.max(0, currentMilestone - previousMilestone) * MILESTONE_PAISE
        })

    } catch (err) {
        console.error('[Odometer] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
