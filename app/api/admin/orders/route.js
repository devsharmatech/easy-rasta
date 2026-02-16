import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'

// Helper: safe query wrapper
async function safeQuery(fn) {
    try { return await fn() }
    catch (e) { console.error('Query error:', e.message); return { data: null, error: e } }
}

// Helper: Add order log
async function addOrderLog(orderId, action, oldValue, newValue, message, performedBy) {
    await safeQuery(() =>
        supabaseAdmin.from('order_logs').insert({
            order_id: orderId,
            action,
            old_value: oldValue,
            new_value: newValue,
            message,
            performed_by: performedBy
        })
    )
}

// Helper: Notify rider about order status change
async function notifyRider(riderId, title, body) {
    try {
        // Get user_id from rider_profiles
        const { data: rider } = await supabaseAdmin
            .from('rider_profiles')
            .select('user_id')
            .eq('id', riderId)
            .single()

        if (rider?.user_id) {
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('device_token')
                .eq('id', rider.user_id)
                .single()

            if (user?.device_token) {
                // Dynamic import to avoid circular deps
                const { adminMessaging } = await import('@/lib/firebase')
                await adminMessaging.send({
                    token: user.device_token,
                    notification: { title, body }
                })
            }
        }
    } catch (e) { console.error('Notification error:', e.message) }
}

// Status change notification messages
const statusMessages = {
    confirmed: 'Your order has been confirmed! We are preparing it for you.',
    processing: 'Your order is being processed and will be shipped soon.',
    shipped: 'Great news! Your order has been shipped.',
    delivered: 'Your order has been delivered. Enjoy!',
    cancelled: 'Your order has been cancelled. Contact support for help.'
}

const paymentMessages = {
    paid: 'Payment received for your order.',
    refunded: 'A refund has been initiated for your order.',
    failed: 'There was an issue with your payment. Please retry.'
}

// GET — List all orders with full details
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const orderId = searchParams.get('id')

        // Single order with full details + logs
        if (orderId) {
            const { data: order, error } = await supabaseAdmin
                .from('orders')
                .select(`
                    *,
                    delivery_addresses:address_id(full_name, mobile, address_line, city, state, pincode),
                    order_items(id, product_name, price, quantity, total, product_id, products:product_id(image_url, name)),
                    rider_profiles:rider_id(user_id, users:user_id(full_name, mobile, email, profile_image_url))
                `)
                .eq('id', orderId)
                .single()

            if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

            // Fetch logs
            const { data: logs } = await safeQuery(() =>
                supabaseAdmin
                    .from('order_logs')
                    .select('id, action, old_value, new_value, message, created_at, users:performed_by(full_name)')
                    .eq('order_id', orderId)
                    .order('created_at', { ascending: false })
            )

            return NextResponse.json({ ...order, logs: logs || [] })
        }

        // All orders with rider + address preview
        const { data, error } = await supabaseAdmin
            .from('orders')
            .select(`
                id, total_amount, status, payment_status, tracking_number, created_at, updated_at,
                rider_profiles:rider_id(user_id, users:user_id(full_name, mobile, profile_image_url)),
                delivery_addresses:address_id(full_name, city, state),
                order_items(product_name, quantity)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(data || [])
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PATCH — Update order status, payment_status, or tracking_number
export async function PATCH(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, status, payment_status, tracking_number } = body

        if (!id) return NextResponse.json({ error: 'Order ID required' }, { status: 400 })

        // Get current order
        const { data: order } = await supabaseAdmin
            .from('orders')
            .select('id, status, payment_status, tracking_number, rider_id')
            .eq('id', id)
            .single()

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

        const updates = { updated_at: new Date().toISOString() }
        const notifications = []

        // Status change
        if (status && status !== order.status) {
            updates.status = status
            await addOrderLog(id, 'status_change', order.status, status,
                `Order status changed from ${order.status} to ${status}`, user.user_id)

            if (statusMessages[status]) {
                notifications.push({ title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`, body: statusMessages[status] })
            }
        }

        // Payment status change
        if (payment_status && payment_status !== order.payment_status) {
            updates.payment_status = payment_status
            await addOrderLog(id, 'payment_update', order.payment_status, payment_status,
                `Payment status changed from ${order.payment_status} to ${payment_status}`, user.user_id)

            if (paymentMessages[payment_status]) {
                notifications.push({ title: 'Payment Update', body: paymentMessages[payment_status] })
            }
        }

        // Tracking number
        if (tracking_number !== undefined && tracking_number !== order.tracking_number) {
            updates.tracking_number = tracking_number
            await addOrderLog(id, 'tracking_added', order.tracking_number || 'none', tracking_number,
                `Tracking number ${tracking_number ? 'set to ' + tracking_number : 'removed'}`, user.user_id)

            if (tracking_number) {
                notifications.push({ title: 'Tracking Update', body: `Your order tracking number: ${tracking_number}` })
            }
        }

        if (Object.keys(updates).length <= 1) {
            return NextResponse.json({ error: 'No changes to apply' }, { status: 400 })
        }

        const { error } = await supabaseAdmin.from('orders').update(updates).eq('id', id)
        if (error) throw error

        // Send notifications
        for (const notif of notifications) {
            await notifyRider(order.rider_id, notif.title, notif.body)
        }

        return NextResponse.json({ message: 'Order updated successfully' })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE — Delete single or multiple orders
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const ids = searchParams.get('ids')

        if (ids) {
            const idList = ids.split(',').map(i => i.trim()).filter(Boolean)
            const { error } = await supabaseAdmin.from('orders').delete().in('id', idList)
            if (error) throw error
            return NextResponse.json({ message: `${idList.length} orders deleted` })
        }

        if (id) {
            const { error } = await supabaseAdmin.from('orders').delete().eq('id', id)
            if (error) throw error
            return NextResponse.json({ message: 'Order deleted' })
        }

        return NextResponse.json({ error: 'Order ID(s) required' }, { status: 400 })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
