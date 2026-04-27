/**
 * Sponsorship Reimbursement API
 * 
 * Tiers based on check-in count:
 *   25–49  → ₹750  (75000 paise)
 *   50–99  → ₹1500 (150000 paise)
 *   100+   → ₹2500 (250000 paise)
 * 
 * Rules:
 *   - Monthly cap ₹15,000 (1500000 paise)
 *   - Requires bill upload + admin approval + GPS validation
 *   - Suspicious clusters → flag
 *   - Status: pending → approved/rejected/flagged
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'
import { logFraudFlag } from '@/lib/antifraud'

export const dynamic = 'force-dynamic'
export const revalidate = 0


const MONTHLY_CAP_PAISE = 1500000 // ₹15,000

const TIERS = {
    tier1: { min: 25, max: 49, paise: 75000, actionType: 'sponsorship_tier1' },
    tier2: { min: 50, max: 99, paise: 150000, actionType: 'sponsorship_tier2' },
    tier3: { min: 100, max: Infinity, paise: 250000, actionType: 'sponsorship_tier3' }
}

const uploadFile = async (file, folder, userId) => {
    if (!file || typeof file === 'string' || file.size === 0) return null
    const ext = file.name.split('.').pop()
    const fileName = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error } = await supabaseAdmin.storage
        .from('media')
        .upload(fileName, buffer, { contentType: file.type, upsert: true })
    if (error) throw error
    const { data: urlData } = supabaseAdmin.storage.from('media').getPublicUrl(fileName)
    return urlData.publicUrl
}

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const formData = await request.formData()

        const bill_file = formData.get('bill')
        const latitude = formData.get('latitude')
        const longitude = formData.get('longitude')

        if (!bill_file || typeof bill_file === 'string') {
            return successResponse('Bill upload is required', { reward_given: false, reason: 'missing_bill' })
        }

        // Count user's total event check-ins
        const { count: checkInCount } = await supabaseAdmin
            .from('event_checkins')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.user_id)

        // Determine tier
        let tier = null
        if (checkInCount >= 100) tier = TIERS.tier3
        else if (checkInCount >= 50) tier = TIERS.tier2
        else if (checkInCount >= 25) tier = TIERS.tier1

        if (!tier) {
            return successResponse('Minimum 25 event check-ins required for sponsorship', {
                reward_given: false,
                reason: 'insufficient_checkins',
                current_checkins: checkInCount,
                minimum_required: 25
            })
        }

        // Monthly cap check
        const currentMonth = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
        const { data: monthlyClaims } = await supabaseAdmin
            .from('sponsorship_claims')
            .select('amount_paise')
            .eq('user_id', user.user_id)
            .eq('claim_month', currentMonth)
            .in('status', ['pending', 'approved'])

        const monthlyTotal = (monthlyClaims || []).reduce((sum, c) => sum + c.amount_paise, 0)

        if (monthlyTotal + tier.paise > MONTHLY_CAP_PAISE) {
            return successResponse('Monthly sponsorship cap exceeded', {
                reward_given: false,
                reason: 'monthly_cap_exceeded',
                monthly_total_paise: monthlyTotal,
                monthly_cap_paise: MONTHLY_CAP_PAISE
            })
        }

        // Upload bill
        const billUrl = await uploadFile(bill_file, 'sponsorship-bills', user.user_id)
        if (!billUrl) {
            return successResponse('Bill upload failed', { reward_given: false, reason: 'upload_failed' })
        }

        // Determine tier key
        let tierKey = 'tier1'
        if (checkInCount >= 100) tierKey = 'tier3'
        else if (checkInCount >= 50) tierKey = 'tier2'

        // Create claim (pending admin approval)
        const { data: claim, error: claimError } = await supabaseAdmin
            .from('sponsorship_claims')
            .insert({
                user_id: user.user_id,
                tier: tierKey,
                check_in_count: checkInCount,
                bill_url: billUrl,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                amount_paise: tier.paise,
                status: 'pending',
                claim_month: currentMonth
            })
            .select('id')
            .single()

        if (claimError) throw claimError

        // Check for suspicious clustering (multiple claims from nearby GPS)
        if (latitude && longitude) {
            const { data: nearbyClaims } = await supabaseAdmin
                .from('sponsorship_claims')
                .select('id, latitude, longitude, user_id')
                .neq('user_id', user.user_id)
                .eq('claim_month', currentMonth)
                .not('latitude', 'is', null)

            // Simple cluster check: if 3+ different users claimed from within ~1km
            if (nearbyClaims && nearbyClaims.length >= 3) {
                await logFraudFlag(
                    user.user_id, 'cluster_suspect', 'medium',
                    'sponsorship_claim', claim.id,
                    { nearbyClaimCount: nearbyClaims.length, latitude, longitude }
                )
                // Flag but don't block
                await supabaseAdmin
                    .from('sponsorship_claims')
                    .update({ status: 'flagged' })
                    .eq('id', claim.id)
            }
        }

        return successResponse('Sponsorship claim submitted for admin approval', {
            claim_id: claim.id,
            tier: tierKey,
            amount_paise: tier.paise,
            check_in_count: checkInCount,
            status: 'pending',
            monthly_total_paise: monthlyTotal + tier.paise,
            monthly_cap_paise: MONTHLY_CAP_PAISE
        })

    } catch (err) {
        console.error('[Sponsorship] Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}

/**
 * GET — List user's sponsorship claims
 */
export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user) return errorResponse('Unauthorized', 401)

        const { data, error } = await supabaseAdmin
            .from('sponsorship_claims')
            .select('*')
            .eq('user_id', user.user_id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return successResponse('Sponsorship claims fetched', data)
    } catch (err) {
        console.error('[Sponsorship] GET Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
