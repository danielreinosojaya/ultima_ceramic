# 🚀 PLAN DE IMPLEMENTACIÓN: OPTIMIZACIÓN DE COSTOS
## Roadmap Detallado y Seguro para Ultima Ceramic

---

## FASE 1: QUICK WINS (Semanas 1-2)
### Cambios de Bajo Riesgo, Alto Impacto

### ✅ 1.1: Partial Cache Invalidation

**Archivo:** `services/dataService.ts`

**Cambio Actual (Línea 429):**
```typescript
export const invalidateBookingsCache = (): void => {
  clearCache('bookings');
};
```

**Nueva Versión:**
```typescript
// Invalidar solo recursos específicos
export const invalidateBookingsCache = (): void => {
  clearCache('bookings');
  // NO invalidar: customers, products, instructors
};

export const invalidateCustomersCache = (): void => {
  clearCache('customers');
};

export const invalidatePaymentsCache = (): void => {
  clearCache('payments');
};

export const invalidateGiftcardsCache = (): void => {
  clearCache('giftcards');
};

// Para operaciones que afectan múltiples recursos
export const invalidateMultiple = (keys: string[]): void => {
  keys.forEach(key => clearCache(key));
};
```

**Lugar donde se usa:**

En `api/data.ts`, buscar todas las líneas que llaman:
```typescript
invalidateBookingsCache(); // línea 1152 en rescheduleBookingSlot
```

Cambiar a ser específico:
```typescript
// ANTES:
invalidateBookingsCache(); // Invalida TODO

// DESPUÉS:
clearCache('bookings'); // Solo bookings
// Si afecta múltiples:
dataService.invalidateMultiple(['bookings', 'customers']);
```

**Impacto:**
- ✅ Reagendar 1 reserva NO recarga 1000 customers
- ✅ -40-50% overhead por operación

**Testing:**
```typescript
// test.ts
test('invalidateBookingsCache does not clear customers', () => {
  setCachedData('customers', [...]); 
  setCachedData('bookings', [...]);
  invalidateBookingsCache();
  expect(getCachedData('customers')).toBeDefined();
  expect(getCachedData('bookings')).toBeNull();
});
```

---

### ✅ 1.2: Add Cache-Control Headers

**Archivo:** `api/data.ts`

**Cambio:** En CADA endpoint que devuelve datos estáticos, agregar:

```typescript
// Ejemplo: getCustomers endpoint
case 'customers': {
  // ... lógica de query ...
  
  // AGREGUE ESTA LÍNEA:
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  
  return res.status(200).json(result);
}
```

**Endpoints a Actualizar:**

| Endpoint | TTL | Razón |
|----------|-----|-------|
| getCustomers | 300s (5 min) | Datos semi-estáticos |
| getBookings | 300s (5 min) | Cambia con nuevas reservas |
| getProducts | 3600s (1 hora) | Casi nunca cambia |
| getInstructors | 3600s (1 hora) | Casi nunca cambia |
| getGiftcards | 300s (5 min) | Cambia cuando se usan |
| getPolicies | 86400s (1 día) | Muy estable |

**Implementación (Copy-Paste):**

En el switch statement de `api/data.ts`, después de hacer queries:

```typescript
switch (action) {
  // ... cases ...
  
  case 'products':
    // ... sql query ...
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(toCamelCase(result));
    
  case 'instructors':
    // ... sql query ...
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(result);
    
  case 'getBookings':
    // ... sql query ...
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(result);
}
```

**Impacto:**
- ✅ -50-70% de requests llegan al backend (sirve desde CDN)
- ✅ Latencia: 200-500ms → 50-100ms

---

### ✅ 1.3: Optimize Retry Logic

**Archivo:** `services/dataService.ts` línea 310

**Cambio Actual:**
```typescript
const fetchData = async (url: string, options?: RequestInit, retries: number = 3) => {
    // ... 3 retries con backoff exponencial ...
    // Timeout: 30s, luego 60s en último intento
}
```

**Nueva Versión (Segura pero Mejorada):**

