/**
 * Sponsorship Admin Approval API
 * Admin endpoint to approve/reject sponsorship claims.
 * On approval → credit wallet via processReward.
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return errorResponse('Unauthorized - Admin only', 401)
        }

        const body = await request.json()
        const { claim_id, action, admin_note } = body
        // action: 'approve' or 'reject'

        if (!claim_id || !action) {
            return errorResponse('claim_id and action (approve/reject) are required', 400)
        }

        if (!['approve', 'reject'].includes(action)) {
            return errorResponse('action must be "approve" or "reject"', 400)
        }

        // Fetch claim
        const { data: claim } = await supabaseAdmin
            .from('sponsorship_claims')
            .select('*')
            .eq('id', claim_id)
            .single()

        if (!claim) {
            return errorResponse('Claim not found', 404)
        }

        if (claim.status === 'approved' || claim.status === 'rejected') {
            return errorResponse(`Claim already ${claim.status}`, 400)
        }

        if (action === 'reject') {
            await supabaseAdmin
                .from('sponsorship_claims')
                .update({
                    status: 'rejected',
                    admin_approved_by: user.user_id,
                    admin_note: admin_note || null
                })
                .eq('id', claim_id)

            return successResponse('Claim rejected', { claim_id, status: 'rejected' })
        }

        // Approve → process reward
        const rewardResult = await processReward({
            userId: claim.user_id,
            actionType: `sponsorship_${claim.tier}`,
            amountPaise: claim.amount_paise,
            referenceType: 'sponsorship_claim',
            referenceId: claim_id,
            metadata: { tier: claim.tier, check_in_count: claim.check_in_count }
        })

        await supabaseAdmin
            .from('sponsorship_claims')
            .update({
                status: 'approved',
                admin_approved_by: user.user_id,
                admin_note: admin_note || null,
                reward_tx_id: rewardResult.transaction_id
            })
            .eq('id', claim_id)

        return successResponse('Claim approved and wallet credited', {
            claim_id,
            status: 'approved',
            reward_given: rewardResult.reward_given,
            amount_paise: rewardResult.reward_given ? claim.amount_paise : 0,
            transaction_id: rewardResult.transaction_id
        })

    } catch (err) {
        console.error('[SponsorshipAdmin] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}

/**
 * GET — List all sponsorship claims for admin review
 */
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return errorResponse('Unauthorized - Admin only', 401)
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') // filter by status

        let query = supabaseAdmin
            .from('sponsorship_claims')
            .select(`
                *,
                users!sponsorship_claims_user_id_fkey(full_name, email, mobile)
            `)
            .order('created_at', { ascending: false })

        if (status) {
            query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) throw error

        return successResponse('Sponsorship claims fetched', data)
    } catch (err) {
        console.error('[SponsorshipAdmin] GET Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
