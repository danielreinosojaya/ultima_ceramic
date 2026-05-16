import { ImageResponse } from '@vercel/og';
import React from 'react';
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

/** Plantilla completa tu_giftcard.png: dos caras apiladas (1080×1080) */
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1080;
const TEMPLATE_FILE = 'tu_giftcard.png';

/**
 * Textos sobre la cara frontal (mitad superior). La cara trasera es solo plantilla.
 * Ajusta left/top aquí y corre: npm run preview:giftcard
 */
export const GIFTCARD_LAYOUT = {
  recipientName: { left: 330, top: 270, fontSize: 28, color: '#6b5d54', fontWeight: 600 },
  senderName: { left: 330, top: 330, fontSize: 28, color: '#6b5d54', fontWeight: 600 },
  amount: { left: 398, top: 410, fontSize: 18, color: '#6b5d54', fontWeight: 700 },
} as const;

const LAYOUT = GIFTCARD_LAYOUT;

let cachedTemplateDataUrl: string | null = null;

const truncate = (value: string | undefined, max: number): string => {
  const s = (value || '').trim();
  if (s.length <= max) return s || '—';
  return `${s.slice(0, max - 1)}…`;
};

const resolveTemplatePath = (): string => {
  const candidates = [
    path.join(process.cwd(), 'public', 'assets', TEMPLATE_FILE),
    path.join(process.cwd(), 'assets', TEMPLATE_FILE),
    path.join(process.cwd(), 'public', TEMPLATE_FILE),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Plantilla de giftcard no encontrada (${TEMPLATE_FILE}). Colócala en public/assets/${TEMPLATE_FILE}`
  );
};

const getTemplateDataUrl = (): string => {
  if (cachedTemplateDataUrl) return cachedTemplateDataUrl;
  const templatePath = resolveTemplatePath();
  const buffer = fs.readFileSync(templatePath);
  cachedTemplateDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  return cachedTemplateDataUrl;
};

const textLayer = (
  text: string,
  style: {
    left: number;
    top: number;
    fontSize: number;
    color: string;
    fontWeight: number | string;
    letterSpacing?: number;
  }
) =>
  React.createElement(
    'div',
    {
      style: {
        position: 'absolute',
        left: style.left,
        top: style.top,
        fontSize: style.fontSize,
        color: style.color,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing ?? 0,
        fontFamily: 'Georgia, "Times New Roman", serif',
        maxWidth: CARD_WIDTH - style.left - 40,
        lineHeight: 1.2,
      },
    },
    text
  );

/** Genera PNG real (buffer) con plantilla + datos dinámicos */
export const generateGiftcardImage = async (
  data: GiftcardData,
  _version: GiftcardVersion = 'v1'
): Promise<Buffer> => {
  const background = getTemplateDataUrl();
  const recipientName = truncate(data.recipientName, 42);
  const senderName = truncate(data.senderName, 42);
  const amountLabel = `$${Number(data.amount).toFixed(2)}`;

  const element = React.createElement(
    'div',
    {
      style: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: 'flex',
        position: 'relative',
      },
    },
    [
      React.createElement('img', {
        src: background,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
        },
      }),
      textLayer(recipientName, LAYOUT.recipientName),
      textLayer(senderName, LAYOUT.senderName),
      textLayer(amountLabel, LAYOUT.amount),
    ]
  );

  const response = new ImageResponse(element, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const generateGiftcardImageBase64 = async (
  data: GiftcardData,
  version: GiftcardVersion = 'v1'
): Promise<string> => {
  const buffer = await generateGiftcardImage(data, version);
  return buffer.toString('base64');
};

/** @deprecated Usar generateGiftcardImageBase64; mantiene compatibilidad con emailService */
export const generateGiftcardSVG = (_data: GiftcardData): string => {
  return '';
};

export const generateAllGiftcardVersions = async (
  data: GiftcardData
): Promise<{ v1: string; v2: string }> => {
  try {
    const base64 = await generateGiftcardImageBase64(data, 'v1');
    return { v1: base64, v2: base64 };
  } catch (error) {
    console.error('[generateAllGiftcardVersions] Error:', error);
    return { v1: '', v2: '' };
  }
};
