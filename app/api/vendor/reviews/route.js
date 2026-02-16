import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

// GET — Vendor views reviews on their businesses
// ?business_id=xxx  → filter by specific business
// No param          → all reviews across all businesses
export async function GET(request) {
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

        const { searchParams } = new URL(request.url)
        const business_id = searchParams.get('business_id')

        // Build query — join reviews → business to verify vendor ownership
        let query = supabaseAdmin
            .from('vendor_reviews')
            .select('*, vendor_businesses!inner(id, business_name, vendor_id), rider_profiles(user_id, users:user_id(full_name))')
            .eq('vendor_businesses.vendor_id', vendorProfile.id)
            .order('created_at', { ascending: false })

        // Filter by specific business
        if (business_id) {
            query = query.eq('business_id', business_id)
        }

        const { data, error } = await query

        if (error) throw error

        // Clean the response
        const reviews = data.map(r => ({
            id: r.id,
            business_id: r.business_id,
            business_name: r.vendor_businesses?.business_name,
            rating: r.rating,
            review: r.review,
            reviewer_name: r.rider_profiles?.users?.full_name || 'Anonymous',
            created_at: r.created_at
        }))

        return successResponse('Reviews fetched successfully', reviews)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// POST — Vendor reports/flags a review
export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { review_id, reason } = body

        if (!review_id || !reason) {
            return errorResponse('review_id and reason are required', 400)
        }

        const { data: vendorProfile } = await supabaseAdmin
            .from('vendor_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!vendorProfile) return errorResponse('Vendor profile not found', 404)

        // Verify this review belongs to one of vendor's businesses
        const { data: review } = await supabaseAdmin
            .from('vendor_reviews')
            .select('*, vendor_businesses!inner(vendor_id)')
            .eq('id', review_id)
            .eq('vendor_businesses.vendor_id', vendorProfile.id)
            .single()

        if (!review) return errorResponse('Review not found or not on your business', 404)

        // Check if already reported by this vendor
        const { data: existing } = await supabaseAdmin
            .from('review_reports')
            .select('id')
            .eq('review_id', review_id)
            .eq('reported_by', user.user_id)
            .single()

        if (existing) return errorResponse('You have already reported this review', 400)

        // Create the report
        const { data, error } = await supabaseAdmin
            .from('review_reports')
            .insert({
                review_id,
                reported_by: user.user_id,
                reason
            })
            .select()
            .single()

        if (error) throw error

        return successResponse('Review reported successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
