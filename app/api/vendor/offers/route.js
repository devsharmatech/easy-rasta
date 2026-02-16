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
        const { business_id, percentage_discount, discount_amount, duration } = body

        // Verify ownership
        const { data: business } = await supabaseAdmin
            .from('vendor_businesses')
            .select('id')
            .eq('id', business_id)
            .eq('vendor_id', vendorProfile.id)
            .single()

        if (!business) return errorResponse('Business not found or not owned by you', 404)

        // Only one active offer per business — deactivate others
        await supabaseAdmin
            .from('business_offers')
            .update({ is_active: false })
            .eq('business_id', business_id)

        const { data, error } = await supabaseAdmin
            .from('business_offers')
            .insert({
                business_id,
                percentage_discount,
                discount_amount,
                duration,
                is_active: true
            })
            .select()

        if (error) throw error

        return successResponse('Offer created successfully', data)
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}
