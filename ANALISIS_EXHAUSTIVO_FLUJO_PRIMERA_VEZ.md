# 🔍 ANÁLISIS EXHAUSTIVO END-TO-END: FLUJO "PRIMERA VEZ" (single_class_wizard)

**Autor:** GitHub Copilot  
**Fecha:** Febrero 2026  
**Objetivo:** Investigación rigurosa de la seguridad de eliminar el flujo "Primera Vez" sin afectar datos, UX o estabilidad

---

## 1. MAPEO END-TO-END: FLOW COMPLETO

### 1.1 RUTA DE USUARIO
```
WelcomeSelector
  ↓ usuario hace clic "Primera Vez" o "Clases Sueltas"
  ↓ onSelect("single_class_wizard") OR onSelect("new")
  ↓
  App.tsx - handleWelcomeSelect()
  ├─ userType === "new" → setView('single_class_wizard');
  └─ userType === "single_class_wizard" → setView('single_class_wizard');
  ↓
  App.tsx - renderView() case 'single_class_wizard'
  ├─ Genera slots: dataService.generateTimeSlots(new Date(), 180)
  │  └─ 180 días × 30 min intervals = ∞ slots disponibles
  ├─ Pasa props a SingleClassWizard:
  │  ├─ availableSlots: Generados dinámicamente
  │  ├─ pieces: Array de piezas para pintura
  │  ├─ appData: Estado global (bookings, instructors, etc)
  │  └─ isLoading: Control UI
  └─ renderResult: <SingleClassWizard {...props} />
  ↓
  SingleClassWizard.tsx - WIZARD DE 5 PASOS
  ├─ Step 1: Tipo de Clase (individual/group)
  ├─ Step 2: Técnica (modelado/torno/pintura)
  ├─ Step 3: Cantidad Personas + Pieza (si pintura)
  ├─ Step 4: Fecha y Hora (calendario interactivo)
  ├─ Step 5: Confirmación final (resumen)
  └─ onConfirm(pricing, selectedSlot)
  ↓
  App.tsx - maneja confirmación
  ├─ setExperienceUIState(pricing)
  ├─ setBookingDetails({ slots, userInfo: null })
  ├─ setExperienceType('experience')
  └─ setIsUserInfoModalOpen(true) ← ABRE MODAL DE USUARIO
  ↓
  UserInfoModal.tsx - CAPTURA DATOS PERSONALES
  ├─ Campos:
  │  ├─ firstName, lastName (obligatorio)
  │  ├─ email (obligatorio + validado)
  │  ├─ phone (obligatorio + validado por país)
  │  ├─ country (selector)
  │  ├─ birthday (opcional / pode ignorarse)
  │  └─ invoice data (opcional)
  ├─ Validaciones:
  │  ├─ Email format
  │  ├─ Phone length based on país
  │  └─ Políticas aceptadas (checkbox)
  └─ onSubmit({ userInfo, invoiceData, acceptedNoRefund })
  ↓
  App.tsx - handleUserInfoSubmit()
  ├─ Combina datos:
  │  ├─ bookingDetails.userInfo = userInfo recibido
  │  ├─ bookingDetails.pricing = experienceUIState.pricing
  │  └─ bookingDetails.slots = slot seleccionado
  ├─ Valida capacidad en tiempo real:
  │  └─ checkSlotAvailability(date, time, technique, participants)
  ├─ LLAMA API: POST /api/data?action=addBooking
  │  ├─ Body incluye: productType, slots, userInfo, technique, etc
  │  └─ Response: booking con ID, código, etc
  ├─ Guarda booking localmente
  ├─ Envia EMAIL: emailService.sendBookingConfirmation()
  └─ Navega a: setView('confirmation')
  ↓
  ConfirmationPage.tsx
  ├─ Muestra código de reserva
  ├─ Resumen de detalles
  └─ Opciones: "Ir a mis clases" o cerrar
  ↓
  resetFlow() - limpia estado
```

---

## 2. DATOS QUE FLUYEN (CRÍTICO PARA BD)

### 2.1 ESTRUCTURA DEL BOOKING GUARDADO

