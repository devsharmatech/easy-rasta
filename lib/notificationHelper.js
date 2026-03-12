import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { adminMessaging } from '@/lib/firebase'

/**
 * Sends a push notification via Firebase and logs it into the database for the notification center.
 * 
 * @param {string} userId - UUID of the user to notify
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {string} category - Category (e.g., 'system', 'ride', 'wallet', 'promotion')
 * @param {object} dataPayload - Key-value strings for mobile deep-linking
 */
export async function sendPushNotification(userId, title, body, category = 'general', dataPayload = {}) {
    try {
        console.log(`[Notification] preparing to send to user: ${userId}`)

        // 1. Fetch user's device token
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('device_token')
            .eq('id', userId)
            .single()

        if (userError) {
            console.error('[Notification] Error fetching user token:', userError)
            return false
        }

        // 2. Save notification to database (Notification Center)
        const { error: dbError } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                body,
                category,
                data: dataPayload
            })

        if (dbError) {
            console.error('[Notification] Error saving to db:', dbError)
            // Continue anyway to try sending the push
        }

        // 3. Send Push via Firebase Cloud Messaging
        if (user?.device_token) {
            // FCM data payload requires string values
            const stringifiedData = {}
            for (const key in dataPayload) {
                stringifiedData[key] = String(dataPayload[key])
            }

            try {
                const fcmPayload = {
                    token: user.device_token,
                    notification: {
                        title: title,
                        body: body,
                    },
                    data: {
                        ...stringifiedData,
                        category: category
                    },
                    webpush: {
                        notification: {
                            title: title,
                            body: body,
                            icon: '/icon.png'
                        },
                        fcmOptions: {
                            link: 'https://admin.easyrasta.com/admin/push-tester'
                        }
                    }
                }
                
                console.log(`[Notification] FCM Payload prepared:`, JSON.stringify(fcmPayload))
                const fcmResponse = await adminMessaging.send(fcmPayload)
                console.log(`[Notification] ✅ FCM Success Response:`, fcmResponse)
                return true
            } catch (fcmError) {
                console.error('[Notification] ❌ FCM Error:', fcmError)
            }
        } else {
            console.log(`[Notification] ⚠️ User ${userId} has no device_token. Saved to DB only.`)
        }

        return false
    } catch (err) {
        console.error('[Notification] Overall Error:', err)
        return false
    }
}
