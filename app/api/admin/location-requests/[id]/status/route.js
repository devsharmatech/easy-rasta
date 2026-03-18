import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function POST(request, context) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return errorResponse('Unauthorized', 401)
        }

        // Awaiting params to resolve "Route "[id]" used `params.id`. `params` should be awaited before using its properties." in Next.js 15
        const params = await context.params
        const requestId = params.id
        const body = await request.json()
        const { status, admin_remark } = body

        if (!['approved', 'rejected'].includes(status)) {
            return errorResponse('Invalid status. Must be approved or rejected.', 400)
        }

        // Fetch request
        const { data: requestData, error: reqError } = await supabaseAdmin
            .from('location_requests')
            .select('*')
            .eq('id', requestId)
            .single()

        if (reqError || !requestData) return errorResponse('Location request not found', 404)
        if (requestData.status !== 'pending') return errorResponse('Request is already processed', 400)

        if (status === 'rejected') {
            const { error: updateError } = await supabaseAdmin
                .from('location_requests')
                .update({ status: 'rejected', admin_remark: admin_remark || '' })
                .eq('id', requestId)

            if (updateError) throw updateError
            return successResponse('Request rejected successfully')
        }

        if (status === 'approved') {
            // Check for duplicates
            // We use the postgres haversine function to check nearby businesses within 100 meters (0.1 km)
            const mapCategory = requestData.type === 'washroom' ? 'toilet' : 'fuel'
            const { data: nearbyBusinesses, error: nearbyError } = await supabaseAdmin
                .rpc('get_nearby_businesses', {
                    p_lat: requestData.latitude,
                    p_long: requestData.longitude,
                    p_radius_km: 0.1, // 100 meters
                    p_category: mapCategory
                })

            if (nearbyError) {
                console.error('[Nearby Check] Error:', nearbyError)
                return errorResponse('Failed to perform duplicate validation.', 500)
            }

            if (nearbyBusinesses && nearbyBusinesses.length > 0) {
                return errorResponse('A similar location already exists within 100 meters.', 400)
            }

            // Insert into vendor_businesses
            const { data: newBusiness, error: insertError } = await supabaseAdmin
                .from('vendor_businesses')
                .insert({
                    vendor_id: null, // Admin added
                    business_name: requestData.name,
                    category: mapCategory,
                    latitude: requestData.latitude,
                    longitude: requestData.longitude,
                    logo_url: requestData.image_url,
                    landmark: requestData.message,
                    restroom_available: requestData.type === 'washroom',
                    restroom_type: requestData.is_paid ? 'paid' : 'free',
                    is_active: true
                })
                .select('id')
                .single()

            if (insertError) {
                console.error('[Business Insert Error]', insertError)
                throw insertError
            }

            // If Paid Washroom, add to vendor_services
            if (requestData.type === 'washroom' && requestData.is_paid && requestData.price) {
                await supabaseAdmin
                    .from('vendor_services')
                    .insert({
                        business_id: newBusiness.id,
                        name: 'Entry Fee',
                        price: requestData.price,
                        is_active: true
                    })
            }

            // Mark as approved
            await supabaseAdmin
                .from('location_requests')
                .update({ status: 'approved', admin_remark: admin_remark || 'Approved' })
                .eq('id', requestId)

            return successResponse('Request approved and location added successfully')
        }

    } catch (err) {
        console.error('[Admin Location Requests Status Update] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
