import { sql } from '@vercel/postgres';

async function createTable() {
    try {
        console.log('Creando tabla valentine_registrations...');
        
        await sql`
            CREATE TABLE IF NOT EXISTS valentine_registrations (
                id VARCHAR(50) PRIMARY KEY,
                full_name VARCHAR(200) NOT NULL,
                birth_date DATE NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(200) NOT NULL,
                workshop VARCHAR(50) NOT NULL,
                participants INTEGER NOT NULL DEFAULT 1,
                payment_proof_url TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `;
        
        console.log('✓ Tabla valentine_registrations creada exitosamente');
        
        // Crear índices
        console.log('Creando índices...');
        await sql`CREATE INDEX IF NOT EXISTS idx_valentine_workshop ON valentine_registrations(workshop)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_valentine_status ON valentine_registrations(status)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_valentine_created ON valentine_registrations(created_at DESC)`;
        
        console.log('✓ Índices creados');
        
        // Verificar
        const result = await sql`SELECT COUNT(*) FROM valentine_registrations`;
        console.log(`✓ Tabla verificada. Registros actuales: ${result.rows[0].count}`);
        
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

createTable();
