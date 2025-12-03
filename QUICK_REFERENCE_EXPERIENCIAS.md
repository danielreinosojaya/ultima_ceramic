# ⚡ QUICK REFERENCE - TARJETA DE IMPLEMENTACIÓN

**Para:** Developers implementando  
**Propósito:** Acceso rápido a lo esencial  
**Actualizado:** 30 Nov 2025  

---

## 🗄️ BASE DE DATOS (COPIAR/PEGAR)

### Tabla: `pieces`
```sql
CREATE TABLE IF NOT EXISTS pieces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    available_quantity INT DEFAULT 999,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pieces_category ON pieces(category);
CREATE INDEX idx_pieces_active ON pieces(is_active);
```

### Tabla: `group_bookings_metadata`
```sql
CREATE TABLE IF NOT EXISTS group_bookings_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE,
    attendee_count INT NOT NULL,
    attendee_names JSONB,
    group_capacity_limit INT NOT NULL,
    lead_email VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_group_bookings_booking_id ON group_bookings_metadata(booking_id);
```

### Tabla: `experience_bookings_metadata`
```sql
CREATE TABLE IF NOT EXISTS experience_bookings_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE,
    pieces JSONB NOT NULL,
    total_piece_cost NUMERIC(10, 2) NOT NULL,
    guided_duration_minutes INT NOT NULL,
    guided_cost NUMERIC(10, 2) NOT NULL,
    special_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_experience_bookings_booking_id ON experience_bookings_metadata(booking_id);
```

### Tabla: `experience_confirmations`
```sql
CREATE TABLE IF NOT EXISTS experience_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    confirmed_at TIMESTAMPTZ,
    confirmed_by VARCHAR(255),
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_experience_confirmations_status ON experience_confirmations(status);
```

### Alteraciones a `bookings`
```sql
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'individual';
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS experience_confirmation_id UUID;
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type);
```

---

## 📦 TIPOS TYPESCRIPT (CORE)

```typescript
// Enums
export type BookingType = 'individual' | 'group' | 'experience';
export type PieceCategory = 'small' | 'medium' | 'large' | 'diy';
export type ExperienceConfirmationStatus = 'pending' | 'confirmed' | 'rejected';
export type GuidedDurationOption = 0 | 60 | 120;

// Piece
export interface Piece {
    id: string;
    category: PieceCategory;
    name: string;
    description?: string;
    basePrice: number;
    imageUrl?: string;
    availableQuantity: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// PieceSelection
export interface PieceSelection {
    pieceId: string;
    pieceName: string;
    quantity: number;
    unitPrice: number;
}

// Metadata
export interface GroupBookingMetadata {
    id: string;
    bookingId: string;
    attendeeCount: number;
    attendeeNames?: Record<number, string>;
    groupCapacityLimit: number;
    leadEmail: string;
    notes?: string;
    createdAt: Date;
}

export interface ExperienceBookingMetadata {
    id: string;
    bookingId: string;
    pieces: PieceSelection[];
    totalPieceCost: number;
    guidedDurationMinutes: GuidedDurationOption;
    guidedCost: number;
    specialNotes?: string;
    createdAt: Date;
}

export interface ExperienceConfirmation {
    id: string;
    bookingId: string;
    status: ExperienceConfirmationStatus;
    confirmedAt?: Date;
    confirmedBy?: string;
    rejectionReason?: string;
    notes?: string;
    createdAt: Date;
}

// Pricing
export interface ExperiencePricing {
    pieces: {
        total: number;
        breakdown: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
    };
    guided: {
        durationMinutes: GuidedDurationOption;
        cost: number;
        label: string;
    };
    total: number;
    notes: string;
}

// Guided Options Constant
export const GUIDED_DURATION_OPTIONS: Array<{
    value: GuidedDurationOption;
    label: string;
    cost: number;
    description: string;
}> = [
    { value: 0, label: 'Solo Acceso (30 min)', cost: 0, description: 'Asistencia básica' },
    { value: 60, label: 'Guía 1 Hora', cost: 15, description: 'Diseño + técnicas' },
    { value: 120, label: 'Taller 2 Horas', cost: 30, description: 'Completo con efectos' }
];

// Update Booking interface
export interface Booking {
    // ... existing fields ...
    bookingType: BookingType;
    // Group-specific
    attendeeCount?: number;
    attendeeNames?: string[];
    groupCapacityLimit?: number;
    leadEmail?: string;
    // Experience-specific
    pieces?: PieceSelection[];
    totalPieceCost?: number;
    guidedDurationMinutes?: GuidedDurationOption;
    guidedCost?: number;
    specialNotes?: string;
    experienceConfirmationId?: string;
}

// Update AppView type
export type AppView = 
    | 'welcome'
    | 'experience_type_selector'  // NUEVO
    | 'group_class_wizard'         // NUEVO
    | 'piece_experience_wizard'     // NUEVO
    | ... // resto existente
```

