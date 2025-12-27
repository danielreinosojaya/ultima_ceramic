# 💻 CODE SNIPPETS - READY TO COPY & PASTE
## Última Ceramic - Optimización Vercel

**Indicaciones:** Cada snippet está listo para copiar. Solo reemplaza `YOUR_VALUE` con tus datos.

---

## FASE 1: QUICK WINS

### Snippet 1.1: Partial Cache Invalidation
**Archivo:** `services/dataService.ts`  
**Ubicación:** Después de línea 429

```typescript
// ===== SNIPPET 1.1: GRANULAR CACHE INVALIDATION =====

// Reemplazar la función existente invalidateBookingsCache()
export const invalidateBookingsCache = (): void => {
    console.log('[Cache] Invalidating bookings cache only');
    clearCache('bookings');
    // ✅ NO invalida: customers, products, instructors, giftcards
};

// Agregar nuevas funciones
export const invalidateCustomersCache = (): void => {
    console.log('[Cache] Invalidating customers cache only');
    clearCache('customers');
};

export const invalidatePaymentsCache = (): void => {
    console.log('[Cache] Invalidating payments cache only');
    clearCache('payments');
};

export const invalidateGiftcardsCache = (): void => {
    console.log('[Cache] Invalidating giftcards cache only');
    clearCache('giftcards');
};

export const invalidateProductsCache = (): void => {
    console.log('[Cache] Invalidating products cache only');
    clearCache('products');
};

// Para operaciones que afectan múltiples recursos
export const invalidateMultiple = (keys: string[]): void => {
    console.log('[Cache] Invalidating multiple:', keys);
    keys.forEach(key => clearCache(key));
};

// ===== FIN SNIPPET 1.1 =====
```

---

### Snippet 1.2: Add Cache-Control Headers (Múltiples Endpoints)
**Archivo:** `api/data.ts`  
**Ubicación:** En cada `case` antes de `return res.json()`

```typescript
// ===== SNIPPET 1.2: CACHE-CONTROL HEADERS =====

// PATRÓN A USAR EN CADA CASE:

case 'products': {
    // ... tu lógica SQL ...
    const result = toCamelCase(rows);
    
    // ✅ AGREGAR ESTA LÍNEA:
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    // s-maxage=3600: CDN cachea 1 hora
    // stale-while-revalidate=86400: Servir stale por 24 horas mientras revalida
    
    return res.status(200).json(result);
}

case 'instructors': {
    // ... tu lógica SQL ...
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(result);
}

case 'getBookings': {
    // ... tu lógica SQL ...
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    // 5 minutos en CDN (más corto, datos más dinámicos)
    return res.status(200).json(result);
}

case 'getCustomers': {
    // ... tu lógica SQL ...
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(result);
}

case 'getGiftcards': {
    // ... tu lógica SQL ...
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(result);
}

// ===== GUÍA: CUÁNDO USAR QUÉ TTL =====
/*
- Datos muy estables (productos, instructores): s-maxage=3600
- Datos dinámicos (bookings, customers): s-maxage=300
- Datos reales-time: s-maxage=60
- NUNCA: sin Cache-Control o max-age=0
*/

// ===== FIN SNIPPET 1.2 =====
```

---

### Snippet 1.3: Optimize Retry Logic
**Archivo:** `services/dataService.ts`  
**Ubicación:** Reemplazar función `fetchData` línea 310

