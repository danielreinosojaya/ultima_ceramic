import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_ACCESS_EXPIRY = '15m';
const JWT_REFRESH_EXPIRY = '7d';

const createAttempts = new Map<string, { count: number; blockUntil: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Rate limiter
 */
function checkRateLimit(identifier: string): { allowed: boolean; message?: string } {
    const now = Date.now();
    const attempt = createAttempts.get(identifier);

    if (attempt) {
        if (attempt.blockUntil > now) {
            const minutesLeft = Math.ceil((attempt.blockUntil - now) / 60000);
            return { 
                allowed: false, 
                message: `Demasiados intentos. Intenta de nuevo en ${minutesLeft} minuto${minutesLeft > 1 ? 's' : ''}.` 
            };
        }

        if (attempt.blockUntil <= now) {
            createAttempts.delete(identifier);
        }
    }

    return { allowed: true };
}

/**
 * Log auth event
 */
async function logAuthEvent(params: {
    email: string;
    eventType: 'session_create_success' | 'session_create_failed';
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
    }
}

/**
 * Generate JWT tokens
 */
function generateTokens(payload: { email: string; sessionName: string; sessionId: string }) {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
    const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });
    
    return { accessToken, refreshToken };
}

/**
 * POST /api/auth/create-session
 * 
 * Create a new client session (without existing booking)
 * 
 * Body: { email: string, fullName: string }
 * 
 * Returns: JWT tokens + session info
 * 
 * This allows NEW clients to create a session and then create bookings
 * (as opposed to logging in with existing booking code)
 * 
 * Security:
 * - Rate limiting (5 attempts = 15min block)
 * - Email validation
 * - Creates entry in sessions table (new table)
 * - JWT tokens (15min access, 7 day refresh)
 * - httpOnly cookies
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { email, fullName } = req.body;

    if (!email || !fullName) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email y nombre completo requeridos' 
        });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email inválido' 
        });
    }

    // Validate name
    if (fullName.trim().length < 2) {
        return res.status(400).json({ 
            success: false, 
            error: 'Nombre debe tener al menos 2 caracteres' 
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
            eventType: 'session_create_failed',
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
        // Check if email already has an active session or booking
        const { rows: existing } = await sql`
            SELECT id FROM bookings 
            WHERE user_info->>'email' = ${identifier}
            AND status IN ('confirmed', 'active', 'pending')
            LIMIT 1
        `;

        if (existing.length > 0) {
            // User already has a booking - should use login instead
            return res.status(400).json({ 
                success: false, 
                error: 'Este email ya tiene una reserva. Usa "Acceder" en su lugar.' 
            });
        }

        // Create session entry (no booking yet)
        // We'll store it in a new 'client_sessions' table or just use JWT
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Generate JWT tokens (with session info, not booking info)
        const { accessToken, refreshToken } = generateTokens({
            email: identifier,
            sessionName: fullName,
            sessionId
        });

        // Log successful session creation
        await logAuthEvent({
            email: identifier,
            eventType: 'session_create_success',
            ipAddress,
            userAgent,
            metadata: { 
                fullName,
                sessionId
            }
        });

        // Set httpOnly cookies
        res.setHeader('Set-Cookie', [
            `accessToken=${accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${15 * 60}`,
            `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`
        ]);

        // Return success
        return res.status(200).json({
            success: true,
            accessToken,
            session: {
                id: sessionId,
                email: identifier,
                fullName,
                isNewSession: true,
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[AUTH CREATE-SESSION] Error:', error);

        // Check if it's a duplicate email error
        if (error instanceof Error && error.message.includes('unique')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Este email ya está registrado' 
            });
        }

        await logAuthEvent({
            email: identifier,
            eventType: 'session_create_failed',
            ipAddress,
            userAgent,
            metadata: { reason: 'server_error', error: error instanceof Error ? error.message : String(error) }
        });

        return res.status(500).json({ 
            success: false, 
            error: 'Error al crear sesión. Por favor intenta de nuevo.' 
        });
    }
}
