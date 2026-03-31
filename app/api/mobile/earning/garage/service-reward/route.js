/**
 * Garage Service Reward API — Claim reward for vehicle service
 * Reward: ₹5 (500 paise) per service type if within interval
 * 
 * Service intervals:
 *   - oil_bike: 90 days
 *   - oil_car: 180 days
 *   - tyre_bike: 180 days
 *   - tyre_car: 365 days
 *   - general: 30 days
 * 
 * Requires: bill photo + OCR validation (mobile handles OCR)
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'

const REWARD_PAISE = 500 // ₹5

const SERVICE_INTERVALS_DAYS = {
    oil_bike: 90,
    oil_car: 180,
    tyre_bike: 180,
    tyre_car: 365,
    general: 30
}

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

        const service_type = formData.get('service_type')
        const vehicle_id = formData.get('vehicle_id')
        const bill_file = formData.get('bill_photo')

        // --- Validations ---
        if (!service_type || !SERVICE_INTERVALS_DAYS[service_type]) {
            return successResponse('Invalid service type', {
                reward_given: false,
                reason: 'invalid_service_type',
                valid_types: Object.keys(SERVICE_INTERVALS_DAYS)
            })
        }
        if (!vehicle_id) {
            return successResponse('vehicle_id is required', { reward_given: false, reason: 'missing_vehicle_id' })
        }
        if (!bill_file || typeof bill_file === 'string') {
            return successResponse('Bill photo is required', { reward_given: false, reason: 'missing_bill_photo' })
        }

        // --- Check service interval (can't claim too frequently) ---
        const intervalDays = SERVICE_INTERVALS_DAYS[service_type]
        const intervalDate = new Date(Date.now() - intervalDays * 24 * 60 * 60 * 1000).toISOString()

        const { data: recentClaim } = await supabaseAdmin
            .from('service_reward_claims')
            .select('id, created_at')
            .eq('user_id', user.user_id)
            .eq('vehicle_id', vehicle_id)
            .eq('service_type', service_type)
            .gte('created_at', intervalDate)
            .order('created_at', { ascending: false })
            .limit(1)

        if (recentClaim && recentClaim.length > 0) {
            const lastClaimDate = new Date(recentClaim[0].created_at)
            const nextEligible = new Date(lastClaimDate.getTime() + intervalDays * 24 * 60 * 60 * 1000)
            return successResponse('Service reward already claimed within interval', {
                reward_given: false,
                reason: 'interval_not_met',
                last_claim: lastClaimDate.toISOString(),
                next_eligible: nextEligible.toISOString(),
                interval_days: intervalDays
            })
        }

        // Upload bill photo
        const billUrl = await uploadFile(bill_file, 'service-bills', user.user_id)
        if (!billUrl) {
            return successResponse('Bill photo upload failed', { reward_given: false, reason: 'upload_failed' })
        }

        // Create claim record
        const { data: claim, error: claimError } = await supabaseAdmin
            .from('service_reward_claims')
            .insert({
                user_id: user.user_id,
                vehicle_id,
                service_type,
                bill_photo_url: billUrl
            })
            .select('id')
            .single()

        if (claimError) throw claimError

        // Map service_type to action_key
        const actionKey = `service_${service_type}`

        // Process reward
        const rewardResult = await processReward({
            userId: user.user_id,
            actionType: actionKey,
            amountPaise: REWARD_PAISE,
            referenceType: 'service_reward_claim',
            referenceId: claim.id,
            metadata: { service_type, vehicle_id }
        })

        if (rewardResult.transaction_id) {
            await supabaseAdmin
                .from('service_reward_claims')
                .update({ reward_tx_id: rewardResult.transaction_id })
                .eq('id', claim.id)
        }

        return successResponse('Service reward claimed', {
            claim_id: claim.id,
            service_type,
            reward_given: rewardResult.reward_given,
            reason: rewardResult.reason,
            amount_paise: rewardResult.reward_given ? REWARD_PAISE : 0,
            transaction_id: rewardResult.transaction_id
        })

    } catch (err) {
        console.error('[ServiceReward] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
