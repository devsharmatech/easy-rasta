import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

// POST — Add a review for a specific petrol pump (using Google place_id)
export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { place_id, rating, review_text, review } = body
        const reviewContent = review_text || review || null

        if (!place_id || !rating) {
            return errorResponse('place_id and rating are required', 400)
        }

        if (rating < 1 || rating > 5) {
            return errorResponse('Rating must be between 1 and 5', 400)
        }

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        // Check if user already reviewed this pump
        const { data: existingReview } = await supabaseAdmin
            .from('pump_reviews')
            .select('id')
            .eq('place_id', place_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (existingReview) {
            return errorResponse('You have already reviewed this petrol pump.', 400)
        }

        const { data, error } = await supabaseAdmin
            .from('pump_reviews')
            .insert({
                place_id,
                rider_id: riderProfile.id,
                rating,
                review_text: reviewContent
            })
            .select()
            .single()

        if (error) throw error

        return successResponse('Pump review added successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// GET — Fetch reviews for a specific petrol pump
// ?place_id=xxx
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const place_id = searchParams.get('place_id')

        if (!place_id) return errorResponse('place_id is required', 400)

        // Fetch all reviews and join rider profiles to get names
        const { data: reviews, error } = await supabaseAdmin
            .from('pump_reviews')
            .select('id, rating, review_text, created_at, rider_id, rider_profiles(user_id, users:user_id(full_name, profile_image_url))')
            .eq('place_id', place_id)
            .order('created_at', { ascending: false })

        if (error) throw error

        let avg_rating = '0.0'
        let review_count = 0

        if (reviews && reviews.length > 0) {
            const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
            avg_rating = (sum / reviews.length).toFixed(1)
            review_count = reviews.length
        }

        const formattedReviews = reviews.map(r => ({
            id: r.id,
            rating: r.rating,
            review_text: r.review_text,
            created_at: r.created_at,
            rider_name: r.rider_profiles?.users?.full_name || 'Anonymous',
            rider_image: r.rider_profiles?.users?.profile_image_url || null
        }))

        return successResponse('Pump reviews fetched successfully', {
            avg_rating,
            review_count,
            reviews: formattedReviews
        })
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// DELETE — Remove your pump review
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return errorResponse('Review id required', 400)

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        // Verify the review belongs to this rider
        const { data: existingReview } = await supabaseAdmin
            .from('pump_reviews')
            .select('rider_id')
            .eq('id', id)
            .single()

        if (!existingReview || existingReview.rider_id !== riderProfile?.id) {
            return errorResponse('Review not found or access denied', 404)
        }

        const { error } = await supabaseAdmin
            .from('pump_reviews')
            .delete()
            .eq('id', id)

        if (error) throw error

        return successResponse('Pump review deleted successfully')
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}

// PUT — Update your pump review
export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { id, rating, review_text, review } = body
        const reviewContent = review_text || review

        if (!id) return errorResponse('Review id is required', 400)
        if (!rating && !reviewContent) return errorResponse('Provide rating or review to update', 400)
        if (rating && (rating < 1 || rating > 5)) return errorResponse('Rating must be between 1 and 5', 400)

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        // Verify the review belongs to this rider
        const { data: existingReview } = await supabaseAdmin
            .from('pump_reviews')
            .select('rider_id')
            .eq('id', id)
            .single()

        if (!existingReview || existingReview.rider_id !== riderProfile.id) {
            return errorResponse('Review not found or access denied', 404)
        }

        // Build update object with only provided fields
        const updateData = {}
        if (rating) updateData.rating = rating
        if (reviewContent !== undefined) updateData.review_text = reviewContent

        const { data, error } = await supabaseAdmin
            .from('pump_reviews')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return successResponse('Pump review updated successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
