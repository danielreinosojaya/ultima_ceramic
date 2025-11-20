# 📖 GUÍA RÁPIDA: MÓDULO GIFTCARDS

**Última Ceramic | Referencia Técnica Rápida**

---

## 🗺️ MAPA DEL SISTEMA

### Archivos Clave
```
proyecto/
├─ components/giftcard/
│  ├─ LandingGiftcard.tsx          ← Landing page
│  ├─ GiftcardAmountSelector.tsx   ← Selecciona monto ($10-500)
│  ├─ GiftcardPersonalization.tsx  ← Personaliza mensaje
│  ├─ GiftcardDeliveryOptions.tsx  ← Elige entrega (email/physical/whatsapp)
│  ├─ GiftcardPayment.tsx          ← Resumen y pago
│  ├─ GiftcardManualPaymentInstructions.tsx ← WhatsApp instructions
│  ├─ GiftcardPendingReview.tsx    ← Esperar review admin
│  ├─ GiftcardConfirmation.tsx     ← Confirmación final
│  ├─ GiftcardBalanceChecker.tsx   ← Consultar saldo
│  ├─ GiftcardBanner.tsx           ← Call-to-action banner
│  ├─ GiftcardInviteModal.tsx      ← Modal invite
│  └─ GiftcardRedemption.tsx       ← (vacío, placeholder)
│
├─ api/
│  ├─ data.ts                      ← 10 endpoints giftcard
│  ├─ emailService.ts              ← 3 plantillas email
│  └─ db.ts                        ← Conexión PostgreSQL
│
├─ services/
│  └─ dataService.ts               ← Client wrapper API
│
├─ types.ts                        ← Interfaces TypeScript
│
├─ App.tsx                         ← Router principal (giftcard routes)
│
└─ ANALISIS_*GIFTCARDS.md          ← Documentación (Este proyecto)
```

---

## 🔄 FLUJOS PRINCIPALES

### 1. Comprador (Happy Path)
```
Start
  ↓
LandingGiftcard (Start button)
  ↓
GiftcardAmountSelector ($25-200 presets o custom)
  ↓
GiftcardPersonalization (recipient, message, sender, theme)
  ↓
GiftcardDeliveryOptions (email preferred, or physical/whatsapp)
  ↓
GiftcardPayment (resumen, validar email comprador)
  ↓
GiftcardManualPaymentInstructions (WhatsApp al +593 985813327)
  ↓
GiftcardPendingReview (waiting for admin approval)
  ↓
[ADMIN APPROVES]
  ↓
GiftcardConfirmation (¡Enviada!)
  ↓
End
```

### 2. Admin (Gestión)
```
GiftcardsManager
  ↓
listGiftcardRequests() [GET]
  ↓
Tabla: pending, approved, rejected, delivered, deleted
  ↓
Seleccionar solicitud → expandir detalles
  ↓
[Botones]
├─ Aprobar → approveGiftcardRequest() [POST] ✓
├─ Rechazar → rejectGiftcardRequest() [POST]
├─ Ver Balance → validateGiftcard() [GET]
├─ Adjuntar Proof → attachGiftcardProof() [POST]
└─ Eliminar → deleteGiftcardRequest() [POST]
```

### 3. Redención (Canje)
```
Booking summary
  ↓
¿Tienes giftcard? [Input code]
  ↓
validateGiftcard(code) [GET] → check balance, expiry
  ↓
Si valid:
  ├─ Checkbox "Usar para esta reserva"
  └─ createGiftcardHold() [POST] → lock funds, 15min TTL
  
Si invalid:
  └─ Error message: "expirada", "no encontrada", etc.
  ↓
Confirmar booking → addBooking() [POST]
  ├─ INSERT booking con giftcard_id
  └─ UPDATE giftcards SET balance -= amount
  ↓
Email confirmation a usuario
```

---

## 🔌 ENDPOINTS API

### Base URL
```
POST /api/data?action=<action>
```

### Acciones Disponibles

| Acción | Método | Autenticación | Descripción |
|--------|--------|---------------|------------|
| addGiftcardRequest | POST | — | Crear solicitud |
| listGiftcardRequests | GET | — | Listar solicitudes |
| validateGiftcard | POST | — | Validar código |
| createGiftcardHold | POST | — | Crear retención |
| approveGiftcardRequest | POST | ⚠️ x-admin-user | Aprobar |
| rejectGiftcardRequest | POST | ⚠️ x-admin-user | Rechazar |
| attachGiftcardProof | POST | ⚠️ x-admin-user | Adjuntar proof |
| deleteGiftcardRequest | POST | ⚠️ x-admin-user | Soft-delete |
| hardDeleteGiftcardRequest | POST | ⚠️ x-admin-user | Hard-delete |
| listGiftcards | GET | — | Listar emitidas |

