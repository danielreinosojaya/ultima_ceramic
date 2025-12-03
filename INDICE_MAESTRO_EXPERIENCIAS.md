# 📚 ÍNDICE MAESTRO - SISTEMA DE EXPERIENCIAS ÚLTIMA CERAMIC

**Creado:** 30 de Noviembre de 2025  
**Versión:** 1.0 - DISEÑO COMPLETADO  
**Responsable:** Equipo de Producto & Desarrollo  

---

## 🎯 LECTURA RÁPIDA (5 MIN)

**Empezar aquí si:**
- Eres stakeholder/gerente
- Necesitas visión general
- Tienes 5 minutos

👉 **Leer:** `RESUMEN_EJECUTIVO_EXPERIENCIAS.md`

**Contenido:**
- El problema en 3 puntos
- La solución en 3 tipos
- Impacto esperado (números)
- Timeline de 4 semanas
- Próximos pasos

---

## 🏗️ LECTURA ARQUITECTÓNICA (45 MIN)

**Empezar aquí si:**
- Eres tech lead / senior dev
- Necesitas entender todo el sistema
- Tienes 45 minutos

👉 **Leer en orden:**

1. `RESUMEN_EJECUTIVO_EXPERIENCIAS.md` (10 min)
   - Contexto + impacto
   
2. `PLAN_IMPLEMENTACION_EXPERIENCIAS.md` (35 min)
   - Arquitectura BD detallada
   - Tipos TypeScript
   - APIs especificadas
   - Flujos de negocio
   - Email templates

---

## 🎨 LECTURA DE DISEÑO (30 MIN)

**Empezar aquí si:**
- Eres designer / frontend dev
- Necesitas entender flujos UI
- Tienes 30 minutos

👉 **Leer:** `UI_UX_MOCKUPS_EXPERIENCIAS.md`

**Contenido:**
- ASCII mockups de cada pantalla
- Flujo paso-a-paso visualmente
- Interacciones detalladas
- Email previsualizaciones
- Admin panels
- Validaciones visuales

---

## 🛠️ LECTURA DE IMPLEMENTACIÓN (2-3 HORAS)

**Empezar aquí si:**
- Eres developer asignado
- Vas a implementar las fases
- Tienes 2-3 horas ahora + más después

👉 **Leer en orden:**

1. `RESUMEN_EJECUTIVO_EXPERIENCIAS.md` (10 min)
   - Contexto
   
2. `PLAN_IMPLEMENTACION_EXPERIENCIAS.md` (40 min)
   - Toda arquitectura (léelo completo)
   
3. `GUIA_IMPLEMENTACION_PASOS.md` (90 min)
   - Paso a paso para cada fase
   - SQL ready-to-run
   - Checklists de validación

---

## 📊 ESTRUCTURA DE DOCUMENTOS

