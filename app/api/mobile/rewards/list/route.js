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

        // Fetch rewards for the authenticated rider
        const { data, error } = await supabaseAdmin
            .from('rider_rewards')
            .select('*')
            .eq('rider_id', user.user_id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return successResponse('Rewards fetched successfully', data)

    } catch (err) {
        console.error('Rewards Fetch Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
