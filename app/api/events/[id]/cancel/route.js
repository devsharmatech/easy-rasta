import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST — Cancel event registration
export async function POST(request, { params }) {
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

        // Get participation record
        const { data: participation, error: partError } = await supabaseAdmin
            .from('event_participants')
            .select('*')
            .eq('event_id', event_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (partError || !participation) {
            return errorResponse('You are not registered for this event', 404)
        }

        if (participation.is_cancelled) {
            return errorResponse('Registration already cancelled', 400)
        }

        // Get event details for cancellation policy
        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .select('*')
            .eq('id', event_id)
            .single()

        if (eventError || !event) {
            return errorResponse('Event not found', 404)
        }

        const body = await request.json()
        const { reason, other_reason } = body
        const cancellationReason = reason === 'Other' ? other_reason : reason

        if (!cancellationReason) {
            return errorResponse('Cancellation reason is required', 400)
        }

        // Logic for Refund Eligibility
        // Default window is 48 hours unless specified
        const windowHours = event.cancellation_window_hours || 48
        
        // Event start time
        const eventStartTime = new Date(`${event.date}T${event.time}`)
        const now = new Date()
        
        // Time difference in hours
        const diffInMs = eventStartTime - now
        const diffInHours = diffInMs / (1000 * 60 * 60)

        let refundEligible = false
        let message = ''

        if (diffInHours >= windowHours) {
            refundEligible = true
            message = 'Your cancellation is outside the window. Refund is subject to the organiser’s policy. Please chat with the organiser to confirm.'
        } else {
            refundEligible = false
            message = `Cancellations within ${windowHours} hours of the event are not eligible for a refund. You can chat with the organiser to discuss their policy.`
        }

        // Update participation record
        const { error: updateError } = await supabaseAdmin
            .from('event_participants')
            .update({
                is_cancelled: true,
                cancellation_reason: cancellationReason,
                cancelled_at: now.toISOString(),
                refund_eligible: refundEligible,
                refund_status: refundEligible ? 'pending' : 'none'
            })
            .eq('id', participation.id)

        if (updateError) throw updateError

        // Notify Organizer
        try {
            const { sendPushNotification } = await import('@/lib/notificationHelper')
            if (event.rider_id) {
                const { data: orgProfile } = await supabaseAdmin
                    .from('rider_profiles')
                    .select('user_id')
                    .eq('id', event.rider_id)
                    .single()
                
                if (orgProfile?.user_id) {
                    const { data: userInfo } = await supabaseAdmin
                        .from('users')
                        .select('full_name')
                        .eq('id', user.user_id)
                        .single()
                    
                    const participantName = userInfo?.full_name || 'A rider'
                    
                    sendPushNotification(
                        orgProfile.user_id,
                        'Event Cancellation Notice ⚠️',
                        `${participantName} has cancelled their participation for "${event.title}". Reason: ${cancellationReason}`,
                        'event',
                        { event_id, participation_id: participation.id }
                    )
                }
            }
        } catch (notifyErr) {
            console.error('[Notify Org Cancel Error]', notifyErr)
        }

        return successResponse('Registration cancelled successfully', {
            refund_eligible: refundEligible,
            policy_message: message,
            cancellation_window: windowHours
        })

    } catch (err) {
        console.error('[EventCancelError]', err)
        return errorResponse('Internal Server Error', 500)
    }
}
