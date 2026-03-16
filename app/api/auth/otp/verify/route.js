import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { signJWT } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function POST(request) {
    try {
        const { mobile, otp, role, full_name, gst_number, referral_code, sos_number } = await request.json()

        if (!mobile || !otp || !role) {
            return errorResponse('Mobile, OTP and Role are required', 400)
        }

        if (!['vendor', 'rider'].includes(role)) {
            return errorResponse('Invalid role for OTP login', 400)
        }

        // 1. Verify OTP (Allow '123456' for testing)
        if (otp !== '123456') {
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
        }

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

            const { data: newUser, error: createError } = await supabaseAdmin
                .from('users')
                .insert({
                    mobile,
                    role,
                    full_name,
                    sos_number: sos_number || null,
                    is_verified: true,
                    is_active: true
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
            } else if (role === 'rider' && referral_code) {
                await supabaseAdmin
                    .from('rider_profiles')
                    .update({ referral_code })
                    .eq('user_id', user.id)
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
                }
            }
        )

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
