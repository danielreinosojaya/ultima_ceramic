import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export interface GiftcardData {
  code: string;
  amount: number;
  recipientName?: string;
  senderName?: string;
  message?: string;
}

export type GiftcardVersion = 'v1' | 'v2';

// Map versions to SVG files - Using v1-alt for v1
const SVG_TEMPLATES: Record<GiftcardVersion, string> = {
  v1: path.join(process.cwd(), 'design-reference', 'giftcard-v1-alt.svg'),
  v2: path.join(process.cwd(), 'design-reference', 'giftcard-v2.svg'),
};

// Color palettes extracted from design files
const COLOR_PALETTES = {
  v1: {
    accentPrimary: '#9D277D',    // Magenta/Rosa
    accentSecondary: '#6F5EE0',  // Púrpura
    text: '#1F3A55',              // Azul oscuro
    textSecondary: '#583E7E',     // Púrpura oscuro
  },
  v2: {
    accentPrimary: '#9C140D',    // Rojo
    accentSecondary: '#AE4A02',  // Naranja
    text: '#2D3A50',              // Gris oscuro
    textSecondary: '#AA4A6C',     // Rojo oscuro
  },
};



/**
 * Creates an SVG overlay with dynamic text positioned on the dotted lines
 * Properly escapes text to handle UTF-8 characters (names, accents, etc)
 * v1: includes names and code | v2: only code (no names)
 */
const createTextOverlaySVG = (data: GiftcardData, version: GiftcardVersion): string => {
  const colors = COLOR_PALETTES[version];
  
  // NO escapar - Sharp maneja UTF-8 correctamente en text content
  // Solo sanitizar para prevenir </text> u otros tags que rompan el SVG
  const sanitize = (str: string) => String(str || '').replace(/<|>/g, '');
  
  const recipientName = sanitize(data.recipientName || '');
  const senderName = sanitize(data.senderName || '');
  const amount = sanitize(String(data.amount || ''));
  const code = sanitize(data.code);
  const message = sanitize(data.message || '');
  
  if (version === 'v1') {
    return `
        <!-- Recipient name right after "para:" -->
        <text x="130" y="162" font-family="Arial, sans-serif" font-size="11" font-weight="400" fill="#958985">${recipientName}</text>
        
        <!-- Sender name right after "de:" -->
        <text x="130" y="202" font-family="Arial, sans-serif" font-size="11" font-weight="400" fill="#958985">${senderName}</text>
        
        <!-- Amount on left side -->
        <text x="100" y="235" font-family="Arial, sans-serif" font-size="11" font-weight="400" fill="#958985">Valor : $ ${amount}</text>
        
        <!-- Code GC-XXXXX centered -->
        <text x="280" y="330" font-family="Courier New, monospace" font-size="13" font-weight="bold" fill="${colors.accentPrimary}" letter-spacing="1.5" text-anchor="middle">${code}</text>
        
        <!-- Message (if present) -->
        ${
          message
            ? `<text x="280" y="370" font-family="Arial, sans-serif" font-size="11" fill="${colors.text}" text-anchor="middle" font-style="italic">"${message}"</text>`
            : ''
        }
    `;
  } else {
    // v2: only code, no names
    return `
        <!-- Code GC-XXXXX centered below all, above logo -->
        <text x="280" y="360" font-family="Courier New, monospace" font-size="18" font-weight="bold" fill="${colors.accentPrimary}" letter-spacing="2" text-anchor="middle">${code}</text>
    `;
  }
};

/**
 * Generates a PNG image by converting SVG template to PNG using Sharp
 * Uses original SVG templates with text overlay positioned on dotted lines
 * Handles UTF-8 encoding properly for all character sets
 */
export const generateGiftcardImage = async (data: GiftcardData, version: GiftcardVersion = 'v1'): Promise<Buffer> => {
  try {
    const svgFile = SVG_TEMPLATES[version];

    if (!fs.existsSync(svgFile)) {
      throw new Error(`SVG template not found: ${svgFile}`);
    }

    // Read the original SVG template
    const templateSVG = fs.readFileSync(svgFile, 'utf-8');
    
    // Create text overlay SVG
    const textOverlay = createTextOverlaySVG(data, version);
    
    // Combine template SVG with text overlay
    const combinedSVG = templateSVG.replace('</svg>', `${textOverlay}
</svg>`);

    // Convert to UTF-8 buffer with BOM or proper encoding
    const svgBuffer = Buffer.from(combinedSVG, 'utf-8');

    // Convert combined SVG to PNG using Sharp
    // density increased for better text rendering
    const buffer = await sharp(svgBuffer, { density: 150 })
      .png({ quality: 95, progressive: true, force: true })
      .toBuffer();

    return buffer;
  } catch (error) {
    console.error('[generateGiftcardImage] Error generating giftcard image:', error);
    throw new Error(`Failed to generate giftcard image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Generates a PNG image and returns it as a base64-encoded string
 */
export const generateGiftcardImageBase64 = async (data: GiftcardData, version: GiftcardVersion = 'v1'): Promise<string> => {
  try {
    const buffer = await generateGiftcardImage(data, version);
    return buffer.toString('base64');
  } catch (error) {
    console.error('[generateGiftcardImageBase64] Error generating base64 giftcard image:', error);
    throw new Error(`Failed to generate base64 giftcard image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Generates both v1 and v2 giftcard images as base64 strings using original SVG templates
 */
export const generateAllGiftcardVersions = async (data: GiftcardData): Promise<{ v1: string; v2: string }> => {
  try {
    const [v1Base64, v2Base64] = await Promise.all([
      generateGiftcardImageBase64(data, 'v1'),
      generateGiftcardImageBase64(data, 'v2'),
    ]);

    return { v1: v1Base64, v2: v2Base64 };
  } catch (error) {
    console.error('[generateAllGiftcardVersions] Error generating giftcard versions:', error);
    throw new Error(`Failed to generate giftcard versions: ${error instanceof Error ? error.message : String(error)}`);
  }
};
