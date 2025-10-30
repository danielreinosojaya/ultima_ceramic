-- Migration: Add missing columns to deliveries table
-- Purpose: Sync database schema with TypeScript types
-- Date: 2025-01-31

-- Add delivered_at column (fecha real cuando se entregó la pieza)
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ NULL;

-- Add photos column (array de URLs de fotos de las piezas)
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS photos JSONB NULL;

-- Add comments for documentation
COMMENT ON COLUMN deliveries.delivered_at IS 
'Fecha y hora real cuando se entregó la pieza al cliente';

COMMENT ON COLUMN deliveries.photos IS 
'Array JSON de URLs de fotos de las piezas (antes y después del horneado, etc.)';

-- Create index for photos queries (useful for filtering deliveries with photos)
CREATE INDEX IF NOT EXISTS idx_deliveries_has_photos 
ON deliveries ((photos IS NOT NULL AND jsonb_array_length(photos) > 0));

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'deliveries' 
AND column_name IN ('delivered_at', 'photos')
ORDER BY column_name;
