# TIER 1 - DECISION BOARD

## 🎯 OBJETIVO
Implementar autenticación segura (JWT) para portal de cliente, eliminando vulnerabilidades críticas.

---

## 📊 ESTADO ACTUAL vs OBJETIVO

### VULNERABILIDADES CRÍTICAS AHORA
```
✗ Tokens en localStorage (XSS = total breach)
✗ No refresh tokens (eterno acceso)
✗ Sin rate limiting (fuerza bruta posible)
✗ Sin CSRF protection (reagendamiento sin consentimiento)
✗ Sin logout real (token sigue siendo válido)
```

### DESPUÉS DE TIER 1
```
✓ JWT en httpOnly cookies (XSS inútil)
✓ Refresh tokens de 7 días (auto-expire)
✓ Rate limiting: 5 intentos = 15 min bloqueo
✓ CSRF tokens en cada request POST
✓ Logout revoca token inmediatamente
```

---

## ⚙️ CAMBIOS TÉCNICOS SUMMARY

### BACKEND (New Endpoints)
- `POST /api/auth/login` - Autenticar con email + código
- `POST /api/auth/refresh` - Renovar access token
- `POST /api/auth/logout` - Invalidar sesión
- `POST /api/auth/request-recovery` - Solicitar recovery code
- `POST /api/auth/verify-recovery` - Verificar code y dar acceso
- `POST /api/auth/migrate-legacy` - Mover localStorage → JWT

### FRONTEND (New Components)
- `AuthContext.tsx` - Estado global de auth
- `useAuth()` hook - Acceso a funciones auth
- `ForgotCodeModal.tsx` - Recovery UI
- Actualizar `ClientLogin.tsx` - Usar nuevo endpoint
- Agregar session timeout checker

### DATABASE (New Tables)
```sql
CREATE TABLE token_blacklist (
    token_hash VARCHAR(255) PRIMARY KEY,
    revoked_at TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE auth_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),     -- 'login', 'logout', 'recovery', 'refresh'
    email VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN,
    error_code VARCHAR(100),
    created_at TIMESTAMP
);
```

---

## 🔐 SECURITY MEASURES

| Medida | Cómo | Por Qué |
|--------|------|--------|
| httpOnly Cookies | `Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict` | XSS no puede acceder |
| JWT Signing | `jwt.sign({email}, SECRET, {expiresIn: '15m'})` | No puede ser forjado |
| Token Blacklist | Map<token, revocationTime> | Logout invalida inmediatamente |
| Rate Limiting | 5 intentos fallidos → 15 min block | Previene fuerza bruta |
| CSRF Tokens | Incluir en cada POST request | Previene CSRF attacks |
| Email Validation | Magic link vía email | Previene email spoofing |
| Audit Logging | Log todo en auth_events | Detectar ataques |

---

## ⚠️ RIESGOS Y MITIGACIONES

### Riesgo 1: Usuarios pierden acceso
**Mitigación:** Migration silenciosa (localStorage → JWT en background)
**Fallback:** Login manual con recovery code

### Riesgo 2: Token blacklist > 1GB
**Mitigación:** Limpiar tokens expirados cada 5 min
**Monitoring:** Alerta si blacklist > 100,000 tokens

### Riesgo 3: Race condition en reschedule
**Mitigación:** DB transaction lock + version checking
**Testing:** Simular 2 tabs simultáneamente

### Riesgo 4: Email recovery abusado
**Mitigación:** Rate limit (3 intentos/5 min/email)
**Honeypot:** Log intentos fallidos

### Riesgo 5: Performance degradation
**Mitigación:** JWT verification < 5ms (local, no DB)
**Monitoring:** Alertas si auth > 100ms

---

## 📅 TIMELINE ESTIMADO

| Fase | Horas | Status |
|------|-------|--------|
| Backend Setup (6 endpoints + tests) | 3h | ⏳ NOT STARTED |
| Frontend Auth Context + components | 2h | ⏳ NOT STARTED |
| Migrate ClientLogin | 1h | ⏳ NOT STARTED |
| Add Recovery UI | 1h | ⏳ NOT STARTED |
| Session timeout | 0.5h | ⏳ NOT STARTED |
| Migration dual-auth | 1h | ⏳ NOT STARTED |
| Security testing | 1h | ⏳ NOT STARTED |
| **TOTAL** | **9.5h** | **PLANNED** |

---

## ✅ REQUIREMENTS PARA PROCEDER

- [ ] Entiendes JWT (token = email encriptado + firma)
- [ ] Entiendes httpOnly cookies (no accesible desde JS)
- [ ] Tienes git acceso (poder hacer push)
- [ ] Tienes 10+ horas disponibles
- [ ] Tienes servidor staging para testing
- [ ] Estás dispuesto a hacer testing exhaustivo

---

## 🚀 CÓMO PROCEDER

### OPCIÓN A: Implementación Completa
"Adelante con Tier 1 completo (9.5 horas de codificación)"

### OPCIÓN B: MVP Seguro (Recomendado)
"Solo Login + Logout + Recovery (menos riesgo, 5 horas)"
- Qué queda para después:
  - Session timeout (mínor UX issue)
  - Migration legacy (usuarios migrarse manual)
  - CSRF tokens (baja probabilidad)

### OPCIÓN C: Análisis Primero
"Quiero revisar el código de /api/auth/login antes de implementar"
- Te muestro un PR draft
- Lo revisamos línea por línea

---

## 📋 PREGUNTAS CLAVE PARA TI

1. **¿Cuántas horas tienes disponibles ESTA SEMANA?**
   - < 5h → Opción B (MVP)
   - 5-10h → Opción A (Completo)
   - > 10h → Opción A + Tier 2 prep

2. **¿Tienes ambiente staging seguro para testear?**
   - Sí → Puedo hacer push a rama feature
   - No → Mejor que primero lo revisemos

3. **¿Qué tan crítico es arreglarlo AHORA vs próximas 2 semanas?**
   - Crítico AHORA → Aceleramos
   - Próximas 2 semanas → Hacemos con cuidado

4. **¿Necesitas rollback plan detallado?**
   - Sí → Creo git workflow específico
   - No → Confío en el plan

5. **¿Quieres que haga code review antes de implementar?**
   - Sí → Creo PR draft, lo revisamos
   - No → Implemento directamente

---

## 🎬 NEXT STEPS

### SI DICES "ADELANTE":
1. ✅ Creo rama `feature/auth-v2`
2. ✅ Implemento /api/auth/login.ts + tests
3. ✅ Tú: revisar y validar
4. ✅ Continuamos con siguiente endpoint

### SI DICES "PRIMERO REVISAR":
1. ✅ Creo borrador de /api/auth/login.ts
2. ✅ Lo muestro línea por línea
3. ✅ Tú: preguntas / cambios
4. ✅ Cuando estés seguro → implementar

### SI DICES "ESPERAR":
1. ✅ Documental todo (HECHO ✓)
2. ✅ Cuando decidas → ejecutar sin dudas

---

## 🔑 KEY DECISION POINT

**¿PROCEDER CON TIER 1 AHORA?**

- **SÍ, COMPLETO** → Adelante con 9.5 horas
- **SÍ, MVP** → Solo login + logout (5h)
- **REVISAR PRIMERO** → Code review antes de implementar
- **ESPERAR** → Dejamos listo para después

---

*Documento creado: 2025-12-08*
*Análisis de riesgos: COMPLETO*
*Status: WAITING FOR DECISION*
