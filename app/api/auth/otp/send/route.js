import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function POST(request) {
    try {
        const { mobile, role } = await request.json()

        if (!mobile) {
            return errorResponse('Mobile number is required', 400)
        }

        // Check if user exists to enforce role consistency
        if (role) {
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('role')
                .eq('mobile', mobile)
                .single()

            if (user && user.role !== role) {
                return errorResponse(`Mobile number already registered as ${user.role}`, 400)
            }
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

        // Store in otp_logs
        const { error } = await supabaseAdmin
            .from('otp_logs')
            .insert({
                mobile,
                otp_code: otp,
                expires_at: expiresAt
            })

        if (error) throw error

        // In production, send SMS here.
        console.log(`OTP for ${mobile}: ${otp}`)

        return successResponse('OTP sent successfully', { debug_otp: otp }) // REMOVE debug_otp IN PRODUCTION

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
