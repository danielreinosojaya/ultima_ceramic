import { Resend } from 'resend';
import { toZonedTime, format } from 'date-fns-tz';
import type { Booking, BankDetails, TimeSlot, PaymentDetails } from '../types.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_FROM_ADDRESS || 'no-reply@ceramicalma.com';

export const isEmailServiceConfigured = (): { configured: boolean; reason?: string } => {
    if (!resend) return { configured: false, reason: 'Missing RESEND_API_KEY' };
    if (!fromEmail) return { configured: false, reason: 'Missing EMAIL_FROM' };
    return { configured: true };
};

const normalizeAttachments = (attachments?: { filename: string; data: string; type?: string }[]) => {
    if (!attachments || attachments.length === 0) return undefined;
    // Resend expects attachments as { filename, type, data } where `data` is base64 string
    return attachments.map(a => {
        // If data already looks like base64, keep it; else try to coerce
        let raw = a.data || '';
        if (typeof raw !== 'string') raw = String(raw);
        raw = raw.trim();
        // If data is a data URL like "data:application/pdf;base64,AAA...", strip the prefix
        const dataUrlMatch = raw.match(/^data:.*;base64,(.*)$/i);
        const base64 = dataUrlMatch ? dataUrlMatch[1] : raw;
        return { filename: a.filename, type: a.type || 'application/octet-stream', data: base64 };
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

type SendEmailResult = { sent: true; providerResponse?: any } | { sent: false; error?: string; dryRunPath?: string };

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
                    content += `- ${a.filename} (${a.type || 'unknown'}) - ${a.data?.length || 0} bytes base64\n`;
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
        const attachmentSummary = normalized ? normalized.map(a => ({ filename: a.filename, type: a.type, size: (a as any).data ? (a as any).data.length : 0 })) : [];
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

export const sendPreBookingConfirmationEmail = async (booking: Booking, bankDetails: BankDetails) => {
    const { userInfo, bookingCode, product, price } = booking;
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
            <p>El monto a pagar es de <strong>$${price.toFixed(2)}</strong>.</p>
            <p>Para confirmar tu asistencia, por favor realiza una transferencia bancaria con los siguientes datos y envíanos el comprobante por WhatsApp.</p>
            ${accountsHtml}
            <p style="margin-top: 20px;">¡Esperamos verte pronto en el taller!</p>
            <p>Saludos,<br/>El equipo de CeramicAlma</p>
        </div>
    `;
    await sendEmail(userInfo.email, subject, html);
};


// Envía el recibo de pago al cliente
export const sendPaymentReceiptEmail = async (booking: Booking, payment: PaymentDetails) => {
    const { userInfo, bookingCode, product } = booking;
    const subject = `¡Confirmación de Pago para tu reserva en CeramicAlma! (Código: ${bookingCode})`;
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
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>¡Hola, ${userInfo.firstName}!</h2>
            <p>Hemos recibido tu pago y tu reserva para <strong>${product.name}</strong> está oficialmente confirmada.</p>
            <p style="font-size: 20px; font-weight: bold; color: #16A34A; margin: 20px 0;">¡Tu plaza está asegurada!</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h3 style="color: #D95F43;">Detalles del Pago</h3>
                <p><strong>Código de Reserva:</strong> ${bookingCode}</p>
                <p><strong>Monto Pagado:</strong> $${payment.amount.toFixed(2)}</p>
                <p><strong>Método:</strong> ${payment.method}</p>
                <p><strong>Fecha de Pago:</strong> ${fechaPago}</p>
            </div>
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
export const sendGiftcardRequestReceivedEmail = async (buyerEmail: string, payload: { buyerName: string; amount: number; code: string }) => {
    const subject = `Solicitud recibida — Tu Giftcard (${payload.code})`;
    const html = `<p>Hola ${payload.buyerName},</p>
    <p>Hemos recibido tu solicitud de giftcard por S/ ${Number(payload.amount).toFixed(2)}. Te avisaremos cuando confirmes el pago.</p>
    <p>Código provisional: <strong>${payload.code}</strong></p>
    <p>Gracias por elegirnos.</p>`;
    return sendEmail(buyerEmail, subject, html);
}

export const sendGiftcardPaymentConfirmedEmail = async (buyerEmail: string, payload: { buyerName: string; amount: number; code: string }, pdfBase64?: string, downloadLink?: string) => {
    const subject = `Pago confirmado — Recibo Giftcard (${payload.code})`;
    // render HTML usando plantilla si queremos body más bonito
        try {
        // Prefer Puppeteer-generated PDF to ensure visual fidelity
        let attachments = undefined;
        try {
            const { generateGiftcardPdf } = await import('./pdfPuppeteer');
            const buf = await generateGiftcardPdf({ code: payload.code, amount: payload.amount, recipientName: payload.buyerName, buyerName: payload.buyerName, message: '' });
            pdfBase64 = (buf as Buffer).toString('base64');
            console.info('[emailService] Using puppeteer-generated giftcard PDF for', payload.code);
        } catch (genErr: any) {
            console.warn('[emailService] Puppeteer PDF generation failed, falling back to provided pdfBase64 if any:', genErr?.message || genErr);
        }
        if (pdfBase64) attachments = [{ filename: `giftcard-${payload.code}.pdf`, data: pdfBase64, type: 'application/pdf' }];

                // Email-friendly inline HTML (keep styles inline to avoid stripping by some providers/clients)
                const downloadHtml = downloadLink ? `<p style="margin:10px 0;"><a href="${downloadLink}" style="color:#1d4ed8; text-decoration:none;">Descargar comprobante PDF</a></p>` : '';
                const html = `
                        <div style="font-family: Arial, Helvetica, sans-serif; color:#333;">
                            <h2 style="margin-bottom:6px;">Hola ${payload.buyerName},</h2>
                            <p style="margin-top:0;">Hemos confirmado tu pago por la giftcard.</p>
                            <div style="background:#f9fafb; border:1px solid #e5e7eb; padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <p style="margin:0; font-size:14px; color:#6b7280;">Código</p>
                                    <p style="margin:4px 0; font-weight:700; color:#D95F43; font-size:18px;">${payload.code}</p>
                                    <p style="margin:0; font-size:14px;">Monto: <strong>S/ ${Number(payload.amount).toFixed(2)}</strong></p>
                                </div>
                                <div style="text-align:right; font-size:12px; color:#6b7280;">CeramicAlma</div>
                            </div>
                            ${downloadHtml}
                            <p style="margin-top:12px;">Adjuntamos el comprobante en PDF. Presenta el código o el PDF al momento de canjear.</p>
                            <p style="margin-top:12px;">Saludos,<br/>El equipo de CeramicAlma</p>
                        </div>
                `;
                return sendEmail(buyerEmail, subject, html, attachments as any);
        } catch (e) {
        // fallback simple body
        const downloadHtml = downloadLink ? `<p>Descarga tu comprobante: <a href="${downloadLink}">Descargar PDF</a></p>` : '';
        const html = `<p>Hola ${payload.buyerName},</p>
        <p>Hemos confirmado el pago de tu giftcard por S/ ${Number(payload.amount).toFixed(2)}.</p>
        ${downloadHtml}
        <p>Adjuntamos el comprobante en PDF cuando está disponible.</p>`;
        const attachments = pdfBase64 ? [{ filename: `giftcard-${payload.code}.pdf`, data: pdfBase64, type: 'application/pdf' }] : undefined;
        return sendEmail(buyerEmail, subject, html, attachments as any);
    }
}

export const sendGiftcardRecipientEmail = async (recipientEmail: string, payload: { recipientName: string; amount: number; code: string; message?: string }, pdfBase64?: string, downloadLink?: string) => {
    const subject = `Has recibido una Giftcard — Código ${payload.code}`;
    try {
        // Prefer Puppeteer-generated PDF for consistent layout
        let attachments = undefined;
        try {
            const { generateGiftcardPdf } = await import('./pdfPuppeteer');
            const buf = await generateGiftcardPdf({ code: payload.code, amount: payload.amount, recipientName: payload.recipientName, buyerName: payload.recipientName, message: payload.message });
            pdfBase64 = (buf as Buffer).toString('base64');
            console.info('[emailService] Using puppeteer-generated giftcard PDF for', payload.code);
        } catch (genErr: any) {
            console.warn('[emailService] Puppeteer PDF generation failed, falling back to provided pdfBase64 if any:', genErr?.message || genErr);
        }
        if (pdfBase64) attachments = [{ filename: `giftcard-${payload.code}.pdf`, data: pdfBase64, type: 'application/pdf' }];

        const downloadHtml = downloadLink ? `<p style="margin:10px 0;"><a href="${downloadLink}" style="color:#1d4ed8; text-decoration:none;">Descargar voucher PDF</a></p>` : '';
        const html = `
            <div style="font-family: Arial, Helvetica, sans-serif; color:#333;">
              <h2 style="margin-bottom:6px;">Hola ${payload.recipientName},</h2>
              <p style="margin-top:0;">Has recibido una giftcard por <strong>S/ ${Number(payload.amount).toFixed(2)}</strong>.</p>
              <div style="background:#fff7ed; border:1px solid #fee2b3; padding:12px; border-radius:8px;">
                <p style="margin:0; font-size:14px; color:#6b7280;">Código</p>
                <p style="margin:4px 0; font-weight:700; color:#D95F43; font-size:18px;">${payload.code}</p>
              </div>
              ${payload.message ? `<p style="margin-top:10px;">Mensaje: ${payload.message}</p>` : ''}
              ${downloadHtml}
              <p style="margin-top:12px;">Adjuntamos el voucher en PDF. Presenta el PDF o el código al momento de canjear.</p>
              <p style="margin-top:12px;">Saludos,<br/>El equipo de CeramicAlma</p>
            </div>
        `;
        return sendEmail(recipientEmail, subject, html, attachments as any);
    } catch (e) {
        const downloadHtml = downloadLink ? `<p>También puedes descargar el voucher aquí: <a href="${downloadLink}">Descargar PDF</a></p>` : '';
        const html = `<p>Hola ${payload.recipientName},</p>
        <p>Has recibido una giftcard por S/ ${Number(payload.amount).toFixed(2)}.</p>
        <p>Código: <strong>${payload.code}</strong></p>
        ${payload.message ? `<p>Mensaje: ${payload.message}</p>` : ''}
        ${downloadHtml}
        <p>Presenta este código o el PDF adjunto al momento de canjear.</p>`;
        const attachments = pdfBase64 ? [{ filename: `giftcard-${payload.code}.pdf`, data: pdfBase64, type: 'application/pdf' }] : undefined;
        return sendEmail(recipientEmail, subject, html, attachments as any);
    }
}