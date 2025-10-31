import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Cron job para expirar pre-reservas no pagadas después de 2 horas
 * Se ejecuta periódicamente desde Vercel Crons
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validar que sea una petición autorizada (Vercel Cron)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Llamar al endpoint de expiración
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/data?action=expireOldBookings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`
      }
    });

    const result = await response.json();
    
    console.log('[CRON] Expire bookings job result:', result);
    
    return res.status(200).json({ 
      success: result.success, 
      message: result.message,
      expired: result.expired 
    });
  } catch (error) {
    console.error('[CRON] Error in expire bookings job:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}
