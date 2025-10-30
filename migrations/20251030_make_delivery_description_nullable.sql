-- Migration: Make deliveries.description column nullable
-- Date: 2025-10-30
-- Purpose: Allow deliveries without description for abstract/unnamed pieces

-- Make description column nullable
ALTER TABLE deliveries ALTER COLUMN description DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN deliveries.description IS 'Optional description of pieces. Can be null for abstract/unnamed pieces. Will show generic text in UI if empty.';
