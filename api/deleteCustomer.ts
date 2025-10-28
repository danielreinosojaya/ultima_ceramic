import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deleteCustomerByEmail } from '../lib/database.js';

/**
 * Vercel Serverless Function to delete a customer and all related data.
 * 
 * @param req - The Vercel request object
 * @param res - The Vercel response object
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow DELETE method
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('[DELETE CUSTOMER] Request body:', req.body);
    const { customerEmail } = req.body;
    console.log('[DELETE CUSTOMER] Extracted customerEmail:', customerEmail, 'Type:', typeof customerEmail);

    // Validate customerEmail
    if (!customerEmail || typeof customerEmail !== 'string') {
        console.log('[DELETE CUSTOMER] Validation failed - customerEmail:', customerEmail);
        return res.status(400).json({ 
            error: 'Missing or invalid customer email',
            received: { customerEmail, type: typeof customerEmail }
        });
    }

    try {
        const result = await deleteCustomerByEmail(customerEmail);
        
        if (result) {
            return res.status(200).json({ 
                message: 'Customer and related data deleted successfully',
                customerEmail 
            });
        } else {
            return res.status(404).json({ error: 'Customer not found or no data to delete' });
        }
    } catch (error) {
        console.error('[DELETE CUSTOMER] Error:', error);
        return res.status(500).json({ 
            error: 'Failed to delete customer',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}