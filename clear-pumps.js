const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    await supabase.from('discovered_pumps').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Cleared discovered_pumps cache');
    await supabase.from('route_pumps_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Cleared route_pumps_cache');
}
run();
