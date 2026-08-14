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

function resendProviderId(emailResult: unknown): string | undefined {
    const r = emailResult as { providerResponse?: { id?: string; data?: { id?: string } } } | null;
    return r?.providerResponse?.id || r?.providerResponse?.data?.id;
}

export type DeliveryNoticePayload = {
    status: 'sent' | 'failed' | 'skipped' | 'whatsapp_ready';
    source: 'cron' | 'admin' | 'approve';
    method?: 'email' | 'whatsapp';
    error?: string;
    provider?: string;
    providerId?: string;
};

/** Pin visible en admin: resultado del último intento de entrega (cron Resend / admin). */
export async function recordDeliveryNotice(
    requestId: string | number,
    payload: DeliveryNoticePayload
): Promise<void> {
    const notice = {
        deliveryNotice: {
            status: payload.status,
            source: payload.source,
            method: payload.method || 'email',
            at: new Date().toISOString(),
            error: payload.error || null,
            provider: payload.provider || (payload.method === 'email' ? 'resend' : null),
            providerId: payload.providerId || null,
            seen: false,
        },
    };
    await sql`
        UPDATE giftcard_requests
        SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(notice)}::jsonb
        WHERE id = ${requestId}
    `;
}

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

async function logDeliveryEvent(
    requestId: string | number,
    eventType: string,
    note: string,
    extra: Record<string, unknown> = {}
): Promise<void> {
    try {
        await sql`
            INSERT INTO giftcard_events (giftcard_request_id, event_type, admin_user, note, metadata)
            VALUES (
                ${requestId},
                ${eventType},
                'cron',
                ${note},
                ${JSON.stringify(extra)}
            )
        `;
    } catch (eventErr) {
        console.warn('[giftcardDelivery] giftcard_events insert skipped:', eventErr);
    }
}

/** Envía la giftcard al destinatario por email (Resend) o registra enlace WhatsApp */
export async function deliverGiftcardToRecipient(
    request: Record<string, unknown>,
    code: string,
    requestId: string | number,
    source: 'cron' | 'admin' | 'approve' = 'cron'
): Promise<GiftcardDeliveryResult> {
    const emailService = await import('../emailService.js');
    const sendMethod = String(request.send_method || request.sendMethod || 'email').toLowerCase();
    const issuedCode = code;

    if (sendMethod === 'whatsapp') {
        const recipientPhone = request.recipient_whatsapp || request.recipientWhatsapp;
        if (!recipientPhone) {
            const error = 'No hay número de WhatsApp del destinatario';
            await recordDeliveryNotice(requestId, { status: 'failed', source, method: 'whatsapp', error });
            return { sent: false, method: 'whatsapp', error };
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
        await recordDeliveryNotice(requestId, {
            status: 'whatsapp_ready',
            source,
            method: 'whatsapp',
        });

        return { sent: true, method: 'whatsapp', waLink };
    }

    const recipientEmail = request.recipient_email || request.recipientEmail;
    if (!recipientEmail) {
        const error = 'No hay email del destinatario';
        await recordDeliveryNotice(requestId, { status: 'failed', source, method: 'email', error, provider: 'resend' });
        return { sent: false, method: 'email', error };
    }

    const emailResult = await emailService.sendGiftcardRecipientEmail(String(recipientEmail), {
        recipientName: String(request.recipient_name || request.recipientName || ''),
        amount: Number(request.amount),
        code: issuedCode,
        message: String(request.buyer_message || request.buyerMessage || ''),
        buyerName: String(request.buyer_name || request.buyerName || ''),
    });

    const emailSent = (emailResult as { sent?: boolean } | undefined)?.sent === true;
    const providerId = resendProviderId(emailResult);

    await sql`
        UPDATE giftcard_requests
        SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'emailDelivery',
            COALESCE(metadata->'emailDelivery', '{}'::jsonb) || ${JSON.stringify({
                recipient: {
                    sent: emailSent,
                    sentAt: new Date().toISOString(),
                    provider: 'resend',
                    providerId: providerId || null,
                    ...(emailResult && typeof emailResult === 'object' ? { sentFlag: (emailResult as any).sent, error: (emailResult as any).error } : {}),
                },
            })}::jsonb
        )
        WHERE id = ${requestId}
    `;

    if (!emailSent) {
        const error = (emailResult as { error?: string })?.error || 'Resend no confirmó el envío';
        await recordDeliveryNotice(requestId, {
            status: 'failed',
            source,
            method: 'email',
            error,
            provider: 'resend',
        });
        return { sent: false, method: 'email', error, emailResult };
    }

    await markScheduledSendCompleted(requestId);
    await recordDeliveryNotice(requestId, {
        status: 'sent',
        source,
        method: 'email',
        provider: 'resend',
        providerId,
    });
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
            const error = 'Sin código de giftcard emitido';
            result.skipped++;
            result.details.push({ id, success: false, error });
            await recordDeliveryNotice(id, { status: 'skipped', source: 'cron', method: 'email', error });
            const prev = (request.metadata as { deliveryNotice?: { status?: string } } | null)?.deliveryNotice;
            if (prev?.status !== 'skipped') {
                await logDeliveryEvent(id, 'scheduled_send_skipped', error, { scheduled_send_at: request.scheduled_send_at });
            }
            continue;
        }

        try {
            const delivery = await deliverGiftcardToRecipient(request, code, id, 'cron');

            if (delivery.sent) {
                result.sent++;
                result.details.push({ id, success: true, method: delivery.method });

                await sql`
                    UPDATE giftcard_requests
                    SET status = 'delivered'
                    WHERE id = ${id} AND status = 'approved'
                `;

                await logDeliveryEvent(id, 'scheduled_sent', 'Envío automático por fecha programada', {
                    method: delivery.method,
                    scheduled_send_at: request.scheduled_send_at,
                });
            } else {
                result.failed++;
                result.details.push({ id, success: false, method: delivery.method, error: delivery.error });
                const prev = (request.metadata as { deliveryNotice?: { status?: string; error?: string } } | null)?.deliveryNotice;
                if (prev?.status !== 'failed' || prev?.error !== delivery.error) {
                    await logDeliveryEvent(id, 'scheduled_send_failed', delivery.error || 'No entregada', {
                        method: delivery.method,
                        scheduled_send_at: request.scheduled_send_at,
                    });
                }
            }
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            result.failed++;
            result.details.push({ id, success: false, error });
            await recordDeliveryNotice(id, { status: 'failed', source: 'cron', method: 'email', error, provider: 'resend' });
            const prev = (request.metadata as { deliveryNotice?: { status?: string; error?: string } } | null)?.deliveryNotice;
            if (prev?.status !== 'failed' || prev?.error !== error) {
                await logDeliveryEvent(id, 'scheduled_send_failed', error, { scheduled_send_at: request.scheduled_send_at });
            }
        }
    }

    return result;
}
