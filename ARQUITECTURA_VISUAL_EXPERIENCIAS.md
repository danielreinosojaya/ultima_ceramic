# 🏗️ ARQUITECTURA VISUAL - SISTEMA DE EXPERIENCIAS

**Propósito:** Visualizar cómo se conectan todos los componentes  
**Formato:** ASCII diagrams + explicaciones  
**Actualizado:** 30 Nov 2025

---

## 📊 FLUJO GENERAL DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USUARIO FINAL (Cliente)                        │
│                                                                          │
│  Visita: www.ultimaceramic.com                                         │
│  Ve: "¿QUÉ QUIERES HACER HOY?"                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                ┌───────────────────┼───────────────────┐
                ↓                   ↓                   ↓
        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │   INDIVIDUAL │    │     GRUPO    │    │ EXPERIENCIA  │
        │   (Existente)│    │  ✨ NUEVO    │    │ ✨ NUEVO     │
        └──────────────┘    └──────────────┘    └──────────────┘
                │                   │                   │
                │ WelcomeSelector   │ GroupWizard      │ PieceWizard
                │ (flow actual)     │ (4 pasos)        │ (4 pasos)
                │                   │                  │
                └───────────────────┼──────────────────┘
                                    ↓
                        ┌──────────────────────────┐
                        │  UserInfoModal + Payment │
                        │    (existentes)          │
                        └──────────────────────────┘
                                    ↓
                    ┌───────────────┴────────────────┐
                    │                                │
                    ↓ POST /api/bookings             ↓
                    │ booking_type='group'           │ booking_type='experience'
        ┌───────────────────────┐       ┌────────────────────────┐
        │ groupBookingsMetadata  │       │ experienceBookingsMetadata
        │ (Metadata tablas)      │       │ (Metadata tabla)
        │                        │       │ + experienceConfirmations
        │ ✓ Inmediata confirmación       │ ✓ Pendiente confirmación
        │ ✓ Email confirmación           │ ✓ Email "en revisión"
        └────────────┬──────────┘       └──────────┬─────────────┘
                     │                             │
                     │ ✓ Confirmado               │ ⏳ Pendiente
                     │   Email enviado            │   Admin revisa
                     │                            │   (24h máximo)
                     │                            ↓
                     │                   ┌──────────────────────┐
                     │                   │ AdminPanel:          │
                     │                   │ ExperienceConfirm    │
                     │                   │                      │
                     │                   │ [CONFIRMAR]          │
                     │                   │ [RECHAZAR]           │
                     │                   │ [ALTERNATIVA]        │
                     │                   └────────┬─────────────┘
                     │                            │
                     │                  ┌─────────┴──────────┐
                     │                  ↓                    ↓
                     │          ✓ Confirmado        ✗ Rechazado
                     │          Email confirmado    Email rechazo
                     │          Status='confirmed'  + Reembolso
                     │
                     └────────────────┬──────────────────────┘
                                      ↓
                            ┌──────────────────────┐
                            │ ConfirmationPage     │
                            │ "Tu reserva está ok" │
                            └──────────────────────┘
