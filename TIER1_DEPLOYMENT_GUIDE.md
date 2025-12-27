# Tier 1 Auth Implementation - Deployment Guide

## ✅ Implementation Complete

**Branch**: `feature/auth-v2`  
**Status**: Ready for testing & deployment  
**Build**: ✅ Passing (0 errors TypeScript)  
**Bundle size**: 884 kB (244 kB gzipped)

---

## 📦 What Was Implemented

### Backend (/api/auth/*)
✅ **login.ts** - JWT authentication with rate limiting (5 attempts/15min)  
✅ **refresh.ts** - Token refresh endpoint (auto-refresh every 14min)  
✅ **logout.ts** - Session termination with audit logging  
✅ **request-recovery.ts** - 6-digit recovery code generation (15min TTL)  
✅ **verify-recovery.ts** - Recovery code verification & booking code retrieval  

**Security features**:
- httpOnly cookies (XSS protection)
- JWT tokens (15min access, 7 day refresh)
- Rate limiting (in-memory Map, resets on cold start)
- Audit logging to `auth_events` table
- IP address & user agent tracking

### Frontend (context/ & components/)
✅ **AuthContext.tsx** - React Context with useAuth hook  
✅ **ClientLogin.tsx** - Migrated to JWT authentication  
✅ **ClientDashboard.tsx** - Uses AuthContext instead of localStorage  
✅ **ClientPortal.tsx** - Secure logout with context integration  
✅ **ForgotCodeModal.tsx** - 3-step recovery flow (email → code → booking code)  
✅ **App.tsx** - AuthProvider wrapping entire app  

**Features**:
- Auto-refresh tokens (14min interval)
- Session timeout (30min inactivity)
- Inactivity warning (2min before logout)
- Legacy localStorage migration (automatic)

### Database
✅ **migrations/create_auth_events_table.sql**  
- Audit log for all auth events
- Indexes: email, event_type, created_at
- Tracks: login_success, login_failed, logout, refresh, recovery_request, recovery_verify

---

## 🚀 Deployment Steps

### 1. Database Migration

**Execute SQL migration** in Vercel Postgres:

```sql
-- Copy contents from migrations/create_auth_events_table.sql
CREATE TABLE IF NOT EXISTS auth_events (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auth_events_email ON auth_events(email);
CREATE INDEX idx_auth_events_event_type ON auth_events(event_type);
CREATE INDEX idx_auth_events_created_at ON auth_events(created_at DESC);
CREATE INDEX idx_auth_events_email_created ON auth_events(email, created_at DESC);
```

**Verification**:
```sql
-- Check table exists
SELECT COUNT(*) FROM auth_events;

-- Should return 0 (table empty initially)
```

### 2. Environment Variables

**Configure in Vercel Dashboard** → Settings → Environment Variables:

```bash
JWT_SECRET=<generate-strong-random-secret-32-chars-minimum>
```

