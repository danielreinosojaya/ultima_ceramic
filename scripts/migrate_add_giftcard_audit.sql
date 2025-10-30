-- Migration: create giftcard_events and add audit columns to giftcard_requests
BEGIN;

-- Create events/audit table for giftcard lifecycle
CREATE TABLE IF NOT EXISTS giftcard_events (
  id SERIAL PRIMARY KEY,
  giftcard_request_id INTEGER NOT NULL REFERENCES giftcard_requests(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  admin_user VARCHAR(200),
  note TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add audit columns to giftcard_requests
ALTER TABLE giftcard_requests
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS delivered_by VARCHAR(200),
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Ensure code uniqueness to avoid duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'giftcard_requests' AND indexname = 'giftcard_requests_code_idx'
  ) THEN
    CREATE UNIQUE INDEX giftcard_requests_code_idx ON giftcard_requests (code);
  END IF;
END$$;

COMMIT;
