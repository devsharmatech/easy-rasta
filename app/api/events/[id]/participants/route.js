import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET — List all participants for an event (Organizer only)
export async function GET(request, { params }) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { id: event_id } = await params

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        // Verify that the user is the creator of the event
        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .select('id, rider_id')
            .eq('id', event_id)
            .single()

        if (eventError || !event) {
            return errorResponse('Event not found', 404)
        }

        if (event.rider_id !== riderProfile.id) {
            return errorResponse('Only the event organiser can view the full participant list', 403)
        }

        // Fetch all participants including cancelled ones
        const { data, error } = await supabaseAdmin
            .from('event_participants')
            .select(`
                id,
                rider_id,
                vehicle_id,
                joined_at,
                is_cancelled,
                cancellation_reason,
                cancelled_at,
                refund_eligible,
                refund_status,
                payment_id,
                vehicles(nickname, make, model),
                rider_profiles(
                    user_id,
                    users:user_id(full_name, email, mobile, profile_image_url)
                )
            `)
            .eq('event_id', event_id)
            .order('joined_at', { ascending: false })

        if (error) throw error

        // Map data for cleaner output
        const participants = data.map(p => ({
            id: p.id,
            rider_id: p.rider_id,
            name: p.rider_profiles?.users?.full_name || 'Unknown',
            email: p.rider_profiles?.users?.email,
            mobile: p.rider_profiles?.users?.mobile,
            profile_image: p.rider_profiles?.users?.profile_image_url,
            vehicle: p.vehicles,
            joined_at: p.joined_at,
            status: p.is_cancelled ? 'Cancelled' : 'Active',
            cancellation: p.is_cancelled ? {
                reason: p.cancellation_reason,
                date: p.cancelled_at,
                refund_eligible: p.refund_eligible,
                refund_status: p.refund_status
            } : null
        }))

        return successResponse('Participants fetched successfully', participants)

    } catch (err) {
        console.error('[GetParticipantsError]', err)
        return errorResponse('Internal Server Error', 500)
    }
}
