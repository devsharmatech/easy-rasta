import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

// Helper: upload file to Supabase Storage
const uploadFile = async (file, folder, userId) => {
    if (!file || typeof file === 'string' || file.size === 0) return null

    const ext = file.name.split('.').pop()
    const fileName = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
        .from('media')
        .upload(fileName, buffer, {
            contentType: file.type,
            upsert: true
        })

    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage
        .from('media')
        .getPublicUrl(fileName)

    return urlData.publicUrl
}

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

        const formData = await request.formData()

        const nickname = formData.get('nickname')
        const type = formData.get('type')
        const make = formData.get('make')
        const model = formData.get('model')
        const year = formData.get('year')
        const fuel_type = formData.get('fuel_type')
        const vehicle_image = formData.get('vehicle_image')
        const vehicle_document = formData.get('vehicle_document')

        if (!type) return errorResponse('Vehicle type is required', 400)

        // Upload files
        const image_url = await uploadFile(vehicle_image, 'vehicles', user.user_id)
        const document_url = await uploadFile(vehicle_document, 'vehicle-docs', user.user_id)

        const { data, error } = await supabaseAdmin
            .from('vehicles')
            .insert({
                rider_id: riderProfile.id,
                nickname,
                type,
                make,
                model,
                year: year ? parseInt(year) : null,
                fuel_type,
                image_url,
                document_url,
                health_status: 'good'
            })
            .select()
            .single()

        if (error) throw error

        return successResponse('Vehicle added successfully', data)

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// PUT — Update vehicle
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

        const formData = await request.formData()
        const vehicle_id = formData.get('vehicle_id')

        if (!vehicle_id) return errorResponse('vehicle_id is required', 400)

        // Verify ownership
        const { data: vehicle } = await supabaseAdmin
            .from('vehicles')
            .select('id')
            .eq('id', vehicle_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (!vehicle) return errorResponse('Vehicle not found or not owned by you', 404)

        const nickname = formData.get('nickname')
        const make = formData.get('make')
        const model = formData.get('model')
        const year = formData.get('year')
        const fuel_type = formData.get('fuel_type')
        const health_status = formData.get('health_status')
        const vehicle_image = formData.get('vehicle_image')
        const vehicle_document = formData.get('vehicle_document')

        // Upload new files (only if new file provided)
        const image_url = await uploadFile(vehicle_image, 'vehicles', user.user_id)
        const document_url = await uploadFile(vehicle_document, 'vehicle-docs', user.user_id)

        // All text fields always sent from frontend (pre-filled with old data)
        const updateFields = {
            nickname,
            make,
            model,
            year: year ? parseInt(year) : null,
            fuel_type,
            health_status
        }
        // Only update files if new ones were uploaded
        if (image_url) updateFields.image_url = image_url
        if (document_url) updateFields.document_url = document_url

        const { data, error } = await supabaseAdmin
            .from('vehicles')
            .update(updateFields)
            .eq('id', vehicle_id)
            .select()
            .single()

        if (error) throw error

        return successResponse('Vehicle updated successfully', data)

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

export async function GET(request) {
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

        if (!riderProfile) return successResponse('No vehicles found', [])

        const { data, error } = await supabaseAdmin
            .from('vehicles')
            .select(`
                *,
                vehicle_documents(*),
                vehicle_services(*),
                vehicle_fuel_logs(*)
            `)
            .eq('rider_id', riderProfile.id)
            .order('created_at', { ascending: false })

        // Optional: sort nested items if needed
        const formattedData = data?.map(v => ({
            ...v,
            vehicle_documents: v.vehicle_documents?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) || [],
            vehicle_services: v.vehicle_services?.sort((a, b) => new Date(b.service_date) - new Date(a.service_date)) || [],
            vehicle_fuel_logs: v.vehicle_fuel_logs?.sort((a, b) => new Date(b.fill_date) - new Date(a.fill_date)) || []
        })) || []

        if (error) throw error

        return successResponse('Vehicles fetched successfully', formattedData)
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}

// DELETE — Remove vehicle
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
        const vehicle_id = searchParams.get('id')

        if (!vehicle_id) return errorResponse('Vehicle ID required', 400)

        // Verify ownership
        const { data: vehicle } = await supabaseAdmin
            .from('vehicles')
            .select('id')
            .eq('id', vehicle_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (!vehicle) return errorResponse('Vehicle not found or not owned by you', 404)

        // Prevent foreign key constraint crash: Detach this vehicle from any expenses first
        await supabaseAdmin
            .from('rider_expenses')
            .update({ vehicle_id: null })
            .eq('vehicle_id', vehicle_id)

        const { error } = await supabaseAdmin
            .from('vehicles')
            .delete()
            .eq('id', vehicle_id)

        if (error) {
            console.error('Delete Vehicle Error:', error)
            return errorResponse(error.message, 500)
        }

        return successResponse('Vehicle deleted successfully')
    } catch (err) {
        console.error('Vehicle Delete Catch:', err)
        return errorResponse(err.message || 'Internal Server Error', 500)
    }
}
