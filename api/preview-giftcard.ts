import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateGiftcardImageBase64 } from './utils/giftcardImageGenerator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Datos de ejemplo - puedes pasar query params
    const recipientName = (req.query.recipient as string) || 'María García';
    const senderName = (req.query.sender as string) || 'Juan Pérez';
    const code = (req.query.code as string) || 'GC-ABC123';
    const amount = parseInt((req.query.amount as string) || '100');
    const message = (req.query.message as string) || '¡Feliz cumpleaños! Espero que disfrutes tu clase de cerámica.';

    // Intentar generar PNG (puede fallar en Vercel)
    let pngBase64 = '';
    try {
      pngBase64 = await generateGiftcardImageBase64(
        {
          code,
          amount,
          recipientName,
          senderName,
          message,
        },
        'v1'
      );
    } catch (pngError) {
      console.warn('[preview-giftcard] PNG generation failed, showing preview without image:', pngError);
    }

    // Retornar HTML con preview
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Preview Giftcard PNG</title>
        <style>
          body { margin: 0; padding: 20px; background: #f5f5f5; font-family: Arial, sans-serif; }
          .container { max-width: 900px; margin: 0 auto; }
          .header { background: #333; color: white; padding: 15px; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 20px; border: 2px solid #ddd; border-radius: 0 0 8px 8px; }
          .preview-box { text-align: center; margin: 20px 0; }
          .preview-box img { max-width: 600px; width: 100%; border: 2px solid #ddd; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .info { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; }
          .info p { margin: 5px 0; }
          .code { font-family: monospace; background: #fff; padding: 3px 8px; border-radius: 4px; border: 1px solid #ddd; }
          .query-builder { background: #f0f0f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .query-builder input { padding: 8px; margin: 5px; border: 1px solid #ccc; border-radius: 4px; width: 200px; }
          .query-builder button { padding: 8px 15px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; }
          .query-builder button:hover { background: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📧 Preview: PNG de Giftcard</h2>
            <p style="margin: 5px 0; opacity: 0.8; font-size: 14px;">Esta es la imagen que se adjunta al email - sin gastar saldo de Resend</p>
          </div>
          <div class="content">
            <div class="query-builder">
              <h3>Personalizar preview (cambia query params):</h3>
              <form method="get" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end;">
                <div>
                  <label>Destinatario:</label><br>
                  <input type="text" name="recipient" value="${recipientName}" placeholder="María García">
                </div>
                <div>
                  <label>Remitente:</label><br>
                  <input type="text" name="sender" value="${senderName}" placeholder="Juan Pérez">
                </div>
                <div>
                  <label>Código:</label><br>
                  <input type="text" name="code" value="${code}" placeholder="GC-ABC123">
                </div>
                <div>
                  <label>Monto:</label><br>
                  <input type="number" name="amount" value="${amount}" placeholder="100">
                </div>
                <button type="submit">Actualizar</button>
              </form>
            </div>

            <div class="preview-box">
              <h3>Giftcard PNG generado:</h3>
              ${pngBase64 
                ? `<img src="data:image/png;base64,${pngBase64}" alt="Giftcard">` 
                : `<div style="background: #f0f0f0; padding: 40px; border-radius: 8px; text-align: center; color: #999;">
                    <p>⚠️ No se pudo generar PNG (Sharp requiere librería de renderizado)</p>
                    <p>Pero los datos se guardarían correctamente en la BD</p>
                  </div>`
              }
            </div>

            <div class="info">
              <h3>ℹ️ Información:</h3>
              <p><strong>Destinatario:</strong> ${recipientName}</p>
              <p><strong>Remitente:</strong> ${senderName}</p>
              <p><strong>Código:</strong> <span class="code">${code}</span></p>
              <p><strong>Monto:</strong> $${amount}</p>
              <p><strong>Mensaje:</strong> "${message}"</p>
              <p style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px; color: #666;">
                ✅ <strong>Este PNG es el que se adjunta al email del destinatario</strong><br>
                ✅ <strong>No se gasta saldo de Resend al ver este preview</strong><br>
                ⚠️ Para enviar el email real, necesitas aprobar la giftcard en el panel admin
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    console.error('[preview-giftcard] Error:', error);
    return res.status(500).json({
      error: 'Error generating giftcard preview',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