```

---

## 🗄️ ARQUITECTURA BASE DE DATOS

```
┌─────────────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────┐                            │
│  │         bookings (existente)   │                            │
│  ├────────────────────────────────┤                            │
│  │ id (UUID)                      │                            │
│  │ product_id                     │                            │
│  │ user_info (JSONB)              │                            │
│  │ created_at                     │                            │
│  │ is_paid                        │                            │
│  │ price                          │                            │
│  │ ┌──────────────────────────┐   │                            │
│  │ │ NUEVAS COLUMNAS:         │   │                            │
│  │ │ • booking_type ✨        │   │ ──────┐                  │
│  │ │   (individual|group|exp) │   │       │                  │
│  │ │ • experience_conf_id ✨  │   │       │                  │
│  │ │   (references exp_conf)  │   │       │                  │
│  │ └──────────────────────────┘   │       │                  │
│  └────────────────────────────────┘       │                  │
│         │                    │            │                  │
│         │                    └─────────┐  │                  │
│         │                              │  │                  │
│  ┌──────┴──────────────┐    ┌──────────┴──┼──────────────┐   │
│  │                     │    │             │              │   │
│  ↓                     ↓    ↓             ↓              ↓   │
│
│  ┌───────────────────┐ ┌─────────────────────────┐      
│  │ group_bookings_   │ │ experience_bookings_    │      
│  │ metadata (NUEVA)  │ │ metadata (NUEVA)        │      
│  ├───────────────────┤ ├─────────────────────────┤      
│  │ id (UUID)         │ │ id (UUID)               │      
│  │ booking_id (FK)   │ │ booking_id (FK)         │      
│  │ attendee_count    │ │ pieces (JSONB array)    │      
│  │ attendee_names    │ │ total_piece_cost        │      
│  │ group_capacity    │ │ guided_duration_min     │      
│  │ lead_email        │ │ guided_cost             │      
│  │ notes             │ │ special_notes           │      
│  │ created_at        │ │ created_at              │      
│  └───────────────────┘ └─────────────────────────┘      
│         ↑                           ↑
│         │                           │
│         └─────────────┬─────────────┘
│                       │
│    ┌──────────────────┴────────────────────┐
│    │                                       │
│    ↓                                       ↓
│    
│  ┌──────────────────────────────┐   ┌─────────────────────┐
│  │ pieces (NUEVA)               │   │ experience_         │
│  ├──────────────────────────────┤   │ confirmations       │
│  │ id (UUID)                    │   │ (NUEVA)             │
│  │ category (small|med|large)   │   ├─────────────────────┤
│  │ name                         │   │ id (UUID)           │
│  │ description                  │   │ booking_id (FK)     │
│  │ base_price                   │   │ status              │
│  │ image_url                    │   │ (pending|conf|rej)  │
│  │ available_quantity           │   │ confirmed_at        │
│  │ is_active                    │   │ confirmed_by        │
│  │ created_at                   │   │ rejection_reason    │
│  │ updated_at                   │   │ notes               │
│  └──────────────────────────────┘   │ created_at          │
│         ↑                           │                     │
│         │                           └─────────────────────┘
│         │
│         │ Referenced by:
│         │ pieces.id ← experience_bookings_metadata.pieces[]
│
└─────────────────────────────────────────────────────────────────┘

ÍNDICES PRINCIPALES:
├─ bookings: idx_bookings_type, idx_bookings_experience_confirmation_id
├─ pieces: idx_pieces_category, idx_pieces_active
├─ group_bookings_metadata: idx_group_bookings_booking_id
├─ experience_bookings_metadata: idx_experience_bookings_booking_id
└─ experience_confirmations: idx_experience_confirmations_status
```

---

## 🖥️ ARQUITECTURA FRONTEND (REACT)

```
┌────────────────────────────────────────────────────────────────────┐
│                         App.tsx (root)                            │
│                                                                    │
│  State:                                                            │
│  • experienceType: 'individual'|'group'|'experience'|null         │
│  • view: AppView                                                   │
│  • bookingDetails: BookingDetails                                 │
│  • confirmedBooking: Booking|null                                 │
└────────────────────────────────────────────────────────────────────┘
                                ↓
              ┌─────────────────┼─────────────────┐
              ↓                 ↓                 ↓
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐
│ Header (existente)   │  │ Main Content         │  │ Footer       │
│                      │  │ (switches por view)  │  │ (existente)  │
│ • Botón nav          │  └──────────────────────┘  └──────────────┘
│ • "RESERVA AHORA"    │
└──────────────────────┘

