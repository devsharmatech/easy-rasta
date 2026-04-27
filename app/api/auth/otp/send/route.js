import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function POST(request) {
    try {
        const { mobile, role } = await request.json()

        if (!mobile) {
            return errorResponse('Mobile number is required', 400)
        }

        let is_already_registered = false;

        // Check if user exists
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('mobile', mobile)
            .single()

        if (user) {
            is_already_registered = true;
            if (role && user.role !== role) {
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

        // Send OTP via SMS API
        const smsUrl = process.env.SMS_API_URL || 'https://api.aoc-portal.com/v1/sms'
        const apiKey = process.env.SMS_API_KEY
        const sender = process.env.SMS_SENDER_ID
        const message = `Dear Customer, Your OTP for login is ${otp} for Easy Rasta App. Do not share it with anyone. Thank you.`
        
        if (!apiKey || !sender) {
            console.error('SMS API credentials not configured')
            return errorResponse('SMS service not configured', 500)
        }
        
        try {
            const response = await fetch(`${smsUrl}?apikey=${apiKey}&type=TRANS&text=${encodeURIComponent(message)}&to=${mobile}&sender=${sender}`)
            const result = await response.json()
            console.log('SMS API Response:', result)
        } catch (smsError) {
            console.error('Failed to send SMS:', smsError)
            // Don't fail the request if SMS fails, just log the error
        }

        return successResponse('OTP sent successfully', { is_already_registered })

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
