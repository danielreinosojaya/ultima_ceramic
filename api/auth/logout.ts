import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

/**
 * Log authentication event
 */
async function logAuthEvent(params: {
    email: string;
    eventType: 'logout';
    ipAddress: string;
    userAgent: string;
}): Promise<void> {
    try {
        await sql`
            INSERT INTO auth_events (email, event_type, ip_address, user_agent, metadata, created_at)
            VALUES (
                ${params.email},
                ${params.eventType},
                ${params.ipAddress},
                ${params.userAgent},
                '{}',
                NOW()
            )
        `;
    } catch (error) {
        console.error('[AUTH] Failed to log event:', error);
    }
}

/**
 * POST /api/auth/logout
 * 
 * Logout client session
 * - Clears httpOnly cookies
 * - Logs logout event
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        // Extract access token to get user email for logging
        const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        const accessToken = cookies?.accessToken;
        let email = 'unknown';

        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, JWT_SECRET) as { email: string };
                email = decoded.email;
            } catch {
                // Token invalid/expired - still proceed with logout
            }
        }

        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        // Log logout event
        await logAuthEvent({
            email,
            eventType: 'logout',
            ipAddress,
            userAgent
        });

        // Clear cookies (set Max-Age=0)
        res.setHeader('Set-Cookie', [
            `accessToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
            `refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
        ]);

        return res.status(200).json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });

    } catch (error) {
        console.error('[AUTH LOGOUT] Error:', error);

        // Still clear cookies even on error
        res.setHeader('Set-Cookie', [
            `accessToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
            `refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
        ]);

        return res.status(500).json({ 
            success: false, 
            error: 'Error al cerrar sesión' 
        });
    }
}
