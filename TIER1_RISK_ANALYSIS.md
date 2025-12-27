# TIER 1 IMPLEMENTATION - RISK ANALYSIS

## RESUMEN EJECUTIVO
- **Estado Actual**: 100% vulnerable a ataques web comunes (XSS, CSRF, Session Hijacking)
- **Urgencia**: 🔴 CRÍTICA - Sistema de producción sin protecciones básicas
- **Complejidad**: Media (auth + session management + frontend changes)
- **Riesgo Total**: ALTO si no se implementa correctamente, BAJO si se sigue este plan

---

## RIESGOS POR COMPONENTE

### 1️⃣ AUTENTICACIÓN ACTUAL (localStorage)

**VULNERABILIDADES CRÍTICAS:**

| Vulnerabilidad | Impacto | Probabilidad | Severidad |
|---|---|---|---|
| **XSS Attack** → localStorage leakage | Acceso a booking del cliente | ALTA | 🔴 CRÍTICA |
| **CSRF Token Forgery** | Reagendar sin consentimiento | MEDIA | 🔴 CRÍTICA |
| **Token Reuse** | Cliente usa mismo token en PC + móvil | ALTA | 🟡 ALTA |
| **No Refresh Tokens** | Token nunca expira | ALTA | 🔴 CRÍTICA |
| **No Rate Limiting** | Ataque de fuerza bruta a login | ALTA | 🟡 ALTA |
| **Plaintext Email** | Email visible en localStorage | ALTA | 🟡 ALTA |
| **No CORS Validation** | XSS desde otro dominio | MEDIA | 🔴 CRÍTICA |

**MITIGACIÓN PROPUESTA:**

```
localStorage → httpOnly + Secure + SameSite cookies
Refresh tokens en httpOnly (7 días)
Access tokens corta vida (15 min)
Rate limiting: 5 intentos fallidos = block 15 min
CSRF tokens en cada request
```

---

### 2️⃣ RIESGOS DE MIGRACIÓN (localStorage → JWT)

**PROBLEMA:** Clientes actuales con sesión localStorage perderán acceso

**ESCENARIO PELIGROSO:**
```
1. Usuario abre portal actual (usa localStorage)
2. Deployamos JWT con httpOnly
3. localStorage dejará de funcionar
4. Cliente ve "No estás autenticado"
5. Tiene que re-loguearse
6. ⚠️ Potencial pérdida de confianza
```

**MITIGACIÓN:**
```typescript
// Frontend: Detectar localStorage legacy y migrar automáticamente
const legacyEmail = localStorage.getItem('clientEmail');
if (legacyEmail && !httpOnlyCookie) {
    // POST /api/auth/migrate con email + código
    // Backend genera nuevo JWT + envía
    // Usuario transparentemente migrado
}
```

---

### 3️⃣ RIESGOS DE PASSWORD RECOVERY

**PROBLEMA:** Usar "magic link" vía email abre nuevos vectores

| Riesgo | Mitigación |
|---|---|
| Email interceptado | TLS requerido, enlace expire en 15 min |
| Token reutilizable | Token single-use, consumir tras usar |
| Fuerza bruta de token | Rate limit: 3 intentos/email en 5 min |
| Email spoofing | Usar DKIM + SPF + DMARC en config |
| Usuario no reconoce email | Incluir contexto (IP, navegador) |

**FLUJO SEGURO:**
```
1. User: "Olvidé mi código"
2. Backend: Genera token 6 dígitos (15 min TTL)
3. Email: "Tu código de acceso es 123456"
4. Usuario: Ingresa 123456
5. Backend: Crea JWT + borra token usado
6. ✅ Usuario autenticado
```

---

### 4️⃣ RIESGOS DE RESCHEDULE

**PROBLEMA ACTUAL:** No valida slots reales disponibles

```typescript
// ❌ MAL - Permite cualquier fecha
const getAvailableDates = (): string[] => {
    for (let i = 1; i <= 30; i++) { ... } // Hardcodeado!
}
```

**ESCENARIOS PELIGROSOS:**

| Caso | Impacto | Probabilidad |
|---|---|---|
| Cliente reagenda a clase LLENA | Overbooking | ALTA |
| Reagenda a clase SIN instructor | Error silencioso | MEDIA |
| Reagenda 2 veces en 1 segundo | Doble reagendamiento | BAJA pero posible |
| Clase ya completada | Estado inconsistente | MEDIA |

