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

export async function PUT(request, { params }) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { name, description, price, image_url, stock, is_active } = body

        // Get current product for logging
        const { data: current } = await supabaseAdmin.from('products').select('*').eq('id', id).single()

        const { data, error } = await supabaseAdmin
            .from('products')
            .update({ name, description, price, image_url, stock, is_active, updated_at: new Date() })
            .eq('id', id)
            .select()

        if (error) throw error

        // Log changes
        if (current) {
            if (current.stock !== stock) {
                await addProductLog(id, 'stock_update',
                    String(current.stock || 0), String(stock || 0),
                    `Stock updated from ${current.stock} to ${stock}`, user.user_id)
            }
            if (Number(current.price) !== Number(price)) {
                await addProductLog(id, 'price_change',
                    String(current.price), String(price),
                    `Price changed from ₹${current.price} to ₹${price}`, user.user_id)
            }
            if (current.is_active !== is_active && is_active !== undefined) {
                await addProductLog(id, 'status_change',
                    current.is_active ? 'active' : 'inactive', is_active ? 'active' : 'inactive',
                    `Product ${is_active ? 'activated' : 'deactivated'}`, user.user_id)
            }
            if (current.name !== name) {
                await addProductLog(id, 'product_updated',
                    current.name, name,
                    `Product name changed to "${name}"`, user.user_id)
            }
        }

        return NextResponse.json(data[0])
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const { error } = await supabaseAdmin
            .from('products')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
