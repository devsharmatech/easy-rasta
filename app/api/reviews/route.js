import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { awardXP } from '@/lib/xp'

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        const contentType = request.headers.get('content-type') || ''
        let business_id, rating, review, image

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData()
            business_id = formData.get('business_id')
            rating = formData.get('rating') ? parseInt(formData.get('rating')) : null
            review = formData.get('review')
            image = formData.get('image')
        } else {
            const body = await request.json()
            business_id = body.business_id
            rating = body.rating
            review = body.review
            image = body.image
        }

        if (!business_id || !rating) {
            return errorResponse('business_id and rating are required', 400)
        }

        if (rating < 1 || rating > 5) return errorResponse('Rating must be between 1 and 5', 400)

        // Handle image upload if provided
        let image_url = null
        if (image && typeof image !== 'string' && image.size > 0) {
            const ext = image.name.split('.').pop()
            const fileName = `review-images/${user.user_id}_${Date.now()}.${ext}`

            const buffer = Buffer.from(await image.arrayBuffer())

            const { error: uploadError } = await supabaseAdmin.storage
                .from('media')
                .upload(fileName, buffer, {
                    contentType: image.type,
                    upsert: true
                })

            if (uploadError) throw uploadError

            const { data: urlData } = supabaseAdmin.storage
                .from('media')
                .getPublicUrl(fileName)

            image_url = urlData.publicUrl
        }

        const { data, error } = await supabaseAdmin
            .from('vendor_reviews')
            .insert({
                business_id,
                rider_id: riderProfile.id,
                rating,
                review,
                image_url
            })
            .select()
            .single()

        if (error) throw error

        // Award XP: Write Review
        await awardXP(riderProfile.id, 'write_review', data.id)

        return successResponse('Review submitted successfully', data)

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const business_id = searchParams.get('business_id')

        if (!business_id) return errorResponse('Business ID required', 400)

        const { data, error } = await supabaseAdmin
            .from('vendor_reviews')
            .select('*, rider_profiles(user_id, users:user_id(full_name))')
            .eq('business_id', business_id)
            .order('created_at', { ascending: false })

        if (error) throw error

        const reviews = data.map(r => ({
            id: r.id,
            rating: r.rating,
            review: r.review,
            image_url: r.image_url,
            reviewer_name: r.rider_profiles?.users?.full_name || 'Anonymous',
            created_at: r.created_at
        }))

        return successResponse('Reviews fetched successfully', reviews)
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}

// PUT — Update own review
export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        let review_id, rating, review, image
        const contentType = request.headers.get('content-type') || ''

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData()
            review_id = formData.get('review_id')
            rating = formData.get('rating') ? parseInt(formData.get('rating')) : undefined
            review = formData.get('review')
            // To delete an image, they might pass explicit string "null". Otherwise they pass a File.
            image = formData.get('image')
        } else {
            const body = await request.json()
            review_id = body.review_id
            rating = body.rating
            review = body.review
            image = body.image
        }

        if (!review_id) return errorResponse('review_id is required', 400)

        // Verify ownership
        const { data: existing } = await supabaseAdmin
            .from('vendor_reviews')
            .select('id, image_url')
            .eq('id', review_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (!existing) return errorResponse('Review not found or not owned by you', 404)

        const updateFields = {}
        if (rating !== undefined) {
            if (rating < 1 || rating > 5) return errorResponse('Rating must be between 1 and 5', 400)
            updateFields.rating = rating
        }
        if (review !== undefined && review !== null) updateFields.review = review

        // Handle Image Deletion or Update
        if (image === 'null' || image === null) {
            updateFields.image_url = null
        } else if (image && typeof image !== 'string' && image.size > 0) {
            const ext = image.name.split('.').pop()
            const fileName = `review-images/${user.user_id}_${Date.now()}.${ext}`

            const buffer = Buffer.from(await image.arrayBuffer())

            const { error: uploadError } = await supabaseAdmin.storage
                .from('media')
                .upload(fileName, buffer, {
                    contentType: image.type,
                    upsert: true
                })

            if (uploadError) throw uploadError

            const { data: urlData } = supabaseAdmin.storage
                .from('media')
                .getPublicUrl(fileName)

            updateFields.image_url = urlData.publicUrl
        }

        if (Object.keys(updateFields).length === 0) {
            return errorResponse('Nothing to update', 400)
        }

        const { data, error } = await supabaseAdmin
            .from('vendor_reviews')
            .update(updateFields)
            .eq('id', review_id)
            .select()
            .single()

        if (error) throw error

        return successResponse('Review updated successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// DELETE — Delete own review
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        const { searchParams } = new URL(request.url)
        const review_id = searchParams.get('id')

        if (!review_id) return errorResponse('Review ID required', 400)

        // Verify ownership
        const { data: existing } = await supabaseAdmin
            .from('vendor_reviews')
            .select('id')
            .eq('id', review_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (!existing) return errorResponse('Review not found or not owned by you', 404)

        const { error } = await supabaseAdmin
            .from('vendor_reviews')
            .delete()
            .eq('id', review_id)

        if (error) throw error

        return successResponse('Review deleted successfully')
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}
