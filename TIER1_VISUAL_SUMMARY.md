# TIER 1 - VISUAL SUMMARY

## 🔴 VULNERABILIDADES CRÍTICAS ACTUALES

```
┌─────────────────────────────────────────────────────────────┐
│ PORTAL DE CLIENTE ACTUAL - SEGURIDAD                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Autenticación:        localStorage (❌ XSS VULNERABLE)    │
│  Token Expiry:         NUNCA (❌ ACCESO INFINITO)          │
│  Logout:               localStorage.clear() (❌ TOKEN SIGUE)│
│  Password Recovery:    NO EXISTE (❌ NO HAY FORMA RECUPERAR) │
│  Rate Limiting:        NO (❌ FUERZA BRUTA POSIBLE)        │
│  CSRF Protection:      NO (❌ REAGENDAMIENTO SIN PERMISO)  │
│  Audit Logging:        NADA (❌ NO DETECTA ATAQUES)        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

RIESGO: 🔴 CRÍTICO - Sistema de producción SIN protecciones básicas
```

---

## ✅ DESPUÉS DE TIER 1

```
┌─────────────────────────────────────────────────────────────┐
│ PORTAL DE CLIENTE - DESPUÉS DE TIER 1                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Autenticación:        JWT en httpOnly (✅ XSS-PROOF)      │
│  Token Expiry:         15 min (✅ ACCESO LIMITADO)         │
│  Logout:               Token revocado (✅ INMEDIATO)        │
│  Password Recovery:    Email + 6-digit code (✅ RECUPERABLE)│
│  Rate Limiting:        5 intentos/15 min (✅ BRUTE-FORCE OK)│
│  CSRF Protection:      Token en cada POST (✅ PROTEGIDO)    │
│  Audit Logging:        Todos los eventos (✅ TRAZABLE)     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

RIESGO: 🟢 BAJO - Sistema enterprise-grade seguro
```

---

## 🔄 FLUJO DE AUTENTICACIÓN NUEVO

### LOGIN
```
Usuario:            "Email: test@example.com, Código: ABC123"
                           ↓
Backend /api/auth/login:
  1. Validar email existe
  2. Validar código pertenece a email
  3. Generar JWT: {email: "test@example.com", exp: now+15min}
  4. Firmar con SECRET
  5. Set-Cookie: refresh_token=... (7 días, httpOnly)
                           ↓
Frontend:
  1. Guardar accessToken EN MEMORIA (NO localStorage)
  2. httpOnly cookie set automáticamente
  3. Schedular refresh en 14 min
                           ↓
Usuario:            ✅ Autenticado, puede reagendar clases
```

### RESCHEDULE (con JWT)
```
Usuario:            Hace click "Reagendar clase"
                           ↓
Frontend:           
  POST /api/data?action=rescheduleBookingSlot
  Header: Authorization: Bearer {accessToken}
                           ↓
Backend:
  1. Extraer email de JWT
  2. Verificar token no está en blacklist
  3. Validar 72 horas de anticipación
  4. Validar slot no está lleno
  5. UPDATE bookings
                           ↓
Usuario:            ✅ Clase reagendada, email confirmación
```

### LOGOUT
```
Usuario:            Hace click "Cerrar sesión"
                           ↓
Frontend:           
  POST /api/auth/logout
  Header: Authorization: Bearer {accessToken}
                           ↓
Backend:
  1. Agregar token a blacklist
  2. Borrar refresh_token cookie
  3. Limpiar sesión
                           ↓
Usuario:            ✅ Desconectado, redirect a login
                           ↓
Si intenta usar antiguo token:
  1. JWT validation falla (blacklist hit)
  2. Error: "Sesión expirada"
  3. Redirect a login
```

