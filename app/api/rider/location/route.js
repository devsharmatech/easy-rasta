import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

// POST — Update rider current location
export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { latitude, longitude } = body

        if (latitude === undefined || longitude === undefined) {
            return errorResponse('Latitude and Longitude are required', 400)
        }

        const { error } = await supabaseAdmin
            .from('rider_profiles')
            .update({
                last_latitude: latitude,
                last_longitude: longitude,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.user_id)

        if (error) throw error

        return successResponse('Location updated successfully')
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
