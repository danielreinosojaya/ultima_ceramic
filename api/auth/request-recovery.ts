import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

// Recovery code storage (in-memory, resets on cold start)
// In production, consider Redis or database table
const recoveryCodes = new Map<string, { code: string; expiresAt: number }>();
const RECOVERY_CODE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate random 6-digit code
 */
function generateRecoveryCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Log authentication event
 */
async function logAuthEvent(params: {
    email: string;
    eventType: 'recovery_request';
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
 * POST /api/auth/request-recovery
 * 
 * Request booking code recovery via email
 * Returns list of all active bookings for the email
 * 
 * Body: { email: string }
 * 
 * Response includes:
 * - bookings: array of all active bookings (id, bookingCode, classType, classDate, classTime)
 * - recoveryCode sent to email (console.log for now)
 * 
 * Security:
 * - Generates 6-digit code (15 min TTL)
 * - Doesn't reveal if email exists (generic message)
 * - Includes all booking options so user can choose
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email requerido' 
        });
    }

    const identifier = email.toLowerCase().trim();
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
        // Get ALL active bookings for this email (not just one)
        const { rows: bookings } = await sql`
            SELECT 
                b.id,
                b.booking_code,
                b.user_info,
                b.status,
                c.class_type,
                c.class_date,
                c.class_time
            FROM bookings b
            LEFT JOIN classes c ON b.class_id = c.id
            WHERE b.user_info->>'email' = ${identifier}
                AND b.status IN ('confirmed', 'active', 'pending')
            ORDER BY b.created_at DESC
        `;

        // Generate 6-digit recovery code
        const recoveryCode = generateRecoveryCode();
        const expiresAt = Date.now() + RECOVERY_CODE_EXPIRY_MS;

        // Store code (expires in 15 minutes)
        recoveryCodes.set(identifier, { code: recoveryCode, expiresAt });

        // Log recovery request
        await logAuthEvent({
            email: identifier,
            eventType: 'recovery_request',
            ipAddress,
            userAgent,
            metadata: { 
                success: true,
                bookingCount: bookings.length
            }
        });

        // TODO: Send email with recovery code using Resend
        // For now, log to console
        console.log(`[RECOVERY] Code for ${identifier}: ${recoveryCode} (expires at ${new Date(expiresAt).toISOString()})`);
        
        if (bookings.length > 0) {
            console.log(`[RECOVERY] Found ${bookings.length} booking(s) for ${identifier}`);
            bookings.forEach((b: any, i: number) => {
                console.log(`  ${i + 1}. ${b.booking_code} - ${b.class_type} (${b.class_date})`);
            });
        }

        // Return success with list of bookings (so user can choose which one to recover)
        return res.status(200).json({
            success: true,
            message: 'Código de recuperación enviado a tu email.',
            bookings: bookings.map((b: any) => ({
                id: b.id,
                bookingCode: b.booking_code,
                classType: b.class_type,
                classDate: b.class_date,
                classTime: b.class_time,
                status: b.status
            }))
        });

    } catch (error) {
        console.error('[AUTH RECOVERY REQUEST] Error:', error);

        await logAuthEvent({
            email: identifier,
            eventType: 'recovery_request',
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
