# Sistema de Marcación de Asistencia - Documentación

## 🔄 Cómo funciona el estado por día

### Hoy - Múltiples turnos permitidos
1. **Primera marca de entrada**: Crea un nuevo registro `timecard` con fecha de HOY
2. **Marca de salida**: Completa el registro del día, calcula horas trabajadas
3. **Segunda/Tercera/N entrada**: **SIEMPRE permite** marcar otra entrada (nuevo registro independiente)
4. **Resultado**: Múltiples registros en un mismo día - uno por cada turno

**No hay restricciones:**
- ✅ Puedes marcar entrada sin haber marcado salida anterior
- ✅ Cada marca de entrada crea un registro NUEVO
- ✅ Cada registro es independiente con su propia duración

### Mañana - Reinicio automático
- La función `getTodayTimecard()` **automáticamente** busca registros para la NUEVA fecha
- Bogotá usa UTC-5, por lo que:
  - HOY a las 23:00 → UTC: 04:00 del MAÑANA UTC
  - MAÑANA a las 00:01 → UTC: 05:01 del MAÑANA UTC
- El backend calcula la fecha correcta: `new Date(now.getTime() - (5 * 60 * 60 * 1000))`
- Por eso: El registro de mañana es un registro NUEVO, no del día anterior
- **Reinicio**: A las 00:00 en Bogotá, automáticamente cambia de fecha

**Ejemplo:**
```
HOY 6 de Noviembre
├─ Turno 1: 08:00 - 12:00 (4h) [registro 1]
├─ Turno 2: 14:00 - 18:00 (4h) [registro 2]
├─ Turno 3: 20:00 - 22:30 (2.5h) [registro 3]
└─ Total: 10.5h

MAÑANA 7 de Noviembre
├─ Turno 1: 08:00 - ... (en progreso) [registro 4 - nueva fecha]
└─ Total: ... (nuevo día, nuevos registros)
```

## 📝 Cómo se guardan las horas

1. **Backend**: Almacena ISO 8601 UTC puro en la BD
   - Ejemplo: `2025-11-06T13:12:30.000Z` (UTC)

2. **Frontend**: Convierte a timezone de Bogotá para MOSTRAR
   - `toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })`
   - Muestra: `08:12:30 a. m.` ✅

3. **Cálculo de duración**: Resta directa de timestamps ISO
   - No requiere conversión (ambos son UTC)
   - `(time_out - time_in) / 3600000 = horas`

## ⚠️ Validaciones actuales

### Permitir remarcar entrada?
- ✅ **SIEMPRE SÍ**: No hay restricciones
- ✅ **Sin confirmación**: Marca entrada directamente
- ✅ **Múltiples turnos**: Sin límite de entradas por día

### Comportamiento
- Cada marca de entrada = nuevo registro en timecards
- No importa si hay entradas previas sin salida
- Cada registro es independiente
- Frontend muestra el registro más reciente

## 🔧 Cambios recientes (6 Nov 2025 - 5:00 PM)

**Versión 2.0:**
- ✅ Implementado `toLocaleTimeString` con timezone en lugar de Date fake
- ✅ **PERMITIR MÚLTIPLES ENTRADAS SIN RESTRICCIONES**
- ✅ Eliminado modal de confirmación (innecesario)
- ✅ Cálculo correcto de fecha de Bogotá: resta 5 horas a UTC
- ✅ `get_employee_report` retorna TODOS los registros del día (`todayRecords[]`)
- ✅ Creado endpoint `/api/fix-timestamps-now` para corregir timestamps mal guardados

## 🐛 Troubleshooting

### "No me deja marcar entrada"
1. Verifica: ¿Hay una entrada sin salida?
2. Solución: Marca salida primero, o confirma en el modal

### "La hora aparece incorrecta"
1. Verifica timezone del servidor es UTC
2. BD debe almacenar ISO UTC puro
3. Frontend convierte con `timeZone: 'America/Bogota'`

### "¿Mañana se reinicia?"
Sí, automáticamente:
- `getTodayTimecard()` busca por fecha
- Mañana es una fecha diferente
- Se crea un nuevo registro

---
**Actualizado**: 6 de Noviembre de 2025 @ 4:45 PM  
**Timezone**: UTC-5 (Bogotá, Colombia)
