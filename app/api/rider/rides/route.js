import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { awardXP } from '@/lib/xp'

// Start a ride
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
        const { vehicle_id, start_lat, start_long, ride_name } = body

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
                .single()

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
