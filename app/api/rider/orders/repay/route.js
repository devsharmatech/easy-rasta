import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { createOrder } from '@/lib/razorpay'

// POST — Repay (Regenerate Razorpay order for an existing unpaid order)
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

        const { order_id } = await request.json()

        if (!order_id) return errorResponse('order_id is required', 400)

        // Find the order
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('*, delivery_addresses:address_id(*)')
            .eq('id', order_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (orderError || !order) return errorResponse('Order not found', 404)

        // Only allow repayment if unpaid
        if (order.payment_status === 'paid') {
            return errorResponse('Order is already paid', 400)
        }

        // Get order items to verify stock again (optional but safer)
        const { data: orderItems } = await supabaseAdmin
            .from('order_items')
            .select('*, products(name, stock, is_active)')
            .eq('order_id', order.id)

        for (const item of orderItems || []) {
            const product = item.products
            if (!product || !product.is_active) {
                return errorResponse(`Product "${product?.name || 'unknown'}" is no longer available`, 400)
            }
            if (item.quantity > product.stock) {
                return errorResponse(`Not enough stock for "${product.name}" (available: ${product.stock})`, 400)
            }
        }

        // Create fresh Razorpay order
        const receipt = `repay_${riderProfile.id.slice(0, 8)}_${Date.now()}`
        const rzpOrder = await createOrder(order.total_amount, receipt, {
            order_id: order.id,
            rider_id: riderProfile.id,
            type: 'repayment'
        })

        // Update order with new Razorpay order ID
        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({
                razorpay_order_id: rzpOrder.id,
                payment_status: 'unpaid',
                updated_at: new Date().toISOString()
            })
            .eq('id', order.id)

        if (updateError) throw updateError

        return successResponse('Repayment order created. Proceed to payment.', {
            order_id: order.id,
            razorpay_order_id: rzpOrder.id,
            amount: order.total_amount,
            currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID,
            delivery_address: order.delivery_addresses,
            items: orderItems?.map(item => ({
                product_id: item.product_id,
                product_name: item.product_name,
                price: item.price,
                quantity: item.quantity,
                total: item.total
            }))
        })

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
