export const maxDuration = 300 // Allow Vercel up to 5 minutes

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0


const RAPID_API_KEY = process.env.RAPID_API_KEY_V2 || null
const RAPID_API_HOST = "fuel-petrol-diesel-live-price-india.p.rapidapi.com"

// Helper to fetch JSON from RapidAPI with a specific city header or default list
async function fetchFromRapid(path, city = null) {
    const url = `https://${RAPID_API_HOST}${path}`
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': RAPID_API_KEY,
            'x-rapidapi-host': RAPID_API_HOST,
            'Content-Type': 'application/json'
        }
    }
    if (city) {
        options.headers.city = city
    }

    const response = await fetch(url, options)
    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`RapidAPI Error [${response.status}]: ${errorText}`)
    }
    return await response.json()
}

export async function GET(request) {
    return await syncFuel(request)
}

export async function POST(request) {
    return await syncFuel(request)
}

async function syncFuel(request) {
    try {
        console.log(`[CRON-V2] Starting Fuel Sync V2 Job...`)

        // 1. Fetch all city names for petrol and diesel
        console.log(`[CRON-V2] Fetching city lists...`)
        let petrolRes = []
        let dieselRes = []

        try {
            petrolRes = await fetchFromRapid('/petrol_price_india_all_city_names/')
            dieselRes = await fetchFromRapid('/diesel_price_india_all_city_names/')
        } catch (err) {
            console.error(`[CRON-V2] Error fetching city lists:`, err.message)
            return errorResponse(`Failed to fetch city lists: ${err.message}`, 500)
        }

        // Debug response shape
        console.log(`[CRON-V2] Petrol Res Type: ${typeof petrolRes}, IsArray: ${Array.isArray(petrolRes)}`)

        // Extract arrays robustly (Handle { cities: [] }, { data: [] }, or just [])
        const getArray = (res) => {
            if (Array.isArray(res)) return res
            if (res && typeof res === 'object') {
                return res.cities || res.data || res.all_city_names || Object.values(res).find(v => Array.isArray(v)) || []
            }
            return []
        }

        const petrolCities = getArray(petrolRes)
        const dieselCities = getArray(dieselRes)

        // Merge into a unique list
        const allCities = Array.from(new Set([...petrolCities, ...dieselCities]))
        console.log(`[CRON-V2] Found ${allCities.length} unique cities to update.`)

        if (allCities.length === 0) {
            console.error(`[CRON-V2] No cities extracted. PetrolRes snippet:`, JSON.stringify(petrolRes).substring(0, 200))
            return errorResponse('No cities found to sync.', 500)
        }

        let successCount = 0

        // 2. Iterate and fetch specific prices with sequential delay
        for (let i = 0; i < allCities.length; i++) {
            const cityName = allCities[i]
            if (!cityName) continue

            try {
                // Sequential Rate Limiting (500ms delay)
                await new Promise(resolve => setTimeout(resolve, 500))

                console.log(`[CRON-V2] Fetching: ${cityName} (${i + 1}/${allCities.length})`)

                // Fetch Petrol & Diesel values (API returns: { "cityName": "108.83", ... })
                const petrolData = await fetchFromRapid('/petrol_price_india_city_value/', cityName)
                const dieselData = await fetchFromRapid('/diesel_price_india_city_value/', cityName)

                // Use the city name as the dynamic key to extract the price
                const petrolPriceRaw = petrolData[cityName]
                const dieselPriceRaw = dieselData[cityName]

                const petrolPrice = petrolPriceRaw ? parseFloat(petrolPriceRaw) : null
                const dieselPrice = dieselPriceRaw ? parseFloat(dieselPriceRaw) : null

                if (petrolPrice || dieselPrice) {
                    const recordToSave = {
                        country: 'India',
                        city: cityName,
                        petrol_price: petrolPrice,
                        diesel_price: dieselPrice,
                        updated_at: new Date().toISOString()
                    }

                    // Upsert into fuel_prices keyed by city name
                    const { error: dbErr } = await supabaseAdmin
                        .from('fuel_prices')
                        .upsert([recordToSave], { onConflict: 'city' })

                    if (dbErr) {
                        console.error(`[CRON-V2] ❌ Database error for ${cityName}:`, dbErr.message)
                    } else {
                        successCount++
                        console.log(`[CRON-V2] ✅ Saved: ${cityName} - P: ₹${petrolPrice}, D: ₹${dieselPrice}`)
                    }
                } else {
                    console.warn(`[CRON-V2] ⚠️ No valid prices found for ${cityName}. Data:`, { petrolData, dieselData })
                }

            } catch (err) {
                console.error(`[CRON-V2] ❌ Error processing city ${cityName}:`, err.message)
            }

            // Safety break for Vercel timeouts (300s limit)
            // If we've been running too long, we might want to stop early if it's a huge list
        }

        console.log(`[CRON-V2] Sync completed. Successfully updated ${successCount} cities.`)

        return successResponse(`Fuel sync (V2) completed over ${successCount} cities.`, {
            synced_count: successCount
        })

    } catch (err) {
        console.error('[CRON-V2] Global Sync Error:', err)
        return errorResponse('Internal Server Error in Fuel Sync V2', 500)
    }
}
