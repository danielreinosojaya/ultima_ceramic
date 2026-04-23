import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

/**
 * Cron Job: Expirar pre-reservas sin pago
 * 
 * Vercel invoca este endpoint automáticamente cada 5 minutos (configurado en vercel.json).
 * También puede llamarse manualmente desde el frontend como fallback.
 * 
 * Seguridad: Vercel pasa el header Authorization: Bearer <CRON_SECRET> en cada invocación.
 * Peticiones sin el header correcto son rechazadas con 401.
 */
export default async function handler(req: any, res: any) {
    // Solo aceptar GET (Vercel Cron usa GET)
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validar que la llamada viene de Vercel Cron o de un caller autorizado
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[cron-expire-bookings] Unauthorized request — missing or invalid CRON_SECRET');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // UPDATE atómico: solo expira reservas que:
        // 1. Están activas (status = 'active')
        // 2. No están pagadas (is_paid = false)
        // 3. Su plazo de 2 horas ya venció (expires_at < NOW())
        // NUNCA toca reservas con is_paid = true ni status = 'confirmed'
        const { rows: expiredBookings } = await sql`
            UPDATE bookings
            SET status = 'expired'
            WHERE status = 'active'
              AND is_paid = false
              AND expires_at IS NOT NULL
              AND expires_at < NOW()
            RETURNING id, booking_code, user_info->>'email' AS customer_email
        `;

        const count = expiredBookings.length;

        if (count > 0) {
            console.log(`[cron-expire-bookings] ✅ Expired ${count} pre-reservas:`,
                expiredBookings.map((b: any) => `${b.booking_code} (${b.customer_email})`).join(', ')
            );
        } else {
            console.log('[cron-expire-bookings] No pre-reservas to expire');
        }

        // Intentar actualizar admin_tasks para auditoría (falla silenciosamente si la tabla no existe)
        try {
            const { rows: tableCheck } = await sql`
                SELECT to_regclass('public.admin_tasks') AS table_name
            `;
            if (tableCheck[0]?.table_name) {
                await sql`
                    UPDATE admin_tasks
                    SET last_executed_at = NOW(), updated_at = NOW()
                    WHERE task_name = 'expire_old_bookings'
                `;
            }
        } catch (auditErr) {
            console.warn('[cron-expire-bookings] Could not update admin_tasks (non-critical):', auditErr);
        }

        return res.status(200).json({
            success: true,
            expired: count,
            message: count > 0
                ? `${count} pre-reservas expiradas`
                : 'Sin pre-reservas pendientes de expirar',
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[cron-expire-bookings] DB error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
