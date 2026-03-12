import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { awardXP } from '@/lib/xp'

// GET — Fetch travel history (completed rides)
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') return errorResponse('Unauthorized', 401)

        const { searchParams } = new URL(request.url)
        const vehicle_id = searchParams.get('vehicle_id')

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        let query = supabaseAdmin
            .from('rides')
            .select('id, ride_name, start_lat, start_long, end_lat, end_long, total_distance, duration_minutes, avg_speed, is_manual, ride_date, created_at, vehicles(id, make, model)')
            .eq('rider_id', riderProfile.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })

        if (vehicle_id) {
            query = query.eq('vehicle_id', vehicle_id)
        }

        const { data, error } = await query
        if (error) throw error

        return successResponse('Travel history fetched successfully', data)
    } catch (err) {
        console.error('[Rides GET] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}

// POST — Start a live ride OR log a manual past trip
export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        const body = await request.json()
        const { vehicle_id, start_lat, start_long, ride_name, is_manual, total_distance, duration_minutes, ride_date } = body

        // If manual history, insert as completed directly
        if (is_manual) {
            if (!vehicle_id || total_distance === undefined) {
                return errorResponse('vehicle_id and total_distance are required for manual history', 400)
            }

            const { data, error } = await supabaseAdmin
                .from('rides')
                .insert({
                    rider_id: riderProfile.id,
                    vehicle_id,
                    ride_name: ride_name || 'Manual Trip',
                    total_distance,
                    duration_minutes: duration_minutes || 0,
                    is_manual: true,
                    ride_date: ride_date || new Date().toISOString().split('T')[0],
                    status: 'completed',
                    created_at: new Date().toISOString()
                })
                .select()
                .single()

            if (error) throw error
            
            // Award XP for manual rides too
            const xpEarned = Math.floor(total_distance) * 2 // example: 2 xp per km
            if (xpEarned > 0) {
                await awardXP(riderProfile.id, 'ride_distance_per_km', data.id, xpEarned)
            }

            return successResponse('Manual travel history added', data)
        }

        // Otherwise, start a normal live tracked ride
        const { data, error } = await supabaseAdmin
            .from('rides')
            .insert({
                rider_id: riderProfile.id,
                vehicle_id,
                ride_name: ride_name || 'My Ride',
                start_lat,
                start_long,
                status: 'active'
            })
            .select()
            .single()

        if (error) throw error

        return successResponse('Ride started successfully', data)

    } catch (err) {
        console.error('[Rides POST] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}

// Update ride (End ride or ping location)
export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action')
        const body = await request.json()
        const { ride_id } = body

        if (action === 'update_location') {
            const { latitude, longitude, speed } = body
            const { error } = await supabaseAdmin
                .from('ride_locations')
                .insert({
                    ride_id,
                    latitude,
                    longitude,
                    speed
                })
            if (error) throw error
            return successResponse('Location updated')
        }

        if (action === 'end') {
            const { end_lat, end_long, total_distance, duration_minutes, avg_speed } = body

            // Update ride status
            const { data: ride, error: rideError } = await supabaseAdmin
                .from('rides')
                .update({
                    end_lat,
                    end_long,
                    total_distance,
                    duration_minutes,
                    avg_speed,
                    status: 'completed'
                })
                .eq('id', ride_id)
                .eq('status', 'active')
                .select()
                .maybeSingle()

            if (rideError) throw rideError

            // AWARD XP Logic
            const { data: rule } = await supabaseAdmin
                .from('xp_rules')
                .select('*')
                .eq('action_key', 'ride_distance_per_km')
                .single()

            if (rule && rule.is_active && ride) {
                const xpEarned = Math.floor(total_distance) * rule.xp_value
                if (xpEarned > 0) {
                    await awardXP(ride.rider_id, 'ride_distance_per_km', ride_id, xpEarned)
                }
            }

            return successResponse('Ride completed', ride)
        }

        return errorResponse('Invalid action', 400)

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
