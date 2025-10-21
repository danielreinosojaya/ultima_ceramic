-- Migration: create booking_overrides table if not exists and add accepted_no_refund column to bookings
BEGIN;

CREATE TABLE IF NOT EXISTS booking_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  overridden_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accepted_no_refund BOOLEAN DEFAULT FALSE;

COMMIT;