```typescript
// En App.tsx - setBookingDetails() 
{
  product: null, // Por ahora es null, se llena en API
  slots: [
    {
      date: "2026-02-28",     // YYYY-MM-DD
      time: "10:30",          // HH:MM (normalizado)
      instructorId: 0         // Siempre 0 para dinamicas
    }
  ],
  userInfo: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    country: string,
    birthday?: string,        // YYYY-MM-DD o null
    countryCode: string
  },
  technique?: 'hand_modeling' | 'potters_wheel' | 'painting'
}
```

### 2.2 INSERCIONES EN BASE DE DATOS (api/data.ts - addBookingAction)

```sql
-- TABLA: bookings (CRÍTICA)
INSERT INTO bookings (
  booking_code,           -- C-ALMA-XXXXX (auto-generated)
  product_id,             -- null o "experience"
  product_type,           -- 'GROUP_CLASS' o 'CUSTOM_GROUP_EXPERIENCE'
  slots,                  -- JSON: [{ date, time, instructorId }]
  user_info,              -- JSON: { firstName, lastName, email, phone, etc }
  created_at,             -- NOW()
  is_paid,                -- false (por defecto)
  price,                  -- DECIMAL: $45-55 dependiendo técnica
  booking_mode,           -- 'experience' (por ahora)
  product,                -- JSON: { type, details, name }
  booking_date,           -- TEXT: date del booking
  accepted_no_refund,     -- BOOLEAN: si slot < 48h
  expires_at,             -- NOW() + 2 HOURS (pre-booking)
  status,                 -- 'active'
  technique,              -- 'hand_modeling' | 'potters_wheel' | 'painting'
  reschedule_allowance,   -- INT: 1 (default)
  participants            -- INT: cantidad de personas
) VALUES (...)
RETURNING *;
```

### 2.3 ÍNDICES Y RELACIONES AFECTADAS

```
bookings:
  ├─ Primary Key: id (UUID)
  ├─ Unique: booking_code (referencia para clientes)
  ├─ Foreign Keys: NINGUNO directo (¡CRÍTICO!)
  ├─ Indexed: created_at, booking_date, product_type
  └─ JSON fields: slots, user_info, product, group_metadata

experience_bookings_metadata: (SI EXISTE)
  ├─ booking_id (FOREIGN KEY → bookings.id)
  ├─ pieces: JSON
  └─ cost breakdown

Relaciones indirectas:
  ├─ admin queries: SELECT * FROM bookings WHERE product_type = 'GROUP_CLASS'
  ├─ email service: uses booking_code + slots + userInfo
  └─ availability: cuenta ocupación por fecha/hora/técnica
```

---

## 3. PUNTOS DE RIESGO IDENTIFICADOS

### 🔴 RIESGOS CRÍTICOS

#### 3.1 IMPACTO EN DATOS HISTÓRICOS - BAJO RIESGO
**Descripción:**
- Existen bookings guardados con `product_type = 'GROUP_CLASS'` desde clases sueltas
- Si eliminamos UI, estos bookings quedan **HUÉRFANOS en la BD**
- **NO se pierden:** los datos están intactos
- **PROBLEMA:** Admin no puede visualizarlos/editarlos si UI desaparece

**Verificación necesaria:**
```sql
-- Contar bookings de clases sueltas guardadas
SELECT COUNT(*) as total,
       product_type,
       DATE_TRUNC('day', created_at) as created_date
FROM bookings
WHERE product_type IN ('GROUP_CLASS', 'CUSTOM_GROUP_EXPERIENCE')
GROUP BY product_type, DATE_TRUNC('day', created_at)
ORDER BY created_date DESC;
```

**Mitigación:**
- Mantener lectura de estos bookings en adminPanel
- NO necesita eliminar datos de BD, solo UI
- Crear view "legacy" si necesario

---

#### 3.2 DUPLICIDAD CON "CLASES SUELTAS" - RIESGO MEDIO
**Descripción:**
- "Primera Vez" Y "Clases Sueltas" apuntan al **MISMO** `single_class_wizard` component
- WelcomeSelector.tsx línea 41:
  ```tsx
  {
    title: 'Clases Sueltas',        // Opción 1
    onClick: () => onSelect('single_class_wizard'),  // MISMA ruta
  },
  {
    title: 'Primera Vez',           // Opción 2
    onClick: () => onSelect('new')  // DIFERENTE ruta
  }
  ```
