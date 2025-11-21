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

// NO generar imágenes - solo retornar base64 vacío
// El problema es que Vercel serverless no puede renderizar fonts
export const generateGiftcardImage = async (data: GiftcardData, version: GiftcardVersion = 'v1'): Promise<Buffer> => {
  // Retornar un buffer vacío pequeño
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
};

export const generateGiftcardImageBase64 = async (data: GiftcardData, version: GiftcardVersion = 'v1'): Promise<string> => {
  const buffer = await generateGiftcardImage(data, version);
  return buffer.toString('base64');
};

export const generateAllGiftcardVersions = async (data: GiftcardData): Promise<{ v1: string; v2: string }> => {
  // Retornar strings vacíos - no enviar attachments por ahora
  return { v1: '', v2: '' };
};
