# Merge: Reschedule Policy Validation Integration

**Branch:** `gif-with-reschedule-policies`  
**Base:** `gif` (main giftcard features)  
**Source:** `resch` (reschedule validations)  
**Date:** 2025-01-31

## Objetivo
Integrar selectivamente las validaciones de política de reagendamiento desde la rama `resch` al branch principal `gif`, manteniendo todas las funcionalidades de giftcard intactas.

## Estrategia de Merge
❌ **Full merge rejected** - 116 archivos con conflictos, complejidad excesiva  
✅ **Cherry-pick selectivo** - Extraer solo archivos específicos de validación de políticas

## Cambios Implementados

### 1. Frontend: Types Definition
**File:** `types.ts`
- ✅ Agregado campo `acceptedNoRefund?: boolean` a interface `Booking`
- **Purpose:** Almacenar si el cliente aceptó la política de no reembolso para reservas <48hrs

### 2. Frontend: Booking Flow Validation
**File:** `App.tsx`
- ✅ Importado `slotsRequireNoRefund` desde `utils/bookingPolicy`
- ✅ Calculado `requiresImmediateAcceptance` en `handleUserInfoSubmit`
- ✅ Incluido campo `acceptedNoRefund` en payload de booking
- **Logic:** Si algún slot está a <48hrs, requiere aceptación explícita de política

```typescript
const requiresImmediateAcceptance = slotsRequireNoRefund(finalDetails.slots || [], 48);
const bookingData = {
  // ... existing fields
  acceptedNoRefund: requiresImmediateAcceptance ? !!(data as any).acceptedNoRefund : false
};
```

### 3. Utility: Policy Validation Logic
**File:** `utils/bookingPolicy.ts` (nuevo)
- ✅ Extraído desde `resch` branch
- ✅ Función `slotToDate(slot)` - Convierte slot object a Date
- ✅ Función `slotsRequireNoRefund(slots, horizonHours=48)` - Valida si algún slot requiere aceptación
- **Business Rule:** Cualquier clase a menos de 48 horas dispara política de no reembolso

### 4. Backend: Database Schema
**File:** `api/data.ts`
- ✅ Actualizado `INSERT` en `addBookingAction` para incluir `accepted_no_refund`
- ✅ Actualizado `parseBookingFromDB` para mapear `accepted_no_refund → acceptedNoRefund`
- **Data Flow:** Frontend camelCase → Backend snake_case → Database boolean column

### 5. Database Migration
**File:** `migrations/20250131_add_accepted_no_refund.sql` (nuevo)
- ✅ `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accepted_no_refund BOOLEAN DEFAULT FALSE`
- ✅ Comentario de documentación en columna
- ✅ UPDATE para valores NULL existentes
- ✅ Verificación de creación de columna

## Build Status
✅ **Build successful:** `npm run build`
```
✓ 1020 modules transformed
dist/assets/admin-CDEg4v4c.js     760.62 kB │ gzip: 217.59 kB
✓ built in 3.04s
```

## Archivos Modificados
- `types.ts` - Interface update
- `App.tsx` - Validation logic
- `api/data.ts` - Backend integration
- `utils/bookingPolicy.ts` - NEW utility file
- `migrations/20250131_add_accepted_no_refund.sql` - NEW migration

## Testing Pendiente
- [ ] Ejecutar migración en base de datos: `psql < migrations/20250131_add_accepted_no_refund.sql`
- [ ] Probar booking con slots >48hrs (no debe requerir aceptación)
- [ ] Probar booking con slots <48hrs (debe requerir `acceptedNoRefund=true`)
- [ ] Verificar que campo se guarda correctamente en DB
- [ ] Validar que frontend muestra warning de política apropiadamente

## Próximos Pasos
1. **Deploy migration a staging:**
   ```bash
   vercel env pull .env.local
   psql $DATABASE_URL < migrations/20250131_add_accepted_no_refund.sql
   ```

2. **Commit changes:**
   ```bash
   git add -A
   git commit -m "feat: integrate reschedule policy validation from resch branch"
   ```

3. **Push y crear PR:**
   ```bash
   git push origin gif-with-reschedule-policies
   # Create PR to merge into gif branch
   ```

4. **Testing end-to-end en staging**

5. **Merge a gif después de validación**

## Preservación de Features
✅ **Mantenido de branch `gif`:**
- Sistema completo de giftcards (hold/consume/audit)
- Payment details registration
- Orphaned payment handling
- Financial module integration

✅ **Agregado de branch `resch`:**
- Validación de política 48 horas
- Campo `acceptedNoRefund` en booking
- Utility `bookingPolicy.ts`

## Notas Técnicas
- Migration es idempotente (`IF NOT EXISTS`)
- Default value `FALSE` para compatibilidad con bookings existentes
- Backend valida y usa monto correcto si hay discrepancia en hold
- Frontend calcula en tiempo real si requiere aceptación basado en slots seleccionados