**Generate secure secret**:
```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: OpenSSL
openssl rand -hex 32

# Option 3: Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

⚠️ **CRITICAL**: Replace fallback secret before production deployment

### 3. Testing Checklist

**Manual testing** (use local dev server first):

#### Login Flow
- [ ] Email + booking code → successful login
- [ ] Invalid credentials → error message
- [ ] Rate limiting after 5 failures → 15min block
- [ ] httpOnly cookies set after login
- [ ] User email displayed in ClientPortal dropdown

#### Recovery Flow
- [ ] Request recovery → 6-digit code sent (check console logs)
- [ ] Verify code → booking code returned
- [ ] Code expiration after 15 minutes
- [ ] Invalid code → error message
- [ ] UI shows 3 steps: email → verify → success

#### Session Management
- [ ] Auto-refresh token after 14 minutes (check Network tab)
- [ ] Inactivity warning after 28 minutes
- [ ] Auto-logout after 30 minutes inactivity
- [ ] Manual logout → cookies cleared

#### Legacy Migration
- [ ] User with old localStorage session → auto-migrated to JWT
- [ ] localStorage cleared after migration

#### Edge Cases
- [ ] Refresh token expired → redirect to login
- [ ] Multiple tabs → session shared via cookies
- [ ] Browser close/reopen → session persists (7 days)

### 4. Security Validation

**Verify httpOnly cookies** (Browser DevTools → Application → Cookies):
- [ ] `accessToken` - HttpOnly ✓, Secure ✓, SameSite=Strict ✓
- [ ] `refreshToken` - HttpOnly ✓, Secure ✓, SameSite=Strict ✓

**Check audit logging** (Vercel Postgres):
```sql
SELECT * FROM auth_events ORDER BY created_at DESC LIMIT 10;
```

Should show:
- `login_success` - IP address, user agent, bookingId in metadata
- `login_failed` - Reason in metadata (invalid_credentials, rate_limited)
- `logout` - User email, timestamp

**Rate limiting test**:
1. Try 5 failed login attempts
2. 6th attempt → "Intenta de nuevo en X minutos"
3. Wait 15 minutes or restart serverless function (cold start)
4. Attempt succeeds

### 5. Merge & Deploy

```bash
# From feature/auth-v2 branch
git status
git add .
git commit -m "feat(auth): Tier 1 JWT authentication implementation

- Added JWT-based login/refresh/logout endpoints
- Implemented password recovery flow (6-digit codes)
- Created AuthContext for global auth state management
- Added session timeout (30min) with inactivity warning
- Migrated ClientLogin, ClientDashboard, ClientPortal to AuthContext
- Added audit logging table (auth_events)
- Security: httpOnly cookies, rate limiting, XSS protection
- Legacy localStorage migration (automatic)

Breaking changes: None (backward compatible with legacy sessions)
"

# Push to remote
git push origin feature/auth-v2

# Merge to main branch (gif in this case)
git checkout gif
git merge feature/auth-v2
git push origin gif
```

**Vercel will auto-deploy** after push to `gif` branch.

### 6. Post-Deployment Verification

**Production smoke tests**:

1. **Login test** (use real booking):
   ```
   https://yourdomain.com/
   → Click "Mi Cuenta"
   → Enter email + booking code
   → Verify successful login
   ```

2. **Recovery test**:
   ```
   → Click "¿Olvidaste tu código?"
   → Enter email
   → Check email for 6-digit code (if email service enabled)
   → Verify code
   → Booking code displayed
   ```

3. **Audit log verification**:
   ```sql
   SELECT event_type, COUNT(*) 
   FROM auth_events 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY event_type;
   ```

4. **Performance check** (Vercel Analytics):
   - Login endpoint: <500ms p95
   - Refresh endpoint: <200ms p95
   - No serverless timeout errors

---

## 🔍 Monitoring & Observability

### Key Metrics to Track

**Authentication success rate**:
```sql
SELECT 
    event_type,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM auth_events
WHERE event_type IN ('login_success', 'login_failed')
    AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;
```

**Rate limit triggers**:
```sql
SELECT 
    email,
    COUNT(*) as failed_attempts,
    MAX(created_at) as last_attempt
FROM auth_events
WHERE event_type = 'login_failed'
    AND metadata->>'reason' = 'rate_limited'
    AND created_at > NOW() - INTERVAL '7 days'
GROUP BY email
ORDER BY failed_attempts DESC;
```

**Recovery requests**:
```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as recovery_requests
FROM auth_events
WHERE event_type = 'recovery_request'
    AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Alerts to Set Up

**High priority**:
- Login success rate drops below 80%
- Rate limit triggers exceed 10 per hour
- JWT_SECRET still using fallback value

**Medium priority**:
- Recovery requests exceed 50 per day
- Session timeout rate exceeds 20%
- Refresh token failures exceed 5%

---

## 🐛 Troubleshooting

