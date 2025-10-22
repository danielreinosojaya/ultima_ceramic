-- Migration: ensure giftcards table and required columns exist
BEGIN;

-- Create table if it doesn't exist (minimal columns)
CREATE TABLE IF NOT EXISTS giftcards (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns if not present
ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS initial_value NUMERIC;
ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS balance NUMERIC;
ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS giftcard_request_id INTEGER REFERENCES giftcard_requests(id) ON DELETE SET NULL;
ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMIT;
