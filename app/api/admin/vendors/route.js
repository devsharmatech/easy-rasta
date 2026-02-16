import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { sendNotification } from '@/lib/firebase'

// Helper: safe query
async function safeQuery(fn) {
    try { return await fn() }
    catch (e) { console.error('Query error:', e.message); return { data: null, error: e } }
}

// Helper: Add vendor log
async function addVendorLog(vendorId, action, oldValue, newValue, message, performedBy) {
    await safeQuery(() =>
        supabaseAdmin.from('vendor_logs').insert({
            vendor_id: vendorId,
            action,
            old_value: oldValue,
            new_value: newValue,
            message,
            performed_by: performedBy
        })
    )
}

// GET — List all vendors or single vendor detail
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const vendorId = searchParams.get('id')

        // Single vendor with full details
        if (vendorId) {
            const { data: vendor, error } = await supabaseAdmin
                .from('vendor_profiles')
                .select(`
                    *,
                    users:user_id(id, full_name, mobile, email, profile_image_url, is_active, created_at)
                `)
                .eq('id', vendorId)
                .single()

            if (error || !vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })

            // Fetch businesses
            const { data: businesses } = await safeQuery(() =>
                supabaseAdmin
                    .from('vendor_businesses')
                    .select('id, business_name, category, latitude, longitude, landmark, logo_url, featured_image_url, restroom_available, open_time, close_time, is_active, deleted_at, created_at')
                    .eq('vendor_id', vendorId)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false })
            )

            // Fetch services count per business
            let businessesWithDetails = businesses || []
            for (let biz of businessesWithDetails) {
                const { data: services } = await safeQuery(() =>
                    supabaseAdmin
                        .from('vendor_services')
                        .select('id, name, price, is_active')
                        .eq('business_id', biz.id)
                )
                biz.services = services || []
                biz.services_count = biz.services.length
            }

            // Fetch logs
            const { data: logs } = await safeQuery(() =>
                supabaseAdmin
                    .from('vendor_logs')
                    .select('id, action, old_value, new_value, message, created_at, users:performed_by(full_name)')
                    .eq('vendor_id', vendorId)
                    .order('created_at', { ascending: false })
                    .limit(50)
            )

            return NextResponse.json({
                ...vendor,
                businesses: businessesWithDetails,
                logs: logs || []
            })
        }

        // All vendors with summary
        const { data, error } = await supabaseAdmin
            .from('vendor_profiles')
            .select(`
                id, user_id, gst_number, verification_status, average_rating, total_views, created_at,
                users:user_id(full_name, mobile, email, profile_image_url, is_active)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Get business count per vendor
        const vendorIds = (data || []).map(v => v.id)
        let businessCounts = {}
        if (vendorIds.length > 0) {
            const { data: bizcounts } = await safeQuery(() =>
                supabaseAdmin
                    .from('vendor_businesses')
                    .select('vendor_id')
                    .in('vendor_id', vendorIds)
                    .is('deleted_at', null)
            )
            if (bizcounts) {
                bizcounts.forEach(b => {
                    businessCounts[b.vendor_id] = (businessCounts[b.vendor_id] || 0) + 1
                })
            }
        }

        const result = (data || []).map(v => ({
            ...v,
            business_count: businessCounts[v.id] || 0
        }))

        return NextResponse.json(result)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PUT — Approve/Reject vendor verification
export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, verification_status } = body

        if (!['pending', 'approved', 'rejected'].includes(verification_status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        // Get current status
        const { data: current } = await supabaseAdmin
            .from('vendor_profiles')
            .select('verification_status, user_id')
            .eq('id', id)
            .single()

        const { data, error } = await supabaseAdmin
            .from('vendor_profiles')
            .update({ verification_status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()

        if (error) throw error

        const updatedVendor = data[0]

        // Log the action
        await addVendorLog(id, 'verification_change',
            current?.verification_status || 'unknown', verification_status,
            `Verification status changed to ${verification_status}`, user.user_id)

        // Notify Vendor
        if (updatedVendor) {
            if (verification_status === 'approved') {
                await sendNotification(
                    updatedVendor.user_id,
                    'Vendor Application Approved',
                    'Congratulations! Your vendor profile has been approved. You can now list businesses.'
                )
            } else if (verification_status === 'rejected') {
                await sendNotification(
                    updatedVendor.user_id,
                    'Vendor Application Rejected',
                    'Your vendor profile was rejected. Please contact support for details.'
                )
            }
        }

        return NextResponse.json({ message: `Vendor ${verification_status}` })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PATCH — Suspend/Unsuspend vendor account
export async function PATCH(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, suspended } = await request.json()
        if (!id || typeof suspended !== 'boolean') {
            return NextResponse.json({ error: 'id and suspended (boolean) required' }, { status: 400 })
        }

        // Get vendor's user_id
        const { data: vendor } = await supabaseAdmin
            .from('vendor_profiles')
            .select('user_id')
            .eq('id', id)
            .single()

        if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })

        // Update user active status
        await supabaseAdmin
            .from('users')
            .update({ is_active: !suspended, updated_at: new Date().toISOString() })
            .eq('id', vendor.user_id)

        // Log
        await addVendorLog(id, 'account_status',
            suspended ? 'active' : 'suspended', suspended ? 'suspended' : 'active',
            `Account ${suspended ? 'suspended' : 'reactivated'}`, user.user_id)

        // Notify
        await sendNotification(
            vendor.user_id,
            suspended ? 'Account Suspended' : 'Account Reactivated',
            suspended
                ? 'Your vendor account has been suspended. Contact support for assistance.'
                : 'Your vendor account has been reactivated. Welcome back!'
        )

        return NextResponse.json({ message: `Vendor ${suspended ? 'suspended' : 'reactivated'}` })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE — Delete single or multiple vendors
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const ids = searchParams.get('ids')

        if (ids) {
            const idList = ids.split(',').map(i => i.trim()).filter(Boolean)
            // Get user_ids for deletion
            const { data: vendors } = await supabaseAdmin
                .from('vendor_profiles')
                .select('user_id')
                .in('id', idList)

            if (vendors) {
                const userIds = vendors.map(v => v.user_id)
                await supabaseAdmin.from('users').delete().in('id', userIds)
            }
            return NextResponse.json({ message: `${idList.length} vendors deleted` })
        }

        if (id) {
            const { data: vendor } = await supabaseAdmin
                .from('vendor_profiles')
                .select('user_id')
                .eq('id', id)
                .single()

            if (vendor) {
                await supabaseAdmin.from('users').delete().eq('id', vendor.user_id)
            }
            return NextResponse.json({ message: 'Vendor deleted' })
        }

        return NextResponse.json({ error: 'Vendor ID(s) required' }, { status: 400 })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
