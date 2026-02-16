import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        // Get vendor_id
        const { data: vendorProfile } = await supabaseAdmin
            .from('vendor_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!vendorProfile) {
            return errorResponse('Vendor profile not found', 404)
        }

        const formData = await request.formData()

        // Text fields
        const business_name = formData.get('business_name')
        const category = formData.get('category')
        const latitude = formData.get('latitude')
        const longitude = formData.get('longitude')
        const landmark = formData.get('landmark')
        const restroom_available = formData.get('restroom_available') === 'true'
        const restroom_type = formData.get('restroom_type')
        const open_time = formData.get('open_time')
        const close_time = formData.get('close_time')

        // File fields
        const logo = formData.get('logo')
        const featured_image = formData.get('featured_image')

        // JSON string fields (optional)
        const servicesRaw = formData.get('services')
        const offerRaw = formData.get('offer')

        if (!business_name || !category || !latitude || !longitude) {
            return errorResponse('business_name, category, latitude, longitude are required', 400)
        }

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

        // Upload images
        const logo_url = await uploadFile(logo, 'logo')
        const featured_image_url = await uploadFile(featured_image, 'featured')

        // 1. Create Business
        const { data: businessData, error: bizError } = await supabaseAdmin
            .from('vendor_businesses')
            .insert({
                vendor_id: vendorProfile.id,
                business_name,
                category,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                landmark,
                logo_url,
                featured_image_url,
                restroom_available,
                restroom_type,
                open_time,
                close_time
            })
            .select()
            .single()

        if (bizError) throw bizError

        const business_id = businessData.id
        let insertedServices = []
        let insertedOffer = null

        // 2. Create Services (if provided as JSON string)
        if (servicesRaw) {
            try {
                const services = JSON.parse(servicesRaw)
                if (Array.isArray(services) && services.length > 0) {
                    const serviceRows = services.map(s => ({
                        business_id,
                        name: s.name,
                        price: s.price,
                        discounted_price: s.discounted_price || null,
                        quantity_label: s.quantity_label || null
                    }))

                    const { data: svcData, error: svcError } = await supabaseAdmin
                        .from('vendor_services')
                        .insert(serviceRows)
                        .select()

                    if (svcError) throw svcError
                    insertedServices = svcData
                }
            } catch (e) { /* ignore invalid JSON */ }
        }

        // 3. Create Offer (if provided as JSON string)
        if (offerRaw) {
            try {
                const offer = JSON.parse(offerRaw)
                if (offer.percentage_discount || offer.discount_amount) {
                    const { data: offerData, error: offerError } = await supabaseAdmin
                        .from('business_offers')
                        .insert({
                            business_id,
                            percentage_discount: offer.percentage_discount || null,
                            discount_amount: offer.discount_amount || null,
                            duration: offer.duration || null,
                            is_active: true
                        })
                        .select()
                        .single()

                    if (offerError) throw offerError
                    insertedOffer = offerData
                }
            } catch (e) { /* ignore invalid JSON */ }
        }

        return successResponse('Business created successfully', {
            ...businessData,
            services: insertedServices,
            offer: insertedOffer
        })
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const showTrash = searchParams.get('trash') === 'true'

        // Get vendor_id
        const { data: vendorProfile } = await supabaseAdmin
            .from('vendor_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!vendorProfile) return successResponse('No businesses found', [])

        // Get businesses with services and active offers
        let query = supabaseAdmin
            .from('vendor_businesses')
            .select('*, vendor_services(*), business_offers(*)')
            .eq('vendor_id', vendorProfile.id)

        // Filter: active businesses OR trashed businesses
        if (showTrash) {
            query = query.not('deleted_at', 'is', null)
        } else {
            query = query.is('deleted_at', null)
        }

        const { data, error } = await query

        if (error) throw error

        // Rename nested keys for cleaner response
        const result = data.map(biz => ({
            ...biz,
            services: biz.vendor_services || [],
            offers: biz.business_offers || [],
            vendor_services: undefined,
            business_offers: undefined
        }))

        return successResponse('Businesses fetched successfully', result)
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}
