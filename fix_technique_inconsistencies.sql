-- ============================================================================
-- SCRIPT SQL: Fix Technique Inconsistencies in Bookings
-- ============================================================================
-- Este script corrige bookings donde group_metadata.techniqueAssignments
-- no coincide con product.name
--
-- Ejecute en: Vercel Postgres console o cualquier cliente PostgreSQL
-- ============================================================================

-- ============================================================================
-- PARTE 1: IDENTIFICAR INCONSISTENCIAS
-- ============================================================================

-- 1.1: Ver todos los GROUP_CLASS bookings
SELECT 
    id,
    booking_code,
    product->>'name' as product_name,
    technique,
    group_metadata,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM bookings 
WHERE product_type = 'GROUP_CLASS'
AND group_metadata IS NOT NULL
AND status = 'active'
ORDER BY created_at DESC;

-- 1.2: Identificar bookings de "Pintura de piezas" con técnica incorrecta
SELECT 
    id,
    booking_code,
    product->>'name' as product_name,
    technique,
    group_metadata
FROM bookings 
WHERE product_type = 'GROUP_CLASS'
AND group_metadata IS NOT NULL
AND product->>'name' ILIKE '%pintura%'
AND (
    group_metadata::text LIKE '%potters_wheel%'
    OR technique = 'potters_wheel'
);

-- 1.3: Identificar bookings de "Torno Alfarero" con técnica incorrecta
SELECT 
    id,
    booking_code,
    product->>'name' as product_name,
    technique,
    group_metadata
FROM bookings 
WHERE product_type = 'GROUP_CLASS'
AND group_metadata IS NOT NULL
AND product->>'name' ILIKE '%torno%'
AND (
    group_metadata::text LIKE '%painting%'
    OR technique = 'painting'
);

-- ============================================================================
-- PARTE 2: CORRECCIÓN DE DATOS
-- ============================================================================

-- 2.1: Corregir bookings de "Pintura de piezas" con técnica incorrecta
-- Cambia 'potters_wheel' a 'painting' en group_metadata

UPDATE bookings
SET 
    group_metadata = jsonb_set(
        group_metadata::jsonb,
        '{techniqueAssignments}',
        (
            SELECT jsonb_agg(
                jsonb_set(ta, '{technique}', '"painting"')
            )
            FROM jsonb_array_elements(group_metadata::jsonb->'techniqueAssignments') AS ta
        )
    ),
    technique = 'painting',
    product = jsonb_set(product::jsonb, '{details,technique}', '"painting"')::jsonb
WHERE product_type = 'GROUP_CLASS'
AND group_metadata IS NOT NULL
AND product->>'name' ILIKE '%pintura%'
AND (
    group_metadata::text LIKE '%potters_wheel%'
    OR technique = 'potters_wheel'
);

-- 2.2: Corregir bookings de "Torno Alfarero" con técnica incorrecta
-- Cambia 'painting' a 'potters_wheel' en group_metadata

UPDATE bookings
SET 
    group_metadata = jsonb_set(
        group_metadata::jsonb,
        '{techniqueAssignments}',
        (
            SELECT jsonb_agg(
                jsonb_set(ta, '{technique}', '"potters_wheel"')
            )
            FROM jsonb_array_elements(group_metadata::jsonb->'techniqueAssignments') AS ta
        )
    ),
    technique = 'potters_wheel',
    product = jsonb_set(product::jsonb, '{details,technique}', '"potters_wheel"')::jsonb
WHERE product_type = 'GROUP_CLASS'
AND group_metadata IS NOT NULL
AND product->>'name' ILIKE '%torno%'
AND (
    group_metadata::text LIKE '%painting%'
    OR technique = 'painting'
);

-- 2.3: Corregir bookings de "Modelado a Mano" con técnica incorrecta
-- Cambia 'potters_wheel' a 'hand_modeling' en group_metadata

UPDATE bookings
SET 
    group_metadata = jsonb_set(
        group_metadata::jsonb,
        '{techniqueAssignments}',
        (
            SELECT jsonb_agg(
                jsonb_set(ta, '{technique}', '"hand_modeling"')
            )
            FROM jsonb_array_elements(group_metadata::jsonb->'techniqueAssignments') AS ta
        )
    ),
    technique = 'hand_modeling',
    product = jsonb_set(product::jsonb, '{details,technique}', '"hand_modeling"')::jsonb
WHERE product_type = 'GROUP_CLASS'
AND group_metadata IS NOT NULL
AND product->>'name' ILIKE '%modelado%'
AND (
    group_metadata::text LIKE '%potters_wheel%'
    OR technique = 'potters_wheel'
);

-- ============================================================================
-- PARTE 3: VERIFICACIÓN POST-CORRECCIÓN
-- ============================================================================

-- 3.1: Verificar que no quedan inconsistencias de "Pintura"
SELECT 
    id,
    booking_code,
    product->>'name' as product_name,
    technique
FROM bookings 
WHERE product_type = 'GROUP_CLASS'
AND group_metadata IS NOT NULL
AND product->>'name' ILIKE '%pintura%'
AND (
    group_metadata::text LIKE '%potters_wheel%'
    OR technique = 'potters_wheel'
);

-- 3.2: Verificar que no quedan inconsistencias de "Torno"
SELECT 
    id,
    booking_code,
    product->>'name' as product_name,
    technique
FROM bookings 
WHERE product_type = 'GROUP_CLASS'
AND group_metadata IS NOT NULL
AND product->>'name' ILIKE '%torno%'
AND (
    group_metadata::text LIKE '%painting%'
    OR technique = 'painting'
);

-- 3.3: Contar todos los GROUP_CLASS después de la corrección
SELECT 
    product->>'name' as product_name,
    technique,
    COUNT(*) as count
FROM bookings 
WHERE product_type = 'GROUP_CLASS'
AND status = 'active'
GROUP BY product->>'name', technique
ORDER BY product_name, technique;

-- ============================================================================
-- RESUMEN DE CORRECCIONES APLICADAS
-- ============================================================================
/*
Este script:

1. IDENTIFICA bookings con inconsistencias entre:
   - product.name (ej: "Pintura de piezas")
   - group_metadata.techniqueAssignments (ej: "potters_wheel")
   - technique (campo directo)

2. CORRIGE los siguientes casos:
   - "Pintura de piezas" con technique 'potters_wheel' → cambia a 'painting'
   - "Torno Alfarero" con technique 'painting' → cambia a 'potters_wheel'
   - "Modelado a Mano" con technique 'potters_wheel' → cambia a 'hand_modeling'

3. ACTUALIZA los siguientes campos:
   - group_metadata.techniqueAssignments[].technique
   - technique (campo directo)
   - product.details.technique

4. VERIFICA que no queden inconsistencias después de la corrección
*/
