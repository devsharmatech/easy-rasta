import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function GET(request) {
    try {
        const admin = getUserFromRequest(request)
        if (!admin || admin.role !== 'admin') return errorResponse('Unauthorized', 401)

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // fuel, service, washroom, other
        const status = searchParams.get('status') // pending, approved, rejected
        const rider_name = searchParams.get('rider_name') // search filter
        const start_date = searchParams.get('start_date')
        const end_date = searchParams.get('end_date')

        const page = parseInt(searchParams.get('page')) || 1
        const limit = parseInt(searchParams.get('limit')) || 15
        const offset = (page - 1) * limit

        // Need to join user details for Rider search
        let query = supabaseAdmin
            .from('rider_expenses')
            .select(`
                *,
                rider_profiles!inner(
                    users!inner(full_name, mobile)
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false })

        if (type) query = query.eq('type', type)
        if (status) query = query.eq('status', status)
        
        if (rider_name) {
            query = query.ilike('rider_profiles.users.full_name', `%${rider_name}%`)
        }

        if (start_date) query = query.gte('created_at', `${start_date}T00:00:00Z`)
        if (end_date) query = query.lte('created_at', `${end_date}T23:59:59Z`)

        query = query.range(offset, offset + limit - 1)

        const { data, count, error } = await query

        if (error) {
            console.error('Supabase Query Error:', error)
            return errorResponse(error.message, 500)
        }

        // Manually fetch vehicles to avoid schema crash
        const vehicleIds = data.map(e => e.vehicle_id).filter(Boolean)
        let vehiclesMap = {}
        if (vehicleIds.length > 0) {
            const { data: vData } = await supabaseAdmin
                .from('vehicles')
                .select('id, nickname, make, model')
                .in('id', vehicleIds)
            if (vData) {
                vehiclesMap = vData.reduce((acc, v) => ({...acc, [v.id]: v}), {})
            }
        }

        // Transform results to lift user details
        const formattedData = data.map(exp => {
            const riderInfo = exp.rider_profiles?.users || {}
            const v = vehiclesMap[exp.vehicle_id]
            return {
                ...exp,
                rider_name: riderInfo.full_name,
                rider_mobile: riderInfo.mobile,
                vehicle_details: v ? `${v.make || ''} ${v.model || ''} (${v.nickname || ''})`.trim() : null,
                rider_profiles: undefined // cleanup
            }
        })

        return successResponse('Expenses retrieved successfully', {
            data: formattedData,
            pagination: {
                total: count,
                page,
                limit,
                total_pages: Math.ceil((count || 0) / limit)
            }
        })

    } catch (err) {
        console.error('Admin List Expenses Error:', err)
        return errorResponse(err.message || 'Internal Server Error', 500)
    }
}
