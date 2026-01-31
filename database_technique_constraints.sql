-- ============================================================
-- DATABASE CONSTRAINTS: Técnica vs Producto para Prevención
-- ============================================================
-- Este script agrega constraints a nivel de DB para prevenir
-- inconsistencias entre technique y product.name en bookings
-- ============================================================

-- 1. Crear tabla de mapeo productos -> técnicas válidas
-- Esta tabla define qué técnicas son válidas para cada producto
-- ============================================================
CREATE TABLE IF NOT EXISTS product_technique_mapping (
    id SERIAL PRIMARY KEY,
    product_name_pattern VARCHAR(100) NOT NULL UNIQUE,
    technique VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- Insertar mapeos válidos (ordenado por especificidad)
INSERT INTO product_technique_mapping (product_name_pattern, technique, description) VALUES
('pintura de piezas', 'painting', 'Clases de pintura de piezas'),
('torno alfarero', 'potters_wheel', 'Clases de torno alfarero'),
('modelado a mano', 'hand_modeling', 'Clases de modelado a mano'),
('clase grupal', 'potters_wheel', 'Clase grupal (default)'),
('clase grupal (mixto)', 'potters_wheel', 'Clase grupal con técnicas mixtas'),
('experiencia parejas', 'potters_wheel', 'Experiencia para parejas'),
('experiencia personal', 'potters_wheel', 'Experiencia personal')
ON CONFLICT (product_name_pattern) DO UPDATE SET 
    technique = EXCLUDED.technique,
    description = EXCLUDED.description;

-- 2. Crear función para validar técnica vs producto
-- ============================================================
CREATE OR REPLACE FUNCTION validate_booking_technique()
RETURNS TRIGGER AS $$
DECLARE
    expected_technique VARCHAR(50);
    product_name TEXT;
BEGIN
    product_name := NEW.product->>'name';
    
    -- Buscar técnica esperada basada en product.name
    SELECT technique INTO expected_technique
    FROM product_technique_mapping
    WHERE LOWER(product_name) LIKE '%' || LOWER(product_name_pattern) || '%'
    AND is_active = TRUE
    ORDER BY LENGTH(product_name_pattern) DESC  -- Más específico primero
    LIMIT 1;
    
    -- Si no encuentra mapeo, permitir cualquier técnica (fallback)
    IF expected_technique IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Validar que la técnica coincida
    IF NEW.technique IS DISTINCT FROM expected_technique THEN
        RAISE EXCEPTION 'Técnica "%" incompatible con producto "%". Técnica esperada: %',
            NEW.technique, product_name, expected_technique;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger para ejecutar validación en INSERT/UPDATE
-- ============================================================
DROP TRIGGER IF EXISTS trg_validate_booking_technique ON bookings;
CREATE TRIGGER trg_validate_booking_technique
    BEFORE INSERT OR UPDATE OF technique, product ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION validate_booking_technique();

-- 4. Crear índice para mejorar performance de búsquedas por técnica
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_technique_status 
ON bookings(technique, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_bookings_product_technique 
ON bookings((product->>'name'), technique);

-- 5. Script de corrección para bookings existentes corruptos
-- Este script debe ejecutarse ANTES de crear el constraint
-- ============================================================

-- Ver bookings con inconsistencias
SELECT 
    booking_code,
    user_info->>'name' as customer,
    technique as technique_actual,
    product->>'name' as product_name,
    CASE 
        WHEN LOWER(product->>'name') LIKE '%pintura%' THEN 'painting'
        WHEN LOWER(product->>'name') LIKE '%torno%' THEN 'potters_wheel'
        WHEN LOWER(product->>'name') LIKE '%modelado%' THEN 'hand_modeling'
        ELSE technique
    END as technique_correcta
FROM bookings
WHERE status != 'expired'
  AND product->>'name' IS NOT NULL
  AND (
    (LOWER(product->>'name') LIKE '%pintura%' AND technique != 'painting')
    OR (LOWER(product->>'name') LIKE '%torno%' AND technique != 'potters_wheel')
    OR (LOWER(product->>'name') LIKE '%modelado%' AND technique NOT IN ('hand_modeling', 'molding'))
  )
ORDER BY created_at DESC;

-- Corregir bookings de PINTURA
UPDATE bookings
SET technique = 'painting'
WHERE status != 'expired'
  AND LOWER(product->>'name') LIKE '%pintura%'
  AND technique != 'painting';

-- Corregir bookings de TORNO
UPDATE bookings
SET technique = 'potters_wheel'
WHERE status != 'expired'
  AND LOWER(product->>'name') LIKE '%torno%'
  AND technique != 'potters_wheel';

-- Corregir bookings de MODELADO
UPDATE bookings
SET technique = 'hand_modeling'
WHERE status != 'expired'
  AND LOWER(product->>'name') LIKE '%modelado%'
  AND technique NOT IN ('hand_modeling', 'molding');

-- 6. Verificar que no queden inconsistencias
-- ============================================================
SELECT COUNT(*) as inconsistencias_restantes
FROM bookings
WHERE status != 'expired'
  AND product->>'name' IS NOT NULL
  AND (
    (LOWER(product->>'name') LIKE '%pintura%' AND technique != 'painting')
    OR (LOWER(product->>'name') LIKE '%torno%' AND technique != 'potters_wheel')
    OR (LOWER(product->>'name') LIKE '%modelado%' AND technique NOT IN ('hand_modeling', 'molding'))
  );

-- 7. Procedimiento almacenado para crear booking con validación
-- Usar este en lugar de INSERT directo cuando sea posible
-- ============================================================
CREATE OR REPLACE FUNCTION create_booking_safe(
    p_booking_code VARCHAR(20),
    p_product_id VARCHAR(50),
    p_product_type VARCHAR(50),
    p_slots JSONB,
    p_user_info JSONB,
    p_product JSONB,
    p_booking_date TIMESTAMP WITH TIME ZONE,
    p_price DECIMAL,
    p_technique VARCHAR(50)
) RETURNS JSONB AS $$
DECLARE
    v_expected_technique VARCHAR(50);
    v_product_name TEXT;
    v_result JSONB;
BEGIN
    v_product_name := p_product->>'name';
    
    -- Buscar técnica esperada
    SELECT technique INTO v_expected_technique
    FROM product_technique_mapping
    WHERE LOWER(v_product_name) LIKE '%' || LOWER(product_name_pattern) || '%'
    AND is_active = TRUE
    ORDER BY LENGTH(product_name_pattern) DESC
    LIMIT 1;
    
    -- Si hay discrepancia, usar la técnica correcta
    IF v_expected_technique IS NOT NULL AND p_technique != v_expected_technique THEN
        RAISE NOTICE 'Técnica corregida: % → %', p_technique, v_expected_technique;
        p_technique := v_expected_technique;
    END IF;
    
    -- Insertar booking
    INSERT INTO bookings (
        booking_code, product_id, product_type, slots, user_info, 
        product, booking_date, price, technique, status, created_at
    ) VALUES (
        p_booking_code, p_product_id, p_product_type, p_slots, p_user_info,
        p_product, p_booking_date, p_technique, p_technique, 'active', NOW()
    ) RETURNING to_jsonb(row) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VERIFICACIÓN: Probar que el constraint funciona
-- ============================================================
-- Este INSERT debería fallar:
-- INSERT INTO bookings (booking_code, product_id, product_type, slots, user_info, product, technique, status)
-- VALUES ('TEST001', 'test', 'GROUP_CLASS', '[{"date":"2026-02-01","time":"10:00"}]', 
--         '{"name":"Test","email":"test@test.com"}', 
--         '{"name":"Pintura de piezas"}', 
--         'potters_wheel',  -- Incorrecto: debería ser 'painting'
--         'active');
-- ============================================================

COMMENT ON TABLE product_technique_mapping IS 'Mapeo de nombres de producto a técnicas válidas para validación';
COMMENT ON FUNCTION validate_booking_technique() IS 'Valida que la técnica del booking sea compatible con el nombre del producto';
COMMENT ON TRIGGER trg_validate_booking_technique ON bookings IS 'Dispara validación de técnica en cada INSERT/UPDATE de bookings';
