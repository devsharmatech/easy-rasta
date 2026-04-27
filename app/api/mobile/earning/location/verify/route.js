/**
 * Verification API (STEP 4)
 * 
 * ONLY ONE ENDPOINT: POST /api/mobile/earning/location/verify
 * Input: { location_id, action: "YES" | "NO", latitude, longitude }
 * 
 * Rules:
 * - GPS strict: 100m fuel, 50m toilet
 * - Cannot verify own (user_id != submitted_by_user_id)
 * - Must satisfy now - last_verified_at >= 24h (If <24h: allow request, NO reward)
 * 
 * CASE 1: YES (Verifier)
 * - Atomic DB update (only 1st user gets reward)
 * - update last_verified_at = now
 * - Reward ₹5 (verifier_fuel / verifier_toilet)
 * 
 * CASE 2: NO (Corrector Init)
 * - Validates eligibility to correct and returns success: true
 * - Actual data submission is handled by reusing existing update/edit location flows (fuel/correct & toilet/correct)
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'
import { checkGPS } from '@/lib/antifraud'
import { GPS_RADIUS } from '@/lib/geoUtils'

export const dynamic = 'force-dynamic'
export const revalidate = 0


const VERIFIER_PAISE = 500 // ₹5

// Helper: Ensure precise strict GPS bounds per prompt
const getStrictRadius = (category) => {
    return category === 'fuel' ? 100 : 50; // Use stricter bounds for toilet (50m) instead of 100m
}

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { location_id, action, latitude, longitude } = body

        if (!location_id) return errorResponse('location_id is required', 400)
        if (!action || !['YES', 'NO'].includes(action)) return errorResponse('action must be YES or NO', 400)
        if (!latitude || !longitude) return errorResponse('GPS location is required', 400)

        // --- Fetch Location ---
        const { data: location, error: locErr } = await supabaseAdmin
            .from('vendor_businesses')
            .select('id, category, latitude, longitude, submitted_by_user_id, last_verified_at, is_active')
            .eq('id', location_id)
            .single()

        if (locErr || !location || !location.is_active) {
            return successResponse('Location not found or inactive', { reward_given: false, reason: 'location_invalid' })
        }

        // --- Cannot Verify Own Location ---
        if (location.submitted_by_user_id === user.user_id) {
            return successResponse('Cannot verify your own added location', { reward_given: false, reason: 'self_verified' })
        }

        // --- Distance Strict Check ---
        const radiusMeters = getStrictRadius(location.category)
        const gpsCheck = checkGPS(
            parseFloat(latitude), parseFloat(longitude),
            location.latitude, location.longitude,
            radiusMeters
        )

        if (!gpsCheck.valid) {
            return successResponse(`Must be within ${radiusMeters}m to verify`, { reward_given: false, reason: 'gps_fail' })
        }

        // --- 24H Check ---
        const now = new Date()
        let rewardEligible = true
        let twentyFourHoursAgo = null

        if (location.last_verified_at) {
            const lastVerified = new Date(location.last_verified_at)
            const twentyFourHoursAfter = new Date(lastVerified.getTime() + 24 * 60 * 60 * 1000)
            twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            
            if (now < twentyFourHoursAfter) {
                rewardEligible = false // <24h -> allow request, NO reward
            }
        }

        // ════════════════════════════════════════════════════════════════
        // CASE 2: NO (Corrector Initiation) -> Redirects to existing flow
        // ════════════════════════════════════════════════════════════════
        if (action === 'NO') {
            return successResponse('Eligible to correct location', {
                reward_given: false,
                reason: rewardEligible ? 'proceed_to_corrector' : 'cooldown_active_no_reward',
                action: 'NO',
                location_id
            })
        }

        // ════════════════════════════════════════════════════════════════
        // CASE 1: YES (Verifier)
        // ════════════════════════════════════════════════════════════════
        if (!rewardEligible) {
            return successResponse('Verification logged (within 24h, no reward)', {
                reward_given: false,
                reason: 'cooldown_active'
            })
        }

        const nowISO = new Date().toISOString()

        // Atomic Check: Only the first user to update outside the 24h window wins
        let updateQuery = supabaseAdmin
            .from('vendor_businesses')
            .update({ last_verified_at: nowISO })
            .eq('id', location_id)
            .select('id')
            
        // If last_verified_at existed, strictly ensure no one else updated it in the last 24h before our transaction
        if (twentyFourHoursAgo) {
            updateQuery = updateQuery.lte('last_verified_at', twentyFourHoursAgo)
        }

        const { data: updated, error: updateError } = await updateQuery.single()

        if (updateError || !updated) {
            return successResponse('Location already verified by someone else recently', {
                reward_given: false,
                reason: 'race_condition_lost'
            })
        }

        // Issue ₹5 Reward
        const actionType = location.category === 'fuel' ? 'verifier_fuel' : 'verifier_toilet'
        const rewardResult = await processReward({
            userId: user.user_id,
            actionType,
            amountPaise: VERIFIER_PAISE,
            referenceType: 'vendor_business',
            referenceId: location_id,
            metadata: { action: 'YES' }
        })

        return successResponse('Verification complete', {
            reward_given: rewardResult.reward_given,
            reason: rewardResult.reason,
            amount_paise: rewardResult.reward_given ? VERIFIER_PAISE : 0,
            transaction_id: rewardResult.transaction_id || null,
            action: 'YES'
        })

    } catch (err) {
        console.error('[LocationVerify API Error]:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
