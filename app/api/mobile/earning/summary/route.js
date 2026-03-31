/**
 * Earning Summary API — Get user's earning overview
 * Returns wallet balance, trust score, daily cap usage, transaction history
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { getEarningSummary } from '@/lib/earningEngine'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        // Get summary
        const summary = await getEarningSummary(user.user_id)

        // Get recent transactions
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        const { data: transactions, error: txError } = await supabaseAdmin
            .from('earning_transactions')
            .select('id, action_type, amount_paise, status, reference_type, created_at, frozen_reason')
            .eq('user_id', user.user_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (txError) throw txError

        return successResponse('Earning summary fetched', {
            ...summary,
            transactions: transactions || []
        })

    } catch (err) {
        console.error('[EarningSummary] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
