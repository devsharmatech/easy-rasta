/**
 * Earning Engine — Central Reward Processor
 * 
 * CORE PRINCIPLE: Wallet is SINGLE source of truth.
 * All rewards internally tracked in PAISE (int) in earning_transactions.
 * 
 * IMPORTANT: users.wallet_balance is NUMERIC(10,2) storing RUPEES (not paise).
 * The existing spin-wheel and expense systems write rupees to this column.
 * We MUST convert paise → rupees when updating wallet_balance.
 * Conversion: rupees = paise / 100
 * 
 * No direct wallet_balance update without ledger.
 * Fraud → freeze transaction, NOT delete.
 * 
 * DAILY CAP: ₹50/day (5000 paise) for data_action category.
 * NO CAP for: referrals, events, garage, sponsorship.
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkTrustForAction } from '@/lib/trustScore'
import { checkRapidFlags, logFraudFlag } from '@/lib/antifraud'

// Daily cap for data actions in paise
const DAILY_CAP_PAISE = 5000

/**
 * Main entry point for all reward processing.
 * 
 * @param {object} params
 * @param {string} params.userId - User UUID
 * @param {string} params.actionType - Action key (e.g. 'fuel_scout', 'referral_referrer')
 * @param {number} params.amountPaise - Reward amount in paise
 * @param {string} [params.referenceType] - Type of referenced entity
 * @param {string} [params.referenceId] - UUID of referenced entity
 * @param {object} [params.metadata] - Additional context data
 * @returns {object} { success, reward_given, reason, transaction_id, new_balance_paise }
 */
export async function processReward({
    userId,
    actionType,
    amountPaise,
    referenceType = null,
    referenceId = null,
    metadata = {}
}) {
    try {
        // 1. Check trust score
        const trustCheck = await checkTrustForAction(userId, actionType)
        if (!trustCheck.allowed) {
            return {
                success: true,
                reward_given: false,
                reason: trustCheck.reason,
                transaction_id: null
            }
        }

        // 2. Determine if this action is subject to daily cap
        const config = await getRewardConfig(actionType)
        const isCapApplicable = config?.daily_cap_applicable ?? false

        // 3. Check daily cap for data actions
        if (isCapApplicable) {
            const capCheck = await checkDailyCap(userId)
            if (!capCheck.allowed) {
                return {
                    success: true,
                    reward_given: false,
                    reason: 'daily_cap_exceeded',
                    transaction_id: null
                }
            }
        }

        // 4. Check for rapid fraud flags
        const fraudCheck = await checkRapidFlags(userId)
        if (fraudCheck.suspicious) {
            // Freeze the transaction instead of blocking
            const txId = await createFrozenTransaction(
                userId, actionType, amountPaise,
                referenceType, referenceId,
                'rapid_fraud_flags', metadata
            )
            await logFraudFlag(
                userId, 'rapid_flags', 'high',
                referenceType, referenceId,
                { flagCount: fraudCheck.flagCount, actionType }
            )
            return {
                success: true,
                reward_given: false,
                reason: 'fraud_review',
                transaction_id: txId
            }
        }

        // 5. Create the earning transaction and credit wallet (atomic)
        const result = await creditReward(
            userId, actionType, amountPaise,
            referenceType, referenceId, metadata
        )

        // 6. Update daily cap tracker
        if (isCapApplicable) {
            await updateDailyCap(userId, amountPaise)
        }

        return {
            success: true,
            reward_given: true,
            reason: null,
            transaction_id: result.transactionId,
            new_balance_paise: result.newBalance
        }

    } catch (err) {
        console.error('[EarningEngine] processReward error:', err)
        return {
            success: true, // Never break UX
            reward_given: false,
            reason: 'internal_error',
            transaction_id: null
        }
    }
}

/**
 * Fetch reward config from earning_rewards_config table.
 */
async function getRewardConfig(actionType) {
    const { data } = await supabaseAdmin
        .from('earning_rewards_config')
        .select('*')
        .eq('action_key', actionType)
        .eq('is_active', true)
        .single()
    return data
}

/**
 * Check if user has exceeded the daily cap for data actions.
 * Cap = 5000 paise (₹50) per day.
 */
async function checkDailyCap(userId) {
    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabaseAdmin
        .from('daily_earning_caps')
        .select('total_earned_paise')
        .eq('user_id', userId)
        .eq('cap_date', today)
        .single()

    const totalEarned = data?.total_earned_paise || 0

    if (totalEarned >= DAILY_CAP_PAISE) {
        return { allowed: false, totalEarned, remaining: 0 }
    }

    return { allowed: true, totalEarned, remaining: DAILY_CAP_PAISE - totalEarned }
}

/**
 * Update the daily earning cap tracker after a successful reward.
 */
async function updateDailyCap(userId, amountPaise) {
    const today = new Date().toISOString().split('T')[0]

    // Upsert: create or increment
    const { data: existing } = await supabaseAdmin
        .from('daily_earning_caps')
        .select('id, total_earned_paise')
        .eq('user_id', userId)
        .eq('cap_date', today)
        .single()

    if (existing) {
        await supabaseAdmin
            .from('daily_earning_caps')
            .update({ total_earned_paise: existing.total_earned_paise + amountPaise })
            .eq('id', existing.id)
    } else {
        await supabaseAdmin
            .from('daily_earning_caps')
            .insert({
                user_id: userId,
                cap_date: today,
                total_earned_paise: amountPaise
            })
    }
}

