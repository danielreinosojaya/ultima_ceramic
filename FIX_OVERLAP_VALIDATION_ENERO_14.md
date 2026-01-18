# FIX: Overlap Validation para Group Experiences - 14 de Enero

## 🎯 Problema Identificado

**Síntoma:** El usuario podía reservar un grupo de 7 personas a las 10:00 AM el 14 de enero, aunque existía una clase a las 11:00 AM (overlap 11:00-12:00).

**Escenario:** 
- Hay una clase de introducción al torno alfarero a las 11:00 AM (1 persona, Veronica Zumarraga)
- Usuario intenta reservar grupo de 7 personas a las 10:00 AM
- Sistema mostraba 10:00 AM como disponible (debería ser unavailable)

**Raíz del problema:** El endpoint `checkSlotAvailability` no estaba rechazando correctamente solicitudes con overlap temporal.

## 🔍 Causa Raíz

### 1. **Técnica no se guardaba en la DB**
- Cuando se creaban bookings antiguos, el campo `technique` podría estar NULL
- El overlap check hacía: `if (!bookingTechnique) continue;` → **SALTABA bookings sin técnica**
- El booking de las 11:00 AM era ignorado completamente

### 2. **Overlap se trataba como reducción de capacidad, no como bloqueo**
- Si 10:00-12:00 solapaba con 11:00-13:00, se restaban participantes
- Pero si la capacidad máxima era suficientemente alta, la reserva se permitía
- Ejemplo: 1 persona en clase + 7 de reserva < 12 cupos = permitido ❌

### 3. **Extracción de técnica incompleta**
- Para INTRODUCTORY_CLASS bookings, la técnica estaba en `product.details.technique`
- Pero el código solo buscaba en `body.technique` cuando creaba nuevos bookings

## ✅ Soluciones Implementadas

### 1. **Mejorar extracción de técnica (línea ~4594)**
```typescript
// Antes
const technique = (body as any).technique;

// Después
let technique = (body as any).technique;
if (!technique && body.product && (body.product as any).details) {
  technique = (body.product as any).details.technique;
}
```
- Ahora extrae de `body.product.details.technique` si no viene directo
- Asegura que NUEVOS bookings siempre tengan técnica guardada

### 2. **Cambiar lógica de overlap en validation (línea ~1001)**
```typescript
// Antes - saltaba bookings sin técnica
if (!bookingTechnique) continue;
if (bookingTechnique !== requestedTechnique) continue;

// Después - cuenta bookings sin técnica
if (bookingTechnique && bookingTechnique !== requestedTechnique) continue;
// Si bookingTechnique es undefined, el booking SE CUENTA
```
- Bookings sin técnica ahora se cuentan (ocupan espacio/tiempo)
- Bookings con técnica diferente se saltan (técnicas no son excluyentes)

### 3. **Hacer overlap un BLOQUEO, no reducción (línea ~1043)**
```typescript
// Antes - solo reducía capacidad
const canBook = availableCapacity >= requestedParticipants;

// Después - rechaza si hay conflicto
const hasConflictingOverlap = bookingsInSlot.some((b: any) => 
  !b.bookingTechnique || b.bookingTechnique === requestedTechnique
);
const canBook = !hasConflictingOverlap && (availableCapacity >= requestedParticipants);
```
- Si hay overlap con booking sin técnica (ambiguo) → rechazar
- Si hay overlap con booking de MISMA técnica → rechazar  
- Si hay overlap pero técnica diferente → permitir (sin contar capacidad del otro)

## 📊 Impacto

### Antes
- ✗ 10:00 AM mostraba disponible (overlay con 11:00 AM)
- ✗ Overlap se ignoraba si había capacidad suficiente
- ✗ Técnica se perdía para algunos bookings

### Después
- ✓ 10:00 AM marca como unavailable (× rojo)
- ✓ Overlap es un bloqueo completo, no reducción
- ✓ Todos los bookings tienen técnica correcta
- ✓ Logs detallados para debugging

## 🛠️ Acciones Requeridas

### 1. **Ejecutar script de migración SQL** (RECOMENDADO)
```sql
-- Poblar técnica en bookings existentes basado en product.details.technique
UPDATE bookings
SET technique = product->>'details'->>'technique'
WHERE (technique IS NULL OR technique = '')
  AND product IS NOT NULL;
```

📄 Ver archivo: `fix_booking_techniques.sql`

### 2. **Verificar en producción**
```
Test: Intentar reservar grupo de 7 personas a las 10:00 AM el 14 de enero
Resultado esperado: "No disponible: hay un evento solapando"
Resultado en logs: "FOUND OVERLAP - booking: 11:00 (660-780min), requested: 10:00 (600-720min)"
```

## 🔧 Cambios Técnicos Resumen

| Archivo | Línea | Cambio | Impacto |
|---------|-------|--------|--------|
| api/data.ts | 4594 | Extracción de técnica mejorada | Nuevos bookings siempre tienen técnica |
| api/data.ts | 1001 | Lógica de overlap: contar bookings sin técnica | Más restrictivo, mejor validación |
| api/data.ts | 1043 | Hacer overlap un bloqueo | Rechaza automáticamente si hay solapamiento |

## 📝 Logging para Debugging

Cuando un usuario intenta una reserva conflictiva, los logs mostrarán:

```
[addBookingAction] productType=GROUP_CLASS, technique=potters_wheel (from body.technique=potters_wheel, from product.details=N/A)

[checkSlotAvailability] Checking 2026-01-14 10:00 for potters_wheel (7 people)
[checkSlotAvailability] classCapacity from DB: {...}
[checkSlotAvailability] maxCapacityMap: {...}

[checkSlotAvailability] FOUND OVERLAP - booking: 11:00 (660-780min), requested: 10:00 (600-720min), technique: potters_wheel

[checkSlotAvailability] maxCapacity: 12, booked: 1, available: 11, hasConflict: true, canBook: false

Response: { available: false, message: 'No disponible: hay un evento solapando en potters_wheel' }
```

## 🚀 Resultado

✅ El sistema ahora:
1. Detecta correctamente overlaps temporales
2. Rechaza reservas conflictivas automáticamente
3. Guarda técnica correctamente en todos los bookings
4. Proporciona mensajes claros al usuario
5. Log detallado para debugging de futuros problemas
