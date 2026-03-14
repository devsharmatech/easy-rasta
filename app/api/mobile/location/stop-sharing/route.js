import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { adminDatabase } from '@/lib/firebase'

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { share_token } = body

        if (!share_token) {
            return errorResponse('Missing share_token', 400)
        }

        // Mark session inactive in Postgres
        const { error: dbError } = await supabaseAdmin
            .from('live_location_shares')
            .update({ status: 'inactive' })
            .eq('share_token', share_token)
            .eq('user_id', user.user_id)

        if (dbError) throw dbError

        // Also update Firebase node to inactive securely with a timeout
        const ref = adminDatabase.ref(`locations/${share_token}`)
        
        try {
            await Promise.race([
                ref.update({
                    status: 'inactive',
                    updated_at: new Date().toISOString()
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase DB timeout')), 10000))
            ]);
        } catch (firebaseErr) {
            console.error('Firebase realtime DB failed during stop:', firebaseErr);
            // Non-fatal, Postgres was updated successfully
        }

        return successResponse('Location sharing stopped successfully')
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
