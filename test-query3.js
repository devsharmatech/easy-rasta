const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabaseAdmin
        .from('events')
        .select(`
            *,
            rider_profiles!events_rider_id_fkey(user_id, total_rides, level, xp, users!rider_profiles_user_id_fkey(full_name, profile_image_url)),
            event_participants(
                rider_id,
                rider_profiles!event_participants_rider_id_fkey(
                    user_id,
                    users!rider_profiles_user_id_fkey(id, full_name, profile_image_url)
                )
            )
        `)
        .eq('status', 'published')
        .gte('date', today)
        .order('date', { ascending: true })

    console.log(JSON.stringify({ error, dataLength: data?.length }, null, 2))
}

test();
