import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export async function GET(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { data, error } = await supabaseAdmin
            .from('rider_profiles')
            .select('*, users:user_id(full_name, mobile, email, profile_image_url)')
            .eq('user_id', user.user_id)
            .single()

        if (error) throw error

        const { users: userInfo, ...profile } = data

        return successResponse('Profile fetched successfully', {
            ...profile,
            full_name: userInfo?.full_name,
            mobile: userInfo?.mobile,
            email: userInfo?.email,
            profile_image_url: userInfo?.profile_image_url
        })
    } catch (err) {
        return errorResponse('Internal Server Error', 500)
    }
}

export async function PUT(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const formData = await request.formData()

        const full_name = formData.get('full_name')
        const email = formData.get('email')
        const mobile = formData.get('mobile')
        const profile_image = formData.get('profile_image')
        const referral_code = formData.get('referral_code')

        // Validate email format
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                return errorResponse('Invalid email format', 400)
            }

            // Check duplicate email
            const { data: emailExists } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', email)
                .neq('id', user.user_id)
                .single()

            if (emailExists) return errorResponse('Email already in use by another account', 400)
        }

        // Validate mobile format
        if (mobile) {
            const mobileRegex = /^[6-9]\d{9}$/
            if (!mobileRegex.test(mobile)) {
                return errorResponse('Invalid mobile number. Must be 10 digits starting with 6-9', 400)
            }

            // Check duplicate mobile
            const { data: mobileExists } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('mobile', mobile)
                .neq('id', user.user_id)
                .single()

            if (mobileExists) return errorResponse('Mobile number already in use by another account', 400)
        }

        // Upload profile image if provided
        let profile_image_url = null
        if (profile_image && typeof profile_image !== 'string' && profile_image.size > 0) {
            const ext = profile_image.name.split('.').pop()
            const fileName = `profile-images/${user.user_id}/avatar_${Date.now()}.${ext}`

            const buffer = Buffer.from(await profile_image.arrayBuffer())

            const { error: uploadError } = await supabaseAdmin.storage
                .from('media')
                .upload(fileName, buffer, {
                    contentType: profile_image.type,
                    upsert: true
                })

            if (uploadError) throw uploadError

            const { data: urlData } = supabaseAdmin.storage
                .from('media')
                .getPublicUrl(fileName)

            profile_image_url = urlData.publicUrl
        }

        // Update users table — all text fields always sent from frontend
        const userUpdates = {
            full_name: full_name || undefined,
            email: email || undefined,
            mobile: mobile || undefined
        }
        // Only update profile image if a new file was uploaded
        if (profile_image_url) userUpdates.profile_image_url = profile_image_url

        // Remove undefined keys
        Object.keys(userUpdates).forEach(k => userUpdates[k] === undefined && delete userUpdates[k])

        if (Object.keys(userUpdates).length > 0) {
            const { error: userError } = await supabaseAdmin
                .from('users')
                .update(userUpdates)
                .eq('id', user.user_id)

            if (userError) throw userError
        }

        // Update rider_profiles table
        const riderUpdates = {}
        if (referral_code !== null && referral_code !== undefined) riderUpdates.referral_code = referral_code

        if (Object.keys(riderUpdates).length > 0) {
            const { error: riderError } = await supabaseAdmin
                .from('rider_profiles')
                .update(riderUpdates)
                .eq('user_id', user.user_id)

            if (riderError) throw riderError
        }

        // Fetch updated profile
        const { data: updated, error: fetchError } = await supabaseAdmin
            .from('rider_profiles')
            .select('*, users:user_id(full_name, mobile, email, profile_image_url)')
            .eq('user_id', user.user_id)
            .single()

        if (fetchError) throw fetchError

        const { users: userInfo, ...profile } = updated

        return successResponse('Profile updated successfully', {
            ...profile,
            full_name: userInfo?.full_name,
            mobile: userInfo?.mobile,
            email: userInfo?.email,
            profile_image_url: userInfo?.profile_image_url
        })

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}
