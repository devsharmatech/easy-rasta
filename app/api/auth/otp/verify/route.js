import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { signJWT } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { processReward } from '@/lib/earningEngine'

export async function POST(request) {
    try {
        const { mobile, otp, role, full_name, gst_number, referral_code, sos_number } = await request.json()

        if (!mobile || !otp || !role) {
            return errorResponse('Mobile, OTP and Role are required', 400)
        }

        if (!['vendor', 'rider'].includes(role)) {
            return errorResponse('Invalid role for OTP login', 400)
        }

        // 1. Verify OTP
        const { data: logs, error: logError } = await supabaseAdmin
            .from('otp_logs')
            .select('*')
            .eq('mobile', mobile)
            .eq('otp_code', otp)
            .eq('is_verified', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)

        if (logError || !logs || logs.length === 0) {
            return errorResponse('Invalid or expired OTP', 400)
        }

        const logEntry = logs[0]

        // Mark OTP as verified
        await supabaseAdmin
            .from('otp_logs')
            .update({ is_verified: true })
            .eq('id', logEntry.id)

        // 2. Check if user exists
        let { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('mobile', mobile)
            .single()

        let isNewUser = false

        // 3. If NOT user, create user (Registration Flow)
        if (!user) {
            if (!full_name) {
                return errorResponse('Full Name is required for new registration', 400)
            }

            // Optional SOS Number Validation (Support country codes)
            if (sos_number) {
                const sosRegex = /^(\+?\d{1,3})?([6-9]\d{9})$/
                if (!sosRegex.test(sos_number.replace(/\s+/g, ''))) {
                    return errorResponse('Invalid SOS number format', 400)
                }
                if (sos_number === mobile) {
                    return errorResponse('SOS number cannot be the same as your primary mobile number', 400)
                }
            }

            // Generate a 6-character random alphanumeric code
            const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase()
            const fCode = referral_code || null // Accept existing frontend payload 'referral_code' mapped to 'friend_code'

            const { data: newUser, error: createError } = await supabaseAdmin
                .from('users')
                .insert({
                    mobile,
                    role,
                    full_name,
                    sos_number: sos_number || null,
                    is_verified: true,
                    is_active: true,
                    my_code: generatedCode,
                    friend_code: fCode
                })
                .select()
                .single()

            if (createError) throw createError
            user = newUser
            isNewUser = true
        } else {
            // Login Flow
            if (user.role !== role) {
                return errorResponse(`Mobile already registered as ${user.role}`, 400)
            }
        }

        // 4. Post-registration updates
        if (isNewUser) {
            if (role === 'vendor' && gst_number) {
                await supabaseAdmin
                    .from('vendor_profiles')
                    .update({ gst_number })
                    .eq('user_id', user.id)
            } else if (role === 'rider') {
                // Handle referral XP
                const fCode = referral_code || null;
                let referral_applied = false;
                if (fCode) {
                    try {
                        const { data: fUser } = await supabaseAdmin.from('users').select('id').eq('my_code', fCode).single()
                        
                        if (fUser) {
                            const { data: fRider } = await supabaseAdmin.from('rider_profiles').select('id').eq('user_id', fUser.id).single()
                            const { data: nRider } = await supabaseAdmin.from('rider_profiles').select('id').eq('user_id', user.id).single()

                            if (fRider && nRider) {
                                const { awardXP } = await import('@/lib/xp')
                                
                                // Award 100 XP to the friend (referrer)
                                await awardXP(fRider.id, 'referral_bonus', nRider.id)
                                
                                // Award 50 XP to the new rider (referee)
                                await awardXP(nRider.id, 'referral_bonus', fRider.id, 50)
                            }

                            // --- Earning Engine: Set up referral attribution ---
                            // This enables /api/mobile/earning/referral/activate to
                             // trigger referrer ₹10 reward on first qualifying action
                            try {
                                // Mark who referred this user
                                await supabaseAdmin
                                    .from('users')
                                    .update({ referred_by_user_id: fUser.id })
                                    .eq('id', user.id)

                                // Create referral attribution record (30-day window)
                                const { data: attrRecord } = await supabaseAdmin
                                    .from('referral_attributions')
                                    .insert({
                                        referrer_user_id: fUser.id,
                                        referred_user_id: user.id,
                                        referral_code: fCode,
                                        status: 'pending',
                                        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                                        chain_depth: 1
                                    })
                                    .select('id')
                                    .single()

                                // Instant ₹10 credit to new user (no fraud risk at signup)
                                await processReward({
                                    userId: user.id,
                                    actionType: 'referral_new_user',
                                    amountPaise: 1000,
                                    referenceType: 'referral_attribution',
                                    referenceId: attrRecord?.id || null,
                                    metadata: { referrer_user_id: fUser.id, instant: true }
                                })

                                // Update attribution with new user's reward status
                                if (attrRecord?.id) {
                                    await supabaseAdmin
                                        .from('referral_attributions')
                                        .update({ referred_reward_credited: true })
                                        .eq('id', attrRecord.id)
                                }

                                referral_applied = true
                            } catch (attrErr) {
                                console.error('Referral attribution error (non-blocking):', attrErr)
                            }
                        }
                    } catch (refErr) {
                        console.error('Referral XP Error:', refErr)
                    }
                }
            }
        }

        // 5. Issue JWT
        const token = signJWT({
            user_id: user.id,
            role: user.role,
            mobile: user.mobile
        })

        return successResponse(
            isNewUser ? 'Registration successful' : 'Login successful',
            {
                token,
                user: {
                    id: user.id,
                    mobile: user.mobile,
                    role: user.role,
                    full_name: user.full_name,
                    sos_number: user.sos_number
                },
                ...(isNewUser && typeof referral_applied !== 'undefined' && referral_applied ? {
                    referral_message: 'Referral code applied successfully! Reward credited to your wallet.'
                } : {})
            }
        )

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
