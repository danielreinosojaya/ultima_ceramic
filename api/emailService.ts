import { Resend } from 'resend';
import { toZonedTime, format } from 'date-fns-tz';
import type { Booking, BankDetails, TimeSlot, PaymentDetails } from '../types.js';
import { sql } from './db.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_FROM_ADDRESS || 'no-reply@ceramicalma.com';

export const isEmailServiceConfigured = (): { configured: boolean; reason?: string } => {
    if (!resend) return { configured: false, reason: 'Missing RESEND_API_KEY' };
    if (!fromEmail) return { configured: false, reason: 'Missing EMAIL_FROM' };
    return { configured: true };
};

const normalizeAttachments = (attachments?: { filename: string; data?: string; type?: string }[]) => {
    if (!attachments || attachments.length === 0) return undefined;
    // Resend requires attachments to include either `content` (base64) or `path`.
    // We'll return { filename, type, content } where content is the base64 string.
    return attachments.map(a => {
        let raw = a.data || '';
        if (typeof raw !== 'string') raw = String(raw);
        raw = raw.trim();
        // If data is a data URL like "data:application/pdf;base64,AAA...", strip the prefix
        const dataUrlMatch = raw.match(/^data:.*;base64,(.*)$/i);
        const base64 = dataUrlMatch ? dataUrlMatch[1] : raw;
        return { filename: a.filename, type: a.type || 'application/octet-stream', content: base64 };
    });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const sendWithRetry = async (payload: any, maxAttempts = 3) => {
    let attempt = 0;
    let lastErr: any = null;
    while (attempt < maxAttempts) {
        attempt++;
        try {
            const result = await resend!.emails.send(payload);
            return result;
        } catch (err) {
            lastErr = err;
            const backoff = Math.min(500 * Math.pow(2, attempt - 1), 5000);
            console.warn(`Resend send attempt ${attempt} failed. Retrying in ${backoff}ms...`, err && (err as any).message ? (err as any).message : err);
            await sleep(backoff);
        }
    }
    throw lastErr;
};

type SendEmailResult = { sent: true; providerResponse?: any } | { sent: false, error?: string; dryRunPath?: string };

const wrapHtmlEmail = (maybeHtml: string) => {
    if (!maybeHtml || typeof maybeHtml !== 'string') return '';
    // If it already looks like a full document, return as-is
    if (/\s*<!doctype html>|<html[\s>]/i.test(maybeHtml)) return maybeHtml;
    // Minimal safe HTML wrapper (inline-friendly)
    return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Email</title><style>body{font-family: Arial, Helvetica, sans-serif; color:#333; margin:0; padding:12px;} a{color:#1d4ed8;}</style></head><body>${maybeHtml}</body></html>`;
};

const sendEmail = async (to: string, subject: string, html: string, attachments?: { filename: string; data: string; type?: string }[]): Promise<SendEmailResult | void> => {
    const cfg = isEmailServiceConfigured();
    // Dry-run when not configured
    if (!cfg.configured) {
        console.warn(`Email service not configured (${cfg.reason}). Performing dry-run and saving email to disk.`);
        try {
            const fs = await import('fs');
            const path = await import('path');
            const outDir = process.env.EMAIL_DRYRUN_DIR || path.join('/tmp', 'ceramicalma-emails');
            try { fs.mkdirSync(outDir, { recursive: true }); } catch {}
            const safeTo = to.replace(/[@<>\\/\\s]/g, '_').slice(0, 64);
            const safeSubject = subject.replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 48).replace(/\s+/g, '_');
            const filename = `${Date.now()}_${safeTo}_${safeSubject}.html`;
            const filePath = path.join(outDir, filename);
            let content = `To: ${to}\nSubject: ${subject}\n\n${html}\n\n`;
            if (attachments && attachments.length > 0) {
                content += '\nAttachments:\n';
                    for (const a of attachments) {
                        const size = (a as any).data?.length || (a as any).content?.length || 0;
                        content += `- ${a.filename} (${a.type || 'unknown'}) - ${size} bytes base64\n`;
                    }
            }
            try { fs.writeFileSync(filePath, content, 'utf8'); console.info(`Email dry-run saved to: ${filePath}`); } catch (writeErr) { console.warn('Failed to write dry-run email to disk:', writeErr); }
            return { sent: false, dryRunPath: filePath };
        } catch (err) { console.warn('Email dry-run failed (fs unavailable):', err); return { sent: false }; }
    }

    // Live-send
    // Wrap HTML into a minimal full document so providers/clients don't interpret it as plain text or strip <head>
    const wrappedHtml = wrapHtmlEmail(html);
    // Generate a conservative plain-text fallback from the wrapped HTML
    const textFallback = typeof wrappedHtml === 'string' ? wrappedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : undefined;
    const payload: any = {
        from: fromEmail,
        to,
        subject,
        html: wrappedHtml,
        ...(textFallback ? { text: textFallback.slice(0, 10000) } : {})
    };

    try {
        // Log a concise payload summary for debugging (avoid dumping full binary attachments)
        const normalized = normalizeAttachments(attachments);
            const attachmentSummary = normalized ? normalized.map(a => ({ filename: a.filename, type: a.type, size: (a as any).content ? (a as any).content.length : ((a as any).data ? (a as any).data.length : 0) })) : [];
        console.info('[emailService] Sending email payload summary:', {
            to,
            subject,
            hasHtml: !!payload.html,
            htmlSnippet: typeof payload.html === 'string' ? payload.html.slice(0, 400).replace(/\n/g, ' ') : '',
            textLength: payload.text ? payload.text.length : 0,
            attachments: attachmentSummary
        });

        if (normalized) payload.attachments = normalized;

        const providerResponse = await sendWithRetry(payload, 3);
        console.log(`Email sent to ${to} with subject "${subject}"`, providerResponse && (providerResponse as any).id ? `providerId=${(providerResponse as any).id}` : '');
        return { sent: true, providerResponse };
    } catch (error) {
        console.error(`Resend API Error: Failed to send email to ${to} after retries:`, error);
        // Return a failure object rather than throwing so callers can persist failure metadata
        return { sent: false, error: error instanceof Error ? error.message : String(error) };
    }
};

async function logEmailEvent(
  clientEmail: string,
  type: string,
  channel: string,
  status: string,
  bookingCode?: string,
  scheduledAt?: Date
) {
  try {
    await sql`
      INSERT INTO client_notifications (
        client_email, type, channel, status, booking_code, scheduled_at, created_at
      ) VALUES (
        ${clientEmail}, ${type}, ${channel}, ${status}, ${bookingCode || null}, ${scheduledAt ? scheduledAt.toISOString() : null}, NOW()
      );
    `;
  } catch (error) {
    console.error('Failed to log email event:', error);
  }
}

export const sendPreBookingConfirmationEmail = async (booking: Booking, bankDetails: BankDetails) => {
    const { userInfo, bookingCode, product, price } = booking;
    
    // Ensure price is a number
    const numericPrice = typeof price === 'number' ? price : parseFloat(String(price));
    
    const subject = `Tu Pre-Reserva en CeramicAlma está confirmada (Código: ${bookingCode})`;
    // Mostrar todas las cuentas en una tabla compacta y profesional
    const accounts = Array.isArray(bankDetails) ? bankDetails : [bankDetails];
    const accountsHtml = `
        <table style="width:100%; font-size:15px; color:#333; border-collapse:collapse; background:#f9f9f9; border-radius:12px; margin-top:20px;">
            <thead>
                <tr style="background:#eaeaea;">
                    <th style="padding:10px; text-align:left; font-size:16px; color:#7c868e;">Banco</th>
                    <th style="padding:10px; text-align:left;">Titular</th>
                    <th style="padding:10px; text-align:left;">Número</th>
                    <th style="padding:10px; text-align:left;">Tipo</th>
                    <th style="padding:10px; text-align:left;">Cédula</th>
                </tr>
            </thead>
            <tbody>
                ${accounts.map(acc => `
                    <tr>
                        <td style="padding:8px; font-weight:bold; color:#7c868e;">${acc.bankName}</td>
                        <td style="padding:8px;">${acc.accountHolder}</td>
                        <td style="padding:8px;">${acc.accountNumber}</td>
                        <td style="padding:8px;">${acc.accountType}</td>
                        <td style="padding:8px;">${acc.taxId}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div style="margin-top: 10px; font-style: italic; color:#555;"><strong>Importante:</strong> Usa tu código de reserva <strong>${bookingCode}</strong> como referencia en la transferencia.</div>
    `;

    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>¡Hola, ${userInfo.firstName}!</h2>
            <p>Gracias por tu pre-reserva para <strong>${product.name}</strong>. Tu lugar ha sido guardado con el código de reserva:</p>
            <p style="font-size: 24px; font-weight: bold; color: #D95F43; margin: 20px 0;">${bookingCode}</p>
            <p>El monto a pagar es de <strong>$${numericPrice.toFixed(2)}</strong>.</p>
            <p>Para confirmar tu asistencia, por favor realiza una transferencia bancaria con los siguientes datos y envíanos el comprobante por WhatsApp.</p>
            ${accountsHtml}
            ${booking.acceptedNoRefund ? `
            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin-top: 20px; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-weight: bold;">⚠️ Política de No Reembolso ni Reagendamiento</p>
                <p style="margin: 8px 0 0 0; color: #78350F; font-size: 14px;">
                    Has reservado una clase con menos de 48 horas de anticipación. Esta reserva <strong>no es reembolsable ni reagendable</strong> bajo ninguna circunstancia.
                </p>
            </div>
            ` : `
            <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin-top: 20px; border-radius: 8px;">
                <p style="margin: 0; color: #1E40AF; font-weight: bold;">📋 Política de Cancelación y Reagendamiento</p>
                <p style="margin: 8px 0 0 0; color: #1E3A8A; font-size: 14px;">
                    Puedes cancelar o reagendar tu clase sin costo hasta <strong>48 horas antes</strong> de la fecha programada. 
                    Las reservas realizadas con menos de 48 horas de anticipación no son reembolsables ni reagendables.
                </p>
            </div>
            `}
            <p style="margin-top: 20px;">¡Esperamos verte pronto en el taller!</p>
            <p>Saludos,<br/>El equipo de CeramicAlma</p>
        </div>
    `;
    const result = await sendEmail(userInfo.email, subject, html);

    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(userInfo.email, 'pre-booking-confirmation', 'email', status, bookingCode);

    console.info('[emailService] Pre-booking confirmation email result for', userInfo.email, bookingCode, result);
    return result;
};


// Envía el recibo de pago al cliente
export const sendPaymentReceiptEmail = async (booking: Booking, payment: PaymentDetails) => {
    const { userInfo, bookingCode, product } = booking;
    const subject = `¡Confirmación de Pago para tu reserva en CeramicAlma! (Código: ${bookingCode})`;

    // Ensure amounts are numbers
    const paymentAmount = typeof payment.amount === 'number' ? payment.amount : parseFloat(String(payment.amount));
    const giftcardAmount = payment.giftcardAmount 
        ? (typeof payment.giftcardAmount === 'number' ? payment.giftcardAmount : parseFloat(String(payment.giftcardAmount)))
        : 0;

    // Usar zona horaria de Ecuador
    const timeZone = 'America/Guayaquil';
    let fechaPago;
    if (payment.receivedAt && new Date(payment.receivedAt).toString() !== 'Invalid Date') {
        const zonedDate = toZonedTime(new Date(payment.receivedAt), timeZone);
        fechaPago = format(zonedDate, 'd/M/yyyy', { timeZone });
    } else {
        const zonedDate = toZonedTime(new Date(), timeZone);
        fechaPago = format(zonedDate, 'd/M/yyyy', { timeZone });
    }

    // Determinar si se aplicó una giftcard y calcular el saldo restante
    const giftcardInfo = giftcardAmount > 0
        ? `<p><strong>Monto aplicado con Giftcard:</strong> $${giftcardAmount.toFixed(2)}</p>
           <p><strong>Saldo restante:</strong> $${(paymentAmount - giftcardAmount).toFixed(2)}</p>`
        : '';

    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>¡Hola, ${userInfo.firstName}!</h2>
            <p>Hemos recibido tu pago y tu reserva para <strong>${product.name}</strong> está oficialmente confirmada.</p>
            <p style="font-size: 20px; font-weight: bold; color: #16A34A; margin: 20px 0;">¡Tu plaza está asegurada!</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h3 style="color: #D95F43;">Detalles del Pago</h3>
                <p><strong>Código de Reserva:</strong> ${bookingCode}</p>
                <p><strong>Monto Pagado:</strong> $${paymentAmount.toFixed(2)}</p>
                ${giftcardInfo}
                <p><strong>Método:</strong> ${payment.method}</p>
                <p><strong>Fecha de Pago:</strong> ${fechaPago}</p>
            </div>
            ${booking.acceptedNoRefund ? `
            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin-top: 20px; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-weight: bold;">⚠️ Política de No Reembolso ni Reagendamiento</p>
                <p style="margin: 8px 0 0 0; color: #78350F; font-size: 14px;">
                    Has reservado una clase con menos de 48 horas de anticipación. Esta reserva <strong>no es reembolsable ni reagendable</strong> bajo ninguna circunstancia.
                </p>
            </div>
            ` : `
            <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin-top: 20px; border-radius: 8px;">
                <p style="margin: 0; color: #1E40AF; font-weight: bold;">📋 Política de Cancelación y Reagendamiento</p>
                <p style="margin: 8px 0 0 0; color: #1E3A8A; font-size: 14px;">
                    Puedes cancelar o reagendar tu clase sin costo hasta <strong>48 horas antes</strong> de la fecha programada. 
                    Las reservas realizadas con menos de 48 horas de anticipación no son reembolsables ni reagendables.
                </p>
            </div>
            `}
             <p style="margin-top: 20px;">Puedes descargar tu ticket de reserva desde la web en cualquier momento. ¡Nos vemos en clase!</p>
            <p>Saludos,<br/>El equipo de CeramicAlma</p>
        </div>
    `;
    await sendEmail(userInfo.email, subject, html);
};

export const sendClassReminderEmail = async (booking: Booking, slot: TimeSlot) => {
    const { userInfo } = booking;
    const classDate = new Date(slot.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const subject = `Recordatorio: Tu clase en CeramicAlma es mañana`;
    const html = `
         <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>¡Hola, ${userInfo.firstName}!</h2>
            <p>Este es un recordatorio amistoso de que tienes una clase programada en CeramicAlma para mañana.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
                <p style="font-size: 18px; margin: 0;"><strong>${classDate}</strong></p>
                <p style="font-size: 24px; font-weight: bold; color: #D95F43; margin: 10px 0;">${slot.time}</p>
            </div>
            <p style="margin-top: 20px;">¡No podemos esperar a crear contigo! Por favor, llega unos minutos antes para prepararte.</p>
            <p>Saludos,<br/>El equipo de CeramicAlma</p>
        </div>
    `;
    await sendEmail(userInfo.email, subject, html);
};

// --- Giftcard emails ---
export const sendGiftcardRequestReceivedEmail = async (
    buyerEmail: string,
    payload: {
        buyerName: string;
        amount: number;
        code: string;
        recipientName?: string;
        message?: string;
    }
) => {
    const subject = `Solicitud recibida — Tu Giftcard (${payload.code})`;
        const html = `
            <div style="font-family: Arial, Helvetica, sans-serif; color:#222; max-width:600px; margin:0 auto; background:#fff; border-radius:16px; box-shadow:0 2px 12px #0001; padding:32px 24px 28px 24px;">
                <h2 style="color:#D95F43; font-size:1.7rem; margin-bottom:0.5rem; text-align:center; font-weight:800; letter-spacing:0.01em;">¡Solicitud recibida!</h2>
                <p style="font-size:1.1rem; color:#444; text-align:center; margin-bottom:1.2rem;">Gracias, ${payload.buyerName}. Tu solicitud de giftcard fue recibida. ¡Nos encanta ayudarte a sorprender a alguien especial!</p>
                <div style="background:#f9fafb; border:1px solid #e5e7eb; padding:16px 18px; border-radius:10px; margin-bottom:18px;">
                    <div style="font-size:16px; color:#555; margin-bottom:8px;">Para: <strong>${payload.recipientName || '—'}</strong></div>
                    <div style="font-size:16px; color:#555; margin-bottom:8px;">Monto: <strong>USD ${Number(payload.amount).toFixed(2)}</strong></div>
                    <div style="font-size:16px; color:#555; margin-bottom:8px;">Código provisional: <span style="font-weight:700; color:#D95F43; font-size:18px; letter-spacing:2px;">${payload.code}</span></div>
                </div>
                ${payload.message ? `
                    <div style="margin-bottom:18px; background:#fff7ed; border-left:6px solid #D95F43; border-radius:8px; padding:14px 18px; font-size:16px; color:#222; box-shadow:0 2px 8px #0001;">
                        <div style="font-weight:600; color:#D95F43; margin-bottom:4px;">Mensaje para el destinatario:</div>
                        <div style="font-style:italic;">${payload.message}</div>
                    </div>
                ` : ''}
                <div style="margin-bottom:18px;">
                    <h3 style="font-size:17px; color:#222; margin-bottom:8px;">Datos para transferencia bancaria</h3>
                    <table style="width:100%; font-size:15px; color:#333; border-collapse:collapse; background:#f9f9f9; border-radius:12px;">
                        <thead>
                            <tr style="background:#eaeaea;">
                                <th style="padding:10px; text-align:left; font-size:16px; color:#7c868e;">Banco</th>
                                <th style="padding:10px; text-align:left;">Titular</th>
                                <th style="padding:10px; text-align:left;">Número</th>
                                <th style="padding:10px; text-align:left;">Tipo</th>
                                <th style="padding:10px; text-align:left;">Cédula</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding:8px; font-weight:bold; color:#7c868e;">Banco Pichincha</td>
                                <td style="padding:8px;">Carolina Massuh Morán</td>
                                <td style="padding:8px;">2100334248</td>
                                <td style="padding:8px;">Cuenta Corriente</td>
                                <td style="padding:8px;">0921343935</td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="margin-top: 10px; font-style: italic; color:#555;"><strong>Importante:</strong> Usa el código de giftcard <strong>${payload.code}</strong> como referencia en la transferencia.</div>
                </div>
                <div style="margin-bottom:18px; font-size:15px; color:#444;">
                    <strong>¿Cómo continuar?</strong>
                    <ol style="padding-left:18px; color:#444; font-size:15px;">
                        <li>Realiza el pago por el monto indicado a la cuenta bancaria mostrada arriba.</li>
                        <li>Envía el comprobante únicamente por WhatsApp.</li>
                        <li>Te avisaremos cuando tu giftcard esté lista y enviada al destinatario.</li>
                    </ol>
                </div>
                <div style="margin-bottom:18px; font-size:15px; color:#444;">
                    <strong>¿Dudas o necesitas ayuda?</strong> <br>
                    WhatsApp: <a href="https://wa.me/593985813327" style="color:#1d4ed8; text-decoration:none;">+593 985813327</a>
                </div>
                <div style="margin-top:24px; font-size:13px; color:#888; text-align:center;">
                    <em>Giftcard válida para clases, talleres y productos en CeramicAlma. No acumulable con otras promociones. Consulta condiciones en nuestra web.</em>
                </div>
                <div style="margin-top:32px; text-align:center; font-size:15px; color:#555;">
                    <strong>El equipo de CeramicAlma</strong>
                </div>
            </div>
        `;
    return sendEmail(buyerEmail, subject, html);
}

export const sendGiftcardPaymentConfirmedEmail = async (
    buyerEmail: string,
    payload: {
        buyerName: string;
        amount: number;
        code: string;
        recipientName?: string;
        recipientEmail?: string;
        message?: string;
    },
    _pdfBase64?: string,
    downloadLink?: string
) => {
    const subject = `¡Tu pago fue recibido! La giftcard ya fue enviada 🎁`;
    const downloadHtml = downloadLink ? `<p style="margin:10px 0;"><a href="${downloadLink}" style="color:#1d4ed8; text-decoration:none;">Descargar comprobante PDF</a></p>` : '';
    const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; color:#222; max-width:600px; margin:0 auto; background:#fff; border-radius:16px; box-shadow:0 2px 12px #0001; padding:36px 28px 32px 28px;">
            <h1 style="color:#D95F43; font-size:2.1rem; margin-bottom:0.5rem; text-align:center; font-weight:800; letter-spacing:0.01em;">¡Gracias por tu regalo!</h1>
            <p style="font-size:1.15rem; color:#444; text-align:center; margin-bottom:1.2rem;">Tu pago fue confirmado y la giftcard ya fue enviada al destinatario.</p>
            <div style="background:#f9fafb; border:1px solid #e5e7eb; padding:18px 20px; border-radius:10px; margin-bottom:18px;">
                <div style="font-size:16px; color:#555; margin-bottom:8px;">Para: <strong>${payload.recipientName || '—'}</strong></div>
                <div style="font-size:16px; color:#555; margin-bottom:8px;">Email/WhatsApp: <strong>${payload.recipientEmail || '—'}</strong></div>
                <div style="font-size:16px; color:#555; margin-bottom:8px;">Código: <span style="font-weight:700; color:#D95F43; font-size:20px; letter-spacing:2px;">${payload.code}</span></div>
                <div style="font-size:16px; color:#555; margin-bottom:8px;">Monto: <strong>USD ${Number(payload.amount).toFixed(2)}</strong></div>
                <div style="font-size:15px; color:#666; margin-bottom:8px;">Validez: <strong>3 meses desde la fecha de emisión</strong></div>
            </div>
            ${payload.message ? `
                <div style="margin-bottom:24px; background:#fff7ed; border-left:6px solid #D95F43; border-radius:8px; padding:18px 24px; font-size:17px; color:#222; box-shadow:0 2px 8px #0001; display:flex; align-items:flex-start; gap:12px;">
                    <span style="font-size:28px; color:#D95F43; font-family:serif; line-height:1;">“</span>
                    <div>
                        <div style="font-weight:600; color:#D95F43; margin-bottom:4px;">Mensaje que enviaste al destinatario:</div>
                        <div style="font-style:italic;">${payload.message}</div>
                    </div>
                </div>
            ` : ''}
            <div style="margin-bottom:18px;">
                <h3 style="font-size:18px; color:#222; margin-bottom:8px;">¿Qué sucede ahora?</h3>
                <ol style="padding-left:18px; color:#444; font-size:15px;">
                    <li>El destinatario ya recibió su giftcard por email o WhatsApp.</li>
                    <li>Le hemos explicado cómo redimirla y los pasos a seguir.</li>
                    <li>Si no la encuentra, puedes reenviarle este código o contactarnos para ayuda.</li>
                </ol>
            </div>
            <div style="margin-bottom:18px; font-size:15px; color:#444;">
                <strong>¿Dudas o necesitas ayuda?</strong> <br>
                WhatsApp: <a href="https://wa.me/593985813327" style="color:#1d4ed8; text-decoration:none;">+593 985813327</a>
                <br><span style="font-size:13px; color:#888;">El comprobante de pago se recibe únicamente por WhatsApp.</span>
            </div>
            ${downloadHtml}
            <div style="margin-top:24px; font-size:13px; color:#888; text-align:center;">
                <em>Giftcard válida para clases, talleres y productos en CeramicAlma. No acumulable con otras promociones. Consulta condiciones en nuestra web.</em>
            </div>
            <div style="margin-top:32px; text-align:center; font-size:15px; color:#555;">
                <strong>El equipo de CeramicAlma</strong>
            </div>
        </div>
    `;
    return sendEmail(buyerEmail, subject, html);
};

export const sendGiftcardRecipientEmail = async (
    recipientEmail: string,
    payload: { recipientName: string; amount: number; code: string; message?: string; buyerName?: string },
    _pdfBase64?: string,
    downloadLink?: string
) => {
        const subject = `Has recibido una Giftcard — Código ${payload.code}`;
        const html = `
                <div style="font-family: Arial, Helvetica, sans-serif; color:#222; max-width:600px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 2px 12px #0001; padding:32px;">
                    <h2 style="margin-bottom:18px; font-size:28px; color:#D95F43; text-align:center; font-weight:700;">¡Has recibido una Giftcard!</h2>
                                <div style="background:#f9fafb; border:1px solid #e5e7eb; padding:18px; border-radius:8px; margin-bottom:18px;">
                                    <div style="font-size:16px; color:#555; margin-bottom:8px;">Para: <strong>${payload.recipientName}</strong></div>
                                    <div style="font-size:16px; color:#555; margin-bottom:8px;">De: <strong>${payload.buyerName || ''}</strong></div>
                                    <div style="font-size:16px; color:#555; margin-bottom:8px;">Monto: <strong>$${Number(payload.amount).toFixed(2)}</strong></div>
                                    <div style="font-size:16px; color:#555; margin-bottom:8px;">Código: <span style="font-weight:700; color:#D95F43; font-size:20px; letter-spacing:2px;">${payload.code}</span></div>
                                    <div style="font-size:15px; color:#666; margin-bottom:8px;">Validez: <strong>3 meses desde la fecha de emisión</strong></div>
                                </div>
                                ${payload.message ? `
                                    <div style="margin-bottom:24px; background:#fff7ed; border-left:6px solid #D95F43; border-radius:8px; padding:18px 24px; font-size:17px; color:#222; box-shadow:0 2px 8px #0001; display:flex; align-items:flex-start; gap:12px;">
                                        <span style=\"font-size:28px; color:#D95F43; font-family:serif; line-height:1;\">“</span>
                                        <div>
                                            <div style=\"font-weight:600; color:#D95F43; margin-bottom:4px;\">Mensaje especial del remitente:</div>
                                            <div style=\"font-style:italic;\">${payload.message}</div>
                                        </div>
                                    </div>
                                ` : ''}
                    <div style="margin-bottom:18px;">
                        <h3 style="font-size:18px; color:#222; margin-bottom:8px;">¿Cómo redimir tu Giftcard?</h3>
                        <ol style="padding-left:18px; color:#444; font-size:15px;">
                            <li>Guarda este correo y tu código de giftcard.</li>
                            <li>Contáctanos solo por WhatsApp para reservar tu clase o producto.</li>
                            <li>Presenta el código al momento de canjear en CeramicAlma.</li>
                        </ol>
                    </div>
                                <div style="margin-bottom:18px; font-size:15px; color:#444;">
                                    <strong>Contacto solo por WhatsApp:</strong> <br>
                                    WhatsApp: <a href="https://wa.me/593985813327" style="color:#1d4ed8; text-decoration:none;">+593 985813327</a>
                                </div>
                    <div style="margin-top:24px; font-size:13px; color:#888; text-align:center;">
                        <em>Giftcard válida para clases, talleres y productos en CeramicAlma. No acumulable con otras promociones. Consulta condiciones en nuestra web.</em>
                    </div>
                    <div style="margin-top:32px; text-align:center; font-size:15px; color:#555;">
                        <a href="https://www.ceramicalma.com" style="color:#D95F43; font-weight:600; text-decoration:none;">Reserva tu próxima experiencia en www.ceramicalma.com</a><br/>
                        <strong>El equipo de CeramicAlma</strong>
                    </div>
                </div>
        `;
        return sendEmail(recipientEmail, subject, html);
};

// --- Delivery emails ---
export const sendDeliveryCreatedEmail = async (customerEmail: string, customerName: string, delivery: { description?: string | null; scheduledDate: string; }) => {
    console.log('[sendDeliveryCreatedEmail] Starting email send to:', customerEmail);
    
    const formattedDate = new Date(delivery.scheduledDate).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const displayDescription = delivery.description || 'Tus piezas de cerámica';
    const subject = `📦 Recogida programada - ${displayDescription}`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D95F43;">¡Hola, ${customerName}!</h2>
            <p style="font-size: 16px;">Hemos programado la recogida de tus piezas de cerámica.</p>
            
            <div style="background-color: #f9fafb; border-left: 4px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #059669; margin-top: 0;">📦 Detalles de la Recogida</h3>
                <p style="margin: 10px 0;"><strong>Piezas:</strong> ${displayDescription}</p>
                <p style="margin: 10px 0; font-size: 18px;"><strong>Fecha programada:</strong> <span style="color: #D95F43;">${formattedDate}</span></p>
            </div>

            <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #1E40AF; font-weight: bold;">💡 Importante</p>
                <p style="margin: 8px 0 0 0; color: #1E3A8A; font-size: 14px;">
                    • Confirmaremos contigo 1-2 días antes de la fecha<br/>
                    • Las piezas estarán listas para recoger en nuestro taller<br/>
                    • Horario: Lunes a Viernes 9:00 - 18:00, Sábados 10:00 - 14:00
                </p>
            </div>

            <p style="margin-top: 20px;">Si tienes alguna pregunta o necesitas cambiar la fecha, contáctanos por WhatsApp.</p>
            
            <div style="margin: 30px 0; text-align: center;">
                <a href="https://wa.me/593985813327" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    📱 Contactar por WhatsApp
                </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                Saludos,<br/>
                <strong>El equipo de CeramicAlma</strong>
            </p>
        </div>
    `;
    
    const result = await sendEmail(customerEmail, subject, html);
    console.log('[sendDeliveryCreatedEmail] Email send result:', result);
    return result;
};

export const sendDeliveryReadyEmail = async (customerEmail: string, customerName: string, delivery: { description?: string | null; readyAt: string; }) => {
    console.log('[sendDeliveryReadyEmail] READY EMAIL - Starting send to:', customerEmail);
    
    const readyDate = new Date(delivery.readyAt);
    const expirationDate = new Date(readyDate);
    expirationDate.setMonth(expirationDate.getMonth() + 2);
    
    const formattedReadyDate = readyDate.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const formattedExpirationDate = expirationDate.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const displayDescription = delivery.description || 'Tus piezas de cerámica';
    const subject = `✨ ¡Tus piezas están listas! - ${displayDescription}`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D95F43;">¡Hola, ${customerName}!</h2>
            <p style="font-size: 18px; font-weight: bold; color: #10B981;">🎉 ¡Buenas noticias! Tus piezas están listas para recoger.</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #059669; margin-top: 0;">✨ Tus Piezas</h3>
                <p style="margin: 10px 0; font-size: 16px;"><strong>${displayDescription}</strong></p>
                <p style="margin: 10px 0; color: #065F46;">Listas desde: ${formattedReadyDate}</p>
            </div>

            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #92400E; margin-top: 0;">⏰ Importante - Plazo de Recogida</h3>
                <p style="margin: 10px 0; color: #78350F; font-size: 15px;">
                    Tus piezas estarán disponibles para recoger hasta el <strong style="color: #D97706;">${formattedExpirationDate}</strong> (2 meses desde hoy).
                </p>
                <p style="margin: 10px 0; color: #78350F; font-size: 14px;">
                    ⚠️ Después de esta fecha, no podremos garantizar su disponibilidad.
                </p>
            </div>

            <div style="background-color: #f9fafb; border: 1px solid #E5E7EB; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; font-weight: bold; color: #374151;">📍 Dirección del Taller</p>
                <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 14px;">
                    Sol Plaza - Av. Samborondón Km 2.5<br/>
                    Samborondón 092501, Ecuador
                </p>
            </div>

            <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #1E40AF; font-weight: bold;">🕐 Horario de Recogida</p>
                <p style="margin: 8px 0 0 0; color: #1E3A8A; font-size: 14px;">
                    • Lunes a Viernes: 9:00 AM - 6:00 PM<br/>
                    • Sábados: 10:00 AM - 2:00 PM<br/>
                    • Domingos: Cerrado
                </p>
            </div>

            <p style="margin-top: 20px; font-size: 15px;">
                Para coordinar tu recogida o si tienes alguna pregunta, contáctanos por WhatsApp.
            </p>
            
            <div style="margin: 30px 0; text-align: center;">
                <a href="https://wa.me/593985813327" style="display: inline-block; background-color: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    📱 Contactar por WhatsApp
                </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                ¡Estamos emocionados de que veas tus creaciones terminadas!<br/><br/>
                Saludos,<br/>
                <strong>El equipo de CeramicAlma</strong>
            </p>
        </div>
    `;
    
    const result = await sendEmail(customerEmail, subject, html);
    console.log('[sendDeliveryReadyEmail] Email send result:', result);
    return result;
};

export const sendDeliveryReminderEmail = async (customerEmail: string, customerName: string, delivery: { description?: string | null; scheduledDate: string; }) => {
    const formattedDate = new Date(delivery.scheduledDate).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const displayDescription = delivery.description || 'Tus piezas de cerámica';
    const subject = `🔔 Recordatorio: Recoge tus piezas mañana - ${displayDescription}`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D95F43;">¡Hola, ${customerName}!</h2>
            <p style="font-size: 16px;">Este es un recordatorio de que <strong>mañana</strong> puedes recoger tus piezas.</p>
            
            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #92400E; margin-top: 0;">📦 Tus piezas están listas</h3>
                <p style="margin: 10px 0;"><strong>Piezas:</strong> ${displayDescription}</p>
                <p style="margin: 10px 0; font-size: 18px;"><strong>Fecha de recogida:</strong> <span style="color: #D95F43;">${formattedDate}</span></p>
            </div>

            <div style="background-color: #f9fafb; border: 1px solid #E5E7EB; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; font-weight: bold; color: #374151;">📍 Dirección del Taller</p>
                <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 14px;">
                    Sol Plaza - Av. Samborondón Km 2.5<br/>
                    Samborondón 092501, Ecuador
                </p>
            </div>

            <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #1E40AF; font-weight: bold;">⏰ Horario de Recogida</p>
                <p style="margin: 8px 0 0 0; color: #1E3A8A; font-size: 14px;">
                    • Lunes a Viernes: 9:00 AM - 6:00 PM<br/>
                    • Sábados: 10:00 AM - 2:00 PM<br/>
                    • Domingos: Cerrado
                </p>
            </div>

            <p style="margin-top: 20px;">¡Estamos emocionados de que veas tus piezas terminadas!</p>
            
            <div style="margin: 30px 0; text-align: center;">
                <a href="https://wa.me/593985813327" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    📱 Confirmar por WhatsApp
                </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                Saludos,<br/>
                <strong>El equipo de CeramicAlma</strong>
            </p>
        </div>
    `;
    
    await sendEmail(customerEmail, subject, html);
};

export const sendDeliveryCompletedEmail = async (customerEmail: string, customerName: string, delivery: { description?: string | null; deliveredAt: string; }) => {
    const formattedDate = new Date(delivery.deliveredAt).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const displayDescription = delivery.description || 'Tus piezas de cerámica';
    const subject = `✅ Piezas entregadas - ${displayDescription}`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10B981;">¡Hola, ${customerName}!</h2>
            <p style="font-size: 16px;">¡Tus piezas han sido entregadas exitosamente!</p>
            
            <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #059669; margin-top: 0;">✅ Entrega Completada</h3>
                <p style="margin: 10px 0;"><strong>Piezas:</strong> ${displayDescription}</p>
                <p style="margin: 10px 0;"><strong>Fecha de entrega:</strong> ${formattedDate}</p>
            </div>

            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-weight: bold;">💡 Cuidado de tus piezas</p>
                <p style="margin: 8px 0 0 0; color: #78350F; font-size: 14px;">
                    • Lava con agua tibia y jabón suave<br/>
                    • Evita cambios bruscos de temperatura<br/>
                    • No uses en microondas (a menos que esté especificado)<br/>
                    • Disfruta y comparte tu creación! 🎨
                </p>
            </div>

            <p style="margin-top: 20px;">Esperamos que disfrutes tus piezas y vuelvas pronto a crear con nosotros.</p>
            
            <div style="margin: 30px 0; text-align: center; padding: 20px; background-color: #F9FAFB; border-radius: 8px;">
                <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;">¿Te gustó la experiencia?</p>
                <a href="https://www.ceramicalma.com" style="display: inline-block; background-color: #D95F43; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px;">
                    🎨 Reserva otra clase
                </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                ¡Gracias por elegirnos!<br/>
                <strong>El equipo de CeramicAlma</strong>
            </p>
        </div>
    `;
    
    await sendEmail(customerEmail, subject, html);
};