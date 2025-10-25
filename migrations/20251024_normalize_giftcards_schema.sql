-- Migration: normalize_giftcards_schema
-- Date: 2025-10-24
-- Purpose: Ensure `giftcards.value` and `giftcards.balance` are present and normalized.
-- Strategy (safe, reversible-ish):
-- 1) Preview current NULL counts and existing defaults.
-- 2) Fill NULLs with reasonable values (initial_value -> value and balance).
-- 3) Set sensible DEFAULTs (0) for new rows.
-- 4) Optionally set NOT NULL constraints after verification.

-- IMPORTANT: take a DB snapshot or pg_dump BEFORE running this migration.

BEGIN;

-- 0) Preview: counts and sample rows
-- Run these manually to inspect before applying (not destructive):
-- SELECT count(*) AS null_value_count FROM giftcards WHERE value IS NULL;
-- SELECT count(*) AS null_balance_count FROM giftcards WHERE balance IS NULL;
-- SELECT id, code, value, balance, initial_value, metadata FROM giftcards WHERE value IS NULL OR balance IS NULL LIMIT 50;

-- 1) Normalize values: fill value from initial_value or metadata fields when missing.
-- Use COALESCE to choose a sensible source. This will set value and balance to a numeric representation.
UPDATE giftcards
SET value = COALESCE(value, initial_value, (metadata->>'initial_value')::numeric, (metadata->>'value')::numeric, (metadata->>'amount')::numeric, 0)
WHERE value IS NULL;

-- 2) Normalize balance: if balance missing, prefer existing balance, else use value
UPDATE giftcards
SET balance = COALESCE(balance, value, initial_value, 0)
WHERE balance IS NULL;

-- 3) In case initial_value is NULL, set it from value for consistency
UPDATE giftcards
SET initial_value = COALESCE(initial_value, value)
WHERE initial_value IS NULL;

-- 4) Set sensible DEFAULTs so future INSERTs that omit these columns get 0
ALTER TABLE giftcards ALTER COLUMN value SET DEFAULT 0;
ALTER TABLE giftcards ALTER COLUMN balance SET DEFAULT 0;

-- 5) Verify there are no NULLs now. If this fails, ROLLBACK and inspect.
-- You can run these checks manually after running the migration commands above (before committing):
-- SELECT count(*) FROM giftcards WHERE value IS NULL;
-- SELECT count(*) FROM giftcards WHERE balance IS NULL;

-- 6) Optionally make columns NOT NULL. This is commented out by default.
-- Only enable after you manually confirmed the NULL counts are zero and tested in staging.
-- ALTER TABLE giftcards ALTER COLUMN value SET NOT NULL;
-- ALTER TABLE giftcards ALTER COLUMN balance SET NOT NULL;

COMMIT;

-- Rollback notes:
-- If you need to undo the schema changes (defaults and NOT NULL), use the rollback script provided in the repo or restore from DB snapshot.
-- Reverting numeric content changes requires a backup (we cannot reliably infer previous NULLs).

-- End migration