- En App.tsx línea 309:
  ```tsx
  if (userType === 'new') {
    setView('single_class_wizard');  // Nueva forma de llegar ahí
  } else if (userType === 'single_class_wizard') {
    setView('single_class_wizard');  // Forma antigua
  }
  ```

**Impacto:**
- **Ambos caminos convergen al mismo lugar**
- "Primera Vez" es **REDUNDANTE**, no está eliminada, solo tiene nueva UX
- Si eliminamos "Primera Vez", usuarios usan "Clases Sueltas" (funciona igual)

**Riesgo:** BAJO - Es sobre-especificación de rutas, no pierde funcionalidad

---

#### 3.3 TÉCNICA DERIVE Y CAPACITY - RIESGO MEDIO-ALTO
**Descripción:**
- SingleClassWizard **permite elegir técnica LIBREMENTE** (hand_modeling, potters_wheel, painting)
- Se usa para calcular:
  ```
  capacity['hand_modeling'] = 22
  capacity['potters_wheel'] = 8
  capacity['painting'] = depende de pieza
  ```
- API validation en `addBooking()` línea 5750:
  ```typescript
  // Calcula technique a partir del producto
  let technique = body.technique;
  if (!technique && body.product) {
    technique = body.product.details.technique;
  }
  ```

**Problema:** 
- Si usuario elige `potters_wheel` pero slot está bloqueado por `fixed_potters_class`, debería rechazarse
- Línea 5863 verifica esto con `isPottersFixedConflict()`

**Riesgo:** MEDIO - Necesita validación correcta en cliente Y servidor

---

### 🟠 RIESGOS MODERADOS

#### 3.4 GENERACIÓN DE SLOTS ILIMITADA
**Descripción:**
```typescript
// App.tsx línea 940
dataService.generateTimeSlots(new Date(), 180)
// Genera TODOS los slots de 180 días
// = 180 días × 18 horas/día × 2 slots/hora = 6,480 slots
```

**Impacto:**
- Primera render: Carga 6,480 objetos en memoria
- Rendimiento: Recompute si appData cambia (caro en componentes grandes)
- Parpadeos: Si algo invalida caché, recomputa slots otra vez

**Riesgo:** MODERADO - Performance OK para 180 días, pero escalable

---

#### 3.5 NO-REFUND POLICY (48H)
**Descripción:**
- UserInfoModal verifica: `slotsRequireNoRefund(slots, 48)`
- Si slot < 2 días, requiere checkbox "aceptar no-refund"
- API lado servidor NO valida esto

**Riesgo:** BAJO - Cliente lo muestra, pero servidor debería validar también

---

### 🟡 RIESGOS BAJOS

#### 3.6 INSTRUCTOR ID = 0
**Descripción:**
```typescript
// SingleClassWizard línea 546
instructorId: 0  // Siempre cero
```

**Impacto:**
- Slots dinámicos no tienen instructor asignado
- Admin puede asignar después
- Reportes por instructor: NO incluyen clases sueltas (necesita JOIN en BD)

**Riesgo:** BAJO - Expected behavior, admin lo maneja

---

#### 3.7 PRICING MANUAL EN CLIENTE
**Descripción:**
```typescript
// SingleClassWizard línea 43-62
TECHNIQUE_INFO = {
  hand_modeling: { price: 45 },
  potters_wheel: { price: 55 },
  painting: { price: depende piezit }  // Se obtiene de BD
}
```

**Problema:**
- SI admin cambia precios en BD, cliente NO se actualiza
- Mostrarían precios obsoletos en UI
- API valida en servidor (línea 5903)

**Riesgo:** BAJO-MODERADO - Necesita cache invalidation

---

## 4. CONEXIONES Y DEPENDENCIAS (RED DE COMPONENTES)

