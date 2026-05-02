import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST — Update Refund Status (Organizer only)
export async function POST(request, { params }) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { id: participation_id } = await params

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        // Get participation record
        const { data: participation, error: partError } = await supabaseAdmin
            .from('event_participants')
            .select('*, events(rider_id)')
            .eq('id', participation_id)
            .single()

        if (partError || !participation) {
            return errorResponse('Participation record not found', 404)
        }

        // Verify that the user is the creator of the event
        if (participation.events.rider_id !== riderProfile.id) {
            return errorResponse('Only the event organiser can manage refunds', 403)
        }

        const body = await request.json()
        const { status } = body // 'processed', 'rejected', 'approved'

        if (!['processed', 'rejected', 'approved'].includes(status)) {
            return errorResponse('Invalid refund status', 400)
        }

        // Update the refund status
        const { error: updateError } = await supabaseAdmin
            .from('event_participants')
            .update({
                refund_status: status
            })
            .eq('id', participation_id)

        if (updateError) throw updateError

        // Optionally update the event_payments status if status is 'processed'
        if (status === 'processed' && participation.payment_id) {
            await supabaseAdmin
                .from('event_payments')
                .update({ status: 'refunded' })
                .eq('id', participation.payment_id)
        }

        return successResponse(`Refund status updated to ${status}`)

    } catch (err) {
        console.error('[UpdateRefundStatusError]', err)
        return errorResponse('Internal Server Error', 500)
    }
}
