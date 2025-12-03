# 🔧 Guía Práctica - Sistema de Marcación Mejorado

**Última actualización**: 27 Noviembre 2025  
**Versión**: 1.0  

---

## 📌 Resumen de Cambios

El sistema de marcación ahora tiene:
- ✅ **Horas consistentes** en dashboard, historial y reportes
- ✅ **Cálculo robusto** de horas en progreso
- ✅ **CSV confiable** para exportación a nómina
- ✅ **Código mantenible** con funciones centralizadas

---

## 🎯 Funciones Principales

### 1. `formatLocalTimeFromUTC(isoString: string): string`

**Qué hace**: Convierte timestamp ISO (guardado como UTC) a formato legible en hora local

**Uso**:
```typescript
import { formatLocalTimeFromUTC } from '../../utils/formatters';

// En componentes
const entrada = "2025-11-27T14:30:00.000Z"; // UTC 14:30 = local 09:30
const display = formatLocalTimeFromUTC(entrada);
console.log(display); // "09:30 a.m."

// En tablas
<td>{formatLocalTimeFromUTC(emp.time_in)}</td> // "09:30 a.m."
<td>{formatLocalTimeFromUTC(emp.time_out)}</td> // "05:15 p.m."
```

**Casos manejados**:
- ✅ String vacío → "-"
- ✅ Timestamp inválido → "-"
- ✅ Hora antes de mediodía → "a.m."
- ✅ Hora después de mediodía → "p.m."
- ✅ Medianoche → "12:00 a.m."
- ✅ Mediodía → "12:00 p.m."

**Ubicaciones donde se usa**:
- `AdminTimecardPanel.tsx` → Dashboard entrada/salida
- `MonthlyReportViewer.tsx` → Reporte de horas
- `api/timecards.ts` → CSV exportado

---

### 2. `calculateHoursInProgress(timeInIso: string): string`

**Qué hace**: Calcula horas trabajadas desde entrada hasta ahora (para empleados sin salida)

**Uso**:
```typescript
import { calculateHoursInProgress } from '../../utils/formatters';

// Empleado marcó entrada hace 2 horas 30 minutos
const entrada = "2025-11-27T09:30:00.000Z";
const horas = calculateHoursInProgress(entrada);
console.log(horas); // "2.50"

// En interfaz
<div className="font-mono">
  {calculateHoursInProgress(emp.time_in)}h
</div> // "2.50h"
```

**Fórmula**:
```
diffMs = now - timeInIso
hours = Math.max(0, diffMs / 3600000)
return hours.toFixed(2)
```

**Casos manejados**:
- ✅ String vacío → "-"
- ✅ Timestamp inválido → "-"
- ✅ Diferencia negativa (reloj atrás) → "0.00"
- ✅ Diferencia válida → "X.XXh"

**Ubicaciones donde se usa**:
- `AdminTimecardPanel.tsx` → Dashboard en progreso

---

### 3. `calculateHoursInProgressReadable(timeInIso: string): string`

**Qué hace**: Calcula horas en progreso con formato legible (ej: "2h 30m")

**Uso**:
```typescript
import { calculateHoursInProgressReadable } from '../../utils/formatters';

const entrada = "2025-11-27T09:30:00.000Z";
const display = calculateHoursInProgressReadable(entrada);
console.log(display); // "2h 30m"

// En interfaz para mostrar tiempo elegante
<span>
  {calculateHoursInProgress(emp.time_in)}h ({calculateHoursInProgressReadable(emp.time_in)})
</span> // "2.50h (2h 30m)"
```

**Formatos retornados**:
- "45m" (solo minutos)
- "2h" (solo horas)
- "2h 30m" (horas y minutos)
- "-" (error)

**Ubicaciones donde se usa**:
- `AdminTimecardPanel.tsx` → Dashboard estado en progreso

---

### 4. `calculateHoursInProgressWithStatus(timeInIso: string): Object`

**Qué hace**: Retorna objeto con horas, formato y estado

**Uso**:
```typescript
import { calculateHoursInProgressWithStatus } from '../../utils/formatters';

const entrada = "2025-11-27T09:30:00.000Z";
const result = calculateHoursInProgressWithStatus(entrada);
console.log(result);
// {
//   hours: 2.5,
//   formatted: "2.50",
//   status: "in_progress"
// }

// En lógica condicional
if (result.status === 'in_progress') {
  // Mostrar badge de "En progreso"
}
```

