const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
async function test() {
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=12.8531969,77.66694679999999&key=${process.env.GOOGLE_API_KEY}`
    const res = await fetch(geoUrl).then(r => r.json())
    console.log(JSON.stringify(res.results[0].address_components, null, 2))

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await supabase.from('fuel_prices').select('city').eq('city', 'Electronic City');
    console.log('Electronic City in DB:', data)
}
test()
