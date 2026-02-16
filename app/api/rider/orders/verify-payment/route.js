import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { verifyPaymentSignature } from '@/lib/razorpay'

// POST — Verify Razorpay payment → confirm order → reduce stock → clear cart
export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') return errorResponse('Unauthorized', 401)

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = await request.json()

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return errorResponse('Missing payment verification details', 400)
        }

        // Find the order
        const { data: order } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('razorpay_order_id', razorpay_order_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (!order) return errorResponse('Order not found', 404)

        if (order.payment_status === 'paid') {
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
                .from('orders')
                .update({
                    payment_status: 'failed',
                    razorpay_payment_id,
                    razorpay_signature,
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id)

            return errorResponse('Payment verification failed. Invalid signature.', 400)
        }

        // Signature valid — update order to paid + confirmed
        await supabaseAdmin
            .from('orders')
            .update({
                razorpay_payment_id,
                razorpay_signature,
                payment_status: 'paid',
                status: 'confirmed',
                updated_at: new Date().toISOString()
            })
            .eq('id', order.id)

        // Reduce stock for each order item
        const { data: orderItems } = await supabaseAdmin
            .from('order_items')
            .select('product_id, quantity')
            .eq('order_id', order.id)

        if (orderItems) {
            for (const item of orderItems) {
                const { data: prod } = await supabaseAdmin
                    .from('products')
                    .select('stock')
                    .eq('id', item.product_id)
                    .single()

                if (prod) {
                    await supabaseAdmin
                        .from('products')
                        .update({ stock: Math.max(0, prod.stock - item.quantity) })
                        .eq('id', item.product_id)
                }
            }
        }

        // Clear cart
        await supabaseAdmin
            .from('cart_items')
            .delete()
            .eq('rider_id', riderProfile.id)

        return successResponse('Payment verified. Order confirmed!', {
            order_id: order.id,
            total_amount: order.total_amount,
            payment_status: 'paid',
            status: 'confirmed'
        })

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
