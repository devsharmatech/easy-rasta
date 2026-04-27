import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: flags, error } = await supabaseAdmin
            .from('fraud_flags')
            .select(`
                *,
                user:users!fraud_flags_user_id_fkey(full_name, mobile)
            `)
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) throw error

        return NextResponse.json(flags || [])
    } catch (err) {
        console.error('Fraud Flags Fetch Error:', err)
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
        const { flag_id, action } = body // action = 'resolve' | 'penalize'

        if (!flag_id || !['resolve', 'penalize'].includes(action)) {
            return NextResponse.json({ error: 'Valid flag_id and action required' }, { status: 400 })
        }

        if (action === 'resolve') {
            await supabaseAdmin
                .from('fraud_flags')
                .update({ 
                    resolved: true, 
                    resolved_by: user.user_id,
                    resolved_at: new Date().toISOString()
                })
                .eq('id', flag_id)
            
            return NextResponse.json({ message: 'Flag resolved' })
        } else if (action === 'penalize') {
            // Fetch the flag to get user_id
            const { data: flag } = await supabaseAdmin.from('fraud_flags').select('user_id').eq('id', flag_id).single()
            if (!flag) return NextResponse.json({ error: 'Flag not found' }, { status: 404 })

            // Example penalty: reset trust score or set scout_status to 'blocked'
            await supabaseAdmin
                .from('users')
                .update({ scout_status: 'blocked', trust_score: 0 })
                .eq('id', flag.user_id)

            await supabaseAdmin
                .from('fraud_flags')
                .update({ 
                    resolved: true, 
                    resolved_by: user.user_id,
                    resolved_at: new Date().toISOString()
                })
                .eq('id', flag_id)

            return NextResponse.json({ message: 'User penalized and flag resolved' })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err) {
        console.error('Fraud Flag Action Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