### PASSWORD RECOVERY
```
Usuario:            "Olvidé mi código"
                           ↓
POST /api/auth/request-recovery
  { email: "test@example.com" }
                           ↓
Backend:
  1. Rate limit: máximo 3 intentos en 5 min
  2. Generar 6-digit code (TTL: 15 min)
  3. Guardar en memory: {code: "123456", exp: now+15min}
  4. Send email: "Tu código: 123456"
                           ↓
Frontend:
  Input code: "123456"
  POST /api/auth/verify-recovery
                           ↓
Backend:
  1. Validar code existe
  2. Validar no expiró
  3. Consumir code (borrar de memory)
  4. Generar JWT
  5. Set-Cookie: refresh_token
                           ↓
Usuario:            ✅ Autenticado sin código original
```

---

## 📊 ARQUITECTURA SEGURA

```
┌──────────────────────────────────────────────────────────────┐
│                         USUARIO                              │
└──────────────────────────────────────────────────────────────┘
                             ↓
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
    ┌────────────┐      ┌──────────┐      ┌────────────────┐
    │ Access     │      │ Refresh  │      │ Session Data   │
    │ Token      │      │ Token    │      │ (Memory)       │
    │ (15 min)   │      │ (7 días) │      │                │
    │ En memoria │      │ httpOnly │      │ - Blacklist    │
    │            │      │ Cookie   │      │ - Audit logs   │
    └────────────┘      └──────────┘      └────────────────┘
        ↓                    ↓                    ↓
        └────────────────────┼────────────────────┘
                             ↓
                    ┌────────────────────┐
                    │  /api/auth/*       │
                    │  endpoints         │
                    │  (backend)         │
                    └────────────────────┘
                             ↓
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
    ┌────────────┐      ┌──────────┐      ┌────────────────┐
    │ PostgreSQL │      │ JWT Lib  │      │ Email Service  │
    │ (bookings) │      │ (crypto) │      │ (Resend)       │
    │            │      │          │      │                │
    └────────────┘      └──────────┘      └────────────────┘
```

---

## 🧪 TESTING CHECKLIST

```
Unit Tests (60+):
  ✅ JWT generation: {email, iat, exp, signature}
  ✅ JWT verification: valid, expired, tampered
  ✅ Token blacklist: add, check, cleanup
  ✅ Rate limiting: count, block, reset
  ✅ Recovery code: generate, validate, consume
  ✅ Password hashing: bcrypt, salt rounds
  ✅ Email validation: format, exists

Integration Tests (20+):
  ✅ Full login → JWT → reschedule → logout flow
  ✅ Refresh token rotation
  ✅ Recovery code email + verification
  ✅ Session timeout after 30 min
  ✅ Migration localStorage → JWT
  ✅ Concurrent logins (2 browsers)
  ✅ Logout revocation inmediata

Security Tests (10+):
  ✅ XSS payload: "<script>alert('xss')</script>"
  ✅ JWT tampering: cambiar email en payload
  ✅ CSRF attack: simulate cross-origin POST
  ✅ Rate limit bypass: 10 requests en 1 segundo
  ✅ Token replay: usar token viejos
  ✅ Timing attacks: medir si email existe

Performance Tests (5+):
  ✅ JWT verification < 5ms (local crypto)
  ✅ Login endpoint < 500ms (incl email)
  ✅ Logout < 100ms (blacklist update)
  ✅ Refresh < 200ms (token generation)
  ✅ 1000 concurrent logins: no OOM
```

---

## 💾 DATA STRUCTURES

### JWT Payload (Decoded)
```json
{
  "email": "cliente@example.com",
  "iat": 1733657400,
  "exp": 1733658300,
  "type": "access"
}
```

### Refresh Token (httpOnly Cookie)
```json
{
  "email": "cliente@example.com",
  "iat": 1733657400,
  "exp": 1735425600,
  "type": "refresh"
}
```

### Token Blacklist (In Memory)
```typescript
Map<string, Date> {
  "jwt_abc123_signature" → Date(2025-12-08T10:30:00Z)
  "jwt_def456_signature" → Date(2025-12-08T11:15:00Z)
  // Auto-cleanup: borrar si exp < now
}
```

### Auth Events (Database)
```sql
INSERT INTO auth_events VALUES (
  id: 12345,
  event_type: 'login',
  email: 'cliente@example.com',
  ip_address: '203.0.113.45',
  user_agent: 'Mozilla/5.0...',
  success: true,
  created_at: 2025-12-08T10:25:00Z
);
```

