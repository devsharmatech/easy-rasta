import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const role = searchParams.get('role') // 'organizer' or 'participant'

        if (!role || (role !== 'organizer' && role !== 'participant')) {
            return errorResponse('Invalid role specified. Must be organizer or participant.', 400)
        }

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        if (role === 'organizer') {
            const queryEventId = searchParams.get('event_id')
            
            if (!queryEventId) {
                // Return a list of EVENTS organized by the user
                const { data: events, error: eventsErr } = await supabaseAdmin
                    .from('events')
                    .select('id, title, date, time, featured_image, status')
                    .eq('rider_id', riderProfile.id)
                
                if (eventsErr) throw eventsErr;

                if (!events || events.length === 0) {
                    return successResponse('Chat events list fetched successfully', [])
                }

                const eventIds = events.map(e => e.id)

                // Get all messages for these events to calculate unread counts and latest message
                const { data: messages, error: mErr } = await supabaseAdmin
                    .from('event_messages')
                    .select('*')
                    .in('event_id', eventIds)
                    .eq('organizer_id', riderProfile.id)
                    .order('created_at', { ascending: false })

                if (mErr) throw mErr;

                const eventList = []

                for (const event of events) {
                    const eventMessages = messages?.filter(m => m.event_id === event.id) || []
                    
                    const lastMessage = eventMessages.length > 0 ? eventMessages[0] : null
                    const unreadCount = eventMessages.filter(m => !m.is_read && m.sender_id !== riderProfile.id).length

                    eventList.push({
                        event: {
                            id: event.id,
                            title: event.title,
                            date: event.date,
                            time: event.time,
                            image: event.featured_image
                        },
                        last_message: lastMessage ? {
                            content: lastMessage.message_type === 'image' ? '📸 Image' : lastMessage.content,
                            created_at: lastMessage.created_at,
                            is_read: lastMessage.is_read,
                            is_mine: lastMessage.sender_id === riderProfile.id
                        } : null,
                        unread_count: unreadCount
                    })
                }

                eventList.sort((a, b) => {
                    const aTime = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
                    const bTime = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
                    return bTime - aTime;
                });

                return successResponse('Organizer events chat list fetched successfully', eventList)

            } else {
                // Return a list of PARTICIPANTS for a specific event
                const { data: participants, error: pErr } = await supabaseAdmin
                    .from('event_participants')
                    .select(`
                        event_id,
                        rider_id,
                        joined_at,
                        rider_profiles!event_participants_rider_id_fkey(
                            user_id,
                            users!rider_profiles_user_id_fkey(
                                full_name,
                                profile_image_url
                            )
                        )
                    `)
                    .eq('event_id', queryEventId)

                if (pErr) throw pErr;

                if (!participants || participants.length === 0) {
                    return successResponse('Participants chat list fetched successfully', [])
                }
                
                // Get messages for this specific event
                const { data: messages, error: mErr } = await supabaseAdmin
                    .from('event_messages')
                    .select('*')
                    .eq('event_id', queryEventId)
                    .eq('organizer_id', riderProfile.id)
                    .order('created_at', { ascending: false })

                if (mErr) throw mErr;

                const participantList = []

                for (const p of participants) {
                    const participantMessages = messages?.filter(m => m.participant_id === p.rider_id) || []
                    
                    const lastMessage = participantMessages.length > 0 ? participantMessages[0] : null
                    const unreadCount = participantMessages.filter(m => !m.is_read && m.sender_id === p.rider_id).length

                    participantList.push({
                        participant: {
                            id: p.rider_id,
                            name: p.rider_profiles?.users?.full_name || 'Unknown Rider',
                            profile_image: p.rider_profiles?.users?.profile_image_url || null,
                            joined_at: p.joined_at
                        },
                        last_message: lastMessage ? {
                            content: lastMessage.message_type === 'image' ? '📸 Image' : lastMessage.content,
                            created_at: lastMessage.created_at,
                            is_read: lastMessage.is_read,
                            is_mine: lastMessage.sender_id === riderProfile.id
                        } : null,
                        unread_count: unreadCount
                    })
                }

                participantList.sort((a, b) => {
                    const aTime = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
                    const bTime = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
                    return bTime - aTime;
                });

                return successResponse('Organizer participants chat list fetched successfully', participantList)
            }
        } else if (role === 'participant') {
            // Get events joined by participant
            const { data: joinedEvents, error: jErr } = await supabaseAdmin
                .from('event_participants')
                .select('event_id, joined_at')
                .eq('rider_id', riderProfile.id)

            if (jErr) throw jErr;

            if (!joinedEvents || joinedEvents.length === 0) {
                return successResponse('Chat list fetched successfully', [])
            }

            const joinedEventIds = joinedEvents.map(j => j.event_id)

            // Get events info including organizer details
            const { data: events, error: evErr } = await supabaseAdmin
                .from('events')
                .select(`
                    id, 
                    title, 
                    date, 
                    time, 
                    featured_image,
                    rider_id,
                    rider_profiles!events_rider_id_fkey(
                        user_id,
                        users!rider_profiles_user_id_fkey(
                            full_name,
                            profile_image_url
                        )
                    )
                `)
                .in('id', joinedEventIds)

            if (evErr) throw evErr;

            // Get messages where participant_id = riderProfile.id
            const { data: messages, error: msErr } = await supabaseAdmin
                .from('event_messages')
                .select('*')
                .in('event_id', joinedEventIds)
                .eq('participant_id', riderProfile.id)
                .order('created_at', { ascending: false })
            
            if (msErr) throw msErr;

            const chatList = []

            for (const event of events || []) {
                const eventMessages = messages?.filter(m => m.event_id === event.id) || []
                const lastMessage = eventMessages.length > 0 ? eventMessages[0] : null
                const unreadCount = eventMessages.filter(m => !m.is_read && m.sender_id === event.rider_id).length

                chatList.push({
                    event: {
                        id: event.id,
                        title: event.title,
                        date: event.date,
                        time: event.time,
                        image: event.featured_image
                    },
                    organizer: {
                        id: event.rider_id,
                        name: event.rider_profiles?.users?.full_name || 'Unknown Organizer',
                        profile_image: event.rider_profiles?.users?.profile_image_url || null
                    },
                    last_message: lastMessage ? {
                        content: lastMessage.message_type === 'image' ? '📸 Image' : lastMessage.content,
                        created_at: lastMessage.created_at,
                        is_read: lastMessage.is_read,
                        is_mine: lastMessage.sender_id === riderProfile.id
                    } : null,
                    unread_count: unreadCount
                })
            }

            chatList.sort((a, b) => {
                const aTime = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
                const bTime = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
                return bTime - aTime;
            });

            return successResponse('Participant chat list fetched successfully', chatList)
        }
        
    } catch (err) {
        console.error("GET CHAT LIST ERROR:", err)
        return errorResponse('Internal Server Error', 500)
    }
}