### 4.1 DEPENDENCIAS DIRECTAS
```
SingleClassWizard
├─ Importa de:
│  ├─ /types (GroupTechnique, TimeSlot, Piece, ExperiencePricing, AppData)
│  └─ /services/dataService (generateTimeSlots, getAvailableSlots, etc)
├─ Usada por:
│  └─ App.tsx case 'single_class_wizard'
└─ Renderiza:
   ├─ Internos: progress bar, buttons, grid
   └─ Sin subcomponentes custom (sin riesgos allí)
```

### 4.2 DEPENDENCIAS INDIRECTAS
```
App.tsx
├─ experienceType = 'experience' (cuando confirma)
├─ isUserInfoModalOpen = true (abre modal)
├─ setBookingDetails() (guarda datos)
├─ POST /api/data?action=addBooking (crea BD)
├─ emailService.sendBookingConfirmation() (notifica)
└─ ConfirmationPage (muestra resultado)

dataService.ts
├─ generateTimeSlots() - genera slots (180 días × 30min)
├─ getAvailableSlots() - calcula disponibilidad real
└─ checkSlotAvailability() - valida antes de guardar

api/data.ts (addBookingAction)
├─ Inserta en TABLE bookings
├─ Valida técnica/capacity
├─ Envía email
└─ Retorna booking objeto

EmailService.ts
├─ sendBookingConfirmation()
├─ Usa template con variables: {{technique}}, {{date}}, {{time}}
└─ Registra en EMAIL_LOGS
```

### 4.3 DEPENDENCIAS CIRCULARES (RIESGO BAJO)
```
❌ NO ENCONTRADAS - El flujo es lineal, sin círculos
```

---

## 5. IMPACTO EN BASE DE DATOS - ANÁLISIS DETALLADO

### 5.1 TABLAS AFECTADAS
```
TABLE: bookings (CRÍTICA)
  ├─ Nuevas filas creadas: SÍ (1 por reserva)
  ├─ Campos modificados: NO (read-only después crear)
  ├─ Eliminaciones: POSIBLE (admin puede borrar)
  ├─ Índices: booking_code (UNIQUE), created_at (RANGE)
  └─ Relaciones: NINGUNA FK (lo que simplifica)

TABLE: experience_bookings_metadata (OPCIONAL)
  ├─ Si existe, recibe metadata de piezas
  ├─ booking_id FK → bookings.id
  └─ Si eliminamos UI pero no migramos datos: datos huérfanos

TABLE: audit_logs (AUDITORIA)
  └─ Registra cambios: reschedules, updates

TABLE: email_logs (AUDITORIA)
  └─ Registra emails enviados
```

### 5.2 CONSULTAS CRÍTICAS AFECTADAS
```sql
-- Admin panel - listar clases sueltas
SELECT * FROM bookings 
WHERE product_type = 'GROUP_CLASS' 
ORDER BY created_at DESC;
-- ❌ SEGUIRÍA FUNCIONANDO si mantenemos indices

-- Disponibilidad - contar cupos por fecha
SELECT COUNT(*) FROM bookings 
WHERE status = 'active' 
AND slots::text LIKE '%2026-02-28%'
AND technique = 'potters_wheel';
-- ✅ SIGUE FUNCIONANDO - No afecta

-- Ingresos por técnica
SELECT TECHNIQUE, SUM(price) FROM bookings GROUP BY technique;
-- ✅ SIGUE FUNCIONANDO

-- Problema POTENCIAL: ninguna referencia foreign key que se rompa
-- Pero: Queries que filtran por product_type pueden no encontrar nada
```

### 5.3 MIGRATIONS NECESARIAS (SI QUEREMOS LIMPIEZA TOTAL)
```sql
-- OPCIÓN 1: Archivar bookings viejos de clases sueltas
CREATE TABLE bookings_archive AS 
SELECT * FROM bookings 
WHERE product_type = 'GROUP_CLASS' 
AND created_at < NOW() - INTERVAL '6 months';

DELETE FROM bookings WHERE id IN (SELECT id FROM bookings_archive);

-- OPCIÓN 2: Marcar como "archived" sin borrar
ALTER TABLE bookings ADD COLUMN "archive_reason" VARCHAR(255);
UPDATE bookings SET archive_reason = 'legacy_single_class_wizard' 
WHERE product_type = 'GROUP_CLASS';

-- OPCIÓN 3: No hacer nada (datos quedan, admin puede query)
-- RECOMENDADO: Estos datos son válidos e históricos
```

