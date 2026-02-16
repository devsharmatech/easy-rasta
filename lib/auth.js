import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10)
    return bcrypt.hash(password, salt)
}

export async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash)
}

export function signJWT(payload, expiresIn = '7d') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export function verifyJWT(token) {
    try {
        return jwt.verify(token, JWT_SECRET)
    } catch (error) {
        return null
    }
}

export function getUserFromRequest(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return null
    return verifyJWT(token)
}