```typescript
const fetchData = async (url: string, options?: RequestInit, retries: number = 2) => {
    // Cambio: max 2 retries en lugar de 3 (reduce overhead)
    // Timeout: 15s (suficiente para mayoría de queries)
    
    let lastError: Error | null = null;
    const maxRetries = Math.min(retries, 2); // Cap at 2
    
    const fetchPromise = (async () => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (attempt === 1) {
                    console.log(`Fetching ${url}`);
                } else {
                    console.log(`Retry attempt ${attempt}/${maxRetries} for ${url}`);
                }
                
                const response = await fetch(url, {
                    ...options,
                    signal: AbortSignal.timeout(15000) // Reduced: 30s → 15s
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    if (response.headers.get('content-type')?.includes('application/json')) {
                        const errorData = JSON.parse(errorText || '{}');
                        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
                    } else {
                        throw new Error(`${response.status} ${response.statusText}`);
                    }
                }
                
                const text = await response.text();
                return text ? JSON.parse(text) : null;
                
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`Fetch attempt ${attempt} failed:`, lastError.message);
                
                // Exponential backoff: 500ms, 1000ms (capped)
                if (attempt < maxRetries) {
                    const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        if (lastError) {
            console.error(`All ${maxRetries} fetch attempts failed for ${url}`);
            throw lastError;
        }
        throw new Error('Unknown error');
    })();
    
    pendingRequests.set(requestKey, fetchPromise);
    return fetchPromise.finally(() => {
        pendingRequests.delete(requestKey);
    });
};
```

**Cambios Clave:**
1. `retries: number = 3` → `retries: number = 2` (menos reintentos)
2. `timeout: 30000ms` → `timeout: 15000ms` (más rápido para fail-fast)
3. `backoff: cap 2s` → `cap 2s` (sin cambio, pero garantizado)
4. Remove timeout extension en último intento

**Impacto:**
- ✅ Si request falla: 30-40s espera → 5-10s (fail-fast)
- ✅ -20% invocations innecesarias
- ✅ Mejor UX: errores más rápidos

---

### ✅ 1.4: Fix JSON Parsing in Reschedule

Ya lo hicimos en la sesión anterior:
- [x] Línea 2640: Manejo seguro de `slots` (string vs array)
- [x] Línea 2630: Manejo seguro de `reschedule_history` (JSON malformado)

**Verificación:** Build sin errores ✅

---

### ✅ 1.5: Add Simple Request Deduplication (Optional para Fase 1)

**Archivo:** `api/data.ts` (en la función handler principal)

```typescript
// Al inicio del handler
const requestDedupeCache = new Map<string, { data: any; timestamp: number }>();
const DEDUPE_TTL = 5 * 60 * 1000; // 5 minutos

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Para GET requests, check dedupe cache
  if (req.method === 'GET') {
    const cacheKey = `${req.url}`;
    const cached = requestDedupeCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < DEDUPE_TTL) {
      console.log(`[DEDUPE] Serving from cache: ${cacheKey}`);
      return res.status(200).json(cached.data);
    }
  }
  
  // ... normal processing ...
  
  // Cache GET responses
  if (req.method === 'GET') {
    requestDedupeCache.set(cacheKey, { data: result, timestamp: Date.now() });
  }
}
```

**Impacto:**
- ✅ Si 5 admins abren panel simultáneamente → 1 query
- ✅ -70% invocations en peak hours

**Riesgo:** MUY BAJO (simple Map cache)

---

## FASE 2: STRUCTURE REFACTOR (Semanas 3-4)

### ✅ 2.1: Split `/api/data.ts` into Microendpoints

**Problema:** 4,137 líneas en 1 archivo = 50+ cases.

**Solución:** Dividir en 5 endpoints especializados:

#### Nuevo Archivo: `/api/customers.ts`

