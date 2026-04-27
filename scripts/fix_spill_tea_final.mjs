/**
 * Fix definitivo: 2026-04-30 (Jueves - Spill the Tea)
 * - scheduleOverrides: potters_wheel activo (11:00, 18:00)
 * - experienceTypeOverrides: hand_modeling + painting bloqueados desde 15:00
 *   (experiencias duran 2h → clase 14:30 termina 16:30, 30min antes del evento)
 */

import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envContent = fs.readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=["']?(.+?)["']?\s*$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

const DATE = '2026-04-30';

// Tiempos permitidos para modelado/pintura: 10:00 hasta 14:30
// Una clase de 2h a las 14:30 termina a las 16:30 → 30 min de buffer antes de 17:00
const allowedTimes = [];
for (let h = 10; h <= 14; h++) {
  allowedTimes.push(String(h).padStart(2,'0') + ':00');
  if (h < 14) allowedTimes.push(String(h).padStart(2,'0') + ':30');
}
allowedTimes.push('14:30'); // último slot permitido

console.log('Allowed times for hand_modeling/painting:', allowedTimes.join(', '));
console.log('Último slot:', allowedTimes.at(-1), '→ termina a las 16:30 (30min antes del evento)\n');

// 1. FIX scheduleOverrides
{
  const { rows } = await pool.query(`SELECT value FROM settings WHERE key='scheduleOverrides'`);
  const overrides = rows[0]?.value || {};
  overrides[DATE] = {
    slots: [
      { time: '11:00', technique: 'potters_wheel', instructorId: 3 },
      { time: '18:00', technique: 'potters_wheel', instructorId: 3 }
    ]
  };
  await pool.query(
    `UPDATE settings SET value=$1::jsonb WHERE key='scheduleOverrides'`,
    [JSON.stringify(overrides)]
  );
  console.log(`✅ scheduleOverrides[${DATE}]: potters_wheel 11:00 y 18:00 activos`);
}

// 2. FIX experienceTypeOverrides
{
  const { rows } = await pool.query(`SELECT value FROM settings WHERE key='experienceTypeOverrides'`);
  const overrides = rows[0]?.value || {};
  overrides[DATE] = {
    hand_modeling: { allowedTimes, reason: 'Evento Spill the Tea 17:00-20:00 (clase 2h, último inicio 14:30)' },
    painting:      { allowedTimes, reason: 'Evento Spill the Tea 17:00-20:00 (clase 2h, último inicio 14:30)' }
    // potters_wheel sin entrada = sin restricción
  };
  await pool.query(
    `UPDATE settings SET value=$1::jsonb WHERE key='experienceTypeOverrides'`,
    [JSON.stringify(overrides)]
  );
  console.log(`✅ experienceTypeOverrides[${DATE}]:`);
  console.log(`   hand_modeling: ${allowedTimes.length} slots (${allowedTimes[0]} – ${allowedTimes.at(-1)})`);
  console.log(`   painting:      ${allowedTimes.length} slots (${allowedTimes[0]} – ${allowedTimes.at(-1)})`);
  console.log(`   potters_wheel: SIN RESTRICCIÓN (sin entrada)`);
}

// 3. Verificación final
const { rows: v } = await pool.query(
  `SELECT 
    (SELECT value->'${DATE}' FROM settings WHERE key='scheduleOverrides') AS sched,
    (SELECT value->'${DATE}' FROM settings WHERE key='experienceTypeOverrides') AS exp`
);
const sched = v[0].sched;
const exp = v[0].exp;

console.log(`\n=== VERIFICACIÓN DB ${DATE} ===`);
console.log('scheduleOverrides.slots:', sched?.slots?.map((s) => `${s.technique}@${s.time}`).join(', ') || 'VACÍO ❌');
console.log('experienceTypeOverrides.hand_modeling.allowedTimes:', exp?.hand_modeling?.allowedTimes?.length, 'slots, último:', exp?.hand_modeling?.allowedTimes?.at(-1));
console.log('experienceTypeOverrides.painting.allowedTimes:', exp?.painting?.allowedTimes?.length, 'slots, último:', exp?.painting?.allowedTimes?.at(-1));
console.log('experienceTypeOverrides.potters_wheel:', exp?.potters_wheel ? '⚠️ RESTRINGIDO' : '✅ SIN RESTRICCIÓN');

const ok =
  sched?.slots?.length === 2 &&
  exp?.hand_modeling?.allowedTimes?.length === allowedTimes.length &&
  exp?.painting?.allowedTimes?.length === allowedTimes.length &&
  !exp?.potters_wheel;

console.log(ok ? '\n🎉 TODO CORRECTO' : '\n❌ REVISAR — algo falló');
console.log('  Lógica de bloqueo:');
console.log('  - Clase a las 14:30 → termina 16:30 → buffer 30min → ✅ permitido');
console.log('  - Clase a las 15:00 → termina 17:00 → BLOQUEADO ✅');
console.log('  - Torno: activo todo el día ✅');

await pool.end();
process.exit(0);
