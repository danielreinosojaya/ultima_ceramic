# 🎛️ Guía de Control de Features - Sistema de Flags

## 📍 Ubicación del Archivo de Control

**Archivo principal:** `featureFlags.ts` (raíz del proyecto)

Este archivo centraliza el control de todas las funcionalidades que están en desarrollo o pendientes de activación.

---

## 🚀 Features Actualmente Deshabilitadas (27 Dic 2025)

Todas las siguientes opciones están **temporalmente deshabilitadas** y muestran "Próximamente" a los clientes:

1. ✋ **Experiencia Personalizada** - Grupos personalizados con técnicas a elección
2. ✋ **Clases Sueltas** - Clases individuales o grupales 
3. ✋ **Curso de Torno desde Cero** - Curso completo de 6 horas
4. ✋ **Experiencias para Parejas** - Cita creativa en el taller

### ✅ Features Activas (Sin cambios)
- Soy Nuevo Aquí (Clase Introductoria)
- Ya Soy Alumno (Paquetes)
- Open Studio
- Experiencias Grupales (contacto)
- Team Building Corporativo (contacto)

---

## 🔧 Cómo ACTIVAR una Feature

### Paso 1: Abrir el archivo de configuración
```bash
# Ruta: /featureFlags.ts
```

### Paso 2: Cambiar el flag de `false` a `true`

**Antes (deshabilitado):**
```typescript
export const FEATURE_FLAGS = {
  EXPERIENCIA_PERSONALIZADA: false,  // ❌ Deshabilitado
  CLASES_SUELTAS: false,
  CURSO_TORNO: false,
  EXPERIENCIAS_PAREJAS: false,
};
```

**Después (habilitado):**
```typescript
export const FEATURE_FLAGS = {
  EXPERIENCIA_PERSONALIZADA: true,  // ✅ Habilitado
  CLASES_SUELTAS: false,
  CURSO_TORNO: false,
  EXPERIENCIAS_PAREJAS: false,
};
```

### Paso 3: Rebuild y deploy
```bash
npm run build
vercel --prod  # o el método de deploy que uses
```

---

## 📋 Tabla de Referencia Rápida

| Feature | Flag en código | Ubicación visual | Estado actual |
|---------|---------------|------------------|---------------|
| Experiencia Personalizada | `EXPERIENCIA_PERSONALIZADA` | Card izquierda superior | ❌ Deshabilitado |
| Clases Sueltas | `CLASES_SUELTAS` | Card derecha superior | ❌ Deshabilitado |
| Curso de Torno | `CURSO_TORNO` | Banner azul grande | ❌ Deshabilitado |
| Experiencias Parejas | `EXPERIENCIAS_PAREJAS` | Primera card abajo | ❌ Deshabilitado |

---

## 🎨 Cambios Visuales Implementados

### Cuando un feature está DESHABILITADO:
- ✅ Card aparece **grisáceo** (opacity 60%)
- ✅ Botón muestra **"Próximamente"** en lugar del texto original
- ✅ Botón está **deshabilitado** (no clickeable)
- ✅ Cursor cambia a **not-allowed**
- ✅ Borde gris suave para indicar estado inactivo

### Cuando un feature está HABILITADO:
- ✅ Card con colores normales y hover effects
- ✅ Botón con texto original ("Crear Experiencia", "Reservar Clase", etc.)
- ✅ Botón clickeable y funcional
- ✅ Navegación normal al flujo correspondiente

---

## 🔍 Detalles Técnicos de la Implementación

### Archivos Modificados:
1. **`featureFlags.ts`** (NUEVO) - Archivo de configuración centralizado
2. **`components/WelcomeSelector.tsx`** - Componente principal de selección

### Cambios NO invasivos:
- ❌ NO se eliminó ninguna funcionalidad
- ❌ NO se modificaron flujos de reserva
- ❌ NO se alteró el backend
- ✅ Solo se agregó control visual de acceso
- ✅ Toda la lógica sigue intacta

### Componentes que usan los flags:
```typescript
// En WelcomeSelector.tsx
import { FEATURE_FLAGS } from '../featureFlags';

// Experiencia Personalizada
isComingSoon={!FEATURE_FLAGS.EXPERIENCIA_PERSONALIZADA}

// Clases Sueltas
isComingSoon={!FEATURE_FLAGS.CLASES_SUELTAS}

// Curso de Torno
disabled={!FEATURE_FLAGS.CURSO_TORNO}
{FEATURE_FLAGS.CURSO_TORNO ? 'Ver Detalles del Curso →' : 'Próximamente'}

// Experiencias Parejas
isComingSoon={!FEATURE_FLAGS.EXPERIENCIAS_PAREJAS}
```

---

## 🎯 Escenarios de Uso