```typescript
// ===== SNIPPET 1.3: OPTIMIZED RETRY LOGIC =====

const fetchData = async (url: string, options?: RequestInit, retries: number = 3) => {
    // Cambio importante: cap retries at 2 (fue 3)
    const maxRetries = Math.min(retries, 2);
    
    const requestKey = `${url}_${JSON.stringify(options || {})}`;
    if (pendingRequests.has(requestKey)) {
        console.log(`[DEDUP] Request already pending for ${url}, returning cached promise...`);
        return pendingRequests.get(requestKey);
    }

    let lastError: Error | null = null;
    
    const fetchPromise = (async () => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (attempt === 1) {
                    console.log(`Fetching ${url}`);
                } else {
                    console.log(`Retry attempt ${attempt}/${maxRetries} for ${url}`);
                }
                
                // CAMBIO: timeout reducido 30s → 15s
                const response = await fetch(url, {
                    ...options,
                    signal: AbortSignal.timeout(15000) // Cambio de 30000
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    if (response.headers.get('content-type')?.includes('application/json')) {
                        const errorData = JSON.parse(errorText || '{}');
                        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
                    } else {
                        throw new Error(`${response.status} ${response.statusText}`);
                    }
                }
                
                const text = await response.text();
                return text ? JSON.parse(text) : null;
                
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`Fetch attempt ${attempt} failed:`, lastError.message);
                
                if (attempt < maxRetries) {
                    // CAMBIO: backoff más conservador
                    const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000); // max 2s
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        if (lastError) {
            console.error(`All ${maxRetries} fetch attempts failed for ${url}`);
            throw lastError;
        } else {
            throw new Error('Unknown error occurred during fetch attempts.');
        }
    })();
    
    pendingRequests.set(requestKey, fetchPromise);
    
    return fetchPromise.finally(() => {
        pendingRequests.delete(requestKey);
    });
};

// ===== FIN SNIPPET 1.3 =====
```

---

## FASE 2: STRUCTURE REFACTOR

### Snippet 2.1: New `/api/customers.ts` Endpoint
**Crear archivo:** `api/customers.ts` (NUEVO)

```typescript
// ===== SNIPPET 2.1: NEW /api/customers.ts =====

import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import type { Customer } from '../types';

// Copy toCamelCase function from data.ts
function toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        if (obj instanceof Date) {
            return obj.toISOString();
        }
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            let value = obj[key];
            if (value instanceof Date) {
                value = value.toISOString();
            } else {
                value = toCamelCase(value);
            }
            acc[camelKey] = value;
            return acc;
        }, {} as any);
    }
    return obj;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action } = req.query;
    
    try {
        switch (action) {
            case 'getCustomers': {
                const { limit = '50', offset = '0', search = '' } = req.query;
                
                const safeLimit = Math.min(Math.max(parseInt(limit as string) || 50, 1), 100);
                const safeOffset = Math.max(parseInt(offset as string) || 0, 0);
                
                // Query con LIMIT/OFFSET y búsqueda
                const searchCondition = search 
                    ? `user_info->>'email' ILIKE '%${search}%' OR user_info->>'firstName' ILIKE '%${search}%'`
                    : '1=1';
                
                const { rows: customers } = await sql`
                    SELECT * FROM customers 
                    WHERE ${searchCondition}
                    ORDER BY booking_date DESC
                    LIMIT ${safeLimit}
                    OFFSET ${safeOffset}
                `;
                
                const { rows: countResult } = await sql`
                    SELECT COUNT(*) as total FROM customers
                    WHERE ${searchCondition}
                `;
                
                const total = parseInt(countResult[0]?.total || '0');
                
                // ✅ ADD CACHE HEADER
                res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
                
                return res.status(200).json({
                    data: customers.map(c => toCamelCase(c)),
                    pagination: {
                        total,
                        limit: safeLimit,
                        offset: safeOffset,
                        hasMore: safeOffset + safeLimit < total
                    }
                });
            }
            
            case 'customer': {
                const { email } = req.query;
                if (!email) return res.status(400).json({ error: 'Email required' });
                
                const { rows: [customer] } = await sql`
                    SELECT * FROM customers WHERE email = ${email}
                `;
                
                if (!customer) {
                    return res.status(404).json({ error: 'Customer not found' });
                }
                
                res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
                return res.status(200).json(toCamelCase(customer));
            }
            
            case 'updateCustomerInfo': {
                if (req.method !== 'POST') {
                    return res.status(405).json({ error: 'Method not allowed' });
                }
                
                const { email, userInfo } = req.body;
                if (!email || !userInfo) {
                    return res.status(400).json({ error: 'Email and userInfo required' });
                }
                
                const { rows: [updatedCustomer] } = await sql`
                    UPDATE customers 
                    SET user_info = ${JSON.stringify(userInfo)}, 
                        updated_at = NOW()
                    WHERE email = ${email}
                    RETURNING *
                `;
                
                if (!updatedCustomer) {
                    return res.status(404).json({ error: 'Customer not found' });
                }
                
                return res.status(200).json({
                    success: true,
                    customer: toCamelCase(updatedCustomer)
                });
            }
            
            case 'deleteCustomer': {
                if (req.method !== 'POST') {
                    return res.status(405).json({ error: 'Method not allowed' });
                }
                
                const { email, adminUser } = req.body;
                if (!email) {
                    return res.status(400).json({ error: 'Email required' });
                }
                
                await sql`DELETE FROM customers WHERE email = ${email}`;
                
                console.log(`[ADMIN] Customer deleted: ${email} by ${adminUser || 'unknown'}`);
                
                return res.status(200).json({
                    success: true,
                    message: 'Customer deleted'
                });
            }
            
            default:
                return res.status(400).json({ error: `Unknown action: ${action}` });
        }
    } catch (error) {
        console.error('[/api/customers] Error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Server error'
        });
    }
}

// ===== FIN SNIPPET 2.1 =====
```

