-- Migration: create giftcard_holds table to support temporary holds on giftcard balances
BEGIN;

-- Ensure the uuid extension is available for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the holds table using varchar for giftcard_id to match existing giftcard codes
CREATE TABLE IF NOT EXISTS giftcard_holds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giftcard_id VARCHAR NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  booking_temp_ref VARCHAR(100),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gch_giftcard_id ON giftcard_holds(giftcard_id);
CREATE INDEX IF NOT EXISTS idx_gch_expires_at ON giftcard_holds(expires_at);

-- Try to add a foreign key constraint only if the referenced column exists.
-- This is defensive so the migration won't fail on databases with different schemas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'giftcards' AND column_name = 'id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'giftcard_holds' AND column_name = 'giftcard_id'
  ) THEN
    BEGIN
      -- Attempt to create the FK; if it fails, record a NOTICE but don't abort the migration
      BEGIN
        ALTER TABLE giftcard_holds
          ADD CONSTRAINT fk_giftcard_holds_giftcards
          FOREIGN KEY (giftcard_id) REFERENCES giftcards(id) ON DELETE CASCADE;
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not add FK constraint fk_giftcard_holds_giftcards: %', SQLERRM;
      END;
    END;
  ELSE
    RAISE NOTICE 'giftcards.id column missing or not detected; skipping FK creation for giftcard_holds';
  END IF;
END
$$;

COMMIT;