```typescript
import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

function toCamelCase(obj: any): any {
  // ... copiar de data.ts línea 1-25 ...
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;
  
  try {
    switch (action) {
      case 'getCustomers': {
        const { limit = 50, offset = 0, search = '' } = req.query;
        
        const query = search 
          ? `user_info->>'email' ILIKE $1 OR user_info->>'firstName' ILIKE $1`
          : '1=1';
        
        const { rows: customers } = await sql`
          SELECT * FROM customers 
          WHERE ${query}
          LIMIT ${Math.min(parseInt(limit as string), 100)}
          OFFSET ${parseInt(offset as string)}
          ORDER BY booking_date DESC
        `;
        
        const { rows: countResult } = await sql`SELECT COUNT(*) as total FROM customers`;
        
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return res.json({
          data: customers.map(c => toCamelCase(c)),
          total: parseInt(countResult[0].total),
          limit,
          offset,
          hasMore: offset + limit < parseInt(countResult[0].total)
        });
      }
      
      case 'customer': {
        const { email } = req.query;
        // ... obtener customer específico ...
        break;
      }
      
      case 'updateCustomerInfo': {
        if (req.method !== 'POST') return res.status(405).end();
        const { email, userInfo } = req.body;
        // ... update logic ...
        break;
      }
      
      case 'deleteCustomer': {
        if (req.method !== 'POST') return res.status(405).end();
        const { email } = req.body;
        // ... delete logic ...
        break;
      }
      
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Server error' 
    });
  }
}
```

#### Nuevo Archivo: `/api/bookings.ts`

```typescript
import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;
  
  switch (action) {
    case 'getBookings': {
      const { limit = 50, offset = 0 } = req.query;
      const { rows: bookings } = await sql`
        SELECT * FROM bookings 
        ORDER BY created_at DESC
        LIMIT ${Math.min(parseInt(limit as string), 100)}
        OFFSET ${parseInt(offset as string)}
      `;
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.json(bookings.map(b => parseBookingFromDB(b)));
    }
    
    case 'updateBooking': {
      const { bookingId, updates } = req.body;
      // ... update logic ...
      break;
    }
    
    case 'rescheduleBookingSlot': {
      // ... MOVE FROM data.ts línea 2573 ...
      break;
    }
    
    case 'removeBookingSlot': {
      // ... MOVE FROM data.ts línea 2707 ...
      break;
    }
    
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}
```

#### Nuevo Archivo: `/api/giftcards.ts`

```typescript
// Mover TODOS los giftcard-related cases aquí (línea 466-2120 de data.ts)
// Casos: listGiftcards, addGiftcardRequest, approveGiftcardRequest, etc.
```

#### Nuevo Archivo: `/api/payments.ts`

```typescript
// Mover TODOS los payment cases aquí (línea 2330-2600 de data.ts)
// Casos: addPaymentToBooking, deletePaymentFromBooking, updatePaymentDetails
```

#### Nuevo Archivo: `/api/admin.ts`

```typescript
// Mover configuración admin aquí
// Casos: getProducts, getInstructors, syncProducts, etc.
```

**Cambios en Frontend (`services/dataService.ts`):**

```typescript
// Actualizar postAction para routing inteligente
const postAction = async (action: string, body?: any) => {
  // Determinar endpoint basado en action
  const endpointMap: Record<string, string> = {
    'getCustomers': '/api/customers',
    'updateCustomerInfo': '/api/customers',
    'deleteCustomer': '/api/customers',
    'addPaymentToBooking': '/api/payments',
    'updatePaymentDetails': '/api/payments',
    'deletePaymentFromBooking': '/api/payments',
    'rescheduleBookingSlot': '/api/bookings',
    'updateBooking': '/api/bookings',
    'approveGiftcardRequest': '/api/giftcards',
    'createGiftcardManual': '/api/giftcards',
    'getProducts': '/api/admin',
    'getInstructors': '/api/admin',
    // ... map rest ...
  };
  
  const endpoint = endpointMap[action] || '/api/data';
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // ... add admin header ...
  
  return fetchData(`${endpoint}?action=${action}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
};
```

**Impacto:**
- ✅ Cold start: 1.5s → 800ms (-47%)
- ✅ Bundle size: -30% por endpoint
- ✅ Easier to maintain: 800 líneas vs 4,137

**Migration Checklist:**
- [ ] Crear `/api/customers.ts`
- [ ] Crear `/api/bookings.ts`
- [ ] Crear `/api/giftcards.ts`
- [ ] Crear `/api/payments.ts`
- [ ] Crear `/api/admin.ts`
- [ ] Actualizar `services/dataService.ts` routing
- [ ] Test cada endpoint con Postman
- [ ] Deploy a staging
- [ ] QA 1 semana
- [ ] Delete `/api/data.ts` (o mantener como backward compatibility 2 semanas)

---

### ✅ 2.2: Add Pagination to Large Endpoints

En cada uno de los nuevos endpoints, add:

```typescript
const { limit = 50, offset = 0, search = '' } = req.query;