COMPONENTES PRINCIPALES:
┌─────────────────────────────────────────────────────────────┐
│  ExperienceTypeSelector ✨ (NUEVO)                         │
│  └─ Muestra 3 opciones: Individual | Grupo | Experiencia  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  if experienceType === 'group':                            │
│                                                              │
│  GroupClassWizard ✨ (NUEVO - Orquestador)                │
│  ├─ Step 1: GroupClassTypeSelector                         │
│  │   └─ Selecciona: Basic | Quick | Advanced              │
│  ├─ Step 2: GroupAttendeeForm                              │
│  │   ├─ Spinner: cantidad (2-6)                           │
│  │   └─ Textarea: nombres (opcional)                       │
│  ├─ Step 3: GroupScheduleSelector                          │
│  │   ├─ DatePicker: próximos 14 días                      │
│  │   └─ Radio buttons: horarios (filtrados por capacidad) │
│  └─ Step 4: GroupBookingSummary                            │
│      └─ Review de toda la reserva                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  if experienceType === 'experience':                       │
│                                                              │
│  PieceExperienceWizard ✨ (NUEVO - Orquestador)           │
│  ├─ Step 1: PieceCategorySelector                          │
│  │   └─ Radio: small | medium | large | diy              │
│  ├─ Step 2: PieceSelector                                  │
│  │   ├─ Grid de tarjetas con imagen                       │
│  │   └─ Spinner de cantidad por pieza                     │
│  ├─ Step 3: ExperienceDurationSelector                     │
│  │   ├─ Radio: 0 min | 60 min | 120 min                  │
│  │   └─ Muestra precio por duración                        │
│  └─ Step 4: ExperienceBookingSummary                       │
│      ├─ Review de piezas                                   │
│      ├─ Review de guía                                     │
│      ├─ Review de precio total                             │
│      └─ Textarea: notas especiales (opcional)              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  if experienceType === 'individual':                       │
│                                                              │
│  WelcomeSelector (existente - sin cambios)                │
│  └─ Flow actual mantiene igual                             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Modales reutilizables (existentes):                       │
│  ├─ UserInfoModal (personalización)                        │
│  ├─ PaymentInfo (tarjeta/transferencia)                    │
│  ├─ ConfirmationPage (resumen final)                       │
│  └─ PolicyModal (términos)                                 │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Admin Panel (en AdminConsole):                            │
│  ├─ AdminExperienceConfirmationPanel ✨ (NUEVO)           │
│  │   ├─ Lista de experiencias pendientes                  │
│  │   ├─ Verificación de piezas disponibles                │
│  │   ├─ Botones: [CONFIRMAR] [RECHAZAR] [ALTERNATIVA]   │
│  │   └─ Email automático al cliente                        │
│  │                                                          │
│  └─ PiecesManagementPanel ✨ (NUEVO)                       │
│      ├─ CRUD de piezas                                     │
│      ├─ Categorías: small | medium | large | diy         │
│      ├─ Upload de imágenes                                 │
│      ├─ Toggle active/inactive                             │
│      └─ Bulk operations                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 ARQUITECTURA APIs