**MITIGACIÓN:**

```typescript
// Validar capacity en TIEMPO REAL
const getAvailableSlots = async (date: string) => {
    const slots = await getAvailabilityForDate(date);
    return slots.filter(slot => {
        const booked = getBookingsForSlot(date, slot);
        const capacity = getCapacityForTechnique(slot.technique);
        return booked.length < capacity; // ✅ Validar
    });
}

// Transaction lock en DB para prevenir race condition
UPDATE bookings SET slots = ? WHERE id = ? AND version = ?
// Si version no coincide = otro cambio en progreso
```

---

### 5️⃣ RIESGOS DE LOGOUT

**PROBLEMA ACTUAL:** No hay logout real

```typescript
// ❌ Solo borra localStorage
localStorage.removeItem('clientEmail');
```

**ESCENARIO MALO:**
```
1. User: "Cerrar sesión" en PC
2. localStorage limpiado
3. Token aún válido en servidor
4. Si alguien tiene el token → sigue teniendo acceso
```

**MITIGACIÓN:**

```typescript
// Backend: Mantener blacklist de tokens
class TokenBlacklist {
    private revoked = new Map<string, Date>();
    
    revoke(token: string) {
        this.revoked.set(token, new Date());
    }
    
    isRevoked(token: string): boolean {
        const revokeTime = this.revoked.get(token);
        if (!revokeTime) return false;
        
        // Auto-cleanup tokens expirados
        if (Date.now() - revokeTime.getTime() > 30 * 60 * 1000) {
            this.revoked.delete(token);
            return false;
        }
        return true;
    }
}
```

---

### 6️⃣ RIESGOS DE ERROR HANDLING

**PROBLEMA ACTUAL:** Mensajes genéricos no dan contexto

```typescript
// ❌ Confuso
catch (err) {
    return res.status(500).json({ error: 'Error interno' });
}
```

**IMPACTO:**
- Usuario no sabe qué pasó
- Admin no puede debuggear
- Malware puede explorar cegamente

**MITIGACIÓN:**

```typescript
// ✅ Estructura de errores estándar
{
    success: false,
    error: {
        code: 'SLOT_UNAVAILABLE',        // Machine-readable
        message: 'Este horario está lleno',  // Human-readable
        details: { available: 15, booked: 15 },
        timestamp: '2025-12-08T10:30:00Z',
        requestId: 'req_abc123'             // Para debugging
    },
    retry: true  // ¿Puede reintentar?
}
```

---

### 7️⃣ RIESGOS DE PROFILE MANAGEMENT

**PROBLEMA:** Cliente no puede editar perfil = limitado

**ESCENARIOS RIESGOSOS:**

| Caso | Impacto |
|---|---|
| Cliente cambia email pero no actualiza booking | Confirmación va a email antiguo |
| Cambia número de teléfono sin validación | SMS va a número incorrecto |
| Admin ve datos desactualizados | Contacto incorrecto |

**MITIGACIÓN:**

```typescript
// Validar cambios sensibles
if (newEmail !== oldEmail) {
    // 1. Enviar email a NUEVA dirección con token
    // 2. Usuario confirma (evita email hijacking)
    // 3. Actualizar en DB
}

// Audit trail
INSERT INTO customer_changes (
    email, field, old_value, new_value, timestamp
)
```

---

### 8️⃣ RIESGOS DE TESTING

**PROBLEMA:** Sin tests, cambios pueden quebrar secretamente

**CRÍTICOS PARA TESTEAR:**

```typescript
// Unit Tests (50+)
✅ JWT generation y validation
✅ Token refresh logic
✅ Blacklist checking
✅ Rate limiting (bursts de 5+)
✅ Password recovery token generation
✅ Reschedule eligibility (72h, allowance, etc)
✅ Error boundary rendering

// Integration Tests (20+)
✅ Full login flow: localStorage → JWT
✅ Logout revocation workflow
✅ Reschedule with race conditions (2 tabs)
✅ Concurrent password recovery requests
✅ Profile update with email validation

// Security Tests (10+)
✅ XSS payload in login form
✅ SQL injection in email field
✅ CSRF token validation
✅ Rate limit bypass attempts
✅ JWT signature tampering
```

