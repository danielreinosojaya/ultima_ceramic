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

// Recovery codes: In-memory store
const recoveryCodes = new Map<string, { code: string; expiresAt: number; bookingId?: string }>();
const CODE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Consolidated Auth Endpoint
 * 
 * Handles:
 * - ?action=login - JWT login
 * - ?action=refresh - Token refresh
 * - ?action=logout - Session logout
 * - ?action=list-bookings - List user bookings
 * - ?action=create-session - Create new user session
 * - ?action=request-recovery - Request recovery code
 * - ?action=verify-recovery - Verify recovery code
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = req.query.action as string;

    if (!action) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing action parameter' 
        });
    }

    // Route to appropriate handler
    switch (action) {
        case 'login':
            return handleLogin(req, res);
        case 'refresh':
            return handleRefresh(req, res);
        case 'logout':
            return handleLogout(req, res);
        case 'list-bookings':
            return handleListBookings(req, res);
        case 'create-session':
            return handleCreateSession(req, res);
        case 'request-recovery':
            return handleRequestRecovery(req, res);
        case 'verify-recovery':
            return handleVerifyRecovery(req, res);
        default:
            return res.status(400).json({ 
                success: false, 
                error: `Unknown action: ${action}` 
            });
    }
}

// ============================================
// RATE LIMITING
// ============================================

function checkRateLimit(identifier: string): { allowed: boolean; message?: string } {
    const now = Date.now();
    const attempt = loginAttempts.get(identifier);

    if (attempt) {
        if (attempt.blockUntil > now) {
            const minutesLeft = Math.ceil((attempt.blockUntil - now) / 60000);
            return { 
                allowed: false, 
                message: `Demasiados intentos fallidos. Intenta de nuevo en ${minutesLeft} minuto${minutesLeft > 1 ? 's' : ''}.` 
            };
        }

        if (attempt.blockUntil <= now) {
            loginAttempts.delete(identifier);
        }
    }

    return { allowed: true };
}

function recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    const attempt = loginAttempts.get(identifier);

    if (!attempt) {
        loginAttempts.set(identifier, { count: 1, blockUntil: 0 });
    } else {
        attempt.count++;
        if (attempt.count >= MAX_ATTEMPTS) {
            attempt.blockUntil = now + BLOCK_DURATION_MS;
        }
        loginAttempts.set(identifier, attempt);
    }
}

// ============================================
// HANDLERS
// ============================================

