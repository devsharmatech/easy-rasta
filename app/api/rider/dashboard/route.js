import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

// GET — Rider Dashboard (single API for all stats)
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        // 1. Rider profile with user info
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('rider_profiles')
            .select('*, users:user_id(full_name, mobile, email, profile_image_url)')
            .eq('user_id', user.user_id)
            .single()

        if (profileError || !profile) return errorResponse('Rider profile not found', 404)

        // 2. Vehicles count
        const { count: vehicleCount } = await supabaseAdmin
            .from('vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('rider_id', profile.id)

        // 3. Recent rides (last 5)
        const { data: recentRides } = await supabaseAdmin
            .from('rides')
            .select('id, ride_name, total_distance, avg_speed, duration_minutes, status, created_at, vehicles(nickname, make, model)')
            .eq('rider_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(5)

        // 4. Upcoming joined events (next 3)
        const today = new Date().toISOString().split('T')[0]
        const { data: upcomingEvents } = await supabaseAdmin
            .from('event_participants')
            .select('joined_at, events(id, title, date, time, meeting_lat, meeting_long, ride_type, featured_image)')
            .eq('rider_id', profile.id)
            .gte('events.date', today)
            .order('joined_at', { ascending: false })
            .limit(3)

        // 5. Events created count
        const { count: eventsCreated } = await supabaseAdmin
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('rider_id', profile.id)

        // 6. Orders count
        const { count: totalOrders } = await supabaseAdmin
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('rider_id', profile.id)
            .eq('payment_status', 'paid')

        // 7. Reviews written count
        const { count: reviewsWritten } = await supabaseAdmin
            .from('vendor_reviews')
            .select('*', { count: 'exact', head: true })
            .eq('rider_id', profile.id)

        const dashboard = {
            rider: {
                name: profile.users?.full_name,
                mobile: profile.users?.mobile,
                email: profile.users?.email,
                profile_image: profile.users?.profile_image_url,
                referral_code: profile.referral_code
            },
            stats: {
                xp: profile.xp || 0,
                level: profile.level || 1,
                total_rides: profile.total_rides || 0,
                total_distance: parseFloat(profile.total_distance) || 0,
                avg_speed: parseFloat(profile.avg_speed) || 0,
                vehicles: vehicleCount || 0,
                events_created: eventsCreated || 0,
                total_orders: totalOrders || 0,
                reviews_written: reviewsWritten || 0
            },
            recent_rides: (recentRides || []).map(r => ({
                id: r.id,
                name: r.ride_name,
                distance: r.total_distance,
                speed: r.avg_speed,
                duration: r.duration_minutes,
                status: r.status,
                vehicle: r.vehicles ? `${r.vehicles.make} ${r.vehicles.model}` : null,
                date: r.created_at
            })),
            upcoming_events: (upcomingEvents || [])
                .filter(e => e.events)
                .map(e => ({
                    id: e.events.id,
                    title: e.events.title,
                    date: e.events.date,
                    time: e.events.time,
                    ride_type: e.events.ride_type,
                    image: e.events.featured_image
                }))
        }

        return successResponse('Dashboard loaded successfully', dashboard)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
