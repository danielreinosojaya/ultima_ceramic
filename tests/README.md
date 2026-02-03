# 🧪 Guía de Testing de Rendimiento - Delivery Photos

## ✅ Estado Actual

**Optimizaciones aplicadas:**
- ✅ Eliminado doble carga de fotos (useEffect + IntersectionObserver)
- ✅ Solo IntersectionObserver con guards triple
- ✅ Delay aumentado a 200ms
- ✅ -51 líneas de código removidas
- ✅ Errores TypeScript corregidos
- ✅ Endpoint getDeliveryPhotos simplificado

**Proyección:** -95% requests, -82% tiempo de carga, 0 duplicados

---

## 🚀 Ejecutar Tests (Manual)

### Opción 1: Test Completo Automático

```bash
# 1. Iniciar servidor en una terminal
npm run dev

# 2. En otra terminal, ejecutar test
npx ts-node tests/auto-performance-test.ts
```

### Opción 2: Test Manual en DevTools

```bash
# 1. Iniciar servidor
npm run dev

# 2. Abrir navegador
open http://localhost:3000

# 3. Login como admin y ir a Deliveries
# 4. Abrir DevTools (Cmd+Opt+I) → Network tab
# 5. Filtrar por "getDeliveryPhotos"
# 6. Scroll hacia abajo en la lista
# 7. Observar:
   - Cantidad de requests
   - Requests duplicados (mismo deliveryId múltiples veces)
   - Tiempo de respuesta
   - Datos transferidos
```

---

## 📊 Métricas Esperadas

### ✅ Óptimo (Post-Optimización)
- Total requests: **~15-20** (uno por delivery visible)
- Duplicados: **0**
- Tiempo promedio: **<500ms** por request
- Datos: **<3MB** total

### ❌ Problemático (Pre-Optimización)
- Total requests: **>300**
- Duplicados: **>150**
- Tiempo total: **>50s**
- Datos: **>14MB**

---

## 🔍 Qué Revisar

### En Network Tab (DevTools)
1. **Filtrar por:** `getDeliveryPhotos`
2. **Duplicados:** Buscar requests con mismo `deliveryId`
3. **Timing:** Ver columna "Time"
4. **Size:** Ver columna "Size"

### Señales de Problemas
- ❌ Mismo `deliveryId` aparece 2+ veces
- ❌ >100 requests para <50 deliveries
- ❌ Requests continúan después de scroll detenido
- ❌ Tiempo total >20s

### Señales de Éxito
- ✅ 1 request por delivery único
- ✅ Requests solo cuando scroll hace visible el elemento
- ✅ Cache funciona (browser cache visible en DevTools)
- ✅ <10s para cargar lista completa

---

## 🐛 Troubleshooting

### "Servidor no inicia"
```bash
# Verificar puerto 3000 libre
lsof -ti:3000 | xargs kill -9

# Reinstalar dependencias
rm -rf node_modules
npm install

# Intentar nuevamente
npm run dev
```

### "Test falla con JSON error"
El servidor aún no está listo. Espera 10-15s después de ver "Local: http://localhost:3000" antes de ejecutar tests.

### "No hay deliveries con fotos"
Necesitas datos de prueba en la base de datos. El test necesita al menos 1 delivery con `hasPhotos = true`.

---

## 📁 Archivos de Tests

### Tests Creados
- `tests/auto-performance-test.ts` - Test automático completo
- `tests/api-unit-tests.test.ts` - Tests unitarios de API
- `tests/performance-delivery-photos.test.ts` - Suite de performance
- `tests/quick-performance-test.ts` - Test rápido producción

### Tests Ejecutables
```bash
# Test automático (inicia servidor)
npx ts-node tests/auto-performance-test.ts

# Test unitarios (requiere servidor corriendo)
npx ts-node tests/api-unit-tests.test.ts

# Test de producción (requiere deployment activo)
npx ts-node tests/quick-performance-test.ts
```

---

## 🎯 Próximos Pasos

1. **Validar localmente:** Ejecutar test manual en DevTools
2. **Deploy a producción:** Push a main/gif
3. **Validar en producción:** Repetir test en DevTools en URL de producción
4. **Comparar métricas:** Antes vs Después
5. **Iterar si necesario:** Aplicar optimizaciones adicionales

---

## 📝 Notas

- Los tests automáticos requieren Node.js y ts-node
- El test de producción requiere que el deployment esté activo en Vercel
- Los test unitarios cubren 10 escenarios diferentes
- El test de performance simula 5 flujos de usuario reales

**Última actualización:** 3 Febrero 2026
