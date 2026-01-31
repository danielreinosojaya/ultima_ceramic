-- Script to check for inconsistent technique assignments in bookings
-- This helps identify bookings where group_metadata.techniqueAssignments 
-- doesn't match the product.name

-- Find all GROUP_CLASS bookings with potentially inconsistent technique
SELECT 
    id,
    booking_code,
    product->>'name' as product_name,
    technique,
    group_metadata,
    created_at
FROM bookings 
WHERE product_type = 'GROUP_CLASS'
AND group_metadata IS NOT NULL
AND status = 'active'
ORDER BY created_at DESC
LIMIT 20;

-- Specifically check for "Pintura de piezas" products with "potters_wheel" technique
SELECT 
    id,
    booking_code,
    product->>'name' as product_name,
    technique,
    group_metadata,
    slots,
    created_at
FROM bookings 
WHERE product_type = 'GROUP_CLASS'
AND group_metadata IS NOT NULL
AND product->>'name' ILIKE '%pintura%'
AND (
    group_metadata::text LIKE '%potters_wheel%'
    OR technique = 'potters_wheel'
)
ORDER BY created_at DESC;

-- Check for "Torno Alfarero" products with "painting" technique
SELECT 
    id,
    booking_code,
    product->>'name' as product_name,
    technique,
    group_metadata,
    slots,
    created_at
FROM bookings 
WHERE product_type = 'GROUP_CLASS'
AND group_metadata IS NOT NULL
AND product->>'name' ILIKE '%torno%'
AND (
    group_metadata::text LIKE '%painting%'
    OR technique = 'painting'
)
ORDER BY created_at DESC;
