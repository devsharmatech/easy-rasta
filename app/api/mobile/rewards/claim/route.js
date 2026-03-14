import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { reward_amount, reward_type, reward_description } = body

        if (reward_amount === undefined || !reward_type) {
            return errorResponse('Missing required fields: reward_amount, reward_type', 400)
        }

        // 1. Insert the reward log into `rider_rewards`
        const { error: dbError } = await supabaseAdmin
            .from('rider_rewards')
            .insert({
                rider_id: user.user_id,
                reward_amount: parseFloat(reward_amount),
                reward_type,
                reward_description: reward_description || `Spin Wheel Prize: ${reward_type}`
            })

        if (dbError) throw dbError

        let finalWalletBalance = null

        // 2. If it's a cash/wallet reward, increment the rider's balance
        if (reward_type === 'cash' || reward_type === 'wallet') {
            // We need to fetch current balance and add to it
            const { data: userData, error: fetchError } = await supabaseAdmin
                .from('users')
                .select('wallet_balance')
                .eq('id', user.user_id)
                .single()

            if (fetchError) throw fetchError

            const currentBalance = userData.wallet_balance ? parseFloat(userData.wallet_balance) : 0
            finalWalletBalance = currentBalance + parseFloat(reward_amount)

            // Update User's balance
            const { error: updateError } = await supabaseAdmin
                .from('users')
                .update({ wallet_balance: finalWalletBalance })
                .eq('id', user.user_id)

            if (updateError) throw updateError
        }

        return successResponse('Reward claimed successfully', {
            reward_type,
            reward_amount,
            new_wallet_balance: finalWalletBalance
        })

    } catch (err) {
        console.error('Rewards Entry Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
