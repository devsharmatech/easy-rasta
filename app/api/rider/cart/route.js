import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

// POST — Add item to cart
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

        const { product_id, quantity } = await request.json()

        if (!product_id) return errorResponse('product_id is required', 400)

        // Check product exists and has stock
        const { data: product } = await supabaseAdmin
            .from('products')
            .select('id, stock, is_active')
            .eq('id', product_id)
            .single()

        if (!product || !product.is_active) return errorResponse('Product not found or inactive', 404)
        if (product.stock < (quantity || 1)) return errorResponse('Not enough stock available', 400)

        // Check if already in cart — update quantity
        const { data: existing } = await supabaseAdmin
            .from('cart_items')
            .select('id, quantity')
            .eq('rider_id', riderProfile.id)
            .eq('product_id', product_id)
            .single()

        if (existing) {
            const newQty = existing.quantity + (quantity || 1)
            if (newQty > product.stock) return errorResponse('Not enough stock available', 400)

            const { data, error } = await supabaseAdmin
                .from('cart_items')
                .update({ quantity: newQty })
                .eq('id', existing.id)
                .select()
                .single()

            if (error) throw error
            return successResponse('Cart updated', data)
        }

        const { data, error } = await supabaseAdmin
            .from('cart_items')
            .insert({
                rider_id: riderProfile.id,
                product_id,
                quantity: quantity || 1
            })
            .select()
            .single()

        if (error) throw error
        return successResponse('Added to cart', data)

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// PUT — Update cart item quantity
export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') return errorResponse('Unauthorized', 401)

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        const { cart_item_id, quantity } = await request.json()

        if (!cart_item_id || !quantity) return errorResponse('cart_item_id and quantity are required', 400)
        if (quantity < 1) return errorResponse('Quantity must be at least 1', 400)

        // Verify ownership + check stock
        const { data: item } = await supabaseAdmin
            .from('cart_items')
            .select('id, product_id')
            .eq('id', cart_item_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (!item) return errorResponse('Cart item not found', 404)

        const { data: product } = await supabaseAdmin
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single()

        if (quantity > product.stock) return errorResponse('Not enough stock available', 400)

        const { data, error } = await supabaseAdmin
            .from('cart_items')
            .update({ quantity })
            .eq('id', cart_item_id)
            .select()
            .single()

        if (error) throw error
        return successResponse('Cart item updated', data)

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// GET — View cart with product details and totals
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

        const { data, error } = await supabaseAdmin
            .from('cart_items')
            .select('*, products(id, name, price, image_url, stock)')
            .eq('rider_id', riderProfile.id)
            .order('created_at', { ascending: false })

        if (error) throw error

        let cartTotal = 0
        const items = (data || []).map(item => {
            const product = item.products
            const unitPrice = product?.price || 0
            const itemTotal = unitPrice * item.quantity
            cartTotal += itemTotal

            return {
                cart_item_id: item.id,
                quantity: item.quantity,
                product: {
                    id: product?.id,
                    name: product?.name,
                    price: product?.price,
                    image: product?.image_url,
                    stock: product?.stock
                },
                unit_price: unitPrice,
                item_total: itemTotal
            }
        })

        return successResponse('Cart fetched successfully', {
            items,
            item_count: items.length,
            cart_total: cartTotal
        })

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// DELETE — Remove item from cart
export async function DELETE(request) {
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
        const cart_item_id = searchParams.get('id')

        if (!cart_item_id) return errorResponse('Cart item ID required', 400)

        const { data: item } = await supabaseAdmin
            .from('cart_items')
            .select('id')
            .eq('id', cart_item_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (!item) return errorResponse('Cart item not found', 404)

        const { error } = await supabaseAdmin
            .from('cart_items')
            .delete()
            .eq('id', cart_item_id)

        if (error) throw error
        return successResponse('Item removed from cart')

    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}
