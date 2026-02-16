import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

// GET — Vendor Dashboard (single API for all dashboard stats)
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        // 1. Get vendor profile with user info
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('vendor_profiles')
            .select('*, users:user_id(full_name, mobile, email)')
            .eq('user_id', user.user_id)
            .single()

        if (profileError || !profile) return errorResponse('Vendor profile not found', 404)

        // 2. Get all active businesses (not trashed)
        const { data: businesses, error: bizError } = await supabaseAdmin
            .from('vendor_businesses')
            .select('id, business_name, category, is_active, logo_url, created_at')
            .eq('vendor_id', profile.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })

        if (bizError) throw bizError

        const businessIds = businesses.map(b => b.id)
        const totalBusinesses = businesses.length
        const activeBusinesses = businesses.filter(b => b.is_active).length

        // 3. Get total services count
        let totalServices = 0
        if (businessIds.length > 0) {
            const { count } = await supabaseAdmin
                .from('vendor_services')
                .select('*', { count: 'exact', head: true })
                .in('business_id', businessIds)
                .eq('is_active', true)

            totalServices = count || 0
        }

        // 4. Get active offers count
        let activeOffers = 0
        if (businessIds.length > 0) {
            const { count } = await supabaseAdmin
                .from('business_offers')
                .select('*', { count: 'exact', head: true })
                .in('business_id', businessIds)
                .eq('is_active', true)

            activeOffers = count || 0
        }

        // 5. Get review stats
        let totalReviews = 0
        let recentReviews = []
        if (businessIds.length > 0) {
            const { count } = await supabaseAdmin
                .from('vendor_reviews')
                .select('*', { count: 'exact', head: true })
                .in('business_id', businessIds)

            totalReviews = count || 0

            // Last 5 reviews
            const { data: reviews } = await supabaseAdmin
                .from('vendor_reviews')
                .select('*, vendor_businesses(business_name), rider_profiles(user_id, users:user_id(full_name))')
                .in('business_id', businessIds)
                .order('created_at', { ascending: false })
                .limit(5)

            recentReviews = (reviews || []).map(r => ({
                id: r.id,
                rating: r.rating,
                review: r.review,
                business_name: r.vendor_businesses?.business_name,
                reviewer_name: r.rider_profiles?.users?.full_name || 'Anonymous',
                created_at: r.created_at
            }))
        }

        // 6. Get pending reports count
        let pendingReports = 0
        if (businessIds.length > 0) {
            const { data: reportedReviewIds } = await supabaseAdmin
                .from('vendor_reviews')
                .select('id')
                .in('business_id', businessIds)

            if (reportedReviewIds && reportedReviewIds.length > 0) {
                const reviewIds = reportedReviewIds.map(r => r.id)
                const { count } = await supabaseAdmin
                    .from('review_reports')
                    .select('*', { count: 'exact', head: true })
                    .in('review_id', reviewIds)
                    .eq('reported_by', user.user_id)
                    .eq('status', 'pending')

                pendingReports = count || 0
            }
        }

        // 7. Get trashed businesses count
        const { count: trashedCount } = await supabaseAdmin
            .from('vendor_businesses')
            .select('*', { count: 'exact', head: true })
            .eq('vendor_id', profile.id)
            .not('deleted_at', 'is', null)

        // Build dashboard response
        const dashboard = {
            vendor: {
                name: profile.users?.full_name,
                mobile: profile.users?.mobile,
                email: profile.users?.email,
                verification_status: profile.verification_status,
                gst_number: profile.gst_number
            },
            stats: {
                total_views: profile.total_views || 0,
                today_views: profile.today_views || 0,
                average_rating: parseFloat(profile.average_rating) || 0,
                total_businesses: totalBusinesses,
                active_businesses: activeBusinesses,
                total_services: totalServices,
                active_offers: activeOffers,
                total_reviews: totalReviews,
                pending_reports: pendingReports,
                trashed_businesses: trashedCount || 0
            },
            businesses,
            recent_reviews: recentReviews
        }

        return successResponse('Dashboard loaded successfully', dashboard)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
