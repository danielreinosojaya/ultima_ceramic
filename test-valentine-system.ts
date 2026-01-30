/**
 * Script de Testing Completo - Sistema San Valentín 2026
 * Prueba: APIs, validaciones de capacidad, y envío de emails
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
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
} catch (e) {
    console.warn('No se pudo cargar .env.local');
}

import { sql } from '@vercel/postgres';

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    section: (msg: string) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}\n`)
};

// Helper para simular delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Datos de prueba
const testUsers = [
    { name: 'María García', email: 'maria.test@example.com', phone: '0991234567', birthDate: '1995-05-15' },
    { name: 'Juan Pérez', email: 'juan.test@example.com', phone: '0992345678', birthDate: '1990-08-20' },
    { name: 'Ana López', email: 'ana.test@example.com', phone: '0993456789', birthDate: '1988-12-10' },
    { name: 'Carlos Ruiz', email: 'carlos.test@example.com', phone: '0994567890', birthDate: '1992-03-25' },
];

async function testDatabaseConnection() {
    log.section('1. VERIFICANDO CONEXIÓN A BASE DE DATOS');
    try {
        const result = await sql`SELECT NOW()`;
        log.success(`Conexión exitosa a base de datos`);
        log.info(`Timestamp: ${result.rows[0].now}`);
        return true;
    } catch (error) {
        log.error(`Error de conexión: ${error}`);
        return false;
    }
}

async function testTableExists() {
    log.section('2. VERIFICANDO TABLA valentine_registrations');
    try {
        const result = await sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'valentine_registrations'
            );
        `;
        
        if (result.rows[0].exists) {
            log.success('Tabla valentine_registrations existe');
            
            // Contar registros actuales
            const count = await sql`SELECT COUNT(*) FROM valentine_registrations`;
            log.info(`Registros actuales: ${count.rows[0].count}`);
            
            return true;
        } else {
            log.error('Tabla valentine_registrations NO existe');
            log.warn('Ejecuta el siguiente SQL para crearla:');
            console.log(`
CREATE TABLE valentine_registrations (
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
            `);
            return false;
        }
    } catch (error) {
        log.error(`Error verificando tabla: ${error}`);
        return false;
    }
}

async function getCurrentCapacity() {
    log.section('3. VERIFICANDO CAPACIDAD ACTUAL');
    try {
        const result = await sql`
            SELECT 
                workshop,
                COALESCE(SUM(participants), 0) as used_capacity,
                COUNT(*) as registration_count
            FROM valentine_registrations
            WHERE status IN ('pending', 'confirmed')
            GROUP BY workshop
        `;
        
        const capacities = {
            'florero_arreglo_floral': { max: 15, used: 0, registrations: 0 },
            'modelado_san_valentin': { max: 20, used: 0, registrations: 0 },
            'torno_san_valentin': { max: 8, used: 0, registrations: 0 }
        };
        
        for (const row of result.rows) {
            if (capacities[row.workshop]) {
                capacities[row.workshop].used = parseInt(row.used_capacity);
                capacities[row.workshop].registrations = parseInt(row.registration_count);
            }
        }
        
        console.log('\nCapacidades por taller:');
        console.log('┌────────────────────────────────────┬──────┬──────┬──────────────┬───────────┐');
        console.log('│ Taller                             │ Máx  │ Usado│ Disponible   │ Inscripc. │');
        console.log('├────────────────────────────────────┼──────┼──────┼──────────────┼───────────┤');
        
        for (const [workshop, data] of Object.entries(capacities)) {
            const available = data.max - data.used;
            const workshopName = workshop === 'florero_arreglo_floral' ? 'Florero + Arreglo' :
                                workshop === 'modelado_san_valentin' ? 'Modelado San Valentín' : 
                                'Torno Alfarero';
            const status = available === 0 ? '🔴 LLENO' : available <= 3 ? '🟡 POCOS' : '🟢 OK';
            console.log(`│ ${workshopName.padEnd(34)} │ ${String(data.max).padStart(4)} │ ${String(data.used).padStart(4)} │ ${String(available).padStart(4)} ${status.padEnd(6)} │ ${String(data.registrations).padStart(9)} │`);
        }
        console.log('└────────────────────────────────────┴──────┴──────┴──────────────┴───────────┘\n');
        
        return capacities;
    } catch (error) {
        log.error(`Error obteniendo capacidad: ${error}`);
        return null;
    }
}

async function testAPIAvailability() {
    log.section('4. PROBANDO ENDPOINT /api/valentine?action=availability');
    try {
        const response = await fetch('http://localhost:3000/api/valentine?action=availability');
        const data = await response.json();
        
        if (data.success) {
            log.success('Endpoint availability responde correctamente');
            console.log(JSON.stringify(data.data, null, 2));
            return true;
        } else {
            log.error('Endpoint retornó error');
            return false;
        }
    } catch (error) {
        log.warn('No se pudo conectar al servidor local. Asegúrate de ejecutar: npm run dev');
        return false;
    }
}

async function createTestRegistration(userData: any, workshop: string, participants: 1 | 2) {
    const registrationData = {
        fullName: userData.name,
        birthDate: userData.birthDate,
        phone: userData.phone,
        email: userData.email,
        workshop: workshop,
        participants: participants,
        paymentProofUrl: `data:image/png;base64,TEST_IMAGE_${Date.now()}`
    };
    
    try {
        const response = await fetch('http://localhost:3000/api/valentine?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        return { success: false, error: `Error de conexión: ${error}` };
    }
}

async function testRegistrationFlow() {
    log.section('5. PROBANDO FLUJO DE INSCRIPCIÓN');
    
    // Test 1: Inscripción válida
    log.info('Test 1: Inscripción válida (Taller Florero, 1 participante)');
    const result1 = await createTestRegistration(testUsers[0], 'florero_arreglo_floral', 1);
    
    if (result1.success) {
        log.success(`Inscripción creada: ${result1.data.id}`);
        log.info(`Email debería enviarse a: ${testUsers[0].email}`);
    } else {
        log.error(`Fallo: ${result1.error}`);
    }
    
    await delay(1000);
    
    // Test 2: Inscripción pareja
    log.info('Test 2: Inscripción pareja (Taller Modelado, 2 participantes)');
    const result2 = await createTestRegistration(testUsers[1], 'modelado_san_valentin', 2);
    
    if (result2.success) {
        log.success(`Inscripción pareja creada: ${result2.data.id}`);
    } else {
        log.error(`Fallo: ${result2.error}`);
    }
    
    await delay(1000);
    
    // Test 3: Sin comprobante (debe fallar)
    log.info('Test 3: Inscripción SIN comprobante (debe fallar)');
    try {
        const response = await fetch('http://localhost:3000/api/valentine?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: testUsers[2].name,
                birthDate: testUsers[2].birthDate,
                phone: testUsers[2].phone,
                email: testUsers[2].email,
                workshop: 'torno_san_valentin',
                participants: 1,
                paymentProofUrl: '' // SIN COMPROBANTE
            })
        });
        
        const result3 = await response.json();
        
        if (!result3.success && result3.error.includes('obligatorio')) {
            log.success('✓ Validación funcionó: rechazó inscripción sin comprobante');
        } else {
            log.error('✗ Validación falló: permitió inscripción sin comprobante');
        }
    } catch (error) {
        log.error(`Error en test: ${error}`);
    }
    
    await delay(1000);
}

async function testCapacityValidation() {
    log.section('6. PROBANDO VALIDACIÓN DE CAPACIDAD');
    
    // Obtener capacidad actual del taller de torno (8 cupos)
    const capacities = await getCurrentCapacity();
    if (!capacities) return;
    
    const tornoCapacity = capacities['torno_san_valentin'];
    const available = tornoCapacity.max - tornoCapacity.used;
    
    log.info(`Taller Torno tiene ${available} cupos disponibles de ${tornoCapacity.max}`);
    
    if (available > 0) {
        log.info('Llenando cupos hasta agotar...');
        
        // Llenar hasta dejar solo 1 cupo
        let inscribed = 0;
        while (inscribed < available - 1) {
            const result = await createTestRegistration(
                { ...testUsers[0], email: `test${Date.now()}@example.com` },
                'torno_san_valentin',
                1
            );
            
            if (result.success) {
                inscribed++;
                log.info(`Inscripción ${inscribed} creada`);
            } else {
                log.error(`Fallo al crear inscripción: ${result.error}`);
                break;
            }
            
            await delay(500);
        }
        
        // Ahora probar inscribir 2 personas cuando solo queda 1 cupo
        log.info('\nProbando inscribir 2 personas cuando solo queda 1 cupo (debe fallar)...');
        const resultOverflow = await createTestRegistration(
            { ...testUsers[3], email: `overflow${Date.now()}@example.com` },
            'torno_san_valentin',
            2
        );
        
        if (!resultOverflow.success && resultOverflow.errorCode === 'INSUFFICIENT_CAPACITY') {
            log.success('✓ Validación funcionó: rechazó inscripción por capacidad insuficiente');
            log.info(`Mensaje: ${resultOverflow.error}`);
        } else {
            log.error('✗ Validación falló: permitió inscripción cuando no había cupos suficientes');
        }
    } else {
        log.warn('El taller de torno ya está lleno. Limpia la tabla para probar validaciones.');
    }
}

async function testEmailSending() {
    log.section('7. VERIFICANDO ENVÍO DE EMAILS');
    
    log.info('Revisando configuración de email service...');
    
    try {
        // Verificar que existe la clave de API de Resend
        const hasResendKey = process.env.RESEND_API_KEY;
        
        if (hasResendKey) {
            log.success('RESEND_API_KEY configurada');
            log.info('Los emails deberían enviarse a través de Resend');
        } else {
            log.warn('RESEND_API_KEY no encontrada en variables de entorno');
            log.warn('Los emails NO se enviarán. Configura la clave en Vercel.');
        }
        
        // Verificar registros recientes para ver si se enviaron emails
        const recent = await sql`
            SELECT id, full_name, email, workshop, created_at, status
            FROM valentine_registrations
            ORDER BY created_at DESC
            LIMIT 5
        `;
        
        console.log('\nÚltimas 5 inscripciones (emails enviados a estas direcciones):');
        for (const reg of recent.rows) {
            console.log(`  • ${reg.full_name} (${reg.email}) - ${reg.workshop} - ${reg.status}`);
        }
        
    } catch (error) {
        log.error(`Error verificando emails: ${error}`);
    }
}

async function cleanupTestData() {
    log.section('8. LIMPIEZA (OPCIONAL)');
    
    log.warn('Para limpiar datos de prueba, ejecuta:');
    console.log(`
DELETE FROM valentine_registrations 
WHERE email LIKE '%test%' OR email LIKE '%example.com';
    `);
}

async function runTests() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║   SISTEMA DE TESTING - SAN VALENTÍN 2026                   ║
║   Verificación completa de APIs y validaciones             ║
╚════════════════════════════════════════════════════════════╝
    `);
    
    // Ejecutar todos los tests
    const dbOk = await testDatabaseConnection();
    if (!dbOk) {
        log.error('No se pudo conectar a la base de datos. Verifica las credenciales.');
        return;
    }
    
    const tableOk = await testTableExists();
    if (!tableOk) {
        log.error('La tabla no existe. Créala primero.');
        return;
    }
    
    await getCurrentCapacity();
    
    const apiOk = await testAPIAvailability();
    if (!apiOk) {
        log.warn('Iniciando servidor con: npm run dev (en otra terminal)');
        log.info('Continuando con tests de base de datos...');
    }
    
    if (apiOk) {
        await testRegistrationFlow();
        await testCapacityValidation();
    }
    
    await testEmailSending();
    await cleanupTestData();
    
    log.section('RESUMEN');
    log.info('Tests completados. Revisa los resultados arriba.');
    log.info('Para ver inscripciones en admin: http://localhost:3000 → Login → Tab "San Valentín"');
}

// Ejecutar
runTests().catch(console.error);
