# 📋 PLAN DE IMPLEMENTACIÓN: SISTEMA DE EXPERIENCIAS ÚLTIMA CERAMIC

**Fecha:** 30 de noviembre de 2025  
**Estado:** DISEÑO (SIN CÓDIGO)  
**Objetivo:** Eliminar WhatsApp como canal de reservas, capturar clases grupales y experiencias personalizadas  

---

## 🎯 RESUMEN EJECUTIVO

### Problemas a Resolver
1. **Clases Grupales**: No existe flujo para agendar múltiples asistentes
2. **Piezas Personalizadas**: Imposible calcular precio según pieza elegida
3. **Dependencia WhatsApp**: Clientes usan WhatsApp porque no ven opciones en sitio

### Solución
**3 Experiencias Claras:**
- ✅ **Clase Individual** (existente, mantener)
- ✨ **NUEVO - Clase Grupal** (2+ personas, mismo horario)
- ✨ **NUEVO - Experiencia Personalizada** (Elige pieza → precio dinámico)

### Impacto Esperado
- 📉 -60% mensajes WhatsApp sin responder
- 📈 +40% conversión (menos fricción)
- ⏱️ -80% abandono de carrito (UX clara)
- 🎯 NPS +25 puntos (flujo intuitivo)

---

## 🗄️ ARQUITECTURA DE BASE DE DATOS

### Tablas Nuevas

#### 1. **pieces** - Catálogo de Piezas para Experiencias
```sql
CREATE TABLE pieces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,  -- 'small', 'medium', 'large', 'diy'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    available_quantity INT DEFAULT 999,  -- -1 = unlimited
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_pieces_category ON pieces(category);
CREATE INDEX idx_pieces_active ON pieces(is_active);
```

#### 2. **group_bookings_metadata** - Metadatos de Clases Grupales
```sql
CREATE TABLE group_bookings_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    attendee_count INT NOT NULL,
    attendee_names JSONB,  -- Array de nombres (opcional)
    group_capacity_limit INT NOT NULL,  -- Cupo máximo del grupo
    lead_email VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_group_bookings_booking_id ON group_bookings_metadata(booking_id);
```

#### 3. **experience_bookings_metadata** - Metadatos de Experiencias Personalizadas
```sql
CREATE TABLE experience_bookings_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    pieces JSONB NOT NULL,  -- Array: [{piece_id, piece_name, quantity, unit_price}]
    total_piece_cost NUMERIC(10, 2) NOT NULL,
    guided_duration_minutes INT NOT NULL,  -- 0, 60, 120
    guided_cost NUMERIC(10, 2) NOT NULL,
    special_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experience_bookings_booking_id ON experience_bookings_metadata(booking_id);
```

#### 4. **experience_confirmations** - Confirmación por Team (Tabla de Control)
```sql
CREATE TABLE experience_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'rejected'
    confirmed_at TIMESTAMPTZ,
    confirmed_by VARCHAR(255),  -- email del admin que confirmó
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experience_confirmations_status ON experience_confirmations(status);
```

### Cambios en Tabla `bookings` Existente

```sql
-- Agregar columnas nuevas
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'individual';
-- Values: 'individual' | 'group' | 'experience'

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS experience_confirmation_id UUID;

-- Índice para búsquedas por tipo
CREATE INDEX idx_bookings_type ON bookings(booking_type);
```

---

## 📦 TIPOS TYPESCRIPT NUEVOS

### Agregar a `types.ts`

