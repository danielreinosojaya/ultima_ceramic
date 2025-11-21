import { createCanvas, loadImage } from 'canvas';
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

const SVG_TEMPLATES: Record<GiftcardVersion, string> = {
  v1: path.join(process.cwd(), 'design-reference', 'giftcard-v1-alt.svg'),
  v2: path.join(process.cwd(), 'design-reference', 'giftcard-v2.svg'),
};

const COLOR_PALETTES = {
  v1: {
    accentPrimary: '#9D277D',
    accentSecondary: '#6F5EE0',
    text: '#1F3A55',
    textSecondary: '#583E7E',
  },
  v2: {
    accentPrimary: '#9C140D',
    accentSecondary: '#AE4A02',
    text: '#2D3A50',
    textSecondary: '#AA4A6C',
  },
};

export const generateGiftcardImage = async (data: GiftcardData, version: GiftcardVersion = 'v1'): Promise<Buffer> => {
  try {
    const svgFile = SVG_TEMPLATES[version];
    if (!fs.existsSync(svgFile)) {
      throw new Error(`SVG template not found: ${svgFile}`);
    }

    // Cargar SVG como imagen base
    const svgBuffer = fs.readFileSync(svgFile);
    const img = await loadImage(svgBuffer);
    
    // Crear canvas del mismo tamaño
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    // Dibujar SVG base
    ctx.drawImage(img, 0, 0);
    
    // Configurar texto
    ctx.fillStyle = '#958985';
    ctx.font = '11px Arial, sans-serif';
    
    if (version === 'v1') {
      // Nombre destinatario
      if (data.recipientName) {
        ctx.fillText(data.recipientName, 130, 162);
      }
      
      // Nombre remitente
      if (data.senderName) {
        ctx.fillText(data.senderName, 130, 202);
      }
      
      // Monto
      ctx.fillText(`Valor : $ ${data.amount}`, 100, 235);
      
      // Código
      ctx.fillStyle = COLOR_PALETTES.v1.accentPrimary;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(data.code, 280, 330);
      
      // Mensaje
      if (data.message) {
        ctx.fillStyle = COLOR_PALETTES.v1.text;
        ctx.font = 'italic 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`"${data.message}"`, 280, 370);
      }
    } else {
      // v2: solo código
      ctx.fillStyle = COLOR_PALETTES.v2.accentPrimary;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(data.code, 280, 360);
    }
    
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('[generateGiftcardImage] Error:', error);
    throw new Error(`Failed to generate giftcard image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateGiftcardImageBase64 = async (data: GiftcardData, version: GiftcardVersion = 'v1'): Promise<string> => {
  try {
    const buffer = await generateGiftcardImage(data, version);
    return buffer.toString('base64');
  } catch (error) {
    console.error('[generateGiftcardImageBase64] Error:', error);
    throw new Error(`Failed to generate base64 giftcard image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateAllGiftcardVersions = async (data: GiftcardData): Promise<{ v1: string; v2: string }> => {
  try {
    const [v1Base64, v2Base64] = await Promise.all([
      generateGiftcardImageBase64(data, 'v1'),
      generateGiftcardImageBase64(data, 'v2'),
    ]);
    return { v1: v1Base64, v2: v2Base64 };
  } catch (error) {
    console.error('[generateAllGiftcardVersions] Error:', error);
    throw new Error(`Failed to generate giftcard versions: ${error instanceof Error ? error.message : String(error)}`);
  }
};