---

## 🔌 ENDPOINTS ESENCIALES

### Piezas
```bash
GET /api/pieces?category=small&isActive=true
POST /api/pieces (Admin: Authorization header)
PUT /api/pieces/:id (Admin)
DELETE /api/pieces/:id (Admin - soft delete)
```

### Pricing
```bash
POST /api/experience-pricing
Body: {
  "pieces": [
    { "pieceId": "uuid", "quantity": 1 }
  ],
  "guidedDurationMinutes": 60
}
```

### Confirmaciones (Admin)
```bash
GET /api/experience-confirmations (Admin)
POST /api/bookings/:id/confirm-experience (Admin)
POST /api/bookings/:id/reject-experience (Admin)
```

### Bookings (Modificado)
```bash
POST /api/bookings
Body incluye:
{
  "bookingType": "group" | "experience" | "individual",
  // Si group:
  "attendeeCount": 3,
  "attendeeNames": ["Juan", "María"],
  "groupCapacityLimit": 6,
  "leadEmail": "juan@example.com",
  // Si experience:
  "pieces": [{pieceId, pieceName, quantity, unitPrice}],
  "guidedDurationMinutes": 60
}
```

---

## 🎨 COMPONENTES CLAVE

### Orquestadores (Wizards)
- `GroupClassWizard.tsx` - 4 steps, maneja estado
- `PieceExperienceWizard.tsx` - 4 steps, maneja estado

### Selectores
- `ExperienceTypeSelector.tsx` - Entry point
- `GroupClassTypeSelector.tsx` - Tipos de clase (basic, quick, advanced)
- `PieceCategorySelector.tsx` - Categorías (small, medium, large, diy)
- `ExperienceDurationSelector.tsx` - Duración guía (0, 60, 120 min)

### Pickers
- `GroupAttendeeForm.tsx` - Cantidad + nombres opcionales
- `GroupScheduleSelector.tsx` - Fecha/hora con capacidad
- `PieceSelector.tsx` - Grid de piezas con quantity spinner

### Sumarios
- `GroupBookingSummary.tsx` - Review antes de pago
- `ExperienceBookingSummary.tsx` - Review antes de pago

### Admin
- `AdminExperienceConfirmationPanel.tsx` - Lista de pendientes
- `PiecesManagementPanel.tsx` - CRUD de piezas

---

## 📧 EMAIL TEMPLATES

### 1. Group Class Confirmation
```
Asunto: ¡Confirmado! Tu clase grupal
Variables: [nombre], [fecha], [hora], [total], [participantes]
Enviar: Inmediato después de pago
```

### 2. Experience Pending
```
Asunto: Tu experiencia está siendo procesada
Variables: [nombre], [piezas], [total]
Enviar: Inmediato después de pago
Nota: Status "pendiente" - confirm en 24h
```

### 3. Experience Confirmed
```
Asunto: ¡Confirmado! Tu experiencia personalizada
Variables: [nombre], [piezas], [fecha], [hora], [total]
Enviar: Cuando admin confirma
```

