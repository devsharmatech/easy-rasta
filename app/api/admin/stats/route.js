import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'

// Safe query helper — returns default on error instead of crashing
const safeQuery = async (queryFn, fallback = null) => {
    try {
        const result = await queryFn()
        return result
    } catch {
        return { data: fallback, count: 0, error: null }
    }
}

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Each query wrapped safely — one failing won't crash others
        const [
            vendorsRes,
            ridersRes,
            eventsRes,
            ridesRes,
            reviewsRes,
            ridesDistRes,
            ordersRes,
            paidOrdersRes,
            dailyRegRes,
            dailyRidesRes,
            productsRes,
            recentRidersRes,
            recentOrdersRes
        ] = await Promise.all([
            safeQuery(() => supabaseAdmin.from('vendor_profiles').select('*', { count: 'exact', head: true })),
            safeQuery(() => supabaseAdmin.from('rider_profiles').select('*', { count: 'exact', head: true })),
            safeQuery(() => supabaseAdmin.from('events').select('*', { count: 'exact', head: true })),
            safeQuery(() => supabaseAdmin.from('rides').select('*', { count: 'exact', head: true })),
            safeQuery(() => supabaseAdmin.from('vendor_reviews').select('*', { count: 'exact', head: true })),
            safeQuery(() => supabaseAdmin.from('rides').select('total_distance').eq('status', 'completed'), []),
            safeQuery(() => supabaseAdmin.from('orders').select('*', { count: 'exact', head: true })),
            safeQuery(() => supabaseAdmin.from('orders').select('total_amount, created_at').eq('payment_status', 'paid'), []),
            safeQuery(() => supabaseAdmin.rpc('get_daily_registrations_counts'), []),
            safeQuery(() => supabaseAdmin.rpc('get_daily_rides_counts'), []),
            safeQuery(() => supabaseAdmin.from('products').select('*', { count: 'exact', head: true })),
            safeQuery(() => supabaseAdmin.from('rider_profiles').select('id, created_at, users:user_id(full_name, profile_image_url)').order('created_at', { ascending: false }).limit(5), []),
            safeQuery(() => supabaseAdmin.from('orders').select('id, total_amount, status, payment_status, created_at').order('created_at', { ascending: false }).limit(5), [])
        ])

        const rides = ridesDistRes?.data || []
        const paidOrders = paidOrdersRes?.data || []
        const dailyRegistrations = dailyRegRes?.data || []
        const dailyRides = dailyRidesRes?.data || []
        const recentRiders = recentRidersRes?.data || []
        const recentOrders = recentOrdersRes?.data || []

        const totalDistance = rides.reduce((acc, ride) => acc + (Number(ride.total_distance) || 0), 0)
        const totalEarnings = paidOrders.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0)

        // This month's earnings
        const now = new Date()
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const thisMonthEarnings = paidOrders
            .filter(o => o.created_at >= firstOfMonth)
            .reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0)

        // Today's new riders
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayStr = today.toISOString()
        const todayRiders = recentRiders.filter(r => r.created_at >= todayStr).length

        return NextResponse.json({
            vendors: vendorsRes?.count || 0,
            riders: ridersRes?.count || 0,
            events: eventsRes?.count || 0,
            rides: ridesRes?.count || 0,
            reviews: reviewsRes?.count || 0,
            orders: ordersRes?.count || 0,
            products: productsRes?.count || 0,
            totalDistance: Math.round(totalDistance) || 0,
            totalEarnings: Math.round(totalEarnings) || 0,
            thisMonthEarnings: Math.round(thisMonthEarnings) || 0,
            todayRiders,
            graphs: {
                registrations: Array.isArray(dailyRegistrations) ? dailyRegistrations : [],
                rides: Array.isArray(dailyRides) ? dailyRides : []
            },
            recentRiders,
            recentOrders
        })

    } catch (err) {
        console.error('Admin stats error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