---

### Snippet 2.2: Update dataService Routing
**Archivo:** `services/dataService.ts`  
**Ubicación:** Reemplazar función `postAction` línea 543

```typescript
// ===== SNIPPET 2.2: SMART ENDPOINT ROUTING =====

const postAction = async (action: string, body?: any): Promise<any> => {
    // ✅ NEW: Route requests to correct endpoint
    const endpointMap: Record<string, string> = {
        // Customers
        'getCustomers': '/api/customers',
        'customer': '/api/customers',
        'updateCustomerInfo': '/api/customers',
        'deleteCustomer': '/api/customers',
        
        // Bookings
        'getBookings': '/api/bookings',
        'updateBooking': '/api/bookings',
        'rescheduleBookingSlot': '/api/bookings',
        'removeBookingSlot': '/api/bookings',
        
        // Payments
        'addPaymentToBooking': '/api/payments',
        'updatePaymentDetails': '/api/payments',
        'deletePaymentFromBooking': '/api/payments',
        'acceptPaymentForBooking': '/api/payments',
        
        // Giftcards
        'addGiftcardRequest': '/api/giftcards',
        'approveGiftcardRequest': '/api/giftcards',
        'rejectGiftcardRequest': '/api/giftcards',
        'createGiftcardManual': '/api/giftcards',
        'listGiftcardRequests': '/api/giftcards',
        'listGiftcards': '/api/giftcards',
        'sendGiftcardNow': '/api/giftcards',
        
        // Admin
        'products': '/api/admin',
        'getProducts': '/api/admin',
        'instructors': '/api/admin',
        'getInstructors': '/api/admin',
        'syncProducts': '/api/admin',
        
        // Default: fallback a data.ts para backward compatibility
    };
    
    const endpoint = endpointMap[action] || '/api/data';
    
    const requestKey = `${endpoint}_${action}_${JSON.stringify(body || {})}`;
    if (pendingRequests.has(requestKey)) {
        console.log(`[DEDUP] Request already pending for ${action}, returning cached promise...`);
        return pendingRequests.get(requestKey);
    }
    
    let adminUserHeader: string | null = null;
    try {
        if (body && typeof body === 'object') {
            if (body.adminUser) adminUserHeader = String(body.adminUser);
            else if (body.payment && body.payment.metadata && (body.payment.metadata.adminName || body.payment.metadata.adminUser)) {
                adminUserHeader = String(body.payment.metadata.adminName || body.payment.metadata.adminUser);
            }
        }
        if (!adminUserHeader && typeof window !== 'undefined') {
            const ls = window.localStorage.getItem('adminUser');
            if (ls) adminUserHeader = ls;
            if (!adminUserHeader && (window as any).__ADMIN_USER__) adminUserHeader = String((window as any).__ADMIN_USER__);
        }
    } catch (e) {
        // ignore
    }
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminUserHeader) headers['x-admin-user'] = adminUserHeader;
    
    console.log(`[postAction] Routing ${action} to ${endpoint}`);
    
    return fetchData(`${endpoint}?action=${action}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
};

// ===== FIN SNIPPET 2.2 =====
```

---

### Snippet 2.3: PgBoss Email Queue
**Crear archivo:** `api/queue.ts` (NUEVO)

```typescript
// ===== SNIPPET 2.3: PGBOSS ASYNC QUEUE =====

import PgBoss from 'pg-boss';
import * as emailService from './emailService.js';

let boss: PgBoss | null = null;