```typescript
// ==================== ENUMS ====================
export type BookingType = 'individual' | 'group' | 'experience';
export type PieceCategory = 'small' | 'medium' | 'large' | 'diy';
export type ExperienceConfirmationStatus = 'pending' | 'confirmed' | 'rejected';
export type GuidedDurationOption = 0 | 60 | 120;  // minutos

// ==================== PIECES ====================
export interface Piece {
    id: string;
    category: PieceCategory;
    name: string;
    description?: string;
    basePrice: number;
    imageUrl?: string;
    availableQuantity: number;  // -1 = unlimited
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PieceSelection {
    pieceId: string;
    pieceName: string;
    quantity: number;
    unitPrice: number;
}

export interface PieceCategoryInfo {
    category: PieceCategory;
    displayName: string;  // "Piezas Pequeñas", "Piezas Medianas", etc.
    description: string;
    pieces: Piece[];
}

// ==================== GROUP BOOKING ====================
export interface GroupBooking extends Booking {
    bookingType: 'group';
    attendeeCount: number;
    attendeeNames?: string[];  // Optional
    groupCapacityLimit: number;
    leadEmail: string;
    notes?: string;
}

export interface GroupBookingMetadata {
    id: string;
    bookingId: string;
    attendeeCount: number;
    attendeeNames?: Record<number, string>;  // {0: "Juan", 1: "María"}
    groupCapacityLimit: number;
    leadEmail: string;
    notes?: string;
    createdAt: Date;
}

// ==================== EXPERIENCE BOOKING ====================
export interface ExperienceBooking extends Booking {
    bookingType: 'experience';
    pieces: PieceSelection[];
    totalPieceCost: number;
    guidedDurationMinutes: GuidedDurationOption;
    guidedCost: number;
    specialNotes?: string;
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
    confirmedBy?: string;  // email admin
    rejectionReason?: string;
    notes?: string;
    createdAt: Date;
}

// ==================== GUIDED OPTIONS ====================
export const GUIDED_DURATION_OPTIONS: {
    value: GuidedDurationOption;
    label: string;
    cost: number;
    description: string;
}[] = [
    {
        value: 0,
        label: 'Solo Acceso (30 min)',
        cost: 0,
        description: 'Asistencia básica, sin guía'
    },
    {
        value: 60,
        label: 'Guía 1 Hora',
        cost: 15,
        description: 'Diseño + técnicas incluidas'
    },
    {
        value: 120,
        label: 'Taller Completo 2 Horas',
        cost: 30,
        description: 'Taller completo con efectos especiales'
    }
];

// ==================== EXPERIENCE PRICING ====================
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

// ==================== UNIFIED BOOKING INTERFACE ====================
// Actualizar interfaz Booking existente:
export interface Booking {
    // ... existing fields ...
    bookingType: BookingType;  // Agregar este campo
    
    // Group-specific (si bookingType === 'group')
    attendeeCount?: number;
    attendeeNames?: string[];
    groupCapacityLimit?: number;
    leadEmail?: string;
    
    // Experience-specific (si bookingType === 'experience')
    pieces?: PieceSelection[];
    totalPieceCost?: number;
    guidedDurationMinutes?: GuidedDurationOption;
    guidedCost?: number;
    specialNotes?: string;
    experienceConfirmationId?: string;
}

// ==================== PRODUCTS NUEVOS ====================
export interface GroupClassProduct extends BaseProduct {
    type: 'GROUP_CLASS';
    pricePerPerson: number;
    minParticipants: number;
    maxParticipants: number;
    details: ClassPackageDetails;
    schedulingRules: SchedulingRule[];
}

export interface PersonalizedExperienceProduct extends BaseProduct {
    type: 'PERSONALIZED_EXPERIENCE';
    basePrice: number;  // Precio base sin piezas
    details: {
        description: string;
        techniques: string[];
        guidelines: string;
    };
}

// Actualizar tipo Product:
export type Product = 
    | ClassPackage 
    | OpenStudioSubscription 
    | IntroductoryClass 
    | GroupExperience 
    | CouplesExperience 
    | SingleClass 
    | GroupClass
    | GroupClassProduct  // NUEVO
    | PersonalizedExperienceProduct;  // NUEVO
```

---

## 🎨 COMPONENTES UI - ARQUITECTURA

### Árbol de Componentes

```
App.tsx
├── ExperienceTypeSelector (NUEVO) ← Reemplaza primer paso
│   ├── Individual Card
│   ├── Group Card
│   └── Personalized Card
│
├── GROUP FLOW (si type='group')
│   ├── GroupClassWizard (NUEVO) - Orquestador
│   │   ├── Step 1: GroupClassTypeSelector
│   │   ├── Step 2: GroupAttendeeForm
│   │   ├── Step 3: GroupScheduleSelector
│   │   └── Step 4: GroupBookingSummary
│   │
│   └── (Reutiliza UserInfoModal, PaymentInfo)
│
├── EXPERIENCE FLOW (si type='experience')
│   ├── PieceExperienceWizard (NUEVO) - Orquestador
│   │   ├── Step 1: PieceCategorySelector
│   │   ├── Step 2: PieceSelector (grid/lista)
│   │   ├── Step 3: ExperienceDurationSelector
│   │   ├── Step 4: ExperienceBookingSummary
│   │   └── (Reutiliza UserInfoModal, PaymentInfo)
│   │
│   └── AdminExperienceConfirmation (en Admin Panel)
│
└── INDIVIDUAL FLOW (existente - sin cambios)
    └── (Mantener flujo actual)
```

