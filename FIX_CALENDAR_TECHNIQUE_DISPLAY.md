# Fix para Visualización de Técnicas en el Calendario

## Problema
Las cards del calendario semanal muestran "Torno Alfarero" en lugar de la técnica correcta (ej: "Pintura de piezas" o "Modelado a Mano").

## Causa Raíz
El problema estaba en la función `getSlotDisplayName()` en `components/admin/ScheduleManager.tsx`. Esta función:

1. Primero llamaba a `getUnderlyingTechnique()` que revisaba `groupClassMetadata.techniqueAssignments`
2. Si `techniqueAssignments` tenía un valor incorrecto (ej: `"potters_wheel"` en lugar de `"painting"`), mostraba la técnica incorrecta
3. `product.name` (la fuente más confiable) solo se usaba como último fallback

## Solución Implementada

### Fix 1: Código (components/admin/ScheduleManager.tsx)

Se modificó `getSlotDisplayName()` para priorizar `product.name` sobre `techniqueAssignments`:

```typescript
const getSlotDisplayName = (slot: { product: Product; bookings: Booking[] }): string => {
  if (slot.bookings.length === 0) {
    // Slot vacío, usar producto del slot
    const productName = slot.product?.name;
    if (!productName || productName === 'Unknown Product' || productName === 'Unknown') {
      return 'Clase';
    }
    return productName;
  }

  const firstBooking = slot.bookings[0];
  
  // FIX #1: Prioridad máxima a product.name (fuente más confiable)
  // Esto evita que techniqueAssignments incorrecto sobrescriba el nombre correcto
  const productName = firstBooking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown' && productName !== null) {
    return productName;
  }
  
  // Si product.name no está disponible, usar la técnica subyacente
  const technique = getUnderlyingTechnique(firstBooking);
  
  // Mapear técnica a nombre display unificado
  if (technique === 'potters_wheel') return 'Torno Alfarero';
  if (technique === 'hand_modeling') return 'Modelado a Mano';
  if (technique === 'painting') return 'Pintura de piezas';
  if (technique === 'molding') return 'Modelado';
  if (technique === 'mixed') return 'Clase Grupal (mixto)';
  
  // Último fallback
  return getBookingDisplayName(firstBooking);
};
```

También se actualizó `getTechniqueName()` para aceptar tipos más flexibles:

```typescript
const getTechniqueName = (technique: GroupTechnique | Technique | string): string => {
  const names: Record<string, string> = {
    'potters_wheel': 'Torno Alfarero',
    'hand_modeling': 'Modelado a Mano',
    'painting': 'Pintura de piezas',
    'molding': 'Modelado'
  };
  return names[technique] || technique;
};
```

### Fix 2: Base de Datos (fix_technique_inconsistencies.sql)

Para corregir los datos existentes con inconsistencias, ejecutar el script SQL:

```bash
# Ejecutar en Vercel Postgres Console o cualquier cliente PostgreSQL
psql $DATABASE_URL -f fix_technique_inconsistencies.sql
```

El script:
1. Identifica bookings donde `product.name` no coincide con `techniqueAssignments`
2. Corrige `group_metadata.techniqueAssignments` al valor correcto
3. Actualiza `technique` y `product.details.technique` para consistencia

## Verificación

Después de aplicar los fixes:

1. **Verificar el código**: Las cards del calendario deben mostrar el nombre del producto correctamente
2. **Verificar la BD**: Ejecutar las queries de verificación del script SQL

```sql
-- Verificar que no quedan inconsistencias
SELECT 
    product->>'name' as product_name,
    technique,
    COUNT(*) as count
FROM bookings 
WHERE product_type = 'GROUP_CLASS'
AND status = 'active'
GROUP BY product->>'name', technique
ORDER BY product_name, technique;
```

## Resultado Esperado

- Las cards del calendario mostrarán "Pintura de piezas" para reservas de pintura
- Las cards del calendario mostrarán "Torno Alfarero" para reservas de torno
- Las cards del calendario mostrarán "Modelado a Mano" para reservas de modelado
- No más confusión con técnicas incorrectas

## Archivos Modificados

1. `components/admin/ScheduleManager.tsx` - Fix de código
2. `fix_technique_inconsistencies.sql` - Fix de base de datos (ya existía, documentado)
3. `FIX_CALENDAR_TECHNIQUE_DISPLAY.md` - Este documento
