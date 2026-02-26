import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function GET(request, context) {
    try {
        const { id } = await context.params

        if (!id) {
            return errorResponse('Business ID is required', 400)
        }

        // Fetch business details
        const { data: business, error: bizError } = await supabaseAdmin
            .from('vendor_businesses')
            .select(`
                *,
                vendor_profiles:vendor_id(
                    users:user_id(full_name, mobile, email, profile_image_url)
                )
            `)
            .eq('id', id)
            .eq('is_active', true)
            .is('deleted_at', null)
            .single()

        if (bizError || !business) {
            return errorResponse('Business not found', 404)
        }

        // Fetch services
        const { data: services } = await supabaseAdmin
            .from('vendor_services')
            .select('*')
            .eq('business_id', id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        // Fetch amenities
        const { data: amenities } = await supabaseAdmin
            .from('business_amenities')
            .select('amenities:amenity_id(id, name, icon)')
            .eq('business_id', id)

        // Fetch top recent reviews
        const { data: reviews } = await supabaseAdmin
            .from('reviews')
            .select('id, rating, comment, created_at, users:user_id(full_name, profile_image_url)')
            .eq('business_id', id)
            .order('created_at', { ascending: false })
            .limit(10)

        // Calculate average rating
        let avg_rating = '0.0'
        let review_count = 0
        const { data: allReviews } = await supabaseAdmin
            .from('reviews')
            .select('rating')
            .eq('business_id', id)

        if (allReviews && allReviews.length > 0) {
            const sum = allReviews.reduce((acc, r) => acc + r.rating, 0)
            avg_rating = (sum / allReviews.length).toFixed(1)
            review_count = allReviews.length
        }

        const formattedAmenities = (amenities || []).map(a => a.amenities).filter(Boolean)

        return successResponse('Business details fetched successfully', {
            ...business,
            avg_rating,
            review_count,
            services: services || [],
            amenities: formattedAmenities,
            recent_reviews: reviews || []
        })

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
