export const maxDuration = 300 // Allow Vercel up to 5 minutes

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { successResponse, errorResponse } from '@/lib/apiResponse'

const RAPID_API_KEY = process.env.RAPID_API_KEY || "d06f069811msh4d53a50162222c8p168875jsn3d322a6786ff"

// Utility to retry fetches robustly if RapidAPI randomly drops our connection
async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const controller = new AbortController()
            const id = setTimeout(() => controller.abort(), 10000) // 10s strict timeout

            const res = await fetch(url, { ...options, signal: controller.signal })
            clearTimeout(id)

            if (res.ok) return res

            console.log(`[CRON] Attempt ${i + 1}/${maxRetries} failed with status ${res.status}. Retrying...`)
        } catch (error) {
            console.log(`[CRON] Attempt ${i + 1}/${maxRetries} threw error: ${error.message}. Retrying...`)
        }

        // Exponential backoff: Wait 2s, then 4s, etc.
        await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i)))
    }
    throw new Error(`Failed to fetch from RapidAPI after ${maxRetries} attempts.`)
}

export async function POST(request) {
    try {
        console.log(`[CRON] Starting Fuel Sync Job...`)

        // 1. Fetch cities from local DB first to save external hits
        let { data: localCities, error: citiesDbErr } = await supabaseAdmin.from('fuel_cities').select('*')
        if (citiesDbErr) {
            console.error(`[CRON] Error reading fuel_cities table:`, citiesDbErr.message)
        }
        let cityIds = localCities || []
        console.log(`[CRON] Found ${cityIds.length} cities in local DB.`)

        // If local DB is empty, hit RapidAPI to build the master list and cache it
        if (cityIds.length === 0) {
            console.log(`[CRON] No cities found in local DB. Fetching master list from RapidAPI...`)

            let citiesRes
            try {
                citiesRes = await fetchWithRetry(
                    'https://daily-fuel-prices-update-india.p.rapidapi.com/car/v2/fuel/cities',
                    {
                        headers: {
                            "X-RapidAPI-Key": RAPID_API_KEY,
                            "X-RapidAPI-Host": "daily-fuel-prices-update-india.p.rapidapi.com"
                        }
                    }
                )
            } catch (err) {
                return errorResponse(err.message, 500)
            }

            if (!citiesRes.ok) return errorResponse('Failed to fetch cities from RapidAPI', 500)

            const citiesData = await citiesRes.json()
            console.log(`[CRON] RapidAPI cities response keys:`, Object.keys(citiesData))
            cityIds = citiesData.data || citiesData.cities || []

            // Log the first city object to understand the shape
            if (cityIds.length > 0) {
                console.log(`[CRON] First city object from RapidAPI:`, JSON.stringify(cityIds[0]))
                console.log(`[CRON] Total cities from RapidAPI: ${cityIds.length}`)

                // Bulk insert them into our local cache
                const uniqueCitiesMap = new Map()
                cityIds.forEach(c => {
                    const id = (c.id || c.cityId || c._id || '').toString()
                    const name = c.name || c.city || c.cityName || ''
                    if (id && name && !uniqueCitiesMap.has(id)) {
                        uniqueCitiesMap.set(id, {
                            id,
                            name,
                            state_name: c.stateName || c.state || c.stateId || null
                        })
                    }
                })

                const formatCities = Array.from(uniqueCitiesMap.values())

                console.log(`[CRON] Formatted ${formatCities.length} unique cities for insert. First:`, JSON.stringify(formatCities[0]))

                const { error: citiesInsertErr } = await supabaseAdmin.from('fuel_cities').upsert(formatCities, { onConflict: 'id' })
                if (citiesInsertErr) {
                    console.error(`[CRON] ❌ FAILED to save cities to DB:`, citiesInsertErr.message, citiesInsertErr.details)
                } else {
                    console.log(`[CRON] ✅ Successfully saved ${formatCities.length} cities to fuel_cities table!`)
                }
            } else {
                console.log(`[CRON] ⚠️ RapidAPI returned empty cities array!`)
            }
        } else {
            console.log(`[CRON] Using ${cityIds.length} cached cities from local DB.`)
        }

        if (!Array.isArray(cityIds) || cityIds.length === 0) {
            return errorResponse('No cities available to sync.', 500)
        }

        // 2. Fetch prices sequentially and INSTANTLY save to DB so progress isn't lost!
        let successCount = 0

        for (let i = 0; i < cityIds.length; i++) {
            const cityDef = cityIds[i]
            const cityId = cityDef.id || cityDef.cityId
            const cityName = cityDef.name || cityDef.city
            const stateName = cityDef.stateName || cityDef.state_name || cityDef.state || null

            if (!cityId || !cityName) continue

            try {
                // Abort request if it hangs
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 8000)

                const rapidRes = await fetch(
                    `https://daily-fuel-prices-update-india.p.rapidapi.com/car/v2/fuel/prices?cityId=${cityId}`,
                    {
                        signal: controller.signal,
                        headers: {
                            "X-RapidAPI-Key": RAPID_API_KEY,
                            "X-RapidAPI-Host": "daily-fuel-prices-update-india.p.rapidapi.com"
                        }
                    }
                )
                clearTimeout(timeoutId)

                if (rapidRes.ok) {
                    const data = await rapidRes.json()

                    // Log first response shape to debug
                    if (i === 0) {
                        console.log(`[CRON] First price response keys:`, Object.keys(data))
                        console.log(`[CRON] First price data sample:`, JSON.stringify(data).substring(0, 500))
                    }

                    // RapidAPI returns: { data: { fuelPrice: { petrol: "109.63", diesel: "97.71", ... } } }
                    const fuelPrice = data?.data?.fuelPrice

                    if (fuelPrice) {
                        const recordToSave = {
                            country: 'India',
                            state: stateName,
                            city: cityName,
                            city_id: cityId.toString(),
                            petrol_price: fuelPrice.petrol ? parseFloat(fuelPrice.petrol) : null,
                            diesel_price: fuelPrice.diesel ? parseFloat(fuelPrice.diesel) : null,
                            cng_price: fuelPrice.cngPrice ? parseFloat(fuelPrice.cngPrice) : null,
                            updated_at: new Date()
                        }

                        // INSTANTLY SAVE THIS RECORD TO DB!
                        const { error: dbErr } = await supabaseAdmin
                            .from('fuel_prices')
                            .upsert([recordToSave], { onConflict: 'city' })

                        if (dbErr) {
                            console.error(`[CRON] ❌ Failed to save ${cityName} to DB:`, dbErr.message)
                        } else {
                            successCount++
                            const cngLog = fuelPrice.cngPrice ? `, CNG: ₹${fuelPrice.cngPrice}` : ''
                            console.log(`[CRON] ✅ Saved: ${cityName} - Petrol: ₹${fuelPrice.petrol}, Diesel: ₹${fuelPrice.diesel}${cngLog} (${successCount}/${cityIds.length})`)
                        }
                    } else {
                        if (i < 3) console.log(`[CRON] ⚠️ No fuelPrice object for ${cityName}. Response:`, JSON.stringify(data).substring(0, 200))
                    }
                } else {
                    console.log(`[CRON] ❌ RapidAPI returned ${rapidRes.status} for ${cityName}`)
                }
            } catch (err) {
                console.error(`[CRON] ❌ Skipping ${cityName} due to timeout/error.`)
            }

            // Strict 500ms delay between EACH city
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        console.log(`[CRON] Finished fetching. Successfully saved ${successCount} records to Supabase.`)

        return successResponse(`Fuel sync completed over ${successCount} cities.`, {
            synced_count: successCount
        })

    } catch (err) {
        console.error('CRON Fuel Sync Error:', err)
        return errorResponse('Internal Server Error inside Cron', 500)
    }
}
