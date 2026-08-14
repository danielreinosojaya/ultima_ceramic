/**
 * Soft-deactivates INTRODUCTORY_CLASS products (e.g. "Clase de introducción al torno alfarero").
 *
 * SAFE: does NOT delete rows. Historical bookings keep product_id / product_type.
 *
 * Usage (loads .env.local / .env like other DB scripts):
 *   npx tsx scripts/deactivate-introductory-class.ts
 *
 * Equivalent SQL:
 *   UPDATE products SET is_active = false WHERE type = 'INTRODUCTORY_CLASS';
 *
 * DO NOT: DELETE FROM products WHERE type = 'INTRODUCTORY_CLASS';
 * DO NOT: run syncProducts / full product wipe+reseed for this.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@vercel/postgres';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  console.log('[deactivate-introductory-class] Checking INTRODUCTORY_CLASS products…');

  const { rows: intros } = await sql`
    SELECT id, name, is_active, type
    FROM products
    WHERE type = 'INTRODUCTORY_CLASS'
    ORDER BY name
  `;

  if (intros.length === 0) {
    console.log('No INTRODUCTORY_CLASS products found. Nothing to do.');
    return;
  }

  for (const p of intros) {
    console.log(`  - ${p.id} | ${p.name} | is_active=${p.is_active}`);
  }

  const ids = intros.map((p) => p.id);
  const { rows: bookingStats } = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE is_paid = true)::int AS paid
    FROM bookings
    WHERE product_type = 'INTRODUCTORY_CLASS'
       OR product_id = ANY(${ids as any})
  `;

  const stats = bookingStats[0] || { total: 0, paid: 0 };
  console.log(
    `[deactivate-introductory-class] Historical bookings referencing intro: ${stats.total} (paid: ${stats.paid}) — left untouched.`
  );

  const active = intros.filter((p) => p.is_active);
  if (active.length === 0) {
    console.log('All INTRODUCTORY_CLASS products already inactive. Done.');
    return;
  }

  const { rowCount } = await sql`
    UPDATE products
    SET is_active = false
    WHERE type = 'INTRODUCTORY_CLASS' AND is_active = true
  `;

  console.log(`[deactivate-introductory-class] Soft-disabled ${rowCount ?? active.length} product(s).`);
  console.log('Type INTRODUCTORY_CLASS remains in code for historical display. No rows deleted.');
}

main().catch((err) => {
  console.error('[deactivate-introductory-class] Error:', err);
  process.exit(1);
});