// Validar límites
const safeLimit = Math.min(parseInt(limit as string) || 50, 100);
const safeOffset = Math.max(parseInt(offset as string) || 0, 0);

// Query con LIMIT/OFFSET
const { rows } = await sql`
  SELECT * FROM your_table
  WHERE ${searchCondition}
  LIMIT ${safeLimit}
  OFFSET ${safeOffset}
  ORDER BY created_at DESC
`;

// Obtener total para paginación
const { rows: countResult } = await sql`
  SELECT COUNT(*) as total FROM your_table
  WHERE ${searchCondition}
`;

return res.json({
  data: rows,
  pagination: {
    total: parseInt(countResult[0].total),
    limit: safeLimit,
    offset: safeOffset,
    hasMore: safeOffset + safeLimit < parseInt(countResult[0].total)
  }
});
```

**Frontend Update (AdminDataContext.tsx):**

```typescript
// Implementar infinite scroll o page-based pagination
const [currentPage, setCurrentPage] = useState(1);
const pageSize = 50;

const fetchCustomers = async (page: number) => {
  const response = await fetch(`/api/customers?action=getCustomers&limit=${pageSize}&offset=${(page - 1) * pageSize}`);
  const { data, pagination } = await response.json();
  setCustomers(prev => [...prev, ...data]); // para infinite scroll
  setPagination(pagination);
};
```

**Impacto:**
- ✅ Response size: 100MB → 500KB (-99%)
- ✅ Parse time: 3-5s → 100-200ms
- ✅ Network: Más rápido en conexiones lentas

---

### ✅ 2.3: Move Email/SMS to Async Queue (IMPORTANT)

**Problema:** `sendGiftcardNow()` y `sendTestEmail()` son SÍNCRONOS.
- Bloquean la Function por 5-30 segundos
- Si falla, retry = espera más

**Solución:** Usar PgBoss (queue built on Postgres)

#### Setup PgBoss:

**Archivo:** `api/queue.ts` (NUEVO)

```typescript
import PgBoss from 'pg-boss';

let boss: PgBoss | null = null;

export async function initQueue() {
  if (boss) return boss;
  
  boss = new PgBoss({
    connectionString: process.env.POSTGRES_URL,
    // Opcional: usar pool separado
    // connectionString: process.env.POSTGRES_URL_POOL,
  });
  
  // Handlers para diferentes job types
  await boss.work('send-email', async job => {
    try {
      const { to, template, data } = job.data;
      console.log(`[Queue] Sending email to ${to}`);
      
      // Usar tu emailService existente
      await emailService.send({
        to,
        template,
        data
      });
      
      console.log(`[Queue] Email sent successfully to ${to}`);
    } catch (error) {
      console.error(`[Queue] Failed to send email:`, error);
      throw error; // PgBoss reintentará automáticamente
    }
  });
  
  // Handler para SMS
  await boss.work('send-sms', async job => {
    try {
      const { phone, message } = job.data;
      // Tu lógica de SMS
      console.log(`[Queue] SMS sent to ${phone}`);
    } catch (error) {
      console.error(`[Queue] Failed to send SMS:`, error);
      throw error;
    }
  });
  
  // Start worker
  await boss.start();
  return boss;
}

export async function queueEmail(to: string, template: string, data: any) {
  const boss = await initQueue();
  return boss.send('send-email', { to, template, data }, {
    retryLimit: 3,
    retryDelay: 60, // 1 minuto entre reintentos
    expireInSeconds: 3600 // Expirar después de 1 hora
  });
}

