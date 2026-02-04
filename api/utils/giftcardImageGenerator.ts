// NO usar sharp - no funciona en Vercel serverless
// Retornamos SVG directamente como base64

export interface GiftcardData {
  code: string;
  amount: number;
  recipientName?: string;
  senderName?: string;
  message?: string;
}

export type GiftcardVersion = 'v1' | 'v2';

// Crear SVG manualmente - sin depender de Satori/JSX ni Sharp
const createGiftcardSVG = (data: GiftcardData): string => {
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
  <text x="300" y="80" font-size="48" font-weight="bold" color="#958985" text-anchor="middle" font-family="Arial, sans-serif" fill="#958985" letter-spacing="2">
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

// Retorna SVG como Buffer (no PNG, para compatibilidad con Vercel)
export const generateGiftcardImage = async (
  data: GiftcardData,
  _version: GiftcardVersion = 'v1'
): Promise<Buffer> => {
  const svg = createGiftcardSVG(data);
  return Buffer.from(svg, 'utf-8');
};

// Retorna SVG como base64
export const generateGiftcardImageBase64 = async (
  data: GiftcardData,
  version: GiftcardVersion = 'v1'
): Promise<string> => {
  const buffer = await generateGiftcardImage(data, version);
  return buffer.toString('base64');
};

// Retorna el SVG raw (para uso directo en emails como inline SVG)
export const generateGiftcardSVG = (data: GiftcardData): string => {
  return createGiftcardSVG(data);
};

export const generateAllGiftcardVersions = async (
  data: GiftcardData
): Promise<{ v1: string; v2: string }> => {
  try {
    const v1Base64 = await generateGiftcardImageBase64(data, 'v1');
    return { v1: v1Base64, v2: v1Base64 };
  } catch (error) {
    console.error('[generateAllGiftcardVersions] Error:', error);
    return { v1: '', v2: '' };
  }
};