async function handleLogin(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { email, bookingCode, bookingId } = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, error: 'Email requerido' });
    }

    const identifier = email.toLowerCase().trim();

    // Check rate limiting
    const rateLimit = checkRateLimit(identifier);
    if (!rateLimit.allowed) {
        await logAuthEvent('login_failed', identifier, { reason: 'rate_limited', message: rateLimit.message });
        return res.status(429).json({ success: false, error: rateLimit.message });
    }

    try {
        // Query booking by email and (bookingCode OR bookingId)
        let query;
        let params;

        if (bookingId) {
            query = `SELECT id, booking_code, user_info, product, slots FROM bookings WHERE id = $1 AND (user_info->>'email')::text = $2`;
            params = [bookingId, identifier];
        } else if (bookingCode) {
            query = `SELECT id, booking_code, user_info, product, slots FROM bookings WHERE booking_code = $1 AND (user_info->>'email')::text = $2`;
            params = [bookingCode, identifier];
        } else {
            recordFailedAttempt(identifier);
            await logAuthEvent('login_failed', identifier, { reason: 'missing_code' });
            return res.status(400).json({ success: false, error: 'Código de reserva requerido' });
        }

        const { rows } = await sql.query(query, params);

        if (rows.length === 0) {
            recordFailedAttempt(identifier);
            await logAuthEvent('login_failed', identifier, { reason: 'invalid_credentials' });
            return res.status(401).json({ success: false, error: 'Email o código de reserva inválido' });
        }

        const booking = rows[0];

        // Generate JWT tokens
        const accessToken = jwt.sign(
            { email: identifier, bookingId: booking.id, bookingCode: booking.booking_code },
            JWT_SECRET,
            { expiresIn: JWT_ACCESS_EXPIRY }
        );

        const refreshToken = jwt.sign(
            { email: identifier, bookingId: booking.id, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: JWT_REFRESH_EXPIRY }
        );

        // Set httpOnly cookies
        res.setHeader('Set-Cookie', [
            `accessToken=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`,
            `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
        ]);

        // Clear rate limit on success
        loginAttempts.delete(identifier);

        // Log success
        await logAuthEvent('login_success', identifier, { bookingId: booking.id, bookingCode: booking.booking_code });

        return res.status(200).json({
            success: true,
            booking: {
                id: booking.id,
                bookingCode: booking.booking_code,
                userInfo: booking.user_info,
                product: booking.product,
                slots: booking.slots
            }
        });
    } catch (error) {
        console.error('[AUTH LOGIN] Error:', error);
        recordFailedAttempt(identifier);
        return res.status(500).json({ success: false, error: 'Error al procesar login' });
    }
}

async function handleRefresh(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ success: false, error: 'No refresh token' });
        }

        const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

        const newAccessToken = jwt.sign(
            { email: decoded.email, bookingId: decoded.bookingId, bookingCode: decoded.bookingCode },
            JWT_SECRET,
            { expiresIn: JWT_ACCESS_EXPIRY }
        );

        res.setHeader('Set-Cookie', `accessToken=${newAccessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[AUTH REFRESH] Error:', error);
        return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }
}

async function handleLogout(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const accessToken = req.cookies.accessToken;
        const decoded = jwt.verify(accessToken, JWT_SECRET) as any;

        // Clear cookies
        res.setHeader('Set-Cookie', [
            `accessToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
            `refreshToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
        ]);

        await logAuthEvent('logout', decoded.email, { bookingId: decoded.bookingId });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[AUTH LOGOUT] Error:', error);
        return res.status(500).json({ success: false, error: 'Error during logout' });
    }
}

async function handleListBookings(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, error: 'Email requerido' });
    }

    const identifier = email.toLowerCase().trim();

    try {
        const { rows } = await sql`
            SELECT 
                id,
                booking_code,
                user_info,
                product_id,
                product_type,
                product,
                slots,
                booking_date,
                created_at,
                is_paid
            FROM bookings
            WHERE (user_info->>'email')::text = ${identifier}
            ORDER BY created_at DESC
        `;

        if (rows.length === 0) {
            return res.status(200).json({
                success: true,
                bookings: [],
                message: 'No se encontraron reservas para este email'
            });
        }

        const bookings = rows.map((booking: any) => {
            const productInfo = booking.product || {};

            return {
                id: booking.id,
                bookingCode: booking.booking_code,
                userInfo: booking.user_info,
                productId: booking.product_id,
                productType: booking.product_type,
                product: {
                    name: productInfo.name || booking.product_type || 'Experiencia',
                    type: booking.product_type,
                    ...(productInfo.duration && { duration: productInfo.duration }),
                    ...(productInfo.durationHours && { durationHours: productInfo.durationHours }),
                },
                slots: booking.slots,
                bookingDate: booking.booking_date,
                createdAt: booking.created_at,
                isPaid: booking.is_paid
            };
        });

        return res.status(200).json({
            success: true,
            bookings,
            count: bookings.length
        });
    } catch (error) {
        console.error('[AUTH LIST-BOOKINGS] Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Error al obtener reservas. Por favor intenta de nuevo.'
        });
    }
}