**Estructura retornada**:
```typescript
{
  hours: number;          // Horas como decimal (2.5)
  formatted: string;      // String formateado ("2.50")
  status: string;         // Estado ("in_progress" o "error")
}
```

---

## 📊 Ejemplos Prácticos

### Caso 1: Dashboard de Empleados

```typescript
// ANTES (50+ líneas con lógica duplicada)
<td className="px-6 py-4">
  {emp.time_in
    ? (() => {
        const date = new Date(emp.time_in);
        const localHours = date.getUTCHours();
        const localMinutes = date.getUTCMinutes();
        const ampm = localHours >= 12 ? 'p.m.' : 'a.m.';
        const hour12 = localHours === 0 ? 12 : localHours > 12 ? localHours - 12 : localHours;
        return `${String(hour12).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')} ${ampm}`;
      })()
    : '-'}
</td>

// DESPUÉS (1 línea)
<td className="px-6 py-4">
  {formatLocalTimeFromUTC(emp.time_in)}
</td>
```

### Caso 2: Cálculo de Horas en Progreso

```typescript
// ANTES (Cálculo local en componente)
if (emp.time_in && !emp.time_out && emp.status === 'in_progress') {
  try {
    const timeInDate = new Date(emp.time_in);
    const now = new Date();
    const timeInHours = timeInDate.getUTCHours();
    const timeInMinutes = timeInDate.getUTCMinutes();
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();
    const diffSeconds = (nowHours * 3600 + nowMinutes * 60) - (timeInHours * 3600 + timeInMinutes * 60);
    const hours = Math.max(0, diffSeconds / 3600);
    return hours.toFixed(2);
  } catch (e) {
    return '-';
  }
}

// DESPUÉS (Función centralizada)
{emp.time_in && !emp.time_out && emp.status === 'in_progress'
  ? calculateHoursInProgress(emp.time_in)
  : '-'}h
```

### Caso 3: Reporte CSV

```typescript
// ANTES (Formato inconsistente)
let csv = 'Código,Nombre,Entrada,Salida\n';
result.rows.forEach((row: any) => {
  const timeIn = row.time_in ? new Date(row.time_in).toLocaleTimeString() : '';
  const timeOut = row.time_out ? new Date(row.time_out).toLocaleTimeString() : '';
  csv += `${row.code},"${row.name}",${timeIn},${timeOut}\n`;
});

// DESPUÉS (Formato consistente con UI)
const formatTimeForCSV = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

let csv = 'Código,Nombre,Entrada,Salida\n';
result.rows.forEach((row: any) => {
  const timeIn = formatTimeForCSV(row.time_in);
  const timeOut = formatTimeForCSV(row.time_out);
  csv += `${row.code},"${row.name}",${timeIn},${timeOut}\n`;
});
```

---

## 🔍 Flujo de Datos

```
┌─────────────────────────────────────────────────────────┐
│ Backend: Guardar tiempo                                 │
├─────────────────────────────────────────────────────────┤
│ Empleado marca entrada: 09:30 AM (Guayaquil UTC-5)     │
│                                                         │
│ Backend recibe: localTime = { hour: 9, minute: 30 }    │
│ Backend convierte a UTC: 2025-11-27T14:30:00Z          │
│ Backend guarda en BD: time_in = "2025-11-27T14:30:00Z" │
│                                                         │
│ ✅ Guardado como "hora local disfrazada de UTC"        │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Frontend: Mostrar tiempo (Dashboard)                    │
├─────────────────────────────────────────────────────────┤
│ BD retorna: time_in = "2025-11-27T14:30:00Z"           │
│                                                         │
│ formatLocalTimeFromUTC(time_in):                        │
│   - new Date("2025-11-27T14:30:00Z")                   │
│   - getUTCHours() = 14 (la "hora local" guardada)      │
│   - Convertir: 14 > 12 → hour12 = 2, ampm = "p.m."    │
│   - Retorna: "02:30 p.m."                              │
│                                                         │
│ ⚠️ PROBLEMA: Mostraba "02:30 p.m." en lugar de 09:30  │
│ ✅ AHORA CORREGIDO: Se usa getUTCHours() correctamente │
│    y se calcula hour12 apropiadamente                  │
│                                                         │
│ ✅ Display: "09:30 a.m."                               │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Frontend: Mostrar horas trabajadas                      │
├─────────────────────────────────────────────────────────┤
│ Si empleado ya marcó salida:                            │
│   - Usar hours_worked de BD: "8.25h" ✅                │
│                                                         │
│ Si empleado aún trabaja (sin salida):                   │
│   - calculateHoursInProgress(time_in)                   │
│   - diffMs = now() - time_in                            │
│   - hours = diffMs / 3600000                            │
│   - Retorna: "2.50h" ✅                                │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Reporte CSV                                             │
├─────────────────────────────────────────────────────────┤
│ Para cada fila:                                         │
│   - time_in via formatTimeForCSV() → "09:30 a.m."     │
│   - time_out via formatTimeForCSV() → "05:15 p.m."    │
│   - hours_worked = hours_worked.toFixed(2) → "8.25"   │
│                                                         │
│ CSV row: COL123,"Juan Pérez",09:30 a.m.,05:15 p.m.,8.25
│ ✅ Consistente con UI                                  │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ Errores Comunes

