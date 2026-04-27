import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0


// POST — Add a vehicle document (Insurance, RC, Pollution)
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
        const doc_type = formData.get('doc_type') // 'insurance', 'rc', 'pollution'
        const doc_number = formData.get('doc_number')
        const issue_date = formData.get('issue_date')
        const expiry_date = formData.get('expiry_date')
        const file = formData.get('file')

        if (!vehicle_id || !doc_type) {
            return errorResponse('vehicle_id and doc_type are required', 400)
        }

        if (!['insurance', 'rc', 'pollution'].includes(doc_type)) {
            return errorResponse('doc_type must be insurance, rc, or pollution', 400)
        }

        // Verify vehicle belongs to this rider
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

        // Upload document file if provided
        let document_url = null
        if (file && typeof file !== 'string' && file.size > 0) {
            const ext = file.name.split('.').pop()
            const fileName = `vehicle-docs/${user.user_id}_${vehicle_id}_${doc_type}_${Date.now()}.${ext}`

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

            document_url = urlData.publicUrl
        }

        const { data, error } = await supabaseAdmin
            .from('vehicle_documents')
            .insert({
                vehicle_id,
                doc_type,
                doc_number,
                issue_date: issue_date || null,
                expiry_date: expiry_date || null,
                document_url
            })
            .select()
            .single()

        if (error) throw error

        return successResponse('Document added successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// GET — Fetch all documents for a vehicle
// ?vehicle_id=xxx
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const vehicle_id = searchParams.get('vehicle_id')

        if (!vehicle_id) return errorResponse('vehicle_id is required', 400)

        // Get rider profile and verify ownership
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

        const { data, error } = await supabaseAdmin
            .from('vehicle_documents')
            .select('*')
            .eq('vehicle_id', vehicle_id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return successResponse('Documents fetched successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// PUT — Update a document (replace details or file)
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

        if (!id) return errorResponse('Document id is required', 400)

        // Verify document belongs to caller
        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        const { data: existingDoc } = await supabaseAdmin
            .from('vehicle_documents')
            .select('*, vehicles!inner(rider_id)')
            .eq('id', id)
            .single()

        if (!existingDoc || existingDoc.vehicles.rider_id !== riderProfile?.id) {
            return errorResponse('Document not found or access denied', 404)
        }

        const updateFields = {}
        const fields = ['doc_number', 'issue_date', 'expiry_date']

        fields.forEach(f => {
            const val = formData.get(f)
            if (val !== null) updateFields[f] = val === '' ? null : val
        })

        const file = formData.get('file')

        // Handle File Replacement or Deletion
        if (file === 'null') {
            updateFields.document_url = null
        } else if (file && typeof file !== 'string' && file.size > 0) {
            const ext = file.name.split('.').pop()
            const fileName = `vehicle-docs/${user.user_id}_${existingDoc.vehicle_id}_${existingDoc.doc_type}_${Date.now()}.${ext}`

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

            updateFields.document_url = urlData.publicUrl
        }

        if (Object.keys(updateFields).length === 0) {
            return errorResponse('Nothing to update', 400)
        }

        const { data, error } = await supabaseAdmin
            .from('vehicle_documents')
            .update(updateFields)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return successResponse('Document updated successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// DELETE — Remove a document
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return errorResponse('Document id required', 400)

        // Verify document belongs to caller
        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        const { data: existingDoc } = await supabaseAdmin
            .from('vehicle_documents')
            .select('id, vehicles!inner(rider_id)')
            .eq('id', id)
            .single()

        if (!existingDoc || existingDoc.vehicles.rider_id !== riderProfile?.id) {
            return errorResponse('Document not found or access denied', 404)
        }

        const { error } = await supabaseAdmin
            .from('vehicle_documents')
            .delete()
            .eq('id', id)

        if (error) throw error

        return successResponse('Document deleted successfully')
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}
