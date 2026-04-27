import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        // Fetch active sessions from Postgres that haven't expired
        const { data, error } = await supabaseAdmin
            .from('live_location_shares')
            .select('*')
            .eq('user_id', user.user_id)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })

        if (error) throw error

        return successResponse('Active location shares retrieved', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
