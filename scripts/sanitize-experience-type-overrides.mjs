/**
 * Audita y opcionalmente limpia experienceTypeOverrides en la BD.
 * - Detecta allowedTimes vacíos (bloqueaban todo el día)
 * - Lista restricciones activas de potters_wheel por fecha
 *
 * Uso:
 *   node scripts/sanitize-experience-type-overrides.mjs          # solo reporte
 *   node scripts/sanitize-experience-type-overrides.mjs --apply  # guarda limpio en BD
 */

import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const apply = process.argv.includes('--apply');

const envPath = resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=["']?(.+?)["']?\s*$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

function sanitize(overrides) {
  const cleaned = {};
  for (const [date, techniques] of Object.entries(overrides || {})) {
    if (!techniques || typeof techniques !== 'object') continue;
    const day = {};
    for (const [technique, entry] of Object.entries(techniques)) {
      if (entry?.allowedTimes?.length > 0) {
        day[technique] = {
          allowedTimes: [...entry.allowedTimes].sort(),
          ...(entry.reason ? { reason: entry.reason } : {}),
        };
      }
    }
    if (Object.keys(day).length > 0) cleaned[date] = day;
  }
  return cleaned;
}

function findInvalid(overrides) {
  const issues = [];
  for (const [date, techniques] of Object.entries(overrides || {})) {
    for (const [technique, entry] of Object.entries(techniques || {})) {
      if (entry?.allowedTimes && entry.allowedTimes.length === 0) {
        issues.push({ date, technique });
      }
    }
  }
  return issues;
}

const { rows } = await pool.query(`SELECT value FROM settings WHERE key='experienceTypeOverrides'`);
const raw = rows[0]?.value || {};
const invalid = findInvalid(raw);
const pottersDates = Object.entries(raw)
  .filter(([, d]) => d?.potters_wheel?.allowedTimes?.length > 0)
  .map(([date, d]) => ({ date, times: d.potters_wheel.allowedTimes, reason: d.potters_wheel.reason }));

console.log('\n=== experienceTypeOverrides ===\n');
console.log('Fechas con configuración:', Object.keys(raw).length);
console.log('Entradas inválidas (allowedTimes vacío):', invalid.length);
invalid.forEach((i) => console.log(`  - ${i.date} / ${i.technique}`));
console.log('\nTorno (lista blanca activa):', pottersDates.length, 'día(s)');
pottersDates.forEach((p) =>
  console.log(`  - ${p.date}: ${p.times.length} slots${p.reason ? ` (${p.reason})` : ''}`)
);

if (apply) {
  const cleaned = sanitize(raw);
  await pool.query(
    `UPDATE settings SET value = $1::jsonb WHERE key = 'experienceTypeOverrides'`,
    [JSON.stringify(cleaned)]
  );
  console.log('\n✅ Guardado en BD (entradas inválidas eliminadas).');
} else if (invalid.length > 0) {
  console.log('\nEjecuta con --apply para limpiar la base de datos.');
}

await pool.end();
