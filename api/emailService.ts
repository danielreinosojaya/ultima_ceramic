import { Resend } from 'resend';
import { toZonedTime, format } from 'date-fns-tz';
import type { Booking, BankDetails, TimeSlot, PaymentDetails } from '../types.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.EMAIL_FROM || 'no-reply@ceramicalma.com';

const isEmailServiceConfigured = () => {
    if (!resend || !fromEmail) {
        console.warn('Email service is not configured. Please set RESEND_API_KEY and EMAIL_FROM environment variables.');
        return false;
    }
    return true;
}

const sendEmail = async (to: string, subject: string, html: string, attachments?: { filename: string; data: string; type?: string }[]) => {
    // If the email service is not configured (no RESEND API key), do a dry-run:
    // save the email contents to disk for inspection and do not throw so
    // callers (like giftcard flows) can continue running in test/dev.
    if (!resend) {
        console.warn('RESEND_API_KEY not configured — performing email dry-run (email will be saved to disk).');
        try {
            const fs = await import('fs');
            const path = await import('path');
            const outDir = process.env.EMAIL_DRYRUN_DIR || path.join('/tmp', 'ceramicalma-emails');
            try {
                fs.mkdirSync(outDir, { recursive: true });
            } catch (mkErr) {
                // ignore
            }
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
            try {
                fs.writeFileSync(filePath, content, 'utf8');
                console.info(`Email dry-run saved to: ${filePath}`);
            } catch (writeErr) {
                console.warn('Failed to write dry-run email to disk:', writeErr);
            }
        } catch (err) {
            console.warn('Email dry-run failed (fs unavailable):', err);
        }

        // Don't throw in dry-run mode — resolve so flows can continue during tests
        return;
    }

    // Live send path (Resend configured)
    try {
        const payload: any = {
            from: fromEmail,
            to,
            subject,
            html,
        };
        if (attachments && attachments.length > 0) {
            payload.attachments = attachments.map(a => ({
                filename: a.filename,
                type: a.type,
                data: a.data
            }));
        }
        await resend!.emails.send(payload);
        console.log(`Email sent to ${to} with subject "${subject}"`);
    } catch (error) {
        console.error(`Resend API Error: Failed to send email to ${to}:`, error);
        // Re-throw so callers that expect exceptions still get them
        throw error;
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
    const downloadHtml = downloadLink ? `<p>Descarga tu comprobante: <a href="${downloadLink}">Descargar PDF</a></p>` : '';
    const html = `<p>Hola ${payload.buyerName},</p>
    <p>Hemos confirmado el pago de tu giftcard por S/ ${Number(payload.amount).toFixed(2)}.</p>
    ${downloadHtml}
    <p>Adjuntamos el comprobante en PDF cuando está disponible.</p>`;
    const attachments = pdfBase64 ? [{ filename: `giftcard-${payload.code}.pdf`, data: pdfBase64, type: 'application/pdf' }] : undefined;
    return sendEmail(buyerEmail, subject, html, attachments as any);
}

export const sendGiftcardRecipientEmail = async (recipientEmail: string, payload: { recipientName: string; amount: number; code: string; message?: string }, pdfBase64?: string, downloadLink?: string) => {
    const subject = `Has recibido una Giftcard — Código ${payload.code}`;
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