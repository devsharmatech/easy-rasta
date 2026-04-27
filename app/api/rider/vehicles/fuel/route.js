import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0


// POST — Add a fuel log
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
        const fill_date = formData.get('fill_date')
        const odometer = formData.get('odometer') ? parseInt(formData.get('odometer')) : null
        const fuel_amount = formData.get('fuel_amount') ? parseFloat(formData.get('fuel_amount')) : null
        const cost = formData.get('cost') ? parseFloat(formData.get('cost')) : null
        const file = formData.get('file')

        if (!vehicle_id || !fill_date) {
            return errorResponse('vehicle_id and fill_date are required', 400)
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
            const fileName = `vehicle-fuel/${user.user_id}_${vehicle_id}_${Date.now()}.${ext}`
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
            .from('vehicle_fuel_logs')
            .insert({
                vehicle_id,
                fill_date,
                odometer,
                fuel_amount,
                cost,
                receipt_url
            })
            .select()
            .single()

        if (error) throw error

        return successResponse('Fuel log added successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// GET — Fetch all fuel logs for a vehicle
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
            .from('vehicle_fuel_logs')
            .select('*')
            .eq('vehicle_id', vehicle_id)
            .order('fill_date', { ascending: false })

        if (error) throw error

        return successResponse('Fuel logs fetched successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// PUT — Update fuel log
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

        if (!id) return errorResponse('Fuel log id is required', 400)

        // Verify ownership
        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        const { data: existingFuel } = await supabaseAdmin
            .from('vehicle_fuel_logs')
            .select('*, vehicles!inner(rider_id)')
            .eq('id', id)
            .single()

        if (!existingFuel || existingFuel.vehicles.rider_id !== riderProfile?.id) {
            return errorResponse('Record not found or access denied', 404)
        }

        const updateFields = {}
        const dateAttr = formData.get('fill_date')
        if (dateAttr !== null) updateFields.fill_date = dateAttr

        const odoAttr = formData.get('odometer')
        if (odoAttr !== null) updateFields.odometer = odoAttr === '' ? null : parseInt(odoAttr)

        const fuelAttr = formData.get('fuel_amount')
        if (fuelAttr !== null) updateFields.fuel_amount = fuelAttr === '' ? null : parseFloat(fuelAttr)

        const costAttr = formData.get('cost')
        if (costAttr !== null) updateFields.cost = costAttr === '' ? null : parseFloat(costAttr)

        const file = formData.get('file')

        if (file === 'null') {
            updateFields.receipt_url = null
        } else if (file && typeof file !== 'string' && file.size > 0) {
            const ext = file.name.split('.').pop()
            const fileName = `vehicle-fuel/${user.user_id}_${existingFuel.vehicle_id}_${Date.now()}.${ext}`
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
            .from('vehicle_fuel_logs')
            .update(updateFields)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return successResponse('Fuel log updated successfully', data)
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}

// DELETE — Remove a fuel log
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return errorResponse('Fuel log id required', 400)

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        const { data: existingFuel } = await supabaseAdmin
            .from('vehicle_fuel_logs')
            .select('id, vehicles!inner(rider_id)')
            .eq('id', id)
            .single()

        if (!existingFuel || existingFuel.vehicles.rider_id !== riderProfile?.id) {
            return errorResponse('Record not found or access denied', 404)
        }

        const { error } = await supabaseAdmin
            .from('vehicle_fuel_logs')
            .delete()
            .eq('id', id)

        if (error) throw error

        return successResponse('Fuel log deleted successfully')
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}
