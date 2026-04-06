import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { awardXP } from '@/lib/xp'
import { processReward } from '@/lib/earningEngine'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

// POST — Add a review for a pump/place (supports image upload)
export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        // Support both JSON and formData
        const contentType = request.headers.get('content-type') || ''
        let place_id, rating, reviewContent, imageUrl = null

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData()
            place_id = formData.get('place_id')
            rating = parseInt(formData.get('rating'))
            reviewContent = formData.get('review_text') || formData.get('review') || null
            const imageField = formData.get('image')

            // Handle image: could be a File or a text URL
            if (imageField) {
                if (typeof imageField === 'string') {
                    // Validate it's a URL
                    if (imageField.startsWith('http://') || imageField.startsWith('https://')) {
                        imageUrl = imageField
                    } else {
                        return errorResponse('Image text must be a valid URL (http:// or https://)', 400)
                    }
                } else if (imageField.size > 0) {
                    // It's a File — validate it's an image
                    if (!ALLOWED_IMAGE_TYPES.includes(imageField.type)) {
                        return errorResponse('Only image files are allowed (jpeg, png, webp, gif)', 400)
                    }
                    if (imageField.size > MAX_IMAGE_SIZE) {
                        return errorResponse('Image must be less than 5MB', 400)
                    }

                    // Upload to Supabase Storage
                    const ext = imageField.name.split('.').pop()
                    const fileName = `pump-reviews/${user.user_id}_${Date.now()}.${ext}`
                    const buffer = Buffer.from(await imageField.arrayBuffer())

                    const { error: uploadError } = await supabaseAdmin.storage
                        .from('media')
                        .upload(fileName, buffer, {
                            contentType: imageField.type,
                            upsert: true
                        })

                    if (uploadError) {
                        console.error('[PumpReview] Upload error:', uploadError.message)
                        return errorResponse('Failed to upload image: ' + uploadError.message, 500)
                    }

                    const { data: urlData } = supabaseAdmin.storage
                        .from('media')
                        .getPublicUrl(fileName)

                    imageUrl = urlData.publicUrl
                }
            }
        } else {
            // JSON body
            const body = await request.json()
            place_id = body.place_id
            rating = body.rating
            reviewContent = body.review_text || body.review || null
            // Accept image_url as text URL in JSON
            if (body.image_url) {
                if (body.image_url.startsWith('http://') || body.image_url.startsWith('https://')) {
                    imageUrl = body.image_url
                } else {
                    return errorResponse('image_url must be a valid URL (http:// or https://)', 400)
                }
            }
        }

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

        // Check if user already reviewed this place
        const { data: existingReview } = await supabaseAdmin
            .from('pump_reviews')
            .select('id')
            .eq('place_id', place_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (existingReview) {
            return errorResponse('You have already reviewed this place.', 400)
        }

        const insertData = {
            place_id,
            rider_id: riderProfile.id,
            rating,
            review_text: reviewContent
        }
        if (imageUrl) insertData.image_url = imageUrl

        const { data, error } = await supabaseAdmin
            .from('pump_reviews')
            .insert(insertData)
            .select()
            .single()

        if (error) throw error

        // Award XP: Write Review
        await awardXP(riderProfile.id, 'write_review', data.id)

        // Award wallet reward (₹5) — only if review text is meaningful (anti-spam)
        let rewardResult = { reward_given: false, reason: 'review_text_too_short' }
        if (reviewContent && reviewContent.trim().length >= 10) {
            rewardResult = await processReward({
                userId: user.user_id,
                actionType: 'write_review',
                amountPaise: 500,
                referenceType: 'pump_review',
                referenceId: data.id,
                metadata: { place_id, rating }
            })
        }

        return successResponse('Review added successfully', {
            ...data,
            reward: {
                xp_awarded: true,
                wallet_reward: rewardResult.reward_given,
                reason: rewardResult.reason || null
            }
        })
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// GET — Fetch reviews for a specific pump/place
// ?place_id=xxx
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const place_id = searchParams.get('place_id')

        if (!place_id) return errorResponse('place_id is required', 400)

        const { data: reviews, error } = await supabaseAdmin
            .from('pump_reviews')
            .select('id, rating, review_text, image_url, created_at, rider_id, rider_profiles(user_id, users:user_id(full_name, profile_image_url))')
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
            image_url: r.image_url || null,
            created_at: r.created_at,
            rider_name: r.rider_profiles?.users?.full_name || 'Anonymous',
            rider_image: r.rider_profiles?.users?.profile_image_url || null
        }))

        return successResponse('Reviews fetched successfully', {
            avg_rating,
            review_count,
            reviews: formattedReviews
        })
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// DELETE — Remove your review
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

        return successResponse('Review deleted successfully')
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}

