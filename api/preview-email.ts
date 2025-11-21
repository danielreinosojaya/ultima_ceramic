import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Datos de ejemplo para preview
  const mockData = {
    recipientName: 'María García',
    buyerName: 'Juan Pérez',
    code: 'GC-ABC123',
    amount: 100,
    message: '¡Feliz cumpleaños! Espero que disfrutes tu clase de cerámica.'
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Preview Email - Giftcard</title>
      <style>
        body { margin: 0; padding: 20px; background: #f5f5f5; font-family: Arial, sans-serif; }
        .preview-container { max-width: 800px; margin: 0 auto; }
        .preview-header { background: #333; color: white; padding: 15px; border-radius: 8px 8px 0 0; }
        .email-frame { background: white; border: 2px solid #ddd; border-radius: 0 0 8px 8px; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="preview-container">
        <div class="preview-header">
          <h2>📧 Preview: Email de Giftcard al Destinatario</h2>
          <p style="margin: 5px 0; opacity: 0.8; font-size: 14px;">Este email NO se envía, solo es una vista previa</p>
        </div>
        <div class="email-frame">
          ${generateGiftcardEmailHTML(mockData)}
        </div>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}

function generateGiftcardEmailHTML(data: any) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color:#222; max-width:600px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 2px 12px #0001; padding:32px;">
      <h2 style="margin-bottom:18px; font-size:28px; color:#D95F43; text-align:center; font-weight:700;">¡Has recibido una Giftcard!</h2>
      
      <div style="background:#f9fafb; border:1px solid #e5e7eb; padding:18px; border-radius:8px; margin-bottom:18px;">
        <div style="font-size:16px; color:#555; margin-bottom:8px;">Para: <strong>${data.recipientName}</strong></div>
        <div style="font-size:16px; color:#555; margin-bottom:8px;">De: <strong>${data.buyerName}</strong></div>
        <div style="font-size:16px; color:#555; margin-bottom:8px;">Monto: <strong>$${Number(data.amount).toFixed(2)}</strong></div>
        <div style="font-size:16px; color:#555; margin-bottom:8px;">Código: <span style="font-weight:700; color:#D95F43; font-size:20px; letter-spacing:2px;">${data.code}</span></div>
      </div>

      ${data.message ? `
        <div style="margin-bottom:24px; background:#fff7ed; border-left:6px solid #D95F43; border-radius:8px; padding:18px 24px; font-size:17px; color:#222; box-shadow:0 2px 8px #0001; display:flex; align-items:flex-start; gap:12px;">
          <span style="font-size:28px; color:#D95F43; font-family:serif; line-height:1;">"</span>
          <div>
            <div style="font-weight:600; color:#D95F43; margin-bottom:4px;">Mensaje especial del remitente:</div>
            <div style="font-style:italic;">${data.message}</div>
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
        <strong>Contacto solo por WhatsApp:</strong><br>
        WhatsApp: <a href="https://wa.me/593985813327" style="color:#1d4ed8; text-decoration:none;">+593 985813327</a>
      </div>

      <div style="margin-top:32px; text-align:center; font-size:15px; color:#555;">
        <strong>El equipo de CeramicAlma</strong>
      </div>
    </div>
  `;
}
