import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function PUT(request, { params }) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        const { id } = await params

        // Get vendor profile
        const { data: vendorProfile } = await supabaseAdmin
            .from('vendor_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!vendorProfile) return errorResponse('Vendor profile not found', 404)

        // Verify ownership: service → business → vendor
        const { data: service } = await supabaseAdmin
            .from('vendor_services')
            .select('*, vendor_businesses!inner(vendor_id)')
            .eq('id', id)
            .eq('vendor_businesses.vendor_id', vendorProfile.id)
            .single()

        if (!service) return errorResponse('Service not found or not owned by you', 404)

        const body = await request.json()
        const { name, price, discounted_price, quantity_label, is_active } = body

        // Build update object — only include fields that were sent
        const updateFields = {}
        if (name !== undefined) updateFields.name = name
        if (price !== undefined) updateFields.price = price
        if (discounted_price !== undefined) updateFields.discounted_price = discounted_price
        if (quantity_label !== undefined) updateFields.quantity_label = quantity_label
        if (is_active !== undefined) updateFields.is_active = is_active

        if (Object.keys(updateFields).length === 0) {
            return errorResponse('No fields to update', 400)
        }

        const { data, error } = await supabaseAdmin
            .from('vendor_services')
            .update(updateFields)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return successResponse('Service updated successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

export async function DELETE(request, { params }) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        const { id } = await params

        // Get vendor profile
        const { data: vendorProfile } = await supabaseAdmin
            .from('vendor_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!vendorProfile) return errorResponse('Vendor profile not found', 404)

        // Verify ownership: service → business → vendor
        const { data: service } = await supabaseAdmin
            .from('vendor_services')
            .select('*, vendor_businesses!inner(vendor_id)')
            .eq('id', id)
            .eq('vendor_businesses.vendor_id', vendorProfile.id)
            .single()

        if (!service) return errorResponse('Service not found or not owned by you', 404)

        const { error } = await supabaseAdmin
            .from('vendor_services')
            .delete()
            .eq('id', id)

        if (error) throw error

        return successResponse('Service deleted successfully')
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
