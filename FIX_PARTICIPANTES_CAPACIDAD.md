# Fix: Contador de Capacidad NO Contaba `participants` en Reservas Manuales

## 🔴 Problema Identificado

Cuando se creaba una reserva manual desde el admin panel con **N asistentes**, el sistema:
- ✅ Guardaba correctamente `booking.participants = N` en BD
- ❌ Pero al contar capacidad ocupada, asumía **1 reserva = 1 persona** (ignoraba `participants`)
- ❌ Esto causaba **OVERBOOKING**: podías crear 8 reservas de 2 personas c/u (16 personas) en un slot con capacidad 8

## 📍 Ubicaciones del Bug

### 1. **ScheduleManager.tsx - `calculateTotalParticipants` (CRÍTICO)**
**Línea:** 387-397
```typescript
// ❌ ANTES:
const calculateTotalParticipants = (bookings: Booking[]): number => {
    let count = 0;
    for (const b of bookings) {
        if (b.product.type === 'GROUP_CLASS' && 'minParticipants' in b.product) {
            count += b.product.minParticipants;  // ❌ Usa minParticipants del PRODUCTO
        } else {
            count += 1;  // ❌ SIEMPRE SUMA 1, ignora booking.participants
        }
    }
    return count;
};

// ✅ DESPUÉS:
const calculateTotalParticipants = (bookings: Booking[]): number => {
    let count = 0;
    for (const b of bookings) {
        // CRÍTICO: Usar booking.participants si está disponible
        const participantCount = b.participants ?? (
            b.product.type === 'GROUP_CLASS' && 'minParticipants' in b.product 
                ? b.product.minParticipants 
                : 1
        );
        count += participantCount;
    }
    return count;
};
```

**Impacto:** Este era el MAYOR bug - afectaba el contador visual en el calendario admin que muestra "N/M booked"

---

### 2. **dataService.ts - `calculateSlotAvailability` (MEDIO)**
**Línea:** 2160-2180

```typescript
// ❌ ANTES:
bookingsForSlot.forEach(booking => {
    if (booking.productType === 'GROUP_EXPERIENCE' || booking.productType === 'SINGLE_CLASS' || booking.productType === 'GROUP_CLASS') {
        const participants = booking.participants || 1;
        capacity.hand_modeling.bookedInWindow += participants;  // ❌ Siempre suma a hand_modeling
    } else if (booking.technique === 'potters_wheel') {
        capacity.potters_wheel.bookedInWindow += 1;  // ❌ Ignora participants
    }
});

// ✅ DESPUÉS:
bookingsForSlot.forEach(booking => {
    const participantCount = booking.participants ?? 1;
    
    // Determinar técnica del booking correctamente
    let bookingTechnique: 'potters_wheel' | 'hand_modeling' | 'painting' | undefined;
    
    if (booking.technique) {
        bookingTechnique = booking.technique as any;
    } else if (booking.product && 'details' in booking.product) {
        const details = (booking.product as any).details;
        if (details && typeof details === 'object' && 'technique' in details) {
            bookingTechnique = details.technique;
        }
    }
    
    if (!bookingTechnique) {
        bookingTechnique = 'hand_modeling';
    }
    
    // Sumar participantes a la técnica CORRECTA
    if (capacity[bookingTechnique]) {
        capacity[bookingTechnique].bookedInWindow += participantCount;
    }
});
```

**Impacto:** Afectaba el cálculo de disponibilidad en wizards de experiencias (UI de reserva del cliente)

---

### 3. **dataService.ts - `getFutureCapacityMetrics` (BAJO)**
**Línea:** 1642-1660

```typescript
// ❌ ANTES:
const futureBookedSlots = bookings.reduce((count, booking) => {
    const bookingSlotsCount = booking.slots.filter(...).length;
    
    if (booking.productType === 'GROUP_CLASS') {
        return count + (booking.product as GroupClass).minParticipants;  // ❌ minParticipants del producto
    } else {
        return count + bookingSlotsCount;  // ❌ Ignora participants
    }
}, 0);

// ✅ DESPUÉS:
const futureBookedSlots = bookings.reduce((count, booking) => {
    const bookingSlotsCount = booking.slots.filter(...).length;
    const participantCount = booking.participants ?? 1;  // ✅ USA booking.participants
    
    return count + (participantCount * bookingSlotsCount);
}, 0);
```

**Impacto:** Afectaba métricas de capacidad futura (dashboard, reportes)

---

## 🔧 Fixes Aplicados

### Cambio 1: ScheduleManager.tsx
- ✅ Línea 387-397: `calculateTotalParticipants` ahora usa `booking.participants`
- ✅ Build: PASSING

### Cambio 2: dataService.ts - calculateSlotAvailability
- ✅ Línea 2160-2190: Cuenta participants y asigna a técnica correcta
- ✅ Build: PASSING

### Cambio 3: dataService.ts - getFutureCapacityMetrics
- ✅ Línea 1642-1660: Multiplica participants × slots
- ✅ Build: PASSING

---

## ✅ Resultado

### Antes del Fix:
```
Reserva 1: 5 asistentes → Contaba como 1 persona
Reserva 2: 3 asistentes → Contaba como 1 persona
Reserva 3: 2 asistentes → Contaba como 1 persona
─────────────────────────────────
Total contado: 3/8 (mal ❌)
Total real: 10/8 (overbooking ❌)
```

### Después del Fix:
```
Reserva 1: 5 asistentes → Cuenta como 5 personas
Reserva 2: 3 asistentes → Cuenta como 3 personas
Reserva 3: 2 asistentes → Cuenta como 2 personas
─────────────────────────────────
Total contado: 10/8 (correcto ✅)
Total real: 10/8 (correcto ✅)
```

---

## 🚨 Notas de Implementación

### 1. Admin Panel puede hacer overbooking (POR DISEÑO)
**NO hay validación de capacidad en backend** al crear reserva manual porque:
- Admin debe poder forzar booking si es necesario
- Sistema es flexible por diseño
- Validación es solo visual/preventiva en UI

### 2. Fallback Chain para participants
```typescript
booking.participants 
    ?? product.minParticipants  // Solo si GROUP_CLASS
    ?? 1  // Default
```

Esto garantiza compatibilidad backwards con bookings antiguos

### 3. Técnica correcta en calculateSlotAvailability
Busca en orden:
1. `booking.technique` (COUPLES_EXPERIENCE)
2. `booking.product.details.technique` (GROUP_EXPERIENCE, CLASS_PACKAGE)
3. `hand_modeling` (default fallback)

---

## 📋 Cambios Resumidos

| Archivo | Función | Línea | Cambio |
|---------|---------|-------|--------|
| ScheduleManager.tsx | calculateTotalParticipants | 387 | ✅ Usa booking.participants |
| dataService.ts | calculateSlotAvailability | 2160 | ✅ Técnica + participants correctos |
| dataService.ts | getFutureCapacityMetrics | 1642 | ✅ Multiplica participants × slots |

---

## 🧪 Testing Recomendado

1. **Admin Panel - Crear reserva manual con 5 asistentes**
   - Verificar que muestre "5/8 booked" (no "1/8")
   - Crear otra reserva de 4 asistentes
   - Verificar "9/8 booked" (overbooking detectado)

2. **Cliente - Ver disponibilidad en wizard**
   - Las reservas manuales de 5 asistentes deben restar 5 de capacidad
   - No 1 persona

3. **Dashboard - Métricas futuras**
   - Debe contar 5 personas de 5 asistentes, no 1

---

**Versión:** 1.0
**Fecha:** Dec 1, 2025
**Estado:** COMPLETO ✅
