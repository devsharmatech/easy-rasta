import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { sendPushNotification } from '@/lib/notificationHelper'

export const dynamic = 'force-dynamic'
export const revalidate = 0


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

        // Handle multipart/form-data
        const formData = await request.formData().catch(() => null)
        let event_id, participant_id, message_type, content, image_file;
        
        if (formData) {
            event_id = formData.get('event_id')
            participant_id = formData.get('participant_id')
            message_type = formData.get('message_type') || 'text'
            content = formData.get('content')
            image_file = formData.get('image')
        } else {
            // fallback to json just in case
            const body = await request.json()
            event_id = body.event_id
            participant_id = body.participant_id
            message_type = body.message_type || 'text'
            content = body.content
        }

        if (!event_id) return errorResponse('event_id is required', 400)

        const { data: event } = await supabaseAdmin
            .from('events')
            .select('rider_id')
            .eq('id', event_id)
            .single()

        if (!event) return errorResponse('Event not found', 404)

        const isOrganizer = event.rider_id === riderProfile.id
        
        let targetParticipantId = isOrganizer ? participant_id : riderProfile.id

        if (!targetParticipantId) {
            return errorResponse('participant_id is required', 400)
        }

        // Validate participation
        // (If participant, they must have joined. If organizer, the target must have joined.)
        const { data: participation } = await supabaseAdmin
            .from('event_participants')
            .select('id')
            .eq('event_id', event_id)
            .eq('rider_id', targetParticipantId)
            .single()

        if (!participation) {
            return errorResponse('Invalid participant for this event', 403)
        }

        let sentContent = content;

        // Handle image upload
        if (message_type === 'image' && image_file) {
            const imageUrl = await uploadFile(image_file, 'chat_images', user.user_id)
            if (imageUrl) {
                sentContent = imageUrl
            } else {
                return errorResponse('Failed to upload image', 400)
            }
        } else if (message_type === 'text' && !content) {
            return errorResponse('Message content is required', 400)
        }

        const { data: message, error } = await supabaseAdmin
            .from('event_messages')
            .insert({
                event_id,
                organizer_id: event.rider_id,
                participant_id: targetParticipantId,
                sender_id: riderProfile.id,
                message_type,
                content: sentContent,
                is_read: false
            })
            .select()
            .single()

        if (error) throw error

        try {
            // Identify receiver
            const receiverRiderId = isOrganizer ? targetParticipantId : event.rider_id;
            
            const { data: receiverProfile } = await supabaseAdmin
                .from('rider_profiles')
                .select('user_id')
                .eq('id', receiverRiderId)
                .single()

            if (receiverProfile?.user_id) {
                // Get sender name for better notification
                const { data: senderInfo } = await supabaseAdmin
                    .from('users')
                    .select('full_name')
                    .eq('id', user.user_id)
                    .single()
                
                const senderName = senderInfo?.full_name || 'Someone';
                const pushTitle = `New message from ${senderName}`;
                const pushBody = message_type === 'image' ? '📸 Sent an image' : (typeof content === 'string' ? content.substring(0, 100) : 'New message');
                
                await sendPushNotification(
                    receiverProfile.user_id,
                    pushTitle,
                    pushBody,
                    'chat',
                    { event_id, participant_id: targetParticipantId }
                )
            }
        } catch (pushErr) {
            console.error("PUSH ERROR:", pushErr)
        }

        return successResponse('Message sent successfully', message)

    } catch (err) {
        console.error("SEND MESSAGE ERROR:", err)
        return errorResponse('Internal Server Error', 500)
    }
}
