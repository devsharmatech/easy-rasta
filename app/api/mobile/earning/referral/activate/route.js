/**
 * Referral Activation API — Triggered on new user's FIRST qualifying action
 * 
 * Reward:
 *   - Referrer: ₹10 (1000 paise)
 *   - New user: ₹10 (1000 paise)
 * 
 * Rules:
 *   - Trigger ONLY on first action (valid actions must pass quality gates)
 *   - 30 days attribution window
 *   - 2-level chain max
 *   - Same device → block
 *   - Same phone → block
 *   - Trust score <70 (within 7 days) → freeze referrer reward
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward, freezeTransaction } from '@/lib/earningEngine'
import { checkDeviceFingerprint, logFraudFlag } from '@/lib/antifraud'
import { getTrustScore } from '@/lib/trustScore'

const REFERRER_REWARD_PAISE = 1000  // ₹10
const NEW_USER_REWARD_PAISE = 1000  // ₹10
const ATTRIBUTION_WINDOW_DAYS = 30
const MAX_CHAIN_DEPTH = 2

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { action_type, action_reference_id } = body
        // action_type: what the user just did (e.g. 'fuel_scout', 'toilet_scout')
        // action_reference_id: UUID of the action entity

        if (!action_type) {
            return successResponse('action_type is required', { reward_given: false, reason: 'missing_action_type' })
        }

        // --- Check if user has a referrer ---
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('id, referred_by_user_id, friend_code, device_fingerprint, mobile, created_at')
            .eq('id', user.user_id)
            .single()

        if (!userData) {
            return successResponse('User not found', { reward_given: false, reason: 'user_not_found' })
        }

        // Find the referrer — check both new field and legacy field
        let referrerUserId = userData.referred_by_user_id

        if (!referrerUserId && userData.friend_code) {
            // Legacy referral: look up the referrer by my_code
            const { data: referrer } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('my_code', userData.friend_code)
                .single()

            if (referrer) {
                referrerUserId = referrer.id
                // Backfill the new field
                await supabaseAdmin
                    .from('users')
                    .update({ referred_by_user_id: referrer.id })
                    .eq('id', user.user_id)
            }
        }

        if (!referrerUserId) {
            return successResponse('No referrer found', { reward_given: false, reason: 'no_referrer' })
        }

        // --- Check if referral attribution already exists and is activated ---
        const { data: existingAttribution } = await supabaseAdmin
            .from('referral_attributions')
            .select('*')
            .eq('referred_user_id', user.user_id)
            .limit(1)

        if (existingAttribution && existingAttribution.length > 0) {
            const attr = existingAttribution[0]
            if (attr.status === 'activated') {
                return successResponse('Referral reward already activated', {
                    reward_given: false,
                    reason: 'already_activated'
                })
            }
            if (attr.status === 'expired') {
                return successResponse('Referral attribution expired', {
                    reward_given: false,
                    reason: 'referral_expired'
                })
            }
            if (attr.status === 'frozen') {
                return successResponse('Referral attribution frozen', {
                    reward_given: false,
                    reason: 'referral_frozen'
                })
            }
        }

        // --- Attribution window check (30 days from user registration) ---
        const userCreatedAt = new Date(userData.created_at)
        const windowExpiry = new Date(userCreatedAt.getTime() + ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
        const now = new Date()

        if (now > windowExpiry) {
            // Create/update as expired
            if (!existingAttribution || existingAttribution.length === 0) {
                await supabaseAdmin.from('referral_attributions').insert({
                    referrer_user_id: referrerUserId,
                    referred_user_id: user.user_id,
                    referral_code: userData.friend_code || 'unknown',
                    status: 'expired',
                    expires_at: windowExpiry.toISOString()
                })
            } else {
                await supabaseAdmin
                    .from('referral_attributions')
                    .update({ status: 'expired' })
                    .eq('id', existingAttribution[0].id)
            }
            return successResponse('Referral attribution window expired', {
                reward_given: false,
                reason: 'referral_expired'
            })
        }

        // --- Chain depth check (max 2 levels) ---
        const { data: referrerData } = await supabaseAdmin
            .from('users')
            .select('id, referred_by_user_id, device_fingerprint, mobile')
            .eq('id', referrerUserId)
            .single()

        // Check how deep this referral chain goes
        let chainDepth = 1
        if (referrerData?.referred_by_user_id) {
            chainDepth = 2
            // Check if the referrer's referrer also exists
            const { data: grandReferrer } = await supabaseAdmin
                .from('referral_attributions')
                .select('chain_depth')
                .eq('referred_user_id', referrerUserId)
                .limit(1)

            if (grandReferrer && grandReferrer.length > 0 && grandReferrer[0].chain_depth >= MAX_CHAIN_DEPTH) {
                return successResponse('Referral chain too deep', {
                    reward_given: false,
                    reason: 'chain_depth_exceeded'
                })
            }
        }

        // --- Fraud checks ---
        // Same device check
        if (userData.device_fingerprint && referrerData?.device_fingerprint) {
            if (userData.device_fingerprint === referrerData.device_fingerprint) {
                await logFraudFlag(
                    user.user_id, 'device_match', 'critical',
                    'referral', null,
                    { referrer_user_id: referrerUserId }
                )
                return successResponse('Referral blocked: same device detected', {
                    reward_given: false,
                    reason: 'same_device'
                })
            }
        }

        // Same phone check
        if (userData.mobile && referrerData?.mobile && userData.mobile === referrerData.mobile) {
            await logFraudFlag(
                user.user_id, 'phone_match', 'critical',
                'referral', null,
                { referrer_user_id: referrerUserId }
            )
            return successResponse('Referral blocked: same phone detected', {
                reward_given: false,
                reason: 'same_phone'
            })
        }

        // --- Create/Update attribution ---
        let attributionId
        if (existingAttribution && existingAttribution.length > 0) {
            await supabaseAdmin
                .from('referral_attributions')
                .update({
                    status: 'activated',
                    first_action_at: now.toISOString(),
                    first_action_type: action_type
                })
                .eq('id', existingAttribution[0].id)
            attributionId = existingAttribution[0].id
        } else {
            const { data: newAttr } = await supabaseAdmin
                .from('referral_attributions')
                .insert({
                    referrer_user_id: referrerUserId,
                    referred_user_id: user.user_id,
                    referral_code: userData.friend_code || 'unknown',
                    status: 'activated',
                    first_action_at: now.toISOString(),
                    first_action_type: action_type,
                    expires_at: windowExpiry.toISOString(),
                    chain_depth: chainDepth,
                    device_fingerprint_match: false,
                    phone_match: false
                })
                .select('id')
                .single()
            attributionId = newAttr?.id
        }

        // --- Process rewards ---
        // New user reward
        const newUserReward = await processReward({
            userId: user.user_id,
            actionType: 'referral_new_user',
            amountPaise: NEW_USER_REWARD_PAISE,
            referenceType: 'referral_attribution',
            referenceId: attributionId,
            metadata: { referrer_user_id: referrerUserId, action_type }
        })

        // Referrer reward
        const referrerReward = await processReward({
            userId: referrerUserId,
            actionType: 'referral_referrer',
            amountPaise: REFERRER_REWARD_PAISE,
            referenceType: 'referral_attribution',
            referenceId: attributionId,
            metadata: { referred_user_id: user.user_id, action_type }
        })

        // Update attribution with reward tx IDs
        const attrUpdate = {}
        if (newUserReward.transaction_id) attrUpdate.referred_reward_tx_id = newUserReward.transaction_id
        if (referrerReward.transaction_id) attrUpdate.referrer_reward_tx_id = referrerReward.transaction_id
        if (Object.keys(attrUpdate).length > 0) {
            await supabaseAdmin
                .from('referral_attributions')
                .update(attrUpdate)
                .eq('id', attributionId)
        }

        // --- Trust score check: if referred user created within 7 days AND referrer trust <70, freeze ---
        const sevenDaysAfterSignup = new Date(userCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000)

        if (now <= sevenDaysAfterSignup) {
            const { score } = await getTrustScore(referrerUserId)
            if (score < 70 && referrerReward.transaction_id) {
                await freezeTransaction(referrerReward.transaction_id, 'referrer_low_trust_score')
                await supabaseAdmin
                    .from('referral_attributions')
                    .update({ status: 'frozen' })
                    .eq('id', attributionId)
            }
        }

        return successResponse('Referral rewards processed', {
            attribution_id: attributionId,
            new_user_reward: {
                reward_given: newUserReward.reward_given,
                amount_paise: newUserReward.reward_given ? NEW_USER_REWARD_PAISE : 0,
                reason: newUserReward.reason
            },
            referrer_reward: {
                reward_given: referrerReward.reward_given,
                amount_paise: referrerReward.reward_given ? REFERRER_REWARD_PAISE : 0,
                reason: referrerReward.reason
            }
        })

    } catch (err) {
        console.error('[ReferralActivate] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
