import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        const { data: vendorProfile } = await supabaseAdmin
            .from('vendor_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!vendorProfile) return errorResponse('Vendor profile not found', 404)

        const body = await request.json()
        const { business_id, name, price, discounted_price, quantity_label } = body

        // Verify ownership
        const { data: business } = await supabaseAdmin
            .from('vendor_businesses')
            .select('id')
            .eq('id', business_id)
            .eq('vendor_id', vendorProfile.id)
            .single()

        if (!business) return errorResponse('Business not found or not owned by you', 404)

        const { data, error } = await supabaseAdmin
            .from('vendor_services')
            .insert({
                business_id,
                name,
                price,
                discounted_price,
                quantity_label
            })
            .select()

        if (error) throw error

        return successResponse('Service added successfully', data)
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const business_id = searchParams.get('business_id')

        if (business_id) {
            const { data, error } = await supabaseAdmin
                .from('vendor_services')
                .select('*')
                .eq('business_id', business_id)
                .eq('is_active', true)

            if (error) throw error
            return successResponse('Services fetched successfully', data)
        }

        // If no business_id, check if vendor logged in
        const user = getUserFromRequest(request)
        if (user && user.role === 'vendor') {
            const { data: vendorProfile } = await supabaseAdmin
                .from('vendor_profiles')
                .select('id')
                .eq('user_id', user.user_id)
                .single()

            if (!vendorProfile) return successResponse('No services found', [])

            const { data, error } = await supabaseAdmin
                .from('vendor_services')
                .select('*, vendor_businesses!inner(vendor_id)')
                .eq('vendor_businesses.vendor_id', vendorProfile.id)

            if (error) throw error
            return successResponse('Services fetched successfully', data)
        }

        return errorResponse('Business ID required', 400)

    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}
