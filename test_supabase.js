const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function test() {
    const { data: b, error } = await supabase.from('vendor_businesses').select('id').limit(2);
    if (b && b.length > 0) {
        const ids = b.map(x => x.id);
        const { data, error: updateError } = await supabase.from('vendor_businesses').update({ is_active: false }).in('id', ids).select();
        fs.writeFileSync('test_out.json', JSON.stringify({ data, updateError }, null, 2));
    }
}
test();
