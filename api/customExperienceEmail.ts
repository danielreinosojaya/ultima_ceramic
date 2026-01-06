// Email templates for Custom Group Experiences
import { sql } from '@vercel/postgres';

const resend = process.env.RESEND_API_KEY ? require('resend').Resend : null;
const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_FROM_ADDRESS || 'no-reply@ceramicalma.com';

const sendEmail = async (to: string, subject: string, html: string) => {
    // Use same email sending logic from emailService
    const cfg = { configured: !!resend && !!fromEmail };
    if (!cfg.configured) {
        console.warn('Email service not configured - dry run');
        return { sent: false };
    }

    try {
        const payload = {
            from: fromEmail,
            to,
            subject,
            html
        };
        const result = await resend.emails.send(payload);
        return { sent: true, result };
    } catch (error) {
        console.error('Email send failed:', error);
        return { sent: false, error };
    }
};

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
    bankDetails: { bank: string; account: string; accountHolder: string; ruc?: string }
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
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #F3F4F6;">
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; padding: 20px;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #8B5CF6; font-size: 28px; margin: 0;">Última Ceramic</h1>
                    <p style="color: #6B7280; font-size: 14px; margin: 5px 0;">Experiencia Grupal Personalizada</p>
                </div>

                <h2 style="color: #1F2937; font-size: 22px; margin-bottom: 20px;">⏳ ¡Tu Pre-Reserva Está Lista!</h2>
                
                <p style="color: #4B5563; font-size: 16px;">Hola ${userInfo.firstName},</p>
                
                <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
                    Hemos recibido tu solicitud para una experiencia grupal personalizada. Para confirmar tu reserva, por favor realiza el pago dentro de las próximas <strong>2 horas</strong>.
                </p>

                <!-- Booking Details -->
                <div style="background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%); border-left: 4px solid #8B5CF6; padding: 20px; margin: 25px 0; border-radius: 8px;">
                    <h3 style="color: #6B21A8; margin-top: 0; font-size: 18px;">📋 Detalles de tu Experiencia</h3>
                    <p style="margin: 8px 0; color: #374151;"><strong>Código de Reserva:</strong> ${bookingCode}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Tipo:</strong> ${experienceTypeName}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Técnica:</strong> ${techniqueName}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>📅 Fecha:</strong> ${formattedDate}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>🕐 Hora:</strong> ${time}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>👥 Participantes:</strong> ${participants} persona(s)</p>
                    ${additionalDetails}
                    <p style="margin: 20px 0 0 0; font-size: 24px; color: #8B5CF6; font-weight: bold;">Total: $${totalPrice.toFixed(2)}</p>
                </div>

                <!-- Payment Instructions -->
                <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 25px 0; border-radius: 8px;">
                    <h3 style="color: #92400E; margin-top: 0; font-size: 18px;">💳 Instrucciones de Pago</h3>
                    <p style="color: #78350F; font-size: 14px; margin-bottom: 15px;">
                        Realiza tu transferencia bancaria a:
                    </p>
                    <div style="background: white; padding: 15px; border-radius: 6px;">
                        <p style="margin: 6px 0; color: #1F2937;"><strong>Banco:</strong> ${bankDetails.bank}</p>
                        <p style="margin: 6px 0; color: #1F2937;"><strong>Cuenta:</strong> ${bankDetails.account}</p>
                        <p style="margin: 6px 0; color: #1F2937;"><strong>Titular:</strong> ${bankDetails.accountHolder}</p>
                        <p style="margin: 6px 0; color: #1F2937;"><strong>RUC:</strong> ${bankDetails.ruc || 'N/A'}</p>
                        <p style="margin: 15px 0 6px 0; font-size: 20px; color: #8B5CF6;"><strong>Monto: $${totalPrice.toFixed(2)}</strong></p>
                    </div>
                    <p style="color: #78350F; font-size: 13px; margin-top: 12px;">
                        <strong>⏰ Importante:</strong> Esta pre-reserva expira en 2 horas. Envía tu comprobante de pago para confirmar tu experiencia.
                    </p>
                </div>

                <!-- Important Notes -->
                <div style="background: #DBEAFE; border-left: 4px solid #0EA5E9; padding: 15px; margin: 25px 0; border-radius: 8px;">
                    <h3 style="color: #075985; margin-top: 0; font-size: 16px;">📌 Notas Importantes</h3>
                    <ul style="color: #0C4A6E; font-size: 14px; margin: 0; padding-left: 20px;">
                        <li>Las piezas estarán listas para recoger en 15 días hábiles</li>
                        <li>La experiencia tiene una duración de 2 horas</li>
                        <li>Recomendamos llegar 10 minutos antes</li>
                        <li>No se permiten reembolsos una vez confirmado el pago</li>
                    </ul>
                </div>

                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                    <p style="color: #6B7280; font-size: 14px;">
                        ¿Dudas? Contáctanos:<br/>
                        📧 Email: contacto@ceramicalma.com<br/>
                        📱 WhatsApp: ${userInfo.phone || '+593 XX XXX XXXX'}
                    </p>
                    <p style="color: #9CA3AF; font-size: 12px; margin-top: 20px;">
                        <strong>El equipo de Última Ceramic</strong><br/>
                        Creando momentos únicos con arcilla
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    const result = await sendEmail(userInfo.email, subject, html);
    
    // Log email event
    try {
        await sql`
            INSERT INTO client_notifications (client_email, type, channel, status, booking_code, created_at)
            VALUES (${userInfo.email}, 'custom-experience-prebooking', 'email', ${result.sent ? 'sent' : 'failed'}, ${bookingCode}, NOW())
        `;
    } catch (error) {
        console.error('Failed to log email event:', error);
    }

    console.info('[customExperienceEmail] Pre-booking email sent to', userInfo.email);
    return result;
};
