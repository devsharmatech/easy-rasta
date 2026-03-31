import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: configs, error } = await supabaseAdmin
            .from('earning_rewards_config')
            .select('*')
            .order('category', { ascending: true })

        if (error) throw error

        return NextResponse.json(configs || [])
    } catch (err) {
        console.error('Reward Config Fetch Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, reward_paise, is_active } = body

        if (!id) {
            return NextResponse.json({ error: 'Valid config id required' }, { status: 400 })
        }

        const updates = {}
        if (typeof reward_paise === 'number') updates.reward_paise = reward_paise
        if (typeof is_active === 'boolean') updates.is_active = is_active

        const { error } = await supabaseAdmin
            .from('earning_rewards_config')
            .update(updates)
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ message: 'Configuration updated successfully' })
    } catch (err) {
        console.error('Reward Config Action Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