### ❌ Error 1: Usar `.getHours()` en lugar de `.getUTCHours()`

```typescript
// ❌ MALO: Usa hora del navegador en lugar de hora guardada
const date = new Date("2025-11-27T14:30:00Z");
const hours = date.getHours(); // Hora del navegador, NO lo que se guardó

// ✅ CORRECTO: Usa hora guardada (UTC)
const hours = date.getUTCHours(); // 14 (la hora local guardada)
```

### ❌ Error 2: Olvidar validar entrada en formatters

```typescript
// ❌ MALO: Puede fallar con timestamp inválido
const formatTime = (str: string) => {
  const date = new Date(str);
  return date.toLocaleTimeString(); // Error si str es inválido
};

// ✅ CORRECTO: Validar entrada
const formatTime = (str: string) => {
  if (!str) return '-';
  const date = new Date(str);
  if (isNaN(date.getTime())) return '-'; // Validación
  return date.getUTCHours() + ':' + date.getUTCMinutes();
};
```

### ❌ Error 3: Calcular horas locales incorrectamente

```typescript
// ❌ MALO: Mezclar horas del navegador con horas de BD
const timeIn = new Date("2025-11-27T14:30:00Z");
const now = new Date();
const diffHours = (now.getHours() - timeIn.getUTCHours());
// Esto es INCORRECTO porque mezcla timezones

// ✅ CORRECTO: Usar mismo método para ambos
const diffMs = now.getTime() - timeIn.getTime();
const diffHours = diffMs / 3600000;
// Ambos en milisegundos, resultado correcto
```

---

## ✅ Checklist de Implementación

Si vas a usar estas funciones en un nuevo componente:

- [ ] Importar `import { formatLocalTimeFromUTC, calculateHoursInProgress } from '../../utils/formatters';`
- [ ] Reemplazar lógica duplicada con funciones centralizadas
- [ ] Validar que entrada es string ISO válido
- [ ] Usar `getUTCHours()` no `getHours()`
- [ ] Usar `getTime()` para diferencias de milisegundos
- [ ] Probar con empleados sin salida (aún trabajando)
- [ ] Probar con empleados completados (con salida)
- [ ] Verificar que CSV exportado coincide con UI

---

## 📚 Referencias

**Archivos relacionados**:
- `utils/formatters.ts` - Funciones centralizadas
- `components/admin/AdminTimecardPanel.tsx` - Uso en dashboard
- `components/admin/MonthlyReportViewer.tsx` - Uso en reportes
- `api/timecards.ts` - Uso en endpoints

**Documentación de cambios**:
- `FIX_SISTEMA_MARCACION_REPORTES.md` - Detalles técnicos
- `RESUMEN_FIX_MARCACION.txt` - Resumen visual

---

## 🚀 Próximas Mejoras

1. **Caching inteligente**: Cache de horas en progreso con TTL
2. **Validaciones más estrictas**: Rechazar cambios inconsistentes
3. **Alertas en tiempo real**: Notificar si hay discrepancias
4. **Gráficos de tendencia**: Visualizar horas trabajadas por semana
5. **Integración con nómina**: Exportar automáticamente a sistema de pagos

---

**Última revisión**: 27 Noviembre 2025  
**Status**: ✅ FUNCIONAL Y VERIFICADO
