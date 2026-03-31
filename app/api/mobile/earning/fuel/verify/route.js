/**
 * Fuel Verify API — Verify an existing fuel bunk report
 * Reward: ₹5 (500 paise)
 * Conditions: within 100m, 24h cooldown, first valid user only, cannot verify own report
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'
import { checkGPS } from '@/lib/antifraud'
import { GPS_RADIUS } from '@/lib/geoUtils'

const REWARD_PAISE = 500 // ₹5

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { report_id, latitude, longitude, verification_result } = body
        // verification_result: true = confirmed correct, false = disputed (triggers correction)

        if (!report_id) {
            return successResponse('report_id is required', { reward_given: false, reason: 'missing_report_id' })
        }
        if (verification_result === undefined || verification_result === null) {
            return successResponse('verification_result is required (true/false)', { reward_given: false, reason: 'missing_result' })
        }
        if (!latitude || !longitude) {
            return successResponse('GPS location is required', { reward_given: false, reason: 'missing_gps' })
        }

        // --- Fetch the report ---
        const { data: report, error: reportError } = await supabaseAdmin
            .from('fuel_reports')
            .select('*')
            .eq('id', report_id)
            .single()

        if (reportError || !report) {
            return successResponse('Report not found', { reward_given: false, reason: 'report_not_found' })
        }

        // --- Cannot verify own report ---
        if (report.scout_user_id === user.user_id) {
            return successResponse('Cannot verify your own report', { reward_given: false, reason: 'self_verification' })
        }

        // --- Already verified by someone ---
        if (report.verified_by_user_id) {
            return successResponse('Report already verified', { reward_given: false, reason: 'already_verified' })
        }

        // --- 24h cooldown check ---
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

        // --- GPS proximity check (within 100m of bunk) ---
        const gpsCheck = checkGPS(
            parseFloat(latitude), parseFloat(longitude),
            report.latitude, report.longitude,
            GPS_RADIUS.FUEL_VERIFY
        )
        if (!gpsCheck.valid) {
            return successResponse('You must be within 100m of the fuel bunk to verify', {
                reward_given: false,
                reason: 'gps_out_of_range'
            })
        }

        // --- Atomic: First valid verifier wins ---
        // Use update with .eq on verified_by_user_id IS NULL to ensure atomicity
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('fuel_reports')
            .update({
                verified_by_user_id: user.user_id,
                verified_at: new Date().toISOString(),
                verification_result: verification_result,
                status: verification_result ? 'verified' : 'disputed'
            })
            .eq('id', report_id)
            .is('verified_by_user_id', null) // Atomic: only if not yet verified
            .select('id')
            .single()

        if (updateError || !updated) {
            // Another user verified first (race condition handled)
            return successResponse('Report was already verified by another user', {
                reward_given: false,
                reason: 'already_verified'
            })
        }

        // --- Process Reward ---
        const rewardResult = await processReward({
            userId: user.user_id,
            actionType: 'fuel_verifier',
            amountPaise: REWARD_PAISE,
            referenceType: 'fuel_report',
            referenceId: report_id,
            metadata: {
                verification_result,
                bunk_place_id: report.bunk_place_id
            }
        })

        // Link reward transaction
        if (rewardResult.transaction_id) {
            await supabaseAdmin
                .from('fuel_reports')
                .update({ verifier_reward_tx_id: rewardResult.transaction_id })
                .eq('id', report_id)
        }

        // If verification says NO (disputed), the report is open for correction
        // The corrector endpoint handles the correction flow

        return successResponse('Verification submitted', {
            report_id,
            verification_result,
            reward_given: rewardResult.reward_given,
            reason: rewardResult.reason,
            amount_paise: rewardResult.reward_given ? REWARD_PAISE : 0,
            transaction_id: rewardResult.transaction_id
        })

    } catch (err) {
        console.error('[FuelVerify] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
