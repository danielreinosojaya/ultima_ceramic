-- ============================================================
-- Script de corrección de datos: Técnicas corruptas en bookings
-- PROBLEMA: 91/279 bookings (32.6%) tienen técnica inconsistente
--           con product.name
-- SOLUCIÓN: Derivar la técnica correcta del nombre del producto
-- ============================================================

-- 0. Respaldo de bookings antes de modificar
CREATE TABLE IF NOT EXISTS bookings_backup_20260131 AS 
SELECT * FROM bookings WHERE status != 'expired';
-- Rows respaldo: Verificar count antes de ejecutar
-- SELECT COUNT(*) as respaldo_count FROM bookings_backup_20260131;

-- ============================================================
-- 1. DIAGNÓSTICO: Ver estado actual de datos
-- ============================================================

-- 1a. Contar bookings afectados
SELECT 
    COUNT(*) as total_bookings,
    COUNT(CASE 
        WHEN LOWER(product->>'name') LIKE '%pintura%' AND technique != 'painting' THEN 1
        WHEN LOWER(product->>'name') LIKE '%torno%' AND technique != 'potters_wheel' THEN 1
        WHEN LOWER(product->>'name') LIKE '%modelado%' AND technique NOT IN ('hand_modeling', 'molding') THEN 1
    END) as bookings_con_inconsistencia,
    ROUND(
        100.0 * COUNT(CASE 
            WHEN LOWER(product->>'name') LIKE '%pintura%' AND technique != 'painting' THEN 1
            WHEN LOWER(product->>'name') LIKE '%torno%' AND technique != 'potters_wheel' THEN 1
            WHEN LOWER(product->>'name') LIKE '%modelado%' AND technique NOT IN ('hand_modeling', 'molding') THEN 1
        END) / NULLIF(COUNT(*), 0)
    , 1) as porcentaje_afectado
FROM bookings
WHERE status != 'expired';

-- 1b. Ver ejemplos de bookings con inconsistencia
SELECT 
    booking_code,
    user_info->>'name' as customer,
    technique as technique_actual,
    product->>'name' as product_name,
    created_at::date as fecha_reserva,
    slots->0->>'date' as fecha_clase,
    CASE 
        WHEN LOWER(product->>'name') LIKE '%pintura%' THEN 'debería ser: painting'
        WHEN LOWER(product->>'name') LIKE '%torno%' THEN 'debería ser: potters_wheel'
        WHEN LOWER(product->>'name') LIKE '%modelado%' THEN 'debería ser: hand_modeling'
        ELSE 'revisar manualmente'
    END as correccion_requerida
FROM bookings
WHERE status != 'expired'
  AND product->>'name' IS NOT NULL
  AND (
    (LOWER(product->>'name') LIKE '%pintura%' AND technique != 'painting')
    OR (LOWER(product->>'name') LIKE '%torno%' AND technique != 'potters_wheel')
    OR (LOWER(product->>'name') LIKE '%modelado%' AND technique NOT IN ('hand_modeling', 'molding'))
  )
ORDER BY created_at DESC
LIMIT 20;

-- 1c. Distribución por tipo de inconsistencia
SELECT 
    'Pintura con técnica incorrecta' as tipo_inconsistencia,
    COUNT(*) as cantidad,
    array_agg(DISTINCT technique) as tecnicas_incorrectas
FROM bookings
WHERE status != 'expired'
  AND LOWER(product->>'name') LIKE '%pintura%'
  AND technique != 'painting'
UNION ALL
SELECT 
    'Torno con técnica incorrecta' as tipo_inconsistencia,
    COUNT(*) as cantidad,
    array_agg(DISTINCT technique) as tecnicas_incorrectas
FROM bookings
WHERE status != 'expired'
  AND LOWER(product->>'name') LIKE '%torno%'
  AND technique != 'potters_wheel'
UNION ALL
SELECT 
    'Modelado con técnica incorrecta' as tipo_inconsistencia,
    COUNT(*) as cantidad,
    array_agg(DISTINCT technique) as tecnicas_incorrectas