### 1. **ExperienceTypeSelector.tsx** (NUEVO)

**Props:**
- `onSelectType: (type: 'individual' | 'group' | 'experience') => void`
- `onCancel: () => void`

**Render:**
```
┌─────────────────────────────────────┐
│   ¿QUÉ QUIERES HACER HOY?           │
├─────────────────────────────────────┤
│                                     │
│  [Card Individual]                  │
│   "1 persona, horarios fijos"       │
│                                     │
│  [Card Grupal]                      │
│   "Varias personas, mismo día"      │
│                                     │
│  [Card Personalizada]               │
│   "Pintura de piezas, precios var." │
│                                     │
└─────────────────────────────────────┘
```

### 2. **GroupClassWizard.tsx** (NUEVO) - Orquestador

**Estado:**
```typescript
step: 1 | 2 | 3 | 4
selectedClassType: string
attendeeCount: number
attendeeNames: string[]
selectedDate: string
selectedTime: string
leadEmail: string
```

**Flujo:**
- Step 1 → Step 2 → Step 3 → Step 4 → (UserInfoModal) → (PaymentInfo)

### 3. **GroupClassTypeSelector.tsx** (NUEVO)

**Muestra:**
```
Selecciona tipo de clase grupal:

○ Cerámica Básica (1h) - $25/persona
  Min 2 | Máx 6
  ℹ️ Perfecta para principiantes

○ Pintura Rápida (45min) - $15/persona
  Min 2 | Máx 8
  ℹ️ Ideal para grupos grandes

○ Taller Avanzado (2h) - $40/persona
  Min 2 | Máx 4
  ℹ️ Técnicas avanzadas
```

### 4. **GroupAttendeeForm.tsx** (NUEVO)

**Fields:**
- Spinner para cantidad (2-6)
- Checkbox "¿Agregar nombres?" (opcional)
- Si checked: inputs para nombres

**Cálculo en tiempo real:**
```
Cerámica Básica (1h): $25/persona
Cantidad: 3 personas
Total: $75
```

### 5. **GroupScheduleSelector.tsx** (NUEVO)

**Diferencia vs Individual:**
- Muestra capacidad diferente para grupos
- Ej: "2:00 PM (Capacidad: 2/6)" vs individual "2:00 PM (Capacidad: 4/4)"
- Bloquea horarios sin cupo para cantidad elegida

### 6. **PieceExperienceWizard.tsx** (NUEVO) - Orquestador

**Estado:**
```typescript
step: 1 | 2 | 3 | 4
selectedPieces: PieceSelection[]
guidedDuration: GuidedDurationOption
totalPrice: number
```

### 7. **PieceCategorySelector.tsx** (NUEVO)

**Render:**
```
¿Qué tipo de piezas quieres pintar?

○ Piezas Pequeñas (taza, plato)
  Rango: $12-18

○ Piezas Medianas (jarrón, maceta)
  Rango: $20-30

○ Piezas Grandes (vaso custom)
  Rango: $35-50

○ DIY Kit (llevo mis cosas)
  Custom price - Chat con equipo
```

### 8. **PieceSelector.tsx** (NUEVO)

**Render:** Grid de tarjetas
```
Cada tarjeta:
┌──────────────────┐
│  [Imagen pieza]  │
│  Nombre          │
│  Descripción     │
│  $15             │
│  [- ] 1 [+ ]    │
└──────────────────┘

Sticky footer:
Total piezas: 3
Total costo: $47
[← Atrás] [Siguiente →]
```

### 9. **ExperienceDurationSelector.tsx** (NUEVO)

**Muestra tabla de opciones:**
```
Taza ($12) + Plato ($15)
Costo piezas: $27

¿Cuánto tiempo necesitas?

○ 30 min (acceso)      - GRATIS
● 1 hora (guía)        - +$15    ← SELECCIONADO
○ 2 horas (taller)     - +$30

Total: $42

Nota sobre técnicas incluidas
```