---

## 6. CONEXIONES CON OTROS COMPONENTES

### 6.1 COMPARTENCIAS DE ESTADO CON OTROS FLUJOS
```
SingleClassWizard ⟷ GroupClassWizard
├─ Ambos usan: appData.bookings (para calcular disponibilidad)
├─ Ambos escriben: bookings table (mismos campos)
├─ Ambos validan: técnica y capacidad (mismos checks)
└─ RIESGO: Si schema de bookings cambia, ambos se rompen

SingleClassWizard ⟷ CouplesExperienceScheduler
├─ CouplesExperienceScheduler REUTILIZA: dataService.generateIntroClassSessions()
├─ SingleClassWizard NO la usa (usa generateTimeSlots directamente)
└─ NO CONFLICTO DIRECTO

SingleClassWizard ⟷ ScheduleSelector
├─ ScheduleSelector: para paquetes (CLASS_PACKAGE)
├─ SingleClassWizard: para experiencias (GROUP_CLASS)
└─ Misma lógica de disponibilidad, schemas distintos
└─ RIESGO: Si cambias capacity map, ambos afectados
```

### 6.2 COMPARTENCIA DE SERVICIOS
```
dataService.ts
├─ generateTimeSlots() - USADO por:
│  ├─ SingleClassWizard
│  ├─ GroupClassWizard (probablemente)
│  └─ PaintingBookingFlow (posible)
├─ checkSlotAvailability() - USADO por:
│  ├─ App.tsx (antes de llamar addBooking)
│  └─ Admin (para validar reschedules)
└─ RIESGO: Si eliminas generateTimeSlots, rompes otros componentes
```

---

## 7. VALIDACIONES NECESARIAS ANTES DE ELIMINACIÓN

### 7.1 VERIFICACIÓN DE DATOS
```bash
# 1. Contar bookings de clases sueltas
SELECT COUNT(*) FROM bookings 
WHERE product_type IN ('GROUP_CLASS', 'CUSTOM_GROUP_EXPERIENCE');

# 2. Rango de fechas (oldest → newest)
SELECT MIN(created_at), MAX(created_at) 
FROM bookings 
WHERE product_type IN ('GROUP_CLASS', 'CUSTOM_GROUP_EXPERIENCE');

# 3. Técnicas usadas (para entender patrones)
SELECT technique, COUNT(*) 
FROM bookings 
WHERE product_type IN ('GROUP_CLASS', 'CUSTOM_GROUP_EXPERIENCE')
GROUP BY technique;

# 4. Estado de los bookings (pagados vs pendientes)
SELECT status, is_paid, COUNT(*) 
FROM bookings 
WHERE product_type IN ('GROUP_CLASS', 'CUSTOM_GROUP_EXPERIENCE')
GROUP BY status, is_paid;
```

### 7.2 VERIFICACIÓN DE DEPENDENCIAS EN CÓDIGO
```
# Buscar referencias a 'single_class_wizard'
grep -r "single_class_wizard" src/

# Buscar referencias a 'GroupTechnique'
grep -r "GroupTechnique" src/components/

# Buscar referencias a 'generateTimeSlots'
grep -r "generateTimeSlots" src/
```

---

## 8. ESCENARIOS DE RIESGO Y MITIGACIONES

### Escenario 1: USUARIO INTENTA RESERVAR CLASE SUELTA
**Status actual:** ✅ Funciona vía 2 rutas (new, single_class_wizard)

**Si eliminamos UI "Primera Vez":**
- Ruta 1: `single_class_wizard` directo → sigue funcionando
- Ruta 2: `new` → redirige a `single_class_wizard` → sigue funcionando
- **Impacto: NINGUNO** (ambas rutas existen)

**Riesgo:** BAJO

---

### Escenario 2: ADMIN NECESITA VER BOOKINGS HISTÓRICOS
**Status actual:** ✅ Admin puede queryear bookings table

