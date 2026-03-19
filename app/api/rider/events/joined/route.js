import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

// GET — List joined events history (including expired)
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        // Get joined events with full details (Do NOT filter out expired events)
        // We only require the event to be published
        const { data, error } = await supabaseAdmin
            .from('event_participants')
            .select(`
                id,
                vehicle_id,
                consent_safety,
                consent_liability,
                payment_id,
                joined_at,
                vehicles(nickname, type, make, model, image_url),
                events(
                    *,
                    rider_profiles(user_id, total_rides, level, users:user_id(full_name, profile_image_url))
                )
            `)
            .eq('rider_id', riderProfile.id)
            .eq('events.status', 'published') // Ensure event is still published
            .order('joined_at', { ascending: false })

        if (error) throw error

        // Fetch payment info separately for paid events
        const paymentIds = (data || []).map(p => p.payment_id).filter(Boolean)
        let paymentsMap = {}

        if (paymentIds.length > 0) {
            const { data: payments } = await supabaseAdmin
                .from('event_payments')
                .select('id, amount, status, razorpay_order_id, razorpay_payment_id')
                .in('id', paymentIds)

            if (payments) {
                paymentsMap = payments.reduce((acc, p) => { acc[p.id] = p; return acc }, {})
            }
        }

        // Flatten for cleaner response
        const joined = (data || []).map(p => {
            const paymentInfo = p.payment_id ? paymentsMap[p.payment_id] : null
            return {
                participation_id: p.id,
                joined_at: p.joined_at,
                vehicle: p.vehicles ? {
                    nickname: p.vehicles.nickname,
                    type: p.vehicles.type,
                    make: p.vehicles.make,
                    model: p.vehicles.model,
                    image: p.vehicles.image_url
                } : null,
                payment: paymentInfo ? {
                    amount: paymentInfo.amount,
                    status: paymentInfo.status,
                    order_id: paymentInfo.razorpay_order_id,
                    payment_id: paymentInfo.razorpay_payment_id
                } : null,
                event: p.events ? {
                    ...p.events,
                    rider_profiles: undefined,
                    organizer: {
                        name: p.events.rider_profiles?.users?.full_name || 'Unknown',
                        profile_image: p.events.rider_profiles?.users?.profile_image_url || null,
                        level: p.events.rider_profiles?.level || 1,
                        total_rides: p.events.rider_profiles?.total_rides || 0
                    }
                } : null
            }
        })

        return successResponse('Joined events history fetched successfully', joined)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
