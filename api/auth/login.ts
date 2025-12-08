import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_ACCESS_EXPIRY = '15m'; // 15 minutes
const JWT_REFRESH_EXPIRY = '7d'; // 7 days

// Rate limiting: In-memory store (resets on serverless cold start)
const loginAttempts = new Map<string, { count: number; blockUntil: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Rate limiter for login attempts
 * Blocks after 5 failed attempts for 15 minutes
 */
function checkRateLimit(identifier: string): { allowed: boolean; message?: string } {
    const now = Date.now();
    const attempt = loginAttempts.get(identifier);

    if (attempt) {
        // Check if still blocked
        if (attempt.blockUntil > now) {
            const minutesLeft = Math.ceil((attempt.blockUntil - now) / 60000);
            return { 
                allowed: false, 
                message: `Demasiados intentos fallidos. Intenta de nuevo en ${minutesLeft} minuto${minutesLeft > 1 ? 's' : ''}.` 
            };
        }

        // Reset if block expired
        if (attempt.blockUntil <= now) {
            loginAttempts.delete(identifier);
        }
    }

    return { allowed: true };
}

/**
 * Record failed login attempt
 */
function recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    const attempt = loginAttempts.get(identifier);

    if (!attempt) {
        loginAttempts.set(identifier, { count: 1, blockUntil: 0 });
        return;
    }

    attempt.count += 1;

    if (attempt.count >= MAX_ATTEMPTS) {
        attempt.blockUntil = now + BLOCK_DURATION_MS;
        console.warn(`[AUTH] Rate limit triggered for ${identifier}. Blocked until ${new Date(attempt.blockUntil).toISOString()}`);
    }
}

/**
 * Clear login attempts on success
 */
function clearAttempts(identifier: string): void {
    loginAttempts.delete(identifier);
}

/**
 * Log authentication event to database
 */
async function logAuthEvent(params: {
    email: string;
    eventType: 'login_success' | 'login_failed' | 'logout' | 'refresh' | 'recovery_request' | 'recovery_verify';
    ipAddress: string;
    userAgent: string;
    metadata?: Record<string, any>;
}): Promise<void> {
    try {
        await sql`
            INSERT INTO auth_events (email, event_type, ip_address, user_agent, metadata, created_at)
            VALUES (
                ${params.email},
                ${params.eventType},
                ${params.ipAddress},
                ${params.userAgent},
                ${JSON.stringify(params.metadata || {})},
                NOW()
            )
        `;
    } catch (error) {
        console.error('[AUTH] Failed to log event:', error);
        // Don't throw - logging failure shouldn't block auth flow
    }
}

/**
 * Generate JWT tokens
 */
function generateTokens(payload: { email: string; bookingCode: string; bookingId: string }) {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
    const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });
    
    return { accessToken, refreshToken };
}

/**
 * POST /api/auth/login
 * 
 * Client login endpoint with JWT authentication
 * 
 * Supports two flows:
 * 1. Old: { email, bookingCode } - backward compatible
 * 2. New: { email, bookingId } - preferred for multiple bookings
 * 
 * Body: { email: string, bookingCode?: string, bookingId?: number }
 * Returns: { success: boolean, accessToken: string, booking: object }
 * 
 * Security features:
 * - Rate limiting (5 attempts = 15min block)
 * - JWT tokens (15min access, 7 day refresh)
 * - httpOnly cookies (XSS protection)
 * - Audit logging
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only POST allowed
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { email, bookingCode, bookingId } = req.body;
    
    // Validation - must have email + either bookingCode OR bookingId
    if (!email || (!bookingCode && !bookingId)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email y código de reserva (o ID) requeridos' 
        });
    }

    const identifier = email.toLowerCase().trim();
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Rate limit check
    const rateLimitCheck = checkRateLimit(identifier);
    if (!rateLimitCheck.allowed) {
        await logAuthEvent({
            email: identifier,
            eventType: 'login_failed',
            ipAddress,
            userAgent,
            metadata: { reason: 'rate_limited' }
        });

        return res.status(429).json({ 
            success: false, 
            error: rateLimitCheck.message 
        });
    }

    try {
        // Query booking by email + bookingId (new) or email + code (legacy)
        let query;
        if (bookingId) {
            query = sql`
                SELECT * FROM bookings 
                WHERE user_info->>'email' = ${identifier} 
                AND id = ${bookingId}
                AND status IN ('confirmed', 'active', 'pending')
                LIMIT 1
            `;
        } else {
            query = sql`
                SELECT * FROM bookings 
                WHERE user_info->>'email' = ${identifier} 
                AND booking_code = ${bookingCode.toUpperCase()}
                AND status IN ('confirmed', 'active', 'pending')
                LIMIT 1
            `;
        }

        const { rows } = await query;

        if (rows.length === 0) {
            // Record failed attempt
            recordFailedAttempt(identifier);

            await logAuthEvent({
                email: identifier,
                eventType: 'login_failed',
                ipAddress,
                userAgent,
                metadata: { 
                    reason: 'invalid_credentials', 
                    method: bookingId ? 'bookingId' : 'bookingCode',
                    bookingCode,
                    bookingId
                }
            });

            return res.status(401).json({ 
                success: false, 
                error: 'Email o reserva no encontrada. ¿Olvidaste tu código? Intenta el formulario de recuperación.' 
            });
        }

        const booking = rows[0];

        // Generate JWT tokens
        const { accessToken, refreshToken } = generateTokens({
            email: identifier,
            bookingCode: bookingCode.toUpperCase(),
            bookingId: booking.id
        });

        // Clear rate limit attempts on success
        clearAttempts(identifier);

        // Log successful login
        await logAuthEvent({
            email: identifier,
            eventType: 'login_success',
            ipAddress,
            userAgent,
            metadata: { bookingId: booking.id }
        });

        // Set httpOnly cookies (XSS-proof)
        res.setHeader('Set-Cookie', [
            `accessToken=${accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${15 * 60}`,
            `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`
        ]);

        // Return success with booking data
        return res.status(200).json({
            success: true,
            accessToken, // Also return in body for client-side logic (optional)
            booking: {
                id: booking.id,
                bookingCode: booking.booking_code,
                userInfo: booking.user_info,
                slots: booking.slots,
                packageType: booking.package_type,
                status: booking.status,
                createdAt: booking.created_at
            }
        });

    } catch (error) {
        console.error('[AUTH LOGIN] Error:', error);

        await logAuthEvent({
            email: identifier,
            eventType: 'login_failed',
            ipAddress,
            userAgent,
            metadata: { reason: 'server_error', error: error instanceof Error ? error.message : String(error) }
        });

        return res.status(500).json({ 
            success: false, 
            error: 'Error del servidor. Por favor intenta de nuevo.' 
        });
    }
}
