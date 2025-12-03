# Propuesta: Sistema Completo para Experiencias Grupales con Técnicas Individuales

## 🎯 Problemas Identificados

### 1. **NO hay forma de crear Experiencia Grupal manual en ADMIN**
- ✅ Existe `GroupClassWizard` para CLIENTES (seleccionar técnica cada uno, slot)
- ❌ ADMIN no puede crear una experiencia grupal manualmente
- ❌ No hay endpoint `/api/data?action=createGroupExperience`
- ❌ No hay modal admin para crear este tipo de booking

### 2. **NO existe catálogo de piecitas para pintar**
- ❌ No hay tabla en BD para almacenar piezas
- ❌ No hay módulo admin para CRUD de piezas
- ❌ No hay fotos de piezas
- ❌ No hay precios por pieza
- ❌ No hay UI para seleccionar piezas en admin

### 3. **NO existe módulo de administración de experiencias**
- ❌ No hay gestión de catálogo de experiencias
- ❌ No hay configuración de precios
- ❌ No hay sistema de fotos/galerías

---

## 📋 Solución Propuesta (3 Módulos)

### **MÓDULO 1: PieceCatalog Admin Panel**
**Permite al admin gestionar piezas para pintar**

#### Estructura en BD (nueva tabla):
```sql
CREATE TABLE IF NOT EXISTS pieces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2),
  image_url VARCHAR(500),
  difficulty ENUM('beginner', 'intermediate', 'advanced'),
  category VARCHAR(100), -- bowl, plate, mug, vase, etc
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### UI Admin - PiecesManager:
```
┌─────────────────────────────────────┐
│  📦 Catálogo de Piezas             │
├─────────────────────────────────────┤
│ [+ Agregar Nueva Pieza]             │
├─────────────────────────────────────┤
│ Nombre        | Precio  | Dif. | ...│
├─────────────────────────────────────┤
│ Bol mediano   │ $8      │ ⭐  │ ✏️  │
│ Taza cerámica │ $12     │ ⭐⭐ │ ✏️  │
│ Plato grande  │ $15     │ ⭐⭐⭐│ ✏️  │
└─────────────────────────────────────┘

[Editar Pieza Modal]:
- Nombre: "Bol Mediano"
- Descripción: "Perfecto para ensaladas"
- Precio base: $8
- Dificultad: Intermedio
- [Upload Foto]
- Categoría: Bowl
- ✅ Activo / ❌ Inactivo
```

#### Funcionalidades:
- ✅ CRUD de piezas (Create, Read, Update, Delete)
- ✅ Upload de fotos con preview
- ✅ Gestión de precios
- ✅ Categorización (bowl, plate, mug, etc)
- ✅ Nivel de dificultad
- ✅ Activar/desactivar

---

### **MÓDULO 2: GroupExperienceCreator Admin**
**Permite al admin crear experiencias grupales en un slot específico**

#### UI Admin - Crear Experiencia Grupal Manual:

```
┌─────────────────────────────────────────────────┐
│  👥 Crear Experiencia Grupal Manual             │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📅 Fecha: [2025-12-15]  ⏰ Hora: [14:00]       │
│                                                 │
│ 👤 Participantes:                               │
│ ┌─────────────────────────────────────────┐    │
│ │ Persona 1: [TechniqueSelector]  $[price]│    │
│ │ Persona 2: [TechniqueSelector]  $[price]│    │
│ │ Persona 3: [TechniqueSelector]  $[price]│    │
│ │ [+ Agregar Participante]                │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ 💬 Notas: [_____________________________]       │
│ 💰 Total: $45 (3 x $15 promedio)               │
│                                                 │
│ [Cancelar]  [Crear Experiencia]                │
└─────────────────────────────────────────────────┘

