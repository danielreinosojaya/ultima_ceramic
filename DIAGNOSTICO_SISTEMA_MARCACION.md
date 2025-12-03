# 🔍 DIAGNÓSTICO COMPLETO - Sistema de Marcación de Horarios

## Problemas Identificados

### 1. **Errores en Reportes - Horas Trabajadas Mostradas como "-h"**

**Causa Raíz:**
- En `AdminTimecardPanel.tsx` línea 402-427, la lógica de visualización de horas tiene un bug
- Cuando un empleado está "en progreso" (entrada sin salida), `hours_worked` es `null` en BD
- El backend NO calcula horas en progreso (por problemas de timezone)
- El frontend intenta mostrar horas pero la condición falla

**Código Problemático:**
```typescript
{emp.hours_worked && typeof emp.hours_worked === 'number'
  ? emp.hours_worked.toFixed(2)
  : emp.hours_worked ? Number(emp.hours_worked).toFixed(2) : '-'}h
```

**Problema:** Si `hours_worked` es `null`, muestra `-h` en lugar de calcular horas en progreso

---

### 2. **Difícil Visibilidad de Horas Efectivamente Trabajadas**

**Causas:**
- No hay cálculo de horas en progreso en el dashboard
- No hay indicador visual claro del tiempo transcurrido
- No hay desglose de horas por empleado en reportes mensuales
- Falta de gráficos o visualizaciones de productividad

**Impacto:**
- Administrador no puede ver cuántas horas lleva trabajando un empleado actualmente
- Reportes mensuales no muestran claramente el total de horas por empleado
- No hay forma de identificar empleados con bajo rendimiento

---

### 3. **Problemas de Timezone en Cálculos**

**Situación Actual:**
- Frontend envía `localTime` (componentes de fecha/hora locales)
- Backend guarda como timestamp ISO UTC (pero con valores locales)
- `formatLocalTimeFromUTC()` usa `getUTCHours()` asumiendo que los valores son locales
- Esto funciona para display, pero causa confusión en cálculos

**Riesgo:**
- Si el servidor está en UTC y el cliente en UTC-5, hay desajustes
- Cálculos de horas pueden ser incorrectos si se usan timestamps directamente

---

## Soluciones a Implementar

### ✅ Solución 1: Calcular Horas en Progreso en Frontend

**Archivo:** `utils/formatters.ts`

Mejorar `calculateHoursInProgress()` para:
- Usar hora local del navegador (no UTC)
- Mostrar formato legible (ej: "2.5h" o "2h 30m")
- Manejar casos edge (horas negativas, etc)

---

### ✅ Solución 2: Mejorar Visualización en AdminTimecardPanel

**Archivo:** `components/admin/AdminTimecardPanel.tsx`

Cambios:
- Mostrar horas en progreso con cálculo en tiempo real
- Agregar indicador visual (ej: "⏳ 2.5h (en progreso)")
- Mejorar tabla con columnas adicionales
- Agregar resumen de horas por empleado

---

### ✅ Solución 3: Crear Componente de Reportes Mejorado

**Archivo:** `components/admin/EnhancedReportViewer.tsx` (nuevo)

Características:
- Tabla con desglose de horas por empleado
- Gráficos de productividad
- Filtros por rango de fechas
- Exportación mejorada (CSV, PDF)
- Indicadores de empleados con bajo rendimiento

---

### ✅ Solución 4: Mejorar MonthlyReportViewer

**Archivo:** `components/admin/MonthlyReportViewer.tsx`

Cambios:
- Mostrar total de horas por empleado
- Mostrar promedio de horas diarias
- Indicar días trabajados vs ausentes
- Mostrar tardanzas por empleado

---

## Implementación Paso a Paso

1. ✅ Mejorar `calculateHoursInProgress()` en formatters.ts
2. ✅ Actualizar AdminTimecardPanel para usar el nuevo cálculo
3. ✅ Crear EnhancedReportViewer con visualizaciones
4. ✅ Mejorar MonthlyReportViewer
5. ✅ Agregar indicadores visuales de estado
6. ✅ Verificar que los reportes muestren datos correctos

---

## Resultados Esperados

- ✅ Dashboard muestra horas en progreso correctamente
- ✅ Reportes mensuales muestran total de horas por empleado
- ✅ Visualización clara de productividad
- ✅ Fácil identificación de empleados con bajo rendimiento
- ✅ Exportación de reportes funciona correctamente
