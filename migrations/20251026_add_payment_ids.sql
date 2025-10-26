-- Migration: Add unique IDs to payment_details in bookings table
-- Date: 2025-10-26
-- Purpose: Add 'id' field to each payment object in payment_details JSONB array
--          This enables safer payment operations using IDs instead of array indices

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update existing bookings to add 'id' field to each payment in payment_details array
-- This handles both cases: payments with and without existing IDs
UPDATE bookings
SET payment_details = (
    SELECT jsonb_agg(
        CASE 
            WHEN payment->>'id' IS NULL OR payment->>'id' = ''
            THEN payment || jsonb_build_object('id', uuid_generate_v4()::text)
            ELSE payment
        END
        ORDER BY ordinality
    )
    FROM jsonb_array_elements(COALESCE(payment_details, '[]'::jsonb)) WITH ORDINALITY AS t(payment, ordinality)
)
WHERE payment_details IS NOT NULL 
  AND jsonb_array_length(payment_details) > 0;

-- Verify the migration
-- Count bookings with payments that now have IDs
SELECT 
    COUNT(*) as total_bookings_with_payments,
    SUM(jsonb_array_length(payment_details)) as total_payments
FROM bookings
WHERE payment_details IS NOT NULL 
  AND jsonb_array_length(payment_details) > 0;

-- Sample verification: Show first 5 bookings with their payment IDs
SELECT 
    id as booking_id,
    booking_code,
    jsonb_pretty(payment_details) as payments_with_ids
FROM bookings
WHERE payment_details IS NOT NULL 
  AND jsonb_array_length(payment_details) > 0
LIMIT 5;

-- Rollback script (if needed):
-- This removes the 'id' field from all payment objects
/*
UPDATE bookings
SET payment_details = (
    SELECT jsonb_agg(payment - 'id' ORDER BY ordinality)
    FROM jsonb_array_elements(COALESCE(payment_details, '[]'::jsonb)) WITH ORDINALITY AS t(payment, ordinality)
)
WHERE payment_details IS NOT NULL 
  AND jsonb_array_length(payment_details) > 0;
*/
