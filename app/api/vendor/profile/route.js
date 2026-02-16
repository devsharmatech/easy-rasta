import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        // Join with users table to get name, mobile, email
        const { data, error } = await supabaseAdmin
            .from('vendor_profiles')
            .select('*, users(full_name, mobile, email)')
            .eq('user_id', user.user_id)
            .single()

        if (error) throw error

        // Flatten the response so name/mobile are top-level
        const { users: userInfo, ...profile } = data

        return successResponse('Profile fetched successfully', {
            ...profile,
            full_name: userInfo?.full_name,
            mobile: userInfo?.mobile,
            email: userInfo?.email
        })
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}

export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        const formData = await request.formData()

        // Text fields
        const gst_number = formData.get('gst_number')

        // File fields
        const gst_document = formData.get('gst_document')
        const pan_document = formData.get('pan_document')
        const other_document = formData.get('other_document')

        // Helper: upload a file to Supabase Storage
        const uploadFile = async (file, fieldName) => {
            if (!file || typeof file === 'string' || file.size === 0) return null

            const ext = file.name.split('.').pop()
            const fileName = `vendor-docs/${user.user_id}/${fieldName}_${Date.now()}.${ext}`

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

        // Upload files
        const gst_document_url = await uploadFile(gst_document, 'gst')
        const pan_document_url = await uploadFile(pan_document, 'pan')
        const other_document_url = await uploadFile(other_document, 'other')

        // Build update object
        const updateFields = { verification_status: 'pending' }
        if (gst_number !== null && gst_number !== undefined) updateFields.gst_number = gst_number
        if (gst_document_url) updateFields.gst_document_url = gst_document_url
        if (pan_document_url) updateFields.pan_document_url = pan_document_url
        if (other_document_url) updateFields.other_document_url = other_document_url

        const { data, error } = await supabaseAdmin
            .from('vendor_profiles')
            .update(updateFields)
            .eq('user_id', user.user_id)
            .select()

        if (error) throw error

        return successResponse('Profile updated successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
