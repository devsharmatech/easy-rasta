import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const parts = line.split('=');
    if (parts.length > 1) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/['"']/g, '');
        acc[key] = val;
    }
    return acc;
}, {});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: businesses, error } = await supabase.from('vendor_businesses').select('id, business_name, latitude, longitude, category, is_active');

    if (error) {
        console.error('DB Error:', error);
        return;
    }

    console.log('Total businesses:', businesses?.length || 0);
    console.log('Businesses:', JSON.stringify(businesses, null, 2));

    // Also let's test the RPC function manually
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_nearby_businesses', {
        p_lat: 28.60746,
        p_long: 28.60746,
        p_radius_km: 50,
        p_category: 'fuel',
        p_sort_by_price: true
    });

    if (rpcError) {
        console.error('RPC Error:', rpcError);
    } else {
        console.log('RPC result count:', rpcData?.length || 0);
        console.log('RPC Results:', JSON.stringify(rpcData, null, 2));
    }
}

run();