### 4. Experience Rejected
```
Asunto: Actualización sobre tu experiencia
Variables: [nombre], [razón], [alternativas]
Enviar: Cuando admin rechaza
Acción: Iniciar reembolso automático
```

---

## 🚀 FLUJO RÁPIDO: GRUPO

```
1. Click "Clase Grupal" → ExperienceTypeSelector
2. Seleccionar tipo → GroupClassWizard (Step 1)
3. Cantidad (2-6) → GroupClassWizard (Step 2)
4. Fecha/Hora → GroupClassWizard (Step 3)
5. Review → GroupClassWizard (Step 4)
6. UserInfoModal (si primera vez)
7. PaymentInfo
8. POST /api/bookings { bookingType: 'group', attendeeCount, ... }
9. Email groupClassConfirmation enviado
10. Confirmación page

DB: 
- Insert en bookings { booking_type: 'group' }
- Insert en group_bookings_metadata
```

---

## 🚀 FLUJO RÁPIDO: EXPERIENCIA

```
1. Click "Experiencia Personalizada" → ExperienceTypeSelector
2. Seleccionar categoría → PieceExperienceWizard (Step 1)
3. Seleccionar piezas + qty → PieceExperienceWizard (Step 2)
4. Seleccionar guía duración → PieceExperienceWizard (Step 3)
5. Review → PieceExperienceWizard (Step 4)
6. UserInfoModal (si primera vez)
7. PaymentInfo
8. POST /api/bookings { bookingType: 'experience', pieces, guided... }
9. Email experiencePendingConfirmation enviado
10. Confirmación page (con "pendiente revisión")

DB:
- Insert en bookings { booking_type: 'experience' }
- Insert en experience_bookings_metadata
- Insert en experience_confirmations { status: 'pending' }

Admin:
- Ve en AdminExperienceConfirmationPanel
- Verifica disponibilidad
- Click [CONFIRMAR] o [RECHAZAR]
- Email enviado automáticamente
```

---

## 🧪 VALIDATION CHECKS

### Clase Grupal
```typescript
// Validar en frontend + backend
if (attendeeCount < 2 || attendeeCount > 6) throw "Invalid count"
if (!selectedDate || !selectedTime) throw "Date/time required"
if (!leadEmail) throw "Lead email required"
```

### Experiencia
```typescript
// Validar en frontend + backend
if (!pieces || pieces.length === 0) throw "Select pieces"
if (![0, 60, 120].includes(guidedMinutes)) throw "Invalid duration"
if (!selectedDate || !selectedTime) throw "Date/time required"

// Backend validate prices:
const piece = await db.getPieceById(pieceId)
if (!piece?.is_active) throw "Piece unavailable"
if (piece.base_price !== expectedPrice) throw "Price mismatch"
```

---

## 🔐 SECURITY CHECKS

```typescript
// Admin auth en todas las rutas admin
if (req.headers['admin-code'] !== process.env.ADMIN_CODE) {
    return res.status(401).json({ error: 'Unauthorized' })
}

// Validar precios backend (nunca confiar frontend)
const actualPrice = calculateServerSide(pieces, guidedMinutes)
if (actualPrice !== requestedPrice) {
    return res.status(400).json({ error: 'Price mismatch' })
}

// Verificar disponibilidad de piezas
const piece = await db.getPieceById(pieceId)
if (piece.available_quantity < requestedQuantity) {
    return res.status(400).json({ error: 'Out of stock' })
}

// Pago 100% anticipado
if (!paymentReceived) {
    return res.status(400).json({ error: 'Payment required' })
}
```

---

## 🐛 TROUBLESHOOTING RÁPIDO

| Problema | Solución |
|----------|----------|
| **Piezas no aparecen** | Verificar `is_active = true` en BD |
| **Precio incorrecto** | Check `GUIDED_DURATION_OPTIONS`, `base_price` en pieces |
| **Capacidad horaria mal** | Verificar query de capacidad por grupo |
| **Confirmación no aparece** | Check `status = 'pending'` en experience_confirmations |
| **Email no envía** | Verificar Resend API key, template variables |
| **TypeScript errors** | Run `npm run build`, check types.ts cambios |
| **BD migration falla** | Check constraints, unique indexes, foreign keys |

