/**
 * Backfill customers table from booking.user_info for emails that have
 * reservations but no customers row (orphan clients invisible in CRM search).
 *
 * Usage: npx tsx scripts/backfill-orphan-customers.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@vercel/postgres';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const before = await sql`
    SELECT COUNT(*)::int AS n FROM (
      SELECT DISTINCT LOWER(TRIM(user_info->>'email')) AS email
      FROM bookings
      WHERE user_info->>'email' IS NOT NULL AND TRIM(user_info->>'email') <> ''
      EXCEPT
      SELECT LOWER(TRIM(email)) FROM customers WHERE email IS NOT NULL
    ) t
  `;
  console.log('[backfill-orphan-customers] Orphan emails before:', before.rows[0]?.n);

  const result = await sql`
    INSERT INTO customers (email, first_name, last_name, phone, country_code, birthday)
    SELECT DISTINCT ON (LOWER(TRIM(b.user_info->>'email')))
      LOWER(TRIM(b.user_info->>'email')) AS email,
      NULLIF(TRIM(b.user_info->>'firstName'), '') AS first_name,
      NULLIF(TRIM(b.user_info->>'lastName'), '') AS last_name,
      NULLIF(TRIM(b.user_info->>'phone'), '') AS phone,
      NULLIF(TRIM(b.user_info->>'countryCode'), '') AS country_code,
      CASE
        WHEN NULLIF(TRIM(b.user_info->>'birthday'), '') IS NULL THEN NULL
        WHEN TRIM(b.user_info->>'birthday') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
          THEN (TRIM(b.user_info->>'birthday'))::date
        ELSE NULL
      END AS birthday
    FROM bookings b
    WHERE b.user_info->>'email' IS NOT NULL
      AND TRIM(b.user_info->>'email') <> ''
      AND NOT EXISTS (
        SELECT 1 FROM customers c
        WHERE LOWER(TRIM(c.email)) = LOWER(TRIM(b.user_info->>'email'))
      )
    ORDER BY LOWER(TRIM(b.user_info->>'email')), b.created_at ASC
    ON CONFLICT (email) DO NOTHING
  `;

  console.log('[backfill-orphan-customers] Inserted rows:', result.rowCount ?? '(unknown)');

  // Prefer the most common name per email among bookings (avoids one wrong latest booking overwriting identity)
  await sql`
    WITH name_counts AS (
      SELECT
        LOWER(TRIM(user_info->>'email')) AS email,
        NULLIF(TRIM(user_info->>'firstName'), '') AS first_name,
        NULLIF(TRIM(user_info->>'lastName'), '') AS last_name,
        COUNT(*)::int AS n
      FROM bookings
      WHERE user_info->>'email' IS NOT NULL
      GROUP BY 1, 2, 3
    ),
    best AS (
      SELECT DISTINCT ON (email)
        email, first_name, last_name
      FROM name_counts
      WHERE first_name IS NOT NULL OR last_name IS NOT NULL
      ORDER BY email, n DESC, first_name NULLS LAST
    )
    UPDATE customers c
    SET
      first_name = COALESCE(b.first_name, c.first_name),
      last_name = COALESCE(b.last_name, c.last_name)
    FROM best b
    WHERE LOWER(c.email) = b.email
      AND (
        COALESCE(c.first_name, '') IS DISTINCT FROM COALESCE(b.first_name, '')
        OR COALESCE(c.last_name, '') IS DISTINCT FROM COALESCE(b.last_name, '')
      )
  `;
  console.log('[backfill-orphan-customers] Reconciled names from most-common booking identity');

  const liliana = await sql`
    SELECT id, email, first_name, last_name, phone
    FROM customers
    WHERE LOWER(email) = 'llarranagae@gmail.com'
       OR (first_name ILIKE '%liliana%' AND last_name ILIKE '%larra%')
  `;
  console.log('[backfill-orphan-customers] Liliana check:', liliana.rows);

  const after = await sql`
    SELECT COUNT(*)::int AS n FROM (
      SELECT DISTINCT LOWER(TRIM(user_info->>'email')) AS email
      FROM bookings
      WHERE user_info->>'email' IS NOT NULL AND TRIM(user_info->>'email') <> ''
      EXCEPT
      SELECT LOWER(TRIM(email)) FROM customers WHERE email IS NOT NULL
    ) t
  `;
  console.log('[backfill-orphan-customers] Orphan emails after:', after.rows[0]?.n);
}

main().catch((err) => {
  console.error('[backfill-orphan-customers] Error:', err);
  process.exit(1);
});
