-- Migration: Add created_by_client column to deliveries
-- Purpose: Track deliveries created by clients via QR form
-- Date: 2025-10-31

ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS created_by_client BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN deliveries.created_by_client IS 
'Boolean flag indicating if delivery was created by client via QR form (true) or by admin (false)';

-- Verify column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'deliveries' 
AND column_name = 'created_by_client';
