import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { adminDatabase } from '@/lib/firebase'
import crypto from 'crypto'

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { shared_with, duration_minutes, latitude, longitude } = body

        if (!duration_minutes) {
            return errorResponse('Missing required fields: duration_minutes', 400)
        }
        
        const finalSharedWith = shared_with || 'public_link'

        // Generate a secure unique token
        const share_token = crypto.randomBytes(16).toString('hex')
        
        // Calculate expiration
        const expires_at = new Date()
        expires_at.setMinutes(expires_at.getMinutes() + parseInt(duration_minutes, 10))

        // Save session in Postgres (Supabase)
        const { error: dbError } = await supabaseAdmin
            .from('live_location_shares')
            .insert({
                user_id: user.user_id,
                shared_with: finalSharedWith,
                share_token,
                expires_at: expires_at.toISOString(),
                status: 'active'
            })

        if (dbError) throw dbError

        // Initialize node in Firebase Realtime Database with a timeout
        const ref = adminDatabase.ref(`locations/${share_token}`)
        
        try {
            await Promise.race([
                ref.set({
                    status: 'active',
                    expires_at: expires_at.toISOString(),
                    rider_id: user.user_id,
                    shared_with: finalSharedWith,
                    latitude: latitude !== undefined ? parseFloat(latitude) : null,
                    longitude: longitude !== undefined ? parseFloat(longitude) : null,
                    profile_picture: user.profile_picture || null,
                    updated_at: new Date().toISOString()
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase DB timeout')), 10000))
            ]);
        } catch (firebaseErr) {
            console.error('Firebase realtime DB failed:', firebaseErr);
            // Even if Firebase fails, we still created the Postgres row... 
            // We can decide to either rollback Postgres or just return an error. Let's return error so they know it failed tracking.
            return errorResponse('Failed to connect to Live Tracking Server', 500)
        }

        const protocol = request.headers.get('x-forwarded-proto') || 'https'
        const host = request.headers.get('host')
        const tracking_url = `${protocol}://${host}/track/${share_token}`

        return successResponse('Location sharing started', {
            share_token,
            tracking_url,
            expires_at
        })
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
