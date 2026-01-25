# FIX: Email Subject Validation Error 422

**Fecha:** 25 de enero, 2026  
**Status:** ✅ RESUELTO Y VALIDADO

---

## 🔍 ANÁLISIS DEL PROBLEMA

### Síntoma Observado
```
POST /emails
Status: 422
Error: "The `\\n` is not allowed in the `subject` field."
```

### Request Body Problemático
```json
{
  "subject": "¡+ ¡Tus piezas están listas! - Una taza hecha a mano! Tiene una huella, un perrito y adentro dice ENZO\nPueden pintar"
}
```

---

## 🎯 ROOT CAUSE

**Origen del problema:** Cliente

El campo `description` del formulario de entregas permite entrada multilínea (textarea). Cuando el administrador ingresa texto con saltos de línea, este se usa directamente en el subject del email.

**Proveedor de email:** Resend API no permite caracteres `\n` o `\r` en el campo `subject` de emails (estándar RFC 5322).

**Ubicación del código afectado:**
- [api/emailService.ts](api/emailService.ts#L590) - `sendDeliveryScheduledEmail`
- [api/emailService.ts](api/emailService.ts#L643) - `sendDeliveryPhotosReceivedEmail`
- [api/emailService.ts](api/emailService.ts#L715) - `sendDeliveryReadyEmail`
- [api/emailService.ts](api/emailService.ts#L791) - `sendDeliveryReminderEmail`
- [api/emailService.ts](api/emailService.ts#L854) - `sendDeliveryCompletedEmail`

### ¿Error del Cliente o del Sistema?

**Respuesta:** Error del sistema (falta de validación/sanitización)

- El cliente usó el formulario correctamente
- El sistema no validó ni sanitizó la entrada antes de usarla en el subject
- El error 422 ocurrió en runtime, no en validación de frontend

---

## 🔧 SOLUCIÓN IMPLEMENTADA

### Cambios Aplicados

Sanitización de `displayDescription` antes de usarlo en subjects:

```typescript
// ANTES (❌)
const displayDescription = delivery.description || 'Tus piezas de cerámica';
const subject = `✨ ¡Tus piezas están listas! - ${displayDescription}`;

// DESPUÉS (✅)
const displayDescription = delivery.description || 'Tus piezas de cerámica';
// Sanitize subject: remove newlines and excessive whitespace
const sanitizedDescription = displayDescription.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
const subject = `✨ ¡Tus piezas están listas! - ${sanitizedDescription}`;
```

### Lógica de Sanitización

```typescript
.replace(/[\n\r]+/g, ' ')   // Reemplaza \n y \r con espacio
.replace(/\s+/g, ' ')        // Normaliza múltiples espacios a uno solo
.trim()                      // Remueve espacios al inicio/final
```

### Archivos Modificados

- [api/emailService.ts](api/emailService.ts)
  - `sendDeliveryScheduledEmail()` - Línea ~590
  - `sendDeliveryPhotosReceivedEmail()` - Línea ~643
  - `sendDeliveryReadyEmail()` - Línea ~715
  - `sendDeliveryReminderEmail()` - Línea ~791
  - `sendDeliveryCompletedEmail()` - Línea ~854

**Total:** 5 funciones sanitizadas

---

## ✅ VALIDACIÓN Y TESTING

### Test Unitario
**Script:** [scripts/test-subject-sanitization-unit.ts](scripts/test-subject-sanitization-unit.ts)

```bash
npx tsx scripts/test-subject-sanitization-unit.ts
```

**Resultados:**
```
✅ TEST 1 PASSED: Salto de línea simple (\n)
✅ TEST 2 PASSED: Múltiples saltos de línea
✅ TEST 3 PASSED: Windows line endings (\r\n)
✅ TEST 4 PASSED: Múltiples espacios
✅ TEST 5 PASSED: Mix de saltos de línea y espacios
✅ TEST 6 PASSED: Caso real del error reportado
✅ TEST 7 PASSED: String normal sin caracteres especiales
✅ TEST 8 PASSED: Solo saltos de línea
✅ TEST 9 PASSED: Espacios al inicio y final
✅ TEST 10 PASSED: Emojis y caracteres especiales válidos

Total: 10/10 tests passed ✅
```

### Build Verification
```bash
npm run build
```

**Resultado:** ✅ Build exitoso sin errores TypeScript

---

## 🧪 CASOS DE PRUEBA VALIDADOS

| Input | Output Esperado | Status |
|-------|----------------|--------|
| `"Taza\nBowl"` | `"Taza Bowl"` | ✅ |
| `"A\r\nB"` | `"A B"` | ✅ |
| `"Texto   con    espacios"` | `"Texto con espacios"` | ✅ |
| `"¡Taza!\nPueden pintar"` | `"¡Taza! Pueden pintar"` | ✅ |
| `"\n\n\n"` | `""` | ✅ |
| `"   Taza   "` | `"Taza"` | ✅ |
| `"Normal text"` | `"Normal text"` | ✅ |

---

## 📊 IMPACTO

### Antes del Fix
- ❌ Error 422 cuando description contiene saltos de línea
- ❌ Email no se envía
- ❌ Cliente no recibe notificación

### Después del Fix
- ✅ Subject sanitizado automáticamente
- ✅ Email se envía exitosamente
- ✅ Cliente recibe notificación correctamente
- ✅ Texto multilínea se convierte en texto de una línea

### Ejemplo Real

**Input del admin:**
```
Una taza hecha a mano!
Tiene una huella, un perrito y adentro dice ENZO
Pueden pintar
```

**Subject generado (ANTES):** ❌ Error 422

**Subject generado (DESPUÉS):**
```
✨ ¡Tus piezas están listas! - Una taza hecha a mano! Tiene una huella, un perrito y adentro dice ENZO Pueden pintar
```

---

## 🔮 PREVENCIÓN FUTURA

### Recomendaciones Implementadas
1. ✅ Sanitización automática en backend (capa de seguridad)
2. ✅ Tests unitarios para validar sanitización
3. ✅ Documentación del fix

### Mejoras Opcionales (No Implementadas)
- [ ] Validación en frontend: Mostrar advertencia si textarea contiene saltos de línea
- [ ] Límite de caracteres en description para evitar subjects muy largos
- [ ] Preview del subject antes de enviar

---

## 📝 CONCLUSIÓN

**Problema identificado:** Subject con caracteres `\n` causa error 422 en proveedor de email

**Root cause:** Falta de sanitización de entrada del usuario

**Solución:** Sanitización automática mediante regex en backend

**Validación:** 10/10 tests unitarios passed + build exitoso

**Estado:** ✅ RESUELTO - Sistema ahora maneja correctamente texto multilínea en subjects

---

**Autor:** GitHub Copilot  
**Timestamp:** 2026-01-25T20:00:00Z
