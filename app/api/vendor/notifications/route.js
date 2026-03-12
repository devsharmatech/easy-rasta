import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

// GET — Fetch all notifications for the vendor
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') return errorResponse('Unauthorized', 401)

        // Fetch notifications ordered by newest first
        const { data: notifications, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_id', user.user_id)
            .order('created_at', { ascending: false })

        if (error) throw error

        const unread_count = notifications ? notifications.filter(n => !n.is_read).length : 0

        return successResponse('Notifications fetched successfully', {
            unread_count,
            notifications: notifications || []
        })
    } catch (err) {
        console.error('[Vendor Notifications GET] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}

// PUT — Mark notification(s) as read/unread
export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') return errorResponse('Unauthorized', 401)

        const body = await request.json()
        const { id, is_read, mark_all_read } = body

        // Handle mark all as read
        if (mark_all_read) {
            const { error } = await supabaseAdmin
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.user_id)
                .eq('is_read', false)

            if (error) throw error
            return successResponse('All notifications marked as read')
        }

        // Handle specific notification
        if (!id || typeof is_read !== 'boolean') {
            return errorResponse('Provide id and boolean is_read', 400)
        }

        // Verify ownership
        const { data: existing, error: fetchErr } = await supabaseAdmin
            .from('notifications')
            .select('user_id')
            .eq('id', id)
            .single()

        if (fetchErr || !existing || existing.user_id !== user.user_id) {
            return errorResponse('Notification not found or access denied', 404)
        }

        // Update
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return successResponse('Notification updated', data)

    } catch (err) {
        console.error('[Vendor Notifications PUT] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}

// DELETE — Delete single notification or clear all
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'vendor') return errorResponse('Unauthorized', 401)

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const clear_all = searchParams.get('clear_all') === 'true'

        // Handle clear all
        if (clear_all) {
            const { error } = await supabaseAdmin
                .from('notifications')
                .delete()
                .eq('user_id', user.user_id)

            if (error) throw error
            return successResponse('All notifications cleared successfully')
        }

        // Handle delete specific
        if (!id) return errorResponse('Provide id parameter or clear_all=true', 400)

        // Verify ownership and delete
        const { data: existing } = await supabaseAdmin
            .from('notifications')
            .select('user_id')
            .eq('id', id)
            .single()

        if (!existing || existing.user_id !== user.user_id) {
            return errorResponse('Notification not found or access denied', 404)
        }

        const { error } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('id', id)

        if (error) throw error
        return successResponse('Notification deleted')

    } catch (err) {
        console.error('[Vendor Notifications DELETE] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
