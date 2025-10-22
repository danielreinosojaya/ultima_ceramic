-- Migration: ensure giftcards table and required columns exist
BEGIN;

-- Create table if it doesn't exist (minimal columns)
CREATE TABLE IF NOT EXISTS giftcards (
        id INTEGER PRIMARY KEY,
        code VARCHAR(32) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns if not present
ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS initial_value NUMERIC;
ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS value NUMERIC;
ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS balance NUMERIC;
ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS giftcard_request_id INTEGER REFERENCES giftcard_requests(id) ON DELETE SET NULL;
ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Ensure a sequence exists for giftcards.id and is owned by the column, and set it to a safe next value
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'giftcards_id_seq') THEN
        CREATE SEQUENCE giftcards_id_seq;
    END IF;
    -- Make the sequence owned by the table column
    ALTER SEQUENCE giftcards_id_seq OWNED BY giftcards.id;
    -- Set the default for id to use the sequence
    ALTER TABLE giftcards ALTER COLUMN id SET DEFAULT nextval('giftcards_id_seq');
    -- Advance the sequence to a safe next value (max(id)+1)
    PERFORM setval('giftcards_id_seq', COALESCE((SELECT MAX(id) FROM giftcards), 0) + 1, false);
END
$$;

COMMIT;
