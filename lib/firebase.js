import admin from 'firebase-admin'

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace escaped newlines for private key
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        })
    } catch (error) {
        console.error('Firebase admin initialization error', error.stack)
    }
}

export const adminAuth = admin.auth()
export const adminMessaging = admin.messaging()

export async function sendNotification(userId, title, body, data = {}) {
    try {
        const { supabaseAdmin } = require('@/lib/supabaseClient') // Import locally to avoid circular dep if needed
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('device_token')
            .eq('id', userId)
            .single()

        if (user?.device_token) {
            await adminMessaging.send({
                token: user.device_token,
                notification: {
                    title,
                    body,
                },
                data // Additional data payload
            })
            console.log(`Notification sent to ${userId}`)
        }
    } catch (error) {
        console.error('Notification error', error)
    }
}
