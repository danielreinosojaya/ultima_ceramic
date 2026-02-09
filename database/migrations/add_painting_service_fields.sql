-- =============================================
-- MIGRATION: Servicio de Pintura de Piezas (Upsell)
-- Fecha: 3 de Febrero 2026
-- Objetivo: Agregar campos para tracking de servicio de pintura
-- =============================================

-- IMPORTANTE: Ejecutar en Vercel Postgres (Neon) Dashboard

-- Agregar nuevos campos a la tabla deliveries
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS wants_painting BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS painting_price DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS painting_status VARCHAR(50) DEFAULT NULL 
    CHECK (painting_status IN ('pending_payment', 'paid', 'scheduled', 'completed', NULL)),
ADD COLUMN IF NOT EXISTS painting_booking_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS painting_paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS painting_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Crear índices para queries de admin panel (performance)
CREATE INDEX IF NOT EXISTS idx_deliveries_wants_painting 
  ON deliveries(wants_painting) WHERE wants_painting = TRUE;

CREATE INDEX IF NOT EXISTS idx_deliveries_painting_status 
  ON deliveries(painting_status) WHERE painting_status IS NOT NULL;

-- Índice compuesto para queries complejas de filtrado
CREATE INDEX IF NOT EXISTS idx_deliveries_painting_workflow 
  ON deliveries(wants_painting, painting_status, status) 
  WHERE wants_painting = TRUE;

-- Comentarios de documentación
COMMENT ON COLUMN deliveries.wants_painting IS 'Cliente manifestó intención de pintar la pieza (upsell)';
COMMENT ON COLUMN deliveries.painting_price IS 'Precio acordado del servicio de pintura';
COMMENT ON COLUMN deliveries.painting_status IS 'Estado del servicio de pintura: pending_payment, paid, scheduled, completed';
COMMENT ON COLUMN deliveries.painting_booking_date IS 'Fecha agendada para pintura de pieza';
COMMENT ON COLUMN deliveries.painting_paid_at IS 'Timestamp cuando pagó el servicio de pintura';
COMMENT ON COLUMN deliveries.painting_completed_at IS 'Timestamp cuando completó la sesión de pintura';

-- =============================================
-- VERIFICACIÓN
-- =============================================

-- Ejecutar después de aplicar migración para confirmar:
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'deliveries' 
    AND column_name LIKE 'painting%' OR column_name = 'wants_painting'
ORDER BY 
    ordinal_position;

-- Verificar índices creados:
SELECT 
    indexname, 
    indexdef
FROM 
    pg_indexes
WHERE 
    tablename = 'deliveries' 
    AND indexname LIKE '%painting%'
ORDER BY 
    indexname;

-- =============================================
-- ROLLBACK (si se necesita revertir)
-- =============================================

-- DROP INDEX IF EXISTS idx_deliveries_painting_workflow;
-- DROP INDEX IF EXISTS idx_deliveries_painting_status;
-- DROP INDEX IF EXISTS idx_deliveries_wants_painting;
-- ALTER TABLE deliveries DROP COLUMN IF EXISTS painting_completed_at;
-- ALTER TABLE deliveries DROP COLUMN IF EXISTS painting_paid_at;
-- ALTER TABLE deliveries DROP COLUMN IF EXISTS painting_booking_date;
-- ALTER TABLE deliveries DROP COLUMN IF EXISTS painting_status;
-- ALTER TABLE deliveries DROP COLUMN IF EXISTS painting_price;
-- ALTER TABLE deliveries DROP COLUMN IF EXISTS wants_painting;
