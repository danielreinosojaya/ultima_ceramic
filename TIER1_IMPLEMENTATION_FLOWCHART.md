# TIER 1 IMPLEMENTATION - FLUJO EXACTO PASO A PASO

## DECISIONES CRÍTICAS QUE DEBEMOS TOMAR AHORA

### 1️⃣ ¿Qué algoritmo JWT usar?

**OPCIONES:**
- `HS256` (HMAC) - Secreto compartido, rápido, soporta solo symmetric
- `RS256` (RSA) - Llave privada/pública, más seguro, más lento

**DECISIÓN PROPUESTA: HS256**
- Razón: Vercel serverless es stateless, RS256 requiere key management
- Secreto: Generar con `crypto.randomBytes(64).toString('hex')`
- Almacenar en `.env` como `JWT_SECRET=xxx`

---

### 2️⃣ ¿Token blacklist en qué storage?

**OPCIONES:**
- `Memory (Map)` - Rápido, se pierde en restart
- `Redis` - Persistente, pero requiere setup
- `PostgreSQL` - Persistente, pero lento (queries en cada auth)
- `Hybrid` (Memory + Redis sync)

**DECISIÓN PROPUESTA: Memory + periodic dump a PostgreSQL**
```typescript
// En memoria: búsqueda O(1)
const blacklist = new Map<string, Date>();

// Cada 5 min: persistir a DB
setInterval(() => {
    const revoked = Array.from(blacklist.entries())
        .filter(([_, date]) => Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000);
    
    await sql`INSERT INTO token_blacklist ... VALUES ...`;
}, 5 * 60 * 1000);
```

**VENTAJAS:** Rápido, simple, persiste

---

### 3️⃣ ¿Email de recovery vía Resend o SMTP?

**DECISIÓN PROPUESTA: Resend (ya tienes setup)**
- Ya funciona para giftcards
- Template puede reutilizarse
- Rate limiting automático

---

### 4️⃣ ¿Migration path: Hard vs Soft?**

**HARD MIGRATION:**
- Todos los usuarios re-logueados al mismo tiempo
- Riesgo: Confusión, support spike

**SOFT MIGRATION (PROPUESTO):**
```typescript
// Mantener localStorage auth FUNCIONANDO por 2 semanas
// Pero mostrar banner: "Tu sesión se actualizará automáticamente"
// Migrar en background silenciosamente
// Tras 2 semanas: deprecar localStorage auth

if (localStorage.clientEmail && !jwtCookie) {
    // POST /api/auth/migrate-legacy
    // Backend: genera JWT + setea httpOnly
    // Usuario nunca se da cuenta
}
```

**RIESGO BAJO porque:** Usuario sigue teniendo acceso

---

### 5️⃣ ¿Refresh tokens: Auto-refresh o manual?

**PROPUESTO: Auto-refresh con exponential backoff**
```typescript
// Access token: 15 min
// Refresh token: 7 días
// Si Access expira → frontend auto-refresh (background)
// Si Refresh expira → re-login (foreground)

const refreshAccessToken = async () => {
    const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include' // httpOnly cookie
    });
    
    if (!response.ok && response.status === 401) {
        // Redirect to login
        window.location.href = '/login';
    }
};

// Auto-refresh 1 min antes de expirar
const scheduleRefresh = (expiresIn: number) => {
    const refreshAt = expiresIn - 60000; // -1 min
    setTimeout(refreshAccessToken, refreshAt);
};
```

---

### 6️⃣ ¿2FA ahora o después?

**DECISIÓN: NO en Tier 1 (mantener simple)**
- Tier 1 = autenticación básica segura
- Tier 2 = 2FA TOTP
- Razón: Tier 1 ya es 80% del trabajo

---

## CAMBIOS TÉCNICOS EXACTOS

### BACKEND - Nuevos Endpoints

```typescript
// /api/auth/login
POST /api/auth/login
{
    email: string;
    bookingCode: string;
}
→ 200: { accessToken: "jwt...", expiresIn: 900 }
    Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict
→ 401: { code: 'INVALID_CREDENTIALS', message: 'Email o código incorrecto' }
→ 429: { code: 'RATE_LIMITED', retryAfter: 900 }

// /api/auth/refresh
POST /api/auth/refresh
(no body, uses httpOnly cookie)
→ 200: { accessToken: "jwt..." }
→ 401: { code: 'REFRESH_EXPIRED', message: 'Por favor vuelve a ingresar' }

// /api/auth/logout
POST /api/auth/logout
Authorization: Bearer {accessToken}
→ 200: { success: true }
(borra refresh cookie + agrega token a blacklist)

// /api/auth/request-recovery
POST /api/auth/request-recovery
{ email: string }
→ 200: { message: 'Email de recuperación enviado' }
→ 429: { retryAfter: 300 }

// /api/auth/verify-recovery
POST /api/auth/verify-recovery
{ email: string; code: string }
→ 200: { accessToken: "jwt..." }
    Set-Cookie: refresh_token=...
→ 400: { code: 'INVALID_CODE', message: 'Código expirado o incorrecto' }

// /api/auth/migrate-legacy (para migration)
POST /api/auth/migrate-legacy
{ email: string; bookingCode: string; legacyToken: "old_localStorage_token" }
→ 200: { accessToken: "jwt..." }
    Set-Cookie: refresh_token=...
```

---

### FRONTEND - Cambios de Componentes

