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

        const { searchParams } = new URL(request.url)
        const event_id = searchParams.get('event_id')
        let participant_id = searchParams.get('participant_id')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        if (!event_id) {
            return errorResponse('event_id is required', 400)
        }

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        // Verify if user is organizer or participant
        const { data: event } = await supabaseAdmin
            .from('events')
            .select('rider_id')
            .eq('id', event_id)
            .single()

        if (!event) return errorResponse('Event not found', 404)

        const isOrganizer = event.rider_id === riderProfile.id

        if (!isOrganizer) {
            // User is a participant. They can only see their own chat.
            participant_id = riderProfile.id
        } else {
            // User is organizer. They MUST provide participant_id to know which chat to open.
            if (!participant_id) {
                return errorResponse('participant_id is required for organizers', 400)
            }
        }

        // Fetch messages paginated
        const offset = (page - 1) * limit

        const { data: messages, error, count } = await supabaseAdmin
            .from('event_messages')
            .select('*', { count: 'exact' })
            .eq('event_id', event_id)
            .eq('organizer_id', event.rider_id)
            .eq('participant_id', participant_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        return successResponse('Messages fetched successfully', {
            messages,
            pagination: {
                total: count,
                page,
                limit,
                total_pages: Math.ceil((count || 0) / limit)
            }
        })

    } catch (err) {
        console.error("GET MESSAGES ERROR:", err)
        return errorResponse('Internal Server Error', 500)
    }
}
