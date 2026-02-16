import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

// POST — Add delivery address
export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') return errorResponse('Unauthorized', 401)

        const body = await request.json()
        const { full_name, mobile, address_line, city, state, pincode, is_default } = body

        if (!full_name || !mobile || !address_line) {
            return errorResponse('full_name, mobile, and address_line are required', 400)
        }

        // If this is default, unset other defaults
        if (is_default) {
            await supabaseAdmin
                .from('delivery_addresses')
                .update({ is_default: false })
                .eq('user_id', user.user_id)
        }

        const { data, error } = await supabaseAdmin
            .from('delivery_addresses')
            .insert({
                user_id: user.user_id,
                full_name,
                mobile,
                address_line,
                city,
                state,
                pincode,
                is_default: is_default || false
            })
            .select()
            .single()

        if (error) throw error
        return successResponse('Address added successfully', data)

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// PUT — Update address (all fields pre-filled)
export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') return errorResponse('Unauthorized', 401)

        const body = await request.json()
        const { address_id, full_name, mobile, address_line, city, state, pincode, is_default } = body

        if (!address_id) return errorResponse('address_id is required', 400)

        // Verify ownership
        const { data: existing } = await supabaseAdmin
            .from('delivery_addresses')
            .select('id')
            .eq('id', address_id)
            .eq('user_id', user.user_id)
            .single()

        if (!existing) return errorResponse('Address not found', 404)

        // If setting as default, unset others
        if (is_default) {
            await supabaseAdmin
                .from('delivery_addresses')
                .update({ is_default: false })
                .eq('user_id', user.user_id)
        }

        const { data, error } = await supabaseAdmin
            .from('delivery_addresses')
            .update({ full_name, mobile, address_line, city, state, pincode, is_default })
            .eq('id', address_id)
            .select()
            .single()

        if (error) throw error
        return successResponse('Address updated successfully', data)

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// GET — List addresses
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') return errorResponse('Unauthorized', 401)

        const { data, error } = await supabaseAdmin
            .from('delivery_addresses')
            .select('*')
            .eq('user_id', user.user_id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) throw error
        return successResponse('Addresses fetched successfully', data)

    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}

// DELETE — Remove address
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') return errorResponse('Unauthorized', 401)

        const { searchParams } = new URL(request.url)
        const address_id = searchParams.get('id')

        if (!address_id) return errorResponse('Address ID required', 400)

        const { data: existing } = await supabaseAdmin
            .from('delivery_addresses')
            .select('id')
            .eq('id', address_id)
            .eq('user_id', user.user_id)
            .single()

        if (!existing) return errorResponse('Address not found', 404)

        const { error } = await supabaseAdmin
            .from('delivery_addresses')
            .delete()
            .eq('id', address_id)

        if (error) throw error
        return successResponse('Address deleted successfully')

    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}
