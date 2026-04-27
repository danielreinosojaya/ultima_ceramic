/**
 * Block modelado a mano + pintura slots for 2026-04-29 from 17:00 onwards
 * Event: "Spill the Tea" - Jueves 29 abril 2026, 5pm-8pm
 * Torno (potters_wheel) remains fully open.
 */

import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually
const envPath = resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=["']?(.+?)["']?\s*$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

const TARGET_DATE = '2026-04-29';
const BLOCK_FROM_TIME = '17:00'; // 5pm
const TECHNIQUES_TO_BLOCK = ['molding', 'painting'];

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function run() {
  console.log(`\n=== Bloqueo Spill the Tea: ${TARGET_DATE} ===`);
  console.log(`Técnicas a bloquear desde ${BLOCK_FROM_TIME}: ${TECHNIQUES_TO_BLOCK.join(', ')}`);
  console.log(`Torno (potters_wheel): ACTIVO todo el día\n`);

  // 1. Leer availability y scheduleOverrides actuales
  const { rows } = await pool.query(
    `SELECT key, value FROM settings WHERE key IN ('availability', 'scheduleOverrides')`
  );

  const availability = rows.find(r => r.key === 'availability')?.value || {};
  const scheduleOverrides = rows.find(r => r.key === 'scheduleOverrides')?.value || {};

  console.log('Availability keys:', Object.keys(availability));
  console.log('Existing overrides for target date:', scheduleOverrides[TARGET_DATE] || 'none');

  // 2. Obtener slots base del jueves
  const thursdaySlots = availability['Thursday'] || [];
  console.log(`\nThursday base slots: ${thursdaySlots.length} total`);

  const blockFromMinutes = timeToMinutes(BLOCK_FROM_TIME);

  // 3. Filtrar: remover molding/painting >= 17:00
  const filteredSlots = thursdaySlots.filter(slot => {
    const slotMinutes = timeToMinutes(slot.time);
    const isBlockedTechnique = TECHNIQUES_TO_BLOCK.includes(slot.technique);
    const isInBlockWindow = slotMinutes >= blockFromMinutes;

    if (isBlockedTechnique && isInBlockWindow) {
      console.log(`  ❌ BLOQUEADO: ${slot.time} ${slot.technique}`);
      return false;
    }
    return true;
  });

  console.log(`\nSlots resultantes: ${filteredSlots.length} (de ${thursdaySlots.length})`);

  // Verificar que torno sigue activo
  const tornoSlots = filteredSlots.filter(s => s.technique === 'potters_wheel');
  const moldingBefore5 = filteredSlots.filter(s => s.technique === 'molding');
  const paintingBefore5 = filteredSlots.filter(s => s.technique === 'painting');

  console.log(`\n✅ Torno activo: ${tornoSlots.length} slots`);
  console.log(`✅ Modelado a mano antes de 5pm: ${moldingBefore5.length} slots`);
  console.log(`✅ Pintura antes de 5pm: ${paintingBefore5.length} slots`);

  // Mostrar slots bloqueados para confirmación
  const blockedCount = thursdaySlots.length - filteredSlots.length;
  console.log(`\n🚫 Total slots bloqueados: ${blockedCount}`);

  // 4. Construir override para el día
  const existingOverride = scheduleOverrides[TARGET_DATE] || {};
  const newOverride = {
    ...existingOverride,
    slots: filteredSlots
  };

  // 5. Actualizar scheduleOverrides
  const updatedOverrides = {
    ...scheduleOverrides,
    [TARGET_DATE]: newOverride
  };

  // 6. Guardar en DB
  await pool.query(
    `UPDATE settings SET value = $1::jsonb WHERE key = 'scheduleOverrides'`,
    [JSON.stringify(updatedOverrides)]
  );

  console.log(`\n✅ Override guardado exitosamente para ${TARGET_DATE}`);

  // Verificación final
  const { rows: verifyRows } = await pool.query(
    `SELECT value->$1 as day_override FROM settings WHERE key = 'scheduleOverrides'`,
    [TARGET_DATE]
  );

  const savedOverride = verifyRows[0]?.day_override;
  if (savedOverride && savedOverride.slots) {
    console.log(`\n✅ VERIFICACIÓN: Override guardado con ${savedOverride.slots.length} slots`);

    const savedTorno = savedOverride.slots.filter(s => s.technique === 'potters_wheel').length;
    const savedMolding = savedOverride.slots.filter(s => s.technique === 'molding').length;
    const savedPainting = savedOverride.slots.filter(s => s.technique === 'painting').length;

    console.log(`   - Torno: ${savedTorno} slots (ACTIVO)`);
    console.log(`   - Modelado a mano: ${savedMolding} slots (solo antes de 5pm)`);
    console.log(`   - Pintura: ${savedPainting} slots (solo antes de 5pm)`);
    console.log(`\n🎉 Bloqueo aplicado correctamente. El evento Spill the Tea está protegido.`);
  } else {
    console.error('❌ ERROR: No se pudo verificar el override guardado');
    process.exit(1);
  }

  await pool.end();
  process.exit(0);
}

run().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
