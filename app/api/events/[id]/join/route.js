import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { awardXP } from '@/lib/xp'
import { createOrder } from '@/lib/razorpay'

// POST — Join event
// Free event: joins immediately
// Paid event: creates Razorpay order, returns order details
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

        // Check if already joined
        const { data: existing } = await supabaseAdmin
            .from('event_participants')
            .select('id')
            .eq('event_id', event_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (existing) return errorResponse('Already joined this event', 400)

        // Get event details
        const { data: event } = await supabaseAdmin
            .from('events')
            .select('*')
            .eq('id', event_id)
            .eq('status', 'published')
            .single()

        if (!event) return errorResponse('Event not found or not published', 404)

        const body = await request.json()
        const { vehicle_id, consent_safety, consent_liability } = body

        // Validate vehicle belongs to rider
        if (vehicle_id) {
            const { data: vehicle } = await supabaseAdmin
                .from('vehicles')
                .select('id')
                .eq('id', vehicle_id)
                .eq('rider_id', riderProfile.id)
                .single()

            if (!vehicle) return errorResponse('Vehicle not found or not owned by you', 400)
        }

        // Validate consents
        if (!consent_safety || !consent_liability) {
            return errorResponse('You must accept both safety and liability consents to join', 400)
        }

        // FREE EVENT — join directly
        if (event.event_type === 'free' || !event.fee || event.fee <= 0) {
            const { error } = await supabaseAdmin
                .from('event_participants')
                .insert({
                    event_id,
                    rider_id: riderProfile.id,
                    vehicle_id: vehicle_id || null,
                    consent_safety,
                    consent_liability
                })

            if (error) throw error

            await awardXP(riderProfile.id, 'join_event', event_id)

            return successResponse('Joined event successfully')
        }

        // PAID EVENT — create Razorpay order
        const receipt = `evt_${event_id.slice(0, 8)}_${riderProfile.id.slice(0, 8)}_${Date.now()}`

        const order = await createOrder(event.fee, receipt, {
            event_id,
            rider_id: riderProfile.id,
            event_title: event.title
        })

        // Save payment record (status: created)
        const { data: payment, error: payError } = await supabaseAdmin
            .from('event_payments')
            .insert({
                event_id,
                rider_id: riderProfile.id,
                razorpay_order_id: order.id,
                amount: event.fee,
                status: 'created'
            })
            .select()
            .single()

        if (payError) throw payError

        return successResponse('Payment order created', {
            order_id: order.id,
            amount: event.fee,
            currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID,
            payment_record_id: payment.id,
            event: {
                id: event.id,
                title: event.title,
                fee: event.fee
            },
            // Pass these back during verification
            join_data: {
                vehicle_id: vehicle_id || null,
                consent_safety,
                consent_liability
            }
        })

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
