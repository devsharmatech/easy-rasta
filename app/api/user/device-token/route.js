import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user) {
            return errorResponse('Unauthorized', 401)
        }

        const { device_token } = await request.json()

        if (!device_token) {
            return errorResponse('Device token required', 400)
        }

        const { error } = await supabaseAdmin
            .from('users')
            .update({ device_token })
            .eq('id', user.user_id)

        if (error) throw error

        return successResponse('Device token updated')
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}
