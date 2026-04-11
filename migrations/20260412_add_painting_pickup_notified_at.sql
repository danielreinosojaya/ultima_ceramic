-- Migration: Add painting_pickup_notified_at to deliveries
-- Purpose: Track when admin notified client that their PAINTED piece is ready for pickup
--          (after final kiln firing post-painting session)
-- Date: 2026-04-12

ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS painting_pickup_notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for quick lookup of pending pickup notifications
CREATE INDEX IF NOT EXISTS idx_deliveries_painting_pickup_notified
    ON deliveries (painting_pickup_notified_at)
    WHERE painting_pickup_notified_at IS NOT NULL;

COMMENT ON COLUMN deliveries.painting_pickup_notified_at IS
    'Timestamp when admin sent "painted piece ready for pickup" notification to client (after final kiln firing).';
