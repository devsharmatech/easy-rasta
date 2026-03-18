import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { data: riderProfile, error: profileError } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (profileError || !riderProfile) {
            return errorResponse('Rider profile not found', 404)
        }

        const { data, error } = await supabaseAdmin
            .from('location_requests')
            .select('id, type, name, latitude, longitude, message, image_url, is_paid, price, status, admin_remark')
            .eq('rider_id', riderProfile.id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return successResponse('Location requests fetched successfully', data)
    } catch (err) {
        console.error('[Location Requests GET] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const formData = await request.formData()
        const type = formData.get('type')
        const name = formData.get('name')
        const latitude = formData.get('latitude')
        const longitude = formData.get('longitude')
        const message = formData.get('message')
        const imageFile = formData.get('image')
        const is_paid = formData.get('is_paid') === 'true'
        const price = formData.get('price')

        // Validation
        if (!type || !['washroom', 'petrol_pump'].includes(type) || !name || !latitude || !longitude || !message || !imageFile) {
            return errorResponse('Missing required fields, including image image file', 400)
        }

        if (type === 'washroom' && is_paid && !price) {
            return errorResponse('Price is required for paid washrooms', 400)
        }

        const { data: riderProfile, error: profileError } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (profileError || !riderProfile) {
            return errorResponse('Rider profile not found', 404)
        }

        // Upload Image
        let imageUrl = null;
        if (imageFile && imageFile.name) {
            const fileExt = imageFile.name.split('.').pop()
            const fileName = `location-requests/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
            
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from('media')
                .upload(fileName, imageFile, {
                    contentType: imageFile.type,
                    upsert: false
                })

            if (uploadError) {
                console.error('[Image Upload Error]', uploadError)
                return errorResponse('Failed to upload image', 500)
            }

            const { data: publicUrlData } = supabaseAdmin.storage
                .from('media')
                .getPublicUrl(fileName)
                
            imageUrl = publicUrlData.publicUrl
        }

        const { data, error } = await supabaseAdmin
            .from('location_requests')
            .insert({
                rider_id: riderProfile.id,
                type,
                name,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                message,
                image_url: imageUrl,
                is_paid: type === 'washroom' ? Boolean(is_paid) : false,
                price: (type === 'washroom' && is_paid) ? parseFloat(price) : null,
                status: 'pending'
            })
            .select('id')
            .single()

        if (error) throw error

        return successResponse('Location request submitted successfully', { request_id: data.id })
    } catch (err) {
        console.error('[Location Requests POST] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
