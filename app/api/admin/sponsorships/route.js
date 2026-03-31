import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { processReward } from '@/lib/earningEngine'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: claims, error } = await supabaseAdmin
            .from('sponsorship_claims')
            .select(`
                *,
                rider:users!sponsorship_claims_user_id_fkey(id, full_name, mobile)
            `)
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) throw error

        return NextResponse.json(claims || [])
    } catch (err) {
        console.error('Sponsorship Admin Fetch Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { claim_id, action, admin_note } = body // action = 'approve' | 'reject'

        if (!claim_id || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Valid claim_id and action required' }, { status: 400 })
        }

        // Fetch the claim
        const { data: claim, error: fetchErr } = await supabaseAdmin
            .from('sponsorship_claims')
            .select('*')
            .eq('id', claim_id)
            .single()

        if (fetchErr || !claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        if (claim.status === 'approved') return NextResponse.json({ error: 'Already approved' }, { status: 400 })

        if (action === 'approve') {
            // Give reward safely
            const rewardResult = await processReward({
                userId: claim.user_id,
                actionType: 'sponsorship_claim',
                amountPaise: claim.amount_paise,
                referenceType: 'sponsorship_claim',
                referenceId: claim.id,
                metadata: { tier: claim.tier, claim_month: claim.claim_month }
            })

            await supabaseAdmin
                .from('sponsorship_claims')
                .update({ 
                    status: 'approved',
                    admin_approved_by: user.user_id,
                    reward_tx_id: rewardResult.transaction_id,
                    admin_note: admin_note || null
                })
                .eq('id', claim_id)

            return NextResponse.json({ message: 'Claim approved and rewarded successfully' })
        } else if (action === 'reject') {
            await supabaseAdmin
                .from('sponsorship_claims')
                .update({ 
                    status: 'rejected',
                    admin_approved_by: user.user_id,
                    admin_note: admin_note || 'Rejected manually by admin'
                })
                .eq('id', claim_id)

            return NextResponse.json({ message: 'Claim rejected' })
        }

        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })

    } catch (err) {
        console.error('Sponsorship Update Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