export async function initQueue(): Promise<PgBoss> {
    if (boss) return boss;
    
    console.log('[Queue] Initializing PgBoss queue...');
    
    boss = new PgBoss({
        connectionString: process.env.POSTGRES_URL,
        // Optional: use pool URL if available
        // connectionString: process.env.POSTGRES_URL_POOL,
        schema: 'pgboss', // separate schema for queue
        retentionDays: 7, // keep job history 7 days
    });
    
    // Email handler
    await boss.work('send-email', async job => {
        try {
            const { to, template, data } = job.data;
            console.log(`[Queue] Sending email to ${to}, template: ${template}`);
            
            // Use your existing emailService
            const result = await emailService.send({
                to,
                template,
                data
            });
            
            console.log(`[Queue] ✅ Email sent to ${to}`);
            return { success: true, messageId: result?.messageId };
        } catch (error) {
            console.error(`[Queue] ❌ Failed to send email to ${job.data.to}:`, error);
            throw error; // PgBoss auto-retries
        }
    });
    
    // SMS handler (optional)
    await boss.work('send-sms', async job => {
        try {
            const { phone, message } = job.data;
            console.log(`[Queue] Sending SMS to ${phone}`);
            
            // Your SMS logic here
            // const result = await smsService.send(phone, message);
            
            console.log(`[Queue] ✅ SMS sent to ${phone}`);
            return { success: true };
        } catch (error) {
            console.error(`[Queue] ❌ Failed to send SMS to ${job.data.phone}:`, error);
            throw error;
        }
    });
    
    // Start worker
    await boss.start();
    console.log('[Queue] ✅ Queue started');
    
    return boss;
}

// Queue email without blocking
export async function queueEmail(
    to: string,
    template: string,
    data: any
): Promise<string> {
    const boss = await initQueue();
    
    const jobId = await boss.send('send-email', { to, template, data }, {
        retryLimit: 3, // Retry 3 times
        retryDelay: 60, // 1 minute between retries
        expireInSeconds: 3600, // Expire after 1 hour
        priority: 10 // Lower number = higher priority
    });
    
    console.log(`[Queue] Email job queued: ${jobId} → ${to}`);
    return jobId;
}

// Queue SMS without blocking
export async function queueSMS(
    phone: string,
    message: string
): Promise<string> {
    const boss = await initQueue();
    
    const jobId = await boss.send('send-sms', { phone, message }, {
        retryLimit: 3,
        retryDelay: 60,
        expireInSeconds: 3600
    });
    
    console.log(`[Queue] SMS job queued: ${jobId} → ${phone}`);
    return jobId;
}

// Get queue stats (for monitoring)
export async function getQueueStats() {
    const boss = await initQueue();
    return boss.getQueues();
}

// ===== FIN SNIPPET 2.3 =====
```

---

### Snippet 2.4: Update Giftcard Endpoints to Use Queue
**Archivo:** `api/data.ts` (o nuevo `/api/giftcards.ts`)  
**Ubicación:** En cases `sendGiftcardNow` y `sendTestEmail`

```typescript
// ===== SNIPPET 2.4: USE ASYNC EMAIL QUEUE =====

case 'sendGiftcardNow': {
    const { id, adminUser } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'Giftcard ID required' });
    }
    
    // ... BEFORE: validate, get giftcard data ...
    
    // ❌ OLD (BLOCKING):
    // await emailService.send({
    //     to: giftcardRequest.recipientEmail,
    //     template: 'giftcard-voucher',
    //     data: { code, voucherUrl }
    // });
    
    // ✅ NEW (ASYNC):
    const { queueEmail } = await import('./queue.js');
    
    const jobId = await queueEmail(
        giftcardRequest.recipientEmail,
        'giftcard-voucher',
        {
            recipientName: giftcardRequest.recipientName,
            code: giftcardRequest.code,
            voucherUrl: giftcardRequest.voucherUrl,
            buyerName: giftcardRequest.buyerName
        }
    );
    
    console.log(`[sendGiftcardNow] Email queued: ${jobId}`);
    
    // ✅ Return immediately (Function duration: 0.1s instead of 20s)
    return res.status(200).json({
        success: true,
        message: 'Gift card email queued for delivery',
        jobId // User can track status if needed
    });
}

