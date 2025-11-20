/**
 * Rate Limiter Middleware para Vercel Serverless
 * 
 * Implementa límites por IP y por email para prevenir abuso
 * - 5 requests/minuto por IP (general)
 * - 10 requests/día por email (giftcards)
 * - Almacenamiento en memoria con cleanup automático
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
    requests: number[];
}

interface DailyLimitEntry {
    count: number;
    date: string;
}

// Storage en memoria (en producción usar Redis)
const ipLimits = new Map<string, RateLimitEntry>();
const emailLimits = new Map<string, DailyLimitEntry>();

// Cleanup cada 5 minutos
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_MINUTE = 5;
const MAX_REQUESTS_PER_DAY = 10;

// Iniciar cleanup automático
if (typeof global !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        
        // Limpiar límites por IP expirados
        for (const [ip, entry] of ipLimits.entries()) {
            if (now > entry.resetTime) {
                ipLimits.delete(ip);
            }
        }
        
        // Limpiar límites por email de días anteriores
        const today = new Date().toISOString().split('T')[0];
        for (const [email, entry] of emailLimits.entries()) {
            if (entry.date !== today) {
                emailLimits.delete(email);
            }
        }
    }, CLEANUP_INTERVAL);
}

/**
 * Extrae IP del cliente desde Vercel headers
 */
export function getClientIp(req: any): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // Puede ser "ip1, ip2, ip3" - tomamos la primera (cliente real)
        return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || 
           req.socket?.remoteAddress ||
           '127.0.0.1';
}

/**
 * Verifica límite por IP (5 req/minuto general)
 */
export function checkIpRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    let entry = ipLimits.get(ip);
    
    // Si no existe o expiró, crear nueva entrada
    if (!entry || now > entry.resetTime) {
        entry = {
            count: 0,
            resetTime: now + RATE_LIMIT_WINDOW,
            requests: []
        };
        ipLimits.set(ip, entry);
    }
    
    // Limpiar requests antiguos
    entry.requests = entry.requests.filter(t => now - t < RATE_LIMIT_WINDOW);
    
    const resetIn = entry.resetTime - now;
    const allowed = entry.requests.length < MAX_REQUESTS_PER_MINUTE;
    
    if (allowed) {
        entry.requests.push(now);
        entry.count = entry.requests.length;
    }
    
    return {
        allowed,
        remaining: Math.max(0, MAX_REQUESTS_PER_MINUTE - entry.requests.length),
        resetIn: Math.ceil(resetIn / 1000) // segundos
    };
}

/**
 * Verifica límite por email (10 req/día para giftcards)
 */
export function checkEmailRateLimit(email: string): { allowed: boolean; remaining: number; resetsAt: string } {
    const today = new Date().toISOString().split('T')[0];
    let entry = emailLimits.get(email);
    
    // Si no existe o es de otro día, crear nueva entrada
    if (!entry || entry.date !== today) {
        entry = {
            count: 0,
            date: today
        };
        emailLimits.set(email, entry);
    }
    
    const allowed = entry.count < MAX_REQUESTS_PER_DAY;
    
    if (allowed) {
        entry.count++;
    }
    
    // Reseta mañana a las 00:00 UTC
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    
    return {
        allowed,
        remaining: Math.max(0, MAX_REQUESTS_PER_DAY - entry.count),
        resetsAt: tomorrow.toISOString()
    };
}

/**
 * Middleware para verificar rate limit
 */
export function checkRateLimit(req: any, res: any, limitType: 'ip' | 'email', emailValue?: string) {
    const ip = getClientIp(req);
    
    // Siempre verificar límite por IP (general)
    const ipLimit = checkIpRateLimit(ip);
    
    // Agregar headers
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_MINUTE.toString());
    res.setHeader('X-RateLimit-Remaining', ipLimit.remaining.toString());
    res.setHeader('X-RateLimit-Reset', (Math.floor(Date.now() / 1000) + ipLimit.resetIn).toString());
    
    if (!ipLimit.allowed) {
        res.status(429).json({
            success: false,
            error: 'rate_limit_exceeded',
            message: `Demasiadas solicitudes. Máximo ${MAX_REQUESTS_PER_MINUTE} por minuto.`,
            retryAfter: ipLimit.resetIn
        });
        return false;
    }
    
    // Si es giftcard, verificar límite por email
    if (limitType === 'email' && emailValue) {
        const emailLimit = checkEmailRateLimit(emailValue);
        
        res.setHeader('X-RateLimit-Daily-Limit', MAX_REQUESTS_PER_DAY.toString());
        res.setHeader('X-RateLimit-Daily-Remaining', emailLimit.remaining.toString());
        res.setHeader('X-RateLimit-Daily-Reset', emailLimit.resetsAt);
        
        if (!emailLimit.allowed) {
            res.status(429).json({
                success: false,
                error: 'daily_rate_limit_exceeded',
                message: `Límite diario de ${MAX_REQUESTS_PER_DAY} solicitudes alcanzado. Intenta mañana.`,
                resetsAt: emailLimit.resetsAt
            });
            return false;
        }
    }
    
    return true;
}

/**
 * Reset de límites (solo para testing/admin)
 */
export function resetRateLimits() {
    ipLimits.clear();
    emailLimits.clear();
}

/**
 * Obtiene estadísticas de rate limiting (para debugging)
 */
export function getRateLimitStats() {
    return {
        activeIPs: ipLimits.size,
        activeEmails: emailLimits.size,
        ips: Array.from(ipLimits.entries()).map(([ip, entry]) => ({
            ip,
            requests: entry.count,
            resetIn: entry.resetTime - Date.now()
        })),
        emails: Array.from(emailLimits.entries()).map(([email, entry]) => ({
            email: email.substring(0, 5) + '***', // Ocultar email
            requests: entry.count,
            date: entry.date
        }))
    };
}