---

## 🚨 ROLLBACK PLAN

Si algo sale mal en producción:

```
ISSUE: "Usuarios no pueden hacer login"

IMMEDIATE (< 5 min):
  1. Verificar /api/auth/login está up
  2. Verificar JWT_SECRET en .env
  3. Verificar DB connection
  4. Rollback a commit anterior si es crítico

QUICK FIX (5-30 min):
  1. Revertir cambios más recientes
  2. Usar localStorage auth temporalmente
  3. Mostrar banner: "Mantenimiento, se volverá a disponible en X min"

COMMUNICATION:
  1. Email a clientes: "Estamos arreglando autenticación"
  2. Mostrar status page
  3. Crear ticket de support para reclamos

INVESTIGATION (después):
  1. Revisar logs: /var/log/vercel/auth.log
  2. Check token blacklist size
  3. Perf metrics: latencies, error rates
  4. Root cause analysis
```

---

## 📈 MÉTRICAS DE ÉXITO

Tras implementar Tier 1:

```
SEGURIDAD:
  ✅ 0 tokens en localStorage
  ✅ 0 CSRF vulnerabilities
  ✅ 100% login requests tienen JWT
  ✅ 0 unauthorized acceso a bookings

PERFORMANCE:
  ✅ Auth latency < 200ms (p95)
  ✅ Token blacklist < 50MB
  ✅ Refresh rate > 99%

USABILITY:
  ✅ Password recovery < 5 min
  ✅ Session timeout notificado
  ✅ 0 "Strange authentication" support tickets

RELIABILITY:
  ✅ Uptime 99.9%
  ✅ 0 token generation errors
  ✅ Audit trail 100% completo
```

---

## ⏱️ TIMELINE (si empezamos hoy)

```
Hoy (Dec 8):
  ✅ Crear rama feature/auth-v2
  ✅ Implement /api/auth/login (1h)
  ✅ Write tests (1h)
  ✅ Deploy to staging

Mañana (Dec 9):
  ✅ Implement refresh + logout (1.5h)
  ✅ Implement recovery (1.5h)
  ✅ Integration testing (1h)

Day 3 (Dec 10):
  ✅ Frontend migration (2h)
  ✅ Legacy migration handler (1h)
  ✅ Security audit (1h)

Day 4 (Dec 11):
  ✅ Final validation (2h)
  ✅ Deployment to production (1h)
  ✅ Monitoring (ongoing)
```

---

## 🎯 DECISION MATRIX

```
┌─────────────────────┬──────────────┬────────────┬──────────┐
│ OPCIÓN              │ TIEMPO       │ RIESGO     │ RESULTADO│
├─────────────────────┼──────────────┼────────────┼──────────┤
│ A) Completo Tier 1  │ 9.5 horas    │ BAJO       │ 🟢 BEST  │
│ B) MVP (login+out)  │ 5 horas      │ MEDIO      │ 🟡 GOOD  │
│ C) Code review 1ero │ +2h review   │ BAJO       │ 🟢 BEST  │
│ D) Esperar 2 sem    │ RIESGO X14d  │ CRÍTICO    │ 🔴 BAD   │
└─────────────────────┴──────────────┴────────────┴──────────┘

RECOMENDACIÓN: A) o C) (ambas con Tier 1 completo, diferencia = review)
```

---

## 📞 CÓMO PROCEDER

**TU RESPUESTA DETERMINA EL CAMINO:**

1. **"Adelante con A (Completo)"**
   - ✅ Creo rama
   - ✅ Implemento todo
   - ✅ Tú validas cada paso

2. **"Adelante con C (Review primero)"**
   - ✅ Creo borrador
   - ✅ Lo revisamos
   - ✅ Luego implemento seguro

3. **"Adelante con B (MVP)"**
   - ✅ Enfoco en login + logout
   - ✅ Recovery y timeout después

4. **"Esperar"**
   - ✅ Documentación lista
   - ✅ Cuando decidas → ejecutar en 1 día

---

*¿ Cuál es tu decisión?*
