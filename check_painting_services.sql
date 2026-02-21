-- ===== DIAGNÓSTICO: Servicios de Pintura =====
-- Objetivo: Verificar por qué UI muestra 2 en lugar de 41
-- Fecha: Feb 20, 2026

-- 1. Cuántos deliveries tienen wants_painting = true
SELECT 'Deliveries con wants_painting=true' as check_type, COUNT(*) as count FROM deliveries WHERE wants_painting = true;

-- 2. Cuántos deliveries tienen wants_painting = false
SELECT 'Deliveries con wants_painting=false' as check_type, COUNT(*) as count FROM deliveries WHERE wants_painting = false;

-- 3. Cuántos deliveries tienen wants_painting = NULL
SELECT 'Deliveries con wants_painting=NULL' as check_type, COUNT(*) as count FROM deliveries WHERE wants_painting IS NULL;

-- 4. Distribución de valores en wants_painting
SELECT 'wants_painting', wants_painting, COUNT(*) as count FROM deliveries GROUP BY wants_painting ORDER BY count DESC;

-- 5. Total de deliveries
SELECT 'Total deliveries' as check_type, COUNT(*) as count FROM deliveries;

-- 6. Bookings con technique = 'painting'
SELECT 'Bookings con technique=painting' as check_type, COUNT(*) as count FROM bookings WHERE LOWER(technique) = 'painting';

-- 7. Total de bookings
SELECT 'Total bookings' as check_type, COUNT(*) as count FROM bookings;

-- 8. Deliveries con servicio de pintura (análisis de painting_status)
SELECT 'Deliveries con painting_status NO NULL' as check_type, COUNT(*) as count FROM deliveries WHERE painting_status IS NOT NULL;

-- 9. Ver ejemplos de deliveries que tienen painting_status pero wants_painting != true
SELECT id, wants_painting, painting_status, painting_price FROM deliveries 
WHERE painting_status IS NOT NULL AND wants_painting IS NOT true 
LIMIT 10;

-- 10. Histograma de painting_status
SELECT painting_status, COUNT(*) as count FROM deliveries WHERE painting_status IS NOT NULL GROUP BY painting_status;
