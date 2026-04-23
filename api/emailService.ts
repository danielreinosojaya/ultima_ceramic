import { Resend } from 'resend';
import { toZonedTime, format } from 'date-fns-tz';
import type { Booking, BankDetails, TimeSlot, PaymentDetails, GroupTechnique } from '../types.js';
import { sql } from './db.js';
import { generateAllGiftcardVersions } from './utils/giftcardImageGenerator.js';
import { parseLocalDate } from '../utils/formatters.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_FROM_ADDRESS || 'no-reply@ceramicalma.com';
const alianzaEmail = process.env.EMAIL_ALIANZA || 'Ceramicalma <alianza@ceramicalma.com>';

// Emails disponibles
export const AVAILABLE_FROM_EMAILS = {
  DEFAULT: fromEmail,
  ALIANZA: alianzaEmail
} as const;

// Helper para obtener nombre de técnica desde metadata
const getTechniqueName = (technique: GroupTechnique): string => {
  const names: Record<GroupTechnique, string> = {
    'potters_wheel': 'Torno Alfarero',
    'hand_modeling': 'Modelado a Mano',
    'painting': 'Pintura de piezas'
  };
  return names[technique] || technique;
};

// Helper para traducir productType a nombre legible
const getProductTypeName = (productType?: string): string => {
  const typeNames: Record<string, string> = {
    'SINGLE_CLASS': 'Clase Suelta',
    'CLASS_PACKAGE': 'Paquete de Clases',
    'INTRODUCTORY_CLASS': 'Clase Introductoria',
    'GROUP_CLASS': 'Clase Grupal',
    'COUPLES_EXPERIENCE': 'Experiencia de Parejas',
    'OPEN_STUDIO': 'Estudio Abierto'
  };
  return typeNames[productType || ''] || 'Clase';
};

// Helper para obtener el nombre del producto/técnica de un booking
const getBookingDisplayName = (booking: Booking): string => {
  // 0. Detección especial: Si es una reserva de Rumcom, siempre retornar nombre del evento
  if ((booking.product?.details as any)?.bookingSource === 'rumcom') {
    return 'Spill the Tea x Rum-Com Club';
  }
  
  // 1. Si tiene groupClassMetadata con techniqueAssignments (GROUP_CLASS)
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    
    if (uniqueTechniques.length === 1) {
      return getTechniqueName(uniqueTechniques[0]);
    } else {
      return `Clase Grupal (mixto)`;
    }
  }
  
  // 2. Prioridad: product.name (es la fuente más confiable)
  const productName = booking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown' && productName !== null) {
    return productName;
  }
  
  // 3. Fallback: technique directamente (solo si product.name no existe)
  if (booking.technique) {
    return getTechniqueName(booking.technique as GroupTechnique);
  }
  
  // 4. Último fallback: productType
  return getProductTypeName(booking.productType);
};

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

