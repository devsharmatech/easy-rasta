import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'

async function safeQuery(fn) {
    try { return await fn() }
    catch (e) { console.error('Query error:', e.message); return { data: null, error: e } }
}

// GET — List all businesses or single business detail
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const bizId = searchParams.get('id')

        // Single business with full details
        if (bizId) {
            const { data: biz, error } = await supabaseAdmin
                .from('vendor_businesses')
                .select(`
                    *,
                    vendor_profiles:vendor_id(id, user_id, gst_number, verification_status,
                        users:user_id(full_name, mobile, email, profile_image_url)
                    )
                `)
                .eq('id', bizId)
                .single()

            if (error || !biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

            // Fetch services
            const { data: services } = await safeQuery(() =>
                supabaseAdmin
                    .from('vendor_services')
                    .select('*')
                    .eq('business_id', bizId)
                    .order('created_at', { ascending: false })
            )

            // Fetch reviews
            const { data: reviews } = await safeQuery(() =>
                supabaseAdmin
                    .from('reviews')
                    .select('id, rating, comment, created_at, users:user_id(full_name, profile_image_url)')
                    .eq('business_id', bizId)
                    .order('created_at', { ascending: false })
                    .limit(20)
            )

            // Fetch amenities
            const { data: amenities } = await safeQuery(() =>
                supabaseAdmin
                    .from('business_amenities')
                    .select('amenities:amenity_id(id, name, icon)')
                    .eq('business_id', bizId)
            )

            return NextResponse.json({
                ...biz,
                services: services || [],
                reviews: reviews || [],
                amenities: (amenities || []).map(a => a.amenities).filter(Boolean)
            })
        }

        // All businesses with summary
        const { data, error } = await supabaseAdmin
            .from('vendor_businesses')
            .select(`
                id, business_name, category, landmark, logo_url, is_active, deleted_at, created_at,
                open_time, close_time,
                vendor_profiles:vendor_id(id,
                    users:user_id(full_name, profile_image_url)
                )
            `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Get service count per business
        const bizIds = (data || []).map(b => b.id)
        let serviceCounts = {}
        if (bizIds.length > 0) {
            const { data: svcData } = await safeQuery(() =>
                supabaseAdmin
                    .from('vendor_services')
                    .select('business_id')
                    .in('business_id', bizIds)
            )
            if (svcData) {
                svcData.forEach(s => {
                    serviceCounts[s.business_id] = (serviceCounts[s.business_id] || 0) + 1
                })
            }
        }

        // Get review stats per business
        let reviewStats = {}
        if (bizIds.length > 0) {
            const { data: revData } = await safeQuery(() =>
                supabaseAdmin
                    .from('reviews')
                    .select('business_id, rating')
                    .in('business_id', bizIds)
            )
            if (revData) {
                revData.forEach(r => {
                    if (!reviewStats[r.business_id]) reviewStats[r.business_id] = { count: 0, sum: 0 }
                    reviewStats[r.business_id].count++
                    reviewStats[r.business_id].sum += r.rating
                })
            }
        }

        const result = (data || []).map(b => ({
            ...b,
            services_count: serviceCounts[b.id] || 0,
            review_count: reviewStats[b.id]?.count || 0,
            avg_rating: reviewStats[b.id] ? (reviewStats[b.id].sum / reviewStats[b.id].count).toFixed(1) : '0.0'
        }))

        return NextResponse.json(result)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PUT — Toggle business active status
export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, is_active } = body

        const { data, error } = await supabaseAdmin
            .from('vendor_businesses')
            .update({ is_active, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()

        if (error) throw error

        return NextResponse.json({ message: `Business ${is_active ? 'activated' : 'deactivated'}` })
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE — Delete single or multiple businesses (soft delete)
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const ids = searchParams.get('ids')

        const deleteTime = new Date().toISOString()

        if (ids) {
            const idList = ids.split(',').map(i => i.trim()).filter(Boolean)
            await supabaseAdmin
                .from('vendor_businesses')
                .update({ deleted_at: deleteTime, is_active: false })
                .in('id', idList)
            return NextResponse.json({ message: `${idList.length} businesses deleted` })
        }

        if (id) {
            await supabaseAdmin
                .from('vendor_businesses')
                .update({ deleted_at: deleteTime, is_active: false })
                .eq('id', id)
            return NextResponse.json({ message: 'Business deleted' })
        }

        return NextResponse.json({ error: 'Business ID(s) required' }, { status: 400 })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
