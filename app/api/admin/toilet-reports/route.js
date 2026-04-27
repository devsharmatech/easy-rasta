import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { freezeTransaction } from '@/lib/earningEngine'

export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabaseAdmin
            .from('toilet_reports')
            .select(`
                *,
                scout:users!toilet_reports_scout_user_id_fkey(full_name, mobile),
                verifier:users!toilet_reports_verified_by_user_id_fkey(full_name, mobile),
                corrector:users!toilet_reports_corrected_by_user_id_fkey(full_name, mobile)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(data)
    } catch (err) {
        console.error('Toilet Reports Fetch Error:', err)
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
        const { report_id, action, admin_note } = body

        if (!report_id || !['verify', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Valid report_id and action (verify/reject) required' }, { status: 400 })
        }

        const { data: report, error: reportErr } = await supabaseAdmin
            .from('toilet_reports')
            .select('*')
            .eq('id', report_id)
            .single()

        if (reportErr || !report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 })
        }

        if (action === 'verify') {
            await supabaseAdmin.from('toilet_reports').update({
                status: 'verified',
                verification_result: true,
                verified_by_user_id: user.user_id,
                verified_at: new Date().toISOString()
            }).eq('id', report_id)
            return NextResponse.json({ message: 'Report verified successfully' })
        } 
        
        if (action === 'reject') {
            await supabaseAdmin.from('toilet_reports').update({
                status: 'disputed',
                verification_result: false,
                verified_by_user_id: user.user_id,
                verified_at: new Date().toISOString()
            }).eq('id', report_id)

            if (report.scout_reward_tx_id) {
                await freezeTransaction(report.scout_reward_tx_id, 'Admin rejected toilet report: ' + (admin_note || 'Fraud detected'))
            }
            return NextResponse.json({ message: 'Report rejected and scout reward frozen' })
        }

    } catch (err) {
        console.error('Toilet Reports Update Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
