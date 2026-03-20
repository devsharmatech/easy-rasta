import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdmin } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function POST(request) {
    try {
        const admin = await verifyAdmin(request)
        if (!admin) return errorResponse('Unauthorized', 401)

        const { expense_ids, action } = await request.json()
        
        if (!Array.isArray(expense_ids) || expense_ids.length === 0) {
            return errorResponse('Please provide at least one expense ID', 400)
        }

        if (!['approve', 'reject'].includes(action)) {
            return errorResponse('Valid action (approve, reject) is required', 400)
        }

        // Fetch the pending expenses to avoid double approvals or processing already rejected
        const { data: pendingExpenses, error: checkError } = await supabaseAdmin
            .from('rider_expenses')
            .select('*')
            .in('id', expense_ids)
            .eq('status', 'pending')

        if (checkError) throw checkError

        if (!pendingExpenses || pendingExpenses.length === 0) {
            return errorResponse('No pending expenses found for the provided IDs', 400)
        }

        const validIds = pendingExpenses.map(exp => exp.id)

        // Bulk Reject
        if (action === 'reject') {
            const { error: rejectError } = await supabaseAdmin
                .from('rider_expenses')
                .update({ status: 'rejected', updated_at: new Date().toISOString() })
                .in('id', validIds)

            if (rejectError) throw rejectError
            return successResponse(`Successfully rejected ${validIds.length} expenses.`)
        }

        // Bulk Approve and Cashback Calculus
        else if (action === 'approve') {
            // First mark as approved
            const { error: approveError } = await supabaseAdmin
                .from('rider_expenses')
                .update({ status: 'approved', updated_at: new Date().toISOString() })
                .in('id', validIds)

            if (approveError) throw approveError

            // Fetch dynamic cashback percentages
            const { data: settings } = await supabaseAdmin
                .from('system_settings')
                .select('value')
                .eq('key', 'cashback_percentages')
                .single()

            const percentages = settings?.value || { fuel: 5, service: 5, washroom: 5, other: 5 }

            // Group transactions by Rider ID to batch wallet top-ups
            const riderUpdates = {}
            const newTransactions = []

            for (const exp of pendingExpenses) {
                const percent = percentages[exp.type] || 5
                const cashbackAmount = parseFloat(((exp.amount * percent) / 100).toFixed(2))

                if (cashbackAmount > 0) {
                    riderUpdates[exp.rider_id] = (riderUpdates[exp.rider_id] || 0) + cashbackAmount

                    newTransactions.push({
                        rider_id: exp.rider_id,
                        amount: cashbackAmount,
                        type: 'credit',
                        description: `Cashback for ${exp.type} expense. Approved by Admin.`,
                        reference_id: exp.id
                    })
                }
            }

            // Execute Wallet Additions
            if (newTransactions.length > 0) {
                const { error: txError } = await supabaseAdmin
                    .from('wallet_transactions')
                    .insert(newTransactions)

                if (txError) console.error("Error logging wallet transactions:", txError)

                // Update Balances efficiently per rider
                // Using RPC per rider or looping via backend. RPC is best but loop backend works for small loads
                for (const riderId of Object.keys(riderUpdates)) {
                    // Supabase js lacks direct arithmetic updates safely from client side without RPC
                    // However using admin key, we can pull then push
                    const { data: riderProfile } = await supabaseAdmin
                        .from('rider_profiles')
                        .select('wallet_balance')
                        .eq('id', riderId)
                        .single()
                    
                    const newBalance = parseFloat(riderProfile?.wallet_balance || 0) + riderUpdates[riderId]
                    
                    await supabaseAdmin
                        .from('rider_profiles')
                        .update({ wallet_balance: newBalance })
                        .eq('id', riderId)
                        
                    // Optional: Call sendPushNotification regarding cashback
                    // sendPushNotification(...)
                }
            }

            return successResponse(`Successfully approved ${validIds.length} expenses and deposited cashback!`)
        }

    } catch (err) {
        console.error('Admin Expense Action Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