async function handleCreateSession(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { email, firstName, lastName } = req.body;

    if (!email || typeof email !== 'string' || !firstName || typeof firstName !== 'string') {
        return res.status(400).json({ success: false, error: 'Email y nombre requeridos' });
    }

    if (firstName.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'El nombre debe tener al menos 2 caracteres' });
    }

    const identifier = email.toLowerCase().trim();
    const name = firstName.trim();

    try {
        // For now, just create JWT session without DB persistence
        // (Can be enhanced to store sessions in DB later)

        const accessToken = jwt.sign(
            { email: identifier, sessionType: 'new_user', userName: name },
            JWT_SECRET,
            { expiresIn: JWT_ACCESS_EXPIRY }
        );

        const refreshToken = jwt.sign(
            { email: identifier, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: JWT_REFRESH_EXPIRY }
        );

        res.setHeader('Set-Cookie', [
            `accessToken=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`,
            `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
        ]);

        await logAuthEvent('create_session', identifier, { userName: name });

        return res.status(200).json({ success: true, message: 'Sesión creada exitosamente' });
    } catch (error) {
        console.error('[AUTH CREATE-SESSION] Error:', error);
        return res.status(500).json({ success: false, error: 'Error al crear sesión' });
    }
}

async function handleRequestRecovery(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, error: 'Email requerido' });
    }

    const identifier = email.toLowerCase().trim();

    try {
        // Generate 6-digit code
        const code = Math.random().toString().slice(2, 8).padStart(6, '0');
        const expiresAt = Date.now() + CODE_EXPIRY_MS;

        // Store in memory (in production, use database)
        recoveryCodes.set(identifier, { code, expiresAt });

        // Log the code to console (in production, send via email)
        console.log(`[RECOVERY CODE] Email: ${identifier}, Code: ${code}, Expires in 15 minutes`);

        await logAuthEvent('recovery_request', identifier, { code });

        return res.status(200).json({ 
            success: true, 
            message: 'Código de recuperación enviado (revisa consola en dev)',
            code: process.env.NODE_ENV === 'development' ? code : undefined
        });
    } catch (error) {
        console.error('[AUTH REQUEST-RECOVERY] Error:', error);
        return res.status(500).json({ success: false, error: 'Error al solicitar recuperación' });
    }
}

async function handleVerifyRecovery(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ success: false, error: 'Email y código requeridos' });
    }

    const identifier = email.toLowerCase().trim();

    try {
        const recoveryData = recoveryCodes.get(identifier);

        if (!recoveryData) {
            return res.status(400).json({ success: false, error: 'No se encontró solicitud de recuperación' });
        }

        if (recoveryData.expiresAt < Date.now()) {
            recoveryCodes.delete(identifier);
            return res.status(400).json({ success: false, error: 'El código ha expirado' });
        }

        if (recoveryData.code !== code.toString()) {
            return res.status(400).json({ success: false, error: 'Código inválido' });
        }

        // Get booking code(s) for this email
        const { rows } = await sql`
            SELECT id, booking_code FROM bookings 
            WHERE (user_info->>'email')::text = ${identifier} 
            LIMIT 1
        `;

        recoveryCodes.delete(identifier);

        if (rows.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Código verificado, pero no se encontraron reservas',
                bookingCode: null
            });
        }

        await logAuthEvent('recovery_verify', identifier, { bookingCode: rows[0].booking_code });

        return res.status(200).json({
            success: true,
            message: 'Código verificado',
            bookingCode: rows[0].booking_code
        });
    } catch (error) {
        console.error('[AUTH VERIFY-RECOVERY] Error:', error);
        return res.status(500).json({ success: false, error: 'Error al verificar código' });
    }
}

// ============================================
// UTILITIES
// ============================================

async function logAuthEvent(
    eventType: string,
    email: string,
    metadata: any = {}
): Promise<void> {
    try {
        await sql`
            INSERT INTO auth_events (email, event_type, metadata)
            VALUES (${email}, ${eventType}, ${JSON.stringify(metadata)})
        `;
    } catch (error) {
        console.error('[AUTH LOG] Error logging event:', error);
        // Don't throw, just log
    }
}
