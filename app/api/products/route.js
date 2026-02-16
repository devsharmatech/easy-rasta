import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { successResponse, errorResponse } from '@/lib/apiResponse'

// GET — Browse products (public)
// ?id=UUID      → single product detail
// ?category=xxx → filter by category
// default       → all active products
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('id')
        const category = searchParams.get('category')

        // Single product detail
        if (productId) {
            const { data, error } = await supabaseAdmin
                .from('products')
                .select('*')
                .eq('id', productId)
                .eq('is_active', true)
                .single()

            if (error || !data) return errorResponse('Product not found', 404)

            return successResponse('Product fetched successfully', data)
        }

        // Build query
        let query = supabaseAdmin
            .from('products')
            .select('*')
            .eq('is_active', true)
            .gt('stock', 0)
            .order('created_at', { ascending: false })

        if (category) query = query.eq('category', category)

        const { data, error } = await query

        if (error) throw error

        return successResponse('Products fetched successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