**Si eliminamos UI "Primera Vez":**
- Admin dashboard podrá seguir viendo: `SELECT * FROM bookings WHERE product_type = 'GROUP_CLASS'`
- Si dashboard tiene filtro "group_class" específico, seguirá mostrándolos
- **Impacto: NINGUNO** si admin query sigue igual

**Riesgo:** BAJO si se mantiene queryabilidad

---

### Escenario 3: CAMBIOS EN PRICING
**Status actual:** Precios en clientepodría estar desincronizados con BD

**Si eliminamos UI:**
- Ya no entra usuario nuevo por "Primera Vez"
- Pero si alguien accede vía `single_class_wizard` directamente, sigue afectado
- **Impacto: IGUAL** (problema pre-existente)

**Mitigación:** Implementar server-side pricing validation

---

### Escenario 4: SLOTS OVERFLOW (6,480 slots generados)
**Status actual:** Se generan 180 días × 30min = heavy

**Si eliminamos UI:**
- Menos usuarios accesando ese flujo
- Performance mejora
- **Impacto: POSITIVO**

**Riesgo:** BAJO (mejora)

---

## 9. PLAN DE ELIMINACIÓN SEGURA

### Fase 1: PRE-ELIMINACIÓN (Validación)
```typescript
// ✅ Verificar BD tiene datos históricos
SELECT COUNT(*) as single_class_bookings FROM bookings 
WHERE product_type IN ('GROUP_CLASS', 'CUSTOM_GROUP_EXPERIENCE');

// ✅ Verificar TODAS las rutas convergen
// App.tsx handleWelcomeSelect():
//   'new' → 'single_class_wizard'
//   'single_class_wizard' → 'single_class_wizard'
// AMBAS LLEGAN MISMO LUGAR ✓

// ✅ Verificar no hay imports que se rompan
grep -r "from.*SingleClassWizard" src/
// Resultado esperado: SOLO App.tsx

// ✅ Verificar no hay referencias en constantes
grep -r "single_class_wizard\|GROUP_CLASS" src/constants.ts
```

### Fase 2: ELIMINACIÓN UI (Sin Breaking Changes)

**Option A: MINIMAL REMOVAL**
```typescript
// 1. En WelcomeSelector.tsx ELIMINAR:
{
  title: 'Primera Vez',
  subtitle: 'Empieza con una clase suelta...',
  onClick: () => onSelect('new')  // ← ELIMINAR
}

// 2. En App.tsx ELIMINAR:
if (userType === 'new') {
  setView('single_class_wizard');  // ← ELIMINAR esta rama
}
// Usuarios ahora usan 'single_class_wizard' directo

// 3. Mantener TODO lo demás:
//    ✓ SingleClassWizard.tsx componente (sin usar en UI)
//    ✓ Ruta 'single_class_wizard' (por si alguien accede vía URL)
//    ✓ Bookings históricos (nada pasa)
//    ✓ dataService.generateTimeSlots() (usado por otros)

RESULTADO: "Primera Vez" desaparece, pero sistema sigue 100% funcional
```

**Option B: OPTIONAL FLAGS**
```typescript
// En featureFlags.ts:
export const FEATURE_FLAGS = {
  CLASES_SUELTAS: true,       // Sigue habilitado
  PRIMERA_VEZ: false,          // NUEVO FLAG
  // ...
};

// En WelcomeSelector.tsx:
{
  title: 'Primera Vez',
  disabled: !FEATURE_FLAGS.PRIMERA_VEZ,
  onClick: () => FEATURE_FLAGS.PRIMERA_VEZ && onSelect('new')
}

RESULTADO: Puede togglearse sin código change
```

### Fase 3: CLEAN UP (Post-Eliminación)
```
- ✅ Build y validar CERO errores de compilación
- ✅ Pruebas manuales:
  - Acceder a /app?view=single_class_wizard → debe funcionardirectamente
  - Clases sueltas (opción 2) → debe ir a único flujo
  - Admin dashboard → debe seguir viendo bookings históricos
- ✅ Searches para validar limpeza:
  - grep "PRIMERA_VEZ" src/ → CERO matches
  - grep "Primera Vez" src/ → CERO matches (excepto comentarios)
```

