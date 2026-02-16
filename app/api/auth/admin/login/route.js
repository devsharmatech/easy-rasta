import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { comparePassword, signJWT } from '@/lib/auth'

export async function POST(request) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
        }

        // 1. Fetch user by email
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('role', 'admin')
            .single()

        if (error || !user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        // 2. Compare password
        const isValid = await comparePassword(password, user.password_hash)
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        // 3. Issue JWT
        const token = signJWT({
            user_id: user.id,
            role: user.role,
            email: user.email
        })

        return NextResponse.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                full_name: user.full_name
            }
        })

    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
