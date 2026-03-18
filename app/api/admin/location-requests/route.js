import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const type = searchParams.get('type')

        let query = supabaseAdmin
            .from('location_requests')
            .select('*, rider:rider_profiles(id, user_id, users(full_name, email, mobile))')
            .order('created_at', { ascending: false })

        if (status) query = query.eq('status', status)
        if (type) query = query.eq('type', type)

        const { data, error } = await query

        if (error) throw error

        return successResponse('Location requests fetched successfully', data)
    } catch (err) {
        console.error('[Admin Location Requests GET] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