[TechniqueSelector]:
┌──────────────────────────┐
│ Selecciona Técnica:      │
│ ○ Torno  (capacidad 8)   │
│ ○ Modelado (capacidad 14)│
│ ○ Pintura (limitado)     │
└──────────────────────────┘
```

#### Estructura de Datos:
```typescript
interface GroupExperienceBooking {
  id: string;
  date: string;
  time: string;
  participants: {
    id: string;
    name: string;
    email: string;
    phone: string;
    technique: 'potters_wheel' | 'hand_modeling' | 'painting';
    piecesSelected?: Piece[];
    pricePerPerson: number;
  }[];
  notes: string;
  totalPrice: number;
  createdAt: string;
  createdByAdmin: string;
  isPaid: boolean;
}
```

#### Funcionalidades:
- ✅ Seleccionar fecha/hora (con disponibilidad real)
- ✅ Agregar múltiples participantes
- ✅ Cada participante elige técnica
- ✅ Validar capacidad por técnica
- ✅ Calcular precio total
- ✅ Guardar como booking múltiple (1 booking por participante o 1 booking grupal)
- ✅ Generar código único para grupo

---

### **MÓDULO 3: PieceSelection UI**
**Para que participantes elijan piezas a pintar (en wizard cliente)**

#### Ya existe parcialmente en:
- `PieceExperienceWizard` → pero solo para experiencias sueltas
- ❌ NO se integra con `GroupClassWizard`

#### Necesita:
```typescript
// Agregar a GroupClassWizard.tsx:
interface GroupClassWizardProps {
  // ... existing props
  pieces?: Piece[];  // ← NUEVO
  showPieceSelection?: boolean;  // ← NUEVO
}

// En Step 3 (después de seleccionar técnica):
// "¿Qué piecita quieres pintar?" 
// [Mostrar catálogo filtrado según dificultad]
```

---

## 🔧 Implementación por Etapas

### **Etapa 1: Catálogo de Piezas (CRÍTICA)**
**Duración estimada: 2-3 horas**

**Backend:**
- [ ] Agregar tabla `pieces` en BD
- [ ] Endpoint POST `/api/data?action=addPiece`
- [ ] Endpoint GET `/api/data?action=getPieces`
- [ ] Endpoint PUT `/api/data?action=updatePiece`
- [ ] Endpoint DELETE `/api/data?action=deletePiece`
- [ ] Función para upload de imágenes

**Frontend:**
- [ ] Crear `PiecesManager.tsx` en admin
- [ ] Agregar a AdminConsole.tsx como nueva pestaña
- [ ] CRUD UI completo
- [ ] Preview de fotos

**Output:** Admin puede crear/editar piezas con fotos y precios

---

### **Etapa 2: Experiencia Grupal Manual en Admin (MEDIA)**
**Duración estimada: 3-4 horas**

**Backend:**
- [ ] Endpoint POST `/api/data?action=createGroupExperienceBooking`
- [ ] Validar capacidad por técnica
- [ ] Generar código grupo único
- [ ] Crear N bookings (uno por participante) o 1 booking grupal

**Frontend:**
- [ ] Crear `GroupExperienceCreator.tsx` en admin
- [ ] Modal con date/time picker
- [ ] Interface para agregar participantes
- [ ] Selector de técnica por persona
- [ ] Cálculo de precio total

**Output:** Admin puede crear experiencias grupales manualmente

---

### **Etapa 3: Integración con GroupClassWizard UI (BAJA)**
**Duración estimada: 1-2 horas**

**Frontend:**
- [ ] Agregar `pieces?: Piece[]` a GroupClassWizard
- [ ] Mostrar selección de piezas si es "painting"
- [ ] UI de galería de piezas

**Output:** Clientes pueden seleccionar piezas al reservar experiencia grupal

---

## 📊 Comparativa: Antes vs Después

### ANTES (Estado Actual):
```
Admin Panel:
├─ Clientes ✓
├─ Reservas ✓
├─ Horarios ✓
├─ Experiencias en Pareja ✓
├─ Piezas (para pintar) ✗ FALTA
├─ Experiencias Grupales Manual ✗ FALTA
└─ Fotos/Galerías ✗ FALTA
```

### DESPUÉS (Propuesta):
```
Admin Panel:
├─ Clientes ✓
├─ Reservas ✓
├─ Horarios ✓
├─ Experiencias en Pareja ✓
├─ Piezas (para pintar) ✅ NUEVO
├─ Experiencias Grupales Manual ✅ NUEVO
└─ Fotos/Galerías ✅ NUEVO
```

---

## 🎯 Prioridad Recomendada

1. **PRIMERO:** Módulo de Piezas (Etapa 1)
   - Base para todo lo demás
   - Permite poblar catálogo
   - Bloquea Etapa 2 y 3

2. **SEGUNDO:** Experiencia Grupal Manual (Etapa 2)
   - Permite crear reservas desde admin
   - Completa workflow de admin

3. **TERCERO:** Integración UI Cliente (Etapa 3)
   - Mejora UX pero no es crítica
   - Clientes ya pueden reservar con GroupClassWizard

---

## 📝 Consideraciones Técnicas

### Capacidad Múltiple por Técnica:
```typescript
// En calculateTotalParticipants (ScheduleManager):
// Cada participante de un grupo ocupa 1 cupo de su técnica

