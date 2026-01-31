-- ============================================================
-- Script de corrección de datos: Técnicas corruptas en bookings
-- ============================================================
-- PROBLEMA: Muchas reservas tienen technique="potters_wheel" pero
--           product.name="Pintura de piezas" (inconsistencia)
--
-- SOLUCIÓN: Derivar la técnica correcta del nombre del producto
-- ============================================================

-- 1. Ver el estado actual de datos inconsistentes
SELECT 
    booking_code,
    user_info->>'name' as customer,
    technique as technique_db,
    product->>'name' as product_name,
    CASE 
        WHEN LOWER(product->>'name') LIKE '%pintura%' THEN 'painting'
        WHEN LOWER(product->>'name') LIKE '%torno%' THEN 'potters_wheel'
        WHEN LOWER(product->>'name') LIKE '%modelado%' THEN 'hand_modeling'
        ELSE technique
    END as technique_should_be
FROM bookings
WHERE status != 'expired'
  AND product->>'name' IS NOT NULL
  AND (
    -- Detectar inconsistencias
    (LOWER(product->>'name') LIKE '%pintura%' AND technique != 'painting')
    OR (LOWER(product->>'name') LIKE '%torno%' AND technique != 'potters_wheel')
    OR (LOWER(product->>'name') LIKE '%modelado%' AND technique NOT IN ('hand_modeling', 'molding'))
  )
ORDER BY created_at DESC;

-- 2. Contar cuántas reservas están afectadas
SELECT COUNT(*) as bookings_con_tecnica_incorrecta
FROM bookings
WHERE status != 'expired'
  AND product->>'name' IS NOT NULL
  AND (
    (LOWER(product->>'name') LIKE '%pintura%' AND technique != 'painting')
    OR (LOWER(product->>'name') LIKE '%torno%' AND technique != 'potters_wheel')
    OR (LOWER(product->>'name') LIKE '%modelado%' AND technique NOT IN ('hand_modeling', 'molding'))
  );

-- ============================================================
-- 3. CORRECCIÓN: Actualizar técnica basándose en product.name
-- ============================================================
-- ADVERTENCIA: Esto modifica datos existentes. Hacer backup antes.
-- ============================================================

-- 3a. Corregir reservas de PINTURA con technique incorrecto
UPDATE bookings
SET technique = 'painting'
WHERE status != 'expired'
  AND LOWER(product->>'name') LIKE '%pintura%'
  AND technique != 'painting';

-- 3b. Corregir reservas de TORNO con technique incorrecto
UPDATE bookings
SET technique = 'potters_wheel'
WHERE status != 'expired'
  AND LOWER(product->>'name') LIKE '%torno%'
  AND technique != 'potters_wheel';

-- 3c. Corregir reservas de MODELADO con technique incorrecto
UPDATE bookings
SET technique = 'hand_modeling'
WHERE status != 'expired'
  AND LOWER(product->>'name') LIKE '%modelado%'
  AND technique NOT IN ('hand_modeling', 'molding');

-- ============================================================
-- 4. VERIFICACIÓN POST-CORRECCIÓN
-- ============================================================

-- Debería retornar 0
SELECT COUNT(*) as inconsistencias_restantes
FROM bookings
WHERE status != 'expired'
  AND product->>'name' IS NOT NULL
  AND (
    (LOWER(product->>'name') LIKE '%pintura%' AND technique != 'painting')
    OR (LOWER(product->>'name') LIKE '%torno%' AND technique != 'potters_wheel')
    OR (LOWER(product->>'name') LIKE '%modelado%' AND technique NOT IN ('hand_modeling', 'molding'))
  );

-- Ver ejemplos de reservas corregidas
SELECT 
    booking_code,
    user_info->>'name' as customer,
    technique,
    product->>'name' as product_name,
    slots->0->>'date' as fecha,
    slots->0->>'time' as hora
FROM bookings
WHERE status != 'expired'
  AND product->>'name' IS NOT NULL
  AND (
    LOWER(product->>'name') LIKE '%pintura%'
    OR LOWER(product->>'name') LIKE '%torno%'
    OR LOWER(product->>'name') LIKE '%modelado%'
  )
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================
-- 5. PREVENCIÓN FUTURA
-- ============================================================
-- Agregar constraint para validar consistencia (opcional)
-- Nota: Esto puede fallar si hay productos sin technique válido

-- ALTER TABLE bookings
-- ADD CONSTRAINT check_technique_consistency 
-- CHECK (
--   technique IS NULL 
--   OR product IS NULL
--   OR (
--     (LOWER(product->>'name') LIKE '%pintura%' AND technique = 'painting')
--     OR (LOWER(product->>'name') LIKE '%torno%' AND technique = 'potters_wheel')  
--     OR (LOWER(product->>'name') LIKE '%modelado%' AND technique IN ('hand_modeling', 'molding'))
--     OR (LOWER(product->>'name') NOT LIKE '%pintura%' 
--         AND LOWER(product->>'name') NOT LIKE '%torno%' 
--         AND LOWER(product->>'name') NOT LIKE '%modelado%')
--   )
-- );
