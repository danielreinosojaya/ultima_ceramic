# 🛠️ GUÍA DE IMPLEMENTACIÓN PASO A PASO

**Objetivo:** Roadmap claro para implementar sin errores  
**Duración estimada:** 3-4 semanas  
**Versión:** 1.0  

---

## 📋 TABLA DE CONTENIDOS

1. [Fase 1: Base de Datos](#fase-1-base-de-datos)
2. [Fase 2: Tipos TypeScript](#fase-2-tipos-typescript)
3. [Fase 3: APIs Backend](#fase-3-apis-backend)
4. [Fase 4: Componentes UI](#fase-4-componentes-ui)
5. [Fase 5: Integración](#fase-5-integración)
6. [Fase 6: Emails](#fase-6-emails)
7. [Fase 7: Testing](#fase-7-testing)
8. [Checklists de Calidad](#checklists-de-calidad)

---

## FASE 1: BASE DE DATOS

**Duración:** 2-3 horas  
**Archivos:** `api/db.ts`, migrations/

### Paso 1.1: Crear Migración SQL

Crear archivo: `migrations/001_add_experiences.sql`

```sql
-- ====================================
-- EXPERIENCIAS PERSONALIZADAS
-- ====================================

-- Tabla de piezas disponibles
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT category_check CHECK (category IN ('small', 'medium', 'large', 'diy'))
);

-- Índices
CREATE INDEX idx_pieces_category ON pieces(category);
CREATE INDEX idx_pieces_active ON pieces(is_active);
CREATE INDEX idx_pieces_created_at ON pieces(created_at DESC);

-- ====================================
-- CLASES GRUPALES
-- ====================================

-- Metadatos de clases grupales (referencia a bookings)
CREATE TABLE IF NOT EXISTS group_bookings_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE,
    attendee_count INT NOT NULL,
    attendee_names JSONB,  -- Array de nombres
    group_capacity_limit INT NOT NULL,
    lead_email VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT attendee_count_check CHECK (attendee_count >= 2 AND attendee_count <= 8)
);

CREATE INDEX idx_group_bookings_booking_id ON group_bookings_metadata(booking_id);

-- ====================================
-- EXPERIENCIAS PERSONALIZADAS
-- ====================================

-- Metadatos de experiencias (referencia a bookings)
CREATE TABLE IF NOT EXISTS experience_bookings_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE,
    pieces JSONB NOT NULL,  -- [{piece_id, piece_name, quantity, unit_price}]
    total_piece_cost NUMERIC(10, 2) NOT NULL,
    guided_duration_minutes INT NOT NULL,
    guided_cost NUMERIC(10, 2) NOT NULL,
    special_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT duration_check CHECK (guided_duration_minutes IN (0, 60, 120))
);

CREATE INDEX idx_experience_bookings_booking_id ON experience_bookings_metadata(booking_id);

-- ====================================
-- CONFIRMACIÓN DE EXPERIENCIAS
-- ====================================

-- Tabla de control: experiencias pendientes confirmación
CREATE TABLE IF NOT EXISTS experience_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    confirmed_at TIMESTAMPTZ,
    confirmed_by VARCHAR(255),
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT status_check CHECK (status IN ('pending', 'confirmed', 'rejected'))
);

CREATE INDEX idx_experience_confirmations_status ON experience_confirmations(status);
CREATE INDEX idx_experience_confirmations_booking_id ON experience_confirmations(booking_id);

-- ====================================
-- ALTERACIONES A TABLA EXISTENTE
-- ====================================

-- Agregar columnas a bookings existente
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS experience_confirmation_id UUID,
ADD CONSTRAINT booking_type_check CHECK (booking_type IN ('individual', 'group', 'experience'));

CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_experience_confirmation_id ON bookings(experience_confirmation_id);

-- ====================================
-- SEED DATA (Ejemplo de piezas)
-- ====================================

INSERT INTO pieces (category, name, description, base_price, available_quantity, is_active) VALUES
-- Piezas Pequeñas
('small', 'Taza Cerámica Blanca', 'Taza pintable en blanco liso', 12.00, 50, true),
('small', 'Plato Decorativo Blanco', 'Plato para decorar', 15.00, 30, true),
('small', 'Jarrita Pequeña Blanca', 'Pequeña jarrita para pintar', 18.00, 20, true),
('small', 'Vasito Pintado Rosa', 'Vasito pequeño', 14.00, 40, true),
('small', 'Bowl Pequeño Blanco', 'Bowl decorativo', 13.00, 30, true),
-- Piezas Medianas
('medium', 'Jarrón Alto Blanco', 'Jarrón para flores', 25.00, 15, true),
('medium', 'Maceta Decorativa Blanca', 'Maceta para plantas', 28.00, 15, true),
('medium', 'Vaso Custom Blanco', 'Vaso personalizable', 22.00, 20, true),
-- Piezas Grandes
('large', 'Plato Grande Decorativo', 'Plato grande para decoración', 40.00, 10, true),
('large', 'Vaso Oversized Blanco', 'Vaso muy grande', 45.00, 5, true)
ON CONFLICT DO NOTHING;

-- ====================================
-- VERIFICACIÓN
-- ====================================

-- Queries para verificar
-- SELECT * FROM pieces;
-- SELECT * FROM group_bookings_metadata;
-- SELECT * FROM experience_bookings_metadata;
-- SELECT * FROM experience_confirmations;
```

### Paso 1.2: Actualizar `api/db.ts`

Agregar en SCHEMA_SQL dentro de db.ts:

```typescript
// En el SCHEMA_SQL, agregar antes de la línea de certidumbre del schema

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

CREATE INDEX IF NOT EXISTS idx_pieces_category ON pieces(category);
CREATE INDEX IF NOT EXISTS idx_pieces_active ON pieces(is_active);

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

CREATE INDEX IF NOT EXISTS idx_group_bookings_booking_id ON group_bookings_metadata(booking_id);

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

CREATE INDEX IF NOT EXISTS idx_experience_bookings_booking_id ON experience_bookings_metadata(booking_id);

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

CREATE INDEX IF NOT EXISTS idx_experience_confirmations_status ON experience_confirmations(status);
```

También agregar en `bookings` CREATE TABLE:

```typescript
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'individual';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS experience_confirmation_id UUID;
```

### Paso 1.3: Agregar Funciones de Acceso a BD

Agregar a `api/db.ts`:

```typescript
// ===== PIECES =====
export async function getAllPieces(filters?: { category?: string; isActive?: boolean }) {
    let query = sql`SELECT * FROM pieces WHERE 1=1`;
    
    if (filters?.category) {
        query = sql`${query} AND category = ${filters.category}`;
    }
    if (filters?.isActive !== undefined) {
        query = sql`${query} AND is_active = ${filters.isActive}`;
    }
    
    query = sql`${query} ORDER BY category, name`;
    const { rows } = await query;
    return rows;
}

export async function getPieceById(pieceId: string) {
    const { rows } = await sql`SELECT * FROM pieces WHERE id = ${pieceId}`;
    return rows[0];
}

export async function createPiece(piece: {
    category: string;
    name: string;
    description?: string;
    basePrice: number;
    imageUrl?: string;
    availableQuantity?: number;
}) {
    const { rows } = await sql`
        INSERT INTO pieces (category, name, description, base_price, image_url, available_quantity)
        VALUES (${piece.category}, ${piece.name}, ${piece.description || null}, 
                ${piece.basePrice}, ${piece.imageUrl || null}, ${piece.availableQuantity || 999})
        RETURNING *
    `;
    return rows[0];
}

export async function updatePiece(pieceId: string, updates: Partial<typeof piece>) {
    const setClauses: string[] = [];
    const values: any[] = [];
    
    if (updates.name !== undefined) setClauses.push(`name = $${values.length + 1}`), values.push(updates.name);
    if (updates.basePrice !== undefined) setClauses.push(`base_price = $${values.length + 1}`), values.push(updates.basePrice);
    if (updates.imageUrl !== undefined) setClauses.push(`image_url = $${values.length + 1}`), values.push(updates.imageUrl);
    if (updates.availableQuantity !== undefined) setClauses.push(`available_quantity = $${values.length + 1}`), values.push(updates.availableQuantity);
    
    setClauses.push(`updated_at = NOW()`);
    values.push(pieceId);
    
    const queryString = `UPDATE pieces SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`;
    const { rows } = await sql.raw(queryString, values);
    return rows[0];
}

export async function deletePiece(pieceId: string) {
    const { rows } = await sql`
        UPDATE pieces SET is_active = false WHERE id = ${pieceId} RETURNING *
    `;
    return rows[0];
}

// ===== GROUP BOOKINGS =====
export async function createGroupBookingMetadata(metadata: {
    bookingId: string;
    attendeeCount: number;
    attendeeNames?: string[];
    groupCapacityLimit: number;
    leadEmail: string;
    notes?: string;
}) {
    const { rows } = await sql`
        INSERT INTO group_bookings_metadata (booking_id, attendee_count, attendee_names, group_capacity_limit, lead_email, notes)
        VALUES (${metadata.bookingId}, ${metadata.attendeeCount}, ${JSON.stringify(metadata.attendeeNames || [])}, 
                ${metadata.groupCapacityLimit}, ${metadata.leadEmail}, ${metadata.notes || null})
        RETURNING *
    `;
    return rows[0];
}

export async function getGroupBookingMetadata(bookingId: string) {
    const { rows } = await sql`SELECT * FROM group_bookings_metadata WHERE booking_id = ${bookingId}`;
    return rows[0];
}

// ===== EXPERIENCE BOOKINGS =====
export async function createExperienceBookingMetadata(metadata: {
    bookingId: string;
    pieces: Array<{ pieceId: string; pieceName: string; quantity: number; unitPrice: number }>;
    totalPieceCost: number;
    guidedDurationMinutes: number;
    guidedCost: number;
    specialNotes?: string;
}) {
    const { rows } = await sql`
        INSERT INTO experience_bookings_metadata (booking_id, pieces, total_piece_cost, guided_duration_minutes, guided_cost, special_notes)
        VALUES (${metadata.bookingId}, ${JSON.stringify(metadata.pieces)}, ${metadata.totalPieceCost}, 
                ${metadata.guidedDurationMinutes}, ${metadata.guidedCost}, ${metadata.specialNotes || null})
        RETURNING *
    `;
    return rows[0];
}

export async function getExperienceBookingMetadata(bookingId: string) {
    const { rows } = await sql`SELECT * FROM experience_bookings_metadata WHERE booking_id = ${bookingId}`;
    return rows[0];
}

// ===== EXPERIENCE CONFIRMATIONS =====
export async function createExperienceConfirmation(bookingId: string) {
    const { rows } = await sql`
        INSERT INTO experience_confirmations (booking_id, status)
        VALUES (${bookingId}, 'pending')
        RETURNING *
    `;
    return rows[0];
}

export async function getPendingExperienceConfirmations() {
    const { rows } = await sql`
        SELECT ec.*, eb.*, b.user_info, b.created_at 
        FROM experience_confirmations ec
        JOIN experience_bookings_metadata eb ON eb.booking_id = ec.booking_id
        JOIN bookings b ON b.id = ec.booking_id
        WHERE ec.status = 'pending'
        ORDER BY ec.created_at DESC
    `;
    return rows;
}

export async function confirmExperienceBooking(bookingId: string, adminEmail: string, notes?: string) {
    const { rows } = await sql`
        UPDATE experience_confirmations 
        SET status = 'confirmed', confirmed_at = NOW(), confirmed_by = ${adminEmail}, notes = ${notes || null}
        WHERE booking_id = ${bookingId}
        RETURNING *
    `;
    return rows[0];
}

export async function rejectExperienceBooking(bookingId: string, reason: string) {
    const { rows } = await sql`
        UPDATE experience_confirmations 
        SET status = 'rejected', rejection_reason = ${reason}
        WHERE booking_id = ${bookingId}
        RETURNING *
    `;
    return rows[0];
}
```

### Paso 1.4: Verificación

✅ Checklist:
- [ ] Migración SQL ejecutada en BD
- [ ] Tablas creadas con índices
- [ ] Funciones db.ts implementadas y compiladas
- [ ] Seed data insertado (piezas de ejemplo)
- [ ] Tests manual: `getPieceById` retorna pieza
- [ ] TypeScript sin errores en `api/db.ts`

---

## FASE 2: TIPOS TYPESCRIPT

**Duración:** 1-2 horas  
**Archivo:** `types.ts`

### Paso 2.1: Actualizar AppView

```typescript
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
    | 'experience_summary'         // NUEVO
    | 'techniques'
    | 'packages'
    | 'intro_classes'
    | 'schedule'
    | 'summary'
    | 'group_experience'
    | 'couples_experience'
    | 'team_building'
    | 'confirmation'
    | 'my-classes'
    | 'giftcard_landing'
    | 'giftcard_amount'
    | 'giftcard_personalization'
    | 'giftcard_delivery'
    | 'giftcard_payment'
    | 'giftcard_manual_payment'
    | 'giftcard_pending_review'
    | 'giftcard_confirmation'
    | 'giftcard_check_balance';
```

### Paso 2.2: Agregar enums y tipos nuevos

Insertar en `types.ts` antes de Product definitions:

```typescript
// ==================== ENUMS & LITERALS ====================
export type BookingType = 'individual' | 'group' | 'experience';
export type PieceCategory = 'small' | 'medium' | 'large' | 'diy';
export type ExperienceConfirmationStatus = 'pending' | 'confirmed' | 'rejected';
export type GuidedDurationOption = 0 | 60 | 120;

// ==================== PIECES ====================
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

export interface PieceSelection {
    pieceId: string;
    pieceName: string;
    quantity: number;
    unitPrice: number;
}

export interface PieceCategoryInfo {
    category: PieceCategory;
    displayName: string;
    description: string;
    pieces: Piece[];
}

// ==================== GROUP BOOKING ====================
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

// ==================== EXPERIENCE BOOKING ====================
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

// ==================== GUIDED OPTIONS ====================
export const GUIDED_DURATION_OPTIONS: Array<{
    value: GuidedDurationOption;
    label: string;
    cost: number;
    description: string;
}> = [
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

// ==================== PRODUCT TYPES ====================
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
    basePrice: number;
    details: {
        description: string;
        techniques: string[];
        guidelines: string;
    };
}

// ==================== UPDATE BOOKING INTERFACE ====================
// Actualizar interfaz Booking existente:
export interface Booking {
    // ... existing fields ...
    bookingType: BookingType;
    
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

// ==================== UPDATE PRODUCT TYPE ====================
export type Product = 
    | ClassPackage 
    | OpenStudioSubscription 
    | IntroductoryClass 
    | GroupExperience 
    | CouplesExperience 
    | SingleClass 
    | GroupClass
    | GroupClassProduct
    | PersonalizedExperienceProduct;
```

### Paso 2.3: Verificación

✅ Checklist:
- [ ] TypeScript compila sin errores
- [ ] Todos los tipos nuevos están en types.ts
- [ ] GUIDED_DURATION_OPTIONS constante definida
- [ ] Booking interface actualizada con bookingType
- [ ] No hay warnings de unused imports

---

## FASE 3: APIs BACKEND

**Duración:** 4-6 horas  
**Archivos:** `api/` endpoints

### Paso 3.1: Crear `api/pieces.ts`

```typescript
import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as db from './db';

// GET /api/pieces
export async function getPieces(req: VercelRequest, res: VercelResponse) {
    try {
        const { category, isActive } = req.query;
        
        const filters: any = {};
        if (category) filters.category = String(category);
        if (isActive !== undefined) filters.isActive = isActive === 'true';
        
        const pieces = await db.getAllPieces(filters);
        
        return res.status(200).json({
            success: true,
            pieces
        });
    } catch (error) {
        console.error('Error fetching pieces:', error);
        return res.status(500).json({ error: 'Failed to fetch pieces' });
    }
}

// POST /api/pieces (Admin)
export async function createPiece(req: VercelRequest, res: VercelResponse) {
    try {
        const { adminCode } = req.headers;
        // Verificar admin code
        if (adminCode !== process.env.ADMIN_CODE) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { category, name, description, basePrice, imageUrl, availableQuantity } = req.body;
        
        const piece = await db.createPiece({
            category,
            name,
            description,
            basePrice: parseFloat(basePrice),
            imageUrl,
            availableQuantity: availableQuantity || 999
        });
        
        return res.status(201).json({
            success: true,
            piece
        });
    } catch (error) {
        console.error('Error creating piece:', error);
        return res.status(500).json({ error: 'Failed to create piece' });
    }
}

// PUT /api/pieces/:id (Admin)
export async function updatePiece(req: VercelRequest, res: VercelResponse) {
    try {
        const { adminCode } = req.headers;
        if (adminCode !== process.env.ADMIN_CODE) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { id } = req.query;
        const updates = req.body;
        
        const piece = await db.updatePiece(String(id), updates);
        
        return res.status(200).json({
            success: true,
            piece
        });
    } catch (error) {
        console.error('Error updating piece:', error);
        return res.status(500).json({ error: 'Failed to update piece' });
    }
}

// DELETE /api/pieces/:id (Admin - Soft delete)
export async function deletePiece(req: VercelRequest, res: VercelResponse) {
    try {
        const { adminCode } = req.headers;
        if (adminCode !== process.env.ADMIN_CODE) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { id } = req.query;
        
        const piece = await db.deletePiece(String(id));
        
        return res.status(200).json({
            success: true,
            message: 'Piece deleted',
            piece
        });
    } catch (error) {
        console.error('Error deleting piece:', error);
        return res.status(500).json({ error: 'Failed to delete piece' });
    }
}
```

### Paso 3.2: Crear `api/experience-pricing.ts`

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as db from './db';
import { GUIDED_DURATION_OPTIONS } from '../types';

export async function calculateExperiencePricing(req: VercelRequest, res: VercelResponse) {
    try {
        const { pieces, guidedDurationMinutes } = req.body;
        
        // Validar que hay al menos 1 pieza
        if (!pieces || pieces.length === 0) {
            return res.status(400).json({
                error: 'At least one piece is required'
            });
        }
        
        // Validar duración
        const validDurations = [0, 60, 120];
        if (!validDurations.includes(guidedDurationMinutes)) {
            return res.status(400).json({
                error: 'Invalid guided duration. Allowed: 0, 60, 120 minutes'
            });
        }
        
        // Calcular costo de piezas
        let totalPieceCost = 0;
        const breakdown: any[] = [];
        
        for (const piece of pieces) {
            const pieceData = await db.getPieceById(piece.pieceId);
            
            if (!pieceData) {
                return res.status(404).json({
                    error: `Piece ${piece.pieceId} not found`
                });
            }
            
            if (!pieceData.is_active) {
                return res.status(400).json({
                    error: `Piece ${pieceData.name} is no longer available`
                });
            }
            
            const subtotal = pieceData.base_price * piece.quantity;
            totalPieceCost += subtotal;
            
            breakdown.push({
                name: pieceData.name,
                quantity: piece.quantity,
                unitPrice: pieceData.base_price,
                subtotal
            });
        }
        
        // Obtener costo de guía
        const guidedOption = GUIDED_DURATION_OPTIONS.find(o => o.value === guidedDurationMinutes);
        const guidedCost = guidedOption?.cost || 0;
        
        const total = totalPieceCost + guidedCost;
        
        return res.status(200).json({
            success: true,
            pricing: {
                pieces: {
                    total: totalPieceCost,
                    breakdown
                },
                guided: {
                    durationMinutes: guidedDurationMinutes,
                    cost: guidedCost,
                    label: guidedOption?.label
                },
                total,
                notes: 'Pago 100% anticipado'
            }
        });
    } catch (error) {
        console.error('Error calculating pricing:', error);
        return res.status(500).json({ error: 'Failed to calculate pricing' });
    }
}
```

### Paso 3.3: Crear `api/experience-confirmations.ts`

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as db from './db';
import * as emailService from './emailService';

export async function getPendingConfirmations(req: VercelRequest, res: VercelResponse) {
    try {
        const { adminCode } = req.headers;
        if (adminCode !== process.env.ADMIN_CODE) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const confirmations = await db.getPendingExperienceConfirmations();
        
        return res.status(200).json({
            success: true,
            confirmations,
            count: confirmations.length
        });
    } catch (error) {
        console.error('Error fetching confirmations:', error);
        return res.status(500).json({ error: 'Failed to fetch confirmations' });
    }
}

export async function confirmExperience(req: VercelRequest, res: VercelResponse) {
    try {
        const { adminCode } = req.headers;
        if (adminCode !== process.env.ADMIN_CODE) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { bookingId } = req.query;
        const { adminEmail, notes } = req.body;
        
        // Confirmar en DB
        const confirmation = await db.confirmExperienceBooking(
            String(bookingId),
            adminEmail,
            notes
        );
        
        // Enviar email al cliente
        const booking = await db.getBookingsByCustomerEmail(adminEmail); // Ojo: necesitas función mejor
        // TODO: Enviar email con detalles de confirmación
        
        return res.status(200).json({
            success: true,
            message: 'Experience confirmed',
            confirmation
        });
    } catch (error) {
        console.error('Error confirming experience:', error);
        return res.status(500).json({ error: 'Failed to confirm experience' });
    }
}

export async function rejectExperience(req: VercelRequest, res: VercelResponse) {
    try {
        const { adminCode } = req.headers;
        if (adminCode !== process.env.ADMIN_CODE) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { bookingId } = req.query;
        const { reason } = req.body;
        
        const confirmation = await db.rejectExperienceBooking(
            String(bookingId),
            reason
        );
        
        // TODO: Iniciar reembolso
        // TODO: Enviar email al cliente con alternativas
        
        return res.status(200).json({
            success: true,
            message: 'Experience rejected',
            confirmation
        });
    } catch (error) {
        console.error('Error rejecting experience:', error);
        return res.status(500).json({ error: 'Failed to reject experience' });
    }
}
```

### Paso 3.4: Modificar `api/bookings.ts` (POST existente)

Agregar lógica para manejar bookingType:

```typescript
// En la función POST /api/bookings
// Después de validar booking, pero antes de insertar:

const { bookingType, attendeeCount, attendeeNames, groupCapacityLimit, leadEmail, pieces, guidedDurationMinutes, specialNotes } = req.body;

// Determinar tipo de booking
const finalBookingType = bookingType || 'individual';

// Si es grupo, crear metadatos
if (finalBookingType === 'group') {
    await db.createGroupBookingMetadata({
        bookingId: booking.id,
        attendeeCount,
        attendeeNames,
        groupCapacityLimit,
        leadEmail
    });
}

// Si es experiencia, crear metadatos y confirmation
if (finalBookingType === 'experience') {
    const pricing = await calculateExperiencePricing(pieces, guidedDurationMinutes);
    
    await db.createExperienceBookingMetadata({
        bookingId: booking.id,
        pieces,
        totalPieceCost: pricing.pieces.total,
        guidedDurationMinutes,
        guidedCost: pricing.guided.cost,
        specialNotes
    });
    
    // Crear registro de confirmación (pendiente)
    await db.createExperienceConfirmation(booking.id);
}

// Actualizar booking_type en bookings table
await sql`UPDATE bookings SET booking_type = ${finalBookingType} WHERE id = ${booking.id}`;
```

### Paso 3.5: Verificación

✅ Checklist:
- [ ] `api/pieces.ts` implementado y compila
- [ ] `api/experience-pricing.ts` implementado
- [ ] `api/experience-confirmations.ts` implementado
- [ ] POST /api/bookings maneja `bookingType`
- [ ] Endpoints testean en Postman/curl
- [ ] Error handling completo
- [ ] Admin code validation presente

---

## FASE 4: COMPONENTES UI

**Duración:** 8-10 horas  
**Archivos:** `components/*.tsx`

*Por brevedad, aquí muestro estructura. Implementación detallada en siguientes pasos.*

### Paso 4.1: `components/ExperienceTypeSelector.tsx`

```typescript
import React from 'react';
import type { AppView } from '../types';

interface Props {
    onSelectType: (type: 'individual' | 'group' | 'experience') => void;
    onCancel: () => void;
}

export const ExperienceTypeSelector: React.FC<Props> = ({ onSelectType, onCancel }) => {
    return (
        <div className="experience-type-selector">
            <h1>¿Qué quieres hacer hoy?</h1>
            
            <div className="cards-container">
                {/* Individual Card */}
                <div className="experience-card individual" onClick={() => onSelectType('individual')}>
                    <div className="icon">📍</div>
                    <h3>Clase Individual</h3>
                    <p>Aprende a tu ritmo, con un instructor dedicado</p>
                    <ul>
                        <li>1 persona</li>
                        <li>Horarios fijos</li>
                        <li>Técnica a elegir</li>
                    </ul>
                    <button>SELECCIONAR</button>
                </div>
                
                {/* Group Card */}
                <div className="experience-card group" onClick={() => onSelectType('group')}>
                    <div className="badge">✨ NUEVO</div>
                    <div className="icon">👥</div>
                    <h3>Clase Grupal</h3>
                    <p>Trae amigos, aprendan juntos, mejor precio</p>
                    <ul>
                        <li>2-8 personas</li>
                        <li>Mismo horario, mismo día</li>
                        <li>Desde $15/persona</li>
                    </ul>
                    <button>SELECCIONAR</button>
                </div>
                
                {/* Experience Card */}
                <div className="experience-card experience" onClick={() => onSelectType('experience')}>
                    <div className="badge">✨ NUEVO</div>
                    <div className="icon">🎨</div>
                    <h3>Experiencia Personalizada</h3>
                    <p>Pinta lo que amas, llévate tu creación hoy</p>
                    <ul>
                        <li>Elige la pieza</li>
                        <li>Técnicas incluidas</li>
                        <li>Precios desde $12</li>
                    </ul>
                    <button>SELECCIONAR</button>
                </div>
            </div>
            
            <button className="cancel-btn" onClick={onCancel}>Atrás</button>
        </div>
    );
};
```

### Paso 4.2: `components/GroupClassWizard.tsx`

Componente orquestador que maneja los 4 pasos del flujo grupal.

```typescript
// Estructura similar a un wizard existente (CouplesExperienceScheduler)
// Utiliza state machine con pasos 1-4
```

### Paso 4.3-4.9: Componentes restantes

Crear archivos siguiendo patrón similar:
- `GroupClassTypeSelector.tsx`
- `GroupAttendeeForm.tsx`
- `GroupScheduleSelector.tsx`
- `GroupBookingSummary.tsx`
- `PieceExperienceWizard.tsx`
- `PieceCategorySelector.tsx`
- `PieceSelector.tsx`
- `ExperienceDurationSelector.tsx`
- `ExperienceBookingSummary.tsx`
- `AdminExperienceConfirmationPanel.tsx`
- `PiecesManagementPanel.tsx`

*(Implementación detallada en siguiente documento)*

---

## FASE 5: INTEGRACIÓN

**Duración:** 2-3 horas  
**Archivo:** `App.tsx`

### Paso 5.1: Agregar state en App.tsx

```typescript
const [experienceType, setExperienceType] = useState<'individual' | 'group' | 'experience' | null>(null);
const [groupClassStep, setGroupClassStep] = useState<1 | 2 | 3 | 4>(1);
const [pieceExperienceStep, setPieceExperienceStep] = useState<1 | 2 | 3 | 4>(1);
```

### Paso 5.2: Agregar rutas en switch(view)

```typescript
case 'experience_type_selector':
    return (
        <ExperienceTypeSelector
            onSelectType={(type) => {
                setExperienceType(type);
                if (type === 'individual') setView('welcome');
                else if (type === 'group') setView('group_class_wizard');
                else if (type === 'experience') setView('piece_experience_wizard');
            }}
            onCancel={() => setView('welcome')}
        />
    );

case 'group_class_wizard':
    return (
        <GroupClassWizard
            onComplete={(booking) => {
                setConfirmedBooking(booking);
                setView('confirmation');
            }}
            onCancel={() => {
                setExperienceType(null);
                setView('experience_type_selector');
            }}
        />
    );

case 'piece_experience_wizard':
    return (
        <PieceExperienceWizard
            onComplete={(booking) => {
                setConfirmedBooking(booking);
                setView('confirmation');
            }}
            onCancel={() => {
                setExperienceType(null);
                setView('experience_type_selector');
            }}
        />
    );
```

### Paso 5.3: Actualizar botón principal

```typescript
// En Header o elemento prominente:
<button onClick={() => setView('experience_type_selector')}>
    RESERVA TU EXPERIENCIA
</button>
```

---

## FASE 6: EMAILS

**Duración:** 2-3 horas  
**Archivo:** `api/emailTemplates/`

### Paso 6.1: Templates nuevos

Crear archivos:
- `groupClassConfirmation.ts`
- `experiencePendingConfirmation.ts`
- `experienceConfirmed.ts`
- `experienceRejected.ts`

Cada template sigue patrón de existentes en el proyecto.

---

## FASE 7: TESTING

**Duración:** 3-4 horas

### Paso 7.1: Testing Manual

Checklist de casos de uso:

```
CLASE GRUPAL:
☐ Seleccionar tipo de clase grupal
☐ Agregar 2-6 asistentes
☐ Nombre (opcional) se guarda
☐ Seleccionar fecha/horario
☐ Mostrar precio total correcto
☐ Pagar y recibir confirmación
☐ Email recibido con detalles
☐ Admin ve en lista de reservas

EXPERIENCIA PERSONALIZADA:
☐ Seleccionar categoría de pieza
☐ Seleccionar 1+ piezas con cantidad
☐ Calcular precio correcto
☐ Seleccionar duración (0, 60, 120 min)
☐ Verificar total actualiza
☐ Pagar experiencia
☐ Confirmación en "pendiente"
☐ Admin ve en panel de confirmaciones
☐ Admin confirma → cliente recibe email
☐ Admin rechaza → cliente recibe email + reembolso

CAPACIDAD:
☐ Grupos respetan capacidad horaria
☐ Si no hay cupo para cantidad, horario no aparece
☐ Mensaje claro cuando pocas opciones
```

### Paso 7.2: Testing de APIs

```bash
# Piezas
curl -X GET http://localhost:3000/api/pieces?category=small

# Pricing
curl -X POST http://localhost:3000/api/experience-pricing \
  -H "Content-Type: application/json" \
  -d '{
    "pieces": [{"pieceId": "uuid-1", "quantity": 1}],
    "guidedDurationMinutes": 60
  }'

# Confirmaciones
curl -X GET http://localhost:3000/api/experience-confirmations \
  -H "admin-code: [CODE]"
```

---

## CHECKLISTS DE CALIDAD

### ✅ Base de Datos
- [ ] Migración sin errores
- [ ] Todas las tablas creadas
- [ ] Índices presentes
- [ ] Constraints funcionan
- [ ] Foreign keys correctas
- [ ] Seed data insertado

### ✅ Backend
- [ ] Endpoints implementados
- [ ] Errores manejados
- [ ] Validaciones presentes
- [ ] Admin auth verificado
- [ ] Pricing cálculos correctos
- [ ] Confirmaciones guardadas

### ✅ Frontend
- [ ] 4 pasos grupo completos
- [ ] 4 pasos experiencia completos
- [ ] Selector tipo funciona
- [ ] Integración en App.tsx
- [ ] Navegación fluida
- [ ] Diseño responsive
- [ ] Iconos/colores consistentes

### ✅ Emails
- [ ] 4 templates creados
- [ ] Variables interpoladas
- [ ] HTML responsive
- [ ] Links funcionan
- [ ] Prueba manual enviado

### ✅ Testing
- [ ] Flujo grupo completo
- [ ] Flujo experiencia completo
- [ ] Capacidad respetada
- [ ] Precios correctos
- [ ] Emails recibidos
- [ ] Admin panel funciona
- [ ] Sin console errors

---

**Estado:** 🟢 LISTO PARA IMPLEMENTACIÓN FASE POR FASE

