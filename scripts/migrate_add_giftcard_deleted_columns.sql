-- Migration: add deleted_by and deleted_at to giftcard_requests
-- Idempotent: will not fail if columns already exist
BEGIN;

ALTER TABLE IF EXISTS giftcard_requests
  ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Optionally ensure giftcard_events exists (audit table used elsewhere)
CREATE TABLE IF NOT EXISTS giftcard_events (
  id SERIAL PRIMARY KEY,
  giftcard_request_id INTEGER,
  event_type VARCHAR(64),
  admin_user VARCHAR(100),
  note TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;

-- How to run:
-- psql "$DATABASE_URL" -f scripts/migrate_add_giftcard_deleted_columns.sql
-- or, with host/user/dbname:
-- PGPASSWORD=... psql -h <host> -U <user> -d <db> -f scripts/migrate_add_giftcard_deleted_columns.sql
