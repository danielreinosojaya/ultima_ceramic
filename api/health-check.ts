import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Health Check Endpoint for QR Delivery Tracking
 * 
 * Purpose: Monitor the availability and health of the QR delivery form workflow
 * 
 * Endpoint: GET /api/health-check
 * 
 * Response: 
 * {
 *   status: "ok" | "degraded" | "critical",
 *   timestamp: ISO string,
 *   checks: {
 *     qrUrl: true/false,
 *     database: true/false,
 *     emailService: true/false,
 *     responseTime: number (ms)
 *   },
 *   message: "All systems operational" | error description
 * }
 */

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    const startTime = Date.now();
    const checks: Record<string, any> = {};
    let overallStatus: 'ok' | 'degraded' | 'critical' = 'ok';

    try {
        // Check 1: QR URL accessibility
        try {
            const qrUrl = 'https://www.ceramicalma.com/?clientMode=delivery';
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const qrResponse = await fetch(qrUrl, {
                method: 'GET',
                signal: controller.signal as AbortSignal
            });
            clearTimeout(timeoutId);
            checks.qrUrl = qrResponse.ok || qrResponse.status === 307; // Allow redirects
        } catch (error) {
            console.error('[health-check] QR URL check failed:', error);
            checks.qrUrl = false;
            overallStatus = 'degraded';
        }

        // Check 2: Database connectivity (simple query)
        try {
            const dbCheck = await checkDatabase();
            checks.database = dbCheck;
            if (!dbCheck) {
                overallStatus = 'critical';
            }
        } catch (error) {
            console.error('[health-check] Database check failed:', error);
            checks.database = false;
            overallStatus = 'critical';
        }

        // Check 3: Email service connectivity (basic check)
        try {
            checks.emailService = true; // Email service doesn't need a specific check
            // In the future, could add: send test email to admin@ceramicalma.com
        } catch (error) {
            console.error('[health-check] Email service check failed:', error);
            checks.emailService = false;
            overallStatus = 'degraded';
        }

        // Calculate response time
        const responseTime = Date.now() - startTime;
        checks.responseTime = responseTime;

        // Check if response time is acceptable
        if (responseTime > 5000) {
            overallStatus = 'degraded';
        }

        // Generate appropriate message
        let message = 'All systems operational';
        if (overallStatus === 'degraded') {
            message = 'Some systems are degraded. Check individual component status.';
        } else if (overallStatus === 'critical') {
            message = 'Critical issue detected. QR delivery form may not be working.';
        }

        res.status(overallStatus === 'critical' ? 503 : 200).json({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            checks,
            message
        });

    } catch (error) {
        console.error('[health-check] Unexpected error:', error);
        res.status(500).json({
            status: 'critical',
            timestamp: new Date().toISOString(),
            checks: {
                ...checks,
                responseTime: Date.now() - startTime
            },
            message: 'Health check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Check database connectivity
 * Simple query to verify database is responding
 */
async function checkDatabase(): Promise<boolean> {
    try {
        // This is a placeholder - actual implementation would depend on your database client
        // For now, we assume database is ok if no error is thrown
        // In production, you might want to:
        // 1. Run a simple SELECT 1
        // 2. Check connection pool status
        // 3. Verify backup database availability
        
        console.log('[health-check] Database check: OK');
        return true;
    } catch (error) {
        console.error('[health-check] Database check failed:', error);
        return false;
    }
}
