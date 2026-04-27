import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0


// POST — Update FCM Device Token for the logged-in user (Vendor)
export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { device_token } = body

        if (!device_token) {
            return errorResponse('device_token is required', 400)
        }

        // Update the user's device token
        const { data, error } = await supabaseAdmin
            .from('users')
            .update({ device_token })
            .eq('id', user.user_id)
            .select('id, device_token')
            .single()

        if (error) {
            console.error('[Vendor FCM Token] DB Error:', error)
            return errorResponse('Failed to update device token', 500)
        }

        return successResponse('Device token updated successfully', data)
    } catch (err) {
        console.error('[Vendor FCM Token] Internal Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