**⚠️ = Requiere header: `x-admin-user: email@example.com`**

---

## 📝 EJEMPLOS DE USO

### Crear Solicitud
```typescript
// Frontend
const result = await dataService.addGiftcardRequest({
    buyerName: 'Juan',
    buyerEmail: 'juan@example.com',
    recipientName: 'María',
    recipientEmail: 'maria@example.com',
    amount: 50,
    code: 'GC-USR001',
    message: '¡Cumpleaños!'
});
// Response: { success: true, id: '42', createdAt: '...' }
```

### Validar Giftcard
```typescript
const info = await dataService.validateGiftcard('GC-7K9M2X');
// Response:
// {
//   valid: true,
//   code: 'GC-7K9M2X',
//   giftcardId: 1,
//   balance: 100,
//   initialValue: 100,
//   expiresAt: '2026-02-17T...',
//   status: 'active'
// }
```

### Crear Hold (Retención)
```typescript
const hold = await fetch('/api/data?action=createGiftcardHold', {
    method: 'POST',
    body: JSON.stringify({
        code: 'GC-7K9M2X',
        amount: 45,
        bookingTempRef: 'booking-abc123',
        ttlMinutes: 15
    })
});
// Response:
// {
//   success: true,
//   hold: { id, giftcard_id, amount, expires_at },
//   available: 55,
//   balance: 100
// }
```

### Aprobar Solicitud (Admin)
```typescript
const result = await dataService.approveGiftcardRequest(
    '42',  // request id
    'admin@ceramicalma.com',
    'Pago confirmado'
);
// Response: { success: true, request: {...updated...} }
// Side effects:
// - Generate code: 'GC-XYZ789'
// - INSERT giftcard
// - Send emails (buyer + recipient)
// - INSERT audit
```

---

## 🗄️ BASE DE DATOS

### Tablas Clave

