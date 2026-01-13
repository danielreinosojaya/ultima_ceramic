-- Script para poblar el campo 'technique' en bookings existentes
-- Este script extrae la técnica del campo 'product' (JSON) y la guarda en la columna 'technique'

-- Primero, ver cuántos bookings tienen technique NULL
SELECT COUNT(*) as bookings_without_technique
FROM bookings
WHERE technique IS NULL OR technique = '';

-- Actualizar bookings cuyo product contiene details.technique
-- Nota: Si product es TEXT (no JSONB), hay que hacer cast a JSONB primero
UPDATE bookings
SET technique = (product::jsonb -> 'details' ->> 'technique')
WHERE (technique IS NULL OR technique = '')
  AND product IS NOT NULL
  AND (product::jsonb -> 'details' ->> 'technique') IS NOT NULL
  AND (product::jsonb -> 'details' ->> 'technique') != '';

-- Verificar resultados
SELECT 
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN technique IS NOT NULL AND technique != '' THEN 1 END) as bookings_with_technique,
  COUNT(CASE WHEN technique IS NULL OR technique = '' THEN 1 END) as bookings_without_technique
FROM bookings;

-- Ver ejemplos de bookings que no tienen técnica después de la migración
SELECT id, booking_code, product_type, technique, (product::jsonb ->> 'name') as product_name
FROM bookings
WHERE technique IS NULL OR technique = ''
LIMIT 10;
