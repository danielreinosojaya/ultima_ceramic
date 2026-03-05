# 🔍 Análisis End-to-End: Bug de Sobrescritura de Restricciones

## 🔴 PROBLEMA RAÍZ IDENTIFICADO

El bug ocurría por una **Race Condition + Stale Data en el prop del componente**:

1. **El componente recibe restricciones como un PROP desde AdminDataContext**
2. **Cuando el usuario guarda, el contexto se actualiza ASÍNCRONAMENTE (3-5 segundos)**
3. **Si el usuario agrega una segunda restricción ANTES de que se complete el fetch anterior:**
   - El componente usa `experienceTypeOverrides = {}` (prop viejo/stale)
   - Crea una copia local vacía
   - Envía solo la restricción nueva al backend
   - El backend intenta mergear, pero el frontend siempre ve datos stale

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Cambios en `ScheduleSettingsManager.tsx`:

#### 1. **Importar useEffect**
```tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
```

#### 2. **Crear estado LOCAL para restricciones**
```tsx
// 🔧 FIX: Estado LOCAL de restricciones para evitar stale data
const [localExperienceTypeOverrides, setLocalExperienceTypeOverrides] = useState<ExperienceTypeOverrides>(() => 
    JSON.parse(JSON.stringify(experienceTypeOverrides))
);
```

#### 3. **Sincronizar con el prop cuando el context se actualiza**
```tsx
// 🔧 FIX: Sincronizar estado local cuando el prop cambia (después de refresh del context)
useEffect(() => {
    if (experienceTypeOverrides && Object.keys(experienceTypeOverrides).length > 0) {
        const updated = JSON.parse(JSON.stringify(experienceTypeOverrides));
        setLocalExperienceTypeOverrides(updated);
        console.log('[ScheduleSettingsManager] Sincronizado:', updated);
    }
}, [experienceTypeOverrides]);
```

#### 4. **Actualización Optimística en handleAddTechRestriction**
```tsx
const handleAddTechRestriction = async () => {
    // Usar estado LOCAL, no el prop
    const updatedOverrides = JSON.parse(JSON.stringify(localExperienceTypeOverrides));
    
    // Modificar localmente
    updatedOverrides[dateStr][selectedTechForRestrict] = { allowedTimes, reason };
    
    // 🔧 OPTIMISTIC UPDATE: Actualizar estado LOCAL inmediatamente
    setLocalExperienceTypeOverrides(updatedOverrides);
    
    // LUEGO enviar al backend (el usuario ve cambio inmediato)
    await dataService.mergeExperienceTypeOverrides(updatedOverrides);
    onDataChange();
};
```

#### 5. **Lo mismo para handleRemoveTechRestriction**
```tsx
const handleRemoveTechRestriction = async () => {
    const updatedOverrides = JSON.parse(JSON.stringify(localExperienceTypeOverrides));
    
    // Eliminación local
    delete updatedOverrides[dateStr][selectedTechForRestrict];
    
    // 🔧 OPTIMISTIC UPDATE
    setLocalExperienceTypeOverrides(updatedOverrides);
    
    await dataService.mergeExperienceTypeOverrides(updatedOverrides);
    onDataChange();
};
```

#### 6. **Actualizar currentTechRestriction para usar LOCAL state**
```tsx
const currentTechRestriction = useMemo(() => {
    if (!selectedTechRestrictDate) return null;
    const dateStr = formatDateToYYYYMMDD(selectedTechRestrictDate);
    // Usar estado LOCAL, no el prop
    return localExperienceTypeOverrides?.[dateStr]?.[selectedTechForRestrict];
}, [selectedTechRestrictDate, selectedTechForRestrict, localExperienceTypeOverrides]);
```

---

## 🔄 Flujo DESPUÉS del Fix

### T=0ms: Usuario abre ScheduleSettingsManager
```
Frontend Context: experienceTypeOverrides = {}
Local State: localExperienceTypeOverrides = {} (inicializado desde prop)
```

### T=100ms: Usuario agrega RESTRICCIÓN 1 (30/3, Pintura, 09:00)
```
1. Deep copy de localExperienceTypeOverrides (que es {})
2. Modifica localmente
3. ✅ OPTIMISTIC UPDATE: setLocalExperienceTypeOverrides(updated)
   → El componente RE-RENDERIZA con la nueva restricción VISIBLE INMEDIATAMENTE
4. Envía al backend (mergeExperienceTypeOverrides)
5. Backend hace deepMerge({}, restriction1) guardaen BD ✓
6. clearCache() limpia cache
7. onDataChange() → refresh() inicia fetch asíncrono
```

### T=200-300ms: Mientras fetch está in-flight, usuario agrega RESTRICCIÓN 2
```
1. Deep copy de localExperienceTypeOverrides
   ✅ AHORA TIENE la restricción 1 (porque ya está en el estado local!)
2. Modifica localmente para agregar restricción 2
3. ✅ OPTIMISTIC UPDATE: setLocalExperienceTypeOverrides({restriction1, restriction2})
   → El componente RE-RENDERIZA con AMBAS visibles inmediatamente
4. Envía al backend
5. Backend lee BD: { restriction1 }
6. deepMerge({ restriction1 }, { restriction1, restriction2 })
   = { restriction1, restriction2 } ✓
7. Guarda en BD ✓
```

### T=500ms: Fetch del context completa
```
getData('experienceTypeOverrides') retorna { restriction1, restriction2 } desde BD
dispatch({ type: 'SET_SECONDARY_DATA', data: { experienceTypeOverrides: {...} } })
useEffect dispara: setLocalExperienceTypeOverrides(synced_data)
El componente está CONSISTENTE ✓
```

---

## 🎯 Beneficios del Fix

1. ✅ **No más Race Conditions**: El estado local se actualiza ANTES de enviar al backend
2. ✅ **Optimistic Updates**: El usuario ve cambios INMEDIATAMENTE (no espera al servidor)
3. ✅ **Data Consistency**: Cada nuevo save usa el estado local más reciente
4. ✅ **Resilencia**: Aunque el context actualice lentamente, el componente mantiene su propia fuente de verdad

---

## 📊 Cambios de Archivos

- ✅ `context/AdminDataContext.tsx` - Agregado carga de `experienceTypeOverrides`
- ✅ `components/admin/ScheduleSettingsManager.tsx` - Implementado estado local + optimistic updates

---

## 🧪 Testing

Para validar que el fix funciona:

1. Abrir ScheduleSettingsManager
2. Agregar restricción 1 (ej: 30/3, Pintura, 09:00)
3. **INMEDIATAMENTE** (sin esperar, mientras fetch está in-flight) agregar restricción 2 (ej: 31/3, Torno, 10:00)
4. Ambas deberían verse en el UI ✅
5. Cerrar y reabrir ScheduleSettingsManager
6. Ambas restricciones deberían persistir ✅



