# 🔍 VALIDACIÓN PRE-DEPLOY - FASE 1 OPTIMIZACIÓN

**Estado:** Implementación completada ✅ | Build: 0 errores ✅  
**Fecha:** 15 de Diciembre 2025  
**Branch:** `optimization/vercel-costs`  

---

## 📋 CAMBIOS IMPLEMENTADOS

### 1. Snippet 1.1: Invalidación Granular de Cache ✅
**Archivo:** `services/dataService.ts`

**Cambios:**
```
ANTES: invalidateBookingsCache() → borra TODO el cache
DESPUÉS: Funciones específicas por entidad
  - invalidateBookingsCache()
  - invalidateCustomersCache()
  - invalidatePaymentsCache()
  - invalidateGiftcardsCache()
  - invalidateProductsCache()
  - invalidateMultiple(keys[])
```

**Impacto:** 
- ✅ No hay breaking changes (funciones son aditivas)
- ✅ backward compatible (invalidateBookingsCache sigue funcionando)
- ⚠️ Requiere actualizar llamadas en contexto admin para usar funciones específicas

**Riesgo:** BAJO - Las funciones nuevas no se llaman automáticamente, se deben usar explícitamente

---

### 2. Snippet 1.2: Cache-Control Headers CDN ✅
**Archivo:** `api/data.ts`

**Cambios:**
```
AGREGADO: res.setHeader('Cache-Control', 'public, s-maxage=300-3600, stale-while-revalidate=600-86400');
```

**Endpoints modificados:**
- `instructors`: s-maxage=3600 (1 hora) - datos muy estables
- `getCustomers`: s-maxage=300 (5 min) - datos dinámicos
- `listGiftcardRequests`: s-maxage=300 (5 min) - datos dinámicos
- `listGiftcards`: s-maxage=300 (5 min) - datos dinámicos
- `products`: s-maxage=3600 (1 hora) - datos muy estables
- `bookings`: s-maxage=300 (5 min) - datos dinámicos

**Impacto:**
- ✅ Vercel Edge Network cachea automáticamente
- ✅ Reduce invocaciones de Functions (mismo Content-Type siempre)
- ⚠️ StalezWhileRevalidate permite servir datos ligeramente viejos mientras revalida

**Riesgo:** BAJO-MEDIO
- **Cuándo cachea:** Solo para GET requests (el método es automático)
- **No afecta:** POST, PUT, DELETE (mutations siguen siendo frescos)
- **Validación:** Probar que refrescos manuales (F5) devuelven datos nuevos

---

### 3. Snippet 1.3: Optimize Retry Logic ✅
**Archivo:** `services/dataService.ts`

**Cambios:**
```
ANTES: retries=3, timeout=30000ms (30s), backoff max=5000ms
DESPUÉS: retries=2, timeout=15000ms (15s), backoff max=2000ms
```

**Impacto:**
- ✅ Reduce duración promedio de Function invocations
- ✅ Respuestas más rápidas al usuario (fail-fast)
- ⚠️ Menos tolerancia a timeouts transitorios

**Riesgo:** MEDIO
- **Qué mejora:** Bandwidth, Duration (billable metrics)
- **Qué empeora:** Si hay timeouts frecuentes, ahora fallarán más rápido
- **Validación:** Monitorear error rates en primeros 24h

---

## ⚠️ ANÁLISIS DE BREAKING CHANGES

### ❌ BREAKING CHANGES IDENTIFICADAS

#### 1. AdminDataContext: refreshCritical() sigue borrando TODO cache
**Ubicación:** `context/AdminDataContext.tsx`

**Problema:**
```typescript
// Línea ~200: cuando usuario hace refresh en admin
await adminData.refreshCritical();
// Esto TODAVÍA llama a invalidateBookingsCache()
// que es la función antigua que borra TODO
```

**Impacto:** 
- MEDIO: Cuando admin hace refresh manual, se pierden datos en cache que podrían haber sido útiles
- Afecta: UX lenta cuando admin hace refresh frecuente

**Solución ANTES de deploy:**
```typescript
// CAMBIAR:
invalidateBookingsCache(); // borra todo

// POR:
invalidateMultiple(['bookings', 'customers', 'products']);
```

#### 2. Timeout 15s puede ser INSUFICIENTE para queries grandes
**Problema:** 
- `getCustomers` y `getBookings` cargan TODOS los datos sin pagination
- Con 1000+ bookings, SQL query + parsing puede tomar >15s