### Escenario 1: Activar UNA sola feature
```typescript
// Solo activar Clases Sueltas
export const FEATURE_FLAGS = {
  EXPERIENCIA_PERSONALIZADA: false,
  CLASES_SUELTAS: true,           // ✅ Esta se activa
  CURSO_TORNO: false,
  EXPERIENCIAS_PAREJAS: false,
};
```

### Escenario 2: Activar TODAS las features
```typescript
export const FEATURE_FLAGS = {
  EXPERIENCIA_PERSONALIZADA: true,  // ✅
  CLASES_SUELTAS: true,             // ✅
  CURSO_TORNO: true,                // ✅
  EXPERIENCIAS_PAREJAS: true,       // ✅
};
```

### Escenario 3: Activar por fases (recomendado)
```typescript
// Fase 1: Primero Clases Sueltas
CLASES_SUELTAS: true,

// Fase 2 (1 semana después): Agregar Experiencia Personalizada
EXPERIENCIA_PERSONALIZADA: true,
CLASES_SUELTAS: true,

// Fase 3: Agregar resto
// (todas true)
```

---

## ⚠️ IMPORTANTE - Checklist antes de activar

Antes de cambiar un flag a `true`, verifica:

- [ ] **Backend está listo** - Los endpoints funcionan correctamente
- [ ] **Base de datos** - Las tablas necesarias existen (pieces, etc.)
- [ ] **Testing** - Se probó el flujo completo en staging
- [ ] **Capacidad** - Hay cupos disponibles en el calendario
- [ ] **Equipo informado** - Staff sabe que la feature está activa
- [ ] **Emails configurados** - Notificaciones funcionan

---

## 🔄 Proceso de Activación Recomendado

### 1. Ambiente de Testing (Staging)
```bash
# En featureFlags.ts
EXPERIENCIA_PERSONALIZADA: true,

# Build y test local
npm run build
npm run dev

# Verificar en http://localhost:3000
```

### 2. Validación Manual
- ✅ Ver que el botón ya no diga "Próximamente"
- ✅ Click al botón lleva al flujo correcto
- ✅ Flujo completo funciona (selección → pago → confirmación)
- ✅ Emails se envían correctamente

### 3. Deploy a Producción
```bash
vercel --prod
```

### 4. Monitoreo Post-Deploy
- ✅ Verificar en ceramicalma.com
- ✅ Probar en móvil y desktop
- ✅ Revisar logs de Vercel por errores
- ✅ Verificar que reservas se registren en DB

---

## 🛠️ Troubleshooting

### Problema: "Cambié el flag pero sigue diciendo Próximamente"
**Solución:**
1. Verifica que guardaste el archivo `featureFlags.ts`
2. Ejecuta `npm run build` de nuevo
3. Limpia cache del navegador (Cmd+Shift+R en Mac)
4. Si usas Vercel, espera 30-60 segundos después del deploy

### Problema: "El botón está habilitado pero da error al hacer click"
**Solución:**
1. Verifica que el backend esté funcionando
2. Revisa console del navegador para errores JavaScript
3. Verifica que las tablas de DB existan (ej: pieces para Experiencias)

### Problema: "Quiero deshabilitar temporalmente"
**Solución:**
```typescript
// Simplemente vuelve a cambiar a false
EXPERIENCIA_PERSONALIZADA: false,
```
Rebuild y redeploy. No se pierde ningún dato.

---

## 📞 Contacto y Soporte

**Desarrollador:** GitHub Copilot  
**Fecha de implementación:** 27 de diciembre, 2025  
**Sistema:** Feature Flags con archivo centralizado

**Para cambios:**
1. Edita `/featureFlags.ts`
2. Ejecuta `npm run build`
3. Deploy a producción

**Archivos de referencia:**
- `featureFlags.ts` - Configuración principal
- `components/WelcomeSelector.tsx` - Implementación visual
- Este documento - Guía completa

---

## 📊 Historial de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 27 Dic 2025 | Sistema de feature flags implementado | GitHub Copilot |
| 27 Dic 2025 | Todas las features deshabilitadas por defecto | GitHub Copilot |

---

## 🎓 Notas Adicionales

### ¿Por qué este método?
- ✅ **Centralizado**: Un solo archivo para controlar todo
- ✅ **Reversible**: Activar/desactivar sin tocar código
- ✅ **Seguro**: No se elimina funcionalidad, solo se oculta
- ✅ **Rápido**: Cambio de 1 línea + rebuild
- ✅ **Claro**: Comentarios explican cada feature

### ¿Se puede agregar más features?
Sí, simplemente agrega al objeto `FEATURE_FLAGS`:
```typescript
export const FEATURE_FLAGS = {
  // ... existentes
  NUEVA_FEATURE: false,  // Agregar aquí
};
```

Luego usa en el componente:
```typescript
isComingSoon={!FEATURE_FLAGS.NUEVA_FEATURE}
```

---

**Documento actualizado:** 27 de diciembre, 2025  
**Versión:** 1.0  
**Estado:** ✅ Production-ready
