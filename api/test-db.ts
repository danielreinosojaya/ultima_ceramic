import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const startTime = Date.now();
    
    try {
        // Check environment variables
        const envVars = Object.keys(process.env)
            .filter(key => key.includes('POSTGRES') || key.includes('DATABASE'))
            .reduce((acc, key) => {
                acc[key] = process.env[key] ? `${process.env[key].substring(0, 20)}...` : 'undefined';
                return acc;
            }, {} as Record<string, string>);

        console.log('Environment variables:', envVars);

        // Test basic connectivity
        console.log('Testing database connection...');
        const testResult = await sql`SELECT 1 as test, NOW() as timestamp`;
        
        const endTime = Date.now();
        const duration = endTime - startTime;

        res.status(200).json({
            success: true,
            duration: `${duration}ms`,
            result: testResult.rows[0],
            envVarsFound: Object.keys(envVars),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.error('Database test failed:', error);
        
        res.status(500).json({
            success: false,
            duration: `${duration}ms`,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
    }
}