# 🚀 GUÍA: EJECUTAR ÍNDICES SQL EN NEON

**Fecha**: 2 de Febrero 2026  
**Impacto**: $20-30/mes de ahorro inmediato  
**Tiempo**: 5 minutos  
**Riesgo**: BAJO

---

## 📋 Pre-requisitos

- Acceso al dashboard de Vercel
- Base de datos Neon activa (Vercel Postgres)
- Script [`CREATE_INDICES_OPTIMIZATION.sql`](./CREATE_INDICES_OPTIMIZATION.sql)

---

## 🎯 Pasos para Ejecutar

### 1. Abrir Dashboard de Vercel

1. Ir a https://vercel.com/dashboard
2. Seleccionar proyecto `ultima_ceramic`
3. Click en **Storage** (menú lateral)

### 2. Acceder a Neon SQL Editor

1. Click en tu base de datos Neon (Vercel Postgres)
2. Click en **"SQL Editor"** o **"Query"**
3. Se abrirá una consola SQL

### 3. Copiar el Script

Abrir [`database/CREATE_INDICES_OPTIMIZATION.sql`](./CREATE_INDICES_OPTIMIZATION.sql) y copiar **SOLO las líneas de `CREATE INDEX`**:

```sql
-- 1. Bookings: Status + Created At
CREATE INDEX IF NOT EXISTS idx_bookings_status_created 
  ON bookings(status, created_at DESC);

-- 2. Bookings: Created At
CREATE INDEX IF NOT EXISTS idx_bookings_created 
  ON bookings(created_at DESC);

-- 3. Deliveries: Status + Scheduled Date
CREATE INDEX IF NOT EXISTS idx_deliveries_status_scheduled 
  ON deliveries(status, scheduled_date);

-- 4. Giftcard Requests: Status
CREATE INDEX IF NOT EXISTS idx_giftcard_requests_status 
  ON giftcard_requests(status);

-- 5. Customers: Email
CREATE INDEX IF NOT EXISTS idx_customers_email 
  ON customers(email);
```

### 4. Pegar y Ejecutar

1. Pegar el código en el SQL Editor
2. Click en **"Run"** o **"Execute"**
3. Esperar ~10-30 segundos

### 5. Verificar Creación

Ejecutar query de verificación:

```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM 
    pg_indexes
WHERE 
    tablename IN ('bookings', 'deliveries', 'giftcard_requests', 'customers')
    AND indexname LIKE 'idx_%'
ORDER BY 
    tablename, indexname;
```

**Resultado esperado**: Debe mostrar los 5 índices creados.

---

## ✅ Validación Post-Ejecución

### Qué Verificar

1. **No errores** en el SQL Editor
2. **5 índices** en la query de verificación
3. **No cambios** en la funcionalidad de la app

### Monitoreo (próximas 48h)

1. Ir a Vercel → Analytics → Functions
2. Verificar:
   - ✅ Duration promedio baja 20-40%
   - ✅ No incremento en errores
   - ✅ Admin panel funciona normal

---

## 📊 Impacto Esperado

### Query Performance

| Endpoint | Antes | Después | Mejora |
|----------|-------|---------|--------|
| `getBookings()` | 800-1200ms | 80-150ms | **10x** |
| `getCustomers()` | 1500-2000ms | 200-400ms | **5x** |
| `listGiftcardRequests()` | 400-600ms | 50-100ms | **8x** |

### Costos

```
Ahorro mensual: $15-20
Ahorro anual:   $180-240
```

---

## 🆘 Troubleshooting

### Error: "relation does not exist"

**Causa**: Tabla no existe en la base de datos.

**Solución**: Omitir ese índice específico. Ejemplo:
```sql
-- Si da error deliveries, comentar:
-- CREATE INDEX IF NOT EXISTS idx_deliveries_status_scheduled...
```

### Error: "permission denied"

**Causa**: Usuario no tiene permisos CREATE INDEX.

**Solución**: Contactar soporte de Vercel para verificar permisos.

### Índice ya existe

**No es error**. `IF NOT EXISTS` previene duplicados. Continuar normal.

---

## 📝 Notas Importantes

1. **No afecta datos**: Solo crea estructuras auxiliares
2. **Reversible**: Se pueden eliminar con `DROP INDEX`
3. **Sin downtime**: Creación es non-blocking
4. **Espacio**: ~1-5MB adicionales en DB

---

## 🔄 Para Eliminar Índices (Si Necesario)

```sql
DROP INDEX IF EXISTS idx_bookings_status_created;
DROP INDEX IF EXISTS idx_bookings_created;
DROP INDEX IF EXISTS idx_deliveries_status_scheduled;
DROP INDEX IF EXISTS idx_giftcard_requests_status;
DROP INDEX IF EXISTS idx_customers_email;
```

**⚠️ Solo hacer si hay problemas**

---

## 📞 Soporte

Si encuentras algún problema:
1. Tomar screenshot del error
2. Documentar qué índice falló
3. Reportar en el canal de desarrollo

---

**Status**: ⏳ PENDIENTE DE EJECUCIÓN  
**Próximo paso**: Ejecutar en Neon dashboard
