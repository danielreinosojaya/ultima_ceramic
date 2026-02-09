import { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const TEMPLATE = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f9f7f3;margin:0;padding:20px">
<div style="max-width:480px;margin:0 auto;background:#fff;padding:20px;border-radius:8px">
<h2 style="color:#a0674d">Alianza CERAMICALMA</h2>
<p>Estimado/a,</p>
<p>Te invitamos a conocer <strong>Alianza CERAMICALMA</strong>: acceso exclusivo a un espacio premium.</p>
<p><strong>Incluye:</strong></p>
<ul>
<li>12 Días Exclusivos (1 día mensual)</li>
<li>20% Descuento Permanente</li>
<li>Experiencias Branded + Amplificación Digital</li>
</ul>
<p><strong>Inversión Anual:</strong> USD 3,500 + IVA</p>
<p><a href="https://ceramicalma.com/alianzas" style="background:#a0674d;color:white;padding:10px 20px;text-decoration:none;border-radius:4px">Ver Propuesta</a></p>
<p>Sin compromisos. Solo conversación genuina.</p>
<hr>
<p style="font-size:12px;color:#888">CERAMICALMA | Samborondón, Guayaquil<br><a href="mailto:ceramicalma.ec@gmail.com">ceramicalma.ec@gmail.com</a> | <a href="https://wa.me/593985813327">WhatsApp</a></p>
</div>
</body>
</html>`;

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { 
      email = 'danielreinosojaya@gmail.com', 
      subject = 'Propuesta de Alianza Ceramicalma' 
    } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    if (!resend) {
      return res.status(500).json({ 
        error: 'Email service not configured',
        message: 'RESEND_API_KEY not set'
      });
    }

    const result = await resend.emails.send({
      from: 'alianza@ceramicalma.com',
      to: email,
      subject: subject,
      html: TEMPLATE
    });

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: '✅ Email enviado desde alianza@ceramicalma.com',
      email,
      subject,
      emailId: result.data?.id
    });

  } catch (error: any) {
    console.error('[sendAlianzaEmail]', error);
    return res.status(500).json({
      error: 'Error interno',
      details: error?.message || String(error)
    });
  }
};
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
</html>`;\n};

export default async (req: VercelRequest, res: VercelResponse) => {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // Parámetros con defaults
    const {
      email = 'danielreinosojaya@gmail.com',
      subject = 'Propuesta de Alianza Ceramicalma',
      html  // HTML puede venir en el body
    } = req.body;

    // Validar email
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Usar HTML del body o cargar el template
    const htmlContent = html || getAlianzaTemplate();

    // Enviar email
    const result = await sendEmailAsAlianza(email, subject, htmlContent);

    // Respuesta
    if (result && 'sent' in result) {
      if (result.sent) {
        return res.status(200).json({
          success: true,
          message: 'Email enviado desde alianza@ceramicalma.com ✅',
          email,
          subject,
          ...(result.providerResponse?.id && { emailId: result.providerResponse.id })
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al enviar email',
          ...(result.dryRunPath && { dryRunPath: result.dryRunPath })
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Respuesta desconocida del servicio'
    });

  } catch (error: any) {
    console.error('[sendAlianzaEmail] Error:', error);
    return res.status(500).json({
      error: 'Error al enviar email',
      details: error.message
    });
  }
};
