import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { sendNotification } from '@/lib/firebase'

// GET — Admin views all reviews or reported reviews
// ?reported=true   → only reported reviews
// ?status=pending  → filter reports by status (pending/reviewed/dismissed)
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const reported = searchParams.get('reported') === 'true'
        const status = searchParams.get('status')

        if (reported) {
            // Get reported reviews with report details
            let query = supabaseAdmin
                .from('review_reports')
                .select('*, vendor_reviews:review_id(*, vendor_businesses(business_name), rider_profiles(user_id, users:user_id(full_name, mobile))), reporter:reported_by(full_name)')
                .order('created_at', { ascending: false })

            if (status) {
                query = query.eq('status', status)
            }

            const { data, error } = await query
            if (error) throw error

            const result = data.map(r => ({
                report_id: r.id,
                reason: r.reason,
                report_status: r.status,
                reported_by: r.reporter?.full_name,
                reported_at: r.created_at,
                review: r.vendor_reviews ? {
                    id: r.vendor_reviews.id,
                    rating: r.vendor_reviews.rating,
                    review: r.vendor_reviews.review,
                    business_name: r.vendor_reviews.vendor_businesses?.business_name,
                    reviewer_name: r.vendor_reviews.rider_profiles?.users?.full_name || 'Unknown',
                    reviewer_mobile: r.vendor_reviews.rider_profiles?.users?.mobile,
                    rider_user_id: r.vendor_reviews.rider_profiles?.user_id,
                    created_at: r.vendor_reviews.created_at
                } : null
            }))

            return successResponse('Reported reviews fetched successfully', result)
        }

        // All reviews
        const { data, error } = await supabaseAdmin
            .from('vendor_reviews')
            .select('*, vendor_businesses(business_name), rider_profiles(user_id, users:user_id(full_name))')
            .order('created_at', { ascending: false })

        if (error) throw error

        return successResponse('Reviews fetched successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// PUT — Admin takes action on a reported review
// Actions: "reviewed" (keep review), "dismissed" (keep review, dismiss report), "delete" (delete the review)
export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { report_id, action, notice_message } = body

        if (!report_id || !action) {
            return errorResponse('report_id and action are required', 400)
        }

        if (!['reviewed', 'dismissed', 'delete'].includes(action)) {
            return errorResponse('action must be: reviewed, dismissed, or delete', 400)
        }

        // Get the report with review details
        const { data: report } = await supabaseAdmin
            .from('review_reports')
            .select('*, vendor_reviews:review_id(*, rider_profiles(user_id))')
            .eq('id', report_id)
            .single()

        if (!report) return errorResponse('Report not found', 404)

        const riderId = report.vendor_reviews?.rider_profiles?.user_id

        if (action === 'delete') {
            // Delete the review (cascades to delete the report too)
            const { error: deleteError } = await supabaseAdmin
                .from('vendor_reviews')
                .delete()
                .eq('id', report.review_id)

            if (deleteError) throw deleteError

            // Send notice to rider if message provided
            if (notice_message && riderId) {
                await supabaseAdmin
                    .from('rider_notices')
                    .insert({
                        rider_user_id: riderId,
                        type: 'review_violation',
                        title: 'Review Removed',
                        message: notice_message,
                        sent_by: user.user_id
                    })

                // Push notification
                try {
                    await sendNotification(riderId, 'Review Removed', notice_message)
                } catch (e) { /* notification failure shouldn't block */ }
            }

            return successResponse('Review deleted and rider notified')
        } else {
            // Update report status (reviewed or dismissed)
            const { error: updateError } = await supabaseAdmin
                .from('review_reports')
                .update({ status: action })
                .eq('id', report_id)

            if (updateError) throw updateError

            // Send warning notice to rider if provided (even without deleting)
            if (notice_message && riderId) {
                await supabaseAdmin
                    .from('rider_notices')
                    .insert({
                        rider_user_id: riderId,
                        type: 'review_warning',
                        title: 'Review Warning',
                        message: notice_message,
                        sent_by: user.user_id
                    })

                try {
                    await sendNotification(riderId, 'Review Warning', notice_message)
                } catch (e) { /* notification failure shouldn't block */ }
            }

            return successResponse(`Report marked as ${action}`)
        }
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// DELETE — Admin deletes a review directly by review ID
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return errorResponse('Review ID required', 400)

        const { error } = await supabaseAdmin
            .from('vendor_reviews')
            .delete()
            .eq('id', id)

        if (error) throw error

        return successResponse('Review deleted successfully')
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}
