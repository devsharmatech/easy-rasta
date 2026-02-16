import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendNotification } from '@/lib/firebase'

export async function awardXP(riderId, actionKey, referenceId, overrideValue = null) {
    try {
        const { data: rule } = await supabaseAdmin.from('xp_rules').select('*').eq('action_key', actionKey).single()

        // If rule doesn't exist or not active, and no override provided, exit
        if ((!rule || !rule.is_active) && !overrideValue) return

        const xpValue = overrideValue || rule.xp_value

        // Check daily limit if applicable
        if (rule && rule.max_per_day) {
            const today = new Date().toISOString().split('T')[0]
            const { count } = await supabaseAdmin
                .from('xp_transactions')
                .select('*', { count: 'exact' })
                .eq('rider_id', riderId)
                .eq('action_key', actionKey)
                .gte('created_at', today)

            if (count >= rule.max_per_day) return
        }

        // Log Transaction
        await supabaseAdmin.from('xp_transactions').insert({
            rider_id: riderId,
            action_key: actionKey,
            xp_earned: xpValue,
            reference_id: referenceId
        })

        // Update Rider Profile XP
        const { data: profile } = await supabaseAdmin.from('rider_profiles').select('xp').eq('id', riderId).single()
        const newXP = (profile?.xp || 0) + xpValue
        await supabaseAdmin.from('rider_profiles').update({ xp: newXP }).eq('id', riderId)

        // Check level before update
        const { data: previousProfile } = await supabaseAdmin.from('rider_profiles').select('level, user_id').eq('id', riderId).single()

        // Trigger Level Update
        await supabaseAdmin.rpc('update_rider_level', { target_rider_id: riderId })

        // Check level after update
        const { data: updatedProfile } = await supabaseAdmin.from('rider_profiles').select('level').eq('id', riderId).single()

        if (previousProfile && updatedProfile && updatedProfile.level > previousProfile.level) {
            await sendNotification(
                previousProfile.user_id,
                'Level Up!',
                `Congratulations! You've reached Level ${updatedProfile.level}.`
            )
        }

    } catch (e) {
        console.error('XP Award Failed', e)
    }
}
