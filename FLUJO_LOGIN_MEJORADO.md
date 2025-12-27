# 🔐 Flujo de Autenticación Completo - Acceso + Creación de Sesiones

## Contexto: 3 Caminos de Usuario

El portal NO es solo para ver reservas existentes, sino también para **crear nuevas sesiones y reservas desde cero**. Por eso ahora soportamos:

1. **ACCEDER** → Cliente existing con booking previo
2. **CREAR NUEVA** → Cliente nuevo sin booking (lo crea después)
3. **RECOVERY** → Cliente olvidó su código

---

## Problema Identificado (Flujo ACCEDER)

El cliente tenía problemas cuando:
1. **Múltiples códigos**: ¿Cuál código ingresa si tiene 5 reservas?
2. **No recuerda código**: Sin email no hay forma de recuperarse
3. **Correo borrado**: Imposible usar recovery
4. **Código histórico diferente**: Cambios en el sistema = acceso bloqueado

## ✅ Problema Adicional (Flujo CREAR NUEVA)

El portal antes NO permitía:
1. **Nuevos clientes sin booking**: Estaban bloqueados
2. **Crear sesión sin código**: No podían entrar al panel
3. **Gestionar reservas antes de crearlas**: No había forma de ver opciones disponibles

## ✅ Solución Implementada

### Nuevo Flujo: 2-Paso → Email → Seleccionar Reserva

```
┌─────────────────┐
│  STEP 1: EMAIL  │  Usuario ingresa email
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ STEP 2: SELECCIONAR RESERVA ACTIVA  │ Sistema lista TODAS las reservas
└─────────────────────────────────────┘
         │
         ├──▶ 1 reserva     │ Auto-login
         ├──▶ 2+ reservas   │ Usuario elige
         └──▶ 0 reservas    │ Input código manual (fallback)
```

### Cambios Backend

#### 1. **Nuevo Endpoint: `/api/auth/list-bookings.ts`** (150 líneas)

```typescript
POST /api/auth/list-bookings
Body: { email: string }

Response:
{
  success: true,
  count: 3,
  bookings: [
    {
      id: 1,
      bookingCode: "ABC-123",
      classType: "Yoga",
      classDate: "28 de octubre",
      classTime: "10:00 AM",
      maxCapacity: 20,
      bookedCount: 18
    },
    // ... más reservas
  ]
}
```

**Función**: Después de que el cliente ingresa su email, este endpoint devuelve TODAS sus reservas activas (no solo una).

---

#### 2. **Actualizado: `/api/auth/login.ts`**

**Cambio**: Ahora acepta `bookingId` ADEMÁS de `bookingCode`

```typescript
POST /api/auth/login

// Opción 1 (nueva): Usar ID de reserva
Body: { email: "user@example.com", bookingId: 123 }

// Opción 2 (legacy): Usar código
Body: { email: "user@example.com", bookingCode: "ABC-123" }
```

**Beneficio**: Soporta ambos métodos, sin romper código existente.

---

#### 3. **Mejorado: `/api/auth/request-recovery.ts`**

**Cambio**: Retorna TODAS las reservas en lugar de solo una

```typescript
POST /api/auth/request-recovery
Body: { email: "user@example.com" }

Response:
{
  success: true,
  message: "Código enviado a tu email",
  bookings: [
    // Lista de TODAS las reservas activas
    { id: 1, bookingCode: "ABC-123", classType: "Yoga", ... },
    { id: 2, bookingCode: "DEF-456", classType: "Pilates", ... }
  ]
}
```

**Beneficio**: El cliente ve exactamente qué reservas tiene, puede elegir cuál recuperar.

---

#### 4. **Mejorado: `/api/auth/verify-recovery.ts`**

**Cambio**: Acepta `bookingId` opcional para retornar código de reserva específica

```typescript
POST /api/auth/verify-recovery

// Opción 1: Especificar cuál reserva
Body: { 
  email: "user@example.com", 
  recoveryCode: "123456",
  bookingId: 2  // ← Nuevo parámetro
}

// Opción 2: Usar la más reciente (legacy)
Body: { 
  email: "user@example.com", 
  recoveryCode: "123456"
}
```

---

### Cambios Frontend

#### 1. **Actualizado: `ClientLogin.tsx`** (270 líneas)

Nuevo sistema de 2 pasos:

**STEP 1: Email Input**
```tsx
- Usuario ingresa email
- Click "Siguiente"
- Llamada a /api/auth/list-bookings
```

**STEP 2: Seleccionar Reserva O Código Manual**

Si hay reservas:
```tsx
- Mostrar lista de botones (1 por reserva)
- Cada botón muestra: Clase, Fecha, Hora, Código
- Click en reserva = Auto-login con bookingId
- Si hay 2+ reservas: opción "Ingresa código manualmente"
```

Si NO hay reservas:
```tsx
- Mostrar input de código (fallback legacy)
- Permitir ingreso manual
```

**Código:**
```tsx
const handleSelectBooking = async (selectedId: number) => {
    const result = await login(email, undefined, selectedId); // bookingId
    if (result.success) onSuccess(authBooking);
};

const handleCodeSubmit = async (e) => {
    const result = await login(email, bookingCode); // legacy
    if (result.success) onSuccess(authBooking);
};
```

---

