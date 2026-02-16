import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function PUT(request, { params }) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        const { id } = await params

        // Get vendor_id
        const { data: vendorProfile } = await supabaseAdmin
            .from('vendor_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!vendorProfile) {
            return errorResponse('Vendor profile not found', 404)
        }

        // Verify ownership
        const { data: existingBusiness } = await supabaseAdmin
            .from('vendor_businesses')
            .select('*')
            .eq('id', id)
            .eq('vendor_id', vendorProfile.id)
            .single()

        if (!existingBusiness) {
            return errorResponse('Business not found or not owned by you', 404)
        }

        const formData = await request.formData()

        // Text fields
        const business_name = formData.get('business_name')
        const category = formData.get('category')
        const latitude = formData.get('latitude')
        const longitude = formData.get('longitude')
        const landmark = formData.get('landmark')
        const restroom_available = formData.get('restroom_available')
        const restroom_type = formData.get('restroom_type')
        const open_time = formData.get('open_time')
        const close_time = formData.get('close_time')
        const is_active = formData.get('is_active')

        // File fields
        const logo = formData.get('logo')
        const featured_image = formData.get('featured_image')

        // JSON string fields (optional)
        const servicesRaw = formData.get('services')
        const offerRaw = formData.get('offer')

        // Helper: upload file to Supabase Storage
        const uploadFile = async (file, fieldName) => {
            if (!file || typeof file === 'string' || file.size === 0) return null

            const ext = file.name.split('.').pop()
            const fileName = `business-media/${vendorProfile.id}/${fieldName}_${Date.now()}.${ext}`

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

        // Upload new images (null if no new file)
        const newLogoUrl = await uploadFile(logo, 'logo')
        const newFeaturedUrl = await uploadFile(featured_image, 'featured')

        // Build update object — only include fields that were sent
        const updateFields = {}
        if (business_name) updateFields.business_name = business_name
        if (category) updateFields.category = category
        if (latitude) updateFields.latitude = parseFloat(latitude)
        if (longitude) updateFields.longitude = parseFloat(longitude)
        if (landmark !== null) updateFields.landmark = landmark
        if (restroom_available !== null) updateFields.restroom_available = restroom_available === 'true'
        if (restroom_type) updateFields.restroom_type = restroom_type
        if (open_time) updateFields.open_time = open_time
        if (close_time) updateFields.close_time = close_time
        if (is_active !== null && is_active !== undefined) updateFields.is_active = is_active === 'true'
        if (newLogoUrl) updateFields.logo_url = newLogoUrl
        if (newFeaturedUrl) updateFields.featured_image_url = newFeaturedUrl

        // Update business fields (if any)
        if (Object.keys(updateFields).length > 0) {
            const { error: updateError } = await supabaseAdmin
                .from('vendor_businesses')
                .update(updateFields)
                .eq('id', id)

            if (updateError) throw updateError
        }

        // Update Services (if provided — replaces all existing services)
        if (servicesRaw) {
            try {
                const services = JSON.parse(servicesRaw)
                if (Array.isArray(services)) {
                    // Delete old services
                    await supabaseAdmin
                        .from('vendor_services')
                        .delete()
                        .eq('business_id', id)

                    // Insert new services
                    if (services.length > 0) {
                        const serviceRows = services.map(s => ({
                            business_id: id,
                            name: s.name,
                            price: s.price,
                            discounted_price: s.discounted_price || null,
                            quantity_label: s.quantity_label || null,
                            is_active: s.is_active !== undefined ? s.is_active : true
                        }))

                        const { error: svcError } = await supabaseAdmin
                            .from('vendor_services')
                            .insert(serviceRows)

                        if (svcError) throw svcError
                    }
                }
            } catch (e) { if (e.message !== 'Unexpected token') throw e }
        }

        // Update Offer — delete all old offers, save the new one (only 1 per business)
        if (offerRaw) {
            try {
                const offer = JSON.parse(offerRaw)

                // Delete ALL existing offers for this business
                await supabaseAdmin
                    .from('business_offers')
                    .delete()
                    .eq('business_id', id)

                // Insert the new offer (if discount data provided)
                if (offer.percentage_discount || offer.discount_amount) {
                    const { error: offerError } = await supabaseAdmin
                        .from('business_offers')
                        .insert({
                            business_id: id,
                            percentage_discount: offer.percentage_discount || null,
                            discount_amount: offer.discount_amount || null,
                            duration: offer.duration || null,
                            is_active: true
                        })

                    if (offerError) throw offerError
                }
            } catch (e) { if (e.message !== 'Unexpected token') throw e }
        }

        // Fetch updated business with services and offers
        const { data: finalData, error: fetchError } = await supabaseAdmin
            .from('vendor_businesses')
            .select('*, vendor_services(*), business_offers(*)')
            .eq('id', id)
            .single()

        if (fetchError) throw fetchError

        return successResponse('Business updated successfully', {
            ...finalData,
            services: finalData.vendor_services || [],
            offers: finalData.business_offers || [],
            vendor_services: undefined,
            business_offers: undefined
        })
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// Soft Delete — moves business to trash
export async function DELETE(request, { params }) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        const { id } = await params

        const { data: vendorProfile } = await supabaseAdmin
            .from('vendor_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!vendorProfile) {
            return errorResponse('Vendor profile not found', 404)
        }

        // Verify ownership
        const { data: business } = await supabaseAdmin
            .from('vendor_businesses')
            .select('id')
            .eq('id', id)
            .eq('vendor_id', vendorProfile.id)
            .is('deleted_at', null)
            .single()

        if (!business) {
            return errorResponse('Business not found or not owned by you', 404)
        }

        // Soft delete — set deleted_at timestamp
        const { error } = await supabaseAdmin
            .from('vendor_businesses')
            .update({ deleted_at: new Date().toISOString(), is_active: false })
            .eq('id', id)

        if (error) throw error

        return successResponse('Business moved to trash')
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// Restore — bring business back from trash
export async function PATCH(request, { params }) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        const { id } = await params

        const { data: vendorProfile } = await supabaseAdmin
            .from('vendor_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!vendorProfile) {
            return errorResponse('Vendor profile not found', 404)
        }

        // Verify ownership and that it IS trashed
        const { data: business } = await supabaseAdmin
            .from('vendor_businesses')
            .select('id')
            .eq('id', id)
            .eq('vendor_id', vendorProfile.id)
            .not('deleted_at', 'is', null)
            .single()

        if (!business) {
            return errorResponse('Trashed business not found or not owned by you', 404)
        }

        // Restore — clear deleted_at, reactivate
        const { data, error } = await supabaseAdmin
            .from('vendor_businesses')
            .update({ deleted_at: null, is_active: true })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return successResponse('Business restored successfully', data)
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
