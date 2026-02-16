import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabaseAdmin
            .from('amenities_master')
            .select('*')
            .order('name', { ascending: true })

        if (error) throw error

        return NextResponse.json(data)
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, category, icon_url } = body

        const { data, error } = await supabaseAdmin
            .from('amenities_master')
            .insert({ name, category, icon_url, is_active: true })
            .select()

        if (error) throw error

        return NextResponse.json(data)
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