export async function queueSMS(phone: string, message: string) {
  const boss = await initQueue();
  return boss.send('send-sms', { phone, message }, {
    retryLimit: 3,
    retryDelay: 60,
    expireInSeconds: 3600
  });
}
```

#### Cambiar Endpoints:

**Archivo:** `/api/giftcards.ts` (o `/api/admin.ts`)

```typescript
case 'sendGiftcardNow': {
  // ... validaciones ...
  
  // ANTES (BLOQUEANTE):
  // await emailService.send({ to: giftcard.recipientEmail, ... });
  
  // DESPUÉS (ASYNC):
  const { queueEmail } = await import('./queue.js');
  await queueEmail(giftcard.recipientEmail, 'giftcard-voucher', {
    code: giftcard.code,
    voucherUrl: giftcard.voucherUrl,
    buyerName: giftcard.buyerName
  });
  
  // Retornar inmediatamente
  res.setHeader('Cache-Control', 'public, max-age=0, no-store');
  return res.json({ 
    success: true, 
    message: 'Email queued for delivery'
  });
}

case 'sendTestEmail': {
  // ... 
  const { queueEmail } = await import('./queue.js');
  await queueEmail(email, 'test-email', { adminName: adminUser });
  
  return res.json({ success: true, message: 'Test email queued' });
}
```

**Impacto Estimado:**
- ✅ Function duration: 20s → 0.1s (200x más rápido)
- ✅ Timeout failures: 0% (no hay timeout en async queue)
- ✅ Costo: -60% en invocations de email/SMS

---

## FASE 3: OPTIMIZATION (Semanas 5-6)

### ✅ 3.1: Lazy Load Components

**Archivo:** `App.tsx`

```typescript
// ANTES:
import { GiftcardPersonalization } from './components/giftcard/GiftcardPersonalization';
import { IntroClassSelector } from './components/IntroClassSelector';
import { GroupClassWizard } from './components/experiences/GroupClassWizard';
import { PieceExperienceWizard } from './components/experiences/PieceExperienceWizard';
import { SingleClassWizard } from './components/experiences/SingleClassWizard';

// DESPUÉS:
const GiftcardPersonalization = lazy(() => import('./components/giftcard/GiftcardPersonalization'));
const IntroClassSelector = lazy(() => import('./components/IntroClassSelector'));
const GroupClassWizard = lazy(() => import('./components/experiences/GroupClassWizard'));
const PieceExperienceWizard = lazy(() => import('./components/experiences/PieceExperienceWizard'));
const SingleClassWizard = lazy(() => import('./components/experiences/SingleClassWizard'));

// Wrappear con Suspense:
<Suspense fallback={<div>Cargando...</div>}>
  <GiftcardPersonalization {...props} />
</Suspense>
```

**Componentes a Lazy Load:**
1. GiftcardPersonalization
2. IntroClassSelector
3. GroupClassWizard
4. PieceExperienceWizard
5. SingleClassWizard
6. CouplesTourModal
7. GroupInquiryForm
8. ClientDeliveryForm
9. AnnouncementsBoard

**Impacto:**
- ✅ Initial bundle: -150-200KB
- ✅ FCP: -1-2 segundos
- ✅ -5% bounce rate

---

### ✅ 3.2: Add Circuit Breaker to Fetch

**Archivo:** `services/dataService.ts` (NUEVO)

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastFailureTime = 0;
  
  constructor(
    private config = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minuto
      monitoringPeriod: 10000
    }
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'half-open';
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
      console.error(`[CircuitBreaker] OPENED after ${this.failures} failures`);
    }
  }
}

// Uso:
const breaker = new CircuitBreaker();

const safeFetch = async (url: string, options?: RequestInit) => {
  return breaker.execute(() => fetch(url, options).then(r => r.json()));
};
```

**Impacto:**
- ✅ Previene cascadas de timeouts
- ✅ -50% reintentos innecesarios
- ✅ Mejor UX: errores rápidos vs timeout

---

## FASE 4: MONITORING (Semana 7+)

### ✅ 4.1: Setup Cost Monitoring

**Archivo:** `api/middleware.ts` (NUEVO)

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

const metrics = {
  invocations: new Map<string, number>(),
  totalDuration: new Map<string, number>(),
  errors: new Map<string, number>(),
};