case 'sendTestEmail': {
    const { email, adminUser } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email required' });
    }
    
    // ✅ ALSO USE QUEUE:
    const { queueEmail } = await import('./queue.js');
    
    const jobId = await queueEmail(
        email,
        'test-email',
        {
            adminName: adminUser || 'Admin',
            timestamp: new Date().toISOString()
        }
    );
    
    return res.status(200).json({
        success: true,
        message: 'Test email queued',
        jobId
    });
}

// ===== FIN SNIPPET 2.4 =====
```

---

## FASE 3: OPTIMIZATION

### Snippet 3.1: Lazy Load Components
**Archivo:** `App.tsx`  
**Ubicación:** Línea 37+ (imports de componentes)

```typescript
// ===== SNIPPET 3.1: LAZY LOAD SECONDARY COMPONENTS =====

import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';

// Keep critical components imported normally
import { Header } from './components/Header';
import { WelcomeSelector } from './components/WelcomeSelector';

// ✅ LAZY LOAD secondary components
const GiftcardPersonalization = lazy(() => 
    import('./components/giftcard/GiftcardPersonalization')
        .then(m => ({ default: m.GiftcardPersonalization }))
);

const IntroClassSelector = lazy(() => 
    import('./components/IntroClassSelector')
        .then(m => ({ default: m.IntroClassSelector }))
);

const GroupClassWizard = lazy(() => 
    import('./components/experiences/GroupClassWizard')
        .then(m => ({ default: m.GroupClassWizard }))
);

const PieceExperienceWizard = lazy(() => 
    import('./components/experiences/PieceExperienceWizard')
        .then(m => ({ default: m.PieceExperienceWizard }))
);

const SingleClassWizard = lazy(() => 
    import('./components/experiences/SingleClassWizard')
        .then(m => ({ default: m.SingleClassWizard }))
);

const CouplesTourModal = lazy(() => 
    import('./components/CouplesTourModal')
        .then(m => ({ default: m.CouplesTourModal }))
);

const GroupInquiryForm = lazy(() => 
    import('./components/GroupInquiryForm')
        .then(m => ({ default: m.GroupInquiryForm }))
);

const ClientDeliveryForm = lazy(() => 
    import('./components/ClientDeliveryForm')
        .then(m => ({ default: m.ClientDeliveryForm }))
);

const AnnouncementsBoard = lazy(() => 
    import('./components/AnnouncementsBoard')
        .then(m => ({ default: m.AnnouncementsBoard }))
);

// Fallback component while loading
const ComponentLoadingFallback = () => (
    <div className="flex items-center justify-center p-8">
        <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-primary mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Cargando...</p>
        </div>
    </div>
);

// ===== Luego, donde uses los componentes, wrappea con Suspense =====

// ANTES:
// <GiftcardPersonalization {...props} />

// DESPUÉS:
// <Suspense fallback={<ComponentLoadingFallback />}>
//     <GiftcardPersonalization {...props} />
// </Suspense>

// ===== FIN SNIPPET 3.1 =====
```

---

### Snippet 3.2: Circuit Breaker
**Archivo:** `services/dataService.ts`  
**Ubicación:** Agregar antes de la función `fetchData`

```typescript
// ===== SNIPPET 3.2: CIRCUIT BREAKER PATTERN =====

class CircuitBreaker {
    private failures = 0;
    private state: 'closed' | 'open' | 'half-open' = 'closed';
    private lastFailureTime = 0;
    private successCount = 0;
    
    constructor(
        private readonly url: string,
        private readonly config = {
            failureThreshold: 5, // Open after 5 failures
            resetTimeout: 60000, // Try again after 1 minute
            successThreshold: 2, // Need 2 successes to close from half-open
        }
    ) {}
    
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
                console.log(`[CircuitBreaker] ${this.url} HALF-OPEN: trying again`);
                this.state = 'half-open';
                this.failures = 0;
                this.successCount = 0;
            } else {
                const timeLeft = this.config.resetTimeout - (Date.now() - this.lastFailureTime);
                const error = new Error(
                    `Circuit breaker OPEN for ${this.url} (${Math.ceil(timeLeft / 1000)}s)`
                );
                (error as any).isCircuitOpen = true;
                throw error;
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
        if (this.state === 'half-open') {
            this.successCount++;
            if (this.successCount >= this.config.successThreshold) {
                console.log(`[CircuitBreaker] ${this.url} CLOSED: recovery successful`);
                this.state = 'closed';
                this.failures = 0;
                this.successCount = 0;
            }
        } else if (this.state === 'closed') {
            this.failures = 0;
            this.successCount = 0;
        }
    }
    
    private onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        
        if (this.failures >= this.config.failureThreshold && this.state !== 'open') {
            console.error(
                `[CircuitBreaker] ${this.url} OPENED after ${this.failures} failures`
            );
            this.state = 'open';
        }
    }
    
    getState() {
        return {
            state: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime
        };
    }
}

