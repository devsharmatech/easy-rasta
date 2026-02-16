import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL and Service Key are required for Admin Client')
}

// Server-side client with service role for admin tasks (bypass RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