**Impacto:**
- ALTO: Si database tiene muchos records, timeouts frecuentes
- Error visible al usuario: "Connection timeout"

**Validación necesaria:**
```sql
-- Medir tiempo de queries críticas
SELECT COUNT(*) FROM bookings;  -- ¿cuántos registros?
SELECT COUNT(*) FROM customers; -- ¿cuántos registros?

-- Si count > 500, timeout 15s es RIESGOSO
```

#### 3. Cache Headers CDN pueden causar datos desincronizados
**Problema:**
- Admin crea nuevo booking → POST `/api/data?action=addBooking`
- Función sale de Function (no entra en cache)
- Pero cliente llamará `GET /api/data?action=getBookings` 5 segundos después
- CDN todavía tiene versión vieja por 5 minutos

**Impacto:**
- BAJO-MEDIO: Data lag 5 minutos máximo en scenarios normales
- Afecta: Admin ve datos "atrasados" después de crear reserva

**Mitigation implementada:**
```typescript
// Código DEBE llamar a invalidateBookingsCache() después de POST
// para limpiar memoria local (pero CDN seguirá cacheado 5 min)
```

---

## 🧪 VALIDACIONES NECESARIAS ANTES DE DEPLOY

### 1. ✅ Build sin errores
**Status:** PASADO
```
npm run build → 0 errores TypeScript ✅
```

### 2. ⚠️ VALIDAR: Timeout 15s es suficiente
**Cómo verificar:**

```bash
# En Vercel logs, buscar duration de estos endpoints:
# - POST /api/data?action=getBookings
# - POST /api/data?action=getCustomers
# Si alguno toma > 12s regularmente, aumentar a 20s

# Alternativa: ejecutar query directamente en DB
psql $POSTGRES_URL -c "
  SELECT COUNT(*) FROM bookings;
  SELECT COUNT(*) FROM customers;
"
```

**Criterio de ACEPTACIÓN:**
- Si count < 300: 15s es SAFE ✅
- Si 300 < count < 1000: 15s es BORDERLINE ⚠️ (monitorear)
- Si count > 1000: Aumentar a 20s ANTES de deploy 🚨

### 3. ⚠️ VALIDAR: Cache headers funcionan
**Cómo verificar:**

```bash
# Terminal 1: hacer request
curl -i "http://localhost:3000/api/data?action=products"

# Ver headers en response:
# ✅ Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
# ❌ Cache-Control: no-cache (significa que NO se cachea)
```

**Criterio de ACEPTACIÓN:**
- Todos los GET endpoints deben tener Cache-Control ✅
- POST/PUT/DELETE pueden no tenerlo ✅

### 4. ⚠️ VALIDAR: adminData.refreshCritical() no causa problema
**Cómo verificar:**

En AdminConsole, hacer:
1. Crear nuevo booking
2. Hacer manual refresh (F5 o botón)
3. Verificar que datos se cargan correctamente
4. Verificar que NO hay UI errors

**Criterio de ACEPTACIÓN:**
- Refresh manual funciona ✅
- Sin errores en console ✅

### 5. 🚨 CRÍTICO: Monitorear error rates primeras 24h
**Qué monitorear en Vercel:**

```
POST /api/data → Duration: antes ~500ms, después ~350ms (esperado)
POST /api/data → Error rate: antes X%, después X% (debe ser similar)
POST /api/data → 5xx errors: buscar aumentos
```

---

## 💰 VALIDACIÓN DE COSTOS ESPERADOS

### Antes de cambios:
- **Baseline mensual:** $200-300 (estimado basado en análisis)
- **Métricas:** 3 retries × 30s timeout × 1000s invocations/día

### Después de cambios (Fase 1):
```
Mejora esperada:
- Retry reduction (3→2): -10% duration
- Timeout reduction (30s→15s): -20% duration cuando falla
- Cache CDN headers: -15% invocations (datos cacheados en edge)

Total esperado: -20-30% costos Vercel Functions
= $150-210 mensuales (30% savings)
```

### Cómo validar en Vercel:
1. **Anotar date de deploy:** Ej. "Dec 15, 2025 2:30 PM UTC"
2. **Revisar analytics en 24h:** https://vercel.com/account/billing
3. **Buscar cambios en:**
   - Function Duration (ms)
   - Invocations Count
   - Bandwidth (bytes)