```
┌─────────────────────────────────────────────────────────────┐
│ DOCUMENTACIÓN - SISTEMA DE EXPERIENCIAS                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1️⃣  RESUMEN_EJECUTIVO_EXPERIENCIAS.md                     │
│    ├─ Problem statement                                    │
│    ├─ Solution overview (3 tipos)                          │
│    ├─ Impact metrics                                       │
│    ├─ Deliverables                                         │
│    ├─ Timeline (4 semanas)                                 │
│    ├─ Riesgos & Mitigación                                 │
│    └─ Success metrics                                      │
│    Audiencia: Stakeholders, Gerentes, Leads               │
│    Lectura: 10 min | Referencia: Semanal                  │
│                                                             │
│ 2️⃣  PLAN_IMPLEMENTACION_EXPERIENCIAS.md                   │
│    ├─ Arquitectura de BD (4 tablas nuevas)                │
│    ├─ Tipos TypeScript (12 nuevos)                        │
│    ├─ APIs Backend (5 nuevas + 1 mod)                     │
│    ├─ Componentes React (13 nuevos)                       │
│    ├─ Email Templates (4 nuevos)                          │
│    ├─ Constantes & Configuración                          │
│    ├─ Arquitectura de flujos                              │
│    └─ Consideraciones de seguridad                        │
│    Audiencia: Tech leads, Senior devs, Architects         │
│    Lectura: 40 min | Referencia: Durante impl.            │
│                                                             │
│ 3️⃣  UI_UX_MOCKUPS_EXPERIENCIAS.md                         │
│    ├─ Selector de tipo (1 pantalla)                       │
│    ├─ Flujo Clase Grupal (5 pantallas ASCII)              │
│    ├─ Flujo Experiencia Personalizada (5 pantallas ASCII) │
│    ├─ Email previsualizaciones (4 templates)              │
│    ├─ Admin panels (2 nuevos)                             │
│    ├─ Validaciones visuales                               │
│    └─ CTAs & Microcopy                                    │
│    Audiencia: Designers, Frontend devs, UX team           │
│    Lectura: 30 min | Referencia: Build phase              │
│                                                             │
│ 4️⃣  GUIA_IMPLEMENTACION_PASOS.md                          │
│    ├─ Fase 1: Base de Datos (SQL + Functions)            │
│    ├─ Fase 2: Tipos TypeScript                            │
│    ├─ Fase 3: APIs Backend                                │
│    ├─ Fase 4: Componentes React                           │
│    ├─ Fase 5: Integración App.tsx                         │
│    ├─ Fase 6: Email Templates                             │
│    ├─ Fase 7: Testing                                     │
│    ├─ Checklists de Calidad                               │
│    └─ Troubleshooting                                     │
│    Audiencia: Developers (implementadores)                │
│    Lectura: 2-3 horas | Referencia: Constant durante dev │
│                                                             │
│ 5️⃣  ÍNDICE_MAESTRO (ESTE ARCHIVO)                         │
│    ├─ Navegación de docs                                  │
│    ├─ Paths de lectura según rol                          │
│    ├─ Cross-references                                    │
│    ├─ FAQ técnicas                                        │
│    └─ Checklists de setup                                 │
│    Audiencia: Todos                                        │
│    Lectura: 5-10 min | Referencia: Inicio proyecto       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 NAVEGACIÓN POR SECCIONES

### 📍 Clases Grupales

**¿Cómo funciona?**
- Overview: `RESUMEN_EJECUTIVO.md` → "La Solución"
- Detalle: `PLAN_IMPLEMENTACION.md` → "FLUJO 1: CLASE GRUPAL"
- UI: `UI_UX_MOCKUPS.md` → "FLUJO 2: CLASE GRUPAL (WIZARD - 4 PASOS)"
- Implementación: `GUIA_IMPLEMENTACION_PASOS.md` → "FASE 4.2 - GroupClassWizard"

**Componentes relacionados:**
- `ExperienceTypeSelector` → Paso inicial
- `GroupClassWizard` → Orquestador
- `GroupClassTypeSelector` → Step 1
- `GroupAttendeeForm` → Step 2
- `GroupScheduleSelector` → Step 3
- `GroupBookingSummary` → Step 4

**APIs necesarias:**
- `GET /api/schedule/capacity` (grupos)
- `POST /api/bookings` (group type)
- `GET /api/bookings` (para listar)

**Base de datos:**
- Tabla: `group_bookings_metadata`
- Columnas nuevas en `bookings`: `booking_type`, `experience_confirmation_id`

---

### 🎨 Experiencias Personalizadas

**¿Cómo funciona?**
- Overview: `RESUMEN_EJECUTIVO.md` → "La Solución"
- Detalle: `PLAN_IMPLEMENTACION.md` → "FLUJO 2: EXPERIENCIA PERSONALIZADA"
- UI: `UI_UX_MOCKUPS.md` → "FLUJO 3: EXPERIENCIA PERSONALIZADA"
- Implementación: `GUIA_IMPLEMENTACION_PASOS.md` → "FASE 4.3-4.9"

**Componentes relacionados:**
- `ExperienceTypeSelector` → Paso inicial
- `PieceExperienceWizard` → Orquestador
- `PieceCategorySelector` → Step 1
- `PieceSelector` → Step 2
- `ExperienceDurationSelector` → Step 3
- `ExperienceBookingSummary` → Step 4
- `AdminExperienceConfirmationPanel` → Admin flow

**APIs necesarias:**
- `GET /api/pieces` (catálogo)
- `POST /api/experience-pricing` (cálculo)
- `POST /api/bookings` (experience type)
- `GET /api/experience-confirmations` (admin)
- `POST /api/bookings/:id/confirm-experience` (admin)
- `POST /api/bookings/:id/reject-experience` (admin)

**Base de datos:**
- Tabla: `pieces` (catálogo)
- Tabla: `experience_bookings_metadata` (metadatos)
- Tabla: `experience_confirmations` (control)

---

### 🔧 Base de Datos

**Consulta rápida:**
- Ver todas las tablas nuevas: `PLAN_IMPLEMENTACION.md` → "🗄️ ARQUITECTURA DE BASE DE DATOS"
- SQL completo: `GUIA_IMPLEMENTACION_PASOS.md` → "FASE 1.1: Crear Migración SQL"
- Funciones DB: `GUIA_IMPLEMENTACION_PASOS.md` → "FASE 1.3: Agregar Funciones"

**Tablas nuevas:**
1. `pieces` - Catálogo de piezas
2. `group_bookings_metadata` - Metadatos de grupos
3. `experience_bookings_metadata` - Metadatos de experiencias
4. `experience_confirmations` - Confirmaciones pendientes

**Cambios en `bookings`:**
- Agregar: `booking_type` (individual | group | experience)
- Agregar: `experience_confirmation_id` (UUID ref)

---

### 🛠️ APIs Backend

**Consulta rápida:**
- Lista completa: `PLAN_IMPLEMENTACION.md` → "🔌 APIs NUEVAS"
- Implementación paso a paso: `GUIA_IMPLEMENTACION_PASOS.md` → "FASE 3"

**Nuevas APIs:**
1. `GET /api/pieces` - Obtener catálogo
2. `POST /api/pieces` - Crear pieza (Admin)
3. `PUT /api/pieces/:id` - Editar pieza (Admin)
4. `DELETE /api/pieces/:id` - Eliminar pieza (Admin)
5. `POST /api/experience-pricing` - Calcular precio
6. `GET /api/experience-confirmations` - Listar pendientes (Admin)
7. `POST /api/bookings/:id/confirm-experience` - Confirmar (Admin)
8. `POST /api/bookings/:id/reject-experience` - Rechazar (Admin)

**APIs modificadas:**
- `POST /api/bookings` - Agregar lógica para `bookingType`

---

### 🎨 Componentes React

**Consulta rápida:**
- Lista completa: `PLAN_IMPLEMENTACION.md` → "🎨 COMPONENTES UI"
- Mockups: `UI_UX_MOCKUPS.md` → Todas las secciones
- Implementación: `GUIA_IMPLEMENTACION_PASOS.md` → "FASE 4"

**Nuevos componentes (13):**

**Selector:**
- `ExperienceTypeSelector.tsx` - Punto de entrada

**Flujo Grupal (4 + orquestador):**
- `GroupClassWizard.tsx` (orquestador)
- `GroupClassTypeSelector.tsx`
- `GroupAttendeeForm.tsx`
- `GroupScheduleSelector.tsx`
- `GroupBookingSummary.tsx`

**Flujo Experiencia (4 + orquestador):**
- `PieceExperienceWizard.tsx` (orquestador)
- `PieceCategorySelector.tsx`
- `PieceSelector.tsx`
- `ExperienceDurationSelector.tsx`
- `ExperienceBookingSummary.tsx`

**Admin (2):**
- `AdminExperienceConfirmationPanel.tsx`
- `PiecesManagementPanel.tsx`

---

### 📧 Emails

**Consulta rápida:**
- Previsualizaciones: `UI_UX_MOCKUPS.md` → "📧 EMAILS VISUALES"
- Especificaciones: `PLAN_IMPLEMENTACION.md` → "📧 EMAILS NUEVOS"
- Implementación: `GUIA_IMPLEMENTACION_PASOS.md` → "FASE 6"

**Templates nuevos (4):**
1. `groupClassConfirmation` - Clase grupal confirmada
2. `experiencePendingConfirmation` - Experiencia pendiente confirmación
3. `experienceConfirmed` - Experiencia confirmada por admin
4. `experienceRejected` - Experiencia rechazada + refund

---

### 🧪 Testing

**Consulta rápida:**
- Checklist manual: `GUIA_IMPLEMENTACION_PASOS.md` → "FASE 7: Testing"
- Casos de uso: `GUIA_IMPLEMENTACION_PASOS.md` → "Paso 7.1: Testing Manual"
- APIs a testear: `GUIA_IMPLEMENTACION_PASOS.md` → "Paso 7.2: Testing de APIs"

**Qué testear:**
- ✅ Flujo clase grupal completo
- ✅ Flujo experiencia personalizada completo
- ✅ Cálculo de capacidad horaria
- ✅ Cálculo de precios
- ✅ Envío de emails
- ✅ Panel admin (confirmar/rechazar)
- ✅ Sin console errors

---

## ❓ FAQ TÉCNICAS

### P: ¿En qué orden leo los documentos?

**A:** Depende de tu rol:
- **Stakeholder:** Solo RESUMEN_EJECUTIVO.md
- **Tech Lead:** RESUMEN → PLAN → GUIA (en ese orden)
- **Developer:** PLAN → UI/UX → GUIA (en ese orden)
- **Designer:** RESUMEN → UI/UX → PLAN

### P: ¿Dónde está el SQL?

**A:** Todo el SQL está en:
- `PLAN_IMPLEMENTACION.md` → Sección "🗄️ ARQUITECTURA DE BASE DE DATOS"
- `GUIA_IMPLEMENTACION_PASOS.md` → Sección "FASE 1.1: Crear Migración SQL"

**Archivo separado (recomendado):**
- Crear: `migrations/001_add_experiences.sql`

### P: ¿Dónde están los componentes React?

**A:** Especificaciones en:
- `PLAN_IMPLEMENTACION.md` → Sección "🎨 COMPONENTES UI"
- `UI_UX_MOCKUPS.md` → ASCII mockups de cada componente
- `GUIA_IMPLEMENTACION_PASOS.md` → Fase 4 (implementación)

### P: ¿Cuánto tiempo toma implementar?

**A:** ~40 horas distribuidas en 4 semanas:
- Semana 1: BD + Types (5h)
- Semana 2: Backend (6h)
- Semana 3: Frontend (8h)
- Semana 4: Integración + Testing (5h)

### P: ¿Necesito conocer Stripe?

**A:** No, ya está integrado en el proyecto. Solo reutiliza `PaymentInfo` existente.

### P: ¿Qué pasa si un cliente cancela?

**A:** Ver políticas en `PLAN_IMPLEMENTACION.md` → Sección "Consideraciones de Seguridad"

---

## 📋 CHECKLISTS DE SETUP

### Pre-Implementación (Dev Environment)

- [ ] Descargar/leer los 4 documentos
- [ ] Setup BD local (PostgreSQL)
- [ ] Clonar repo, crear rama `feature/experiences`
- [ ] Configurar variables de ambiente (ADMIN_CODE, etc.)
- [ ] Instalar dependencias (`npm install`)
- [ ] Verificar compilación TypeScript (`npm run build`)
- [ ] Verificar API local (`npm run dev`)

### Antes de Fase 1

- [ ] Team sync sobre arquitectura BD
- [ ] Confirmar naming de tablas/columnas
- [ ] Acceso a BD production (para backup)
- [ ] Plan de rollback

### Antes de Fase 3

- [ ] Endpoints documentados en Postman/API docs
- [ ] ADMIN_CODE generado y en .env
- [ ] Stripe webhook setup (si aplica)

### Antes de Fase 4

- [ ] Componentes reutilizables identificadas
- [ ] Estilos CSS consistency check
- [ ] Mobile responsive design confirmado

### Antes de Fase 7 (Testing)

- [ ] Test environment con BD test
- [ ] Stripe test mode habilitado
- [ ] Email service en modo test (no enviar reales)

---

## 🚀 QUICK START PATHS

### Path: "Quiero entender todo en 1 hora"

1. Leer: `RESUMEN_EJECUTIVO_EXPERIENCIAS.md` (10 min)
2. Leer: Sección "La Solución" + "Entregables" de PLAN (15 min)
3. Leer: Sección "Arquitectura BD + API" de PLAN (20 min)
4. Leer: "Selector tipo" + "Flujo Grupal" de UI/UX (15 min)

**Resultado:** Entiendes qué se está construyendo y por qué.

### Path: "Voy a implementar Fase 1 (BD)"

1. Leer: `GUIA_IMPLEMENTACION_PASOS.md` → FASE 1 completa (30 min)
2. Leer: `PLAN_IMPLEMENTACION.md` → Arquitectura BD (15 min)
3. Copy SQL de GUIA → Crear archivo `migrations/001_add_experiences.sql`
4. Ejecutar migraciones
5. Implementar funciones DB (copy del GUIA)
6. Testear con queries de verificación

**Tiempo:** ~2 horas

### Path: "Voy a implementar Fase 4 (Componentes)"

1. Leer: `UI_UX_MOCKUPS.md` → Todas las pantallas (30 min)
2. Leer: `PLAN_IMPLEMENTACION.md` → Componentes UI (20 min)
3. Leer: `GUIA_IMPLEMENTACION_PASOS.md` → Fase 4 (30 min)
4. Crear archivos componentes en `components/`
5. Implementar un componente por hora (13 componentes = 13h)
6. Integrar en App.tsx

**Tiempo:** ~15 horas

---

## 🔗 CROSS-REFERENCES (Busca en docs)

**Si quiero saber sobre...**

| Tema | Doc principal | Sección |
|------|---------------|---------|
| Clases Grupales | PLAN | "FLUJO 1: CLASE GRUPAL" |
| Experiencias | PLAN | "FLUJO 2: EXPERIENCIA PERSONALIZADA" |
| Precios | PLAN | "GUIA_PRACTI_MARCACION" → "EXPERIENCIA PRICING" |
| BD | GUIA | "FASE 1" |
| APIs | PLAN | "🔌 APIs NUEVAS" |
| React | GUIA | "FASE 4" |
| Emails | UI/UX | "📧 EMAILS VISUALES" |
| Admin | UI/UX | "ADMIN PANEL" |
| Testing | GUIA | "FASE 7" |
| Timeline | RESUMEN | "⏱️ TIMELINE" |
| Riesgos | RESUMEN | "🚀 RIESGOS" |

---

## 📞 SOPORTE & CONTACTO

**Preguntas técnicas arquitectónicas:**
- Revisar: `PLAN_IMPLEMENTACION.md`
- Pregunta específica: Buscar en PLAN sección relevante

**Preguntas de implementación:**
- Revisar: `GUIA_IMPLEMENTACION_PASOS.md`
- Pregunta específica: Buscar en GUIA fase relevante

**Preguntas de diseño/UX:**
- Revisar: `UI_UX_MOCKUPS.md`
- Pregunta específica: Buscar en UI/UX sección relevante

**Preguntas de negocio/impacto:**
- Revisar: `RESUMEN_EJECUTIVO_EXPERIENCIAS.md`

---

## 📊 ESTADÍSTICAS DE DOCUMENTACIÓN

| Documento | Páginas | Palabras | Secciones | Código |
|-----------|---------|----------|-----------|--------|
| RESUMEN_EJECUTIVO | 10 | ~3,000 | 15 | Ejemplos |
| PLAN_IMPLEMENTACION | 50 | ~12,000 | 20 | SQL, TS, JSON |
| UI_UX_MOCKUPS | 40 | ~8,000 | 15 | ASCII, HTML |
| GUIA_IMPLEMENTACION | 50 | ~10,000 | 25 | SQL, TS, React |
| **TOTAL** | **150** | **~33,000** | **75** | Completo |

---

## ✅ ESTADO DEL PROYECTO

```
🟢 DISEÑO ........................... ✅ COMPLETADO
   ├─ Arquitectura ................. ✅ Definida
   ├─ Tipos TypeScript ............ ✅ Especificados
   ├─ Base de datos ............... ✅ Esquemas listos
   ├─ APIs ....................... ✅ Endpoints especificados
   ├─ Componentes ................. ✅ Mockups listos
   ├─ Emails ..................... ✅ Templates diseñados
   └─ Testing .................... ✅ Plan listo