#### 2. **Actualizado: `context/AuthContext.tsx`**

Firma de función `login()` actualizada:

```typescript
// Antes:
login: (email: string, bookingCode: string) => Promise<...>

// Ahora:
login: (email: string, bookingCode?: string, bookingId?: number) => Promise<...>
```

Maneja ambos casos:
```tsx
if (bookingId) {
    payload.bookingId = bookingId;  // Nuevo
} else if (bookingCode) {
    payload.bookingCode = bookingCode;  // Legacy
}
```

---

### Casos de Uso Resueltos

| Caso | Antes | Ahora |
|------|-------|-------|
| **1 reserva** | ✓ Funciona | ✓ Login automático |
| **5 reservas** | ✗ Confusión | ✓ Elige visualmente |
| **Olvidó código** | ✗ Bloqueado | ✓ Recovery → lista de reservas |
| **Sin correo guardado** | ✗ Imposible | ✓ Ingresa en step 2 |
| **Correo histórico diferente** | ✗ No funciona | ✓ Sistema busca por email |
| **Código cambió en BD** | ✗ Error | ✓ Selecciona por ID, no por código |

---

## 🔍 Flujos de Usuario

### Flujo 1: Cliente con 1 Reserva (Happy Path)

```
1. Click "Acceder" → Ingresa email
2. Sistema encontró 1 reserva → Auto-login
3. ✅ Acceso concedido
```

### Flujo 2: Cliente con 3 Reservas

```
1. Click "Acceder" → Ingresa email
2. Sistema muestra:
   ┌─────────────────────────┐
   │ Yoga - 28 oct a las 10AM │ Código: ABC-123
   ├─────────────────────────┤
   │ Pilates - 30 oct        │ Código: DEF-456
   ├─────────────────────────┤
   │ Cerámica - 2 nov        │ Código: GHI-789
   └─────────────────────────┘
3. Cliente elige "Pilates"
4. ✅ Acceso concedido a esa reserva
```

### Flujo 3: Cliente Olvidó Código

```
1. Click "¿Olvidaste tu código?"
2. Ingresa email
3. Sistema envía código 6-dígito
4. Cliente verifica código
5. Sistema muestra lista de reservas
6. Cliente selecciona la que quiere
7. Sistema retorna código de esa reserva
8. ✅ Cliente puede copiar y usar después
```

### Flujo 4: Sin Reservas Activas (Fallback)

```
1. Ingresa email
2. Sistema: "No hay reservas activas"
3. Opción: "Ingresa código manualmente"
4. Input texto para código legacy
5. ✅ Si existe = Acceso
```

---

## 📊 Comparación API Calls

**Antes:**
```
POST /api/auth/login
{
  email: "user@example.com",
  bookingCode: "ABC-123"
}
→ Directo a login (requiere saber el código)
```

**Ahora:**
```
1. POST /api/auth/list-bookings
   { email: "user@example.com" }
   ← [ { id: 1, bookingCode, classType, ... } ]

2. POST /api/auth/login
   { email: "user@example.com", bookingId: 1 }
   ← { success, accessToken, booking }
```

**Beneficio**: 2 llamadas bien estructuradas vs 1 que requería información previa.

---

## 🔒 Seguridad Mantenida

✅ **Rate Limiting**: Aún se aplica en `/api/auth/login`
✅ **httpOnly Cookies**: Aún protegidas
✅ **JWT Tokens**: Aún seguros (15min/7day)
✅ **Audit Logging**: Aún registrado en `auth_events`
✅ **Email Validation**: Valida formato en frontend y backend
✅ **6-digit Recovery Codes**: TTL 15 minutos

---

## 🚀 Testing Checklist

- [ ] Login con 1 reserva
- [ ] Login con 3+ reservas → elegir una
- [ ] Recovery → lista de reservas
- [ ] Recovery → seleccionar distinta a la primera
- [ ] Fallback código manual
- [ ] Email inválido → error
- [ ] Código expirado → error
- [ ] Rate limit (5 intentos fallidos)
- [ ] Session timeout (30 min)
- [ ] Múltiples tabs → sincronizado

---

## 📝 Notas Técnicas

### Cambios en `AuthContext.login()`

```typescript
// Nuevo signature
async login(
  email: string, 
  bookingCode?: string,      // Legacy
  bookingId?: number         // New
): Promise<{success, error}>
```

### Orden de Ejecución

1. **Frontend**: Ingresa email → fetch `/api/auth/list-bookings`
2. **Backend**: Retorna lista de reservas
3. **Frontend**: Muestra opciones
4. **Frontend**: Usuario elige → fetch `/api/auth/login` con `bookingId`
5. **Backend**: Valida y retorna JWT + booking
6. **Frontend**: Guarda token en httpOnly cookie + muestra dashboard

### Base de Datos (Sin cambios)

- `bookings` table: Sigue igual
- `auth_events` table: Logs incluyen `bookingId` cuando aplica
- No hay migración necesaria ✓

---

## 🎯 Próximos Pasos (Tier 2+)

- [ ] Enviar recovery code por email (actualmente console.log)
- [ ] UI para mostrar código copiable en recovery
- [ ] Validación adicional (verificación de identidad)
- [ ] 2FA si es necesario
- [ ] Recordar última reserva accedida

