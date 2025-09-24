import { Resend } from 'resend';
import type { Booking, BankDetails, TimeSlot, PaymentDetails } from '../types.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.EMAIL_FROM;

const isEmailServiceConfigured = () => {
    if (!resend || !fromEmail) {
        console.warn("Email service is not configured. Please set RESEND_API_KEY and EMAIL_FROM environment variables.");
        return false;
    }
    return true;
}

const sendEmail = async (to: string, subject: string, html: string) => {
    if (!isEmailServiceConfigured()) {
        console.error("Email service is not configured on the server. RESEND_API_KEY and/or EMAIL_FROM environment variables are missing or incorrect.");
        throw new Error("Email service is not configured on the server.");
    }
    try {
        await resend!.emails.send({
            from: fromEmail!,
            to,
            subject,
            html,
        });
        console.log(`Email sent to ${to} with subject "${subject}"`);
    } catch (error) {
        console.error(`Resend API Error: Failed to send email to ${to}:`, error);
        throw error; // Re-throw the error to let the caller know something went wrong
    }
};

export const sendPreBookingConfirmationEmail = async (booking: Booking, bankDetails: BankDetails) => {
    const { userInfo, bookingCode, product, price } = booking;
    const subject = `Tu Pre-Reserva en CeramicAlma está confirmada (Código: ${bookingCode})`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>¡Hola, ${userInfo.firstName}!</h2>
            <p>Gracias por tu pre-reserva para <strong>${product.name}</strong>. Tu lugar ha sido guardado con el código de reserva:</p>
            <p style="font-size: 24px; font-weight: bold; color: #D95F43; margin: 20px 0;">${bookingCode}</p>
            <p>El monto a pagar es de <strong>$${price.toFixed(2)}</strong>.</p>
            <p>Para confirmar tu asistencia, por favor realiza una transferencia bancaria con los siguientes datos y envíanos el comprobante por WhatsApp.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h3 style="color: #D95F43;">Datos para la Transferencia</h3>
                <p><strong>Banco:</strong> ${bankDetails.bankName}</p>
                <p><strong>Titular:</strong> ${bankDetails.accountHolder}</p>
                <p><strong>Número de Cuenta:</strong> ${bankDetails.accountNumber}</p>
                <p><strong>Tipo de Cuenta:</strong> ${bankDetails.accountType}</p>
                <p><strong>RUT/Identificador:</strong> ${bankDetails.taxId}</p>
                <p style="margin-top: 15px; font-style: italic;"><strong>Importante:</strong> Usa tu código de reserva <strong>${bookingCode}</strong> como referencia en la transferencia.</p>
            </div>
            <p style="margin-top: 20px;">¡Esperamos verte pronto en el taller!</p>
            <p>Saludos,<br/>El equipo de CeramicAlma</p>
        </div>
    `;
    await sendEmail(userInfo.email, subject, html);
};

export const sendPaymentReceiptEmail = async (booking: Booking, newPayment: PaymentDetails) => {
    const { userInfo, bookingCode, product } = booking;
    const subject = `¡Confirmación de Pago para tu reserva en CeramicAlma! (Código: ${bookingCode})`;
    let fechaPago;
    if (newPayment.receivedAt && new Date(newPayment.receivedAt).toString() !== 'Invalid Date') {
        fechaPago = new Date(newPayment.receivedAt).toLocaleDateString('es-ES');
    } else {
        // Si no hay fecha, usamos la fecha actual (cuando el admin presiona el botón)
        fechaPago = new Date().toLocaleDateString('es-ES');
    }
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>¡Hola, ${userInfo.firstName}!</h2>
            <p>Hemos recibido tu pago y tu reserva para <strong>${product.name}</strong> está oficialmente confirmada.</p>
            <p style="font-size: 20px; font-weight: bold; color: #16A34A; margin: 20px 0;">¡Tu plaza está asegurada!</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h3 style="color: #D95F43;">Detalles del Pago</h3>
                <p><strong>Código de Reserva:</strong> ${bookingCode}</p>
                <p><strong>Monto Pagado:</strong> $${newPayment.amount.toFixed(2)}</p>
                <p><strong>Método:</strong> ${newPayment.method}</p>
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