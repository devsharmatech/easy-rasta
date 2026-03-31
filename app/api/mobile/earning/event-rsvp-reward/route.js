/**
 * Event RSVP Creator Reward API
 * Creator earns ₹2 (200 paise) per RSVP, max ₹40 (4000 paise) per event
 * 
 * Called when a user joins an event (by the event join flow).
 * Can also be called as a standalone endpoint.
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'

const RSVP_REWARD_PAISE = 200   // ₹2 per RSVP
const MAX_REWARD_PAISE = 4000    // ₹40 max per event

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { event_id } = body

        if (!event_id) {
            return successResponse('event_id is required', { reward_given: false, reason: 'missing_event_id' })
        }

        // Fetch event to get creator
        const { data: event } = await supabaseAdmin
            .from('events')
            .select('id, rider_id')
            .eq('id', event_id)
            .single()

        if (!event) {
            return successResponse('Event not found', { reward_given: false, reason: 'event_not_found' })
        }

        // Get creator's user_id from rider_profile
        const { data: creatorProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('user_id')
            .eq('id', event.rider_id)
            .single()

        if (!creatorProfile) {
            return successResponse('Event creator not found', { reward_given: false, reason: 'creator_not_found' })
        }

        // Don't reward creator for joining their own event
        if (creatorProfile.user_id === user.user_id) {
            return successResponse('Creator cannot earn RSVP reward for own event', {
                reward_given: false,
                reason: 'self_rsvp'
            })
        }

        // Check how much the creator has already earned for this event
        const { data: existingRewards } = await supabaseAdmin
            .from('earning_transactions')
            .select('amount_paise')
            .eq('user_id', creatorProfile.user_id)
            .eq('action_type', 'event_rsvp_creator')
            .eq('reference_id', event_id)
            .eq('status', 'completed')

        const totalEarned = (existingRewards || []).reduce((sum, tx) => sum + tx.amount_paise, 0)

        if (totalEarned >= MAX_REWARD_PAISE) {
            return successResponse('Creator has reached max RSVP reward for this event', {
                reward_given: false,
                reason: 'max_rsvp_reward_reached',
                total_earned_paise: totalEarned
            })
        }

        // Process reward for the creator
        const rewardResult = await processReward({
            userId: creatorProfile.user_id,
            actionType: 'event_rsvp_creator',
            amountPaise: RSVP_REWARD_PAISE,
            referenceType: 'event',
            referenceId: event_id,
            metadata: { joined_by: user.user_id }
        })

        return successResponse('RSVP reward processed for event creator', {
            creator_user_id: creatorProfile.user_id,
            reward_given: rewardResult.reward_given,
            reason: rewardResult.reason,
            amount_paise: rewardResult.reward_given ? RSVP_REWARD_PAISE : 0,
            total_earned_paise: totalEarned + (rewardResult.reward_given ? RSVP_REWARD_PAISE : 0),
            max_paise: MAX_REWARD_PAISE
        })

    } catch (err) {
        console.error('[EventRSVP] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
