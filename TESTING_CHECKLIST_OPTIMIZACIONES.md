# ✅ CHECKLIST DE TESTING - OPTIMIZACIONES DE NETWORK

## 🔍 Testing Manual

### Módulo de Marcación

- [ ] **Prueba 1: Marcar Entrada**
  - [ ] Abrir DevTools (Network Tab)
  - [ ] Digitar código (ej: "EMP100")
  - [ ] Clickear "Entrada"
  - [ ] **ESPERAR:** Ver solo 1 request a `/api/timecards?action=clock_in`
  - [ ] **NO DEBE:** Haber segundo request a `get_employee_report` después de 1 segundo
  - ✅ Verificación: Status 200, Latencia < 1s

- [ ] **Prueba 2: Marcar Salida**
  - [ ] DevTools abierto (Network Tab)
  - [ ] Clickear "Salida"
  - [ ] **ESPERAR:** Ver solo 1 request a `/api/timecards?action=clock_out`
  - [ ] **NO DEBE:** Esperar 1 segundo ni hacer segundo request
  - [ ] **VERIFICAR:** Las horas trabajadas se muestran en la respuesta
  - ✅ Verificación: Status 200, Latencia < 1s, hours_worked > 0

- [ ] **Prueba 3: Búsqueda de Código (Debounce)**
  - [ ] Abrir DevTools (Network Tab)
  - [ ] Limpiar Network Tab
  - [ ] Digitar rápidamente "E" "M" "P" "1" "0" "0" (7 caracteres)
  - [ ] **ESPERAR:** Ver requests apareciendo pero CON DELAY (800ms mínimo)
  - [ ] **CONTAR:** NO más de 3 requests para búsqueda
  - [ ] **VERIFICAR:** No hay request para "E" solo (validación local)
  - ✅ Verificación: Máx 3 requests para búsqueda completa

- [ ] **Prueba 4: Código Inválido (No Make Request)**
  - [ ] Limpiar Network Tab
  - [ ] Digitar solo "E"
  - [ ] **ESPERAR:** 1 segundo
  - [ ] **VERIFICAR:** NO hay request (validación local previene)
  - ✅ Verificación: 0 requests

### Dashboard Admin

- [ ] **Prueba 5: Polling Reducido**
  - [ ] Abrir AdminTimecardPanel
  - [ ] Abrir DevTools (Network Tab, filter: timecards)
  - [ ] **ESPERAR:** 5 minutos INACTIVOS (sin empleados en progreso)
  - [ ] **VERIFICAR:** NO hay nuevas requests cada 60 segundos
  - [ ] **CONTAR:** 0-1 request en 5 minutos (solo inicial)
  - ✅ Verificación: Polling desactivado cuando no hay actividad

- [ ] **Prueba 6: Polling con Actividad**
  - [ ] Abrir AdminTimecardPanel
  - [ ] En otra ventana, marcar entrada (empleado in_progress)
  - [ ] Volver al admin y esperar
  - [ ] **VERIFICAR:** Dashboard se actualiza cada 5 minutos (300s)
  - [ ] **NO DEBE:** Actualizar cada 60 segundos
  - [ ] **CONTAR:** 1 request después de 5 minutos
  - ✅ Verificación: Polling cada 300s (5 minutos)

### Funcionalidad General

- [ ] **Prueba 7: Datos Correctos Después de Optimizaciones**
  - [ ] Marcar entrada a las 10:00 AM
  - [ ] Marcar salida a las 10:05 AM
  - [ ] **VERIFICAR:** Horas mostradas = ~0.08h (5 minutos)
  - [ ] **NO:** Mostrar "-h" o valores negativos
  - [ ] **VERIFICAR:** En dashboard admin aparece "Presente" después de salida
  - ✅ Verificación: Todos los datos correctos

- [ ] **Prueba 8: Performance de Búsqueda**
  - [ ] Medir tiempo de respuesta búsqueda
  - [ ] **ANTES (si recuerdas):** ~1.5-2s
  - [ ] **DESPUÉS:** < 0.8s
  - [ ] Abrir múltiples búsquedas seguidas
  - [ ] **VERIFICAR:** Sistema responde rápido
  - ✅ Verificación: Latencia < 800ms

---

## 📊 Testing de Métricas

### Network Tab - Resumen

- [ ] **Total Requests**
  - [ ] Abrir app completa
  - [ ] Ejecutar 5 ciclos de: search + clock_in + clock_out
  - [ ] **CONTAR:** Total de requests
  - [ ] **ESPERADO:** < 50 requests (antes sería > 100)

