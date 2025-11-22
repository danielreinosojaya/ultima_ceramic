import type { VercelRequest, VercelResponse } from '@vercel/node';

// Crear SVG manualmente - diseño idéntico al screenshot
const createGiftcardSVG = (data: {
  code: string;
  amount: number;
  recipientName?: string;
  senderName?: string;
  message?: string;
}): string => {
  const recipientName = data.recipientName || '';
  const senderName = data.senderName || '';
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="763" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradiente sutil para el fondo -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#D4CEC0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#C4BDB0;stop-opacity:1" />
    </linearGradient>
    
    <!-- Gradiente para el texto del título -->
    <linearGradient id="titleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#A39A8F;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8B7E74;stop-opacity:1" />
    </linearGradient>
    
    <!-- Filtro para sombra elegante del texto -->
    <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="5" dy="6" stdDeviation="4" flood-color="#6B6158" flood-opacity="0.5"/>
      <feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#4A3F36" flood-opacity="0.3"/>
    </filter>
    
    <!-- Filtro para glow sutil -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Fondo con gradiente -->
  <rect width="1080" height="763" fill="url(#bgGradient)"/>
  
  <!-- Textura sutil (puntos decorativos) -->
  <circle cx="150" cy="150" r="3" fill="#B8B0A3" opacity="0.3"/>
  <circle cx="920" cy="180" r="2" fill="#B8B0A3" opacity="0.3"/>
  <circle cx="200" cy="600" r="2.5" fill="#B8B0A3" opacity="0.3"/>
  <circle cx="880" cy="620" r="3" fill="#B8B0A3" opacity="0.3"/>
  
  <!-- Borde ondulado orgánico refinado -->
  <path d="M 80 75 Q 100 60, 150 65 T 250 70 T 350 65 T 450 70 T 550 65 T 650 70 T 750 65 T 850 70 T 950 65 T 1000 75 
           L 1005 680 Q 990 695, 950 690 T 850 685 T 750 690 T 650 685 T 550 690 T 450 685 T 350 690 T 250 685 T 150 690 T 80 680 Z" 
        fill="#EAE6DC" stroke="#8B9199" stroke-width="3" opacity="0.95"/>
  
  <!-- Línea decorativa superior -->
  <line x1="280" y1="385" x2="800" y2="385" stroke="#A39A8F" stroke-width="0.8" opacity="0.3"/>
  
  <!-- Título "REGALO" - efecto sombra simple y clean -->
  <!-- Sombra profunda -->
  <text x="547" y="222" font-size="145" font-weight="900" text-anchor="middle" 
        font-family="Impact, 'Arial Black', sans-serif" 
        fill="#6B5F56" letter-spacing="6" opacity="0.4"
        style="font-style: italic;">
    REGALO
  </text>
  <!-- Capa principal sólida -->
  <text x="540" y="215" font-size="145" font-weight="900" text-anchor="middle" 
        font-family="Impact, 'Arial Black', sans-serif" 
        fill="#988F87" letter-spacing="6"
        style="font-style: italic;">
    REGALO
  </text>
  
  <!-- Título "ESPECIAL" - efecto sombra simple y clean -->
  <!-- Sombra profunda -->
  <text x="547" y="332" font-size="145" font-weight="900" text-anchor="middle" 
        font-family="Impact, 'Arial Black', sans-serif" 
        fill="#6B5F56" letter-spacing="6" opacity="0.4"
        style="font-style: italic;">
    ESPECIAL
  </text>
  <!-- Capa principal sólida -->
  <text x="540" y="325" font-size="145" font-weight="900" text-anchor="middle" 
        font-family="Impact, 'Arial Black', sans-serif" 
        fill="#988F87" letter-spacing="6"
        style="font-style: italic;">
    ESPECIAL
  </text>
  
  <!-- Línea decorativa inferior -->
  <line x1="280" y1="365" x2="800" y2="365" stroke="#A39A8F" stroke-width="0.8" opacity="0.3"/>
  
  <!-- "para:" con línea refinada -->
  <text x="240" y="445" font-size="22" font-family="'Playfair Display', Georgia, serif" fill="#7B7268" font-weight="400" letter-spacing="2" style="font-style: italic;">
    para:
  </text>
  <line x1="240" y1="460" x2="840" y2="460" stroke="#A39A8F" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.6"/>
  <!-- Nombre del destinatario -->
  ${recipientName ? `<text x="540" y="453" font-size="28" text-anchor="middle" font-family="'Playfair Display', 'Cormorant', Georgia, serif" fill="#3D3932" font-weight="500" letter-spacing="1">${recipientName}</text>` : ''}
  
  <!-- "de:" con línea refinada -->
  <text x="240" y="530" font-size="22" font-family="'Playfair Display', Georgia, serif" fill="#7B7268" font-weight="400" letter-spacing="2" style="font-style: italic;">
    de:
  </text>
  <line x1="240" y1="545" x2="840" y2="545" stroke="#A39A8F" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.6"/>
  <!-- Nombre del remitente -->
  ${senderName ? `<text x="540" y="538" font-size="28" text-anchor="middle" font-family="'Playfair Display', 'Cormorant', Georgia, serif" fill="#3D3932" font-weight="500" letter-spacing="1">${senderName}</text>` : ''}
  
  <!-- Separador vertical elegante -->
  <line x1="540" y1="605" x2="540" y2="655" stroke="#A39A8F" stroke-width="1.5" opacity="0.5"/>
  
  <!-- Valor a la izquierda - serif elegante -->
  <text x="240" y="635" font-size="42" font-weight="400" font-family="'Playfair Display', 'Bodoni', Georgia, serif" fill="#5D5449" letter-spacing="2">
    $${data.amount}
  </text>
  
  <!-- Logo circular refinado -->
  <circle cx="625" cy="630" r="28" fill="none" stroke="#8B7E74" stroke-width="2" opacity="0.8"/>
  <circle cx="625" cy="630" r="22" fill="none" stroke="#8B7E74" stroke-width="1.5" opacity="0.6"/>
  <path d="M 614 630 Q 625 618, 636 630 T 625 642" fill="none" stroke="#8B7E74" stroke-width="2" opacity="0.7"/>
  
  <!-- Texto "CERAMICALMA" - más sofisticado -->
  <text x="690" y="625" font-size="20" font-weight="600" font-family="'Futura', 'Century Gothic', sans-serif" fill="#5D5449" letter-spacing="2">
    CERAMICALMA
  </text>
  
  <!-- Subtítulo "Holistic Pottery Studio" - refinado -->
  <text x="690" y="643" font-size="11" font-family="'Futura', Arial, sans-serif" fill="#8B7E74" letter-spacing="1" font-weight="300">
    Holistic Pottery Studio
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