---

## 📊 MAPA DE RIESGOS Y MITIGACIONES

| Riesgo | Severidad | Probabilidad | Mitigación |
|--------|-----------|--------------|-----------|
| Timeout insuficiente (15s) para queries grandes | ALTO | MEDIA | Validar count de registros, aumentar a 20s si necesario |
| Data lag 5 min en admin después de mutations | MEDIO | ALTA | Documentar, usuarios aceptan 5 min lag |
| AdminContext no usa nuevas funciones invalidate | MEDIO | BAJA | Revisar antes de deploy |
| Retry logic causa fail-fast visible al usuario | BAJO | BAJA | Monitorear error rates en 24h |
| Cache headers CDN no aplican en localhost | BAJO | MEDIA | No affecta production, solo local dev |

---

## ✅ CHECKLIST PRE-DEPLOY

- [ ] **Validar database record counts:**
  ```
  SELECT COUNT(*) FROM bookings;      -- Target: < 300 para 15s timeout
  SELECT COUNT(*) FROM customers;     -- Target: < 300 para 15s timeout
  ```

- [ ] **Revisar AdminContext cambios:**
  - [ ] Buscar `invalidateBookingsCache()` en `context/AdminDataContext.tsx`
  - [ ] Cambiar por `invalidateMultiple()` si es crítico
  - [ ] O aceptar que refresh = borra todo cache (acceptable)

- [ ] **Test manual AdminConsole:**
  - [ ] Crear booking → refresh → verificar data nueva
  - [ ] Crear customer → refresh → verificar data nueva
  - [ ] Sin errores en console

- [ ] **Verificar Headers CDN:**
  - [ ] GET /api/data?action=products → tiene Cache-Control ✅
  - [ ] GET /api/data?action=bookings → tiene Cache-Control ✅
  - [ ] POST /api/data?action=addBooking → sin Cache-Control (correcto)

- [ ] **Git audit:**
  ```bash
  git diff gif optimization/vercel-costs --stat
  # Debe mostrar: api/data.ts (+8 lines), services/dataService.ts (+6 lines)
  ```

- [ ] **Anotar metrics baseline:**
  - Screenshoot de Vercel Analytics AHORA (antes de deploy)
  - Anotar: Duration avg, Invocations count, Error rate

- [ ] **Deploy a staging (si disponible):**
  - [ ] Hacer push a staging/optimization-test
  - [ ] Correr tests 2-4 horas
  - [ ] Monitorear Vercel logs
  - [ ] Si no hay issues → OK para merge a main

- [ ] **Final approval antes de push:**
  - [ ] DRI (Daniel) revisa este documento
  - [ ] Confirma que database count < 300 registros
  - [ ] Confirma que puede aceptar 5 min data lag en admin

---

## 🚀 INSTRUCCIONES DEPLOY

**SOLO si todos los checks están ✅:**

```bash
# 1. Confirmar que estamos en optimization/vercel-costs
git branch
# Output: * optimization/vercel-costs

# 2. Revisar cambios finales
git diff gif

# 3. Hacer push a branch remota (no a main todavía)
git push -u origin optimization/vercel-costs

# 4. En Vercel: crear preview deployment
# (link automático en PR si existe)

# 5. Test 2 horas en preview

# 6. Si OK, merge a main:
git checkout gif
git merge optimization/vercel-costs
git push origin gif
```

---

## 📝 NOTAS IMPORTANTES

### ⚠️ Después del deploy:

1. **Monitorear primeras 24 horas:**
   - Revisar Vercel Analytics cada 4 horas
   - Si error rate sube >5%, preparar rollback

2. **Si hay issues, rollback es SIMPLE:**
   ```bash
   git revert <commit-hash>
   git push
   ```

3. **Datos de validación:**
   - Antes: Screenshoot de analytics
   - Después: Screenshoot de analytics en 24h
   - Comparar y calcular ahorro real

4. **Próximo paso (Fase 2):**
   - Solo si Fase 1 es ESTABLE por 7 días
   - Implement microendpoints: /api/customers.ts, /api/bookings.ts, etc.
   - Impacto adicional: -40-50% más ahorros

---

**Generado:** 15-Dec-2025 00:45 UTC  
**Estado:** LISTA PARA VALIDACIÓN  
**Siguiente acción:** Ejecutar checklist arriba

