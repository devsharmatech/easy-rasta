import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import crypto from 'crypto'

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || null
const RAPID_API_KEY = process.env.RAPID_API_KEY || null

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

// Utility to decode Google Polyline
function decodePolyline(encoded) {
    if (!encoded) return []
    let poly = []
    let index = 0, len = encoded.length
    let lat = 0, lng = 0

    while (index < len) {
        let b, shift = 0, result = 0
        do {
            b = encoded.charCodeAt(index++) - 63
            result |= (b & 0x1f) << shift
            shift += 5
        } while (b >= 0x20)
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
        lat += dlat

        shift = 0; result = 0
        do {
            b = encoded.charCodeAt(index++) - 63
            result |= (b & 0x1f) << shift
            shift += 5
        } while (b >= 0x20)
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
        lng += dlng

        poly.push({ latitude: (lat / 1e5), longitude: (lng / 1e5) })
    }
    return poly
}

// Sub-sample points to prevent hitting Nearby Search too many times (e.g. every 10km)
function sampleRoutePoints(points, distanceKm = 10) {
    if (points.length === 0) return []
    const sampled = [points[0]]
    // Simple sampling logic (could be improved with Haversine distance tracking)
    const step = Math.max(1, Math.floor(points.length / 10)) // Max 10 points along route
    for (let i = step; i < points.length; i += step) {
        sampled.push(points[i])
    }
    // Always include destination
    if (sampled[sampled.length - 1] !== points[points.length - 1]) {
        sampled.push(points[points.length - 1])
    }
    return sampled
}

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const body = await request.json()
        const { origin, destination, activeTab = "Fuel", cityIds = [] } = body

        if (!origin || !destination) {
            return errorResponse('origin and destination are required', 400)
        }

        // Support both {lat, lng} and {latitude, longitude} formats
        const oLat = origin.lat || origin.latitude
        const oLng = origin.lng || origin.longitude

        const destParam = typeof destination === 'string'
            ? encodeURIComponent(destination)
            : `${destination.lat || destination.latitude},${destination.lng || destination.longitude}`

        // 1. Create a unique hash for this route request to check our cache
        const routeString = `${oLat},${oLng}-${destParam}-${activeTab}`
        const routeHash = crypto.createHash('md5').update(routeString).digest('hex')

        // 2. Check cache first (allow cache busting with force_refresh)
        const { force_refresh } = body

        if (!force_refresh) {
            const { data: cachedRoute } = await supabaseAdmin
                .from('route_pumps_cache')
                .select('pumps_data')
                .eq('route_hash', routeHash)
                .single()

            if (cachedRoute) {
                console.log('[Find] Found cached route:', routeHash)
                // Even if cached, always enrich with LATEST prices and reviews
                let pumps = cachedRoute.pumps_data

                // Enrich with prices ONLY for Fuel type
                if (activeTab.toLowerCase() === 'fuel') {
                    if (pumps.length > 0 && !pumps[0].city) {
                        pumps = await enrichPumpsWithCities(pumps)
                    }
                    pumps = await enrichPumpsWithLocalPrices(pumps)
                }
                pumps = await enrichPumpsWithReviews(pumps)

                return successResponse('Route fetched from cache', {
                    is_cached: true,
                    pumps
                })
            }
        } else {
            // Delete old cache for this route
            await supabaseAdmin.from('route_pumps_cache').delete().eq('route_hash', routeHash)
            console.log('[Find] Force refresh: cleared old cache for route:', routeHash)
        }

        console.log('[Find] No cache found, fetching from Google APIs...', `origin=${oLat},${oLng}&destination=${destParam}`)

        // 3. Not in cache: Hit Google Directions (with retry for timeout resilience)
        let dirRes
        try {
            dirRes = await fetchWithRetry(
                `https://maps.googleapis.com/maps/api/directions/json?origin=${oLat},${oLng}&destination=${destParam}&key=${GOOGLE_API_KEY}`
            )
        } catch (err) {
            return errorResponse('Google Directions API timed out after retries: ' + err.message, 500)
        }
        const directions = await dirRes.json()

        if (!directions.routes?.length) {
            return errorResponse('No routes found', 404)
        }

        const points = decodePolyline(directions.routes[0].overview_polyline.points)
        const samplePoints = sampleRoutePoints(points)

        // Map activeTab to Google Places type
        const TYPE_MAP = {
            'fuel': 'gas_station',
            'washroom': 'toilet',
            'hotel': 'lodging',
            'repair': 'car_repair',
            'medical': 'pharmacy',
            'food': 'restaurant'
        }
        const type = TYPE_MAP[activeTab.toLowerCase()] || 'gas_station'
        const useKeywordSearch = activeTab.toLowerCase() === 'washroom' // Google doesn't always support 'toilet' as type

        // 4. Find Pumps — CACHE-FIRST approach
        //    Check our local discovered_pumps DB for each sample point first.
        //    Only call Google Places API for points that have no cached results.
        const uniquePumps = new Map()
        const uncoveredPoints = []

        // 4a. Check local DB for each sample point (within 5km radius, max 7 days old)
        const RADIUS_DEG = 0.045  // ~5km in lat/lng degrees
        const FRESHNESS_DAYS = 7

        for (const point of samplePoints) {
            const { data: localPumps } = await supabaseAdmin
                .from('discovered_pumps')
                .select('*')
                .eq('place_type', type)
                .gte('latitude', point.latitude - RADIUS_DEG)
                .lte('latitude', point.latitude + RADIUS_DEG)
                .gte('longitude', point.longitude - RADIUS_DEG)
                .lte('longitude', point.longitude + RADIUS_DEG)
                .gte('updated_at', new Date(Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000).toISOString())

            if (localPumps && localPumps.length > 0) {
                localPumps.forEach(p => {
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
                })
            } else {
                uncoveredPoints.push(point)
            }
        }

        console.log(`[Find] DB had pumps for ${samplePoints.length - uncoveredPoints.length}/${samplePoints.length} points. Calling Google for ${uncoveredPoints.length} uncovered points.`)

        // 4b. Fetch from Google Places API ONLY for uncovered points
        if (uncoveredPoints.length > 0) {
            const placeResponses = await Promise.all(
                uncoveredPoints.map(p => {
                    // For washrooms, use keyword search since 'toilet' type isn't well-supported
                    const url = useKeywordSearch
                        ? `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${p.latitude},${p.longitude}&radius=5000&keyword=public+toilet+washroom&key=${GOOGLE_API_KEY}`
                        : `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${p.latitude},${p.longitude}&radius=5000&type=${type}&key=${GOOGLE_API_KEY}`
                    return fetchWithRetry(url).then(r => r.json()).catch(() => ({ results: [] }))
                })
            )

            const newPumpsToSave = []

            placeResponses.forEach(res => {
                res.results?.forEach(p => {
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

                        // Prepare for DB save
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
            })

            // 4c. Save newly discovered pumps to DB for future reuse
            if (newPumpsToSave.length > 0) {
                const { error: saveErr } = await supabaseAdmin
                    .from('discovered_pumps')
                    .upsert(newPumpsToSave, { onConflict: 'place_id' })

                if (saveErr) {
                    console.error('[Find] Error saving discovered pumps:', saveErr.message)
                } else {
                    console.log(`[Find] ✅ Saved ${newPumpsToSave.length} new pumps to discovered_pumps cache`)
                }
            }
        }

        let pumps = Array.from(uniquePumps.values())

        // 5. Enrich with prices ONLY for Fuel type
        if (activeTab.toLowerCase() === 'fuel') {
            pumps = await enrichPumpsWithCities(pumps)
            pumps = await enrichPumpsWithLocalPrices(pumps)
        }

        // 6. Attach user reviews for all place types
        pumps = await enrichPumpsWithReviews(pumps)

        // 8. Cache this calculated route for future users!
        await supabaseAdmin.from('route_pumps_cache').insert({
            origin_lat: oLat,
            origin_lng: oLng,
            dest_lat: destination?.lat || destination?.latitude || null,
            dest_lng: destination?.lng || destination?.longitude || null,
            route_hash: routeHash,
            pumps_data: pumps
        })

        return successResponse('Route and pumps calculated successfully', {
            is_cached: false,
            pumps
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
    // Load ALL known city names from our fuel_prices DB
    const { data: knownCities } = await supabaseAdmin
        .from('fuel_prices')
        .select('city')

    if (!knownCities || knownCities.length === 0) {
        console.log('[GeoCity] No cities in fuel_prices DB to match against!')
        return pumps
    }

    // Build a sorted list (longest names first to avoid partial matches like "Delhi" matching before "New Delhi")
    const cityList = knownCities
        .map(c => c.city)
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)

    console.log(`[GeoCity] Loaded ${cityList.length} known cities for address matching`)

    return pumps.map(pump => {
        const address = (pump.address || '').toLowerCase()
        let matchedCity = null

        // Check if any known DB city name appears in the pump's address
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

        if (matchedCity) {
            console.log(`[GeoCity] ✅ ${pump.name} => "${matchedCity}" (from address: "${pump.address}")`)
        } else {
            console.log(`[GeoCity] ⚠️ No city match for: ${pump.name} | address: "${pump.address}"`)
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
    // Fetch ALL fuel prices from our DB (it's only ~699 rows, very fast)
    const { data: allPrices, error } = await supabaseAdmin
        .from('fuel_prices')
        .select('city, state, petrol_price, diesel_price, cng_price, updated_at')

    if (error) {
        console.error(`[PriceMatch] DB Error:`, error.message)
        return pumps
    }

    if (!allPrices || allPrices.length === 0) {
        console.log(`[PriceMatch] No prices found in fuel_prices table!`)
        return pumps
    }

    console.log(`[PriceMatch] Loaded ${allPrices.length} price records from DB`)

    // Build a lowercase lookup map
    const pricesByCity = new Map()
    allPrices.forEach(row => {
        if (row.city) pricesByCity.set(row.city.toLowerCase().trim(), row)
    })

    return pumps.map(pump => {
        let matchedPrice = null

        if (pump.city) {
            const pumpCity = pump.city.toLowerCase().trim()

            // 1. Try exact match first
            matchedPrice = pricesByCity.get(pumpCity)

            // 1b. Try alias match
            if (!matchedPrice && CITY_ALIASES[pumpCity]) {
                matchedPrice = pricesByCity.get(CITY_ALIASES[pumpCity])
            }

            // 2. Try partial match (e.g., "New Delhi" contains "Delhi")
            if (!matchedPrice) {
                for (const [dbCity, row] of pricesByCity) {
                    if (pumpCity.includes(dbCity) || dbCity.includes(pumpCity)) {
                        matchedPrice = row
                        console.log(`[PriceMatch] Fuzzy matched: "${pump.city}" <=> "${row.city}"`)
                        break
                    }
                }
            }
        }

        // 3. If still no match, try matching by district
        if (!matchedPrice && pump.district) {
            const pumpDistrict = pump.district.toLowerCase().trim()
            matchedPrice = pricesByCity.get(pumpDistrict)
            if (!matchedPrice) {
                for (const [dbCity, row] of pricesByCity) {
                    if (pumpDistrict.includes(dbCity) || dbCity.includes(pumpDistrict)) {
                        matchedPrice = row
                        console.log(`[PriceMatch] District matched: "${pump.district}" <=> "${row.city}"`)
                        break
                    }
                }
            }
        }

        if (!matchedPrice && (pump.city || pump.district)) {
            console.log(`[PriceMatch] ⚠️ No match found for: city="${pump.city}", district="${pump.district}"`)
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

// syncMissingCityPrices is no longer needed since we pre-loaded all prices via cron
// Keeping it as a no-op for safety
async function syncMissingCityPrices() { }

async function enrichPumpsWithReviews(pumps) {
    if (pumps.length === 0) return []

    const placeIds = pumps.map(p => p.place_id)

    // Fetch all reviews for all pumps in one go
    const { data: allReviews, error } = await supabaseAdmin
        .from('pump_reviews')
        .select(`
            id, place_id, rating, review_text, image_url, created_at, rider_id,
            rider_profiles(user_id, users:user_id(full_name, profile_image_url))
        `)
        .in('place_id', placeIds)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('[Reviews] DB error:', error.message)
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