```
┌─────────────────────────────────────────────────────────────┐
│                  Backend APIs (/api)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PIEZAS (Catálogo)                                          │
│  ├─ GET /api/pieces                                        │
│  │  Query: ?category=small&isActive=true                   │
│  │  Returns: [{ id, name, basePrice, imageUrl, ... }]    │
│  │                                                          │
│  ├─ POST /api/pieces (Admin)                              │
│  │  Headers: { 'admin-code': '...' }                       │
│  │  Body: { category, name, price, imageUrl, ... }       │
│  │  Returns: { id, name, ... }                            │
│  │                                                          │
│  ├─ PUT /api/pieces/:id (Admin)                           │
│  │  Headers: { 'admin-code': '...' }                       │
│  │  Body: { name, price, ... }                            │
│  │  Returns: { id, ... }                                  │
│  │                                                          │
│  └─ DELETE /api/pieces/:id (Admin - Soft delete)         │
│     Headers: { 'admin-code': '...' }                       │
│     Returns: { id, is_active: false }                      │
│                                                              │
│  ──────────────────────────────────────────────────────    │
│                                                              │
│  CÁLCULO DE PRECIOS                                         │
│  └─ POST /api/experience-pricing                           │
│     Body: {                                                 │
│       pieces: [{ pieceId, quantity }],                      │
│       guidedDurationMinutes: 0|60|120                       │
│     }                                                       │
│     Returns: {                                              │
│       pieces: { total, breakdown },                         │
│       guided: { durationMinutes, cost, label },            │
│       total: number                                         │
│     }                                                       │
│                                                              │
│  ──────────────────────────────────────────────────────    │
│                                                              │
│  CONFIRMACIONES DE EXPERIENCIAS (Admin)                     │
│  ├─ GET /api/experience-confirmations                      │
│  │  Headers: { 'admin-code': '...' }                       │
│  │  Returns: [{                                             │
│  │    id, bookingId, status, createdAt,                    │
│  │    bookingDetails, userInfo                             │
│  │  }]                                                      │
│  │                                                          │
│  ├─ POST /api/bookings/:id/confirm-experience (Admin)     │
│  │  Headers: { 'admin-code': '...' }                       │
│  │  Body: { adminEmail, notes }                            │
│  │  Returns: { status: 'confirmed', confirmedAt }         │
│  │  Action: Email experienceConfirmed enviado             │
│  │                                                          │
│  └─ POST /api/bookings/:id/reject-experience (Admin)      │
│     Headers: { 'admin-code': '...' }                       │
│     Body: { reason }                                        │
│     Returns: { status: 'rejected', rejectionReason }      │
│     Action: Email experienceRejected + Refund initiated   │
│                                                              │
│  ──────────────────────────────────────────────────────    │
│                                                              │
│  BOOKINGS (Modificado)                                      │
│  └─ POST /api/bookings                                     │
│     Body: {                                                 │
│       bookingType: 'individual'|'group'|'experience',      │
│       product,                                              │
│       userInfo,                                             │
│       slots: [{ date, time, instructorId }],              │
│       price,                                                │
│       // Si grupo:                                          │
│       attendeeCount, attendeeNames, leadEmail,             │
│       // Si experiencia:                                    │
│       pieces, guidedDurationMinutes, specialNotes          │
│     }                                                       │
│     Action:                                                 │
│       • Insert en bookings { booking_type }               │
│       • Si grupo: insert en group_bookings_metadata       │
│       • Si exp: insert metadata + experience_confirmations│
│       • Email enviado (confirmation o pending)             │
│                                                              │
│  ──────────────────────────────────────────────────────    │
│                                                              │
│  CAPACIDAD HORARIA                                          │
│  └─ GET /api/schedule/capacity                             │
│     Query: ?date=2025-12-14&bookingType=group             │
│             &attendeeCount=3                                │
│     Returns: [{                                             │
│       time: '10:00',                                        │
│       capacity: 6,                                          │
│       availableFor: 3 // true if fits                       │
│     }]                                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📧 SISTEMA DE EMAILS

```
┌─────────────────────────────────────────────────────────────┐
│              Email Templates (Resend API)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BOOKING CLASE GRUPAL (Inmediato después de pago)          │
│  ├─ Sent to: cliente email                                 │
│  ├─ CC: lead email + otros asistentes                      │
│  ├─ Subject: "¡Confirmado! Tu clase grupal"               │
│  ├─ Content:                                                │
│  │  • Detalles clase (tipo, fecha, hora, duración)        │
│  │  • Lista de asistentes                                  │
│  │  • Total pagado                                         │
│  │  • Ubicación + instrucciones                            │
│  │  • Link: "Ver mi reserva"                               │
│  │  • Link: "Reagendar" (si aplica)                        │
│  └─ Status: ✓ Confirmado inmediatamente                   │
│                                                              │
│  ──────────────────────────────────────────────────────    │
│                                                              │
│  BOOKING EXPERIENCIA - PENDIENTE (Inmediato después pago)  │
│  ├─ Sent to: cliente email                                 │
│  ├─ Subject: "Tu experiencia está siendo procesada"       │
│  ├─ Content:                                                │
│  │  • Piezas seleccionadas + precios                       │
│  │  • Total pagado                                         │
│  │  • "Nuestro equipo verifica disponibilidad en 24h"     │
│  │  • Link: "Seguir estado"                                │
│  │  • Link: "Contactar" (WhatsApp/email)                   │
│  └─ Status: ⏳ Pendiente confirmación admin                │
│                                                              │
│  ──────────────────────────────────────────────────────    │
│                                                              │
│  BOOKING EXPERIENCIA - CONFIRMADA (Admin confirma)         │
│  ├─ Sent to: cliente email                                 │
│  ├─ Subject: "¡Confirmado! Tu experiencia personalizada"  │
│  ├─ Content:                                                │
│  │  • ✓ Disponibilidad verificada                          │
│  │  • Piezas confirmadas + precios                         │
│  │  • Fecha + hora + duración                              │
│  │  • Qué esperar (paso a paso)                            │
│  │  • Tips para la experiencia                             │
│  │  • Link: "Ver mi reserva"                               │
│  │  • Link: "Cancelar/Reagendar" (si aplica)              │
│  └─ Status: ✓ Confirmado por equipo                        │
│                                                              │
│  ──────────────────────────────────────────────────────    │
│                                                              │
│  BOOKING EXPERIENCIA - RECHAZADA (Admin rechaza)           │
│  ├─ Sent to: cliente email                                 │
│  ├─ Subject: "Actualización sobre tu experiencia"        │
│  ├─ Content:                                                │
│  │  • ❌ No se pudo confirmar                             │
│  │  • Razón específica (pieza no disponible, etc)         │
│  │  • Alternativas (otras piezas, otras fechas)           │
│  │  • "Tu dinero ha sido reembolsado"                      │
│  │  • Link: "Contactar para otra opción"                   │
│  │  • Link: "Ver piezas disponibles"                       │
│  └─ Status: ✗ Rechazado + Reembolso iniciado              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUJO DE DATOS (Data Flow)

