import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { adminDatabase } from '@/lib/firebase'

export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { share_token, latitude, longitude } = body

        if (!share_token || latitude === undefined || longitude === undefined) {
             return errorResponse('Missing required fields: share_token, latitude, longitude', 400)
        }

        // Initialize node reference in Firebase Realtime Database
        const ref = adminDatabase.ref(`locations/${share_token}`)
        
        try {
            await Promise.race([
                ref.update({
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    updated_at: new Date().toISOString()
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase DB timeout')), 10000))
            ]);
        } catch (firebaseErr) {
            console.error('Firebase realtime DB failed during location update:', firebaseErr);
            return errorResponse('Failed to update live location on server', 500)
        }

        return successResponse('Live location updated successfully')
    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
