/**
 * Block hand_modeling + painting for experienceTypeOverrides on 2026-04-29 from 17:00
 * Event: "Spill the Tea" - Jueves 29 abril 2026, 5pm-8pm
 */

import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=["']?(.+?)["']?\s*$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

const TARGET_DATE = '2026-04-29';

// Thursday hours: 10:00-19:00 every 30min
// Only allow before 17:00 for hand_modeling/painting
const allowedTimes = [];
for (let h = 10; h < 17; h++) {
  allowedTimes.push(String(h).padStart(2, '0') + ':00');
  allowedTimes.push(String(h).padStart(2, '0') + ':30');
}
console.log('Times allowed for hand_modeling/painting (before 5pm):', allowedTimes.join(', '));
console.log('Times BLOCKED (>= 17:00): 17:00, 17:30, 18:00, 18:30, 19:00\n');

const { rows } = await pool.query(
  `SELECT value FROM settings WHERE key='experienceTypeOverrides'`
);
const experienceTypeOverrides = rows[0]?.value || {};
console.log('Existing experienceTypeOverrides for target date:', JSON.stringify(experienceTypeOverrides[TARGET_DATE]) || 'none');

const existingDay = experienceTypeOverrides[TARGET_DATE] || {};
const newDayOverride = {
  ...existingDay,
  hand_modeling: { allowedTimes, reason: 'Evento Spill the Tea 17:00-20:00' },
  painting: { allowedTimes, reason: 'Evento Spill the Tea 17:00-20:00' }
};

const updatedOverrides = { ...experienceTypeOverrides, [TARGET_DATE]: newDayOverride };

await pool.query(
  `UPDATE settings SET value = $1::jsonb WHERE key='experienceTypeOverrides'`,
  [JSON.stringify(updatedOverrides)]
);

const { rows: verifyRows } = await pool.query(
  `SELECT value->$1 as day FROM settings WHERE key='experienceTypeOverrides'`,
  [TARGET_DATE]
);
const saved = verifyRows[0]?.day;

console.log('\n=== RESULTADO ===');
console.log('hand_modeling allowedTimes:', saved?.hand_modeling?.allowedTimes?.length, 'slots (10:00-16:30)');
console.log('painting allowedTimes:     ', saved?.painting?.allowedTimes?.length, 'slots (10:00-16:30)');
console.log('potters_wheel:             ', saved?.potters_wheel ? 'RESTRINGIDO' : 'SIN RESTRICCIÓN (abierto todo el día)');

console.log('\n✅ Base de datos actualizada:');
console.log('  - Modelado a mano: BLOQUEADO desde 17:00 (Spill the Tea)');
console.log('  - Pintura:         BLOQUEADO desde 17:00 (Spill the Tea)');
console.log('  - Torno:           ACTIVO todo el día');

await pool.end();
process.exit(0);
