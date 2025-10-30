# Migración: Agregar columna ready_at a deliveries

**Fecha**: 29 de octubre, 2025  
**Propósito**: Agregar soporte para notificar al cliente cuando su pieza está lista para recoger

## 📋 Pasos para aplicar

### Opción 1: Desde Vercel Dashboard (Recomendado)

1. Ve a tu proyecto en Vercel
2. Ve a **Storage** → **Postgres** → **Data** → **Query**
3. Pega y ejecuta este SQL:

```sql
-- Add ready_at column to deliveries table
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP DEFAULT NULL;

-- Add index for queries filtering by ready status
CREATE INDEX IF NOT EXISTS idx_deliveries_ready_at ON deliveries(ready_at);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'deliveries' 
ORDER BY ordinal_position;
```

4. Verifica que la salida incluya la columna `ready_at`

### Opción 2: Con psql desde terminal

```bash
# Desde el directorio del proyecto
./scripts/apply-ready-at-migration.sh
```

**Requisitos**:
- Tener `psql` instalado
- Variable `POSTGRES_URL` configurada en `.env`

### Opción 3: SQL directo

```sql
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_ready_at ON deliveries(ready_at);
```

## ✅ Verificación

Después de aplicar la migración, verifica con:

```sql
-- Ver estructura de la tabla
\d deliveries

-- Contar registros
SELECT COUNT(*) FROM deliveries;

-- Ver si hay deliveries marcadas como listas
SELECT id, description, ready_at 
FROM deliveries 
WHERE ready_at IS NOT NULL;
```

## 🔄 Rollback (si es necesario)

```sql
-- Eliminar la columna
ALTER TABLE deliveries DROP COLUMN IF EXISTS ready_at;

-- Eliminar el índice
DROP INDEX IF EXISTS idx_deliveries_ready_at;
```

## 📝 Notas

- La columna `ready_at` es **nullable** por defecto
- Los registros existentes tendrán `ready_at = NULL`
- Solo se setea cuando el admin presiona "Marcar como Lista"
- Una vez seteada, no se puede volver a cambiar (previene emails duplicados)
- El plazo de expiración es 3 meses desde `ready_at`

## 🎯 Funcionalidad relacionada

- **Botón UI**: "✨ Marcar como Lista" en módulo de deliveries
- **Email**: `sendDeliveryReadyEmail()` notifica al cliente
- **Endpoint**: `POST /api/data?action=markDeliveryAsReady`
- **Validación**: Backend rechaza si ya tiene `ready_at` seteado
