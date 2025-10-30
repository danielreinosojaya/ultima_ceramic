import { VercelRequest, VercelResponse } from '@vercel/node';
import * as emailService from './emailService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Solo permitir en desarrollo o con key secreta
    const authKey = req.query.key as string;
    const isDev = process.env.NODE_ENV === 'development';
    const validKey = process.env.ADMIN_SECRET_KEY || 'change-me-in-production';
    
    if (!isDev && authKey !== validKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Check email configuration
    const config = emailService.isEmailServiceConfigured();
    
    const diagnostics = {
        timestamp: new Date().toISOString(),
        emailServiceConfigured: config.configured,
        configReason: config.reason,
        env: {
            hasResendApiKey: !!process.env.RESEND_API_KEY,
            resendApiKeyLength: process.env.RESEND_API_KEY?.length || 0,
            emailFrom: process.env.EMAIL_FROM || process.env.EMAIL_FROM_ADDRESS || 'not-set',
            nodeEnv: process.env.NODE_ENV,
        }
    };
    
    // If test email requested
    if (req.query.send === 'true' && req.query.to) {
        try {
            const testEmail = req.query.to as string;
            console.log('[test-email] Attempting to send test email to:', testEmail);
            
            const result = await emailService.sendDeliveryCreatedEmail(
                testEmail,
                'Usuario de Prueba',
                {
                    description: '3 Tazas 1 Florero (TEST)',
                    scheduledDate: '2025-11-08'
                }
            );
            
            return res.status(200).json({
                ...diagnostics,
                testEmailSent: true,
                testEmailTo: testEmail,
                sendResult: result
            });
        } catch (error) {
            return res.status(500).json({
                ...diagnostics,
                testEmailSent: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    
    // Just return diagnostics
    return res.status(200).json(diagnostics);
}
