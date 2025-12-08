import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_ACCESS_EXPIRY = '15m';

/**
 * POST /api/auth/refresh
 * 
 * Refresh access token using refresh token from httpOnly cookie
 * 
 * Security:
 * - Validates refresh token from cookie
 * - Issues new access token
 * - Maintains same refresh token
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        // Extract refresh token from cookie
        const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        const refreshToken = cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ 
                success: false, 
                error: 'No refresh token found' 
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_SECRET) as {
            email: string;
            bookingCode: string;
            bookingId: string;
        };

        // Generate new access token
        const newAccessToken = jwt.sign(
            { 
                email: decoded.email, 
                bookingCode: decoded.bookingCode, 
                bookingId: decoded.bookingId 
            },
            JWT_SECRET,
            { expiresIn: JWT_ACCESS_EXPIRY }
        );

        // Update access token cookie
        res.setHeader('Set-Cookie', [
            `accessToken=${newAccessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${15 * 60}`
        ]);

        return res.status(200).json({
            success: true,
            accessToken: newAccessToken
        });

    } catch (error) {
        console.error('[AUTH REFRESH] Error:', error);

        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ 
                success: false, 
                error: 'Token inválido o expirado' 
            });
        }

        return res.status(500).json({ 
            success: false, 
            error: 'Error del servidor' 
        });
    }
}
