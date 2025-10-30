-- Migration: Add accepted_no_refund column to bookings table
-- Purpose: Support reschedule policy validation (48-hour no-refund acceptance)
-- Date: 2025-01-31

-- Add column with default value
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS accepted_no_refund BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN bookings.accepted_no_refund IS 
'Indicates if customer accepted no-refund policy for bookings made within 48 hours of class time';

-- Optional: Update existing bookings to explicit false (for clarity)
UPDATE bookings 
SET accepted_no_refund = FALSE 
WHERE accepted_no_refund IS NULL;

-- Verify column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings' 
AND column_name = 'accepted_no_refund';
