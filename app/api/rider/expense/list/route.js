import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const page = parseInt(searchParams.get('page')) || 1
        const limit = 10
        const offset = (page - 1) * limit

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id, wallet_balance')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        // Build query
        let query = supabaseAdmin
            .from('rider_expenses')
            .select('*', { count: 'exact' })
            .eq('rider_id', riderProfile.id)
            .order('created_at', { ascending: false })

        if (type && ['fuel', 'service', 'washroom', 'other'].includes(type)) {
            query = query.eq('type', type)
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1)

        const { data: expenses, count, error } = await query

        if (error) {
            console.error('Supabase Query Error:', error)
            return errorResponse(error.message, 500)
        }

        // Manually fetch vehicles to avoid schema crash
        const vehicleIds = expenses.map(e => e.vehicle_id).filter(Boolean)
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

        const formattedExpenses = expenses.map(exp => {
            const v = vehiclesMap[exp.vehicle_id]
            return {
                ...exp,
                vehicles: v || null
            }
        })

        return successResponse('Expenses retrieved', {
            expenses: formattedExpenses,
            wallet_balance: riderProfile.wallet_balance || 0,
            pagination: {
                total: count,
                page,
                limit,
                total_pages: Math.ceil((count || 0) / limit)
            }
        })

    } catch (err) {
        console.error('List Expenses Error:', err)
        return errorResponse(err.message || 'Internal Server Error', 500)
    }
}
