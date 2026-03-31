/**
 * GPS/Geo Utility Functions
 * Haversine formula for distance calculation and radius checks.
 */

// Radius constants in meters
export const GPS_RADIUS = {
    FUEL_VERIFY: 100,       // Fuel verification: within 100m
    TOILET_VERIFY: 50,      // Toilet verification: within 50m (stricter)
    RECEIPT_GPS: 300,        // Receipt GPS match: within 300m
    EVENT_CHECKIN: 200,      // Event check-in: within 200m
    COOLDOWN_NOTIFY: 2000,   // Cooldown push: within 2km
}

/**
 * Calculate distance between two GPS points using Haversine formula.
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000 // Earth's radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180

    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

/**
 * Check if a point is within a given radius of a target.
 * @returns {boolean}
 */
export function isWithinRadius(lat1, lng1, lat2, lng2, radiusMeters) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return false
    const distance = calculateDistance(lat1, lng1, lat2, lng2)
    return distance <= radiusMeters
}

/**
 * Validate GPS coordinates are reasonable (within India bounds roughly).
 */
export function isValidGPS(lat, lng) {
    if (lat == null || lng == null) return false
    // Rough India bounding box
    return lat >= 6.0 && lat <= 37.0 && lng >= 68.0 && lng <= 97.5
}
