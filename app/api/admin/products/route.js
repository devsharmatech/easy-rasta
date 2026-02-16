import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'

async function safeQuery(fn) {
    try { return await fn() }
    catch (e) { console.error('Query error:', e.message); return { data: null, error: e } }
}

async function addProductLog(productId, action, oldValue, newValue, message, performedBy) {
    await safeQuery(() =>
        supabaseAdmin.from('product_logs').insert({
            product_id: productId,
            action,
            old_value: oldValue,
            new_value: newValue,
            message,
            performed_by: performedBy
        })
    )
}

// GET — List all products or single product detail with inventory & buyers
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('id')

        // Single product with full details
        if (productId) {
            const { data: product, error } = await supabaseAdmin
                .from('products')
                .select('*')
                .eq('id', productId)
                .single()

            if (error || !product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

            // Fetch all order_items for this product to get buyer info & sales data
            const { data: orderItems } = await safeQuery(() =>
                supabaseAdmin
                    .from('order_items')
                    .select(`
                        id, quantity, price, total, product_name, created_at,
                        orders:order_id(id, status, payment_status, created_at,
                            rider_profiles:rider_id(user_id,
                                users:user_id(full_name, mobile, email, profile_image_url)
                            )
                        )
                    `)
                    .eq('product_id', productId)
                    .order('created_at', { ascending: false })
            )

            // Calculate inventory stats — count all items except cancelled orders
            const validItems = (orderItems || []).filter(
                item => item.orders?.status !== 'cancelled'
            )
            const totalSold = validItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
            const totalRevenue = validItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
            const remainingStock = (product.stock || 0) - totalSold

            // Get unique buyers by user_id
            const buyerMap = {}
            for (const item of validItems) {
                const buyer = item.orders?.rider_profiles?.users
                const userId = item.orders?.rider_profiles?.user_id
                if (buyer && userId) {
                    if (!buyerMap[userId]) {
                        buyerMap[userId] = {
                            ...buyer,
                            total_quantity: 0,
                            total_spent: 0,
                            last_purchase: null
                        }
                    }
                    buyerMap[userId].total_quantity += (item.quantity || 0)
                    buyerMap[userId].total_spent += (Number(item.total) || 0)
                    if (!buyerMap[userId].last_purchase || new Date(item.created_at) > new Date(buyerMap[userId].last_purchase)) {
                        buyerMap[userId].last_purchase = item.created_at
                    }
                }
            }

            // Fetch logs
            const { data: logs } = await safeQuery(() =>
                supabaseAdmin
                    .from('product_logs')
                    .select('id, action, old_value, new_value, message, created_at, users:performed_by(full_name)')
                    .eq('product_id', productId)
                    .order('created_at', { ascending: false })
                    .limit(50)
            )

            return NextResponse.json({
                ...product,
                inventory: {
                    initial_stock: product.stock || 0,
                    total_sold: totalSold,
                    remaining: remainingStock < 0 ? 0 : remainingStock,
                    total_revenue: totalRevenue,
                    total_orders: validItems.length
                },
                buyers: Object.values(buyerMap).sort((a, b) => b.total_spent - a.total_spent),
                order_items: orderItems || [],
                logs: logs || []
            })
        }

        // All products with sale stats
        const { data, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        // Get sales per product
        const productIds = (data || []).map(p => p.id)
        let salesMap = {}
        if (productIds.length > 0) {
            const { data: items } = await safeQuery(() =>
                supabaseAdmin
                    .from('order_items')
                    .select('product_id, quantity, total, orders:order_id(status)')
                    .in('product_id', productIds)
            )
            if (items) {
                items.filter(i => i.orders?.status !== 'cancelled').forEach(i => {
                    if (!salesMap[i.product_id]) salesMap[i.product_id] = { sold: 0, revenue: 0 }
                    salesMap[i.product_id].sold += (i.quantity || 0)
                    salesMap[i.product_id].revenue += (Number(i.total) || 0)
                })
            }
        }

        const result = (data || []).map(p => ({
            ...p,
            total_sold: salesMap[p.id]?.sold || 0,
            total_revenue: salesMap[p.id]?.revenue || 0,
            remaining_stock: Math.max(0, (p.stock || 0) - (salesMap[p.id]?.sold || 0))
        }))

        return NextResponse.json(result)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// POST — Create new product
export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, description, price, image_url, stock } = body

        if (!name || !price) {
            return NextResponse.json({ error: 'Name and Price are required' }, { status: 400 })
        }

        const { data, error } = await supabaseAdmin
            .from('products')
            .insert([{ name, description, price, image_url, stock: stock || 0 }])
            .select()

        if (error) throw error

        // Log creation
        await addProductLog(data[0].id, 'product_created', null, null,
            `Product "${name}" created with stock ${stock || 0}`, user.user_id)

        return NextResponse.json(data[0])
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// DELETE — Bulk delete products
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const ids = searchParams.get('ids')

        if (ids) {
            const idList = ids.split(',').map(i => i.trim()).filter(Boolean)
            await supabaseAdmin.from('products').delete().in('id', idList)
            return NextResponse.json({ message: `${idList.length} products deleted` })
        }

        return NextResponse.json({ error: 'Product IDs required' }, { status: 400 })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