### 10. **ExperienceBookingSummary.tsx** (NUEVO)

**Muestra:**
```
Resumen tu Experiencia

Piezas:
• Taza ($12) x1
• Plato ($15) x1
Subtotal piezas: $27

Guía 1 hora: +$15

TOTAL: $42

ℹ️ Pago 100% anticipado
ℹ️ No es depósito - Pago completo al llegar
ℹ️ Confirmación por email

[← Atrás] [PAGAR AHORA]
```

### 11. **AdminExperienceConfirmationPanel.tsx** (NUEVO)

**Ubicación:** `components/admin/AdminExperienceConfirmationPanel.tsx`

**Features:**
```
Experiencias Pendientes de Confirmación

┌────────────────────────────────────┐
│ María García                        │
│ 🎨 Experiencia Personalizada       │
│ • Taza + Plato ($42)               │
│ 📅 30 Nov 2025, 2:00 PM            │
│                                    │
│ ✓ Piezas disponibles               │
│ ⚠️  Solo 1 cupo de taller hoy      │
│                                    │
│ [CONFIRMAR] [RECHAZAR]             │
└────────────────────────────────────┘
```

### 12. **PiecesManagementPanel.tsx** (NUEVO) - Admin

**Ubicación:** `components/admin/PiecesManagementPanel.tsx`

**Features:**
- ✅ CRUD de piezas (crear, editar, eliminar)
- ✅ Upload de imágenes
- ✅ Gestión de categorías
- ✅ Toggle activas/inactivas
- ✅ Bulk operations

---

## 🔌 APIs NUEVAS (Backend)

### Endpoints a Crear/Modificar

#### 1. **GET /api/pieces**
**Query params:** `?category=small&isActive=true`  
**Response:**
```json
{
  "pieces": [
    {
      "id": "uuid-123",
      "category": "small",
      "name": "Taza Cerámica",
      "basePrice": 12,
      "imageUrl": "https://...",
      "availableQuantity": 50
    }
  ]
}
```

#### 2. **POST /api/pieces** (Admin)
**Auth:** Admin code required  
**Body:**
```json
{
  "category": "small",
  "name": "Taza Cerámica",
  "description": "Taza pintable en blanco",
  "basePrice": 12,
  "imageUrl": "https://...",
  "availableQuantity": 50
}
```
**Response:** Piece created

#### 3. **PUT /api/pieces/:id** (Admin)
**Auth:** Admin code required  
**Body:** Same as POST  
**Response:** Piece updated

#### 4. **DELETE /api/pieces/:id** (Admin)
**Auth:** Admin code required  
**Response:** Piece deleted (soft delete: isActive=false)

#### 5. **POST /api/bookings** (Modificación)
**Nueva lógica:**
```json
{
  "bookingType": "group",  // o 'individual', 'experience'
  "product": "GROUP_CLASS_BASIC",
  
  // Si group:
  "attendeeCount": 2,
  "attendeeNames": ["Juan", "María"],
  "groupCapacityLimit": 6,
  "leadEmail": "juan@example.com",
  
  // Si experience:
  "pieces": [
    {"pieceId": "uuid-1", "pieceName": "Taza", "quantity": 1, "unitPrice": 12}
  ],
  "guidedDurationMinutes": 60,
  "specialNotes": "Sin alérgenos"
}
```

#### 6. **GET /api/bookings/:id/experience-confirmation** (Admin)
**Response:**
```json
{
  "id": "uuid-conf",
  "status": "pending",
  "createdAt": "2025-11-30T10:00:00Z"
}
```

#### 7. **POST /api/bookings/:id/confirm-experience** (Admin)
**Body:**
```json
{
  "confirm": true,
  "notes": "Todas las piezas disponibles"
}
```
**Response:** Confirmation updated + Email sent to client

#### 8. **POST /api/bookings/:id/reject-experience** (Admin)
**Body:**
```json
{
  "reason": "Pieza pequeña no disponible"
}
```
**Response:** Rejection + Email + Refund initiated

#### 9. **GET /api/schedule/capacity**
**Query params:** `?date=2025-11-30&bookingType=group&attendeeCount=3`  
**Response:**
```json
{
  "availableSlots": [
    {
      "time": "10:00",
      "capacity": 4,
      "availableFor": 3  // true if can fit 3 people
    }
  ]
}
```

