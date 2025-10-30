#!/bin/bash
# Script para aplicar migración: add ready_at column to deliveries

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔄 Aplicando migración: add_ready_at_to_deliveries..."
echo ""

# Lee las credenciales de Vercel Postgres desde .env o variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Verifica que existan las variables necesarias
if [ -z "$POSTGRES_URL" ]; then
    echo -e "${RED}❌ Error: POSTGRES_URL no está configurada${NC}"
    echo "Por favor configura POSTGRES_URL en .env o como variable de entorno"
    exit 1
fi

# Ejecuta la migración
psql "$POSTGRES_URL" << 'EOF'
-- Add ready_at column to deliveries table
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP DEFAULT NULL;

-- Add index for queries filtering by ready status
CREATE INDEX IF NOT EXISTS idx_deliveries_ready_at ON deliveries(ready_at);

-- Verify the column was added
\d deliveries

-- Show count of deliveries
SELECT COUNT(*) as total_deliveries FROM deliveries;

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Migración aplicada exitosamente${NC}"
else
    echo ""
    echo -e "${RED}❌ Error al aplicar migración${NC}"
    exit 1
fi
