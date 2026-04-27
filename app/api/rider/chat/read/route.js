import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { event_id, participant_id: pId } = body

        if (!event_id) return errorResponse('event_id is required', 400)

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        const { data: event } = await supabaseAdmin
            .from('events')
            .select('rider_id')
            .eq('id', event_id)
            .single()

        if (!event) return errorResponse('Event not found', 404)

        const isOrganizer = event.rider_id === riderProfile.id
        const participant_id = isOrganizer ? pId : riderProfile.id

        if (isOrganizer && !participant_id) {
            return errorResponse('participant_id is required for organizers', 400)
        }

        // Mark messages as read where sender is NOT the current user
        const { error } = await supabaseAdmin
            .from('event_messages')
            .update({ is_read: true })
            .eq('event_id', event_id)
            .eq('participant_id', participant_id)
            .neq('sender_id', riderProfile.id)
            .eq('is_read', false)

        if (error) throw error

        return successResponse('Messages marked as read')

    } catch (err) {
        console.error("MARK READ ERROR:", err)
        return errorResponse('Internal Server Error', 500)
    }
}
