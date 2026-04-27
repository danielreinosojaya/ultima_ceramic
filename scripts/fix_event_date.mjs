/**
 * Fix: Move Spill the Tea event block from 2026-04-29 (Wed) to 2026-04-30 (Thu)
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

const WRONG_DATE = '2026-04-29';
const CORRECT_DATE = '2026-04-30';

// --- FIX scheduleOverrides ---
{
  const { rows } = await pool.query(`SELECT value FROM settings WHERE key='scheduleOverrides'`);
  const overrides = rows[0]?.value || {};

  // Remove wrong date, apply to correct date
  const wrongEntry = overrides[WRONG_DATE];
  delete overrides[WRONG_DATE];

  // Build correct Thursday override: only potters_wheel slots remain all day
  // Thursday availability has potters_wheel at 11:00 and 18:00 → keep as-is
  // For Thursday (30), we want: keep all potters_wheel, no molding/painting at 17:00+
  // Since Thursday base only has potters_wheel, just carry the override forward
  overrides[CORRECT_DATE] = wrongEntry || { slots: [] };

  await pool.query(
    `UPDATE settings SET value=$1::jsonb WHERE key='scheduleOverrides'`,
    [JSON.stringify(overrides)]
  );
  console.log(`✅ scheduleOverrides: removed ${WRONG_DATE}, applied to ${CORRECT_DATE}`);
  console.log(`   slots:`, JSON.stringify(overrides[CORRECT_DATE]?.slots));
}

// --- FIX experienceTypeOverrides ---
{
  const { rows } = await pool.query(`SELECT value FROM settings WHERE key='experienceTypeOverrides'`);
  const overrides = rows[0]?.value || {};

  const wrongEntry = overrides[WRONG_DATE];
  delete overrides[WRONG_DATE];
  overrides[CORRECT_DATE] = wrongEntry || {};

  await pool.query(
    `UPDATE settings SET value=$1::jsonb WHERE key='experienceTypeOverrides'`,
    [JSON.stringify(overrides)]
  );
  console.log(`\n✅ experienceTypeOverrides: removed ${WRONG_DATE}, applied to ${CORRECT_DATE}`);
  console.log(`   hand_modeling allowedTimes:`, overrides[CORRECT_DATE]?.hand_modeling?.allowedTimes?.length, 'slots');
  console.log(`   painting allowedTimes:     `, overrides[CORRECT_DATE]?.painting?.allowedTimes?.length, 'slots');
  console.log(`   potters_wheel:             `, overrides[CORRECT_DATE]?.potters_wheel ? 'restringido' : 'SIN RESTRICCIÓN');
}

// --- Verify ---
const { rows: v } = await pool.query(
  `SELECT key, value->$1 as wrong, value->$2 as correct FROM settings WHERE key IN ('scheduleOverrides','experienceTypeOverrides')`,
  [WRONG_DATE, CORRECT_DATE]
);
console.log('\n=== VERIFICACIÓN FINAL ===');
for (const r of v) {
  console.log(`${r.key}:`);
  console.log(`  ${WRONG_DATE} (miércoles): ${r.wrong ? '❌ TODAVÍA EXISTE' : '✅ limpio'}`);
  console.log(`  ${CORRECT_DATE} (jueves):   ${r.correct ? '✅ aplicado' : '❌ falta'}`);
}

console.log('\n🎉 Bloqueo Spill the Tea ahora está en el jueves 30 de abril.');
console.log('   - Modelado a mano: bloqueado desde 17:00');
console.log('   - Pintura:         bloqueada desde 17:00');
console.log('   - Torno:           activo todo el día');

await pool.end();
process.exit(0);