🟡 IMPLEMENTACIÓN ................... ⏳ PENDIENTE
   ├─ Fase 1: BD .................. ⏳ No iniciada
   ├─ Fase 2: Types .............. ⏳ No iniciada
   ├─ Fase 3: APIs ............... ⏳ No iniciada
   ├─ Fase 4: Componentes ........ ⏳ No iniciada
   ├─ Fase 5: Integración ........ ⏳ No iniciada
   ├─ Fase 6: Emails ............ ⏳ No iniciada
   └─ Fase 7: Testing ........... ⏳ No iniciada

🔴 PRODUCCIÓN ...................... ⏳ FUTURA
```

---

## 🎯 PRÓXIMOS PASOS

1. **Aprobación:** Team review de los 4 documentos (1 día)
2. **Kickoff:** Reunión de alineación (1h)
3. **Fase 1 Start:** Iniciar BD (semana 1)
4. **Check-ins:** Reuniones semanales de progreso
5. **QA:** Testing completo antes de deploy
6. **Launch:** Rollout a producción

---

**Última actualización:** 30 de Noviembre de 2025  
**Versión:** 1.0 (DISEÑO FINAL)  
**Estado:** ✅ READY FOR KICKOFF

---

📌 **GUARDA ESTE DOCUMENTO como referencia durante todo el proyecto**

