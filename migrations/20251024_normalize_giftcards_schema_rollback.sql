-- Rollback for 20251024_normalize_giftcards_schema.sql
-- Purpose: undo DEFAULT and NOT NULL changes applied by the migration.
-- NOTE: This does NOT restore original NULL values for 'value' and 'balance' if they were overwritten.
-- To fully revert data changes, restore from a DB snapshot taken before the migration.

BEGIN;

-- Remove defaults
ALTER TABLE giftcards ALTER COLUMN value DROP DEFAULT;
ALTER TABLE giftcards ALTER COLUMN balance DROP DEFAULT;

-- Allow NULLs again (if you previously set NOT NULL)
ALTER TABLE giftcards ALTER COLUMN value DROP NOT NULL;
ALTER TABLE giftcards ALTER COLUMN balance DROP NOT NULL;

COMMIT;

-- If you need to restore previous data (NULLs), restore the DB snapshot created before migration.
