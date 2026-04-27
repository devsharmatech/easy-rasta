import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { sendPushNotification } from '@/lib/notificationHelper'

export const dynamic = 'force-dynamic'
export const revalidate = 0


// GET — Fetch a list of active users (riders/vendors) for testing
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q') // Optional search query

        let query = supabaseAdmin
            .from('users')
            .select('id, full_name, mobile, role, device_token')
            .order('created_at', { ascending: false })
            .limit(50)

        if (q) {
            query = query.or(`full_name.ilike.%${q}%,mobile.ilike.%${q}%`)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json(data)
    } catch (err) {
        console.error('[Admin Push] GET Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST — Update a user's token (for testing) OR Send a test push notification
export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { action, targetUserId, title, message, category, token } = body

        if (action === 'update_token') {
            if (!targetUserId || !token) {
                return NextResponse.json({ error: 'User ID and Token required' }, { status: 400 })
            }

            const { error } = await supabaseAdmin
                .from('users')
                .update({ device_token: token })
                .eq('id', targetUserId)

            if (error) throw error

            return NextResponse.json({ success: true, message: 'Device token forcefully updated for testing.' })
        }

        if (action === 'send_push') {
            if (!targetUserId || !title || !message) {
                return NextResponse.json({ error: 'User ID, Title, and Message required' }, { status: 400 })
            }

            // Using the actual helper so it saves to the DB and fires the push
            const pushSuccess = await sendPushNotification(
                targetUserId,
                title,
                message,
                category || 'system',
                { is_test: 'true' }
            )

            if (pushSuccess) {
                return NextResponse.json({ success: true, message: 'Push notification sent via FCM & saved to DB.' })
            } else {
                return NextResponse.json({ 
                    success: false, 
                    message: 'Failed to send push (Token may be invalid or missing). Saved to DB Notification Center only.' 
                }, { status: 400 })
            }
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (err) {
        console.error('[Admin Push] POST Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