---

## 📊 CONSTANTS TO UPDATE

En `constants.ts`:

```typescript
export const GROUP_CLASS_TYPES = {
    basic: { name: 'Cerámica Básica', price: 25, duration: '1h', min: 2, max: 6 },
    quick: { name: 'Pintura Rápida', price: 15, duration: '45min', min: 2, max: 8 },
    advanced: { name: 'Taller Avanzado', price: 40, duration: '2h', min: 2, max: 4 }
};

export const PIECE_CATEGORIES = {
    small: { name: 'Piezas Pequeñas', range: '$12-18' },
    medium: { name: 'Piezas Medianas', range: '$20-30' },
    large: { name: 'Piezas Grandes', range: '$35-50' },
    diy: { name: 'DIY Kit', range: 'Custom' }
};
```

---

## 📝 FILE CHECKLIST

**Crear nuevos:**
- [ ] `api/pieces.ts`
- [ ] `api/experience-pricing.ts`
- [ ] `api/experience-confirmations.ts`
- [ ] `components/ExperienceTypeSelector.tsx`
- [ ] `components/GroupClassWizard.tsx`
- [ ] `components/GroupClassTypeSelector.tsx`
- [ ] `components/GroupAttendeeForm.tsx`
- [ ] `components/GroupScheduleSelector.tsx`
- [ ] `components/GroupBookingSummary.tsx`
- [ ] `components/PieceExperienceWizard.tsx`
- [ ] `components/PieceCategorySelector.tsx`
- [ ] `components/PieceSelector.tsx`
- [ ] `components/ExperienceDurationSelector.tsx`
- [ ] `components/ExperienceBookingSummary.tsx`
- [ ] `components/admin/AdminExperienceConfirmationPanel.tsx`
- [ ] `components/admin/PiecesManagementPanel.tsx`
- [ ] `migrations/001_add_experiences.sql`

**Modificar:**
- [ ] `types.ts` - Agregar tipos nuevos
- [ ] `constants.ts` - Agregar configs
- [ ] `api/db.ts` - Agregar funciones DB
- [ ] `api/bookings.ts` - Agregar lógica bookingType
- [ ] `App.tsx` - Agregar vistas + navegación
- [ ] `package.json` (si nuevas dependencias)

---

## ⏱️ TIMING ESTIMADO POR FASE

| Fase | Tarea | Horas | Dev |
|------|-------|-------|-----|
| 1 | Base de datos | 3 | Backend |
| 2 | Tipos TypeScript | 2 | Backend |
| 3 | APIs | 6 | Backend |
| 4.1 | ExperienceTypeSelector | 1 | Frontend |
| 4.2 | GroupClassWizard | 3 | Frontend |
| 4.3 | PieceExperienceWizard | 3 | Frontend |
| 4.4 | Admin components | 2 | Frontend |
| 5 | Integración App.tsx | 2 | Full-stack |
| 6 | Email templates | 2 | Backend |
| 7 | Testing | 4 | QA/Full-stack |
| **TOTAL** | | **~40h** | |

---

## 🔗 DOCUMENTACIÓN COMPLETA

- 📋 `INDICE_MAESTRO_EXPERIENCIAS.md` - Navegación
- 📊 `RESUMEN_EJECUTIVO_EXPERIENCIAS.md` - Overview
- 🏗️ `PLAN_IMPLEMENTACION_EXPERIENCIAS.md` - Arquitectura
- 🎨 `UI_UX_MOCKUPS_EXPERIENCIAS.md` - Diseño
- 🛠️ `GUIA_IMPLEMENTACION_PASOS.md` - Step-by-step

---

**Impreso:** 30 Nov 2025 | Última actualización: 30 Nov 2025

