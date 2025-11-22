import type { VercelRequest, VercelResponse } from '@vercel/node';

// Crear SVG manualmente - sin depender de imports
const createGiftcardSVG = (data: {
  code: string;
  amount: number;
  recipientName?: string;
  senderName?: string;
  message?: string;
}): string => {
  const recipientName = (data.recipientName || 'María').substring(0, 30);
  const senderName = (data.senderName || 'Juan').substring(0, 30);
  const code = (data.code || 'GC-ABC123').substring(0, 30);
  const message = (data.message || '').substring(0, 80);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f5f3ea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e8e3d6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background with gradient -->
  <rect width="600" height="400" fill="url(#bgGradient)"/>
  
  <!-- Border -->
  <rect x="6" y="6" width="588" height="388" rx="20" ry="20" fill="none" stroke="#a89c94" stroke-width="6"/>
  
  <!-- Título -->
  <text x="300" y="80" font-size="48" font-weight="bold" text-anchor="middle" font-family="Arial, sans-serif" fill="#958985" letter-spacing="2">
    REGALO ESPECIAL
  </text>
  
  <!-- Para: -->
  <text x="50" y="160" font-size="18" font-family="Arial, sans-serif" fill="#666">
    para:
  </text>
  <text x="120" y="160" font-size="18" font-weight="bold" font-family="Arial, sans-serif" fill="#333">
    ${recipientName}
  </text>
  
  <!-- De: -->
  <text x="50" y="200" font-size="18" font-family="Arial, sans-serif" fill="#666">
    de:
  </text>
  <text x="120" y="200" font-size="18" font-weight="bold" font-family="Arial, sans-serif" fill="#333">
    ${senderName}
  </text>
  
  <!-- Valor -->
  <text x="300" y="280" font-size="22" text-anchor="middle" font-family="Arial, sans-serif" fill="#666">
    Valor: $${data.amount}
  </text>
  
  <!-- Código -->
  <text x="300" y="330" font-size="28" font-weight="bold" text-anchor="middle" font-family="Arial, sans-serif" fill="#9D277D" letter-spacing="3">
    ${code}
  </text>
  
  <!-- Mensaje -->
  ${message ? `<text x="300" y="355" font-size="14" font-style="italic" text-anchor="middle" font-family="Arial, sans-serif" fill="#555">"${message}"</text>` : ''}
  
  <!-- Logo -->
  <text x="550" y="380" font-size="14" text-anchor="end" font-weight="bold" font-family="Arial, sans-serif" fill="#999">
    CERAMICALMA
  </text>
</svg>`;

  return svg;
};

async function generateGiftcardImageBase64(data: any): Promise<string> {
  try {
    // Importar sharp dinámicamente para evitar problemas de module resolution
    const sharp = (await import('sharp')).default;
    const svg = createGiftcardSVG(data);
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    return pngBuffer.toString('base64');
  } catch (error) {
    console.warn('[generateGiftcardImageBase64] Error:', error);
    return '';
  }
}

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

    // Intentar generar PNG
    const pngBase64 = await generateGiftcardImageBase64(
      {
        code,
        amount,
        recipientName,
        senderName,
        message,
      }
    );

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