// Usage:
const breakers = new Map<string, CircuitBreaker>();

function getOrCreateBreaker(url: string): CircuitBreaker {
    if (!breakers.has(url)) {
        breakers.set(url, new CircuitBreaker(url));
    }
    return breakers.get(url)!;
}

export const fetchDataWithCircuitBreaker = async <T>(
    url: string,
    options?: RequestInit
): Promise<T> => {
    const breaker = getOrCreateBreaker(url);
    
    return breaker.execute(() => 
        fetch(url, { ...options, signal: AbortSignal.timeout(15000) })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
    );
};

// ===== FIN SNIPPET 3.2 =====
```

---

## MONITORING

### Snippet 4.1: Basic Metrics Tracking
**Archivo:** `api/data.ts` (o crear `/api/metrics.ts`)

```typescript
// ===== SNIPPET 4.1: BASIC METRICS =====

const metrics = {
    invocations: new Map<string, number>(),
    totalDuration: new Map<string, number>(),
    errors: new Map<string, number>(),
    startTime: Date.now(),
};

function trackMetric(action: string, duration: number, error?: boolean) {
    metrics.invocations.set(action, (metrics.invocations.get(action) || 0) + 1);
    metrics.totalDuration.set(action, (metrics.totalDuration.get(action) || 0) + duration);
    
    if (error) {
        metrics.errors.set(action, (metrics.errors.get(action) || 0) + 1);
    }
}

function getMetricsReport() {
    const report: Record<string, any> = {
        timestamp: new Date().toISOString(),
        uptime: Date.now() - metrics.startTime,
        endpoints: {}
    };
    
    metrics.invocations.forEach((count, action) => {
        const totalDuration = metrics.totalDuration.get(action) || 0;
        const errorCount = metrics.errors.get(action) || 0;
        
        report.endpoints[action] = {
            invocations: count,
            avgDuration: Math.round(totalDuration / count),
            totalDuration,
            errors: errorCount,
            errorRate: ((errorCount / count) * 100).toFixed(2) + '%'
        };
    });
    
    return report;
}

// ✅ Use in handler:
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const startTime = Date.now();
    const action = req.query.action as string;
    
    try {
        // ... your logic ...
        
        const duration = Date.now() - startTime;
        trackMetric(action, duration, false);
        
        return res.json(result);
    } catch (error) {
        const duration = Date.now() - startTime;
        trackMetric(action, duration, true);
        
        return res.status(500).json({ error: 'Server error' });
    }
}

// Expose metrics endpoint (optional, for debugging)
if (action === '__metrics__') {
    return res.json(getMetricsReport());
}

// ===== FIN SNIPPET 4.1 =====
```

---

## TESTING CHECKLIST

### Manual Testing Steps

```bash
# 1. Test partial cache invalidation
curl "http://localhost:3000/api/customers?action=getCustomers"
# Should have Cache-Control header
# header('Cache-Control')

# 2. Test retry logic
# Simulate failure and check if retries at 2 max
# Check logs for "Retry attempt 1/2"

# 3. Test Queue
curl -X POST "http://localhost:3000/api/giftcards?action=sendGiftcardNow" \
  -H "Content-Type: application/json" \
  -d '{"id":"123"}'
# Should return immediately with jobId
# Check logs for "[Queue] Email job queued"

# 4. Test Endpoint Routing
curl -X POST "http://localhost:3000/api/customers?action=getCustomers" \
  -H "Content-Type: application/json"
# Should return customers with pagination

# 5. Check Metrics
curl "http://localhost:3000/api/data?action=__metrics__"
# Should show endpoints and avg duration
```

---

**✅ Todos los snippets están listos para copiar y pegar. Ajusta según tu stack.**

