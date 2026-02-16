import { NextResponse } from 'next/server'

/**
 * Standard API response helpers
 * Success: { status: true, message: "...", data: {...} }
 * Error:   { status: false, message: "..." }
 */

export function successResponse(message, data = null, statusCode = 200) {
    const body = { status: true, message }
    if (data !== null) body.data = data
    return NextResponse.json(body, { status: statusCode })
}

export function errorResponse(message, statusCode = 400) {
    return NextResponse.json({ status: false, message }, { status: statusCode })
}