FROM bookings
WHERE status != 'expired'
  AND LOWER(product->>'name') LIKE '%modelado%'
  AND technique NOT IN ('hand_modeling', 'molding');

-- ============================================================
-- 2. CORRECCIÓN: Actualizar técnicas basándose en product.name
-- ============================================================

-- 2a. Corregir reservas de PINTURA con técnica incorrecta
UPDATE bookings
SET technique = 'painting',
    updated_at = NOW(),
    updated_note = 'AUTO_FIX: Técnica corregida desde ' || technique || ' a painting basándose en product.name'
WHERE status != 'expired'
  AND LOWER(product->>'name') LIKE '%pintura%'
  AND technique != 'painting';

-- 2b. Corregir reservas de TORNO con técnica incorrecta
UPDATE bookings
SET technique = 'potters_wheel',
    updated_at = NOW(),
    updated_note = 'AUTO_FIX: Técnica corregida desde ' || technique || ' a potters_wheel basándose en product.name'
WHERE status != 'expired'
  AND LOWER(product->>'name') LIKE '%torno%'
  AND technique != 'potters_wheel';

-- 2c. Corregir reservas de MODELADO con técnica incorrecta
UPDATE bookings
SET technique = 'hand_modeling',
    updated_at = NOW(),
    updated_note = 'AUTO_FIX: Técnica corregida desde ' || technique || ' a hand_modeling basándose en product.name'
WHERE status != 'expired'
  AND LOWER(product->>'name') LIKE '%modelado%'
  AND technique NOT IN ('hand_modeling', 'molding');

-- ============================================================
-- 3. VERIFICACIÓN POST-CORRECCIÓN
-- ============================================================

-- 3a. Contar inconsistencias restantes (debería ser 0)
SELECT COUNT(*) as inconsistencias_restantes
FROM bookings
WHERE status != 'expired'
  AND product->>'name' IS NOT NULL
  AND (
    (LOWER(product->>'name') LIKE '%pintura%' AND technique != 'painting')
    OR (LOWER(product->>'name') LIKE '%torno%' AND technique != 'potters_wheel')
    OR (LOWER(product->>'name') LIKE '%modelado%' AND technique NOT IN ('hand_modeling', 'molding'))
  );

-- 3b. Verificar distribución de técnicas por producto
SELECT 
    product->>'name' as producto,
    technique,
    COUNT(*) as cantidad
FROM bookings
WHERE status != 'expired'
  AND product->>'name' IS NOT NULL
  AND (
    LOWER(product->>'name') LIKE '%pintura%'
    OR LOWER(product->>'name') LIKE '%torno%'
    OR LOWER(product->>'name') LIKE '%modelado%'
  )
GROUP BY product->>'name', technique
ORDER BY product->>'name', technique;

-- 3c. Verificar bookings corregidos recientemente
SELECT 
    booking_code,
    user_info->>'name' as customer,
    technique,
    product->>'name' as producto,
    updated_at,
    updated_note
FROM bookings
WHERE updated_note IS NOT NULL
  AND updated_note LIKE 'AUTO_FIX:%'
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================
-- 4. REVERT: Script para revertir cambios si es necesario
-- ============================================================
-- UPDATE bookings b
-- SET technique = bk.technique,
--     updated_at = NOW(),
--     updated_note = 'REVERT: Restaurado desde backup'
-- FROM bookings_backup_20260131 bk
-- WHERE b.booking_code = bk.booking_code
--   AND bk.updated_note LIKE 'AUTO_FIX:%';

-- ============================================================
-- 5. PRÓXIMOS PASOS: Agregar constraints de prevención
-- ============================================================
-- Ejecutar database_technique_constraints.sql para:
-- - Crear tabla product_technique_mapping
-- - Crear trigger de validación
-- - Crear índices optimizados
-- - Crear función stored procedure para inserts seguros
