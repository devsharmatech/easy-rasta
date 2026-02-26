import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { successResponse, errorResponse } from '@/lib/apiResponse'

// GET — Find nearest businesses with filtering
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const lat = parseFloat(searchParams.get('lat'))
        const long = parseFloat(searchParams.get('long'))
        const radius = parseFloat(searchParams.get('radius')) || 50
        const category = searchParams.get('category') // fuel, food, etc.
        const sortByPrice = searchParams.get('sort_by_price') === 'true'

        const hasToiletParam = searchParams.get('has_toilet')
        const hasToilet = hasToiletParam === 'true' ? true : (hasToiletParam === 'false' ? false : null)
        const toiletType = searchParams.get('toilet_type') // 'free' or 'paid'

        // Map bounds filtering
        const minLat = searchParams.get('min_lat') ? parseFloat(searchParams.get('min_lat')) : null
        const maxLat = searchParams.get('max_lat') ? parseFloat(searchParams.get('max_lat')) : null
        const minLong = searchParams.get('min_long') ? parseFloat(searchParams.get('min_long')) : null
        const maxLong = searchParams.get('max_long') ? parseFloat(searchParams.get('max_long')) : null

        if (isNaN(lat) || isNaN(long)) {
            return errorResponse('Valid latitude and longitude are required', 400)
        }

        // Call the RPC function
        const { data, error } = await supabaseAdmin.rpc('get_nearby_businesses', {
            p_lat: lat,
            p_long: long,
            p_radius_km: radius,
            p_category: category || null,
            p_min_lat: minLat,
            p_max_lat: maxLat,
            p_min_long: minLong,
            p_max_long: maxLong,
            p_sort_by_price: sortByPrice,
            p_has_toilet: hasToilet,
            p_restroom_type: toiletType || null
        })

        if (error) throw error

        return successResponse('Nearby businesses fetched successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