```
CLASE GRUPAL:
─────────────

Cliente                      Frontend                    Backend
   │                            │                          │
   │─ Click "Grupal" ────────────→ ExperienceTypeSelector  │
   │                            │                          │
   │                     GroupClassWizard                   │
   │─ Select tipo ───────────────→ POST /api/bookings ────→│
   │─ Qty + nombres              │                     DB: bookings
   │─ Date + hora                │                     DB: group_metadata
   │                            │←─ JSON response ────│
   │                            │                     ✓ Created
   │─ Review ────────────────────→ POST /api/bookings ────→│
   │─ Click "Confirmar Pago"      │                     DB: bookings updated
   │                   ┌──────────────→ Stripe ──────────→ Payment
   │                   │          │                     Processor
   │←──────────────────┴──────────────┤                 ✓ Charge success
   │                            │←────────────────────→|
   │ ✓ Email confirmación       │                     Email sent
   │ ✓ Mi Reserva visible       └──────────────────────────┘


EXPERIENCIA PERSONALIZADA:
──────────────────────────

Cliente                      Frontend                    Backend
   │                            │                          │
   │─ Click "Experiencia" ───────→ ExperienceTypeSelector  │
   │                            │                          │
   │                   PieceExperienceWizard                │
   │─ Select categoría ─────────→ GET /api/pieces ────────→│
   │                            │←────────────────────│ [pieces]
   │                  Render grid of pieces          │
   │                            │                     │
   │─ Select pieces + qty ──────→ POST /api/experience-pricing
   │                            │←────────────────────│ { total, breakdown }
   │                            │                     │
   │─ Select duración ─────────→ POST /api/experience-pricing (again)
   │                            │←────────────────────│ { total con guía }
   │                            │                     │
   │─ Review + notas ──────────→ POST /api/bookings ────→│
   │─ Click "Reservar"          │                     DB: bookings
   │                   ┌──────────────→ Stripe ─────→ Payment
   │                   │          │                    Processor
   │←──────────────────┴──────────────→ experience_confirmations
   │ ⏳ Email "pendiente"       │                     (status: pending)
   │ ⏳ Mi Reserva en "pendiente"     Email sent
   │                            │←────────────────────┘
   │
   │ [24 horas máximo]
   │
   │ ADMIN REVISA:
   │ (en AdminExperienceConfirmationPanel)
   │
   │─ Admin ve pendientes ──────→ GET /api/experience-confirmations
   │─ Admin confirma/rechaza    ┌─→ POST /api/bookings/:id/confirm-experience
   │                            │   o POST /api/bookings/:id/reject-experience
   │                            │
   │←─ Email confirmado/rechazado──│
   │
   │ Si ✓ Confirmado:           │   DB: experience_confirmations
   │ ✓ Mi Reserva visible       └───────→ (status: confirmed)
   │ ✓ Instrucciones email      │
   │                            └──────────────────────────┘
   │
   │ Si ✗ Rechazado:
   │ ✓ Reembolso iniciado
   │ ✓ Email con alternativas
   │ ✓ Oferta de otra fecha/pieza
```

