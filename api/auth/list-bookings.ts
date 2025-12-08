import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

/**
 * POST /api/auth/list-bookings
 * 
 * List all active bookings for a client by email
 * Used in 2-step login flow:
 * Step 1: Enter email
 * Step 2: Select booking from list
 * 
 * Body: { email: string }
 * Returns: { success: boolean, bookings: array }
 * 
 * Bookings include:
 * - id, booking_code, user_info
 * - product info (type, name)
 * - slots info
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ 
            success: false, 
            error: 'Email requerido' 
        });
    }

    const identifier = email.toLowerCase().trim();

    try {
        // Query all bookings for this email
        // Structure: bookings table with JSONB fields for user_info, slots, product
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

        // Transform to client-friendly format
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
        console.error('[AUTH LIST-BOOKINGS] Full error details:', JSON.stringify(error, null, 2));

        return res.status(500).json({ 
            success: false, 
            error: 'Error al obtener reservas. Por favor intenta de nuevo.',
            debug: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
        });
    }
}
