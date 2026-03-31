/**
 * Hash Utility Functions
 * SHA-256 hashing for photo and receipt deduplication.
 */
import { createHash } from 'crypto'

/**
 * Generate a SHA-256 hash from a file buffer.
 * Used for photo and receipt deduplication.
 * @param {Buffer} buffer - File buffer
 * @returns {string} Hex hash string
 */
export function generateFileHash(buffer) {
    if (!buffer || buffer.length === 0) return null
    return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Generate a hash specifically for receipt deduplication.
 * Same as file hash but named distinctly for clarity.
 */
export function generateReceiptHash(buffer) {
    return generateFileHash(buffer)
}

/**
 * Generate a hash for photo deduplication.
 */
export function generatePhotoHash(buffer) {
    return generateFileHash(buffer)
}