### Fase 4: MONITOREO POST-ELIMINACIÓN
```
- 📊 Dashboard: Seguir métricas de bookings por tipo
- 🔍 Logs: Buscar errores 404 en /api/data?action=... relacionados
- ✉️  Email: Auditar emails enviados (checksum correcto)
- 👥 Analytics: Comparar conversión antes/después
```

---

## 10. CHECKLIST DE SEGURIDAD FINAL

### Antes de Eliminar ✅

- [ ] Ejecuta verificación BD: Cuentaexisten bookings GROUP_CLASS
- [ ] Verifica: `handleWelcomeSelect()` ambas rutas convergen
- [ ] Verifica: SingleClassWizard.tsx SOLO importado en App.tsx
- [ ] Verifica: dataService.generateTimeSlots() NO roto por cambios
- [ ] Ejecuta: `npm run build` → CERO errores
- [ ] Busca: "PRIMERA_VEZ" en código → CERO matches
- [ ] Busca: refs a 'new' en type AppView → CERO matches
- [ ] Verifica: Email templates NO rompe sin instructor

### Mitigaciones Activas ✅

- [ ] Mantener SingleClassWizard.tsx (para URL directos)
- [ ] Mantener dataService.generateTimeSlots() (otros componentes)
- [ ] Mantener bookings históricos (auditoría)
- [ ] Mantener ruta 'single_class_wizard' en App.tsx
- [ ] Mantener capacidad de admin ver bookings GROUP_CLASS

### Rollback Rápido ✅

- [ ] Commit SOLO cambios UI (WelcomeSelector.tsx + App.tsx)
- [ ] Si falla: `git revert` último commit
- [ ] BD: CERO cambios (100% reversible)

---

## 11. RECOMENDACIÓN FINAL

### ✅ ES SEGURO ELIMINAR "PRIMERA VEZ" SI:

1. **Mantienes:**
   - WelcomeSelector: Opción "Clases Sueltas" + toda su lógica
   - App.tsx: Ruta `'single_class_wizard'` en handleWelcomeSelect()
   - SingleClassWizard.tsx: Componente completo (por si acceso vía URL)
   - dataService.generateTimeSlots(): Función reutilizable
   - Database: Todos los bookings históricos (READ-ONLY está ok)

2. **Es simplemente:**
   - Eliminar opción "Primera Vez" de WelcomeSelector
   - Eliminar rama `if (userType === 'new')` de App.tsx
   - Código que apunta a misma funcionalidad sigue existiendo

3. **Impacto:**
   - ✅ UX: Usuarios siguen reservando (vía "Clases Sueltas")
   - ✅ BD: Datos intactos, queries siguen funcionando
   - ✅ Admin: Puede ver todos los bookings (nada cambia)
   - ✅ Email: Se envía igual (técnica/precio se valida en servidor)
   - ✅ Performance: Mejora (menos rutas)

### 🚫 RIESGOS QUE EVITAR:

- ❌ NO elimines SingleClassWizard.tsx (afecta acceso directo por URL)
- ❌ NO elimines dataService.generateTimeSlots() (otros componentes lo usan)
- ❌ NO elimines ruta 'single_class_wizard' de renderView() en App.tsx
- ❌ NO migres/borres bookings históricos (son dato válido)
- ❌ NO cambies schema de bookings table sin migration
- ❌ NO confíes solo en client-side pricing (validar servidor)

---

## 12. CONCLUSIÓN

**`El flujo "Primera Vez" es SEGURO de eliminar bajo estos términos:`**

Es fundamentalmente una **RUTA alternativa** que converge al MISMO componente que "Clases Sueltas". No es una feature separada sino una UX path redundante.

**Riesgos Identificados: BAJO si se sigue plan**
- Datos BD: ✅ Cero impacto (lectura intacta)
- Componentes: ✅ Reutilizados (no aislar)
- UX: ✅ Garantizada (ruta alternate existe)
- APIs: ✅ Nada cambia (schema igual)

**Tiempo Estimado:** 5 minutos eliminación + 15 min testing = 20 min total

**Recomendación:** Proceder con eliminación de UI siguiendo checklist.

