import { processDueScheduledGiftcards } from './utils/giftcardDelivery.js';

export const runtime = 'nodejs';

/**
 * Cron: envía giftcards con scheduled_send_at vencido.
 * Vercel invoca GET cada 5 min (vercel.json). Requiere Authorization: Bearer CRON_SECRET.
 */
export default async function handler(req: { method?: string; headers?: Record<string, string | undefined> }, res: { status: (n: number) => { json: (b: unknown) => void } }) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers?.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[cron-send-scheduled-giftcards] Unauthorized');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await processDueScheduledGiftcards(25);

        if (result.processed > 0) {
            console.log(
                `[cron-send-scheduled-giftcards] processed=${result.processed} sent=${result.sent} failed=${result.failed} skipped=${result.skipped}`,
                result.details
            );
        } else {
            console.log('[cron-send-scheduled-giftcards] No hay giftcards programadas pendientes');
        }

        return res.status(200).json({
            success: true,
            ...result,
            message:
                result.sent > 0
                    ? `${result.sent} giftcard(s) enviada(s) al destinatario`
                    : 'Sin envíos programados pendientes',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[cron-send-scheduled-giftcards] Error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
