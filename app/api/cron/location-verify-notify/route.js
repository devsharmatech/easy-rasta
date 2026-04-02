/**
 * Location Verify Notification Cron (STEP 3)
 * 
 * Runs periodically to notify users of locations that need verification.
 * 
 * Rules:
 * - Condition: now - last_verified_at >= 24h
 * - Push notification to riders within 2km: "Not verified in 24h — earn ₹5"
 * - DO NOT use notification_sent flag (repeats forever based on time)
 * - Skips original scout
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { calculateDistance } from '@/lib/geoUtils'

const NOTIFY_RADIUS_KM = 2
const COOLDOWN_HOURS = 24

export async function GET(request) {
    try {
        const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()

        // Find active locations where last_verified_at >= 24h ago
        const { data: staleLocations, error: locError } = await supabaseAdmin
            .from('vendor_businesses')
            .select('id, business_name, category, latitude, longitude, submitted_by_user_id, last_verified_at')
            .eq('is_active', true)
            .is('deleted_at', null)
            .not('last_verified_at', 'is', null)
            .lte('last_verified_at', cutoff)
            .order('last_verified_at', { ascending: true })
            .limit(50)

        if (locError) throw locError
        if (!staleLocations || staleLocations.length === 0) {
            return successResponse('No stale locations found', { notified: 0 })
        }

        // Get all riders with last known location
        const { data: riders } = await supabaseAdmin
            .from('rider_profiles')
            .select('user_id, last_latitude, last_longitude')
            .not('last_latitude', 'is', null)
            .not('last_longitude', 'is', null)

        if (!riders || riders.length === 0) {
            return successResponse('No riders with location data', { notified: 0 })
        }

        let notifiedCount = 0
        const notifiedUsers = new Set()

        for (const location of staleLocations) {
            for (const rider of riders) {
                if (notifiedUsers.has(rider.user_id)) continue

                // Skip the original scout (cannot verify own report)
                if (rider.user_id === location.submitted_by_user_id) continue

                // Check distance within 2km
                const distanceMeters = calculateDistance(
                    rider.last_latitude, rider.last_longitude,
                    location.latitude, location.longitude
                )

                if (distanceMeters <= NOTIFY_RADIUS_KM * 1000) {
                    try {
                        const { sendPushNotification } = await import('@/lib/notificationHelper')
                        await sendPushNotification(
                            rider.user_id,
                            'Earn ₹5! 💰',
                            `Not verified in 24h — earn ₹5`,
                            'wallet',
                            {
                                type: 'location_verify',
                                location_id: location.id,
                                category: location.category,
                                business_name: location.business_name || '',
                                latitude: String(location.latitude),
                                longitude: String(location.longitude)
                            }
                        )
                        notifiedUsers.add(rider.user_id)
                        notifiedCount++
                    } catch (notifErr) {
                        console.error('[LocationVerifyCron] Notification error:', notifErr)
                    }
                }
            }
        }

        return successResponse('Verification notifications sent', {
            stale_locations: staleLocations.length,
            notified: notifiedCount
        })

    } catch (err) {
        console.error('[LocationVerifyCron] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
