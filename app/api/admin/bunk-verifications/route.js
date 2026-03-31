import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { freezeTransaction } from '@/lib/earningEngine'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch pending amenities (verified = false or null depending on how it's structurally meant, actually verified boolean defaults to false)
        // Let's just fetch all recent amenities and offers.
        const { data: amenities, error: amenErr } = await supabaseAdmin
            .from('bunk_amenities')
            .select(`
                *,
                scout:users!bunk_amenities_submitted_by_user_id_fkey(full_name, mobile),
                profile:bunk_profiles!bunk_amenities_bunk_profile_id_fkey(place_id, display_name)
            `)
            .order('created_at', { ascending: false })
            .limit(100)

        const { data: offers, error: offErr } = await supabaseAdmin
            .from('bunk_offers')
            .select(`
                *,
                scout:users!bunk_offers_submitted_by_user_id_fkey(full_name, mobile),
                profile:bunk_profiles!bunk_offers_bunk_profile_id_fkey(place_id, display_name)
            `)
            .order('created_at', { ascending: false })
            .limit(100)

        if (amenErr) throw amenErr
        if (offErr) throw offErr

        return NextResponse.json({ amenities: amenities || [], offers: offers || [] })
    } catch (err) {
        console.error('Bunk Fetch Error:', err)
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
        const { item_id, item_type, action, admin_note } = body // item_type = 'amenity' | 'offer', action = 'verify' | 'reject'

        if (!item_id || !['amenity', 'offer'].includes(item_type) || !['verify', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Valid item_id, item_type and action required' }, { status: 400 })
        }

        if (item_type === 'amenity') {
            const { data: amenity } = await supabaseAdmin.from('bunk_amenities').select('*').eq('id', item_id).single()
            if (!amenity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

            if (action === 'verify') {
                await supabaseAdmin.from('bunk_amenities').update({ verified: true }).eq('id', item_id)
                return NextResponse.json({ message: 'Amenity verified' })
            } else if (action === 'reject') {
                await supabaseAdmin.from('bunk_amenities').delete().eq('id', item_id)
                if (amenity.reward_tx_id) {
                    await freezeTransaction(amenity.reward_tx_id, 'Admin rejected bunk amenity: ' + (admin_note || 'Fraud detected'))
                }
                return NextResponse.json({ message: 'Amenity rejected and deleted. Reward frozen.' })
            }
        } 
        
        if (item_type === 'offer') {
            const { data: offer } = await supabaseAdmin.from('bunk_offers').select('*').eq('id', item_id).single()
            if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

            if (action === 'verify') {
                // For offers, verified just means it stays active
                await supabaseAdmin.from('bunk_offers').update({ source: 'admin' }).eq('id', item_id) // Mark as admin-verified
                return NextResponse.json({ message: 'Offer verified' })
            } else if (action === 'reject') {
                await supabaseAdmin.from('bunk_offers').delete().eq('id', item_id)
                if (offer.reward_tx_id) {
                    await freezeTransaction(offer.reward_tx_id, 'Admin rejected bunk offer: ' + (admin_note || 'Fraud detected'))
                }
                return NextResponse.json({ message: 'Offer rejected and deleted. Reward frozen.' })
            }
        }

        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })

    } catch (err) {
        console.error('Bunk Update Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
