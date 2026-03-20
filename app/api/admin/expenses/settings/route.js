import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdmin } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function GET(request) {
    try {
        // We use the supabaseAdmin directly, but we should secure it.
        // For Next.js App Router, using headers/cookies to extract token manually since verifyAdmin was throwing originally.
        // Actually, let's use the same auth check as the other admin routes.
        const token = request.headers.get('Authorization')?.split(' ')[1]
        
        // Simpler auth just relying on verifyJWT if possible, but let's just use supabaseAdmin directly since this is an admin API and auth might be complex in this file. 
        // Wait, I am writing this file. Let's just use the strict import from lib/auth
        const auth = await import('@/lib/auth');
        const admin = auth.getUserFromRequest(request);
        
        if (!admin || admin.role !== 'admin') {
            return errorResponse('Unauthorized', 401)
        }

        const { data: settings } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'cashback_percentages')
            .single()

        return successResponse('Settings retrieved', settings?.value || { fuel: 5, service: 5, washroom: 5, other: 5 })

    } catch (err) {
        console.error('Settings GET Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}

export async function POST(request) {
    try {
        const auth = await import('@/lib/auth');
        const admin = auth.getUserFromRequest(request);

        if (!admin || admin.role !== 'admin') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { fuel, service, washroom, other } = body

        // Validate
        if (typeof fuel !== 'number' || typeof service !== 'number' || typeof washroom !== 'number' || typeof other !== 'number') {
            return errorResponse('Invalid payload, all fields must be numbers', 400)
        }

        const newValue = { fuel, service, washroom, other }

        const { error } = await supabaseAdmin
            .from('system_settings')
            .upsert({
                key: 'cashback_percentages',
                value: newValue,
                description: 'Cashback percentage configurations for rider expenses',
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' })

        if (error) throw error

        return successResponse('Cashback percentages updated successfully!', newValue)

    } catch (err) {
        console.error('Settings POST Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
