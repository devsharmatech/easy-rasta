/**
 * Cooldown Push Notification Cron
 * 
 * Runs periodically. Finds fuel_reports where last verification > 24h ago.
 * Notifies users within 2km: "Fuel not checked in 24h — earn ₹5"
 * 
 * This is a core engagement loop — must not break.
 * 
 * Auth: Requires CRON_SECRET header for security.
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { calculateDistance } from '@/lib/geoUtils'

export const dynamic = 'force-dynamic'
export const revalidate = 0


const CRON_SECRET = process.env.CRON_SECRET || 'default-cron-secret'
const NOTIFY_RADIUS_KM = 2
const COOLDOWN_HOURS = 24

export async function GET(request) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${CRON_SECRET}`) {
            return errorResponse('Unauthorized cron request', 401)
        }

        const twentyFourHoursAgo = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()

        // Find fuel bunks with reports that haven't been verified in 24h+
        // Get the most recent report per bunk
        const { data: staleReports, error: reportError } = await supabaseAdmin
            .from('fuel_reports')
            .select('id, bunk_place_id, latitude, longitude, created_at')
            .eq('status', 'pending')
            .lte('created_at', twentyFourHoursAgo)
            .is('verified_by_user_id', null)
            .order('created_at', { ascending: false })
            .limit(50) // Process in batches

        if (reportError) throw reportError
        if (!staleReports || staleReports.length === 0) {
            return successResponse('No stale reports found', { notified: 0 })
        }

        // Get all riders with their last known location
        const { data: riders } = await supabaseAdmin
            .from('rider_profiles')
            .select('user_id, last_latitude, last_longitude')
            .not('last_latitude', 'is', null)
            .not('last_longitude', 'is', null)

        if (!riders || riders.length === 0) {
            return successResponse('No riders with location data', { notified: 0 })
        }

        let notifiedCount = 0
        const notifiedUsers = new Set() // Prevent spamming same user

        for (const report of staleReports) {
            for (const rider of riders) {
                // Skip if already notified
                if (notifiedUsers.has(rider.user_id)) continue

                // Skip the scout themselves
                if (rider.user_id === report.scout_user_id) continue

                // Calculate distance
                const distanceMeters = calculateDistance(
                    rider.last_latitude, rider.last_longitude,
                    report.latitude, report.longitude
                )

                if (distanceMeters <= NOTIFY_RADIUS_KM * 1000) {
                    // Send push notification
                    try {
                        const { sendPushNotification } = await import('@/lib/notificationHelper')
                        await sendPushNotification(
                            rider.user_id,
                            'Earn ₹5! 💰',
                            'A fuel bunk near you hasn\'t been checked in 24h — verify and earn ₹5!',
                            'wallet',
                            {
                                type: 'fuel_verify',
                                report_id: report.id,
                                bunk_place_id: report.bunk_place_id || '',
                                latitude: String(report.latitude),
                                longitude: String(report.longitude)
                            }
                        )
                        notifiedUsers.add(rider.user_id)
                        notifiedCount++
                    } catch (notifErr) {
                        console.error('[CooldownCron] Notification error:', notifErr)
                    }
                }
            }
        }

        return successResponse('Cooldown notifications sent', {
            stale_reports: staleReports.length,
            notified: notifiedCount
        })

    } catch (err) {
        console.error('[CooldownCron] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