- [ ] **Bandwidth**
  - [ ] Buscar "transferred" en Network Tab
  - [ ] **ESPERADO:** < 500 KB total (antes > 2 MB)

- [ ] **Performance Metrics**
  ```javascript
  // Copiar en console
  const apiReqs = performance.getEntriesByType('resource')
    .filter(r => r.name.includes('api/timecards'));
  console.log(`Total API requests: ${apiReqs.length}`);
  console.log(`Total transferred: ${(apiReqs.reduce((s, r) => s + r.transferSize, 0) / 1024).toFixed(2)} KB`);
  ```

---

## 🚨 Casos de Borde

- [ ] **Caso 1: Búsqueda Rápida Multiple**
  - [ ] Buscar "EMP100", cancelar, buscar "EMP200", cancelar
  - [ ] **VERIFICAR:** No hay múltiples requests simultáneos
  - ✅ Estado: PASS/FAIL

- [ ] **Caso 2: Marcar Múltiples Veces**
  - [ ] Marcar entrada
  - [ ] Esperar 2 segundos
  - [ ] Marcar salida
  - [ ] Inmediatamente buscar el mismo código
  - [ ] **VERIFICAR:** No hay race conditions o datos inconsistentes
  - ✅ Estado: PASS/FAIL

- [ ] **Caso 3: Dashboard Abierto Durante Actividad**
  - [ ] Abrir dashboard
  - [ ] Marcar entrada de empleado
  - [ ] Esperar 30 segundos
  - [ ] **VERIFICAR:** Dashboard NO se actualiza cada 60s, espera hasta 300s
  - [ ] Cuando empleado marca salida
  - [ ] **VERIFICAR:** Dashboard actualiza (porque hay empleados in_progress)
  - ✅ Estado: PASS/FAIL

---

## 🔄 Regresión Testing

Verificar que NO se rompió nada:

- [ ] **Entrada/Salida**
  - [ ] ✅ Se guardan correctamente
  - [ ] ✅ Horas se calculan correctamente
  - [ ] ✅ Mensaje de éxito aparece

- [ ] **Dashboard Admin**
  - [ ] ✅ Se cargan los empleados
  - [ ] ✅ Estados se muestran (Presente, Ausente, In Progreso)
  - [ ] ✅ Horas se muestran correctamente

- [ ] **Búsqueda de Empleado**
  - [ ] ✅ Encuentra empleado válido
  - [ ] ✅ Muestra "No encontrado" para código inválido
  - [ ] ✅ Estado de hoy se muestra si existe

- [ ] **Historial**
  - [ ] ✅ Carga historial del empleado
  - [ ] ✅ Filtros funcionan
  - [ ] ✅ Descargas funcionan (CSV/PDF)

---

## 📈 Resultados Esperados

### Antes de Optimizaciones
```
Network Tab después de 10 minutos de uso normal:
- Total Requests: 50-70
- Bandwidth: 1.0-1.5 MB
- Requests cada 60 segundos: ~1-2 (polling)
```

### Después de Optimizaciones
```
Network Tab después de 10 minutos de uso normal:
- Total Requests: 15-25  ← 70% MENOS
- Bandwidth: 150-250 KB  ← 80% MENOS
- Requests cada 60 segundos: 0 (hasta 300s)  ← 100% MENOS
```

---

## ✅ Firma de Aprobación

- [ ] **Desarrollador:** Testeó y verifica funcionamiento
  - Nombre: _________________
  - Fecha: _________________
  - Resultado: ✅ PASS / ❌ FAIL

- [ ] **QA/Admin:** Verifica casos de borde
  - Nombre: _________________
  - Fecha: _________________
  - Resultado: ✅ PASS / ❌ FAIL

- [ ] **Usuario Final:** Verifica UX
  - Nombre: _________________
  - Fecha: _________________
  - Resultado: ✅ PASS / ❌ FAIL

---

## 🔗 Referencias

- [ANALISIS_NETWORK_PERFORMANCE.md](./ANALISIS_NETWORK_PERFORMANCE.md) - Análisis completo
- [OPTIMIZACIONES_NETWORK_IMPLEMENTADAS.md](./OPTIMIZACIONES_NETWORK_IMPLEMENTADAS.md) - Cambios técnicos
- [RESUMEN_OPTIMIZACIONES_NETWORK.md](./RESUMEN_OPTIMIZACIONES_NETWORK.md) - Resumen ejecutivo

---

*Documento creado: 6 Noviembre 2025*  
*Última actualización: 6 Noviembre 2025*
