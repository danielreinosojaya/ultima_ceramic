import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

// Recovery code storage (shared with request-recovery.ts)
// Note: In production, use Redis or database table for persistence
const recoveryCodes = new Map<string, { code: string; expiresAt: number }>();

/**
 * Log authentication event
 */
async function logAuthEvent(params: {
    email: string;
    eventType: 'recovery_verify';
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
 * POST /api/auth/verify-recovery
 * 
 * Verify recovery code and return booking code
 * 
 * Body: { email: string, recoveryCode: string, bookingId?: number }
 * 
 * If bookingId provided: return that specific booking code
 * If not: return the most recent booking (backward compat)
 * 
 * Security:
 * - Validates 6-digit code
 * - Checks expiration (15 min)
 * - Returns booking code on success
 * - Deletes code after use (one-time use)
 * - Can select specific booking if multiple exist
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { email, recoveryCode, bookingId } = req.body;

    if (!email || !recoveryCode) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email y código de recuperación requeridos' 
        });
    }

    const identifier = email.toLowerCase().trim();
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
        // Check if recovery code exists
        const storedCode = recoveryCodes.get(identifier);

        if (!storedCode) {
            await logAuthEvent({
                email: identifier,
                eventType: 'recovery_verify',
                ipAddress,
                userAgent,
                metadata: { reason: 'no_code_found', success: false }
            });

            return res.status(400).json({
                success: false,
                error: 'Código de recuperación inválido o expirado'
            });
        }

        // Check expiration
        if (Date.now() > storedCode.expiresAt) {
            recoveryCodes.delete(identifier);

            await logAuthEvent({
                email: identifier,
                eventType: 'recovery_verify',
                ipAddress,
                userAgent,
                metadata: { reason: 'code_expired', success: false }
            });

            return res.status(400).json({
                success: false,
                error: 'El código de recuperación ha expirado. Solicita uno nuevo.'
            });
        }

        // Verify code matches
        if (storedCode.code !== recoveryCode) {
            await logAuthEvent({
                email: identifier,
                eventType: 'recovery_verify',
                ipAddress,
                userAgent,
                metadata: { reason: 'invalid_code', success: false }
            });

            return res.status(400).json({
                success: false,
                error: 'Código de recuperación incorrecto'
            });
        }

        // Code is valid - fetch booking code
        // If bookingId provided, get specific booking; otherwise get most recent
        let query;
        if (bookingId) {
            query = sql`
                SELECT booking_code, id, user_info 
                FROM bookings 
                WHERE user_info->>'email' = ${identifier}
                    AND id = ${bookingId}
                    AND status IN ('confirmed', 'active', 'pending')
                LIMIT 1
            `;
        } else {
            query = sql`
                SELECT booking_code, id, user_info 
                FROM bookings 
                WHERE user_info->>'email' = ${identifier}
                    AND status IN ('confirmed', 'active', 'pending')
                ORDER BY created_at DESC
                LIMIT 1
            `;
        }

        const { rows } = await query;

        if (rows.length === 0) {
            await logAuthEvent({
                email: identifier,
                eventType: 'recovery_verify',
                ipAddress,
                userAgent,
                metadata: { reason: 'no_booking_found', success: false, bookingId }
            });

            return res.status(404).json({
                success: false,
                error: 'No se encontró una reserva activa para este email'
            });
        }

        const bookingCode = rows[0].booking_code;

        // Delete recovery code (one-time use)
        recoveryCodes.delete(identifier);

        // Log successful recovery
        await logAuthEvent({
            email: identifier,
            eventType: 'recovery_verify',
            ipAddress,
            userAgent,
            metadata: { success: true }
        });

        // Return booking code
        return res.status(200).json({
            success: true,
            bookingCode,
            message: 'Código de reserva recuperado exitosamente'
        });

    } catch (error) {
        console.error('[AUTH VERIFY RECOVERY] Error:', error);

        await logAuthEvent({
            email: identifier,
            eventType: 'recovery_verify',
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
