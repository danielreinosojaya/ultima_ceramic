# Fix de Timestamps Incorrectos

## Problema
Los timestamps guardados en la BD tienen 5 horas de más debido a un error en el cálculo previo.

**Síntoma:** La hora mostrada es incorrecta (ej: muestra 10:55 PM cuando debería ser 5:55 PM)

## Solución

### Paso 1: Ejecutar el fix
```bash
curl -X POST "http://localhost:3000/api/fix-timestamps-now?adminCode=ADMIN2025"
```

**O en producción:**
```bash
curl -X POST "https://tu-dominio.vercel.app/api/fix-timestamps-now?adminCode=ADMIN2025"
```

### Paso 2: Verificar resultado
El endpoint retornará:
```json
{
  "success": true,
  "message": "Timestamps corregidos",
  "stats": {
    "entriesFixed": N,
    "exitsFixed": N,
    "hoursRecalculated": N
  },
  "before": [...],
  "after": [...]
}
```

### Qué hace el endpoint
1. **Identifica** registros con hora UTC >= 13 (incorrectos)
2. **Resta 5 horas** a `time_in` y `time_out`
3. **Recalcula** `hours_worked` correctamente
4. **Retorna** estado antes/después para validar

### Ejemplo de corrección
```
ANTES:
- time_in: 2025-11-06T22:55:03Z (10:55 PM UTC)
- Mostrado: 10:55 PM en Bogotá ❌ (incorrecto)

DESPUÉS:
- time_in: 2025-11-06T17:55:03Z (5:55 PM UTC)
- Mostrado: 5:55 PM en Bogotá ✅ (correcto)
```

## Prevención
El código nuevo ya NO tiene este problema:
- Usa `now.toISOString()` (UTC puro)
- Frontend convierte con `toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })`
- No más Date objects fake

## Cuándo ejecutar
- ✅ Si ves horas incorrectas en registros existentes
- ✅ Después de migrar de código viejo a nuevo
- ❌ NO ejecutar si las horas ya se ven correctas

---
**Creado**: 6 de Noviembre de 2025 @ 5:00 PM