**ClientLogin.tsx:**
```typescript
// ❌ ANTES
const handleSubmit = async (e) => {
    const result = await dataService.getClientBooking(email, bookingCode);
    localStorage.setItem('clientEmail', email); // ❌ INSEGURO
};

// ✅ DESPUÉS
const handleSubmit = async (e) => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include', // ✅ Enviar httpOnly cookies
        body: JSON.stringify({ email, bookingCode })
    });
    
    if (response.ok) {
        const { accessToken, expiresIn } = await response.json();
        // httpOnly cookie ya está set automáticamente
        // No guardar token en localStorage
        scheduleRefresh(expiresIn);
    }
};
```

**AuthContext.tsx (NUEVA):**
```typescript
// Crear contexto para manejar JWT
export const AuthContext = createContext<{
    isAuthenticated: boolean;
    userEmail?: string;
    login: (email: string, code: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
} | null>(null);

export const AuthProvider: React.FC = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userEmail, setUserEmail] = useState<string>();
    
    const login = async (email: string, code: string) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({ email, code })
        });
        
        if (!response.ok) throw new Error('Login failed');
        
        setIsAuthenticated(true);
        setUserEmail(email);
        // httpOnly cookie set automatically
    };
    
    const logout = async () => {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        setIsAuthenticated(false);
        setUserEmail(undefined);
    };
    
    const refreshToken = async () => {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            setIsAuthenticated(false);
            window.location.href = '/login';
        }
    };
    
    return (
        <AuthContext.Provider value={{ isAuthenticated, userEmail, login, logout, refreshToken }}>
            {children}
        </AuthContext.Provider>
    );
};
```

---

### BACKEND - Middleware Nuevo

**auth.middleware.ts:**
```typescript
export const verifyJWT = async (
    req: VercelRequest,
    res: VercelResponse
): Promise<{ valid: boolean; email?: string; error?: string }> => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
        return { valid: false, error: 'Missing or invalid Authorization header' };
    }
    
    const token = authHeader.slice(7);
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        
        // Verificar si está en blacklist
        if (tokenBlacklist.isRevoked(token)) {
            return { valid: false, error: 'Token has been revoked' };
        }
        
        return { valid: true, email: decoded.email };
    } catch (error) {
        return { valid: false, error: 'Invalid or expired token' };
    }
};
```

---

## ORDEN DE IMPLEMENTACIÓN (DEBE SER EXACTO)

### PASO 1: Setup Backend Auth (3 horas)
```
1. Crear /api/auth/login.ts
2. Crear /api/auth/refresh.ts
3. Crear /api/auth/logout.ts
4. Crear /api/auth/request-recovery.ts
5. Crear /api/auth/verify-recovery.ts
6. Crear lib/jwt.ts (sign, verify, generate)
7. Crear lib/tokenBlacklist.ts (revoke, check)
8. Tests para cada endpoint (15 tests mínimo)
9. Verificar NINGUNO de estos funciona aún en frontend
10. ✅ Deploy a staging
```

### PASO 2: Frontend Auth Context (2 horas)
```
1. Crear context/AuthContext.tsx
2. Crear hooks/useAuth.ts
3. Wrap <App> con <AuthProvider>
4. Tests (5 tests)
5. ✅ No usar aún en componentes
```

### PASO 3: Migrar ClientLogin (1 hora)
```
1. Actualizar ClientLogin.tsx para usar /api/auth/login
2. Mostrar loading + errors
3. Tests (3 tests)
4. ✅ Funciona con nuevo endpoint
```

### PASO 4: Agregar Recovery UI (1 hora)
```
1. Nueva vista: ForgotCodeModal.tsx
2. Flujo: email → código → acceso
3. Tests (3 tests)
4. ✅ Cliente puede recuperarse
```

### PASO 5: Auto-logout (30 min)
```
1. Session timeout: 30 min inactividad
2. Activity listeners en window
3. Tests (2 tests)
4. ✅ User se desconecta automáticamente
```

### PASO 6: Migration Dual-Auth (1 hora)
```
1. POST /api/auth/migrate-legacy
2. Detectar localStorage en frontend
3. Auto-migrar silenciosamente
4. Cleanup: borrar localStorage
5. Tests (5 tests)
6. ✅ Usuarios legacy migrados transparentemente
```

### PASO 7: Validación (1 hora)
```
1. Verificar no hay localStorage tokens en Network tab
2. Verificar httpOnly cookie existe
3. Verificar CSRF tokens en requests
4. Verificar rate limiting bloquea ataques
5. Verificar logout realmente invalida token
6. ✅ Security audit passed
```

---

## RIESGOS MITIGADOS POR PASO

| Paso | Riesgo | Mitigación |
|------|--------|-----------|
| 1-2 | Backend breaks | Tests locales antes de deploy |
| 3 | Usuarios pierden acceso | Migration dual-auth |
| 4 | Email recovery abuse | Rate limiting 3 intentos/5 min |
| 5 | Users confundidos con logout | UX clara + notificación |
| 6 | localStorage aún vulnerable | Migration silenciosa |
| 7 | Seguridad comprometida | Penetration testing |

---

## DECISION POINTS - ¿PROCEDER?

**Sí procedo con PASO 1-2 si:**
- ✅ Tienes acceso a git + poder hacer push
- ✅ Tienes server staging para testing
- ✅ Tienes 12+ horas para implementar + testing
- ✅ Entiendes JWT y cookies

**Haz un backup si:**
- Tenías cambios no comitidos
- Quieres poder rollback fácil

**¿Comenzamos?**
