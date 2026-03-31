/**
 * Event Check-In API — GPS check-in at an event
 * Reward: ₹5 (500 paise)
 * Must be within 200m of event location
 * 
 * Bonus milestones (total check-ins across all events):
 *   10 check-ins → ₹20 (2000 paise)
 *   25 check-ins → ₹50 (5000 paise)
 *   50 check-ins → ₹100 (10000 paise)
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'
import { checkGPS } from '@/lib/antifraud'
import { GPS_RADIUS } from '@/lib/geoUtils'

const CHECKIN_REWARD_PAISE = 500 // ₹5

const MILESTONES = [
    { count: 10, paise: 2000, actionType: 'event_bonus_10' },
    { count: 25, paise: 5000, actionType: 'event_bonus_25' },
    { count: 50, paise: 10000, actionType: 'event_bonus_50' },
]

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { event_id, latitude, longitude } = body

        if (!event_id) {
            return successResponse('event_id is required', { reward_given: false, reason: 'missing_event_id' })
        }
        if (!latitude || !longitude) {
            return successResponse('GPS location is required', { reward_given: false, reason: 'missing_gps' })
        }

        // Fetch event
        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .select('id, meeting_lat, meeting_long, status')
            .eq('id', event_id)
            .single()

        if (eventError || !event) {
            return successResponse('Event not found', { reward_given: false, reason: 'event_not_found' })
        }

        if (event.status !== 'published') {
            return successResponse('Event is not active', { reward_given: false, reason: 'event_not_active' })
        }

        // Check if already checked in
        const { data: existing } = await supabaseAdmin
            .from('event_checkins')
            .select('id')
            .eq('event_id', event_id)
            .eq('user_id', user.user_id)
            .limit(1)

        if (existing && existing.length > 0) {
            return successResponse('Already checked in to this event', { reward_given: false, reason: 'already_checked_in' })
        }

        // GPS check (within 200m)
        const gpsCheck = checkGPS(
            parseFloat(latitude), parseFloat(longitude),
            event.meeting_lat, event.meeting_long,
            GPS_RADIUS.EVENT_CHECKIN
        )
        if (!gpsCheck.valid) {
            return successResponse('You must be within 200m of the event location', {
                reward_given: false,
                reason: 'gps_out_of_range'
            })
        }

        // Create check-in
        const { data: checkin, error: checkinError } = await supabaseAdmin
            .from('event_checkins')
            .insert({
                event_id,
                user_id: user.user_id,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude)
            })
            .select('id')
            .single()

        if (checkinError) {
            // Unique constraint violation = already checked in (race condition)
            if (checkinError.code === '23505') {
                return successResponse('Already checked in', { reward_given: false, reason: 'already_checked_in' })
            }
            throw checkinError
        }

        // Process check-in reward
        const rewardResult = await processReward({
            userId: user.user_id,
            actionType: 'event_checkin',
            amountPaise: CHECKIN_REWARD_PAISE,
            referenceType: 'event_checkin',
            referenceId: checkin.id,
            metadata: { event_id }
        })

        if (rewardResult.transaction_id) {
            await supabaseAdmin
                .from('event_checkins')
                .update({ reward_tx_id: rewardResult.transaction_id })
                .eq('id', checkin.id)
        }

        // --- Check milestone bonuses ---
        const { count: totalCheckins } = await supabaseAdmin
            .from('event_checkins')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.user_id)

        let milestoneAwarded = null
        for (const milestone of MILESTONES) {
            if (totalCheckins === milestone.count) {
                // Check if this milestone was already awarded
                const { data: existingMilestone } = await supabaseAdmin
                    .from('earning_transactions')
                    .select('id')
                    .eq('user_id', user.user_id)
                    .eq('action_type', milestone.actionType)
                    .limit(1)

                if (!existingMilestone || existingMilestone.length === 0) {
                    const milestoneResult = await processReward({
                        userId: user.user_id,
                        actionType: milestone.actionType,
                        amountPaise: milestone.paise,
                        referenceType: 'event_checkin',
                        referenceId: checkin.id,
                        metadata: { milestone: milestone.count, totalCheckins }
                    })
                    milestoneAwarded = {
                        count: milestone.count,
                        paise: milestone.paise,
                        reward_given: milestoneResult.reward_given
                    }
                }
                break
            }
        }

        return successResponse('Event check-in successful', {
            checkin_id: checkin.id,
            reward_given: rewardResult.reward_given,
            reason: rewardResult.reason,
            amount_paise: rewardResult.reward_given ? CHECKIN_REWARD_PAISE : 0,
            total_checkins: totalCheckins,
            milestone: milestoneAwarded
        })

    } catch (err) {
        console.error('[EventCheckin] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
