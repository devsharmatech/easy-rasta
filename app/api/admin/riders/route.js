import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Join with users table for contact info
        const { data, error } = await supabaseAdmin
            .from('rider_profiles')
            .select('*, users(full_name, mobile, email, profile_image_url)')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(data)
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PATCH — Suspend or unsuspend a rider
export async function PATCH(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { rider_id, suspended } = body

        if (!rider_id || typeof suspended !== 'boolean') {
            return NextResponse.json({ error: 'rider_id and suspended (boolean) required' }, { status: 400 })
        }

        const { error } = await supabaseAdmin
            .from('rider_profiles')
            .update({ suspended })
            .eq('id', rider_id)

        if (error) throw error

        return NextResponse.json({ message: suspended ? 'Rider suspended' : 'Rider reinstated' })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
