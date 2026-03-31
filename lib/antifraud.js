/**
 * Anti-Fraud System
 * All validation checks for the earning engine.
 * Each check returns { valid: boolean, reason: string }
 * NEVER breaks user flow — returns validation result, caller decides.
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isWithinRadius } from '@/lib/geoUtils'

/**
 * Validate GPS proximity between user location and target location.
 */
export function checkGPS(userLat, userLng, targetLat, targetLng, radiusMeters) {
    if (!userLat || !userLng || !targetLat || !targetLng) {
        return { valid: false, reason: 'missing_gps' }
    }
    const withinRange = isWithinRadius(userLat, userLng, targetLat, targetLng, radiusMeters)
    return withinRange
        ? { valid: true, reason: null }
        : { valid: false, reason: 'gps_out_of_range' }
}

/**
 * Check if a receipt hash already exists (duplicate detection).
 */
export async function checkReceiptDuplicate(receiptHash) {
    if (!receiptHash) return { valid: false, reason: 'no_receipt_hash' }

    const { data } = await supabaseAdmin
        .from('receipt_submissions')
        .select('id')
        .eq('receipt_hash', receiptHash)
        .limit(1)

    if (data && data.length > 0) {
        return { valid: false, reason: 'duplicate_receipt' }
    }

    // Also check fuel_reports for receipt hash
    const { data: fuelData } = await supabaseAdmin
        .from('fuel_reports')
        .select('id')
        .eq('receipt_hash', receiptHash)
        .limit(1)

    if (fuelData && fuelData.length > 0) {
        return { valid: false, reason: 'duplicate_receipt' }
    }

    return { valid: true, reason: null }
}

/**
 * Check if a photo hash already exists (duplicate detection).
 */
export async function checkPhotoDuplicate(photoHash, tableName = 'fuel_reports') {
    if (!photoHash) return { valid: true, reason: null } // No hash = skip check

    const { data } = await supabaseAdmin
        .from(tableName)
        .select('id')
        .eq('photo_hash', photoHash)
        .limit(1)

    if (data && data.length > 0) {
        return { valid: false, reason: 'duplicate_photo' }
    }
    return { valid: true, reason: null }
}

/**
 * Validate odometer reading increases vs last known reading.
 */
export async function checkOdometerValid(userId, newReading) {
    if (!newReading || newReading <= 0) {
        return { valid: false, reason: 'invalid_odometer' }
    }

    const { data: user } = await supabaseAdmin
        .from('users')
        .select('last_odometer_reading')
        .eq('id', userId)
        .single()

    const lastReading = user?.last_odometer_reading || 0

    if (newReading <= lastReading) {
        return { valid: false, reason: 'odometer_not_increasing' }
    }

    return { valid: true, reason: null, lastReading }
}

/**
 * Check 24-hour cooldown for an entity (fuel bunk or toilet).
 * Ensures the same user hasn't already submitted for this entity within 24h.
 */
export async function checkCooldown(entityType, entityId, userId) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const table = entityType === 'fuel' ? 'fuel_reports' : 'toilet_reports'

    // Check if user has already submitted for this entity within 24h
    let query = supabaseAdmin
        .from(table)
        .select('id, created_at')
        .gte('created_at', twentyFourHoursAgo)

    if (entityType === 'fuel') {
        query = query.eq('bunk_place_id', entityId)
    }

    // Check both as scout and verifier
    const { data: scoutData } = await query.eq('scout_user_id', userId)

    if (scoutData && scoutData.length > 0) {
        return { valid: false, reason: 'cooldown_active' }
    }

    const { data: verifierData } = await supabaseAdmin
        .from(table)
        .select('id')
        .eq('verified_by_user_id', userId)
        .gte('created_at', twentyFourHoursAgo)

    if (verifierData && verifierData.length > 0) {
        return { valid: false, reason: 'cooldown_active' }
    }

    return { valid: true, reason: null }
}

/**
 * Check device fingerprint for fraud (same device = different user = suspicious).
 */
export async function checkDeviceFingerprint(userId, fingerprint) {
    if (!fingerprint) return { valid: true, reason: null } // No fingerprint = skip

    const { data } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('device_fingerprint', fingerprint)
        .neq('id', userId)
        .limit(1)

    if (data && data.length > 0) {
        return { valid: false, reason: 'device_fingerprint_match', matchedUserId: data[0].id }
    }
    return { valid: true, reason: null }
}

/**
 * Log a fraud flag for admin review. Does NOT block — just records.
 */
export async function logFraudFlag(userId, flagType, severity, referenceType, referenceId, details = {}) {
    try {
        await supabaseAdmin.from('fraud_flags').insert({
            user_id: userId,
            flag_type: flagType,
            severity,
            reference_type: referenceType,
            reference_id: referenceId,
            details
        })
    } catch (err) {
        console.error('[AntifraudLog] Error logging fraud flag:', err)
    }
}

/**
 * Check for rapid-fire flag behavior (3 flags within 1 hour = suspicious).
 * Returns true if suspicious.
 */
export async function checkRapidFlags(userId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count } = await supabaseAdmin
        .from('fraud_flags')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo)

    return { suspicious: (count || 0) >= 3, flagCount: count || 0 }
}
