import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdmin } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function GET(request) {
    try {
        const admin = await verifyAdmin(request)
        if (!admin) return errorResponse('Unauthorized', 401)

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // fuel, service, washroom, other
        const status = searchParams.get('status') // pending, approved, rejected
        const rider_name = searchParams.get('rider_name') // search filter
        const start_date = searchParams.get('start_date')
        const end_date = searchParams.get('end_date')

        const page = parseInt(searchParams.get('page')) || 1
        const limit = parseInt(searchParams.get('limit')) || 15
        const offset = (page - 1) * limit

        // Need to join user details for Rider search and vehicle info
        let query = supabaseAdmin
            .from('rider_expenses')
            .select(`
                *,
                rider_profiles!inner(
                    users!inner(full_name, mobile)
                ),
                vehicles(nickname, make, model)
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

        if (error) throw error

        // Transform results to lift user details
        const formattedData = data.map(exp => {
            const riderInfo = exp.rider_profiles?.users || {}
            return {
                ...exp,
                rider_name: riderInfo.full_name,
                rider_mobile: riderInfo.mobile,
                vehicle_details: exp.vehicles ? `${exp.vehicles.make || ''} ${exp.vehicles.model || ''} (${exp.vehicles.nickname || ''})`.trim() : null,
                rider_profiles: undefined, // cleanup
                vehicles: undefined
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
        return errorResponse('Internal Server Error', 500)
    }
}
