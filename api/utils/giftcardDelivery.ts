import { sql } from '@vercel/postgres';

export type GiftcardDeliveryResult = {
    sent: boolean;
    method: string;
    error?: string;
    waLink?: string;
    emailResult?: unknown;
};

const getIssuedCode = (request: Record<string, unknown>): string => {
    const meta = (request.metadata || {}) as Record<string, unknown>;
    return String(
        meta.issued_code || meta.issuedCode || request.code || ''
    );
};

/** Marca la solicitud como entregada al destinatario (idempotencia para cron y admin). */
export async function markScheduledSendCompleted(
    requestId: string | number,
    extra: Record<string, unknown> = {}
): Promise<void> {
    await sql`
        UPDATE giftcard_requests
        SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
            scheduled_send_completed: true,
            scheduled_sent_at: new Date().toISOString(),
            ...extra,
        })}::jsonb
        WHERE id = ${requestId}
    `;
}

/** Envía la giftcard al destinatario por email o registra enlace WhatsApp */
export async function deliverGiftcardToRecipient(
    request: Record<string, unknown>,
    code: string,
    requestId: string | number
): Promise<GiftcardDeliveryResult> {
    const emailService = await import('../emailService.js');
    const sendMethod = String(request.send_method || request.sendMethod || 'email').toLowerCase();
    const issuedCode = code;

    if (sendMethod === 'whatsapp') {
        const recipientPhone = request.recipient_whatsapp || request.recipientWhatsapp;
        if (!recipientPhone) {
            return { sent: false, method: 'whatsapp', error: 'No hay número de WhatsApp del destinatario' };
        }
        const recipientName = request.recipient_name || request.recipientName || '';
        const message = `Hola ${recipientName}, tu giftcard de $${request.amount} ha sido aprobada.%0A%0ACódigo: ${issuedCode}%0AMonto: USD $${Number(request.amount).toFixed(2)}%0AValidez: 3 meses desde la fecha de emisión%0A%0AContáctanos por WhatsApp para redimirla.`;
        const waLink = `https://wa.me/${recipientPhone}?text=${message}`;
        console.log('[deliverGiftcardToRecipient] WhatsApp link:', waLink);

        await markScheduledSendCompleted(requestId, {
            whatsapp_sent_at: new Date().toISOString(),
            whatsapp_link: waLink,
            whatsapp_phone: recipientPhone,
        });

        return { sent: true, method: 'whatsapp', waLink };
    }

    const recipientEmail = request.recipient_email || request.recipientEmail;
    if (!recipientEmail) {
        return { sent: false, method: 'email', error: 'No hay email del destinatario' };
    }

    const emailResult = await emailService.sendGiftcardRecipientEmail(String(recipientEmail), {
        recipientName: String(request.recipient_name || request.recipientName || ''),
        amount: Number(request.amount),
        code: issuedCode,
        message: String(request.buyer_message || request.buyerMessage || ''),
        buyerName: String(request.buyer_name || request.buyerName || ''),
    });

    const emailSent = !emailResult || (emailResult as { sent?: boolean }).sent !== false;

    await sql`
        UPDATE giftcard_requests
        SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
            emailDelivery: {
                recipient: { sent: emailSent, sentAt: new Date().toISOString(), ...(emailResult || {}) },
            },
        })}::jsonb
        WHERE id = ${requestId}
    `;

    if (!emailSent) {
        return {
            sent: false,
            method: 'email',
            error: (emailResult as { error?: string })?.error || 'El proveedor de email no confirmó el envío',
            emailResult,
        };
    }

    await markScheduledSendCompleted(requestId);
    return { sent: true, method: 'email', emailResult };
}

export type ProcessScheduledResult = {
    processed: number;
    sent: number;
    failed: number;
    skipped: number;
    details: Array<{ id: number; success: boolean; method?: string; error?: string }>;
};

/**
 * Procesa giftcards aprobadas cuya fecha programada ya pasó y aún no se enviaron.
 */
export async function processDueScheduledGiftcards(limit = 25): Promise<ProcessScheduledResult> {
    const { rows } = await sql`
        SELECT *
        FROM giftcard_requests
        WHERE status = 'approved'
          AND scheduled_send_at IS NOT NULL
          AND scheduled_send_at <= NOW()
          AND COALESCE(metadata->>'scheduled_send_completed', 'false') <> 'true'
          AND COALESCE(metadata->'emailDelivery'->'recipient'->>'sent', 'false') <> 'true'
          AND metadata->>'whatsapp_sent_at' IS NULL
        ORDER BY scheduled_send_at ASC
        LIMIT ${limit}
    `;

    const result: ProcessScheduledResult = {
        processed: rows.length,
        sent: 0,
        failed: 0,
        skipped: 0,
        details: [],
    };

    for (const request of rows) {
        const id = request.id as number;
        const code = getIssuedCode(request);

        if (!code) {
            result.skipped++;
            result.details.push({ id, success: false, error: 'Sin código de giftcard emitido' });
            continue;
        }

        try {
            const delivery = await deliverGiftcardToRecipient(request, code, id);

            if (delivery.sent) {
                result.sent++;
                result.details.push({ id, success: true, method: delivery.method });

                await sql`
                    UPDATE giftcard_requests
                    SET status = 'delivered'
                    WHERE id = ${id} AND status = 'approved'
                `;

                try {
                    await sql`
                        INSERT INTO giftcard_events (giftcard_request_id, event_type, admin_user, note, metadata)
                        VALUES (
                            ${id},
                            'scheduled_sent',
                            'cron',
                            ${'Envío automático por fecha programada'},
                            ${JSON.stringify({ method: delivery.method, scheduled_send_at: request.scheduled_send_at })}
                        )
                    `;
                } catch (eventErr) {
                    console.warn('[processDueScheduledGiftcards] giftcard_events insert skipped:', eventErr);
                }
            } else {
                result.failed++;
                result.details.push({ id, success: false, method: delivery.method, error: delivery.error });
            }
        } catch (err) {
            result.failed++;
            result.details.push({
                id,
                success: false,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    return result;
}
