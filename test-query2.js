const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseAdmin
        .from('events')
        .select(`
            id,
            event_participants(
                rider_profiles(
                    user_id,
                    users:user_id(id, full_name, profile_image_url)
                )
            )
        `)
        .eq('status', 'published')
        .gte('date', today)
        .limit(2);

    console.log(JSON.stringify({error: error?.message || null, hasData: !!data}, null, 2));
}

test();
