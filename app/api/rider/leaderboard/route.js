import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        let currentUserId = user?.user_id

        // Fetch Global Top 50 Riders
        const { data: leaderboard, error: lbError } = await supabaseAdmin
            .from('rider_profiles')
            .select(`
                id, 
                user_id,
                xp, 
                level,
                users:user_id(full_name, profile_image_url)
            `)
            .order('xp', { ascending: false })
            .limit(50)

        if (lbError) throw lbError

        // Format leaderboard with ranks
        const formattedLeaderboard = leaderboard.map((rider, index) => ({
            rank: index + 1,
            rider_id: rider.id,
            user_id: rider.user_id,
            full_name: rider.users?.full_name || 'Unknown Rider',
            profile_image_url: rider.users?.profile_image_url || null,
            xp: rider.xp || 0,
            level: rider.level || 1,
            is_current_user: currentUserId === rider.user_id
        }))

        // Get Achievements & Personal Rank if User is Logged In
        let currentUserRankData = null
        let myAchievements = []

        if (currentUserId) {
            // Find in current top 50
            const inTop50 = formattedLeaderboard.find(r => r.user_id === currentUserId)

            if (inTop50) {
                currentUserRankData = { ...inTop50 }
            } else {
                // Determine rank if not in top 50 (count how many have more XP)
                const { data: myProfile } = await supabaseAdmin
                    .from('rider_profiles')
                    .select('id, xp, level, users:user_id(full_name, profile_image_url)')
                    .eq('user_id', currentUserId)
                    .single()

                if (myProfile) {
                    const { count: higherXPCount } = await supabaseAdmin
                        .from('rider_profiles')
                        .select('id', { count: 'exact', head: true })
                        .gt('xp', myProfile.xp || 0)

                    currentUserRankData = {
                        rank: (higherXPCount || 0) + 1,
                        rider_id: myProfile.id,
                        user_id: currentUserId,
                        full_name: myProfile.users?.full_name || 'Unknown Rider',
                        profile_image_url: myProfile.users?.profile_image_url || null,
                        xp: myProfile.xp || 0,
                        level: myProfile.level || 1,
                        is_current_user: true
                    }
                }
            }

            // Fetch "Achievements" (Recent notable XP milestones & transactions summary)
            if (currentUserRankData) {
                const { data: transactions } = await supabaseAdmin
                    .from('xp_transactions')
                    .select('action_key, xp_earned, created_at')
                    .eq('rider_id', currentUserRankData.rider_id)
                    .order('created_at', { ascending: false })

                if (transactions && transactions.length > 0) {
                    // Group achievements by action_key
                    const grouped = transactions.reduce((acc, t) => {
                        if (!acc[t.action_key]) {
                            acc[t.action_key] = { action: t.action_key, total_times: 0, total_xp_earned: 0 }
                        }
                        acc[t.action_key].total_times++
                        acc[t.action_key].total_xp_earned += t.xp_earned
                        return acc
                    }, {})

                    myAchievements = Object.values(grouped).map(ach => {
                        let badge_name = ach.action
                        let icon = 'Star'

                        // Map known actions to achievement names and icons
                        if (ach.action === 'ride_distance_per_km') { badge_name = 'Road Warrior'; icon = 'Map' }
                        if (ach.action === 'daily_login') { badge_name = 'Daily Explorer'; icon = 'Calendar' }
                        if (ach.action === 'event_participation') { badge_name = 'Community Rider'; icon = 'Users' }
                        if (ach.action === 'first_ride') { badge_name = 'The First Mile'; icon = 'Bike' }

                        return {
                            ...ach,
                            badge_name,
                            icon
                        }
                    })
                }
            }
        }

        return successResponse('Leaderboard fetched successfully', {
            top_riders: formattedLeaderboard,
            current_user: currentUserRankData,
            achievements: myAchievements
        })

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
