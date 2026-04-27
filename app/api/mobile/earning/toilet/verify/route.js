/**
 * Toilet Verify API — Verify an existing toilet report
 * Reward: ₹5 (500 paise)
 * GPS must be within 50m (stricter than fuel's 100m)
 * Same 24h cooldown rule as fuel
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'
import { checkGPS } from '@/lib/antifraud'
import { GPS_RADIUS } from '@/lib/geoUtils'

export const dynamic = 'force-dynamic'
export const revalidate = 0


const REWARD_PAISE = 500 // ₹5

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { report_id, latitude, longitude, verification_result } = body

        if (!report_id) {
            return successResponse('report_id is required', { reward_given: false, reason: 'missing_report_id' })
        }
        if (verification_result === undefined || verification_result === null) {
            return successResponse('verification_result is required (true/false)', { reward_given: false, reason: 'missing_result' })
        }
        if (!latitude || !longitude) {
            return successResponse('GPS location is required', { reward_given: false, reason: 'missing_gps' })
        }

        // Fetch the report
        const { data: report, error: reportError } = await supabaseAdmin
            .from('toilet_reports')
            .select('*')
            .eq('id', report_id)
            .single()

        if (reportError || !report) {
            return successResponse('Report not found', { reward_given: false, reason: 'report_not_found' })
        }

        // Cannot verify own report
        if (report.scout_user_id === user.user_id) {
            return successResponse('Cannot verify your own report', { reward_given: false, reason: 'self_verification' })
        }

        // Already verified
        if (report.verified_by_user_id) {
            return successResponse('Report already verified', { reward_given: false, reason: 'already_verified' })
        }

        // 24h cooldown
        const reportCreatedAt = new Date(report.created_at)
        const twentyFourHoursAfter = new Date(reportCreatedAt.getTime() + 24 * 60 * 60 * 1000)
        const now = new Date()

        if (now < twentyFourHoursAfter) {
            return successResponse('Report must be at least 24 hours old before verification', {
                reward_given: false,
                reason: 'cooldown',
                available_at: twentyFourHoursAfter.toISOString()
            })
        }

        // GPS proximity — 50m for toilets (stricter)
        const gpsCheck = checkGPS(
            parseFloat(latitude), parseFloat(longitude),
            report.latitude, report.longitude,
            GPS_RADIUS.TOILET_VERIFY
        )
        if (!gpsCheck.valid) {
            return successResponse('You must be within 50m of the toilet to verify', {
                reward_given: false,
                reason: 'gps_out_of_range'
            })
        }

        // Atomic first verifier wins
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('toilet_reports')
            .update({
                verified_by_user_id: user.user_id,
                verified_at: new Date().toISOString(),
                verification_result: verification_result,
                status: verification_result ? 'verified' : 'disputed'
            })
            .eq('id', report_id)
            .is('verified_by_user_id', null)
            .select('id')
            .single()

        if (updateError || !updated) {
            return successResponse('Report was already verified by another user', {
                reward_given: false,
                reason: 'already_verified'
            })
        }

        // Process Reward
        const rewardResult = await processReward({
            userId: user.user_id,
            actionType: 'toilet_verifier',
            amountPaise: REWARD_PAISE,
            referenceType: 'toilet_report',
            referenceId: report_id,
            metadata: { verification_result }
        })

        if (rewardResult.transaction_id) {
            await supabaseAdmin
                .from('toilet_reports')
                .update({ verifier_reward_tx_id: rewardResult.transaction_id })
                .eq('id', report_id)
        }

        return successResponse('Verification submitted', {
            report_id,
            verification_result,
            reward_given: rewardResult.reward_given,
            reason: rewardResult.reason,
            amount_paise: rewardResult.reward_given ? REWARD_PAISE : 0,
            transaction_id: rewardResult.transaction_id
        })

    } catch (err) {
        console.error('[ToiletVerify] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
