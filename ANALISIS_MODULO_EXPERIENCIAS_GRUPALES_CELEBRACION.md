# 📊 ANÁLISIS END-TO-END: MÓDULO DE EXPERIENCIAS GRUPALES Y CELEBRACIÓN

**Fecha de Análisis**: 2026-01-31  
**Versión del Sistema**: Última Ceramic  
**Estado**: En Producción (con funcionalidad limitada)

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Características y Bondades](#2-características-y-bondades)
3. [Arquitectura y Componentes](#3-arquitectura-y-componentes)
4. [Flujos de Trabajo](#4-flujos-de-trabajo)
5. [Errores y Bugs Identificados](#5-errores-y-bugs-identificados)
6. [Limitaciones](#6-limitaciones)
7. [Problemas de Seguridad](#7-problemas-de-seguridad)
8. [Problemas de Rendimiento](#8-problemas-de-rendimiento)
9. [Recomendaciones](#9-recomendaciones)

---

## 1. RESUMEN EJECUTIVO

El módulo de **Experiencias Grupales con Celebración** es una funcionalidad avanzada del sistema de reservas de Última Ceramic que permite:

- **Experiencias grupales personalizadas** (2-30 personas)
- **Celebraciones completas** con menú, decoración y actividades para niños
- **Tres técnicas de cerámica**: Torno Alfarero, Modelado a Mano, Pintura de Piezas

### Estado Actual

| Funcionalidad | Estado | Notas |
|--------------|--------|-------|
| Solo Cerámica | ✅ Activo | Funcionando en producción |
| Celebración Completa | ⚠️ Deshabilitado UI | Código implementado pero UI bloqueada |
| Menú de Alimentos | ✅ Implementado | 15 items predefinidos |
| Gestión de Niños | ✅ Implementado | Selector de piezas para niños |
| Cálculo de Precios | ✅ Activo | Con IVA y tarifas diferenciadas |

---

## 2. CARACTERÍSTICAS Y BONDADES

### 2.1 Tipos de Experiencias

```typescript
type CustomExperienceType = 'ceramic_only' | 'celebration';
```

#### A. Solo Cerámica (`ceramic_only`)
- **Mínimo**: 2 personas
- **Máximo**: 22 personas
- **Precio**: Por técnica y persona (incluye IVA)
  - Torno Alfarero: $55/persona
  - Modelado a Mano: $45/persona
  - Pintura de Piezas: Precio por pieza seleccionada

#### B. Celebración Completa (`celebration`)
- **Participantes activos**: Personas que hacen cerámica (pagan técnica)
- **Invitados**: Personas que solo asisten (ocupan espacio)
- **Niños**: Actividad especial con piezas para pintar
- **Menú**: Bebidas, snacks y comidas
- **Espacio**: Alquiler por hora + IVA
  - Entre semana (Mar-Jue): $65/hora
  - Fin de semana (Vie-Dom): $100/hora

### 2.2 Configuración de Celebración

```typescript
interface CelebrationConfig {
  activeParticipants: number;  // Personas que hacen cerámica
  guests: number;              // Invitados sin actividad
  hours: number;               // Horas de alquiler
  bringDecoration: boolean;    // Trae decoración
  bringCake: boolean;          // Trae torta
  hasChildren: boolean;        // Hay niños
  childrenCount?: number;      // Cantidad de niños
  childrenPieces?: ChildPieceSelection[];  // Piezas seleccionadas
  menuSelections: MenuSelection[];         // Items del menú
}
```

### 2.3 Menú Disponible (15 items)

**Bebidas** ($1.50 - $3.50):
- Agua, Jugo Natural, Gaseosa, Café, Té

**Snacks** ($2.00 - $8.00):
- Papas Fritas, Nachos, Palomitas, Galletas, Bandeja de Frutas

**Comidas** ($5.50 - $18.00):
- Sandwich, Pizza (8 porciones), Empanadas (6 unidades), Wrap, Ensalada

### 2.4 Bondades del Sistema

1. **Flexibilidad de técnicas**: Cada participante puede elegir técnica diferente
2. **Capacidades diferenciadas**:
   - Torno: máximo 8 personas
   - Modelado: máximo 14 personas
   - Pintura: sin límite
3. **Presets de distribución**:
   - Balanceado (8 torno, 14 modelado, resto pintura)
   - Todo modelado
   - Todo torno
   - Mitad torno, mitad modelado
4. **Validación de capacidades**: Bloqueo si se excede el límite por técnica
5. **Cálculo automático de precios**: Incluye IVA y todas las variables

---

## 3. ARQUITECTURA Y COMPONENTES

### 3.1 Componentes Principales

```
components/experiences/
├── CustomExperienceWizard.tsx      # Wizard principal (5 pasos)
├── GroupClassWizard.tsx            # Wizard de clases grupales
├── PieceExperienceWizard.tsx       # Wizard de experiencias con piezas
├── MenuSelector.tsx                # Selector de menú (15 items)
├── ChildPieceSelector.tsx          # Selector de piezas para niños
├── FreeDateTimePicker.tsx          # Selector de fecha/hora libre
└── ...
```

### 3.2 Flujo del Wizard (CustomExperienceWizard)

```
┌─────────────────────────────────────────────────────────────┐
│  PASO 1: Tipo de Actividad                                   │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Solo Cerámica │  │ Celebración  │ [Deshabilitado]        │
│  │   (Activo)    │  │ (Muy pronto) │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 2: Configuración                                       │
│  • Selección de técnica                                      │
│  • Número de participantes                                   │
│  • Configuración de celebración (si aplica)                  │
│  • Selector de menú                                          │
│  • Configuración de niños                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 3: Fecha y Hora                                        │
│  • Calendario disponible                                     │
│  • Horarios según capacidad                                  │
│  • Validación de disponibilidad                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 4: Datos del Usuario                                   │
│  • Información personal                                      │
│  • Datos de facturación (opcional)                           │
│  • Aceptación de políticas                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 5: Confirmación y Pago                                 │
│  • Resumen de la reserva                                     │
│  • Cálculo de precios                                        │
│  • Proceso de pago                                           │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Estructura de Datos

```typescript
// Estado del wizard
interface CustomExperienceWizardState {
  experienceType: CustomExperienceType | null;  // 'ceramic_only' | 'celebration'
  technique: GroupTechnique | null;             // 'potters_wheel' | 'hand_modeling' | 'painting'
  config: CeramicOnlyConfig | CelebrationConfig | null;
  selectedTimeSlot: CustomExperienceTimeSlot | null;
  pricing: CustomExperiencePricing | null;
  currentStep: 1 | 2 | 3 | 4 | 5;
  isLoading: boolean;
  error: string | null;
}

// Precios de espacio
const SPACE_HOURLY_PRICING = {
  weekday: 65,      // Mar-Jue
  weekend: 100,     // Vie-Dom
  vatRate: 0.15     // IVA Ecuador
};

// Capacidades por técnica
const GROUP_CLASS_CAPACITY = {
  potters_wheel: 8,
  hand_modeling: 14,
  painting: Infinity  // Sin límite
};
```

---

## 4. FLUJOS DE TRABAJO

### 4.1 Flujo: Solo Cerámica

```typescript
// 1. Usuario selecciona "Solo Cerámica"
setState({ experienceType: 'ceramic_only', config: { participants: 2 } });

// 2. Selecciona técnica y número de participantes
const config: CeramicOnlyConfig = {
  participants: 5,
  pieceSelections: [] // Solo si es painting
};

// 3. Selección de fecha/hora disponible
const timeSlot: CustomExperienceTimeSlot = {
  date: '2026-02-15',
  startTime: '10:00',
  endTime: '12:00',
  hours: 2,
  isWeekend: true,
  hourlyRate: 100
};

// 4. Cálculo de precios
const pricing: CustomExperiencePricing = {
  techniquePrice: 55,      // Si es torno
  techniqueTotal: 275,     // 55 × 5 participantes
  total: 275
};
```

### 4.2 Flujo: Celebración (Deshabilitado en UI)

```typescript
// 1. Usuario seleccionaría "Celebración" (bloqueado en UI)
setState({ experienceType: 'celebration' });

// 2. Configuración completa
const config: CelebrationConfig = {
  activeParticipants: 8,   // Hacen cerámica
  guests: 4,               // Solo invitados
  hours: 3,                // 3 horas de espacio
  bringDecoration: true,
  bringCake: true,
  hasChildren: true,
  childrenCount: 3,
  childrenPieces: [...],   // Piezas seleccionadas para niños
  menuSelections: ['pizza', 'gaseosa', 'nachos']
};

// 3. Cálculo de precios completo
const pricing: CustomExperiencePricing = {
  // Espacio
  spaceHours: 3,
  spaceRate: 100,          // Fin de semana
  spaceSubtotal: 300,
  spaceVat: 45,            // 15% IVA
  spaceTotalWithVat: 345,
  
  // Técnicas
  activeTechniqueTotal: 440,  // 8 personas × $55 torno
  
  // Menú
  menuTotal: 23.50,        // Pizza + gaseosas + nachos
  
  // Piezas niños
  childrenPiecesTotal: 54,  // 3 niños × $18 mínimo
  
  // Total
  total: 862.50
};
```

### 4.3 Integración con Sistema de Reservas

```typescript
// En App.tsx - Manejo de confirmación
const handleCustomExperienceConfirm = (booking: CustomExperienceBooking) => {
  // Guardar asignaciones de técnicas para GROUP_CLASS
  if (booking.experienceType === 'ceramic_only' || booking.experienceType === 'celebration') {
    const assignments = booking.config.participants.map((_, i) => ({
      participantNumber: i + 1,
      technique: booking.technique
    }));
    (window as any).__groupClassAssignments = assignments;
  }
  
  // Continuar con flujo de reserva
  setSelectedProduct(product);
  setView('summary');
};
```

---

## 5. ERRORES Y BUGS IDENTIFICADOS

### 5.1 Bug Crítico: Celebración Deshabilitada pero Código Activo

**Ubicación**: `CustomExperienceWizard.tsx:260-300`

```tsx
{/* Celebración (deshabilitada: Muy pronto) */}
<button
  disabled
  aria-disabled="true"
  className="... opacity-60 grayscale cursor-not-allowed"
>
  <h3>
    Celebración
    <span className="...">Muy pronto</span>
  </h3>
</button>
```

**Problema**: 
- La UI muestra "Muy pronto" pero todo el código backend está implementado
- Los usuarios no pueden acceder a una funcionalidad que está lista
- Pérdida potencial de ingresos por eventos de celebración

**Impacto**: Alto - Funcionalidad completa no accesible

### 5.2 Bug: Validación de Capacidad Inconsistente

**Ubicación**: `GroupClassWizard.tsx:204-210`

```typescript
const validateCapacities = (): string => {
  const techniqueCounts = participantAssignments.reduce((acc, a) => {
    acc[a.technique] = (acc[a.technique] || 0) + 1;
    return acc;
  }, {} as Record<GroupTechnique, number>);

  for (const [technique, count] of Object.entries(techniqueCounts)) {
    const limit = GROUP_CLASS_CAPACITY[technique as GroupTechnique];
    if (count > limit) {
      return `${techLabel}: máximo ${limit} personas (tienes ${count})`;
    }
  }
  return '';
};
```

**Problema**:
- La validación ocurre solo en el frontend
- No hay validación equivalente en el backend
- Podría permitirse una reserva que exceda capacidad si se manipula la API

**Impacto**: Medio - Posible sobreventa

### 5.3 Bug: Menú Hardcodeado

**Ubicación**: `MenuSelector.tsx:18-39`

```typescript
const MENU_ITEMS: MenuItem[] = [
  { id: 'agua', name: 'Agua', price: 1.5, category: 'bebidas' },
  { id: 'jugo', name: 'Jugo Natural', price: 3.5, category: 'bebidas' },
  // ... 13 items más
];
```

**Problema**:
- Los items del menú están hardcodeados en el código
- No se pueden modificar sin redeploy
- No hay integración con sistema de inventario

**Impacto**: Medio - Falta de flexibilidad operativa

### 5.4 Bug: Precio Mínimo de Piezas Hardcodeado

**Ubicación**: `ChildPieceSelector.tsx:21`

```typescript
const MINIMUM_PIECE_PRICE = 18;
```

**Problema**:
- Precio mínimo fijo en código
- No configurable desde admin
- Si cambia el precio mínimo, requiere modificar código

**Impacto**: Bajo - Poco flexible pero funcional

### 5.5 Bug: Inconsistencia en Nombres de Técnicas

**Ubicación**: Múltiples archivos

```typescript
// En types.ts
export type GroupTechnique = 'potters_wheel' | 'hand_modeling' | 'painting';

// En api/data.ts
const techniqueNames: Record<string, string> = {
  'potters_wheel': 'Torno Alfarero',
  'hand_modeling': 'Modelado a Mano',
  'painting': 'Pintura de piezas'
};

// En GroupClassWizard.tsx
const labels: Record<GroupTechnique, string> = {
  hand_modeling: '🤚 Modelado a Mano',
  potters_wheel: '🎡 Torno Alfarero',
  painting: '🎨 Pintura de Piezas'
};
```

**Problema**:
- Los nombres de técnicas están duplicados en múltiples lugares
- Riesgo de inconsistencias si se modifica uno y no el otro
- No hay fuente única de verdad

**Impacto**: Medio - Riesgo de inconsistencias

### 5.6 Bug: Window Object para Comunicación Entre Componentes

**Ubicación**: `App.tsx:474-477`

```typescript
// Add groupClassMetadata for GROUP_CLASS bookings
if (finalDetails.product!.type === 'GROUP_CLASS') {
  const assignments = (window as any).__groupClassAssignments as ParticipantTechniqueAssignment[] | undefined;
```

**Problema**:
- Uso de `window.__groupClassAssignments` para pasar datos
- Patrón anti-pattern en React
- Riesgo de pérdida de datos si se recarga la página
- No es escalable ni mantenible

**Impacto**: Alto - Arquitectura frágil

---

## 6. LIMITACIONES

### 6.1 Limitaciones Funcionales

| Limitación | Descripción | Impacto |
|------------|-------------|---------|
| Celebración no disponible | UI bloqueada a pesar de que el código está listo | Alto - Pérdida de negocio |
| Menú estático | 15 items fijos, no editable desde admin | Medio - Falta de flexibilidad |
| Sin gestión de inventario | No se controla stock de items del menú | Medio - Riesgo de ofrecer lo que no hay |
| Sin integración de pagos para menú | El menú se paga en persona, no online | Medio - Fricción en el pago |
| Límite de 22 personas | Capacidad física del espacio | Bajo - Límite razonable |

### 6.2 Limitaciones Técnicas

| Limitación | Descripción | Impacto |
|------------|-------------|---------|
| Validación solo frontend | Capacidades validadas solo en UI | Alto - Riesgo de sobreventa |
| No hay tests automatizados | Sin cobertura de tests para este módulo | Alto - Riesgo de regresiones |
| Código duplicado | Lógica de técnicas en múltiples archivos | Medio - Dificulta mantenimiento |
| Acoplamiento con App.tsx | Uso de window object para comunicación | Alto - Arquitectura frágil |

### 6.3 Limitaciones de UX

| Limitación | Descripción | Impacto |
|------------|-------------|---------|
| Sin preview de espacio | No hay fotos del espacio para celebraciones | Medio - Dificulta decisión |
| Sin ejemplos de decoración | No hay inspiración para decoración | Bajo - Menor conversión |
| Sin gestión de preferencias alimentarias | No se preguntan alergias o dietas especiales | Medio - Riesgo de experiencia negativa |

---

## 7. PROBLEMAS DE SEGURIDAD

### 7.1 Validación Insuficiente en Backend

**Problema**: La validación de capacidades ocurre solo en el frontend.

**Riesgo**: Un usuario podría manipular la API para crear una reserva que exceda la capacidad real.

**Ejemplo de ataque**:
```bash
curl -X POST /api/data?action=addBooking \
  -d '{
    "productType": "GROUP_CLASS",
    "groupClassMetadata": {
      "techniqueAssignments": [
        {"technique": "potters_wheel"}  // × 20 veces
      ]
    }
  }'
```

**Mitigación recomendada**:
```typescript
// En api/data.ts - Validar capacidad antes de insertar
if (body.productType === 'GROUP_CLASS' && groupMetadata) {
  const techniqueCounts = groupMetadata.techniqueAssignments.reduce((acc, a) => {
    acc[a.technique] = (acc[a.technique] || 0) + 1;
    return acc;
  }, {});
  
  for (const [technique, count] of Object.entries(techniqueCounts)) {
    if (count > GROUP_CLASS_CAPACITY[technique]) {
      throw new Error(`Capacidad excedida para ${technique}`);
    }
  }
}
```

### 7.2 Exposición de Datos por Window Object

**Problema**: Uso de `window.__groupClassAssignments` expone datos globales.

**Riesgo**: 
- Datos pueden ser modificados por scripts de terceros
- Pérdida de datos entre navegaciones
- No funciona en SSR (Server Side Rendering)

### 7.3 Falta de Rate Limiting Específico

**Problema**: No hay rate limiting específico para el wizard de experiencias.

**Riesgo**: Posible DoS mediante múltiples intentos de reserva.

---

## 8. PROBLEMAS DE RENDIMIENTO

### 8.1 Re-renderizados Innecesarios

**Ubicación**: `CustomExperienceWizard.tsx`

**Problema**: El componente usa múltiples `useState` que causan re-renderizados en cascada.

```typescript
const [state, setState] = useState<CustomExperienceWizardState>({...});
const [menuTotal, setMenuTotal] = useState(0);
const [showChildPieceSelector, setShowChildPieceSelector] = useState(false);
// ... más estados
```

**Impacto**: En dispositivos móviles lentos, el wizard puede sentirse lento.

### 8.2 Cálculos en Cada Render

**Ubicación**: `CustomExperienceWizard.tsx:1050-1100`

**Problema**: Los cálculos de precios se realizan en cada render sin memoización.

```typescript
const calculateTotalPricing = () => {
  // Cálculos complejos en cada render
};
```

**Solución recomendada**:
```typescript
const pricing = useMemo(() => calculateTotalPricing(), [
  state.config,
  state.technique,
  state.experienceType,
  menuTotal
]);
```

### 8.3 Carga de Piezas

**Problema**: Todas las piezas se cargan para el selector de niños, aunque no siempre se necesiten.

**Impacto**: Carga innecesaria de datos si no hay niños en la celebración.

---

## 9. RECOMENDACIONES

### 9.1 Inmediatas (Alta Prioridad)

1. **Habilitar Celebración**
   - Remover `disabled` del botón de celebración
   - Realizar pruebas exhaustivas antes de activar
   - Timeline: 1-2 semanas

2. **Agregar Validación Backend**
   - Implementar validación de capacidades en `api/data.ts`
   - Prevenir sobreventa mediante validación server-side
   - Timeline: 1 semana

3. **Refactorizar Comunicación de Componentes**
   - Reemplazar `window.__groupClassAssignments` con Context o props
   - Mejorar arquitectura de datos
   - Timeline: 2 semanas

### 9.2 Corto Plazo (Media Prioridad)

4. **Admin de Menú**
   - Crear CRUD para items del menú
   - Permitir precios dinámicos
   - Timeline: 2-3 semanas

5. **Tests Automatizados**
   - Crear tests unitarios para lógica de precios
   - Tests de integración para flujo completo
   - Timeline: 2-3 semanas

6. **Centralizar Nombres de Técnicas**
   - Crear constantes compartidas
   - Eliminar duplicación
   - Timeline: 1 semana

### 9.3 Mediano Plazo (Baja Prioridad)

7. **Optimización de Rendimiento**
   - Implementar `useMemo` y `useCallback`
   - Lazy loading de componentes
   - Timeline: 3-4 semanas

8. **Mejoras de UX**
   - Galería de fotos del espacio
   - Ejemplos de decoración
   - Campo de alergias/alimentación
   - Timeline: 4-6 semanas

9. **Integración de Inventario**
   - Sistema de stock para items del menú
   - Alertas de bajo inventario
   - Timeline: 4-6 semanas

---

## 10. CONCLUSIÓN

El módulo de Experiencias Grupales con Celebración es una funcionalidad **robusta pero subutilizada**. El código está bien estructurado y completo, pero la decisión de negocio de mantener la celebración deshabilitada impide aprovechar todo su potencial.

### Estado General

| Aspecto | Calificación | Notas |
|---------|--------------|-------|
| Funcionalidad | ⭐⭐⭐⭐☆ | Completa pero bloqueada |
| Código | ⭐⭐⭐⭐☆ | Bien estructurado, algunos anti-patterns |
| Seguridad | ⭐⭐⭐☆☆ | Falta validación backend |
| Rendimiento | ⭐⭐⭐☆☆ | Optimizable |
| UX | ⭐⭐⭐⭐☆ | Buena pero con limitaciones |

### Próximos Pasos Recomendados

1. **Activar celebración** después de pruebas exhaustivas
2. **Implementar validación backend** para prevenir sobreventa
3. **Refactorizar arquitectura** para eliminar dependencia de window object
4. **Crear panel de admin** para gestión del menú

---

**Documento generado**: 2026-01-31  
**Analista**: Sistema de Análisis Automatizado  
**Versión**: 1.0