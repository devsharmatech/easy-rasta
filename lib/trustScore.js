/**
 * Trust Score System
 * Formula: trust_score = (agreed_verifications / total_reports) * 100
 * Start: 100%, wrong report (3 flags in 1h) → -10%
 * <70: disable scout/corrector rewards, allow verifier only
 * Recovery: 10 successful verifications
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Get current trust score for a user.
 */
export async function getTrustScore(userId) {
    const { data } = await supabaseAdmin
        .from('users')
        .select('trust_score, scout_status')
        .eq('id', userId)
        .single()

    return {
        score: data?.trust_score ?? 100,
        scoutStatus: data?.scout_status ?? 'active'
    }
}

/**
 * Check if user's trust score allows a given action type.
 * Returns { allowed, reason }
 */
export async function checkTrustForAction(userId, actionType) {
    const { score, scoutStatus } = await getTrustScore(userId)

    // Scout and corrector actions blocked if trust < 70
    const restrictedActions = [
        'fuel_scout', 'fuel_corrector',
        'toilet_scout', 'toilet_corrector',
        'receipt_upload', 'odometer_reading'
    ]

    if (score < 70 && restrictedActions.includes(actionType)) {
        return {
            allowed: false,
            reason: 'trust_score_low',
            score
        }
    }

    if (scoutStatus === 'restricted' && restrictedActions.includes(actionType)) {
        return {
            allowed: false,
            reason: 'scout_status_restricted',
            score
        }
    }

    return { allowed: true, reason: null, score }
}

/**
 * Degrade trust score by a given amount.
 * Called when 3 flags are raised within 1 hour.
 */
export async function degradeTrustScore(userId, amount = 10, reason = 'automated_flag') {
    const { data: user } = await supabaseAdmin
        .from('users')
        .select('trust_score')
        .eq('id', userId)
        .single()

    const currentScore = user?.trust_score ?? 100
    const newScore = Math.max(0, currentScore - amount)

    // Update user
    const updateFields = { trust_score: newScore }
    if (newScore < 70) {
        updateFields.scout_status = 'restricted'
    }

    await supabaseAdmin
        .from('users')
        .update(updateFields)
        .eq('id', userId)

    // Log the change
    await supabaseAdmin.from('trust_score_logs').insert({
        user_id: userId,
        previous_score: currentScore,
        new_score: newScore,
        change_amount: -amount,
        reason,
        changed_by: 'system'
    })

    return { previousScore: currentScore, newScore }
}

/**
 * Recalculate trust score based on verification history.
 * Called after successful verifications to check recovery.
 */
export async function recalculateTrustScore(userId) {
    // Count total reports by this user
    const { count: fuelReports } = await supabaseAdmin
        .from('fuel_reports')
        .select('*', { count: 'exact', head: true })
        .eq('scout_user_id', userId)

    const { count: toiletReports } = await supabaseAdmin
        .from('toilet_reports')
        .select('*', { count: 'exact', head: true })
        .eq('scout_user_id', userId)

    const totalReports = (fuelReports || 0) + (toiletReports || 0)

    // Count agreed verifications (reports that were verified as correct)
    const { count: fuelVerified } = await supabaseAdmin
        .from('fuel_reports')
        .select('*', { count: 'exact', head: true })
        .eq('scout_user_id', userId)
        .eq('status', 'verified')

    const { count: toiletVerified } = await supabaseAdmin
        .from('toilet_reports')
        .select('*', { count: 'exact', head: true })
        .eq('scout_user_id', userId)
        .eq('status', 'verified')

    const agreedVerifications = (fuelVerified || 0) + (toiletVerified || 0)

    if (totalReports === 0) return { score: 100 }

    const calculatedScore = Math.round((agreedVerifications / totalReports) * 100)

    return { score: calculatedScore, totalReports, agreedVerifications }
}

/**
 * Check if user has earned recovery through 10 successful verifications.
 * If so, restore trust score and scout_status.
 */
export async function checkTrustRecovery(userId) {
    const { score } = await getTrustScore(userId)
    if (score >= 70) return { recovered: false, reason: 'score_already_ok' }

    // Count recent successful verifications (as verifier)
    const { count: fuelVerifies } = await supabaseAdmin
        .from('fuel_reports')
        .select('*', { count: 'exact', head: true })
        .eq('verified_by_user_id', userId)
        .eq('verification_result', true)

    const { count: toiletVerifies } = await supabaseAdmin
        .from('toilet_reports')
        .select('*', { count: 'exact', head: true })
        .eq('verified_by_user_id', userId)
        .eq('verification_result', true)

    const totalVerifies = (fuelVerifies || 0) + (toiletVerifies || 0)

    if (totalVerifies >= 10) {
        // Recover
        const newScore = Math.min(100, score + 30) // Restore partially
        await supabaseAdmin
            .from('users')
            .update({ trust_score: newScore, scout_status: 'active' })
            .eq('id', userId)

        await supabaseAdmin.from('trust_score_logs').insert({
            user_id: userId,
            previous_score: score,
            new_score: newScore,
            change_amount: newScore - score,
            reason: 'recovery_10_verifications',
            changed_by: 'system'
        })

        return { recovered: true, newScore }
    }

    return { recovered: false, reason: 'insufficient_verifications', count: totalVerifies }
}

/**
 * Admin override for trust score.
 */
export async function adminOverrideTrustScore(userId, newScore, adminUserId, reason = 'admin_override') {
    const { data: user } = await supabaseAdmin
        .from('users')
        .select('trust_score')
        .eq('id', userId)
        .single()

    const currentScore = user?.trust_score ?? 100
    const clampedScore = Math.max(0, Math.min(100, newScore))

    const updateFields = { trust_score: clampedScore }
    if (clampedScore >= 70) {
        updateFields.scout_status = 'active'
    } else {
        updateFields.scout_status = 'restricted'
    }

    await supabaseAdmin
        .from('users')
        .update(updateFields)
        .eq('id', userId)

    await supabaseAdmin.from('trust_score_logs').insert({
        user_id: userId,
        previous_score: currentScore,
        new_score: clampedScore,
        change_amount: clampedScore - currentScore,
        reason,
        changed_by: 'admin',
        admin_user_id: adminUserId
    })

    return { previousScore: currentScore, newScore: clampedScore }
}