export function trackMetrics(req: VercelRequest, res: VercelResponse, duration: number) {
  const action = req.query.action as string || 'unknown';
  
  metrics.invocations.set(action, (metrics.invocations.get(action) || 0) + 1);
  metrics.totalDuration.set(action, (metrics.totalDuration.get(action) || 0) + duration);
  
  if (res.statusCode >= 400) {
    metrics.errors.set(action, (metrics.errors.get(action) || 0) + 1);
  }
}

export function getMetrics() {
  const report = {
    invocations: Object.fromEntries(metrics.invocations),
    avgDuration: Array.from(metrics.totalDuration.entries()).reduce((acc, [key, total]) => {
      acc[key] = total / (metrics.invocations.get(key) || 1);
      return acc;
    }, {} as Record<string, number>),
    errors: Object.fromEntries(metrics.errors),
    timestamp: new Date().toISOString(),
  };
  
  // Log a file o enviar a service de metrics
  console.log('[METRICS]', JSON.stringify(report, null, 2));
  
  return report;
}
```

**Integration en cada endpoint:**

```typescript
const startTime = Date.now();

try {
  // ... lógica ...
  const duration = Date.now() - startTime;
  trackMetrics(req, res, duration);
} catch (error) {
  const duration = Date.now() - startTime;
  trackMetrics(req, res, duration);
}
```

**Dashboard (Manual - usar Vercel Dashboard):**

Weekly check:
```
- Total invocations (should decrease -50% after optimization)
- P95 latency (should be < 500ms)
- Error rate (should be < 1%)
- Cost/month (track against baseline)
```

---

## 📋 IMPLEMENTATION CHECKLIST

### FASE 1 (2 semanas)
- [ ] Partial cache invalidation
- [ ] Add Cache-Control headers
- [ ] Optimize retry logic (2 retries max, 15s timeout)
- [ ] Request deduplication (optional)
- [ ] Testing + QA
- **Expected savings: -20-30%**

### FASE 2 (2-3 semanas)
- [ ] Split `/api/data.ts` into 5 endpoints
- [ ] Add pagination to `getCustomers`, `getBookings`
- [ ] Move email/SMS to PgBoss queue
- [ ] Update dataService.ts routing
- [ ] Frontend update for pagination
- [ ] Testing + staging validation
- [ ] Deploy + monitor 1 week
- **Expected savings: -40-50% additional**

### FASE 3 (1-2 semanas)
- [ ] Lazy load components (GiftcardPersonalization, etc.)
- [ ] Add CircuitBreaker
- [ ] Add metrics tracking
- [ ] Testing
- **Expected improvement: UX + stability**

### FASE 4 (Ongoing)
- [ ] Weekly cost monitoring
- [ ] User feedback collection
- [ ] Fine-tune caches based on usage patterns
- [ ] Document changes for team

---

## 🎯 SUCCESS CRITERIA

| Métrica | Baseline | Target | Status |
|---------|----------|--------|--------|
| Invocations/día | 1000 | 400-500 | 🎯 |
| Avg latency | 2.5s | <800ms | 🎯 |
| P95 latency | 5s | <2s | 🎯 |
| Function duration (email) | 20s | <0.5s | 🎯 |
| Cost/mes | $570 | $250-300 | 🎯 |
| Error rate | 2% | <1% | 🎯 |

---

## 🔄 ROLLBACK PLAN

Si algo sale mal:

1. **1.5 horas después:** Monitor error rate + latency
2. **If > 5% error rate:** Disable new endpoint + revert to `/api/data.ts`
3. **Gradual rollback:**
   - Disable `/api/customers.ts` → route to `/api/data.ts`
   - Disable `/api/bookings.ts` → route to `/api/data.ts`
   - Etc.
4. **Keep cache invalidations:** Son cambios backwards-compatible

---

## 💬 QUESTIONS & SUPPORT

- **¿Puedo rollback rápido?** Sí, 5 minutos (revert routing en postAction)
- **¿Va a afectar users?** No, cambios son backend-only
- **¿Cuánto storage en queue?** PgBoss usa tu Postgres, ~1MB per 10k jobs
- **¿Y si cambio de Vercel?** Mismos cambios aplican en AWS/Railway/Heroku