const sendEmail = async (to: string, subject: string, html: string, attachments?: { filename: string; data: string; type?: string }[], fromOverride?: string): Promise<SendEmailResult | void> => {
    const cfg = isEmailServiceConfigured();
    const finalFromEmail = fromOverride || fromEmail;
    
    // Dry-run when not configured
    if (!cfg.configured) {
        console.warn(`Email service not configured (${cfg.reason}). Performing dry-run and saving email to disk.`);
        try {
            const fs = await import('fs');
            const path = await import('path');
            const outDir = process.env.EMAIL_DRYRUN_DIR || path.join('/tmp', 'ceramicalma-emails');
            try { fs.mkdirSync(outDir, { recursive: true }); } catch {}
            const safeTo = to.replace(/[@<>\/\s]/g, '_').slice(0, 64);
            const safeSubject = subject.replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 48).replace(/\s+/g, '_');
            const filename = `${Date.now()}_${safeTo}_${safeSubject}.html`;
            const filePath = path.join(outDir, filename);
            let content = `From: ${finalFromEmail}\nTo: ${to}\nSubject: ${subject}\n\n${html}\n\n`;
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
        from: finalFromEmail,
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
    const { userInfo, bookingCode, product, price, paymentDetails, slots } = booking;
    
    // Ensure price is a number
    const numericPrice = typeof price === 'number' ? price : parseFloat(String(price));
    
    // Calculate total paid and pending balance
    const totalPaid = paymentDetails?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    const pendingBalance = Math.max(0, numericPrice - totalPaid);
    
    // Obtener nombre del producto/técnica
    const productName = getBookingDisplayName(booking);
    
    // Formatear información de fecha/hora de las clases
    const slotsHtml = slots && slots.length > 0 ? `
        <div style="background-color: #f0f9ff; border-left: 4px solid #0EA5E9; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #0369A1; font-weight: bold;">📅 ${slots.length > 1 ? 'Tus Clases Programadas' : 'Tu Clase Programada'}</p>
            <table style="margin-top: 10px; width: 100%; border-collapse: collapse;">
                ${slots.map((slot, index) => {
                    const slotDate = new Date(slot.date + 'T00:00:00').toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                    return `
                        <tr style="border-bottom: 1px solid #e0f2fe;">
                            <td style="padding: 8px 0; color: #0369A1; font-weight: bold;">${slots.length > 1 ? `Clase ${index + 1}:` : ''}</td>
                            <td style="padding: 8px 0; color: #0c4a6e;">${slotDate}</td>
                            <td style="padding: 8px 0; color: #0c4a6e; font-weight: bold;">${slot.time}</td>
                        </tr>
                    `;
                }).join('')}
            </table>
        </div>
    ` : '';
    
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
            <p>Gracias por tu pre-reserva para <strong>${productName}</strong>. Tu lugar ha sido guardado con el código de reserva:</p>
            <p style="font-size: 24px; font-weight: bold; color: #D95F43; margin: 20px 0;">${bookingCode}</p>
            ${slotsHtml}
            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-weight: bold;">⏰ Pre-Reserva Válida por 2 Horas</p>
                <p style="margin: 8px 0 0 0; color: #78350F; font-size: 14px;">
                    Esta pre-reserva estará disponible solo durante las próximas <strong>2 horas</strong>. Si no realizas el pago en este tiempo, 
                    tu lugar será liberado y tendrás que volver a hacer el proceso de reserva.
                </p>
            </div>
            ${totalPaid > 0 ? `
            <div style="background-color: #f0fdf4; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #059669; font-weight: bold;">✅ Pago con Giftcard Aplicado</p>
                <p style="margin: 8px 0 0 0; color: #065F46; font-size: 14px;">
                    Monto aplicado: <strong>$${totalPaid.toFixed(2)}</strong><br/>
                    Saldo a pagar: <strong style="font-size: 16px; color: #D95F43;">$${pendingBalance.toFixed(2)}</strong>
                </p>
            </div>
            ` : `
            <p>El monto a pagar es de <strong>$${numericPrice.toFixed(2)}</strong>.</p>
            `}
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
    const { userInfo, bookingCode, product, slots } = booking;
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

    // Obtener nombre del producto/técnica
    const productName = getBookingDisplayName(booking);

    // Formatear información de fecha/hora de las clases
    const slotsHtml = slots && slots.length > 0 ? `
        <div style="background-color: #f0f9ff; border-left: 4px solid #0EA5E9; padding: 15px; margin-top: 20px; border-radius: 8px;">
            <p style="margin: 0; color: #0369A1; font-weight: bold;">📅 ${slots.length > 1 ? 'Tus Clases Programadas' : 'Tu Clase Programada'}</p>
            <table style="margin-top: 10px; width: 100%; border-collapse: collapse;">
                ${slots.map((slot, index) => {
                    const slotDate = new Date(slot.date + 'T00:00:00').toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                    return `
                        <tr style="border-bottom: 1px solid #e0f2fe;">
                            <td style="padding: 8px 0; color: #0369A1; font-weight: bold;">${slots.length > 1 ? `Clase ${index + 1}:` : ''}</td>
                            <td style="padding: 8px 0; color: #0c4a6e;">${slotDate}</td>
                            <td style="padding: 8px 0; color: #0c4a6e; font-weight: bold;">${slot.time}</td>
                        </tr>
                    `;
                }).join('')}
            </table>
        </div>
    ` : '';

    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>¡Hola, ${userInfo.firstName}!</h2>
            <p>Hemos recibido tu pago y tu reserva para <strong>${productName}</strong> está oficialmente confirmada.</p>
            <p style="font-size: 20px; font-weight: bold; color: #16A34A; margin: 20px 0;">¡Tu plaza está asegurada!</p>
            ${slotsHtml}
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
        schedulingInfo?: string;
    },
    _pdfBase64?: string,
    downloadLink?: string
) => {
    const isScheduled = !!payload.schedulingInfo;
    const subject = isScheduled 
        ? `¡Tu pago fue recibido! La giftcard será enviada en la fecha programada 🎁` 
        : `¡Tu pago fue recibido! La giftcard ya fue enviada 🎁`;
    const downloadHtml = downloadLink ? `<p style="margin:10px 0;"><a href="${downloadLink}" style="color:#1d4ed8; text-decoration:none;">Descargar comprobante PDF</a></p>` : '';
    const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; color:#222; max-width:600px; margin:0 auto; background:#fff; border-radius:16px; box-shadow:0 2px 12px #0001; padding:36px 28px 32px 28px;">
            <h1 style="color:#D95F43; font-size:2.1rem; margin-bottom:0.5rem; text-align:center; font-weight:800; letter-spacing:0.01em;">¡Gracias por tu regalo!</h1>
            <p style="font-size:1.15rem; color:#444; text-align:center; margin-bottom:1.2rem;">${isScheduled ? 'Tu pago fue confirmado. La giftcard será enviada en la fecha programada.' : 'Tu pago fue confirmado y la giftcard ya fue enviada al destinatario.'}</p>
            <div style="background:#f9fafb; border:1px solid #e5e7eb; padding:18px 20px; border-radius:10px; margin-bottom:18px;">
                <div style="font-size:16px; color:#555; margin-bottom:8px;">Para: <strong>${payload.recipientName || '—'}</strong></div>
                <div style="font-size:16px; color:#555; margin-bottom:8px;">Email/WhatsApp: <strong>${payload.recipientEmail || '—'}</strong></div>
                <div style="font-size:16px; color:#555; margin-bottom:8px;">Código: <span style="font-weight:700; color:#D95F43; font-size:20px; letter-spacing:2px;">${payload.code}</span></div>
                <div style="font-size:16px; color:#555; margin-bottom:8px;">Monto: <strong>USD ${Number(payload.amount).toFixed(2)}</strong></div>
                <div style="font-size:15px; color:#666; margin-bottom:8px;">Validez: <strong>3 meses desde la fecha de emisión</strong></div>
            </div>
            ${payload.message ? `
                <div style="margin-bottom:24px; background:#fff7ed; border-left:6px solid #D95F43; border-radius:8px; padding:18px 24px; font-size:17px; color:#222; box-shadow:0 2px 8px #0001; display:flex; align-items:flex-start; gap:12px;">
                    <span style="font-size:28px; color:#D95F43; font-family:serif; line-height:1;">"</span>
                    <div>
                        <div style="font-weight:600; color:#D95F43; margin-bottom:4px;">Mensaje que enviaste al destinatario:</div>
                        <div style="font-style:italic;">${payload.message}</div>
                    </div>
                </div>
            ` : ''}
            ${payload.schedulingInfo ? `
                <div style="margin-bottom:24px; background:#f0f9ff; border-left:6px solid #3b82f6; border-radius:8px; padding:18px 24px; font-size:16px; color:#1e40af; box-shadow:0 2px 8px #0001;">
                    <div style="font-weight:600; margin-bottom:6px;">📅 Información de envío:</div>
                    <div>${payload.schedulingInfo}</div>
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
    try {
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
                
                <!-- Giftcard Images removed from body - only sent as attachments -->

                
                ${payload.message ? `
                    <div style="margin-bottom:24px; background:#fff7ed; border-left:6px solid #D95F43; border-radius:8px; padding:18px 24px; font-size:17px; color:#222; box-shadow:0 2px 8px #0001; display:flex; align-items:flex-start; gap:12px;">
                        <span style="font-size:28px; color:#D95F43; font-family:serif; line-height:1;">"</span>
                        <div>
                            <div style="font-weight:600; color:#D95F43; margin-bottom:4px;">Mensaje especial del remitente:</div>
                            <div style="font-style:italic;">${payload.message}</div>
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
        
        // Generate both giftcard versions (v1 and v2)
        const { v1, v2 } = await generateAllGiftcardVersions({
            code: payload.code,
            amount: payload.amount,
            recipientName: payload.recipientName,
            senderName: payload.buyerName,
            message: payload.message
        });
        
        // NO enviar attachments si están vacíos (Vercel no soporta canvas/fonts)
        const attachments = (v1 && v2) ? [
            {
                filename: 'giftcard-v1.png',
                data: v1,
                type: 'image/png'
            },
            {
                filename: 'giftcard-v2.png',
                data: v2,
                type: 'image/png'
            }
        ] : undefined;
        
        return sendEmail(recipientEmail, subject, html, attachments);
    } catch (error) {
        console.error('[sendGiftcardRecipientEmail] Error generating giftcard images:', error);
        // Fallback: send email without attachments if image generation fails
        const subject = `Has recibido una Giftcard — Código ${payload.code}`;
        const fallbackHtml = `
            <div style="font-family: Arial, Helvetica, sans-serif; color:#222; max-width:600px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 2px 12px #0001; padding:32px;">
                <h2 style="margin-bottom:18px; font-size:28px; color:#D95F43; text-align:center; font-weight:700;">¡Has recibido una Giftcard!</h2>
                <div style="background:#f9fafb; border:1px solid #e5e7eb; padding:18px; border-radius:8px; margin-bottom:18px;">
                    <div style="font-size:16px; color:#555; margin-bottom:8px;">Para: <strong>${payload.recipientName}</strong></div>
                    <div style="font-size:16px; color:#555; margin-bottom:8px;">De: <strong>${payload.buyerName || ''}</strong></div>
                    <div style="font-size:16px; color:#555; margin-bottom:8px;">Monto: <strong>$${Number(payload.amount).toFixed(2)}</strong></div>
                    <div style="font-size:16px; color:#555; margin-bottom:8px;">Código: <span style="font-weight:700; color:#D95F43; font-size:20px; letter-spacing:2px;">${payload.code}</span></div>
                </div>
                <div style="margin-bottom:18px; font-size:15px; color:#444;">
                    <strong>Contacto solo por WhatsApp:</strong> <br>
                    WhatsApp: <a href="https://wa.me/593985813327" style="color:#1d4ed8; text-decoration:none;">+593 985813327</a>
                </div>
                <p style="color:#666; font-size:14px;">Si necesitas más detalles sobre tu giftcard, contáctanos.</p>
                <div style="margin-top:32px; text-align:center; font-size:15px; color:#555;">
                    <strong>El equipo de CeramicAlma</strong>
                </div>
            </div>
        `;
        return sendEmail(recipientEmail, subject, fallbackHtml);
    }
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
    // Sanitize subject: remove newlines and excessive whitespace
    const sanitizedDescription = displayDescription.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    const subject = `📦 Recogida programada - ${sanitizedDescription}`;
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
                    • Horario: Martes a Sábado 10:00 AM - 8:00 PM, Domingos 12:00 PM - 5:00 PM
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

export const sendDeliveryCreatedByClientEmail = async (customerEmail: string, customerName: string, delivery: { description?: string | null; scheduledDate: string; photos?: number; }) => {
    console.log('[sendDeliveryCreatedByClientEmail] Starting email send to:', customerEmail);
    
    const formattedDate = new Date(delivery.scheduledDate).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const displayDescription = delivery.description || 'Tus piezas de cerámica';
    const photoCount = delivery.photos || 0;
    // Sanitize subject: remove newlines and excessive whitespace
    const sanitizedDescription = displayDescription.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    const subject = `✅ Recibimos tus fotos - ${sanitizedDescription}`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D95F43;">¡Hola, ${customerName}!</h2>
            <p style="font-size: 16px;">¡Gracias por subir las fotos de tu pieza! Hemos recibido tu solicitud de entrega.</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #15803d; margin-top: 0;">📸 Información Recibida</h3>
                <p style="margin: 10px 0;"><strong>Descripción:</strong> ${displayDescription}</p>
                <p style="margin: 10px 0;"><strong>Fotos subidas:</strong> ${photoCount}</p>
                <p style="margin: 10px 0; font-size: 18px;"><strong>Fecha estimada de recogida:</strong> <span style="color: #D95F43;">${formattedDate}</span></p>
            </div>

            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-weight: bold;">⏳ Próximos Pasos</p>
                <p style="margin: 8px 0 0 0; color: #78350F; font-size: 14px;">
                    • Nuestro equipo revisará tus fotos y piezas<br/>
                    • Nos pondremos en contacto contigo <strong>1-2 días hábiles ANTES</strong> de tu fecha de recogida<br/>
                    • Te confirmaremos si hay que hacer arreglos o si está listo para recoger
                </p>
            </div>

            <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #1E40AF; font-weight: bold;">💡 Información Importante</p>
                <p style="margin: 8px 0 0 0; color: #1E3A8A; font-size: 14px;">
                    • Horario de recogida: Martes a Sábado 10:00 AM - 8:00 PM<br/>
                    • Domingos: 12:00 PM - 5:00 PM<br/>
                    • Ubicación: Sol Plaza - Av. Samborondón
                </p>
            </div>

            <p style="margin-top: 20px;">Si tienes dudas o necesitas hacer cambios, no dudes en contactarnos.</p>
            
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
    console.log('[sendDeliveryCreatedByClientEmail] Email send result:', result);
    return result;
};

// Nuevo email: Delivery con servicio de pintura
export const sendDeliveryWithPaintingServiceEmail = async (
    customerEmail: string, 
    customerName: string, 
    delivery: { description?: string | null; scheduledDate: string; photos?: number; paintingPrice: number; }
) => {
    console.log('[sendDeliveryWithPaintingServiceEmail] Starting email send to:', customerEmail);
    
    const formattedDate = new Date(delivery.scheduledDate).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const displayDescription = delivery.description || 'Tus piezas de cerámica';
    const photoCount = delivery.photos || 0;
    const sanitizedDescription = displayDescription.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    const subject = `✨ ¡Servicio de Pintura Reservado! - ${sanitizedDescription}`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #4A4540; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D95F43;">¡Hola, ${customerName}!</h2>
            <p style="font-size: 16px;">¡Gracias por subir las fotos de tu pieza! Hemos recibido tu solicitud de entrega <strong>con servicio de pintura</strong>. ✨</p>
            
            <div style="background-color: #F4F2F1; border: 2px solid #D95F43; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <span style="font-size: 48px;">🎨</span>
                    <h3 style="color: #D95F43; margin: 10px 0;">Servicio de Pintura Reservado</h3>
                </div>
                <div style="background-color: #FFFFFF; border-radius: 8px; padding: 15px; margin: 15px 0; border: 1px solid #E7E1DB;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-weight: bold; color: #4A4540;">Precio del servicio:</span>
                        <span style="font-size: 24px; font-weight: bold; color: #D95F43;">$${delivery.paintingPrice}</span>
                    </div>
                    <p style="margin: 5px 0; color: #7A6F69; font-size: 12px;">Por pieza • Incluye todos los colores</p>
                </div>
            </div>

            <div style="background-color: #FDF7F2; border-left: 4px solid #D95F43; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #D95F43; margin-top: 0;">📸 Información Recibida</h3>
                <p style="margin: 10px 0;"><strong>Descripción:</strong> ${displayDescription}</p>
                <p style="margin: 10px 0;"><strong>Fotos subidas:</strong> ${photoCount}</p>
                <p style="margin: 10px 0; font-size: 18px;"><strong>Fecha estimada pieza lista:</strong> <span style="color: #D95F43;">${formattedDate}</span></p>
            </div>

            <div style="background-color: #F4F2F1; border-left: 4px solid #CCBCB2; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #4A4540; font-weight: bold;">✨ Próximos Pasos para Pintura</p>
                <p style="margin: 8px 0 0 0; color: #6B5F58; font-size: 14px;">
                    1. <strong>Tu pieza se procesará normalmente</strong> (horneado y secado)<br/>
                    2. Cuando esté lista para pintar, <strong>recibirás un correo especial</strong><br/>
                    3. Podrás <strong>reservar tu horario de pintura en línea</strong>
                </p>
            </div>

            <div style="background-color: #FDF2F2; border-left: 4px solid #B8474B; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #B8474B; font-weight: bold;">⏳ Tiempo Estimado</p>
                <p style="margin: 8px 0 0 0; color: #6B5F58; font-size: 14px;">
                    • Proceso de horneado y secado: <strong>~15 días</strong><br/>
                    • Te notificaremos 1-2 días antes de que esté lista<br/>
                    • Después de pintar: 5-7 días adicionales para horneado final
                </p>
            </div>

            <div style="background-color: #F4F2F1; border-left: 4px solid #D95F43; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #4A4540; font-weight: bold;">💡 Información del Taller</p>
                <p style="margin: 8px 0 0 0; color: #6B5F58; font-size: 14px;">
                    • Martes a Viernes: 10:00 AM - 9:00 PM<br/>
                    • Sábados: 9:00 AM - 8:00 PM<br/>
                    • Domingos: 10:00 AM - 6:00 PM<br/>
                    • Ubicación: Sol Plaza - Av. Samborondón<br/>
                    • Duración sesión de pintura: ~1-2 horas
                </p>
            </div>

            <p style="margin-top: 20px;">Si tienes dudas sobre el proceso de pintura o necesitas hacer cambios, no dudes en contactarnos.</p>
            
            <div style="margin: 30px 0; text-align: center;">
                <a href="https://wa.me/593985813327" style="display: inline-block; background-color: #D95F43; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    📱 Contactar por WhatsApp
                </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                ¡Estamos emocionados de ver tu pieza pintada!<br/><br/>
                Saludos,<br/>
                <strong>El equipo de CeramicAlma</strong>
            </p>
        </div>
    `;
    
    const result = await sendEmail(customerEmail, subject, html);
    console.log('[sendDeliveryWithPaintingServiceEmail] Email send result:', result);
    return result;
};

export const sendDeliveryReadyEmail = async (customerEmail: string, customerName: string, delivery: { id?: string | null; description?: string | null; readyAt: string; wantsPainting?: boolean; paintingPrice?: number | null; }) => {
    console.log('[sendDeliveryReadyEmail] READY EMAIL - Starting send to:', customerEmail, 'wantsPainting:', delivery.wantsPainting);
    
    // Si el cliente quiere pintar, enviar email diferente
    if (delivery.wantsPainting) {
        return await sendDeliveryReadyForPaintingEmail(customerEmail, customerName, delivery);
    }
    
    // Email estándar para pickup (sin pintura)
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
    // Sanitize subject: remove newlines and excessive whitespace (email providers don't allow \n in subject)
    const sanitizedDescription = displayDescription.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    const subject = `✨ ¡Tus piezas están listas! - ${sanitizedDescription}`;
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
                    • Martes a Sábado: 10:00 AM - 8:00 PM<br/>
                    • Domingos: 12:00 PM - 5:00 PM<br/>
                    • Lunes: Cerrado
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
    try {
        await logEmailEvent(customerEmail, 'delivery_ready', 'email', (result as any)?.sent ? 'sent' : 'failed');
    } catch (e) {
        console.warn('[sendDeliveryReadyEmail] Failed to log email event:', e);
    }
    return result;
};

// Nuevo email: Pieza lista para PINTAR (diferente al pickup normal)
export const sendDeliveryReadyForPaintingEmail = async (
    customerEmail: string, 
    customerName: string, 
    delivery: { id?: string | null; description?: string | null; readyAt: string; paintingPrice?: number | null; }
) => {
    console.log('[sendDeliveryReadyForPaintingEmail] Starting email send to:', customerEmail);
    
    const readyDate = new Date(delivery.readyAt);
    const formattedReadyDate = readyDate.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const displayDescription = delivery.description || 'Tu pieza de cerámica';
    const sanitizedDescription = displayDescription.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    const subject = `🎨 ¡Tu pieza está lista para pintar! - ${sanitizedDescription}`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #4A4540; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D95F43;">¡Hola, ${customerName}!</h2>
            <p style="font-size: 18px; font-weight: bold; color: #D95F43;">🎨 ¡Buenas noticias! Tu pieza está lista para que la pintes.</p>
            
            <div style="background-color: #F4F2F1; border: 2px solid #D95F43; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <span style="font-size: 48px;">✨</span>
                    <h3 style="color: #D95F43; margin: 10px 0;">Es momento de darle color a tu creación</h3>
                </div>
                <p style="margin: 10px 0; font-size: 16px; text-align: center;"><strong>${displayDescription}</strong></p>
                <p style="margin: 10px 0; color: #6B5F58; text-align: center;">Lista desde: ${formattedReadyDate}</p>
            </div>

            <div style="background-color: #FDF7F2; border-left: 4px solid #D95F43; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #D95F43; margin-top: 0;">🎨 Reserva tu Horario de Pintura</h3>
                <p style="margin: 10px 0; color: #6B5F58; font-size: 14px;">
                    Necesitas agendar tu sesión de pintura en nuestro calendario. Es muy fácil:
                </p>
                <ol style="margin: 10px 0; color: #6B5F58; font-size: 14px;">
                    <li style="margin: 5px 0;"><strong>Visita nuestro sitio web</strong> y selecciona "Pintura de Piezas"</li>
                    <li style="margin: 5px 0;"><strong>Elige fecha y horario</strong> que más te convenga</li>
                    <li style="margin: 5px 0;"><strong>Confirma tu reserva</strong> en el calendario</li>
                </ol>
                <div style="text-align: center; margin-top: 20px;">
                    <a href="https://ceramicalma.com/?booking=painting${delivery.id ? `&deliveryId=${encodeURIComponent(String(delivery.id))}` : ''}" style="display: inline-block; background-color: #D95F43; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        📅 Reservar Horario de Pintura
                    </a>
                </div>
            </div>

            <div style="background-color: #F4F2F1; border-left: 4px solid #CCBCB2; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #4A4540; font-weight: bold;">🕐 Horarios Disponibles</p>
                <p style="margin: 8px 0 0 0; color: #6B5F58; font-size: 14px;">
                    • Martes a Viernes: 10:00 AM - 9:00 PM<br/>
                    • Sábados: 9:00 AM - 8:00 PM<br/>
                    • Domingos: 10:00 AM - 6:00 PM<br/>
                    • Duración: ~1-2 horas
                </p>
            </div>

            <div style="background-color: #FDF2F2; border: 1px solid #E7E1DB; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #B8474B; font-weight: bold;">⏰ Después de Pintar</p>
                <p style="margin: 8px 0 0 0; color: #6B5F58; font-size: 14px;">
                    Tu pieza necesitará <strong>5-7 días adicionales</strong> para el horneado final.<br/>
                    Te notificaremos cuando esté lista para recoger. 🎁
                </p>
            </div>

            <p style="margin-top: 20px; font-size: 15px;">
                Si tienes preguntas sobre colores, técnicas o el proceso, contáctanos por WhatsApp.
            </p>
            
            <div style="margin: 30px 0; text-align: center;">
                <a href="https://wa.me/593985813327" style="display: inline-block; background-color: #D95F43; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    📱 Contactar por WhatsApp
                </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                ¡Estamos emocionados de ver tu pieza con los colores que elijas!<br/><br/>
                Saludos,<br/>
                <strong>El equipo de CeramicAlma</strong>
            </p>
        </div>
    `;
    
    const result = await sendEmail(customerEmail, subject, html);
    console.log('[sendDeliveryReadyForPaintingEmail] Email send result:', result);
    try {
        await logEmailEvent(customerEmail, 'delivery_ready_painting', 'email', (result as any)?.sent ? 'sent' : 'failed');
    } catch (e) {
        console.warn('[sendDeliveryReadyForPaintingEmail] Failed to log email event:', e);
    }
    return result;
};

// Email: Confirmación de reserva de pintura (ya pagada)
export const sendPaintingBookingScheduledEmail = async (
    customerEmail: string,
    customerName: string,
    payload: { description?: string | null; bookingDate: string; bookingTime: string; participants: number; }
) => {
    const displayDescription = payload.description || 'Tu pieza de cerámica';
    const sanitizedDescription = displayDescription.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    const subject = `🎨 Reserva de pintura confirmada - ${sanitizedDescription}`;
    const formattedDate = new Date(payload.bookingDate + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const html = `
        <div style="font-family: Arial, sans-serif; color: #4A4540; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D95F43;">¡Hola, ${customerName}!</h2>
            <p style="font-size: 18px; font-weight: bold; color: #D95F43;">🎨 Tu reserva de pintura ha sido confirmada.</p>

            <div style="background-color: #FDF7F2; border-left: 4px solid #D95F43; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px;"><strong>${displayDescription}</strong></p>
                <p style="margin: 8px 0 0 0; color: #6B5F58; font-size: 14px;">Fecha: ${formattedDate}</p>
                <p style="margin: 4px 0 0 0; color: #6B5F58; font-size: 14px;">Hora: ${payload.bookingTime}</p>
                <p style="margin: 4px 0 0 0; color: #6B5F58; font-size: 14px;">Participantes: ${payload.participants}</p>
            </div>

            <div style="background-color: #F4F2F1; border-left: 4px solid #CCBCB2; padding: 18px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #4A4540; font-weight: bold;">✅ Servicio ya pagado</p>
                <p style="margin: 8px 0 0 0; color: #6B5F58; font-size: 14px;">No necesitas realizar ningún pago adicional.</p>
            </div>

            <p style="margin-top: 20px; font-size: 15px;">Si necesitas cambiar la hora, contáctanos por WhatsApp.</p>
            <div style="margin: 20px 0; text-align: center;">
                <a href="https://wa.me/593985813327" style="display: inline-block; background-color: #D95F43; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    📱 Contactar por WhatsApp
                </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Saludos,<br/><strong>El equipo de CeramicAlma</strong></p>
        </div>
    `;

    const result = await sendEmail(customerEmail, subject, html);
    try {
        await logEmailEvent(customerEmail, 'painting_booking_scheduled', 'email', (result as any)?.sent ? 'sent' : 'failed');
    } catch (e) {
        console.warn('[sendPaintingBookingScheduledEmail] Failed to log email event:', e);
    }
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
    // Sanitize subject: remove newlines and excessive whitespace
    const sanitizedDescription = displayDescription.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    const subject = `🔔 Recordatorio: Recoge tus piezas mañana - ${sanitizedDescription}`;
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
                    • Martes a Sábado: 10:00 AM - 8:00 PM<br/>
                    • Domingos: 12:00 PM - 5:00 PM<br/>
                    • Lunes: Cerrado
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
    
    const result = await sendEmail(customerEmail, subject, html);
    try {
        await logEmailEvent(customerEmail, 'delivery_completed', 'email', (result as any)?.sent ? 'sent' : 'failed');
    } catch (e) {
        console.warn('[sendDeliveryCompletedEmail] Failed to log email event:', e);
    }
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
    // Sanitize subject: remove newlines and excessive whitespace
    const sanitizedDescription = displayDescription.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    const subject = `✅ Piezas entregadas - ${sanitizedDescription}`;
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
    
    const result = await sendEmail(customerEmail, subject, html);
    try {
        await logEmailEvent(customerEmail, 'delivery_completed', 'email', (result as any)?.sent ? 'sent' : 'failed');
    } catch (e) {
        console.warn('[sendDeliveryCompletedEmail] Failed to log email event:', e);
    }
    return result;
};

// Email: Pieza pintada lista para RETIRAR (después del horneado final post-pintura)
export const sendPaintedPieceReadyForPickupEmail = async (
    customerEmail: string,
    customerName: string,
    delivery: { description?: string | null; readyAt: string; }
) => {
    console.log('[sendPaintedPieceReadyForPickupEmail] Starting email send to:', customerEmail);

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

    const displayDescription = delivery.description || 'Tu pieza de cerámica pintada';
    const sanitizedDescription = displayDescription.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    const subject = `🎁 ¡Tu pieza pintada está lista para retirar! - ${sanitizedDescription}`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #4A4540; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D95F43;">¡Hola, ${customerName}!</h2>
            <p style="font-size: 18px; font-weight: bold; color: #D95F43;">🎁 ¡Tu pieza pintada ya pasó el horneado final y está lista para retirar!</p>

            <div style="background-color: #FDF7F2; border: 2px solid #D95F43; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                <span style="font-size: 52px;">🎨✨</span>
                <h3 style="color: #D95F43; margin: 10px 0;">Tu creación pintada te espera</h3>
                <p style="margin: 10px 0; font-size: 16px;"><strong>${displayDescription}</strong></p>
                <p style="margin: 5px 0; color: #6B5F58; font-size: 14px;">Lista desde: ${formattedReadyDate}</p>
            </div>

            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #92400E; margin-top: 0;">⏰ Plazo de Recogida</h3>
                <p style="margin: 10px 0; color: #78350F; font-size: 15px;">
                    Tu pieza estará disponible hasta el <strong style="color: #D97706;">${formattedExpirationDate}</strong> (2 meses).
                </p>
                <p style="margin: 10px 0; color: #78350F; font-size: 14px;">
                    ⚠️ Después de esta fecha no podemos garantizar su disponibilidad.
                </p>
            </div>

            <div style="background-color: #F4F2F1; border-left: 4px solid #CCBCB2; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #4A4540; font-weight: bold;">🕐 Horario de Recogida</p>
                <p style="margin: 8px 0 0 0; color: #6B5F58; font-size: 14px;">
                    • Martes a Sábado: 10:00 AM - 8:00 PM<br/>
                    • Domingos: 12:00 PM - 5:00 PM<br/>
                    • Lunes: Cerrado
                </p>
            </div>

            <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; font-weight: bold; color: #374151;">📍 Dirección</p>
                <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 14px;">
                    Sol Plaza - Av. Samborondón Km 2.5<br/>
                    Samborondón 092501, Ecuador
                </p>
            </div>

            <p style="margin-top: 20px; font-size: 15px;">Si tienes alguna pregunta o necesitas coordinar la recogida, contáctanos por WhatsApp.</p>

            <div style="margin: 30px 0; text-align: center;">
                <a href="https://wa.me/593985813327" style="display: inline-block; background-color: #D95F43; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    📱 Contactar por WhatsApp
                </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                ¡Esperamos que ames tu creación pintada!<br/><br/>
                Saludos,<br/>
                <strong>El equipo de CeramicAlma</strong>
            </p>
        </div>
    `;

    const result = await sendEmail(customerEmail, subject, html);
    console.log('[sendPaintedPieceReadyForPickupEmail] Email send result:', result);
    try {
        await logEmailEvent(customerEmail, 'painted_piece_ready_pickup', 'email', (result as any)?.sent ? 'sent' : 'failed');
    } catch (e) {
        console.warn('[sendPaintedPieceReadyForPickupEmail] Failed to log email event:', e);
    }
    return result;
};

// Special email for couples experience bookings with technique details
export const sendCouplesTourConfirmationEmail = async (booking: Booking, bankDetails: BankDetails) => {
    const { userInfo, bookingCode, product, slots, technique } = booking;
    const technique_name = technique === 'potters_wheel' ? '🎯 Torno Alfarero' : '✋ Moldeo a Mano';
    
    const slot = slots && slots[0];
    const slotDate = slot ? parseLocalDate(slot.date).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    }) : '';
    const slotTime = slot?.time || '';

    const subject = `¡Tu Experiencia en Pareja está Confirmada! (Código: ${bookingCode})`;
    
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
            <h2 style="color: #D95F43;">♥️ ¡Hola, ${userInfo.firstName}!</h2>
            <p>¡Qué emoción! Tu experiencia en pareja ha sido confirmada en CeramicAlma. Código de reserva:</p>
            <p style="font-size: 24px; font-weight: bold; color: #D95F43; margin: 20px 0;">${bookingCode}</p>

            <div style="background: linear-gradient(135deg, #FFE5D9 0%, #FFE5D9 100%); border-left: 4px solid #D95F43; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #D95F43;">📅 Detalles de tu Experiencia</h3>
                <p style="margin: 10px 0;"><strong>Técnica seleccionada:</strong> ${technique_name}</p>
                <p style="margin: 10px 0;"><strong>Fecha:</strong> ${slotDate}</p>
                <p style="margin: 10px 0;"><strong>Hora:</strong> ${slotTime}</p>
                <p style="margin: 10px 0;"><strong>Duración:</strong> 2 horas</p>
                <p style="margin: 10px 0;"><strong>Precio:</strong> <span style="font-size: 18px; font-weight: bold; color: #D95F43;">$190</span></p>
            </div>

            <div style="background-color: #F0F9FF; border-left: 4px solid #0EA5E9; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #0369A1;">🎨 ¿Qué incluye tu experiencia?</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li style="margin: 8px 0;"><strong>Clase guiada 2h</strong> - Un instructor experto los guiará en cada paso</li>
                    <li style="margin: 8px 0;"><strong>Técnica a elegir</strong> - ${technique === 'potters_wheel' ? '🎯 Domina el torno alfarero clásico' : '✋ Crea libremente con moldeo a mano'}</li>
                    <li style="margin: 8px 0;"><strong>Materiales</strong> - Todo incluido: arcilla, agua, herramientas</li>
                    <li style="margin: 8px 0;"><strong>Horneado profesional</strong> - Tus creaciones se hornean en nuestro horno</li>
                    <li style="margin: 8px 0;"><strong>🍷 Vino y 🥂 Piqueos</strong> - Disfruta mientras crean juntos</li>
                    <li style="margin: 8px 0;"><strong>Piezas aptas para alimentos</strong> - Perfectas para uso diario</li>
                </ul>
            </div>

            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-weight: bold;">⏰ Pre-Reserva Válida por 2 Horas</p>
                <p style="margin: 8px 0 0 0; color: #78350F; font-size: 14px;">
                    Esta pre-reserva estará disponible solo durante las próximas <strong>2 horas</strong>. Para confirmar, realiza el pago a través de transferencia bancaria.
                </p>
            </div>

            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-weight: bold;">💳 Pago Anticipado Requerido</p>
                <p style="margin: 8px 0 0 0; color: #78350F; font-size: 14px;">
                    Esta experiencia requiere pago completo y anticipado: <strong>$190</strong>
                </p>
            </div>

            <p>Para confirmar, realiza una transferencia bancaria con los siguientes datos:</p>
            ${accountsHtml}

            <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #1E40AF; font-weight: bold;">📋 Información Importante</p>
                <p style="margin: 8px 0 0 0; color: #1E3A8A; font-size: 14px;">
                    • <strong>Llega 15 minutos antes</strong> - Para aclimatarse y conocer el espacio<br/>
                    • <strong>Política de cancelación:</strong> No reembolsable ni reagendable (pago anticipado)<br/>
                    • <strong>Contacto:</strong> Si tienes dudas, responde a este email o envíanos un WhatsApp
                </p>
            </div>

            <p style="margin-top: 20px; font-size: 16px;">¡Prepárense para una experiencia única y llena de magia! ♥️</p>
            <p>Saludos,<br/>El equipo de CeramicAlma</p>
        </div>
    `;

    const result = await sendEmail(userInfo.email, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(userInfo.email, 'couples-confirmation', 'email', status, bookingCode);

    console.info('[emailService] Couples tour confirmation email result for', userInfo.email, bookingCode, result);
    return result;
};

// Email reminder: package is almost complete, encourage renewal
export const sendPackageRenewalReminderEmail = async (
    customerEmail: string,
    payload: {
        firstName: string;
        lastName: string;
        remainingClasses: number;
        totalClasses: number;
        packageType: string; // "4 clases", "8 clases", "12 clases"
        packagePrice: number;
        lastBookingDate?: string;
    }
) => {
    const subject = `¡Tus clases de cerámica están por acabarse! Renueva tu paquete`;

    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #D95F43;">Hola ${payload.firstName},</h2>
            
            <p style="font-size: 16px; line-height: 1.6;">
                Nos da mucha alegría verte en nuestro estudio. Queremos recordarte que tu paquete de clases está por terminarse.
            </p>

            <div style="background: linear-gradient(135deg, #FFE5D9 0%, #FFE5D9 100%); border-left: 4px solid #D95F43; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #D95F43;">📊 Estado de tu Paquete</h3>
                <p style="font-size: 18px; margin: 10px 0;">
                    <strong>${payload.remainingClasses}</strong> de <strong>${payload.totalClasses}</strong> clases restantes
                </p>
                <div style="background: white; border-radius: 6px; padding: 12px; margin: 10px 0;">
                    <div style="background: #e0e0e0; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="background: #D95F43; height: 100%; width: ${((payload.totalClasses - payload.remainingClasses) / payload.totalClasses * 100)}%;"></div>
                    </div>
                    <p style="font-size: 12px; color: #666; margin: 8px 0 0 0;">
                        ${Math.round((payload.totalClasses - payload.remainingClasses) / payload.totalClasses * 100)}% completado
                    </p>
                </div>
            </div>

            ${payload.remainingClasses <= 2 ? `
            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-weight: bold;">⚠️ Últimas clases disponibles</p>
                <p style="margin: 8px 0 0 0; color: #78350F; font-size: 14px;">
                    Una vez agotes tus clases, tu paquete expirará. No podrás reactivarlo después.
                </p>
            </div>
            ` : ''}

            <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #1E40AF;">✨ Renovar tu Paquete</h3>
                <p style="color: #1E3A8A; font-size: 14px; margin: 10px 0;">
                    Continúa tu viaje creativo con un nuevo paquete. Mismas clases, mismo precio, más diversión.
                </p>
                <p style="color: #1E3A8A; font-size: 16px; font-weight: bold; margin: 15px 0;">
                    Paquete ${payload.packageType}: <span style="color: #D95F43;">$${payload.packagePrice}</span>
                </p>
                <a href="https://www.ceramicalma.com" style="display: inline-block; background-color: #D95F43; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0;">
                    🎨 Renovar Paquete
                </a>
            </div>

            <div style="background-color: #F0FDF4; border-left: 4px solid #22C55E; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #166534; font-size: 14px;">
                    <strong>💡 Tip:</strong> Los paquetes no son reembolsables, así que asegúrate de usar todas tus clases antes de que expire tu suscripción.
                </p>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                ¡Sigue creando!<br/>
                <strong>El equipo de CeramicAlma</strong>
            </p>
        </div>
    `;

    const result = await sendEmail(customerEmail, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(customerEmail, 'package-renewal-reminder', 'email', status);

    console.info('[emailService] Package renewal reminder sent to', customerEmail);
    return result;
};

// Email: Te quedan 2 clases en tu paquete
export const sendPackageTwoClassesReminderEmail = async (
    customerEmail: string,
    payload: {
        firstName: string;
        lastName: string;
        remainingClasses: number;
        totalClasses: number;
        packageType: string;
        packagePrice: number;
        technique: string;
    }
) => {
    const subject = `✨ ${payload.firstName}, te quedan ${payload.remainingClasses} clases`;
    const progressPercent = Math.round((payload.totalClasses - payload.remainingClasses) / payload.totalClasses * 100);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CeramicAlma</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #F5F5F5 0%, #FAFAFA 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #F5F5F5 0%, #FAFAFA 100%);">
        <tr>
            <td align="center" style="padding: 50px 20px;">
                <table width="100%" max-width="620" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
                    
                    <!-- Header elegante con degradado dual -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1976D2 0%, #1565C0 50%, #D95F43 100%); padding: 50px 30px; text-align: center;">
                            <div style="margin-bottom: 20px;">
                                <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Notificación CeramicAlma</p>
                            </div>
                            <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: white; letter-spacing: -1px;">
                                ¡Casi lo haces!
                            </h1>
                            <p style="margin: 15px 0 0 0; font-size: 15px; color: rgba(255,255,255,0.85); font-weight: 500;">
                                ${payload.technique}
                            </p>
                        </td>
                    </tr>

                    <!-- Contenido Principal -->
                    <tr>
                        <td style="padding: 45px 35px;">
                            <p style="margin: 0 0 8px 0; font-size: 15px; color: #555; line-height: 1.6;">
                                Hola <strong style="color: #1976D2;">${payload.firstName}</strong>,
                            </p>
                            <p style="margin: 0 0 35px 0; font-size: 15px; color: #666; line-height: 1.8;">
                                Tu viaje creativo en <strong>${payload.packageType}</strong> está llegando a su etapa final. Quería recordarte que te quedan clases para completar esta experiencia.
                            </p>

                            <!-- Tarjeta de estado con diseño avanzado -->
                            <div style="background: linear-gradient(135deg, #F0F4FF 0%, #F8FAFF 100%); border: 2px solid #1976D2; border-radius: 14px; padding: 32px; text-align: center; margin-bottom: 35px;">
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #1976D2; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">
                                    Clases Pendientes
                                </p>
                                <p style="margin: 8px 0 0 0; font-size: 64px; font-weight: 700; color: #D95F43; line-height: 1; text-shadow: 0 2px 8px rgba(217,95,67,0.1);">
                                    ${payload.remainingClasses}
                                </p>
                                <p style="margin: 12px 0 0 0; font-size: 13px; color: #1976D2; font-weight: 600;">
                                    de ${payload.totalClasses} clases originales
                                </p>
                            </div>

                            <!-- Barra de progreso avanzada -->
                            <div style="margin-bottom: 35px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                    <span style="font-size: 12px; color: #666; font-weight: 600;">Progreso de uso</span>
                                    <span style="font-size: 13px; font-weight: 700;">
                                        <span style="color: #D95F43;">${progressPercent}%</span>
                                        <span style="color: #BBB;">/</span>
                                        <span style="color: #1976D2;">100%</span>
                                    </span>
                                </div>
                                <div style="background: #E8EEFA; height: 10px; border-radius: 5px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
                                    <div style="background: linear-gradient(90deg, #D95F43 0%, #E67E50 60%, #1976D2 100%); height: 100%; width: ${progressPercent}%; border-radius: 5px; transition: width 0.3s ease;"></div>
                                </div>
                            </div>

                            <!-- Secciones de acciones con iconografía -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 35px;">
                                <tr>
                                    <td style="padding-right: 15px; vertical-align: top;">
                                        <div style="background: white; border: 2px solid #1976D2; border-radius: 12px; padding: 22px; text-align: center;">
                                            <p style="margin: 0 0 10px 0; font-size: 24px;">📅</p>
                                            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #1976D2;">Reserva</p>
                                            <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.5;">
                                                Tus 2 últimas clases
                                            </p>
                                        </div>
                                    </td>
                                    <td style="padding: 0 7.5px; vertical-align: top;">
                                        <div style="background: white; border: 2px solid #D95F43; border-radius: 12px; padding: 22px; text-align: center;">
                                            <p style="margin: 0 0 10px 0; font-size: 24px;">🎯</p>
                                            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #D95F43;">Planifica</p>
                                            <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.5;">
                                                Próximo paquete
                                            </p>
                                        </div>
                                    </td>
                                    <td style="padding-left: 15px; vertical-align: top;">
                                        <div style="background: white; border: 2px solid #25D366; border-radius: 12px; padding: 22px; text-align: center;">
                                            <p style="margin: 0 0 10px 0; font-size: 24px;">💬</p>
                                            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #25D366;">Consulta</p>
                                            <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.5;">
                                                Dudas sobre costo
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Principal -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 35px;">
                                        <a href="https://www.ceramicalma.com" style="display: inline-block; background: linear-gradient(135deg, #D95F43 0%, #B8401D 100%); padding: 18px 50px; color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 8px 20px rgba(217,95,67,0.3); letter-spacing: 0.3px;">
                                            Renovar ahora
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Info destacada con gradiente sutil -->
                            <div style="background: linear-gradient(135deg, rgba(25,118,210,0.05) 0%, rgba(217,95,67,0.05) 100%); border-left: 4px solid #1976D2; border-radius: 10px; padding: 22px; margin-bottom: 0;">
                                <p style="margin: 0; font-size: 13px; color: #333; line-height: 1.7;">
                                    <strong style="color: #1976D2;">Nota importante:</strong> Una vez uses tus 2 últimas clases, tu paquete expirará. Asegúrate de renovar para mantener tu acceso a nuestras técnicas.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Separador visual -->
                    <tr>
                        <td style="height: 1px; background: linear-gradient(90deg, transparent, #E0E0E0, transparent);"></td>
                    </tr>

                    <!-- Footer elegante -->
                    <tr>
                        <td style="background: #FAFAFA; padding: 40px 35px; text-align: center;">
                            <p style="margin: 0 0 25px 0; font-size: 13px; color: #666;">
                                ¿Preguntas sobre tu renovación?
                            </p>
                            <a href="https://wa.me/593985813327" style="display: inline-block; background: linear-gradient(135deg, #25D366 0%, #1FA855 100%); color: white; padding: 13px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(37,211,102,0.3);">
                                💬 Escribir por WhatsApp
                            </a>
                            <p style="margin: 25px 0 0 0; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px;">
                                © CeramicAlma 2026
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <style>
        @media (max-width: 620px) {
            table[max-width] { width: 100% !important; }
            td { padding: 20px 15px !important; }
            h1 { font-size: 28px !important; }
            .prog { font-size: 48px !important; }
        }
    </style>
</body>
</html>`;

    const result = await sendEmail(customerEmail, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(customerEmail, 'package-two-classes-reminder', 'email', status);

    console.info('[emailService] Package 2-classes reminder sent to', customerEmail);
    return result;
};

// Email: Te queda 1 clase - Última oportunidad
export const sendPackageLastClassWarningEmail = async (
    customerEmail: string,
    payload: {
        firstName: string;
        lastName: string;
        packageType: string;
        packagePrice: number;
        technique: string;
    }
) => {
    const subject = `✨ ${payload.firstName}, 1 clase pendiente`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CeramicAlma</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #F5F5F5 0%, #FAFAFA 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #F5F5F5 0%, #FAFAFA 100%);">
        <tr>
            <td align="center" style="padding: 50px 20px;">
                <table width="100%" max-width="620" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
                    
                    <!-- Header elegante con énfasis en blue -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1976D2 0%, #1565C0 50%, #0D47A1 100%); padding: 50px 30px; text-align: center;">
                            <div style="margin-bottom: 20px;">
                                <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Última oportunidad</p>
                            </div>
                            <h1 style="margin: 0; font-size: 36px; font-weight: 700; color: white; letter-spacing: -1px;">
                                Tu clase final
                            </h1>
                            <p style="margin: 15px 0 0 0; font-size: 15px; color: rgba(255,255,255,0.85); font-weight: 500;">
                                En ${payload.technique}
                            </p>
                        </td>
                    </tr>

                    <!-- Contenido Principal -->
                    <tr>
                        <td style="padding: 45px 35px;">
                            <p style="margin: 0 0 8px 0; font-size: 15px; color: #555; line-height: 1.6;">
                                Hola <strong style="color: #1976D2;">${payload.firstName}</strong>,
                            </p>
                            <p style="margin: 0 0 35px 0; font-size: 15px; color: #666; line-height: 1.8;">
                                TuExperiencia en <strong>${payload.packageType}</strong> está llegando a su punto final. <strong>Te queda 1 sola clase</strong> para completar este paquete.
                            </p>

                            <!-- Tarjeta prominente de la última clase -->
                            <div style="background: linear-gradient(135deg, #F0F4FF 0%, #E3F2FD 100%); border: 3px solid #1976D2; border-radius: 14px; padding: 35px; text-align: center; margin-bottom: 35px; position: relative;">
                                <p style="margin: 0 0 8px 0; font-size: 12px; color: #1976D2; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                                    🎯 Tu última clase
                                </p>
                                <p style="margin: 12px 0 0 0; font-size: 72px; font-weight: 700; color: #D95F43; line-height: 1; text-shadow: 0 2px 8px rgba(217,95,67,0.15);">
                                    1
                                </p>
                                <p style="margin: 15px 0 0 0; font-size: 14px; color: #555; font-weight: 600;">
                                    Después de esta, tu paquete se completa
                                </p>
                            </div>

                            <!-- Timeline visual -->
                            <div style="background: #FAFAFA; border-radius: 12px; padding: 28px; margin-bottom: 35px; border: 1px solid #E8E8E8;">
                                <p style="margin: 0 0 20px 0; font-size: 13px; font-weight: 700; color: #1976D2; text-transform: uppercase; letter-spacing: 0.8px;">
                                    ⏱️ Lo que ocurrirá
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="vertical-align: top; padding-bottom: 18px;">
                                            <div style="display: inline-block; background: linear-gradient(135deg, #D95F43 0%, #E67E50 100%); color: white; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; font-size: 14px; margin-right: 12px;">1</div>
                                        </td>
                                        <td style="vertical-align: top; padding-bottom: 18px;">
                                            <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #333;">Reserva tu clase</p>
                                            <p style="margin: 0; font-size: 12px; color: #888;">Elige fecha y hora que funcione mejor para ti</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="vertical-align: top; padding-bottom: 18px;">
                                            <div style="display: inline-block; background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%); color: white; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; font-size: 14px; margin-right: 12px;">2</div>
                                        </td>
                                        <td style="vertical-align: top; padding-bottom: 0;">
                                            <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #333;">Asiste a tu sesión</p>
                                            <p style="margin: 0; font-size: 12px; color: #888;">Disfruta de tu última experiencia creativa con nosotros</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- CTA Principal de renovación -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 25px;">
                                        <a href="https://www.ceramicalma.com" style="display: inline-block; background: linear-gradient(135deg, #D95F43 0%, #B8401D 100%); padding: 18px 50px; color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 8px 20px rgba(217,95,67,0.3); letter-spacing: 0.3px;">
                                            Renovar ahora
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Información sobre vencimiento -->
                            <div style="background: linear-gradient(135deg, #F0F4FF 0%, #F8FAFF 100%); border-left: 4px solid #1976D2; border-radius: 10px; padding: 22px; margin-bottom: 25px;">
                                <p style="margin: 0; font-size: 13px; color: #0D47A1; line-height: 1.7;">
                                    <strong>Información importante:</strong> Una vez uses esta clase, tu acceso a este paquete terminará. Los nuevos paquetes están disponibles para que continúes tu viaje creativo sin interrupciones.
                                </p>
                            </div>

                            <!-- Razones para renovar -->
                            <div style="background: #FAFAFA; border-radius: 12px; padding: 28px; border: 1px solid #E8E8E8;">
                                <p style="margin: 0 0 18px 0; font-size: 13px; font-weight: 700; color: #333; text-transform: uppercase; letter-spacing: 0.8px;">
                                    ✨ ¿Por qué renovar?
                                </p>
                                <ul style="margin: 0; padding-left: 0; list-style: none;">
                                    <li style="margin-bottom: 12px; font-size: 13px; color: #666; line-height: 1.6;">
                                        <span style="color: #D95F43; font-weight: 700; margin-right: 8px;">→</span>Continúa aprendiendo nuevas técnicas
                                    </li>
                                    <li style="margin-bottom: 12px; font-size: 13px; color: #666; line-height: 1.6;">
                                        <span style="color: #D95F43; font-weight: 700; margin-right: 8px;">→</span>Sé parte de nuestra comunidad creativa
                                    </li>
                                    <li style="font-size: 13px; color: #666; line-height: 1.6;">
                                        <span style="color: #D95F43; font-weight: 700; margin-right: 8px;">→</span>Acceso a instrucciones personalizadas
                                    </li>
                                </ul>
                            </div>
                        </td>
                    </tr>

                    <!-- Separador visual -->
                    <tr>
                        <td style="height: 1px; background: linear-gradient(90deg, transparent, #E0E0E0, transparent);"></td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #FAFAFA; padding: 40px 35px; text-align: center;">
                            <p style="margin: 0 0 25px 0; font-size: 13px; color: #666;">
                                ¿Tienes alguna pregunta sobre tu renovación?
                            </p>
                            <a href="https://wa.me/593985813327" style="display: inline-block; background: linear-gradient(135deg, #25D366 0%, #1FA855 100%); color: white; padding: 13px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(37,211,102,0.3);">
                                💬 Chat por WhatsApp
                            </a>
                            <p style="margin: 25px 0 0 0; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px;">
                                © CeramicAlma 2026
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <style>
        @media (max-width: 620px) {
            table[max-width] { width: 100% !important; }
            td { padding: 20px 15px !important; }
            h1 { font-size: 32px !important; }
            .numero { font-size: 48px !important; }
        }
    </style>
</body>
</html>`;

    const result = await sendEmail(customerEmail, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(customerEmail, 'package-last-class-warning', 'email', status);

    console.info('[emailService] Package last class warning sent to', customerEmail);
    return result;
};

// ==================== NEW EXPERIENCE EMAILS ====================

export const sendGroupClassConfirmationEmail = async (
    customerEmail: string,
    bookingDetails: {
        firstName: string;
        groupSize: number;
        date: string;
        time: string;
        price: number;
        bookingCode: string;
    }
) => {
    const subject = `✓ Tu Clase Grupal Está Confirmada - ${bookingDetails.bookingCode}`;
    
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; padding: 20px;">
            <h1 style="color: #1F2937; font-size: 24px; margin-bottom: 20px;">✓ ¡Tu Clase Grupal Está Confirmada!</h1>
            
            <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="color: #1E40AF; margin-top: 0;">Detalles de tu Reserva</h3>
                <p style="margin: 10px 0;"><strong>Código de Reserva:</strong> ${bookingDetails.bookingCode}</p>
                <p style="margin: 10px 0;"><strong>Cantidad de Personas:</strong> ${bookingDetails.groupSize}</p>
                <p style="margin: 10px 0;"><strong>Fecha:</strong> ${bookingDetails.date}</p>
                <p style="margin: 10px 0;"><strong>Hora:</strong> ${bookingDetails.time}</p>
                <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #3B82F6;">Total: $${bookingDetails.price}</strong></p>
            </div>

            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-size: 14px;">
                    <strong>📝 Importante:</strong> Por favor lleva a tu grupo 15 minutos antes. Confirma con tu equipo la fecha y hora exacta.
                </p>
            </div>

            <div style="background: #F3E8FF; border-left: 4px solid #A855F7; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="color: #7E22CE; margin-top: 0;">🎁 Importante sobre tu reserva</h3>
                <p style="color: #6B21A8; font-size: 14px; margin: 10px 0; line-height: 1.6;">
                    Tu reserva es especial y personal. El valor que pagaste es exclusivo para esta experiencia en esta fecha, diseñado pensando en ti y tu grupo. Algunos detalles clave:
                </p>
                <ul style="color: #6B21A8; font-size: 14px; margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                    <li><strong>✓ Tu valor es válido únicamente para esta experiencia y fecha</strong></li>
                    <li><strong>✓ No puede transferirse a otra persona</strong></li>
                    <li><strong>✓ No se puede combinar con otros servicios o descuentos de Ceramicalma</strong></li>
                    <li><strong>✓ Si necesitas cambiar la fecha, aplican términos de reprogramación</strong></li>
                    <li><strong>✓ Tu inversión es final y no reembolsable</strong></li>
                </ul>
                <p style="color: #6B21A8; font-size: 14px; margin-top: 12px;">
                    Queremos que disfrutes cada momento. Si tienes dudas, estamos aquí. 🎨
                </p>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                ¡Que disfruten su experiencia!<br/>
                <strong>El equipo de Ceramicalma</strong>
            </p>
        </div>
    `;

    const result = await sendEmail(customerEmail, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(customerEmail, 'group-class-confirmation', 'email', status);

    console.info('[emailService] Group class confirmation sent to', customerEmail);
    return result;
};

export const sendExperiencePendingReviewEmail = async (
    customerEmail: string,
    bookingDetails: {
        firstName: string;
        piecesCount: number;
        totalPrice: number;
        bookingCode: string;
        guidedOption: string;
    }
) => {
    const subject = `⏳ Tu Experiencia Personalizada Está en Revisión - ${bookingDetails.bookingCode}`;
    
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; padding: 20px;">
            <h1 style="color: #1F2937; font-size: 24px; margin-bottom: 20px;">⏳ Tu Experiencia Está en Revisión</h1>
            
            <p style="color: #4B5563; font-size: 16px;">Hola ${bookingDetails.firstName},</p>
            
            <p style="color: #6B7280; font-size: 14px; margin: 20px 0;">
                Hemos recibido tu solicitud para una experiencia personalizada. Nuestro equipo está revisando la disponibilidad y te confirmaremos en las próximas 24 horas.
            </p>

            <div style="background: #F3E8FF; border-left: 4px solid #A855F7; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="color: #6B21A8; margin-top: 0;">Detalles de tu Solicitud</h3>
                <p style="margin: 10px 0;"><strong>Código:</strong> ${bookingDetails.bookingCode}</p>
                <p style="margin: 10px 0;"><strong>Piezas Seleccionadas:</strong> ${bookingDetails.piecesCount}</p>
                <p style="margin: 10px 0;"><strong>Opción de Guía:</strong> ${bookingDetails.guidedOption}</p>
                <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #A855F7;">Total: $${bookingDetails.totalPrice}</strong></p>
            </div>

            <div style="background: #DBEAFE; border-left: 4px solid #0EA5E9; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #075985; font-size: 14px;">
                    <strong>✓ Pago Confirmado:</strong> Tu pago ha sido procesado correctamente. Recibirás la confirmación de la experiencia por email.
                </p>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                Cualquier duda, no dudes en contactarnos.<br/>
                <strong>El equipo de Ceramicalma</strong>
            </p>
        </div>
    `;

    const result = await sendEmail(customerEmail, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(customerEmail, 'experience-pending-review', 'email', status);

    console.info('[emailService] Experience pending review sent to', customerEmail);
    return result;
};

export const sendExperienceConfirmedEmail = async (
    customerEmail: string,
    bookingDetails: {
        firstName: string;
        piecesCount: number;
        totalPrice: number;
        bookingCode: string;
        confirmationReason?: string;
    }
) => {
    const subject = `✓ ¡Tu Experiencia Personalizada Confirmada! - ${bookingDetails.bookingCode}`;
    
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; padding: 20px;">
            <h1 style="color: #1F2937; font-size: 24px; margin-bottom: 20px;">✓ ¡Tu Experiencia Personalizada Está Confirmada!</h1>
            
            <p style="color: #4B5563; font-size: 16px;">Hola ${bookingDetails.firstName},</p>
            
            <p style="color: #6B7280; font-size: 14px; margin: 20px 0;">
                ¡Excelente noticia! Tu experiencia personalizada ha sido confirmada por nuestro equipo. Estamos listos para que disfrutes creando tus propias piezas.
            </p>

            <div style="background: #F0FDF4; border-left: 4px solid #22C55E; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="color: #166534; margin-top: 0;">Experiencia Confirmada</h3>
                <p style="margin: 10px 0;"><strong>Código:</strong> ${bookingDetails.bookingCode}</p>
                <p style="margin: 10px 0;"><strong>Piezas a Trabajar:</strong> ${bookingDetails.piecesCount}</p>
                <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #22C55E;">Total: $${bookingDetails.totalPrice}</strong></p>
                ${bookingDetails.confirmationReason ? `<p style="margin: 10px 0; font-size: 14px; color: #166534;"><em>${bookingDetails.confirmationReason}</em></p>` : ''}
            </div>

            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-size: 14px;">
                    <strong>📞 Próximo Paso:</strong> Nuestro equipo se pondrá en contacto contigo por WhatsApp para coordinar la fecha y hora exacta.
                </p>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                ¡A crear se ha dicho!<br/>
                <strong>El equipo de Ceramicalma</strong>
            </p>
        </div>
    `;

    const result = await sendEmail(customerEmail, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(customerEmail, 'experience-confirmed', 'email', status);

    console.info('[emailService] Experience confirmed sent to', customerEmail);
    return result;
};

export const sendExperienceRejectedEmail = async (
    customerEmail: string,
    bookingDetails: {
        firstName: string;
        bookingCode: string;
        rejectionReason: string;
    }
) => {
    const subject = `ℹ️ Actualización sobre tu Experiencia Personalizada - ${bookingDetails.bookingCode}`;
    
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; padding: 20px;">
            <h1 style="color: #1F2937; font-size: 24px; margin-bottom: 20px;">ℹ️ Actualización sobre tu Solicitud</h1>
            
            <p style="color: #4B5563; font-size: 16px;">Hola ${bookingDetails.firstName},</p>
            
            <p style="color: #6B7280; font-size: 14px; margin: 20px 0;">
                Lamentablemente, no pudimos confirmar tu experiencia personalizada en esta ocasión.
            </p>

            <div style="background: #FEE2E2; border-left: 4px solid #EF4444; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="color: #991B1B; margin-top: 0;">Razón</h3>
                <p style="margin: 10px 0; color: #7F1D1D;">${bookingDetails.rejectionReason}</p>
                <p style="margin: 10px 0;"><strong>Código:</strong> ${bookingDetails.bookingCode}</p>
            </div>

            <div style="background: #DBEAFE; border-left: 4px solid #0EA5E9; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #075985; font-size: 14px;">
                    <strong>💰 Reembolso:</strong> Tu pago ha sido reembolsado. Por favor verifica tu cuenta en 3-5 días hábiles.
                </p>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
                ¿Tienes preguntas? No dudes en contactarnos por WhatsApp.
            </p>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                Esperamos verte pronto con otra experiencia.<br/>
                <strong>El equipo de Ceramicalma</strong>
            </p>
        </div>
    `;

    const result = await sendEmail(customerEmail, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(customerEmail, 'experience-rejected', 'email', status);

    console.info('[emailService] Experience rejected sent to', customerEmail);
    return result;
};

// ============ CUSTOM GROUP EXPERIENCE EMAIL ============

export const sendCustomExperiencePreBookingEmail = async (
    booking: {
        userInfo: { firstName: string; email: string; phone?: string };
        bookingCode: string;
        experienceType: 'ceramic_only' | 'celebration';
        technique: string;
        date: string;
        time: string;
        participants: number;
        totalPrice: number;
        config: any;
    },
    bankDetails: BankDetails
) => {
    const { userInfo, bookingCode, experienceType, technique, date, time, participants, totalPrice, config } = booking;
    
    // Formatear fecha
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    // Traducir técnica
    const techniqueNames: Record<string, string> = {
        'potters_wheel': 'Torno',
        'hand_modeling': 'Modelado a Mano',
        'painting': 'Pintura'
    };
    const techniqueName = techniqueNames[technique] || technique;

    // Tipo de experiencia
    const experienceTypeName = experienceType === 'celebration' ? '🎉 Celebración' : '🎨 Solo Cerámica';

    // Detalles adicionales
    let additionalDetails = '';
    if (experienceType === 'celebration' && config) {
        additionalDetails = `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #E5E7EB;">
                <p style="margin: 8px 0;"><strong>⏰ Duración:</strong> ${config.hours} hora(s)</p>
                <p style="margin: 8px 0;"><strong>👥 Participantes activos:</strong> ${config.activeParticipants}</p>
                ${config.spectators > 0 ? `<p style="margin: 8px 0;"><strong>👀 Espectadores:</strong> ${config.spectators}</p>` : ''}
                ${config.childrenPieces && config.childrenPieces.length > 0 ? `<p style="margin: 8px 0;"><strong>👶 Piezas para niños:</strong> ${config.childrenPieces.length}</p>` : ''}
            </div>
        `;
    }

    const subject = `⏳ Pre-Reserva Experiencia Grupal - ${bookingCode}`;
    
    const html = `
        <div style="font-family: 'Cardo', serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; padding: 0;">
            <!-- Header with brand gradient -->
            <div style="background: linear-gradient(135deg, #828E98 0%, #6B7A86 100%); text-align: center; padding: 40px 20px; color: white;">
                <h1 style="font-size: 32px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Ceramicalma</h1>
                <p style="font-size: 14px; margin: 0; opacity: 0.9; font-style: italic;">Experiencia Grupal Personalizada</p>
            </div>

            <!-- Main content -->
            <div style="padding: 40px 30px;">
                <h2 style="color: #828E98; font-size: 24px; margin: 0 0 20px 0; font-weight: 700;">⏳ ¡Tu Pre-Reserva Está Lista!</h2>
                
                <p style="color: #4A4540; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hola <strong>${userInfo.firstName}</strong>,</p>
                
                <p style="color: #958985; font-size: 15px; line-height: 1.7; margin: 0 0 28px 0;">
                    Hemos recibido tu solicitud para una experiencia grupal personalizada. Para confirmar tu reserva, por favor realiza el pago dentro de las próximas <strong>2 horas</strong>.
                </p>

                <!-- Booking Details Box -->
                <div style="background: #F4F2F1; border-left: 5px solid #828E98; padding: 24px; margin: 28px 0; border-radius: 8px;">
                    <h3 style="color: #828E98; margin: 0 0 16px 0; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">📋 Detalles de tu Experiencia</h3>
                    <table style="width: 100%; color: #4A4540; font-size: 14px;">
                        <tr style="border-bottom: 1px solid #D1D0C6;">
                            <td style="padding: 10px 0; font-weight: 600; width: 40%;">Código:</td>
                            <td style="padding: 10px 0; font-family: 'Courier New', monospace; letter-spacing: 0.5px; color: #828E98; font-weight: 700;">${bookingCode}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #D1D0C6;">
                            <td style="padding: 10px 0; font-weight: 600;">Tipo:</td>
                            <td style="padding: 10px 0;">${experienceTypeName}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #D1D0C6;">
                            <td style="padding: 10px 0; font-weight: 600;">Técnica:</td>
                            <td style="padding: 10px 0;">${techniqueName}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #D1D0C6;">
                            <td style="padding: 10px 0; font-weight: 600;">📅 Fecha:</td>
                            <td style="padding: 10px 0;">${formattedDate}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #D1D0C6;">
                            <td style="padding: 10px 0; font-weight: 600;">🕐 Hora:</td>
                            <td style="padding: 10px 0;">${time}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #D1D0C6;">
                            <td style="padding: 10px 0; font-weight: 600;">👥 Participantes:</td>
                            <td style="padding: 10px 0;">${participants} persona(s)</td>
                        </tr>
                    </table>
                    ${additionalDetails}
                    <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid #D1D0C6;">
                        <p style="margin: 0; font-size: 24px; color: #828E98; font-weight: 700; text-align: right;">
                            $${totalPrice.toFixed(2)}
                        </p>
                    </div>
                </div>

                <!-- Payment Instructions -->
                <div style="background: linear-gradient(135deg, rgba(204, 188, 178, 0.08) 0%, transparent 100%); border: 2px solid #D1D0C6; padding: 24px; margin: 28px 0; border-radius: 8px;">
                    <h3 style="color: #828E98; margin: 0 0 16px 0; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">💳 Instrucciones de Pago</h3>
                    <p style="color: #4A4540; font-size: 14px; margin: 0 0 18px 0; line-height: 1.6;">
                        Realiza tu transferencia bancaria a cualquiera de nuestras cuentas:
                    </p>
                    ${Array.isArray(bankDetails) ? bankDetails.map(acc => `
                        <div style="background: white; border: 1px solid #D1D0C6; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
                                <div>
                                    <p style="margin: 0 0 4px 0; font-size: 11px; color: #828E98; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Banco</p>
                                    <p style="margin: 0; font-size: 15px; font-weight: 600; color: #4A4540;">${acc.bankName}</p>
                                </div>
                                <div>
                                    <p style="margin: 0 0 4px 0; font-size: 11px; color: #828E98; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Tipo Cuenta</p>
                                    <p style="margin: 0; font-size: 15px; font-weight: 600; color: #4A4540;">${acc.accountType}</p>
                                </div>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <p style="margin: 0 0 4px 0; font-size: 11px; color: #828E98; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Titular</p>
                                <p style="margin: 0; font-size: 14px; color: #4A4540;">${acc.accountHolder}</p>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <p style="margin: 0 0 4px 0; font-size: 11px; color: #828E98; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Número de Cuenta</p>
                                <p style="margin: 0; font-size: 16px; font-family: 'Courier New', monospace; font-weight: 700; color: #828E98; letter-spacing: 1px; background: #F4F2F1; padding: 8px 12px; border-radius: 4px;">${acc.accountNumber}</p>
                            </div>
                            <div>
                                <p style="margin: 0 0 4px 0; font-size: 11px; color: #828E98; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Cédula</p>
                                <p style="margin: 0; font-size: 14px; color: #4A4540;">${acc.taxId}</p>
                            </div>
                        </div>
                    `).join('') : `
                        <div style="background: white; border: 1px solid #D1D0C6; border-radius: 6px; padding: 16px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
                                <div>
                                    <p style="margin: 0 0 4px 0; font-size: 11px; color: #828E98; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Banco</p>
                                    <p style="margin: 0; font-size: 15px; font-weight: 600; color: #4A4540;">${bankDetails.bankName}</p>
                                </div>
                                <div>
                                    <p style="margin: 0 0 4px 0; font-size: 11px; color: #828E98; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Tipo Cuenta</p>
                                    <p style="margin: 0; font-size: 15px; font-weight: 600; color: #4A4540;">${bankDetails.accountType}</p>
                                </div>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <p style="margin: 0 0 4px 0; font-size: 11px; color: #828E98; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Titular</p>
                                <p style="margin: 0; font-size: 14px; color: #4A4540;">${bankDetails.accountHolder}</p>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <p style="margin: 0 0 4px 0; font-size: 11px; color: #828E98; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Número de Cuenta</p>
                                <p style="margin: 0; font-size: 16px; font-family: 'Courier New', monospace; font-weight: 700; color: #828E98; letter-spacing: 1px; background: #F4F2F1; padding: 8px 12px; border-radius: 4px;">${bankDetails.accountNumber}</p>
                            </div>
                            <div>
                                <p style="margin: 0 0 4px 0; font-size: 11px; color: #828E98; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Cédula</p>
                                <p style="margin: 0; font-size: 14px; color: #4A4540;">${bankDetails.taxId}</p>
                            </div>
                        </div>
                    `}
                    <div style="margin-top: 20px; padding: 16px; background: white; border: 2px solid #828E98; border-radius: 8px; text-align: center;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: #828E98; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Monto a Transferir</p>
                        <p style="margin: 0; font-size: 28px; color: #828E98; font-weight: 700;">$${totalPrice.toFixed(2)}</p>
                    </div>
                    <p style="color: #4A4540; font-size: 13px; margin: 16px 0 0 0; line-height: 1.6;">
                        <strong>⏰ Importante:</strong> Usa tu código de reserva <strong>${bookingCode}</strong> como referencia en la transferencia. Esta pre-reserva expira en <strong>2 horas</strong>.
                    </p>
                </div>

                <!-- Terms & Conditions -->
                <div style="background: #F4F2F1; border-left: 5px solid #CCBCB2; padding: 24px; margin: 28px 0; border-radius: 8px;">
                    <h3 style="color: #4A4540; margin: 0 0 14px 0; font-size: 16px; font-weight: 700;">🎁 Términos de tu Reserva</h3>
                    <p style="color: #4A4540; font-size: 14px; margin: 0 0 14px 0; line-height: 1.6;">
                        Tu experiencia es especial y personalizada. El valor que pagaste es exclusivo para esta actividad en esta fecha, diseñado solo para ti y tu grupo.
                    </p>
                    <ul style="color: #4A4540; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li style="margin-bottom: 6px;">✓ <strong>Válido solo para esta experiencia y fecha</strong></li>
                        <li style="margin-bottom: 6px;">✓ <strong>No transferible a otra persona</strong></li>
                        <li style="margin-bottom: 6px;">✓ <strong>No acumulable con otros servicios o descuentos</strong></li>
                        <li style="margin-bottom: 6px;">✓ <strong>No reembolsable</strong></li>
                        <li>✓ <strong>Cambios de fecha sujetos a disponibilidad y términos</strong></li>
                    </ul>
                </div>

                <!-- Closing -->
                <p style="color: #958985; font-size: 15px; line-height: 1.7; margin: 28px 0 0 0;">
                    ¿Tienes preguntas? Estamos aquí para ayudarte. Contáctanos sin dudas. 🎨
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #F4F2F1; border-top: 1px solid #D1D0C6; padding: 24px 30px; text-align: center;">
                <p style="color: #4A4540; font-size: 14px; margin: 0 0 12px 0;">
                    <strong>¿Preguntas? Contáctanos</strong><br/>
                    <span style="font-size: 13px; color: #958985;">
                        📧 cmassuh@ceramicalma.com<br/>
                        📱 +593 98 581 3327
                    </span>
                </p>
                <p style="color: #958985; font-size: 12px; margin: 14px 0 0 0; font-style: italic;">
                    El equipo de Ceramicalma
                </p>
            </div>
        </div>
    `;

    const result = await sendEmail(userInfo.email, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(userInfo.email, 'custom-experience-prebooking', 'email', status, bookingCode);

    console.info('[emailService] Custom experience pre-booking email sent to', userInfo.email);
    return result;
};

// ============================================
// San Valentín 2026 - Emails
// ============================================

const getWorkshopName = (workshop: string): string => {
    const names: Record<string, string> = {
        'florero_arreglo_floral': 'Decoración de florero de cerámica + Arreglo Floral',
        'modelado_san_valentin': 'Modelado a mano + Colores San Valentín',
        'torno_san_valentin': 'Torno Alfarero San Valentín'
    };
    return names[workshop] || workshop;
};

const getWorkshopTime = (workshop: string): string => {
    const times: Record<string, string> = {
        'florero_arreglo_floral': '10h00 a 12h00',
        'modelado_san_valentin': '14h00 a 16h00',
        'torno_san_valentin': '17h00 a 19h00'
    };
    return times[workshop] || '';
};

/**
 * Email de confirmación de inscripción (se envía inmediatamente al registrarse)
 */
export const sendValentineRegistrationEmail = async (data: {
    id: string;
    fullName: string;
    email: string;
    workshop: string;
    participants: 1 | 2;
}) => {
    const { id, fullName, email, workshop, participants } = data;
    const workshopName = getWorkshopName(workshop);
    const workshopTime = getWorkshopTime(workshop);
    const participantText = participants === 2 ? 'para 2 personas' : 'individual';

    const subject = `💕 ¡Recibimos tu inscripción San Valentín! - ${workshopName}`;

    const html = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <!-- Header con paleta de marca + San Valentín -->
            <div style="background: linear-gradient(135deg, #828E98 0%, #958985 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #B8474B;">
                <h1 style="color: #fff; font-size: 28px; margin: 0 0 8px 0; font-weight: 500; letter-spacing: 0.5px;">
                    San Valentín en Ceramicalma
                </h1>
                <p style="color: rgba(255,255,255,0.95); font-size: 16px; margin: 0; font-weight: 300;">
                    Inscripción recibida 💕
                </p>
            </div>

            <!-- Contenido -->
            <div style="padding: 35px 30px;">
                <p style="color: #4A4540; font-size: 17px; line-height: 1.7; margin: 0 0 24px 0;">
                    Hola <strong>${fullName}</strong>,
                </p>

                <p style="color: #4A4540; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                    ¡Gracias por inscribirte a nuestro evento especial de San Valentín! 💕
                </p>

                <!-- Detalles de inscripción -->
                <div style="background: linear-gradient(135deg, #FDF2F2 0%, #FCEAEA 100%); border: 1px solid #F5C6C6; border-radius: 12px; padding: 24px; margin: 20px 0;">
                    <h3 style="color: #B8474B; font-size: 16px; margin: 0 0 16px 0; font-weight: 600;">
                        📋 Detalles de tu inscripción
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #958985; font-size: 14px; border-bottom: 1px solid #F5C6C6;">Código:</td>
                            <td style="padding: 8px 0; color: #4A4540; font-size: 14px; font-weight: 600; border-bottom: 1px solid #F5C6C6;">${id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #958985; font-size: 14px; border-bottom: 1px solid #F5C6C6;">Taller:</td>
                            <td style="padding: 8px 0; color: #4A4540; font-size: 14px; font-weight: 500; border-bottom: 1px solid #F5C6C6;">${workshopName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #958985; font-size: 14px; border-bottom: 1px solid #F5C6C6;">Horario:</td>
                            <td style="padding: 8px 0; color: #4A4540; font-size: 14px; border-bottom: 1px solid #F5C6C6;">${workshopTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #958985; font-size: 14px; border-bottom: 1px solid #F5C6C6;">Fecha:</td>
                            <td style="padding: 8px 0; color: #B8474B; font-size: 14px; font-weight: 600; border-bottom: 1px solid #F5C6C6;">14 de febrero, 2026</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #958985; font-size: 14px;">Participantes:</td>
                            <td style="padding: 8px 0; color: #4A4540; font-size: 14px;">${participantText}</td>
                        </tr>
                    </table>
                </div>

                <!-- Estado -->
                <div style="background: #FEF3CD; border: 1px solid #FFEEBA; border-radius: 10px; padding: 18px 20px; margin: 24px 0;">
                    <p style="color: #856404; font-size: 14px; margin: 0; line-height: 1.5;">
                        ⏳ <strong>Estado: Pendiente de validación</strong><br/>
                        Estamos revisando tu comprobante de pago. Te enviaremos un email cuando sea confirmado.
                    </p>
                </div>

                <!-- Qué incluye -->
                <div style="margin: 28px 0;">
                    <h3 style="color: #4A4540; font-size: 15px; margin: 0 0 14px 0; font-weight: 600;">
                        ✨ Tu experiencia incluye:
                    </h3>
                    <ul style="color: #4A4540; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li style="margin-bottom: 6px;">Clase guiada y acompañamiento de creación</li>
                        <li style="margin-bottom: 6px;">Materiales y herramientas</li>
                        <li style="margin-bottom: 6px;">Horneadas cerámicas de alta temperatura</li>
                        <li style="margin-bottom: 6px;">Pieza lista para su uso (apta para alimentos, microondas y lavavajillas)</li>
                        <li>Entrega en aproximadamente 2 semanas</li>
                    </ul>
                </div>

                <p style="color: #B8474B; font-size: 15px; font-weight: 500; text-align: center; margin: 24px 0;">
                    💕 ¡Tendremos sorpresas y sorteos de premios increíbles! 💕
                </p>

                <!-- Términos y Condiciones -->
                <div style="border-top: 1px solid #F5C6C6; margin: 28px 0 0 0; padding-top: 24px;">
                    <h3 style="color: #4A4540; font-size: 14px; margin: 0 0 12px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        📜 Términos y Condiciones
                    </h3>
                    <ul style="color: #958985; font-size: 12px; margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li style="margin-bottom: 6px;"><strong style="color: #4A4540;">No reembolsable:</strong> No se realizan devoluciones de dinero bajo ninguna circunstancia.</li>
                        <li style="margin-bottom: 6px;"><strong style="color: #4A4540;">Fecha específica:</strong> Este evento es válido únicamente para el 14 de febrero de 2026. No se puede reagendar.</li>
                        <li style="margin-bottom: 6px;"><strong style="color: #4A4540;">No transferible:</strong> La inscripción es personal y no puede transferirse a otra persona.</li>
                        <li style="margin-bottom: 6px;"><strong style="color: #4A4540;">No acumulable:</strong> No se puede combinar con otras ofertas, descuentos o promociones.</li>
                        <li><strong style="color: #4A4540;">Puntualidad:</strong> Se requiere llegar puntual al horario del taller. No se garantiza acceso con más de 15 minutos de retraso.</li>
                    </ul>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: linear-gradient(135deg, #FDF2F2 0%, #FCEAEA 100%); border-top: 1px solid #F5C6C6; padding: 24px 30px; text-align: center;">
                <p style="color: #4A4540; font-size: 14px; margin: 0 0 12px 0;">
                    <strong>¿Preguntas? Contáctanos</strong><br/>
                    <span style="font-size: 13px; color: #958985;">
                        📧 cmassuh@ceramicalma.com<br/>
                        📱 +593 98 581 3327
                    </span>
                </p>
                <p style="color: #B8474B; font-size: 12px; margin: 14px 0 0 0; font-style: italic;">
                    Con amor, el equipo de Ceramicalma 💕
                </p>
            </div>
        </div>
    `;

    const result = await sendEmail(email, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(email, 'valentine-registration', 'email', status, id);

    console.info('[emailService] Valentine registration email sent to', email);
    return result;
};

/**
 * Email de confirmación de pago (se envía cuando admin valida el pago)
 */
export const sendValentinePaymentConfirmedEmail = async (data: {
    id: string;
    fullName: string;
    email: string;
    workshop: string;
    participants: 1 | 2;
}) => {
    const { id, fullName, email, workshop, participants } = data;
    const workshopName = getWorkshopName(workshop);
    const workshopTime = getWorkshopTime(workshop);
    const participantText = participants === 2 ? 'para 2 personas' : 'individual';

    const subject = `✅ Pago Confirmado - Te esperamos el 14 de Febrero - ${workshopName}`;

    const html = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <!-- Header con paleta de marca + San Valentín -->
            <div style="background: linear-gradient(135deg, #4A4540 0%, #828E98 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #B8474B;">
                <h1 style="color: #fff; font-size: 28px; margin: 0 0 8px 0; font-weight: 500; letter-spacing: 0.5px;">
                    Pago Confirmado
                </h1>
                <p style="color: rgba(255,255,255,0.95); font-size: 16px; margin: 0; font-weight: 300;">
                    Tu lugar está reservado 💕
                </p>
            </div>

            <!-- Contenido -->
            <div style="padding: 35px 30px;">
                <p style="color: #4A4540; font-size: 17px; line-height: 1.7; margin: 0 0 24px 0;">
                    Hola <strong>${fullName}</strong>,
                </p>

                <p style="color: #4A4540; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                    ¡Excelentes noticias! Hemos verificado tu pago y tu inscripción está <strong style="color: #28a745;">CONFIRMADA</strong>. 🎉
                </p>

                <!-- Detalles confirmados -->
                <div style="background: linear-gradient(135deg, #D4EDDA 0%, #C3E6CB 100%); border: 1px solid #A8D5B8; border-radius: 12px; padding: 24px; margin: 20px 0;">
                    <h3 style="color: #155724; font-size: 16px; margin: 0 0 16px 0; font-weight: 600;">
                        ✓ Inscripción Confirmada
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-size: 14px; border-bottom: 1px solid #A8D5B8;">Código:</td>
                            <td style="padding: 8px 0; color: #155724; font-size: 14px; font-weight: 600; border-bottom: 1px solid #A8D5B8;">${id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-size: 14px; border-bottom: 1px solid #A8D5B8;">Taller:</td>
                            <td style="padding: 8px 0; color: #155724; font-size: 14px; font-weight: 500; border-bottom: 1px solid #A8D5B8;">${workshopName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-size: 14px; border-bottom: 1px solid #A8D5B8;">Horario:</td>
                            <td style="padding: 8px 0; color: #155724; font-size: 14px; border-bottom: 1px solid #A8D5B8;">${workshopTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-size: 14px; border-bottom: 1px solid #A8D5B8;">Fecha:</td>
                            <td style="padding: 8px 0; color: #B8474B; font-size: 15px; font-weight: 700; border-bottom: 1px solid #A8D5B8;">Sábado 14 de febrero, 2026</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #155724; font-size: 14px;">Participantes:</td>
                            <td style="padding: 8px 0; color: #155724; font-size: 14px;">${participantText}</td>
                        </tr>
                    </table>
                </div>

                <!-- Recordatorio -->
                <div style="background: #FDF2F2; border: 1px solid #F5C6C6; border-radius: 10px; padding: 18px 20px; margin: 24px 0;">
                    <h4 style="color: #B8474B; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">
                        📍 Recuerda:
                    </h4>
                    <ul style="color: #4A4540; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.7;">
                        <li style="margin-bottom: 4px;">Llega 10 minutos antes de tu horario</li>
                        <li style="margin-bottom: 4px;">Usa ropa cómoda que pueda mancharse</li>
                        <li>Trae toda tu energía creativa ✨</li>
                    </ul>
                </div>

                <p style="color: #B8474B; font-size: 16px; font-weight: 600; text-align: center; margin: 28px 0;">
                    💕 ¡Nos vemos el 14 de febrero! 💕
                </p>

                <!-- Términos y Condiciones -->
                <div style="border-top: 1px solid #F5C6C6; margin: 28px 0 0 0; padding-top: 24px;">
                    <h3 style="color: #4A4540; font-size: 14px; margin: 0 0 12px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        📜 Términos y Condiciones
                    </h3>
                    <ul style="color: #958985; font-size: 12px; margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li style="margin-bottom: 6px;"><strong style="color: #4A4540;">No reembolsable:</strong> No se realizan devoluciones de dinero bajo ninguna circunstancia.</li>
                        <li style="margin-bottom: 6px;"><strong style="color: #4A4540;">Fecha específica:</strong> Este evento es válido únicamente para el 14 de febrero de 2026. No se puede reagendar.</li>
                        <li style="margin-bottom: 6px;"><strong style="color: #4A4540;">No transferible:</strong> La inscripción es personal y no puede transferirse a otra persona.</li>
                        <li style="margin-bottom: 6px;"><strong style="color: #4A4540;">No acumulable:</strong> No se puede combinar con otras ofertas, descuentos o promociones.</li>
                        <li><strong style="color: #4A4540;">Puntualidad:</strong> Se requiere llegar puntual al horario del taller. No se garantiza acceso con más de 15 minutos de retraso.</li>
                    </ul>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: linear-gradient(135deg, #FDF2F2 0%, #FCEAEA 100%); border-top: 1px solid #F5C6C6; padding: 24px 30px; text-align: center;">
                <p style="color: #4A4540; font-size: 14px; margin: 0 0 12px 0;">
                    <strong>¿Preguntas? Contáctanos</strong><br/>
                    <span style="font-size: 13px; color: #958985;">
                        📧 cmassuh@ceramicalma.com<br/>
                        📱 +593 98 581 3327
                    </span>
                </p>
                <p style="color: #B8474B; font-size: 12px; margin: 14px 0 0 0; font-style: italic;">
                    Con amor, el equipo de Ceramicalma 💕
                </p>
            </div>
        </div>
    `;

    const result = await sendEmail(email, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(email, 'valentine-payment-confirmed', 'email', status, id);

    console.info('[emailService] Valentine payment confirmed email sent to', email);
    return result;
};

/**
 * Email de campaña: última oportunidad para reservar talleres de San Valentín
 */
export const sendValentineLastChanceEmail = async (data: {
    email: string;
    firstName?: string;
    availableSpots?: number;
}) => {
    const { email, firstName, availableSpots } = data;
    const safeName = (firstName || '').trim() || 'Hola';
    const spotsText = typeof availableSpots === 'number'
        ? `Quedan aproximadamente <strong>${availableSpots} cupos</strong> entre los talleres disponibles.`
        : 'Los cupos son limitados y se asignan por orden de confirmación.';

    const subject = 'Última oportunidad: Talleres especiales de San Valentín en CeramicAlma';

    const html = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #F3E5E7;">
            <div style="background: linear-gradient(135deg, #4A4540 0%, #828E98 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #B8474B;">
                <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.2px;">San Valentín en CeramicAlma</h1>
                <p style="color: rgba(255,255,255,0.92); margin: 8px 0 0 0; font-size: 14px;">🔴 Nos quedan los últimos cupos</p>
            </div>

            <div style="padding: 28px 24px; color: #4A4540;">
                <p style="margin: 0 0 14px 0; font-size: 16px; line-height: 1.6;">${safeName},</p>
                <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7;">
                    <strong>Nos quedan los últimos cupos</strong> para nuestros talleres especiales de San Valentín del <strong>14 de febrero</strong>.
                </p>

                <div style="background: #FDF2F2; border: 2px solid #B8474B; border-radius: 10px; padding: 18px 16px; margin: 16px 0;">
                    <p style="margin: 0 0 12px 0; color: #B8474B; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                        ⏰ Cierre de reservas
                    </p>
                    <p style="margin: 0; color: #B8474B; font-size: 16px; font-weight: 700; line-height: 1.6;">
                        Hoy a las 9:00 PM
                    </p>
                    <p style="margin: 8px 0 0 0; color: #B8474B; font-size: 13px; line-height: 1.5;">
                        Después de esta hora, no seremos capaces de procesar más registros.
                    </p>
                </div>

                <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.7;">
                    Si quieres asegurar tu lugar en los últimos cupos disponibles, <strong>completa tu inscripción ahora</strong> antes del cierre.
                </p>

                <div style="text-align: center; margin: 24px 0 18px 0;">
                    <a href="https://ceramicalma.com/sanvalentin" style="display: inline-block; background: #B8474B; color: #FFFFFF; text-decoration: none; padding: 13px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                        Reservar ahora antes de las 9 PM
                    </a>
                </div>

                <p style="margin: 0; color: #958985; font-size: 13px; line-height: 1.7; text-align: center;">
                    Si ya reservaste, ignora este mensaje. Gracias por ser parte de CeramicAlma.
                </p>
            </div>
        </div>
    `;

    const result = await sendEmail(email, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(email, 'valentine-last-chance', 'email', status);

    console.info('[emailService] Valentine last chance email sent to', email, status);
    return result;
};

export const sendBookingExpiredEmail = async (params: {
    email: string;
    firstName: string;
    bookingCode: string;
    productName: string;
    slots?: Array<{ date: string; time: string }>;
}) => {
    const { email, firstName, bookingCode, productName, slots } = params;
    const subject = `Tu pre-reserva en CeramicAlma ha vencido (${bookingCode})`;

    const slotsHtml = slots && slots.length > 0 ? `
        <div style="background-color: #f0f9ff; border-left: 4px solid #0EA5E9; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #0369A1; font-weight: bold;">📅 ${slots.length > 1 ? 'Clases que habías agendado' : 'Clase que habías agendado'}</p>
            <table style="margin-top: 10px; width: 100%; border-collapse: collapse;">
                ${slots.map((slot, index) => {
                    const slotDate = new Date(slot.date + 'T00:00:00').toLocaleDateString('es-ES', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    });
                    return `
                        <tr style="border-bottom: 1px solid #e0f2fe;">
                            <td style="padding: 8px 0; color: #0369A1; font-weight: bold;">${slots.length > 1 ? `Clase ${index + 1}:` : ''}</td>
                            <td style="padding: 8px 0; color: #0c4a6e;">${slotDate}</td>
                            <td style="padding: 8px 0; color: #0c4a6e; font-weight: bold;">${slot.time}</td>
                        </tr>
                    `;
                }).join('')}
            </table>
        </div>
    ` : '';

    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>¡Hola, ${firstName}!</h2>
            <p>Te escribimos para informarte que tu pre-reserva para <strong>${productName}</strong> ha vencido sin confirmación de pago.</p>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Código de reserva:</strong> <span style="font-size: 18px; color: #D95F43; font-weight: bold;">${bookingCode}</span></p>
                <p style="margin: 8px 0 0 0;"><strong>Clase:</strong> ${productName}</p>
            </div>

            ${slotsHtml}

            <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #991B1B; font-weight: bold;">⏰ Tu cupo fue liberado</p>
                <p style="margin: 8px 0 0 0; color: #7F1D1D; font-size: 14px;">
                    Las pre-reservas se mantienen <strong>2 horas</strong> mientras se aguarda el comprobante de pago.
                    Pasado ese plazo, el cupo queda disponible para otros clientes automáticamente.
                </p>
            </div>

            <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #1E40AF; font-weight: bold;">🔄 ¿Quieres volver a reservar?</p>
                <p style="margin: 8px 0 0 0; color: #1E3A8A; font-size: 14px;">
                    No te preocupes, puedes hacer una nueva reserva en cualquier momento. Una vez confirmada,
                    recuerda enviar el comprobante de pago por <strong>WhatsApp</strong> dentro de las 2 horas para asegurar tu lugar.
                </p>
            </div>

            <p style="margin-top: 20px;">Si tienes alguna duda, no dudes en contactarnos. ¡Esperamos verte pronto en el taller!</p>
            <p>Saludos,<br/>El equipo de CeramicAlma</p>
        </div>
    `;

    const result = await sendEmail(email, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(email, 'pre-booking-expired', 'email', status, bookingCode);
    console.info('[emailService] Booking expired email sent to', email, bookingCode, status);
    return result;
};

export const sendPaymentReminderEmail = async (booking: Booking, bankDetails: BankDetails) => {
    const { userInfo, bookingCode, price, slots } = booking;
    const numericPrice = typeof price === 'number' ? price : parseFloat(String(price));
    const productName = getBookingDisplayName(booking);
    const subject = `⚠️ RECORDATORIO: Tu reserva vence pronto - ${bookingCode} | CeramicAlma`;

    const accounts = Array.isArray(bankDetails) ? bankDetails : [bankDetails];
    const accountsHtml = accounts.map(acc => `
        <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 12px;color:#374151;">${acc.bankName || ''}</td>
            <td style="padding:8px 12px;color:#374151;">${acc.accountHolder}</td>
            <td style="padding:8px 12px;font-family:monospace;font-weight:700;color:#4B5563;">${acc.accountNumber}</td>
            <td style="padding:8px 12px;color:#374151;">${acc.accountType}</td>
        </tr>
    `).join('');

    const slotsText = slots && slots.length > 0
        ? slots.map(s => `${s.date} a las ${s.time}`).join(', ')
        : '';

    const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2937;">
            <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:16px 20px;border-radius:8px;margin-bottom:24px;">
                <h2 style="margin:0 0 8px 0;color:#92400E;font-size:20px;">⚠️ Tu cupo vence pronto</h2>
                <p style="margin:0;color:#78350F;font-size:14px;">Pre-reserva <strong>${bookingCode}</strong> — <strong>${productName}</strong></p>
            </div>
            <p>Hola <strong>${userInfo.firstName}</strong>,</p>
            <p>Te recordamos que tienes una pre-reserva activa que <strong>vencerá en las próximas horas</strong>.
            Si no realizas el pago a tiempo, tu lugar quedará disponible para otros clientes.</p>
            ${slotsText ? `<p>📅 Clase agendada: <strong>${slotsText}</strong></p>` : ''}
            <p>Monto a pagar: <strong style="font-size:18px;color:#D95F43;">$${numericPrice.toFixed(2)}</strong></p>
            <p>Realiza una transferencia bancaria con los siguientes datos y envía el comprobante por <strong>WhatsApp</strong>:</p>
            <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;margin-top:8px;">
                <thead>
                    <tr style="background:#e5e7eb;">
                        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;">Banco</th>
                        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;">Titular</th>
                        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;">Número</th>
                        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;">Tipo</th>
                    </tr>
                </thead>
                <tbody>${accountsHtml}</tbody>
            </table>
            <div style="background:#EFF6FF;border-left:4px solid #3B82F6;padding:14px 18px;border-radius:8px;margin-top:24px;">
                <p style="margin:0;color:#1E40AF;font-size:13px;">
                    Una vez realizado el pago, envía el comprobante por WhatsApp y tu reserva quedará <strong>confirmada</strong>.
                </p>
            </div>
            <p style="margin-top:24px;">¡Esperamos verte pronto en el taller!</p>
            <p>Saludos,<br/>El equipo de CeramicAlma</p>
        </div>
    `;

    const result = await sendEmail(userInfo.email, subject, html);
    const status = result && 'sent' in result ? (result.sent ? 'sent' : 'failed') : 'unknown';
    await logEmailEvent(userInfo.email, 'payment-reminder', 'email', status, bookingCode);
    console.info('[emailService] Payment reminder sent to', userInfo.email, bookingCode, status);
    return result;
};

// ============================================================
// EMAIL ALIASES - Enviar desde diferentes direcciones
// ============================================================

/**
 * Retorna el template HTML embebido para emails de alianza
 * Sin dependencia de archivos - funciona en Vercel
 */
export const getAlianzaEmailTemplate = (): string => {
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alianza CERAMICALMA</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Syne:wght@700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background: #f9f7f3; }
        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        p { font-size: 16px; line-height: 1.5; }
    </style>
</head>
<body>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f9f7f3">
        <tr>
            <td align="center" style="padding: 0;">
                <table width="480" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-collapse: collapse; width: 480px; margin: 0 auto;">
                    <tr>
                        <td width="100%" style="background: linear-gradient(135deg, #c99a6e 0%, #a0674d 100%); padding: 32px 20px; text-align: center;">
                            <p style="background: rgba(255, 255, 255, 0.25); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; text-transform: uppercase; font-weight: 700; margin: 0 0 14px 0; display: inline-block;">Invitación Exclusiva</p>
                            <h1 style="font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 700; color: white; margin: 0 0 8px 0; line-height: 1.2;">Alianza CERAMICALMA</h1>
                            <p style="font-size: 16px; color: rgba(255, 255, 255, 0.95); margin: 0; font-weight: 300;">Una oportunidad para transformar tu estrategia corporativa</p>
                        </td>
                    </tr>
                    <tr>
                        <td width="100%" style="padding: 32px 20px; color: #6b4423;">
                            <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                <strong>Estimado/a,</strong><br>
                                Creemos que las mejores alianzas nacen cuando compartimos valores: bienestar, autenticidad y conexión genuina.
                            </p>
                            <p style="font-size: 16px; line-height: 1.6; color: #6b4423; margin: 0 0 28px 0;">
                                Por eso hoy te invitamos a conocer <strong>Alianza CERAMICALMA</strong>: acceso exclusivo a un espacio premium donde cerámica, café y creatividad se transforman en experiencias que impactan realmente a tu equipo.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, rgba(201, 154, 110, 0.08) 0%, rgba(160, 103, 77, 0.04) 100%); border-left: 4px solid #a0674d; margin: 28px 0;">
                                <tr>
                                    <td style="padding: 24px 20px; text-align: center;">
                                        <p style="font-size: 12px; color: #8b6952; text-transform: uppercase; font-weight: 700; margin: 0 0 12px 0;">Valor Invertido vs. Retorno</p>
                                        <p style="font-family: 'Syne', sans-serif; font-size: 40px; font-weight: 700; color: #6b4423; margin: 16px 0;">$3,800</p>
                                        <p style="font-size: 14px; color: #8b6952; margin: 0;">Diferencia anual en beneficios</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="font-size: 16px; font-weight: 700; color: #6b4423; margin: 28px 0 16px 0;">Lo que incluye:</p>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="padding: 0 0 20px 0; border-bottom: 1px solid rgba(160, 103, 77, 0.1);">
                                        <p style="font-weight: 700; color: #a0674d; font-size: 14px; margin: 0 0 8px 0;">12 Días Exclusivos</p>
                                        <p style="font-size: 14px; color: #6b4423; margin: 0;">1 día mensual con estudio completamente para ti</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px 0; border-bottom: 1px solid rgba(160, 103, 77, 0.1);">
                                        <p style="font-weight: 700; color: #a0674d; font-size: 14px; margin: 0 0 8px 0;">20% Descuento Permanente</p>
                                        <p style="font-size: 14px; color: #6b4423; margin: 0;">En clases y eventos para tu equipo</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px 0;">
                                        <p style="font-weight: 700; color: #a0674d; font-size: 14px; margin: 0 0 8px 0;">Experiencias Branded + Amplificación Digital</p>
                                        <p style="font-size: 14px; color: #6b4423; margin: 0;">Piezas personalizadas y visibilidad en redes</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="font-size: 16px; font-weight: 700; color: #6b4423; margin: 28px 0 8px 0;">Inversión Anual</p>
                            <p style="font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 700; color: #6b4423; margin: 0 0 6px 0;">USD 3,500 + IVA</p>
                            <p style="font-size: 13px; color: #8b6952; margin: 0 0 28px 0;">Plan anual renovable | 12 meses acceso</p>
                            <div style="background: rgba(160, 103, 77, 0.06); padding: 28px 20px; text-align: center; border-radius: 6px; margin: 28px 0;">
                                <p style="font-size: 16px; color: #6b4423; margin: 0 0 20px 0;">¿Te interesa explorar cómo esta alianza transforma tu estrategia?<br><strong>Respondemos dentro de 24 horas.</strong></p>
                                <p style="margin: 0;"><a href="https://ceramicalma.com/alianzas" style="background: linear-gradient(135deg, #c99a6e 0%, #a0674d 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 700; display: inline-block; margin-bottom: 12px;">Ver Propuesta Completa</a></p>
                                <p style="margin: 0;"><a href="https://wa.me/593985813327" style="background: rgba(160, 103, 77, 0.12); color: #a0674d; padding: 14px 40px; text-decoration: none; border: 2px solid rgba(160, 103, 77, 0.25); border-radius: 6px; font-weight: 700; display: inline-block;">Agendar Llamada</a></p>
                            </div>
                            <p style="font-size: 14px; color: #8b6952; text-align: center; margin: 20px 0 0 0;">Sin compromisos. Solo conversación genuina.</p>
                        </td>
                    </tr>
                    <tr>
                        <td width="480" style="background: linear-gradient(135deg, #faf8f5 0%, #f5f2ed 100%); padding: 20px 20px; text-align: center; border-top: 1px solid rgba(160, 103, 77, 0.1);">
                            <p style="font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: #6b4423; margin: 0 0 6px 0;">CERAMICALMA</p>
                            <p style="font-size: 12px; color: #8b6952; margin: 0 0 2px 0;">Sol Plaza • Av. Samborondón Km 2.5</p>
                            <p style="font-size: 12px; color: #8b6952; margin: 0 0 10px 0;">Samborondón, Guayaquil</p>
                            <p style="font-size: 12px; color: #a0674d; margin: 0;"><a href="mailto:ceramicalma.ec@gmail.com" style="color: #a0674d; text-decoration: none; font-weight: 600;">ceramicalma.ec@gmail.com</a> | <a href="https://wa.me/593985813327" style="color: #a0674d; text-decoration: none; font-weight: 600;">+593 98 581 3327</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

/**
 * Envía un email usando el correo de alianzas
 * @param to Destinatario
 * @param subject Asunto
 * @param html Contenido HTML
 * @param attachments Adjuntos opcionales
 */
export const sendEmailAsAlianza = async (
    to: string,
    subject: string,
    html: string,
    attachments?: { filename: string; data: string; type?: string }[]
) => {
    return sendEmail(to, subject, html, attachments, alianzaEmail);
};

/**
 * Envía un email personalizado desde cualquier dirección registrada
 * @param to Destinatario
 * @param subject Asunto
 * @param html Contenido HTML
 * @param fromEmail Dirección remitente (usa DEFAULT o ALIANZA)
 * @param attachments Adjuntos opcionales
 */
export const sendEmailFromCustomAddress = async (
    to: string,
    subject: string,
    html: string,
    fromEmail: 'DEFAULT' | 'ALIANZA' | string,
    attachments?: { filename: string; data: string; type?: string }[]
) => {
    const finalFromEmail = fromEmail === 'DEFAULT' ? AVAILABLE_FROM_EMAILS.DEFAULT : 
                          fromEmail === 'ALIANZA' ? AVAILABLE_FROM_EMAILS.ALIANZA :
                          fromEmail;
    return sendEmail(to, subject, html, attachments, finalFromEmail);
};
