# 🔧 FIX URGENTE: Error "Rendered fewer hooks than expected"

**Problema**: `Error: Rendered fewer hooks than expected. This may be caused by an accidental early return statement.`

**Componente Afectado**: `GiftcardsManager.tsx` línea 82

**Causa Raíz**: Violación de Rules of Hooks - `useEffect` dentro de render inline function

---

## ❌ Problema Identificado

El código estaba haciendo:

```typescript
// DENTRO DE render, en una función anidada
<td>
  {(() => {
    const code = ...;
    const bal = ...;
    
    // ❌ VIOLACIÓN: Hook dentro de condicional en función de render
    if (bal === null && code) {
      React.useEffect(() => {  // ← Llamar useEffect en render = BAN
        validateCodeLazy(code, req.id);
      }, [code, req.id]);
    }
    
    return <span>{bal}</span>;
  })()}
</td>
```

**Por qué falla**:
- React require que **TODOS los hooks** se llamen en el mismo orden **en CADA render**
- Si llamas `useEffect` dentro de un `if`, a veces se llama, a veces no
- Resultado: "Rendered fewer hooks than expected" ← el # de hooks varía

---

## ✅ Solución Implementada

### Paso 1: Mover hooks al top level del componente

```typescript
const GiftcardsManager: React.FC = () => {
  // ✅ Declarar state en top level
  const [visibleRows, setVisibleRows] = React.useState<Set<string>>(new Set());
  
  // ✅ CORRECTO: useEffect en top level
  React.useEffect(() => {
    if (!adminData.giftcardRequests) return;
    
    // Validar todas las filas visibles
    for (const req of adminData.giftcardRequests) {
      if (!visibleRows.has(String(req.id))) continue;
      
      const code = (req as any).metadata?.issuedCode || ...;
      if (!code) continue;
      
      const cached = cacheRef.current[code];
      if (cached) continue; // Ya en caché
      if (validationInProgressRef.current.has(code)) continue; // Ya validando
      
      // Validar
      validateCodeLazy(code, req.id);
    }
  }, [visibleRows, adminData.giftcardRequests, validateCodeLazy]);
  
  // ... resto del componente
};
```

### Paso 2: Tracking de visibilidad

```typescript
// Cuando usuario hace hover sobre una fila, marcarla como visible
<tr 
  key={req.id} 
  className="border-t"
  onMouseEnter={() => setVisibleRows(prev => new Set([...prev, String(req.id)]))}
>
```

### Paso 3: Simplificar renderizado

```typescript
// ✅ CORRECTO: Solo renderizar, SIN hooks
<td>
  {(() => {
    const code = ...;
    const bal = getBalanceForRequest(req);
    
    // ✅ Sin useEffect aquí - solo lógica de renderizado
    if (bal === null) return <span>—</span>;
    return <span>${bal.toFixed(2)}</span>;
  })()}
</td>
```

---

## 📊 Cambios Realizados

| Archivo | Cambio |
|---------|--------|
| `components/admin/GiftcardsManager.tsx` | ✅ Agregado `visibleRows` state |
| `components/admin/GiftcardsManager.tsx` | ✅ Movido `validateCodeLazy` logic a `useEffect` top-level |
| `components/admin/GiftcardsManager.tsx` | ✅ Removido `useEffect` inline de render |
| `components/admin/GiftcardsManager.tsx` | ✅ Agregado `onMouseEnter` para tracking |

---

## 🎯 Behavior After Fix

### Antes (❌ Error)
```
1. Usuario abre GiftcardsManager
2. Renderiza tabla
3. Inline function intenta llamar useEffect
4. React: "diferentes # de hooks en cada render"
5. ❌ Crash: "Rendered fewer hooks than expected"
```

### Después (✅ Funciona)
```
1. Usuario abre GiftcardsManager
2. Renderiza tabla (sin hooks en render)
3. useEffect top-level: valida solo filas visibles
4. Usuario hace hover sobre fila
5. onMouseEnter → setVisibleRows → dispara re-validation
6. ✅ Lazy load valida código cuando es necesario
```

---

## 🔍 Validación

El error debería desaparecer y ver:
- ✅ GiftcardsManager se renderiza sin errores
- ✅ Console logs muestran `[GiftcardsManager.getBalanceForRequest]` cuando hover
- ✅ `validateCodeLazy` se llama solo para filas visibles
- ✅ Cache previene re-validaciones

---

## 🛠️ Build Status

✅ **Success, 0 errors**

---

## 📋 Rules of Hooks Reference

❌ **NEVER**:
```typescript
if (condition) {
  useEffect(...); // ← Hook en condicional
}

function renderHelper() {
  useState(...); // ← Hook en función anidada
}

{(() => {
  useEffect(...); // ← Hook en IIFE
})()}
```

✅ **ALWAYS**:
```typescript
// Top level del componente
const [state, setState] = useState(...);

useEffect(() => {
  // Lógica aquí
}, [deps]);

// Condiciones DENTRO del hook, no al revés
useEffect(() => {
  if (condition) {
    // acciones
  }
}, []);
```

---

**Status**: ✅ **FIXED - Ready to Test**