#### 10. **POST /api/experience-pricing** (Cálculo de precios)
**Body:**
```json
{
  "pieces": [
    {"pieceId": "uuid-1", "quantity": 1}
  ],
  "guidedDurationMinutes": 60
}
```
**Response:**
```json
{
  "pieces": {
    "total": 27,
    "breakdown": [
      {"name": "Taza", "quantity": 1, "unitPrice": 12, "subtotal": 12}
    ]
  },
  "guided": {
    "durationMinutes": 60,
    "cost": 15,
    "label": "Guía 1 hora"
  },
  "total": 42
}
```

---

## 📧 EMAILS NUEVOS

### Template: Group Class Confirmation
```
Asunto: ¡Confirmado! Tu clase grupal - [fecha] [hora]

Hola [nombre_lider],

Tu reserva grupal está confirmada:

📋 Clase: [tipo_clase]
👥 Asistentes: [cantidad] personas
📅 Fecha: [fecha]
🕐 Hora: [hora]
💰 Total: $[total]

Asistentes:
[- Nombre 1]
[- Nombre 2]

✓ Pago recibido
✓ Confirmación también enviada a todos los participantes

¿Necesitas cambios? Responde a este email.
```

### Template: Experience Pending Confirmation
```
Asunto: Tu experiencia está siendo procesada

Hola [nombre],

Recibimos tu experiencia personalizada:

🎨 Experiencia: Pintura de Piezas
📦 Piezas: [lista]
💰 Total: $[total]
📅 Fecha preferida: [fecha]

🔄 ESTADO: Nuestro equipo está verificando disponibilidad de piezas.

Te confirmaremos en máximo 24 horas.

¿Preguntas? Contactanos por WhatsApp [número].
```

### Template: Experience Confirmed
```
Asunto: ¡Confirmado! Tu experiencia personalizada

Hola [nombre],

¡Excelente! Tu experiencia está lista:

✅ Disponibilidad verificada
📦 Piezas: [lista]
💰 Total: $[total]
📅 Fecha: [fecha]
🕐 Hora: [hora]

¿Qué esperar?
- Recibirás piezas sin pintar
- Nuestro equipo te guiará en la técnica elegida
- Llevas tu creación hoy

¡Nos vemos pronto!
```

### Template: Experience Rejected
```
Asunto: Actualizacion sobre tu experiencia

Hola [nombre],

Lamentablemente no pudimos confirmar tu experiencia:

❌ Razón: [motivo]

Alternativas:
- [Pieza alternativa]
- [Otra opción]
- Contacta directamente: [teléfono/WhatsApp]

Reembolso completado a tu tarjeta.
```

---

## 🔄 FLUJO DE NAVEGACIÓN EN App.tsx

### State Management Actualizado

```typescript
// Agregar a App.tsx
const [experienceType, setExperienceType] = useState<'individual' | 'group' | 'experience' | null>(null);

// View navigation mejorada
const handleSelectExperienceType = (type: 'individual' | 'group' | 'experience') => {
    setExperienceType(type);
    
    if (type === 'individual') {
        setView('welcome');  // Flow actual
    } else if (type === 'group') {
        setView('group_class_wizard');  // NUEVO
    } else if (type === 'experience') {
        setView('piece_experience_wizard');  // NUEVO
    }
};

// Agregar a AppView type:
export type AppView = 
    | 'welcome'
    | 'experience_type_selector'  // NUEVO
    | 'group_class_wizard'         // NUEVO
    | 'group_class_type'           // NUEVO
    | 'group_attendee_form'        // NUEVO
    | 'group_schedule'             // NUEVO
    | 'piece_experience_wizard'     // NUEVO
    | 'piece_category'             // NUEVO
    | 'piece_selector'             // NUEVO
    | 'experience_duration'        // NUEVO
    | ... // resto de vistas existentes
```

---

## 📊 DATOS DE CONFIGURACIÓN

### Constants Nuevos