### "Cannot find module 'jsonwebtoken'"
**Solution**: Run `npm install jsonwebtoken @types/jsonwebtoken`

### Cookies not being set
**Cause**: Secure flag requires HTTPS  
**Solution**: 
- Local dev: Change `Secure` to `false` in cookies (only for testing)
- Production: Ensure HTTPS enabled (Vercel does this by default)

### Rate limiting not working
**Cause**: Serverless cold starts reset in-memory Map  
**Solution**: 
- Short-term: Acceptable for MVP (cold starts rare)
- Long-term: Use Redis or database table for persistent rate limiting

### Auth events not logging
**Check**:
1. Table exists: `SELECT COUNT(*) FROM auth_events;`
2. Permissions: Ensure Vercel Postgres connection has INSERT permissions
3. Logs: Check Vercel function logs for SQL errors

### Legacy users not migrating
**Check**:
1. localStorage keys: `clientEmail`, `clientBookingCode` exist
2. AuthContext initialization: `useEffect` runs on mount
3. Console logs: Look for "[AUTH] Migrating legacy localStorage session"

---

## 📊 Success Criteria

✅ **Functionality**:
- Users can login with email + booking code
- Password recovery works end-to-end
- Session timeout triggers after 30min inactivity
- Auto-refresh prevents session interruption

✅ **Security**:
- httpOnly cookies prevent XSS attacks
- Rate limiting blocks brute force attempts
- Audit logging tracks all auth events
- JWT secret configured (not using fallback)

✅ **Performance**:
- Login endpoint <500ms p95
- No TypeScript errors in build
- Bundle size acceptable (<1MB gzipped)

✅ **User Experience**:
- Smooth login flow (no page refresh)
- Clear error messages
- Recovery flow intuitive (3 steps)
- Inactivity warning gives users time to extend session

---

## 🔐 Security Best Practices

**Implemented**:
✅ httpOnly cookies (XSS protection)  
✅ Rate limiting (brute force protection)  
✅ JWT expiration (15min access, 7 day refresh)  
✅ Audit logging (compliance & forensics)  
✅ Input validation (email format, code length)  

**Future enhancements** (Tier 2+):
- CSRF tokens on POST requests
- Email delivery for recovery codes (currently console.log)
- Redis for persistent rate limiting
- 2FA support
- Password reset (if transitioning to password-based auth)
- Device fingerprinting
- IP geolocation for suspicious logins

---

## 📝 Rollback Plan

**If issues arise in production**:

```bash
# Revert merge
git checkout gif
git revert HEAD
git push origin gif

# Vercel will auto-deploy rollback
```

**Manual rollback** (if git revert fails):
```bash
git checkout gif
git reset --hard HEAD~1  # Remove last commit
git push --force origin gif
```

⚠️ **Data safety**: auth_events table can remain (no destructive changes)

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] SQL migration applied in Vercel Postgres
- [ ] JWT_SECRET configured (not using fallback)
- [ ] Build passing locally (`npm run build`)
- [ ] All manual tests passing
- [ ] httpOnly cookies verified in DevTools
- [ ] Rate limiting tested (5 failures → block)
- [ ] Recovery flow tested (email → code → booking code)
- [ ] Legacy migration tested (localStorage → JWT)
- [ ] Audit logging verified in database
- [ ] PR reviewed by team
- [ ] Staging deployment successful
- [ ] Production smoke tests planned
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

---

**Estimated deployment time**: 30-45 minutes  
**Risk level**: Low (backward compatible with legacy auth)  
**Rollback time**: <5 minutes  

---

**Questions or issues?** Check:
1. TIER1_RISK_ANALYSIS.md - Comprehensive risk assessment
2. TIER1_IMPLEMENTATION_FLOWCHART.md - Technical decisions & code examples
3. Vercel function logs - Real-time error tracking
4. auth_events table - Audit trail for debugging

**Implemented by**: GitHub Copilot  
**Date**: December 8, 2025  
**Version**: 1.0.0