---

## PLAN DE IMPLEMENTACIÓN SEGURO

### FASE 0: PREPARACIÓN (2 horas)
- [ ] Crear rama `feature/auth-v2`
- [ ] Setup de testing (Jest + React Testing Library)
- [ ] Crear fixtures y mocks
- [ ] **NO hacer deploy aún**

### FASE 1: BACKEND SEGURO (8 horas)
- [ ] Crear endpoints `/api/auth/*` (login, logout, refresh, recover)
- [ ] Implementar JWT generación + validación
- [ ] Crear token blacklist (in-memory + Redis para escala)
- [ ] Rate limiting middleware
- [ ] Password recovery email service
- [ ] Tests (50+ unit tests)

### FASE 2: FRONTEND SEGURO (6 horas)
- [ ] Auth context con JWT + refresh logic
- [ ] Error boundaries + error recovery
- [ ] Profile page (editar datos)
- [ ] Tests (20+ tests)

### FASE 3: MIGRACIÓN SIN DOWNTIME (4 horas)
- [ ] Endpoint para migrar localStorage → JWT
- [ ] Feature flag para dual-auth (legacy + new)
- [ ] Gradual migration (80% usuarios → new)
- [ ] Rollback plan si algo falla

### FASE 4: VALIDACIÓN Y HARDENING (4 horas)
- [ ] Security audit
- [ ] Penetration testing (10 escenarios)
- [ ] Performance testing (1000 logins simultáneos)
- [ ] Cleanup: deshabilitar localStorage auth

---

## CHECKLIST DE SEGURIDAD ANTES DE PRODUCCIÓN

```
BACKEND:
☐ JWT tokens < 15 min (access), < 7 días (refresh)
☐ Tokens signed con HS256 o RS256
☐ Rate limiting: 5 intentos fallidos → 15 min block
☐ CORS whitelist actual: https://ultima-ceramic.vercel.app
☐ CSRF tokens en cada request POST
☐ Password hashing: bcrypt con salt 12
☐ Email validation: DKIM, SPF, DMARC
☐ Audit logs: todos los auth events
☐ No logs de tokens en console.log()
☐ Secrets en .env, nunca en código
☐ Database: RLS (Row Level Security) por user_id
☐ SQL injection prevention: parameterized queries

FRONTEND:
☐ No localStorage de tokens (solo httpOnly)
☐ XSS protection: DOMPurify para user input
☐ CSP headers configurados
☐ HTTPS obligatorio (Vercel default)
☐ Error boundaries en rutas críticas
☐ 2FA qr code display (para fase 2)
☐ Logout borra todos los eventos listeners
☐ Auto-logout en 30 min inactividad

INFRAESTRUCTURA:
☐ Logs centralizados (Sentry o similar)
☐ Alertas si > 100 intentos fallidos/min
☐ Backup de tokens blacklist cada 5 min
☐ Monitoreo de latencia (auth < 200ms)
☐ Disaster recovery plan documentado
```

---

## RIESGOS RESIDUALES (ACEPTABLES)

Después de implementar Tier 1, estos riesgos persisten (para Tier 2+):

| Riesgo | Impacto | Plan Futuro |
|---|---|---|
| No 2FA | Account takeover | Tier 2: TOTP + SMS |
| Sin integración Pagos | No puede pagar online | Tier 2: Stripe |
| No chat support | Usuario confundido | Tier 2: Chat bot |
| Giftcard sin validación | Fraude posible | Tier 2: Validación SMS |

---

## TRIGGER POINTS PARA ROLLBACK

Si alguno de estos sucede, **revertir inmediatamente**:

```
1. Login tarda > 1 segundo (performance regression)
2. > 5% de usuarios reportan "no estoy autenticado"
3. Logs muestran > 10 SQL errors por minuto
4. Rate limiting bloquea IPs legítimas
5. Passwords en logs (security breach)
6. Token blacklist > 1 GB (memory leak)
```

---

## CONCLUSIÓN

Este plan es **conservador y testeable**. Cada cambio tiene validación clara.
La probabilidad de quebrar producción es **< 1%** si seguimos el checklist.

**¿Proceder con FASE 0?**