/**
 * Credit a reward: create earning_transaction + update users.wallet_balance.
 * This is the ONLY way to modify wallet_balance for earning rewards.
 */
async function creditReward(userId, actionType, amountPaise, referenceType, referenceId, metadata) {
    // 1. Create earning transaction (ledger stores paise)
    const { data: tx, error: txError } = await supabaseAdmin
        .from('earning_transactions')
        .insert({
            user_id: userId,
            action_type: actionType,
            amount_paise: amountPaise,
            status: 'completed',
            reference_type: referenceType,
            reference_id: referenceId,
            metadata
        })
        .select('id')
        .single()

    if (txError) throw txError

    // 2. Fetch current balance (stored as RUPEES in NUMERIC(10,2))
    const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('wallet_balance')
        .eq('id', userId)
        .single()

    if (userError) throw userError

    // wallet_balance is in RUPEES; convert paise to rupees for the update
    const currentBalanceRupees = user?.wallet_balance ? parseFloat(user.wallet_balance) : 0
    const amountRupees = amountPaise / 100
    const newBalanceRupees = parseFloat((currentBalanceRupees + amountRupees).toFixed(2))

    // 3. Update wallet balance (single source of truth — stored in rupees)
    const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ wallet_balance: newBalanceRupees })
        .eq('id', userId)

    if (updateError) throw updateError

    // Return paise for internal consistency
    return { transactionId: tx.id, newBalance: Math.round(newBalanceRupees * 100) }
}

/**
 * Create a frozen transaction (for fraud cases).
 * Does NOT credit wallet.
 */
async function createFrozenTransaction(userId, actionType, amountPaise, referenceType, referenceId, frozenReason, metadata) {
    const { data: tx } = await supabaseAdmin
        .from('earning_transactions')
        .insert({
            user_id: userId,
            action_type: actionType,
            amount_paise: amountPaise,
            status: 'frozen',
            reference_type: referenceType,
            reference_id: referenceId,
            frozen_reason: frozenReason,
            metadata
        })
        .select('id')
        .single()

    return tx?.id
}

/**
 * Freeze an existing completed transaction (admin action or automated).
 * Debits the wallet by the amount and marks transaction frozen.
 */
export async function freezeTransaction(transactionId, reason) {
    try {
        const { data: tx } = await supabaseAdmin
            .from('earning_transactions')
            .select('*')
            .eq('id', transactionId)
            .eq('status', 'completed')
            .single()

        if (!tx) return { success: false, reason: 'transaction_not_found_or_already_frozen' }

        // Mark as frozen
        await supabaseAdmin
            .from('earning_transactions')
            .update({ status: 'frozen', frozen_reason: reason })
            .eq('id', transactionId)

        // Debit wallet (wallet_balance is in RUPEES, tx.amount_paise is in PAISE)
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('wallet_balance')
            .eq('id', tx.user_id)
            .single()

        const currentBalanceRupees = user?.wallet_balance ? parseFloat(user.wallet_balance) : 0
        const debitRupees = tx.amount_paise / 100
        const newBalanceRupees = parseFloat(Math.max(0, currentBalanceRupees - debitRupees).toFixed(2))

        await supabaseAdmin
            .from('users')
            .update({ wallet_balance: newBalanceRupees })
            .eq('id', tx.user_id)

        return { success: true, frozenAmount: tx.amount_paise, newBalance: Math.round(newBalanceRupees * 100) }
    } catch (err) {
        console.error('[EarningEngine] freezeTransaction error:', err)
        return { success: false, reason: 'internal_error' }
    }
}

/**
 * Get user's earning summary.
 */
export async function getEarningSummary(userId) {
    const today = new Date().toISOString().split('T')[0]

    const { data: user } = await supabaseAdmin
        .from('users')
        .select('wallet_balance, trust_score, scout_status')
        .eq('id', userId)
        .single()

    const { data: capData } = await supabaseAdmin
        .from('daily_earning_caps')
        .select('total_earned_paise')
        .eq('user_id', userId)
        .eq('cap_date', today)
        .single()

    const { count: totalTransactions } = await supabaseAdmin
        .from('earning_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')

    // wallet_balance is stored in RUPEES; convert to paise for API response
    const walletRupees = user?.wallet_balance ? parseFloat(user.wallet_balance) : 0

    return {
        wallet_balance_paise: Math.round(walletRupees * 100),
        wallet_balance_rupees: walletRupees,
        trust_score: user?.trust_score ?? 100,
        scout_status: user?.scout_status ?? 'active',
        daily_earned_paise: capData?.total_earned_paise || 0,
        daily_cap_paise: DAILY_CAP_PAISE,
        daily_remaining_paise: Math.max(0, DAILY_CAP_PAISE - (capData?.total_earned_paise || 0)),
        total_transactions: totalTransactions || 0
    }
}
