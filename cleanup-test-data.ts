import { readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar variables de entorno
try {
    const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
} catch (e) {}

import { sql } from '@vercel/postgres';

async function cleanup() {
    console.log('Limpiando datos de prueba...\n');
    
    try {
        // Ver qué vamos a borrar
        const before = await sql`SELECT COUNT(*) as count FROM valentine_registrations`;
        console.log(`Registros antes: ${before.rows[0].count}`);
        
        // Borrar todos los registros de prueba
        const result = await sql`
            DELETE FROM valentine_registrations 
            WHERE email LIKE '%test%' OR email LIKE '%example.com'
            RETURNING id
        `;
        
        console.log(`✓ ${result.rowCount} registros eliminados`);
        
        // Ver qué quedó
        const after = await sql`SELECT COUNT(*) as count FROM valentine_registrations`;
        console.log(`Registros después: ${after.rows[0].count}`);
        
        console.log('\n✓ Base de datos limpia y lista para producción');
        
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

cleanup();