// PUT — Update your review (supports image upload)
export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const contentType = request.headers.get('content-type') || ''
        let id, rating, reviewContent, imageUrl = undefined

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData()
            id = formData.get('id')
            const ratingVal = formData.get('rating')
            rating = ratingVal ? parseInt(ratingVal) : undefined
            const reviewVal = formData.get('review_text') || formData.get('review')
            reviewContent = reviewVal || undefined
            const imageField = formData.get('image')

            if (imageField === 'null' || imageField === '') {
                // Explicitly remove the image
                imageUrl = null
            } else if (imageField) {
                if (typeof imageField === 'string') {
                    if (imageField.startsWith('http://') || imageField.startsWith('https://')) {
                        imageUrl = imageField
                    } else {
                        return errorResponse('Image text must be a valid URL (http:// or https://)', 400)
                    }
                } else if (imageField.size > 0) {
                    if (!ALLOWED_IMAGE_TYPES.includes(imageField.type)) {
                        return errorResponse('Only image files are allowed (jpeg, png, webp, gif)', 400)
                    }
                    if (imageField.size > MAX_IMAGE_SIZE) {
                        return errorResponse('Image must be less than 5MB', 400)
                    }

                    const ext = imageField.name.split('.').pop()
                    const fileName = `pump-reviews/${user.user_id}_${Date.now()}.${ext}`
                    const buffer = Buffer.from(await imageField.arrayBuffer())

                    const { error: uploadError } = await supabaseAdmin.storage
                        .from('media')
                        .upload(fileName, buffer, {
                            contentType: imageField.type,
                            upsert: true
                        })

                    if (uploadError) {
                        console.error('[PumpReview] Upload error:', uploadError.message)
                        return errorResponse('Failed to upload image: ' + uploadError.message, 500)
                    }

                    const { data: urlData } = supabaseAdmin.storage
                        .from('media')
                        .getPublicUrl(fileName)

                    imageUrl = urlData.publicUrl
                }
            }
        } else {
            const body = await request.json()
            id = body.id
            rating = body.rating
            reviewContent = body.review_text || body.review
            if (body.image_url !== undefined) {
                if (body.image_url === null || body.image_url === '') {
                    imageUrl = null
                } else if (body.image_url.startsWith('http://') || body.image_url.startsWith('https://')) {
                    imageUrl = body.image_url
                } else {
                    return errorResponse('image_url must be a valid URL (http:// or https://)', 400)
                }
            }
        }

        if (!id) return errorResponse('Review id is required', 400)
        if (!rating && !reviewContent && imageUrl === undefined) return errorResponse('Provide rating, review, or image to update', 400)
        if (rating && (rating < 1 || rating > 5)) return errorResponse('Rating must be between 1 and 5', 400)

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        const { data: existingReview } = await supabaseAdmin
            .from('pump_reviews')
            .select('rider_id')
            .eq('id', id)
            .single()

        if (!existingReview || existingReview.rider_id !== riderProfile.id) {
            return errorResponse('Review not found or access denied', 404)
        }

        const updateData = {}
        if (rating) updateData.rating = rating
        if (reviewContent !== undefined) updateData.review_text = reviewContent
        if (imageUrl !== undefined) updateData.image_url = imageUrl

        const { data, error } = await supabaseAdmin
            .from('pump_reviews')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return successResponse('Review updated successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