groupParticipants = [
  { technique: 'potters_wheel', count: 3 },   // 3 cupos de torno
  { technique: 'hand_modeling', count: 2 },   // 2 cupos de modelado
  { technique: 'painting', count: 2 }         // 2 cupos de pintura (ilimitado)
]

// Validación de capacidad:
potters_wheel: 3/8 ✓ (OK)
hand_modeling: 2/14 ✓ (OK)
painting: 2/∞ ✓ (OK)
```

### Booking Structure:
```typescript
// Opción A: 1 booking grupal con array de participantes
{
  id: 'group-abc123',
  type: 'GROUP_EXPERIENCE',
  participants: [
    { name: 'Juan', technique: 'potters_wheel' },
    { name: 'María', technique: 'painting' },
    { name: 'Pedro', technique: 'hand_modeling' }
  ],
  groupCode: 'GRP-2025-001'
}

// Opción B: N bookings conectados
{
  id: 'exp-juan-001',
  type: 'GROUP_EXPERIENCE',
  groupBookingId: 'group-abc123',
  participantName: 'Juan',
  technique: 'potters_wheel',
  groupCode: 'GRP-2025-001'
}
```

**Recomendación:** Opción A (más limpio, pero requiere refactor en calcula capacidad)

---

## 🚀 Quick Wins (Si quieren empezar ya)

**Sin hacer todo el módulo admin completo:**

1. ✅ Agregar tabla `pieces` en BD
2. ✅ Crear 3-5 piezas por defecto (hardcoded en BD)
3. ✅ Endpoint GET `/api/data?action=getPieces` (read-only)
4. ✅ Mostrar en GroupClassWizard.tsx (ya existe UI)
5. ✅ Admin puede editar precios vía SQL directamente

**Tiempo:** 1 hora
**Valor:** Clientes pueden ver/seleccionar piezas en wizard

---

## 📌 Resumen Ejecutivo

| Componente | Estado | Prioridad | Impacto |
|---|---|---|---|
| **Catálogo Piezas** | ❌ No existe | 🔴 CRÍTICA | Bloquea todo |
| **Experiencia Grupal Admin** | ❌ No existe | 🟠 ALTA | Admin workflow |
| **UI Selección Piezas Cliente** | ⚠️ Parcial | 🟡 MEDIA | UX mejorada |
| **Fotos/Galerías** | ❌ No existe | 🟡 BAJA | Visual |

**Recomendación:** Empezar con Etapa 1 (Piezas) esta semana, luego Etapa 2 (Admin).

---

**Versión:** 1.0
**Fecha:** Dec 1, 2025
**Autor:** AI Assistant
