-- Add ready_at column to deliveries table
-- This tracks when a piece was marked as ready for pickup

ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP DEFAULT NULL;

-- Add index for queries filtering by ready status
CREATE INDEX IF NOT EXISTS idx_deliveries_ready_at ON deliveries(ready_at);

-- Comment for documentation
COMMENT ON COLUMN deliveries.ready_at IS 'Timestamp when the piece was marked as ready for pickup. Pieces are available for 3 months from this date.';
