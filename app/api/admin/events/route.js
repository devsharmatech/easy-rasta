import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const eventId = searchParams.get('id')

        // ─── Single event with full details ───
        if (eventId) {
            const { data: event, error } = await supabaseAdmin
                .from('events')
                .select(`
                    *,
                    rider_profiles:rider_id(
                        id, user_id, total_rides, level, xp,
                        users:user_id(full_name, email, mobile, profile_image_url)
                    )
                `)
                .eq('id', eventId)
                .single()

            if (error || !event) {
                return NextResponse.json({ error: 'Event not found' }, { status: 404 })
            }

            // Fetch participants with rider info, vehicle, and payment
            const { data: participants } = await supabaseAdmin
                .from('event_participants')
                .select(`
                    id, vehicle_id, consent_safety, consent_liability, payment_id, joined_at,
                    rider_profiles:rider_id(
                        id, user_id, total_rides, level,
                        users:user_id(full_name, email, mobile, profile_image_url)
                    ),
                    vehicles:vehicle_id(id, nickname, type, make, model, image_url)
                `)
                .eq('event_id', eventId)
                .order('joined_at', { ascending: false })

            // Fetch payments for this event
            const { data: payments } = await supabaseAdmin
                .from('event_payments')
                .select('id, rider_id, amount, status, razorpay_order_id, razorpay_payment_id, created_at')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })

            const paymentsMap = {}
            let totalRevenue = 0
            let paidCount = 0
            if (payments) {
                for (const p of payments) {
                    paymentsMap[p.id] = p
                    if (p.status === 'paid') {
                        totalRevenue += Number(p.amount) || 0
                        paidCount++
                    }
                }
            }

            // Enrich participants with payment info
            const enrichedParticipants = (participants || []).map(p => {
                const payment = p.payment_id ? paymentsMap[p.payment_id] : null
                return {
                    id: p.id,
                    joined_at: p.joined_at,
                    consent_safety: p.consent_safety,
                    consent_liability: p.consent_liability,
                    rider: p.rider_profiles ? {
                        id: p.rider_profiles.id,
                        user_id: p.rider_profiles.user_id,
                        full_name: p.rider_profiles.users?.full_name || 'Unknown',
                        email: p.rider_profiles.users?.email || null,
                        mobile: p.rider_profiles.users?.mobile || null,
                        profile_image_url: p.rider_profiles.users?.profile_image_url || null,
                        level: p.rider_profiles.level || 1,
                        total_rides: p.rider_profiles.total_rides || 0,
                    } : null,
                    vehicle: p.vehicles ? {
                        id: p.vehicles.id,
                        nickname: p.vehicles.nickname,
                        type: p.vehicles.type,
                        make: p.vehicles.make,
                        model: p.vehicles.model,
                        image_url: p.vehicles.image_url,
                    } : null,
                    payment: payment ? {
                        id: payment.id,
                        amount: payment.amount,
                        status: payment.status,
                        razorpay_order_id: payment.razorpay_order_id,
                        razorpay_payment_id: payment.razorpay_payment_id,
                        created_at: payment.created_at,
                    } : null,
                }
            })

            return NextResponse.json({
                ...event,
                host: event.rider_profiles ? {
                    id: event.rider_profiles.id,
                    full_name: event.rider_profiles.users?.full_name || 'Unknown',
                    email: event.rider_profiles.users?.email || null,
                    mobile: event.rider_profiles.users?.mobile || null,
                    profile_image_url: event.rider_profiles.users?.profile_image_url || null,
                    level: event.rider_profiles.level || 1,
                    total_rides: event.rider_profiles.total_rides || 0,
                    xp: event.rider_profiles.xp || 0,
                } : null,
                rider_profiles: undefined,
                participants: enrichedParticipants,
                stats: {
                    total_participants: enrichedParticipants.length,
                    total_revenue: totalRevenue,
                    paid_count: paidCount,
                },
                all_payments: payments || [],
            })
        }

        // ─── All events with summary stats ───
        const { data, error } = await supabaseAdmin
            .from('events')
            .select(`
                *,
                rider_profiles:rider_id(
                    id, user_id,
                    users:user_id(full_name, profile_image_url)
                )
            `)
            .order('date', { ascending: false })

        if (error) throw error

        // Fetch participant counts for every event
        const eventIds = (data || []).map(e => e.id)

        let participantCounts = {}
        if (eventIds.length > 0) {
            const { data: pCounts } = await supabaseAdmin
                .from('event_participants')
                .select('event_id')
                .in('event_id', eventIds)

            if (pCounts) {
                for (const p of pCounts) {
                    participantCounts[p.event_id] = (participantCounts[p.event_id] || 0) + 1
                }
            }
        }

        // Fetch revenue per event for paid events
        let revenueCounts = {}
        if (eventIds.length > 0) {
            const { data: payments } = await supabaseAdmin
                .from('event_payments')
                .select('event_id, amount, status')
                .in('event_id', eventIds)
                .eq('status', 'paid')

            if (payments) {
                for (const p of payments) {
                    revenueCounts[p.event_id] = (revenueCounts[p.event_id] || 0) + (Number(p.amount) || 0)
                }
            }
        }

        const result = (data || []).map(event => ({
            ...event,
            host_name: event.rider_profiles?.users?.full_name || 'Unknown',
            host_image: event.rider_profiles?.users?.profile_image_url || null,
            rider_profiles: undefined,
            participant_count: participantCounts[event.id] || 0,
            total_revenue: revenueCounts[event.id] || 0,
        }))

        return NextResponse.json(result)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// Update event status
export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, status } = body

        if (!['draft', 'published', 'closed'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const { data, error } = await supabaseAdmin
            .from('events')
            .update({ status })
            .eq('id', id)
            .select()

        if (error) throw error

        return NextResponse.json(data)
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
