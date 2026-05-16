/**
 * Vista previa local — mismo generador que los correos.
 *
 * IMPORTANTE: Guarda giftcardImageGenerator.ts (Cmd+S) ANTES de ejecutar.
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const generatorPath = path.resolve(process.cwd(), 'api/utils/giftcardImageGenerator.ts');
const stamp = Date.now();
const out =
  process.argv[2] ||
  path.join('tmp', `giftcard-preview-${stamp}.png`);

/** Lee LAYOUT del archivo en disco (no del buffer del editor sin guardar) */
function readLayoutFromDisk(): string | null {
  try {
    const src = fs.readFileSync(generatorPath, 'utf8');
    const m = src.match(/export const GIFTCARD_LAYOUT = \{[\s\S]*?\} as const/);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

const onDisk = readLayoutFromDisk();
console.log('\n── LAYOUT en disco (archivo guardado) ──');
console.log(onDisk ?? '(no se pudo leer GIFTCARD_LAYOUT del archivo)');
console.log('────────────────────────────────────────\n');

// Cache-bust: fuerza recarga del .ts en cada ejecución
const importUrl = `${pathToFileURL(generatorPath).href}?v=${stamp}`;
const { generateGiftcardImage, GIFTCARD_LAYOUT } = await import(importUrl);

console.log('── LAYOUT cargado en esta ejecución ──');
console.log(JSON.stringify(GIFTCARD_LAYOUT, null, 2));
console.log('────────────────────────────────────\n');

const amountRaw = process.env.AMOUNT;
const amount = amountRaw ? Number(String(amountRaw).replace(/[^0-9.]/g, '')) : 50;

const data = {
  recipientName: process.env.RECIPIENT || 'Maria Garcia',
  senderName: process.env.SENDER || 'Juan Perez',
  code: process.env.CODE || 'GC-PREVIEW',
  amount: Number.isFinite(amount) && amount > 0 ? amount : 50,
  message: process.env.MESSAGE || '',
};

const buffer = await generateGiftcardImage(data);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buffer);

const abs = path.resolve(out);
console.log('✅ PNG generado:', abs);
console.log('Datos de prueba:', data);
console.log('\nSi el PNG no coincide con lo que editaste, guarda el .ts (Cmd+S) y vuelve a correr.\n');