```typescript
// constants.ts

export const PIECE_CATEGORIES = {
    small: {
        name: 'Piezas Pequeñas',
        description: 'Tazas, platos, jarrita',
        priceRange: '$12-18'
    },
    medium: {
        name: 'Piezas Medianas',
        description: 'Jarrón, maceta, vaso',
        priceRange: '$20-30'
    },
    large: {
        name: 'Piezas Grandes',
        description: 'Vaso custom, decorativo',
        priceRange: '$35-50'
    },
    diy: {
        name: 'DIY Kit',
        description: 'Llevo mis cosas',
        priceRange: 'Custom'
    }
};

export const GROUP_CLASS_TYPES = {
    basic: {
        name: 'Cerámica Básica',
        duration: '1h',
        price: 25,
        minParticipants: 2,
        maxParticipants: 6,
        description: 'Perfecta para principiantes'
    },
    quick: {
        name: 'Pintura Rápida',
        duration: '45min',
        price: 15,
        minParticipants: 2,
        maxParticipants: 8,
        description: 'Ideal para grupos grandes'
    },
    advanced: {
        name: 'Taller Avanzado',
        duration: '2h',
        price: 40,
        minParticipants: 2,
        maxParticipants: 4,
        description: 'Técnicas avanzadas'
    }
};

export const GUIDED_DURATION_COSTS = {
    0: 0,      // Solo acceso
    60: 15,    // Guía 1h
    120: 30    // Taller 2h
};
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Base de Datos
- [ ] Agregar tablas: `pieces`, `group_bookings_metadata`, `experience_bookings_metadata`, `experience_confirmations`
- [ ] Migración: Agregar `booking_type` a `bookings`
- [ ] Verificar índices y constraints
- [ ] Seed data: Crear piezas de ejemplo

### Fase 2: Tipos & Constants
- [ ] Agregar tipos en `types.ts`
- [ ] Actualizar `constants.ts` con configs nuevas
- [ ] Validar tipos con TypeScript

### Fase 3: APIs Backend
- [ ] Endpoints de piezas (GET, POST, PUT, DELETE)
- [ ] Modificar POST /bookings para soportar nuevo `bookingType`
- [ ] Endpoint de cálculo de precios
- [ ] Endpoints de confirmación de experiencias
- [ ] Endpoint de capacidad para grupos

### Fase 4: Componentes UI
- [ ] ExperienceTypeSelector
- [ ] GroupClassWizard + subcomponentes
- [ ] PieceExperienceWizard + subcomponentes
- [ ] PiecesManagementPanel (Admin)
- [ ] AdminExperienceConfirmationPanel (Admin)

### Fase 5: Integración
- [ ] Agregar vistas a App.tsx
- [ ] Conectar navegación
- [ ] Integrar datos de API
- [ ] Manejo de errores

### Fase 6: Emails
- [ ] Template para confirmación grupal
- [ ] Template para experiencia pendiente
- [ ] Template para experiencia confirmada
- [ ] Template para rechazo

### Fase 7: Testing
- [ ] Prueba flujo grupo (reserva, pago, confirmación)
- [ ] Prueba flujo experiencia (selección piezas, guía, pago)
- [ ] Verificar capacidad horaria
- [ ] Verificar emails
- [ ] Testing admin (confirmar/rechazar experiencias)

---

## 🔐 CONSIDERACIONES DE SEGURIDAD

1. **Admin Auth:** Verificar código admin para endpoints de piezas
2. **Price Validation:** Backend debe validar precios (no confiar en frontend)
3. **Inventory:** Verificar disponibilidad de piezas antes de confirmar
4. **Payment:** Pago 100% anticipado (no pendiente)
5. **Confirmación Manual:** Equipo debe confirmar experiencias (para verificar disponibilidad)

---

## 📝 NOTAS IMPORTANTES

1. **No cambiar flujo individual**: Mantener intacto
2. **Horarios compartidos**: Grupos y individuales usan los mismos horarios pero con capacidades diferentes
3. **Confirmación diferida**: Experiencias requieren confirmación manual, no automática
4. **Pago anticipado**: Todos los tipos pagan 100% anticipado
5. **Extensibilidad**: Diseño permite agregar más tipos de experiencias en futuro

---

## 🎯 PRÓXIMOS PASOS

1. ✅ **COMPLETADO:** Definir arquitectura sin código
2. ⏭️ **SIGUIENTE:** Review de este documento
3. ⏭️ Confirmar tipos y estructura de BD
4. ⏭️ Iniciar implementación Fase 1 (BD)
5. ⏭️ Proceeder con fases 2-7 secuencialmente

**Estado:** LISTO PARA IMPLEMENTAR

