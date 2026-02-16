import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { verifyPaymentSignature } from '@/lib/razorpay'
import { awardXP } from '@/lib/xp'

// POST — Verify Razorpay payment and complete event join
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

        const body = await request.json()
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            vehicle_id,
            consent_safety,
            consent_liability
        } = body

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return errorResponse('Missing payment verification details', 400)
        }

        // Find the payment record
        const { data: payment } = await supabaseAdmin
            .from('event_payments')
            .select('*')
            .eq('razorpay_order_id', razorpay_order_id)
            .eq('event_id', event_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (!payment) return errorResponse('Payment record not found', 404)

        if (payment.status === 'paid') {
            return errorResponse('Payment already verified', 400)
        }

        // Verify signature (HMAC SHA256)
        const isValid = verifyPaymentSignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        )

        if (!isValid) {
            // Mark as failed
            await supabaseAdmin
                .from('event_payments')
                .update({
                    status: 'failed',
                    razorpay_payment_id,
                    razorpay_signature,
                    updated_at: new Date().toISOString()
                })
                .eq('id', payment.id)

            return errorResponse('Payment verification failed. Invalid signature.', 400)
        }

        // Signature valid — update payment to paid
        await supabaseAdmin
            .from('event_payments')
            .update({
                razorpay_payment_id,
                razorpay_signature,
                status: 'paid',
                updated_at: new Date().toISOString()
            })
            .eq('id', payment.id)

        // Check if already joined (edge case: double submit)
        const { data: existingParticipant } = await supabaseAdmin
            .from('event_participants')
            .select('id')
            .eq('event_id', event_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (!existingParticipant) {
            // Insert participant
            const { error: joinError } = await supabaseAdmin
                .from('event_participants')
                .insert({
                    event_id,
                    rider_id: riderProfile.id,
                    vehicle_id: vehicle_id || null,
                    consent_safety: consent_safety ?? true,
                    consent_liability: consent_liability ?? true,
                    payment_id: payment.id
                })

            if (joinError) throw joinError

            // Award XP
            await awardXP(riderProfile.id, 'join_event', event_id)
        }

        return successResponse('Payment verified and event joined successfully', {
            payment_id: payment.id,
            razorpay_order_id,
            razorpay_payment_id,
            amount: payment.amount,
            status: 'paid'
        })

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