#### giftcard_requests
```sql
CREATE TABLE giftcard_requests (
    id SERIAL PRIMARY KEY,
    buyer_name VARCHAR(100),
    buyer_email VARCHAR(100),
    recipient_name VARCHAR(100),
    recipient_email VARCHAR(100),
    recipient_whatsapp VARCHAR(30),
    amount NUMERIC,
    code VARCHAR(32) UNIQUE,
    status VARCHAR(20),  -- pending, approved, rejected, delivered, deleted
    buyer_message TEXT,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### giftcards
```sql
CREATE TABLE giftcards (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE,
    initial_value NUMERIC,
    balance NUMERIC,
    giftcard_request_id INTEGER,
    expires_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### giftcard_holds
```sql
CREATE TABLE giftcard_holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    giftcard_id INTEGER,
    amount NUMERIC,
    booking_temp_ref VARCHAR(255),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
-- TTL: 15 minutos (configurable)
-- Auto-limpieza: DELETE WHERE expires_at <= NOW()
```

#### giftcard_audit
```sql
CREATE TABLE giftcard_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    giftcard_id INTEGER,
    event_type VARCHAR(50),  -- hold_created, redemption, etc.
    amount NUMERIC,
    booking_temp_ref VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Índices Recomendados
```sql
CREATE UNIQUE INDEX idx_giftcard_code ON giftcards(code);
CREATE INDEX idx_giftcard_request_id ON giftcards(giftcard_request_id);
CREATE INDEX idx_holds_giftcard ON giftcard_holds(giftcard_id);
CREATE INDEX idx_holds_expires ON giftcard_holds(expires_at);
CREATE INDEX idx_audit_giftcard ON giftcard_audit(giftcard_id);
CREATE INDEX idx_requests_status ON giftcard_requests(status);
```

---

## ⚠️ ERRORES COMUNES

### Error: "insufficient_funds"
```
Causa: Balance - holds < amount solicitado
Solución: 
- Usuario debe esperar a que hold expire (15 min)
- O usar otra giftcard
- O pagar diferencia con otro método
```

### Error: "giftcard_not_found"
```
Causa: Código no existe o no es válido
Solución:
- Verificar ortografía del código
- Si es reciente, esperar a que admin apruebe
- Contactar soporte
```

### Error: "approved_request_has_issued_code"
```
Causa: Sistema interno - solicitud aprobada pero giftcard no visible
Solución:
- Automático - sistema reintentará
- Si persiste, contactar admin
```

### No recibe email
```
Causa: 
1. Email en spam
2. Vercel serverless offline
3. API key Resend incorrecto
Solución:
- Revisar spam/promotions
- Admin: verificar logs `/tmp/ceramicalma-emails/`
```

---

## 🐛 DEBUGGING

### Ver Logs de Email (Dry-run)
```bash
# En servidor Vercel:
ls -la /tmp/ceramicalma-emails/

# Ejemplo de archivo:
cat /tmp/ceramicalma-emails/1234567890_juan@example_com_Tu_pago_fue_recibido.html
```

### Validar Estructura de Datos
```typescript
// Frontend console
const req = await fetch('/api/data?action=listGiftcardRequests');
const data = await req.json();
console.table(data);  // Ver en tabla

// Verificar tipos
data[0].amount  // Should be: number
data[0].createdAt  // Should be: ISO8601 string
data[0].metadata  // Should be: object or null
```

### Test de Transacción (Concurrencia)
```bash
# Simular 100 concurrent requests
for i in {1..100}; do
    curl -X POST http://localhost:3000/api/data \
        -H "Content-Type: application/json" \
        -d '{"action":"createGiftcardHold","code":"GC-TEST","amount":10}' &
done
wait

# Esperado: ~50 exitosos (si balance=500), ~50 fallidos (insufficient_funds)
```

---

## 📊 MONITOREO

### Queries Útiles

#### Giftcards No Redimidas (>30 días)
```sql
SELECT 
    code, 
    balance, 
    expires_at,
    DATEDIFF(day, created_at, NOW()) AS days_old
FROM giftcards
WHERE balance > 0 
  AND created_at < NOW() - INTERVAL 30 days
ORDER BY balance DESC;
```

#### Redención por Día
```sql
SELECT 
    DATE(created_at) AS fecha,
    COUNT(*) AS canjes,
    SUM(amount) AS total_redeemed
FROM giftcard_audit
WHERE event_type = 'redemption'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

#### Revenue por Giftcard
```sql
SELECT 
    SUM(initial_value) AS total_sold,
    SUM(balance) AS saldo_pendiente,
    SUM(initial_value - COALESCE(balance, 0)) AS total_redeemed,
    COUNT(*) AS num_giftcards
FROM giftcards;

-- Resultado esperado:
-- | total_sold | saldo_pendiente | total_redeemed | num_giftcards |
-- | 15000.00   | 2500.00         | 12500.00       | 300           |
```

#### Admin Actions Audit
```sql
SELECT 
    admin_user,
    event_type,
    COUNT(*) AS count,
    MAX(created_at) AS last_action
FROM giftcard_events
GROUP BY admin_user, event_type
ORDER BY admin_user, last_action DESC;
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deploy
- [ ] Tests ejecutados (happy path + error cases)
- [ ] Rate limiting configurado
- [ ] Emails probados (dry-run o staging)
- [ ] Database migrations ejecutadas
- [ ] Índices creados
- [ ] Secrets verificados (API keys, etc.)
- [ ] Error handling en place

### Post-Deploy
- [ ] Monitorear email delivery rate
- [ ] Observar latencies (p95 < 200ms)
- [ ] Validar transacciones (0% fraud)
- [ ] Check admin panel funciona
- [ ] Logs limpios (no exceptions)

### Rollback Plan
```bash
# Si algo falla:
1. Detener traffic a endpoint
2. Rollback database migrations
3. Revertir código anterior
4. Investigar logs
5. Fix y re-deploy
```

---

## 📞 CONTACTO / SUPPORT

### Información de Contacto
- **WhatsApp:** +593 985813327
- **Email:** admin@ceramicalma.com
- **Admin Panel:** https://ceramicalma.com/admin

### Escalation Path
```
Usuario → Email support
  ↓
Admin → GiftcardsManager panel
  ↓
Dev team → Revisar logs + DB
  ↓
Resolutión o escalation a Stripe/Resend
```

---

**Versión:** 1.0 | Actualizado: Noviembre 17, 2025  
**Mantenedor:** Daniel Reinoso | Última Ceramic  
**Wiki:** Ver ANALISIS_MODULO_GIFTCARDS.md para detalles completos