---

## 🔐 SECURITY LAYERS

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION & AUTHORIZATION             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Admin Endpoints:                                            │
│  ├─ POST /api/pieces (CREATE)                               │
│  ├─ PUT /api/pieces/:id (UPDATE)                            │
│  ├─ DELETE /api/pieces/:id (DELETE)                         │
│  ├─ GET /api/experience-confirmations                       │
│  └─ POST /api/bookings/:id/confirm-experience              │
│                                                               │
│  Validation:                                                 │
│  ├─ Headers: { 'admin-code': process.env.ADMIN_CODE }      │
│  ├─ If missing → 401 Unauthorized                           │
│  ├─ If wrong → 401 Unauthorized                             │
│  └─ Logging: Todas las acciones loguedas                    │
│                                                               │
│  ──────────────────────────────────────────────────────    │
│                                                               │
│  Price Validation:                                          │
│  ├─ Backend CALCULA precio (no confía frontend)            │
│  ├─ Get piezas de BD, multiply by qty                       │
│  ├─ Add guided cost from GUIDED_DURATION_OPTIONS            │
│  ├─ Compare con precio enviado desde cliente               │
│  ├─ If mismatch → 400 Bad Request                          │
│  └─ Logging: Discrepancias loguedas para audit             │
│                                                               │
│  ──────────────────────────────────────────────────────    │
│                                                               │
│  Inventory Check:                                           │
│  ├─ Before confirming: SELECT * FROM pieces WHERE id = ?   │
│  ├─ Check: available_quantity >= requested_qty             │
│  ├─ If not available → 400 Out of stock                    │
│  ├─ Soft lock: No double-booking (pending confirmations)   │
│  └─ Logging: Stock changes tracked                         │
│                                                               │
│  ──────────────────────────────────────────────────────    │
│                                                               │
│  Payment Enforcement:                                       │
│  ├─ Before creating booking: is_paid = true                │
│  ├─ Verify Stripe charge succeeded                         │
│  ├─ If payment fails → 402 Payment Required                │
│  └─ Booking NOT created until payment confirmed            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 STATE MANAGEMENT FLOW

