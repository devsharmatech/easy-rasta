import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { awardXP } from '@/lib/xp'

export const dynamic = 'force-dynamic'
export const revalidate = 0


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

// POST — Create Event (FormData with file uploads)
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

        const title = formData.get('title')
        const description = formData.get('description')
        const date = formData.get('date')
        const time = formData.get('time')
        const meeting_lat = formData.get('meeting_lat')
        const meeting_long = formData.get('meeting_long')
        const end_lat = formData.get('end_lat')
        const end_long = formData.get('end_long')
        const ride_type = formData.get('ride_type')
        const difficulty = formData.get('difficulty')
        const total_distance = formData.get('total_distance')
        const event_type = formData.get('event_type')
        const fee = formData.get('fee')
        const route_image_file = formData.get('route_image')
        const featured_image_file = formData.get('featured_image')
        const stopsStr = formData.get('stops')

        if (!title || !date) return errorResponse('Title and date are required', 400)
        
        if (fee && fee !== 'null' && fee !== 'undefined' && fee.trim() !== '') {
            const parsedFee = parseFloat(fee)
            if (isNaN(parsedFee) || parsedFee < 0) {
                return errorResponse('Event fee cannot be negative. Please enter a valid amount.', 400)
            }
        }

        // Upload images
        const route_image = await uploadFile(route_image_file, 'events/route', user.user_id)
        const featured_image = await uploadFile(featured_image_file, 'events/featured', user.user_id)

        const { data, error } = await supabaseAdmin
            .from('events')
            .insert({
                rider_id: riderProfile.id,
                title,
                description,
                date,
                time,
                meeting_lat: meeting_lat ? parseFloat(meeting_lat) : null,
                meeting_long: meeting_long ? parseFloat(meeting_long) : null,
                end_lat: end_lat ? parseFloat(end_lat) : null,
                end_long: end_long ? parseFloat(end_long) : null,
                ride_type,
                difficulty,
                route_image,
                featured_image,
                total_distance: total_distance ? parseFloat(total_distance) : null,
                event_type: event_type || 'free',
                fee: fee ? parseFloat(fee) : 0,
                status: 'published'
            })
            .select()
            .single()

        if (error) throw error

        // Handle Stops
        if (stopsStr) {
            try {
                const stopsArr = JSON.parse(stopsStr)
                if (Array.isArray(stopsArr) && stopsArr.length > 0) {
                    const stopsToInsert = stopsArr.map(s => ({
                        event_id: data.id,
                        stop_name: s.stop_name || s.location_name || s.name || 'Stop',
                        latitude: s.lat ? parseFloat(s.lat) : (s.latitude ? parseFloat(s.latitude) : null),
                        longitude: s.long ? parseFloat(s.long) : (s.longitude ? parseFloat(s.longitude) : null),
                        stop_time: s.stop_time || null,
                        description: s.description || null
                    }))
                    const { error: stopsError } = await supabaseAdmin.from('event_stops').insert(stopsToInsert)
                    if (stopsError) console.error('Error inserting event stops:', stopsError)
                }
            } catch (e) {
                console.error('Error parsing stops JSON:', e)
            }
        }

        // XP Logic: Create Event
        await awardXP(riderProfile.id, 'create_event', data.id)

        return successResponse('Event created successfully', data)

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// PUT — Edit Event (FormData, all fields pre-filled)
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
        const event_id = formData.get('event_id')

        if (!event_id) return errorResponse('event_id is required', 400)

        // Verify ownership
        const { data: existingEvent } = await supabaseAdmin
            .from('events')
            .select('id')
            .eq('id', event_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (!existingEvent) return errorResponse('Event not found or not owned by you', 404)

        const title = formData.get('title')
        const description = formData.get('description')
        const date = formData.get('date')
        const time = formData.get('time')
        const meeting_lat = formData.get('meeting_lat')
        const meeting_long = formData.get('meeting_long')
        const end_lat = formData.get('end_lat')
        const end_long = formData.get('end_long')
        const ride_type = formData.get('ride_type')
        const difficulty = formData.get('difficulty')
        const total_distance = formData.get('total_distance')
        const event_type = formData.get('event_type')
        const fee = formData.get('fee')
        const route_image_file = formData.get('route_image')
        const featured_image_file = formData.get('featured_image')
        const stopsStr = formData.get('stops')

        if (fee && fee !== 'null' && fee !== 'undefined' && fee.trim() !== '') {
            const parsedFee = parseFloat(fee)
            if (isNaN(parsedFee) || parsedFee < 0) {
                return errorResponse('Event fee cannot be negative. Please enter a valid amount.', 400)
            }
        }

        // Upload new images (only if new files provided)
        const route_image = await uploadFile(route_image_file, 'events/route', user.user_id)
        const featured_image = await uploadFile(featured_image_file, 'events/featured', user.user_id)

        // All text fields always sent (pre-filled with old data)
        const updateFields = {
            title,
            description,
            date,
            time,
            meeting_lat: meeting_lat ? parseFloat(meeting_lat) : null,
            meeting_long: meeting_long ? parseFloat(meeting_long) : null,
            end_lat: end_lat ? parseFloat(end_lat) : null,
            end_long: end_long ? parseFloat(end_long) : null,
            ride_type,
            difficulty,
            total_distance: total_distance ? parseFloat(total_distance) : null,
            event_type: event_type || 'free',
            fee: fee ? parseFloat(fee) : 0
        }
        // Only update images if new files uploaded
        if (route_image) updateFields.route_image = route_image
        if (featured_image) updateFields.featured_image = featured_image

        const { data, error } = await supabaseAdmin
            .from('events')
            .update(updateFields)
            .eq('id', event_id)
            .select()
            .single()

        if (error) throw error

        // Handle Stops
        if (stopsStr) {
            try {
                let stopsArr = JSON.parse(stopsStr)
                if (typeof stopsArr === 'string') stopsArr = JSON.parse(stopsArr); // Double parse just in case
                if (Array.isArray(stopsArr)) {
                    // Delete old stops
                    await supabaseAdmin.from('event_stops').delete().eq('event_id', data.id)
                    
                    if (stopsArr.length > 0) {
                        const stopsToInsert = stopsArr.map(s => ({
                            event_id: data.id,
                            stop_name: s.stop_name || s.location_name || s.name || 'Stop',
                            latitude: s.lat ? parseFloat(s.lat) : (s.latitude ? parseFloat(s.latitude) : null),
                            longitude: s.long ? parseFloat(s.long) : (s.longitude ? parseFloat(s.longitude) : null),
                            stop_time: s.stop_time || null,
                            description: s.description || null
                        }))
                        const { error: stopsError } = await supabaseAdmin.from('event_stops').insert(stopsToInsert)
                        if (stopsError) console.error('Error inserting event stops on update:', stopsError)
                    }
                }
            } catch (e) {
                console.error('Error parsing stops JSON on update:', e)
            }
        }

        return successResponse('Event updated successfully', data)

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// GET — List events
// ?my=true      → events I created (requires auth)
// ?joined=true  → events I joined (requires auth)
// default       → all published events (public)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const myEvents = searchParams.get('my')
        const joinedEvents = searchParams.get('joined')

        // My Created Events — requires authentication
        if (myEvents === 'true') {
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

            const today = new Date().toISOString().split('T')[0]

            const { data, error } = await supabaseAdmin
                .from('events')
                .select('*, event_stops(*)')
                .eq('rider_id', riderProfile.id)
                .gte('date', today)
                .order('created_at', { ascending: false })

            if (error) throw error

            return successResponse('My events fetched successfully', data)
        }

        // My Joined Events — requires authentication
        if (joinedEvents === 'true') {
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

            const today = new Date().toISOString().split('T')[0]

            // Get joined events with full details (Filter out expired events)
            const { data, error } = await supabaseAdmin
                .from('event_participants')
                .select(`
                    id,
                    vehicle_id,
                    consent_safety,
                    consent_liability,
                    payment_id,
                    joined_at,
                    vehicles(nickname, type, make, model, image_url),
                    events(
                        *,
                        event_stops(*),
                        rider_profiles(user_id, total_rides, level, users:user_id(full_name, profile_image_url))
                    )
                `)
                .eq('rider_id', riderProfile.id)
                .eq('events.status', 'published') // Ensure event is still published
                .gte('events.date', today)
                .order('joined_at', { ascending: false })

            if (error) throw error

            // Fetch payment info separately for paid events
            const paymentIds = (data || []).map(p => p.payment_id).filter(Boolean)
            let paymentsMap = {}

            if (paymentIds.length > 0) {
                const { data: payments } = await supabaseAdmin
                    .from('event_payments')
                    .select('id, amount, status, razorpay_order_id, razorpay_payment_id')
                    .in('id', paymentIds)

                if (payments) {
                    paymentsMap = payments.reduce((acc, p) => { acc[p.id] = p; return acc }, {})
                }
            }

            // Flatten for cleaner response
            const joined = (data || []).map(p => {
                const paymentInfo = p.payment_id ? paymentsMap[p.payment_id] : null
                return {
                    participation_id: p.id,
                    joined_at: p.joined_at,
                    vehicle: p.vehicles ? {
                        nickname: p.vehicles.nickname,
                        type: p.vehicles.type,
                        make: p.vehicles.make,
                        model: p.vehicles.model,
                        image: p.vehicles.image_url
                    } : null,
                    payment: paymentInfo ? {
                        amount: paymentInfo.amount,
                        status: paymentInfo.status,
                        order_id: paymentInfo.razorpay_order_id,
                        payment_id: paymentInfo.razorpay_payment_id
                    } : null,
                    event: p.events ? {
                        ...p.events,
                        is_user_already_joined: true,
                        rider_profiles: undefined,
                        organizer: {
                            name: p.events.rider_profiles?.users?.full_name || 'Unknown',
                            profile_image: p.events.rider_profiles?.users?.profile_image_url || null,
                            level: p.events.rider_profiles?.level || 1,
                            total_rides: p.events.rider_profiles?.total_rides || 0
                        }
                    } : null
                }
            })

            return successResponse('Joined events fetched successfully', joined)
        }

        // Public — All published events with organizer info
        const today = new Date().toISOString().split('T')[0]

        // Fetch events with organizer info and participants
        const { data, error } = await supabaseAdmin
            .from('events')
            .select(`
                *,
                event_stops(*),
                rider_profiles!events_rider_id_fkey(user_id, total_rides, level, xp, users!rider_profiles_user_id_fkey(full_name, profile_image_url)),
                event_participants(
                    rider_id,
                    rider_profiles!event_participants_rider_id_fkey(
                        user_id,
                        users!rider_profiles_user_id_fkey(id, full_name, profile_image_url)
                    )
                )
            `)
            .eq('status', 'published')
            .gte('date', today)
            .order('date', { ascending: true })

        if (error) throw error

        // Optionally get current user for 'is_user_already_joined' flag
        let currentUserId = null
        let currentRiderProfileId = null
        try {
            const authHeader = request.headers.get('authorization')
            if (authHeader) {
                const user = getUserFromRequest(request)
                if (user && user.role === 'rider') {
                    currentUserId = user.user_id
                    
                    const { data: riderProfile } = await supabaseAdmin
                        .from('rider_profiles')
                        .select('id')
                        .eq('user_id', currentUserId)
                        .single()
                    
                    if (riderProfile) {
                        currentRiderProfileId = riderProfile.id
                    }
                }
            }
        } catch (e) {
            // Silence auth extraction errors on public endpoint
        }

        // Flatten organizer info and map participants for cleaner response
        const events = data.map(event => {
            // Using rest pattern to exclude old references from output
            const { rider_profiles, event_participants, ...rest } = event
            
            const joiners = (event_participants || []).map(p => ({
                id: p.rider_id,
                name: p.rider_profiles?.users?.full_name || 'Unknown Rider',
                profile_image: p.rider_profiles?.users?.profile_image_url || null
            }))

            const is_user_already_joined = currentRiderProfileId 
                ? (event_participants || []).some(p => p.rider_id === currentRiderProfileId)
                : false

            return {
                ...rest,
                is_user_already_joined,
                joiners,
                organizer: {
                    name: rider_profiles?.users?.full_name || 'Unknown',
                    profile_image: rider_profiles?.users?.profile_image_url || null,
                    level: rider_profiles?.level || 1,
                    total_rides: rider_profiles?.total_rides || 0,
                    xp: rider_profiles?.xp || 0
                }
            }
        })

        return successResponse('Events fetched successfully', events)
    } catch (err) {
        console.error("GET EVENTS ERROR:", err)
        return errorResponse('Internal Server Error', 500)
    }
}

// DELETE — Delete event
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
        const event_id = searchParams.get('id')

        if (!event_id) return errorResponse('Event ID required', 400)

        // Verify ownership
        const { data: event } = await supabaseAdmin
            .from('events')
            .select('id')
            .eq('id', event_id)
            .eq('rider_id', riderProfile.id)
            .single()

        if (!event) return errorResponse('Event not found or not owned by you', 404)

        const { error } = await supabaseAdmin
            .from('events')
            .delete()
            .eq('id', event_id)

        if (error) throw error

        return successResponse('Event deleted successfully')
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}
