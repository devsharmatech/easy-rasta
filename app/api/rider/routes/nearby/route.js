import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0


const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || null

// Utility to retry fetches if APIs randomly drop connection
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const controller = new AbortController()
            const id = setTimeout(() => controller.abort(), 15000)
            const res = await fetch(url, { ...options, signal: controller.signal })
            clearTimeout(id)
            if (res.ok) return res
            console.log(`[Retry] Attempt ${i + 1}/${maxRetries} failed with status ${res.status}`)
        } catch (error) {
            console.log(`[Retry] Attempt ${i + 1}/${maxRetries} error: ${error.message}`)
        }
        await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i)))
    }
    throw new Error(`Failed after ${maxRetries} attempts`)
}

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { lat, lng, latitude, longitude, activeTab = "Fuel", type: typeParam, force_refresh } = body
        
        const centerLat = lat || latitude
        const centerLng = lng || longitude
        const radius = body.radius || 2000 // Default 2km radius
        
        // 'type' param takes precedence, else fallback to 'activeTab'
        const searchResourceType = typeParam || activeTab

        if (!centerLat || !centerLng) {
            return errorResponse('lat and lng are required', 400)
        }

        // Map searchResourceType to Google Places type
        const TYPE_MAP = {
            'Fuel': 'gas_station',
            'Washroom': 'toilet',
            'Hotel': 'lodging',
            'Repair': 'car_repair',
            'Medical': 'pharmacy',
            'Food': 'restaurant'
        }
        const type = TYPE_MAP[searchResourceType] || 'gas_station'
        const useKeywordSearch = searchResourceType === 'Washroom'

        // Map radius to degrees (approximate)
        // 1 degree latitude ~ 111 km
        const RADIUS_DEG = radius / 111000 * 1.5 
        const FRESHNESS_DAYS = 7

        const uniquePumps = new Map()
        let fetchedFromGoogle = false

        if (!force_refresh) {
            const { data: localPumps } = await supabaseAdmin
                .from('discovered_pumps')
                .select('*')
                .eq('place_type', type)
                .gte('latitude', centerLat - RADIUS_DEG)
                .lte('latitude', centerLat + RADIUS_DEG)
                .gte('longitude', centerLng - RADIUS_DEG)
                .lte('longitude', centerLng + RADIUS_DEG)
                .gte('updated_at', new Date(Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000).toISOString())

            if (localPumps && localPumps.length > 0) {
                localPumps.forEach(p => {
                     // Basic pythagorean distance check to filter out corner cases of bounding box
                     const dist = Math.sqrt(Math.pow(p.latitude - centerLat, 2) + Math.pow(p.longitude - centerLng, 2)) * 111000
                     if (dist <= radius) {
                         if (!uniquePumps.has(p.place_id)) {
                             uniquePumps.set(p.place_id, {
                                 place_id: p.place_id,
                                 name: p.name,
                                 latitude: parseFloat(p.latitude),
                                 longitude: parseFloat(p.longitude),
                                 address: p.address,
                                 rating: p.rating ? parseFloat(p.rating) : null,
                                 user_ratings_total: p.user_ratings_total,
                                 open_now: null,
                                 icon: p.icon,
                                 icon_background_color: p.icon_background_color,
                                 icon_mask_base_uri: p.icon_mask_base_uri,
                                 photo_url: p.photo_url
                             })
                         }
                     }
                })
            }
        }

        // If no pumps found locally (or force_refresh), fetch from Google Places
        if (uniquePumps.size === 0 || force_refresh) {
            fetchedFromGoogle = true
            console.log(`[Nearby] Calling Google API for point: ${centerLat},${centerLng}`)
            
            const url = useKeywordSearch
                ? `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${centerLat},${centerLng}&radius=${radius}&keyword=public+toilet+washroom&key=${GOOGLE_API_KEY}`
                : `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${centerLat},${centerLng}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`
            
            let placeRes
            try {
                placeRes = await fetchWithRetry(url).then(r => r.json())
            } catch (err) {
                return errorResponse('Google API timed out: ' + err.message, 500)
            }

            const newPumpsToSave = []

            placeRes.results?.forEach(p => {
                if (!uniquePumps.has(p.place_id)) {
                    const photoRef = p.photos?.[0]?.photo_reference
                    const photoUrl = photoRef
                        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`
                        : null

                    const pumpData = {
                        place_id: p.place_id,
                        name: p.name,
                        latitude: p.geometry.location.lat,
                        longitude: p.geometry.location.lng,
                        address: p.vicinity,
                        rating: p.rating,
                        user_ratings_total: p.user_ratings_total,
                        open_now: p.opening_hours?.open_now || null,
                        icon: p.icon || null,
                        icon_background_color: p.icon_background_color || null,
                        icon_mask_base_uri: p.icon_mask_base_uri || null,
                        photo_url: photoUrl
                    }
                    uniquePumps.set(p.place_id, pumpData)

                    newPumpsToSave.push({
                        place_id: p.place_id,
                        name: p.name,
                        latitude: p.geometry.location.lat,
                        longitude: p.geometry.location.lng,
                        address: p.vicinity,
                        rating: p.rating || null,
                        user_ratings_total: p.user_ratings_total || 0,
                        icon: p.icon || null,
                        icon_background_color: p.icon_background_color || null,
                        icon_mask_base_uri: p.icon_mask_base_uri || null,
                        photo_url: photoUrl,
                        place_type: type,
                        updated_at: new Date().toISOString()
                    })
                }
            })

            if (newPumpsToSave.length > 0) {
                const { error: saveErr } = await supabaseAdmin
                    .from('discovered_pumps')
                    .upsert(newPumpsToSave, { onConflict: 'place_id' })

                if (saveErr) console.error('[Nearby] Error saving discovered pumps:', saveErr.message)
                else console.log(`[Nearby] ✅ Saved ${newPumpsToSave.length} new places to discovered_pumps cache`)
            }
        }

        let places = Array.from(uniquePumps.values())

        if (searchResourceType === 'Fuel') {
            places = await enrichPumpsWithCities(places)
            places = await enrichPumpsWithLocalPrices(places)
        }

        places = await enrichPumpsWithReviews(places)

        return successResponse('Nearby places fetched successfully', {
            is_cached: !fetchedFromGoogle,
            pumps: places,
            count: places.length
        })

    } catch (err) {
        console.error(err)
        return errorResponse('Internal Server Error', 500)
    }
}

// --- HELPER FUNCTIONS --- //

const CITY_ALIASES = {
    'bengaluru': 'bangalore',
    'bangalore': 'bengaluru',
    'gurugram': 'gurgaon',
    'gurgaon': 'gurugram',
    'mumbai': 'bombay',
    'bombay': 'mumbai',
    'chennai': 'madras',
    'madras': 'chennai',
    'kolkata': 'calcutta',
    'calcutta': 'kolkata',
    'prayagraj': 'allahabad',
    'allahabad': 'prayagraj',
    'puducherry': 'pondicherry',
    'pondicherry': 'puducherry',
    'thiruvananthapuram': 'trivandrum',
    'trivandrum': 'thiruvananthapuram',
    'mysuru': 'mysore',
    'mysore': 'mysuru',
    'kochi': 'cochin',
    'cochin': 'kochi'
};

async function enrichPumpsWithCities(pumps) {
    const { data: knownCities } = await supabaseAdmin
        .from('fuel_prices')
        .select('city')

    if (!knownCities || knownCities.length === 0) return pumps

    const cityList = knownCities
        .map(c => c.city)
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)

    return pumps.map(pump => {
        const address = (pump.address || '').toLowerCase()
        let matchedCity = null

        for (const city of cityList) {
            if (address.includes(city.toLowerCase())) {
                matchedCity = city
                break
            }
        }

        // If exact match fails, try resolving through aliases
        if (!matchedCity) {
            for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
                if (address.includes(alias)) {
                    const found = cityList.find(c => c.toLowerCase() === canonical)
                    if (found) {
                        matchedCity = found
                        break
                    }
                }
            }
        }

        return {
            ...pump,
            city: matchedCity,
            district: null,
            state: null
        }
    })
}

async function enrichPumpsWithLocalPrices(pumps) {
    const { data: allPrices, error } = await supabaseAdmin
        .from('fuel_prices')
        .select('city, state, petrol_price, diesel_price, cng_price, updated_at')

    if (error || !allPrices || allPrices.length === 0) return pumps

    const pricesByCity = new Map()
    allPrices.forEach(row => {
        if (row.city) pricesByCity.set(row.city.toLowerCase().trim(), row)
    })

    return pumps.map(pump => {
        let matchedPrice = null

        if (pump.city) {
            const pumpCity = pump.city.toLowerCase().trim()
            matchedPrice = pricesByCity.get(pumpCity)

            if (!matchedPrice && CITY_ALIASES[pumpCity]) {
                matchedPrice = pricesByCity.get(CITY_ALIASES[pumpCity])
            }

            if (!matchedPrice) {
                for (const [dbCity, row] of pricesByCity) {
                    if (pumpCity.includes(dbCity) || dbCity.includes(pumpCity)) {
                        matchedPrice = row
                        break
                    }
                }
            }
        }

        if (!matchedPrice && pump.district) {
            const pumpDistrict = pump.district.toLowerCase().trim()
            matchedPrice = pricesByCity.get(pumpDistrict)
            if (!matchedPrice) {
                for (const [dbCity, row] of pricesByCity) {
                    if (pumpDistrict.includes(dbCity) || dbCity.includes(pumpDistrict)) {
                        matchedPrice = row
                        break
                    }
                }
            }
        }

        return {
            ...pump,
            prices: matchedPrice ? {
                petrol: matchedPrice.petrol_price,
                diesel: matchedPrice.diesel_price,
                cng: matchedPrice.cng_price,
                updated_at: matchedPrice.updated_at
            } : null
        }
    })
}

async function enrichPumpsWithReviews(pumps) {
    if (pumps.length === 0) return []

    const placeIds = pumps.map(p => p.place_id)

    const { data: allReviews, error } = await supabaseAdmin
        .from('pump_reviews')
        .select(`
            id, place_id, rating, review_text, image_url, created_at, rider_id,
            rider_profiles(user_id, users:user_id(full_name, profile_image_url))
        `)
        .in('place_id', placeIds)
        .order('created_at', { ascending: false })

    if (error) {
        return pumps.map(p => ({ ...p, platform_reviews: [], platform_avg_rating: null, platform_reviews_count: 0 }))
    }

    const reviewsMap = {}
    if (allReviews) {
        allReviews.forEach(rev => {
            if (!reviewsMap[rev.place_id]) {
                reviewsMap[rev.place_id] = { reviews: [], total_rating: 0, count: 0 }
            }
            reviewsMap[rev.place_id].reviews.push({
                id: rev.id,
                rating: rev.rating,
                review_text: rev.review_text,
                image_url: rev.image_url || null,
                created_at: rev.created_at,
                rider_name: rev.rider_profiles?.users?.full_name || 'Anonymous',
                rider_image: rev.rider_profiles?.users?.profile_image_url || null
            })
            reviewsMap[rev.place_id].total_rating += rev.rating
            reviewsMap[rev.place_id].count += 1
        })
    }

    return pumps.map(pump => {
        const pumpReviews = reviewsMap[pump.place_id]
        if (pumpReviews) {
            const platform_avg_rating = (pumpReviews.total_rating / pumpReviews.count).toFixed(1)
            return {
                ...pump,
                platform_reviews: pumpReviews.reviews,
                platform_avg_rating: parseFloat(platform_avg_rating),
                platform_reviews_count: pumpReviews.count
            }
        }
        return {
            ...pump,
            platform_reviews: [],
            platform_avg_rating: null,
            platform_reviews_count: 0
        }
    })
}
