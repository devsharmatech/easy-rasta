import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0


// POST — Add a service log
export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const contentType = request.headers.get('content-type') || ''
        if (!contentType.includes('multipart/form-data')) {
            return errorResponse('Must be multipart/form-data', 400)
        }

        const formData = await request.formData()
        const vehicle_id = formData.get('vehicle_id')
        const service_date = formData.get('service_date')
        const odometer = formData.get('odometer') ? parseInt(formData.get('odometer')) : null
        const cost = formData.get('cost') ? parseFloat(formData.get('cost')) : null
        const description = formData.get('description')
        const file = formData.get('file')

        if (!vehicle_id || !service_date) {
            return errorResponse('vehicle_id and service_date are required', 400)
        }

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        const { data: vehicle } = await supabaseAdmin
            .from('vehicles')
            .select('id')
            .eq('id', vehicle_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (!vehicle) return errorResponse('Vehicle not found or not owned by you', 404)

        // Upload receipt if provided
        let receipt_url = null
        if (file && typeof file !== 'string' && file.size > 0) {
            const ext = file.name.split('.').pop()
            const fileName = `vehicle-services/${user.user_id}_${vehicle_id}_${Date.now()}.${ext}`
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

            receipt_url = urlData.publicUrl
        }

        const { data, error } = await supabaseAdmin
            .from('vehicle_services')
            .insert({
                vehicle_id,
                service_date,
                odometer,
                cost,
                description,
                receipt_url
            })
            .select()
            .single()

        if (error) throw error

        return successResponse('Service log added successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// GET — Fetch all service logs for a vehicle
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const vehicle_id = searchParams.get('vehicle_id')

        if (!vehicle_id) return errorResponse('vehicle_id is required', 400)

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        const { data: vehicle } = await supabaseAdmin
            .from('vehicles')
            .select('id')
            .eq('id', vehicle_id)
            .eq('rider_id', riderProfile?.id)
            .single()

        if (!vehicle) return errorResponse('Vehicle not found or access denied', 404)

        const { data, error } = await supabaseAdmin
            .from('vehicle_services')
            .select('*')
            .eq('vehicle_id', vehicle_id)
            .order('service_date', { ascending: false })

        if (error) throw error

        return successResponse('Service logs fetched successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// PUT — Update service log
export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const contentType = request.headers.get('content-type') || ''
        if (!contentType.includes('multipart/form-data')) {
            return errorResponse('Must be multipart/form-data', 400)
        }

        const formData = await request.formData()
        const id = formData.get('id')

        if (!id) return errorResponse('Service id is required', 400)

        // Verify ownership
        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        const { data: existingSvc } = await supabaseAdmin
            .from('vehicle_services')
            .select('*, vehicles!inner(rider_id)')
            .eq('id', id)
            .single()

        if (!existingSvc || existingSvc.vehicles.rider_id !== riderProfile?.id) {
            return errorResponse('Record not found or access denied', 404)
        }

        const updateFields = {}
        const dateAttr = formData.get('service_date')
        if (dateAttr !== null) updateFields.service_date = dateAttr

        const odoAttr = formData.get('odometer')
        if (odoAttr !== null) updateFields.odometer = odoAttr === '' ? null : parseInt(odoAttr)

        const costAttr = formData.get('cost')
        if (costAttr !== null) updateFields.cost = costAttr === '' ? null : parseFloat(costAttr)

        const descAttr = formData.get('description')
        if (descAttr !== null) updateFields.description = descAttr === '' ? null : descAttr

        const file = formData.get('file')

        if (file === 'null') {
            updateFields.receipt_url = null
        } else if (file && typeof file !== 'string' && file.size > 0) {
            const ext = file.name.split('.').pop()
            const fileName = `vehicle-services/${user.user_id}_${existingSvc.vehicle_id}_${Date.now()}.${ext}`
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

            updateFields.receipt_url = urlData.publicUrl
        }

        if (Object.keys(updateFields).length === 0) return errorResponse('Nothing to update', 400)

        const { data, error } = await supabaseAdmin
            .from('vehicle_services')
            .update(updateFields)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return successResponse('Service log updated successfully', data)
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}

// DELETE — Remove a service log
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return errorResponse('Service id required', 400)

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        const { data: existingSvc } = await supabaseAdmin
            .from('vehicle_services')
            .select('id, vehicles!inner(rider_id)')
            .eq('id', id)
            .single()

        if (!existingSvc || existingSvc.vehicles.rider_id !== riderProfile?.id) {
            return errorResponse('Record not found or access denied', 404)
        }

        const { error } = await supabaseAdmin
            .from('vehicle_services')
            .delete()
            .eq('id', id)

        if (error) throw error

        return successResponse('Service log deleted successfully')
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}
