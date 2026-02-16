import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { createOrder } from '@/lib/razorpay'

// POST — Checkout (create order from cart + create Razorpay payment)
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

        const { address_id } = await request.json()

        if (!address_id) return errorResponse('address_id is required', 400)

        // Verify address belongs to user
        const { data: address } = await supabaseAdmin
            .from('delivery_addresses')
            .select('*')
            .eq('id', address_id)
            .eq('user_id', user.user_id)
            .single()

        if (!address) return errorResponse('Delivery address not found', 404)

        // Get cart items with product details
        const { data: cartItems, error: cartError } = await supabaseAdmin
            .from('cart_items')
            .select('*, products(id, name, price, stock, is_active)')
            .eq('rider_id', riderProfile.id)

        if (cartError) throw cartError
        if (!cartItems || cartItems.length === 0) return errorResponse('Cart is empty', 400)

        // Validate all products and calculate total
        let totalAmount = 0
        const orderItems = []

        for (const item of cartItems) {
            const product = item.products
            if (!product || !product.is_active) {
                return errorResponse(`Product "${product?.name || 'unknown'}" is no longer available`, 400)
            }
            if (item.quantity > product.stock) {
                return errorResponse(`Not enough stock for "${product.name}" (available: ${product.stock})`, 400)
            }

            const unitPrice = product.price
            const itemTotal = unitPrice * item.quantity

            orderItems.push({
                product_id: product.id,
                product_name: product.name,
                price: unitPrice,
                quantity: item.quantity,
                total: itemTotal
            })

            totalAmount += itemTotal
        }

        // Create Razorpay order
        const receipt = `order_${riderProfile.id.slice(0, 8)}_${Date.now()}`
        const rzpOrder = await createOrder(totalAmount, receipt, {
            rider_id: riderProfile.id,
            items_count: orderItems.length
        })

        // Create order in DB (unpaid)
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                rider_id: riderProfile.id,
                address_id,
                total_amount: totalAmount,
                status: 'pending',
                payment_status: 'unpaid',
                razorpay_order_id: rzpOrder.id
            })
            .select()
            .single()

        if (orderError) throw orderError

        // Insert order items
        const itemsWithOrderId = orderItems.map(item => ({
            ...item,
            order_id: order.id
        }))

        const { error: itemsError } = await supabaseAdmin
            .from('order_items')
            .insert(itemsWithOrderId)

        if (itemsError) throw itemsError

        return successResponse('Order created. Proceed to payment.', {
            order_id: order.id,
            razorpay_order_id: rzpOrder.id,
            amount: totalAmount,
            currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID,
            delivery_address: {
                full_name: address.full_name,
                mobile: address.mobile,
                address_line: address.address_line,
                city: address.city,
                state: address.state,
                pincode: address.pincode
            },
            items: orderItems
        })

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// GET — My orders
// ?id=UUID → single order detail with items
// default  → all orders list
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') return errorResponse('Unauthorized', 401)

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        const { searchParams } = new URL(request.url)
        const orderId = searchParams.get('id')

        // Single order detail
        if (orderId) {
            const { data: order, error } = await supabaseAdmin
                .from('orders')
                .select('*, delivery_addresses:address_id(*), order_items(*, products(image_url))')
                .eq('id', orderId)
                .eq('rider_id', riderProfile.id)
                .single()

            if (error || !order) return errorResponse('Order not found', 404)

            return successResponse('Order fetched successfully', order)
        }

        // All orders
        const { data, error } = await supabaseAdmin
            .from('orders')
            .select('id, total_amount, status, payment_status, created_at, order_items(*, products(image_url))')
            .eq('rider_id', riderProfile.id)
            .order('created_at', { ascending: false })

        if (error) throw error
        return successResponse('Orders fetched successfully', data)

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