```
App.tsx (root state)
│
├─ experienceType: 'individual' | 'group' | 'experience' | null
│
├─ view: AppView
│  └─ experience_type_selector
│  └─ group_class_wizard
│  └─ piece_experience_wizard
│  └─ confirmation
│  └─ ... (existentes)
│
├─ bookingDetails: BookingDetails
│  ├─ product: Product | null
│  ├─ slots: TimeSlot[]
│  ├─ userInfo: UserInfo | null
│  └─ technique?: Technique
│
├─ confirmedBooking: Booking | null
│  ├─ bookingType: 'individual' | 'group' | 'experience'
│  ├─ Si grupo:
│  │  ├─ attendeeCount
│  │  ├─ attendeeNames[]
│  │  └─ leadEmail
│  ├─ Si experiencia:
│  │  ├─ pieces[]
│  │  ├─ guidedDurationMinutes
│  │  └─ experienceConfirmationId
│  └─ ... (campos comunes)
│
├─ giftcardPaid: boolean (existente)
├─ isAdmin: boolean (existente)
└─ ... (otros states existentes)

Flujos de actualización:
├─ setExperienceType('group')
│  └─ setView('group_class_wizard')
│
├─ setBookingDetails({ ...group data })
│  └─ Se ejecuta al completar el wizard
│
├─ setConfirmedBooking(booking)
│  └─ Después de POST /api/bookings exitoso
│  └─ setView('confirmation')
│
└─ Reset en "Atrás":
   └─ setExperienceType(null)
   └─ setBookingDetails({ product: null, ... })
```

---

## 🎯 COMPONENTES REUTILIZABLES vs NUEVOS

```
EXISTENTES (Reutilizar):
├─ Header
├─ WelcomeSelector
├─ TechniqueSelector
├─ PackageSelector
├─ ScheduleSelector
├─ UserInfoModal
├─ PaymentInfo
├─ BookingSummary
├─ ConfirmationPage
├─ AdminConsole
└─ ... (otros)

NUEVOS ✨ (Crear):
├─ ExperienceTypeSelector
│  └─ Punto de entrada principal
│
├─ Flujo Grupo (5 componentes):
│  ├─ GroupClassWizard (orquestador)
│  ├─ GroupClassTypeSelector (step 1)
│  ├─ GroupAttendeeForm (step 2)
│  ├─ GroupScheduleSelector (step 3)
│  └─ GroupBookingSummary (step 4)
│
├─ Flujo Experiencia (5 componentes):
│  ├─ PieceExperienceWizard (orquestador)
│  ├─ PieceCategorySelector (step 1)
│  ├─ PieceSelector (step 2)
│  ├─ ExperienceDurationSelector (step 3)
│  └─ ExperienceBookingSummary (step 4)
│
└─ Admin (2 componentes):
   ├─ AdminExperienceConfirmationPanel
   └─ PiecesManagementPanel

MODIFICAR:
├─ App.tsx (agregar routes + state)
├─ types.ts (agregar tipos)
├─ constants.ts (agregar configs)
├─ api/db.ts (agregar funciones)
└─ api/bookings.ts (agregar lógica bookingType)
```

---

## 📈 SCALING CONSIDERATIONS

```
Fase 1 (Actual):
├─ Clase individual (1 persona)
├─ Clase grupal (2-8 personas)
└─ Experiencia personalizada (piezas)

Fase 2 (Futuro):
├─ Tour del estudio
├─ Masterclasses (grupos especiales)
├─ Eventos privados (corporativos)
└─ Subscription model (acceso ilimitado)

Fase 3 (Futuro):
├─ Mobile app
├─ Marketplace de piezas (clientes venden sus creaciones)
└─ Social sharing (Instagram integration)

Consideraciones:
├─ BD: Agregar sharding si > 100k bookings/mes
├─ APIs: Rate limiting ya pensado
├─ Cache: Redis para piezas populares
└─ Analytics: Track conversión por tipo de experiencia
```

---

**Última actualización:** 30 Nov 2025 | Versión: 1.0

