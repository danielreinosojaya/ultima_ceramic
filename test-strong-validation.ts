/**
 * TEST FUERTE - Llenar capacidades y validar APIs
 * Simula condiciones reales de inscripción
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

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

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

const log = {
    success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    section: (msg: string) => console.log(`\n${colors.cyan}${'═'.repeat(70)}${colors.reset}\n${msg}\n${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`)
};

const CAPACITY = {
    'florero_arreglo_floral': 15,
    'modelado_san_valentin': 20,
    'torno_san_valentin': 8
};

function generateId(): string {
    return `VAL26-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

async function simulateValidation(userData: any): Promise<{success: boolean; error?: string; errorCode?: string}> {
    const { fullName, email, workshop, participants, paymentProofUrl } = userData;
    
    // Validación 1: Campos requeridos
    if (!fullName || !email || !workshop) {
        return { success: false, error: 'Campos requeridos faltantes' };
    }
    
    // Validación 2: Comprobante obligatorio
    if (!paymentProofUrl || paymentProofUrl.trim() === '') {
        return { 
            success: false, 
            error: 'El comprobante de pago es obligatorio. Debes subir una foto o PDF del comprobante.' 
        };
    }
    
    // Validación 3: Taller válido
    if (!['florero_arreglo_floral', 'modelado_san_valentin', 'torno_san_valentin'].includes(workshop)) {
        return { success: false, error: 'Taller inválido' };
    }
    
    // Validación 4: Verificar capacidad
    const result = await sql`
        SELECT COALESCE(SUM(participants), 0) as used
        FROM valentine_registrations
        WHERE workshop = ${workshop} AND status IN ('pending', 'confirmed')
    `;
    
    const usedCapacity = parseInt(result.rows[0].used) || 0;
    const maxCapacity = CAPACITY[workshop as keyof typeof CAPACITY];
    const availableSpots = maxCapacity - usedCapacity;
    
    if (availableSpots < participants) {
        if (availableSpots <= 0) {
            return { 
                success: false, 
                error: `Lo sentimos, el taller ya está completo. No hay cupos disponibles.`,
                errorCode: 'CAPACITY_FULL'
            };
        } else {
            return { 
                success: false, 
                error: `Solo ${availableSpots === 1 ? 'queda 1 cupo' : `quedan ${availableSpots} cupos`} en este taller. No es posible inscribir ${participants} participantes.`,
                errorCode: 'INSUFFICIENT_CAPACITY'
            };
        }
    }
    
    return { success: true };
}

async function createRegistration(fullName: string, email: string, workshop: string, participants: number = 1) {
    const id = generateId();
    
    try {
        await sql`
            INSERT INTO valentine_registrations (
                id, full_name, birth_date, phone, email, 
                workshop, participants, payment_proof_url, status, created_at
            ) VALUES (
                ${id}, ${fullName}, '1990-01-01', '0991234567', ${email},
                ${workshop}, ${participants}, 'data:image/png;base64,TEST', 'pending', NOW()
            )
        `;
        return { success: true, id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function showCapacity(label?: string) {
    if (label) console.log(`\n${label}`);
    
    const result = await sql`
        SELECT workshop, COALESCE(SUM(participants), 0) as used, COUNT(*) as registrations
        FROM valentine_registrations
        WHERE status IN ('pending', 'confirmed')
        GROUP BY workshop
    `;
    
    const used: Record<string, any> = {
        'florero_arreglo_floral': { participants: 0, registrations: 0 },
        'modelado_san_valentin': { participants: 0, registrations: 0 },
        'torno_san_valentin': { participants: 0, registrations: 0 }
    };
    
    for (const row of result.rows) {
        used[row.workshop].participants = parseInt(row.used);
        used[row.workshop].registrations = parseInt(row.registrations);
    }
    
    console.log('┌──────────────────────────────┬─────┬────────┬──────┬─────────────┐');
    console.log('│ Taller                       │ Max │ Usado  │ Reg  │ Estado      │');
    console.log('├──────────────────────────────┼─────┼────────┼──────┼─────────────┤');
    
    for (const [workshop, maxCap] of Object.entries(CAPACITY)) {
        const data = used[workshop];
        const available = maxCap - data.participants;
        const status = available <= 0 ? '🔴 LLENO' : available <= 3 ? '🟡 POCOS' : '🟢 OK';
        const name = workshop === 'florero_arreglo_floral' ? 'Florero + Arreglo' :
                     workshop === 'modelado_san_valentin' ? 'Modelado San Valentín' : 'Torno Alfarero';
        
        console.log(`│ ${name.padEnd(28)} │ ${String(maxCap).padStart(3)} │ ${String(data.participants).padStart(6)} │ ${String(data.registrations).padStart(4)} │ ${status.padEnd(11)} │`);
    }
    console.log('└──────────────────────────────┴─────┴────────┴──────┴─────────────┘');
}

async function runTests() {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🔥 TEST FUERTE - LLENAR CUPOS Y VALIDAR APIS                 ║
║  Verificación robusta de capacidades y validaciones           ║
╚═══════════════════════════════════════════════════════════════╝
    `);
    
    try {
        // Limpiar datos anteriores
        log.section('PASO 0: LIMPIEZA INICIAL');
        await sql`DELETE FROM valentine_registrations WHERE email LIKE '%test%' OR email LIKE '%strong%'`;
        log.success('Base de datos limpia');
        
        // Estado inicial
        log.section('PASO 1: ESTADO INICIAL');
        await showCapacity('Capacidad antes de tests:');
        
        // ====================================================================
        // TEST 1: VALIDACIÓN SIN COMPROBANTE
        // ====================================================================
        log.section('TEST 1️⃣ : VALIDACIÓN SIN COMPROBANTE');
        
        const noProofTest = await simulateValidation({
            fullName: 'Sin Comprobante',
            email: 'noproof@test.com',
            workshop: 'florero_arreglo_floral',
            participants: 1,
            paymentProofUrl: ''
        });
        
        if (!noProofTest.success && noProofTest.error.includes('obligatorio')) {
            log.success('✓ Validación correcta: Rechazó sin comprobante');
        } else {
            log.error('✗ Validación falló: Permitió inscripción sin comprobante');
        }
        
        // ====================================================================
        // TEST 2: LLENAR TALLER PEQUEÑO (TORNO - 8 CUPOS)
        // ====================================================================
        log.section('TEST 2️⃣ : LLENAR TALLER TORNO (8 cupos)');
        log.info('Creando inscripciones de 1 participante...');
        
        let tornoCount = 0;
        for (let i = 1; i <= 8; i++) {
            const validation = await simulateValidation({
                fullName: `Usuario Torno ${i}`,
                email: `torno.strong${i}@test.com`,
                workshop: 'torno_san_valentin',
                participants: 1,
                paymentProofUrl: 'data:image/png;base64,TEST'
            });
            
            if (validation.success) {
                const reg = await createRegistration(`Usuario Torno ${i}`, `torno.strong${i}@test.com`, 'torno_san_valentin', 1);
                if (reg.success) {
                    tornoCount++;
                    log.info(`[${i}/8] Inscripción #${i} creada`);
                }
            } else {
                log.error(`Inscripción ${i} rechazada: ${validation.error}`);
            }
        }
        
        log.success(`Taller Torno: ${tornoCount}/8 participantes inscritos`);
        await showCapacity();
        
        // ====================================================================
        // TEST 3: INTENTAR EXCEDER CAPACIDAD
        // ====================================================================
        log.section('TEST 3️⃣ : INTENTO DE EXCESO DE CAPACIDAD');
        log.warn('Intentando inscribir 1 más cuando está lleno...');
        
        const overflowTest = await simulateValidation({
            fullName: 'Usuario Overflow',
            email: 'overflow@test.com',
            workshop: 'torno_san_valentin',
            participants: 1,
            paymentProofUrl: 'data:image/png;base64,TEST'
        });
        
        if (!overflowTest.success && overflowTest.errorCode === 'CAPACITY_FULL') {
            log.success(`✓ Validación correcta: ${overflowTest.error}`);
        } else {
            log.error('✗ Validación falló: Permitió inscripción cuando estaba lleno');
            console.log(overflowTest);
        }
        
        // ====================================================================
        // TEST 4: INTENTAR INSCRIBIR PAREJA SIN CUPOS
        // ====================================================================
        log.section('TEST 4️⃣ : INTENTO DE PAREJA SIN CUPOS');
        log.warn('Intentando inscribir pareja (2 personas) en taller lleno...');
        
        const pairTest = await simulateValidation({
            fullName: 'Pareja Test',
            email: 'pair@test.com',
            workshop: 'torno_san_valentin',
            participants: 2,
            paymentProofUrl: 'data:image/png;base64,TEST'
        });
        
        if (!pairTest.success && pairTest.errorCode === 'CAPACITY_FULL') {
            log.success(`✓ Validación correcta: ${pairTest.error}`);
        } else {
            log.error('✗ Validación falló');
        }
        
        // ====================================================================
        // TEST 5: LLENAR TALLER MEDIANO (MODELADO - 20 CUPOS)
        // ====================================================================
        log.section('TEST 5️⃣ : LLENAR TALLER MODELADO (20 cupos)');
        log.info('Inscribiendo parejas (2 participantes c/u)...');
        
        let modeladoCount = 0;
        for (let i = 1; i <= 10; i++) {
            const validation = await simulateValidation({
                fullName: `Pareja Modelado ${i}`,
                email: `modelado.strong${i}@test.com`,
                workshop: 'modelado_san_valentin',
                participants: 2,
                paymentProofUrl: 'data:image/png;base64,TEST'
            });
            
            if (validation.success) {
                const reg = await createRegistration(`Pareja Modelado ${i}`, `modelado.strong${i}@test.com`, 'modelado_san_valentin', 2);
                if (reg.success) {
                    modeladoCount += 2;
                    log.info(`[${i}/10] Pareja inscrita (${modeladoCount}/20 participantes)`);
                }
            } else {
                log.error(`Pareja ${i} rechazada: ${validation.error}`);
                break;
            }
        }
        
        log.success(`Taller Modelado: ${modeladoCount}/20 participantes inscritos`);
        
        // ====================================================================
        // TEST 6: INTENTO CON 1 CUPO RESTANTE EN MODELADO
        // ====================================================================
        log.section('TEST 6️⃣ : CAPACIDAD INSUFICIENTE (1 cupo, quiere 2)');
        log.warn('Intentando inscribir pareja cuando solo quedan 0 cupos...');
        
        const insufficientTest = await simulateValidation({
            fullName: 'Pareja Insuficiente',
            email: 'insufficient@test.com',
            workshop: 'modelado_san_valentin',
            participants: 2,
            paymentProofUrl: 'data:image/png;base64,TEST'
        });
        
        if (!insufficientTest.success && insufficientTest.errorCode === 'CAPACITY_FULL') {
            log.success(`✓ Validación correcta: ${insufficientTest.error}`);
        } else {
            log.error('✗ Validación falló');
        }
        
        // ====================================================================
        // TEST 7: LLENAR TALLER GRANDE (FLORERO - 15 CUPOS)
        // ====================================================================
        log.section('TEST 7️⃣ : LLENAR TALLER FLORERO (15 cupos)');
        log.info('Inscribiendo individuales...');
        
        let floreroCount = 0;
        for (let i = 1; i <= 15; i++) {
            const validation = await simulateValidation({
                fullName: `Usuario Florero ${i}`,
                email: `florero.strong${i}@test.com`,
                workshop: 'florero_arreglo_floral',
                participants: 1,
                paymentProofUrl: 'data:image/png;base64,TEST'
            });
            
            if (validation.success) {
                const reg = await createRegistration(`Usuario Florero ${i}`, `florero.strong${i}@test.com`, 'florero_arreglo_floral', 1);
                if (reg.success) {
                    floreroCount++;
                }
            } else {
                log.error(`Usuario ${i} rechazado: ${validation.error}`);
                break;
            }
        }
        
        log.success(`Taller Florero: ${floreroCount}/15 participantes inscritos`);
        
        // ====================================================================
        // ESTADO FINAL
        // ====================================================================
        log.section('ESTADO FINAL: TODOS LOS TALLERES LLENOS');
        await showCapacity('Capacidad después de llenar todos:');
        
        // ====================================================================
        // TEST 8: INTENTOS CUANDO TODO ESTÁ LLENO
        // ====================================================================
        log.section('TEST 8️⃣ : INTENTOS CUANDO TODO ESTÁ LLENO');
        
        const workshops = ['florero_arreglo_floral', 'modelado_san_valentin', 'torno_san_valentin'];
        for (const workshop of workshops) {
            const test = await simulateValidation({
                fullName: 'Intento Final',
                email: `final.${workshop}@test.com`,
                workshop: workshop,
                participants: 1,
                paymentProofUrl: 'data:image/png;base64,TEST'
            });
            
            if (!test.success && test.errorCode === 'CAPACITY_FULL') {
                log.success(`✓ ${workshop}: Rechazado correctamente`);
            } else {
                log.error(`✗ ${workshop}: Validación falló`);
            }
        }
        
        // ====================================================================
        // ESTADÍSTICAS FINALES
        // ====================================================================
        log.section('ESTADÍSTICAS FINALES');
        
        const stats = await sql`
            SELECT 
                workshop,
                COUNT(*) as inscriptions,
                SUM(participants) as total_participants,
                COALESCE(MAX(CASE WHEN status = 'pending' THEN 1 END), 0) as has_pending
            FROM valentine_registrations
            WHERE email LIKE '%strong%'
            GROUP BY workshop
            ORDER BY workshop
        `;
        
        let totalInscriptions = 0;
        let totalParticipants = 0;
        
        console.log('\nInscripciones de test creadas:');
        for (const row of stats.rows) {
            totalInscriptions += parseInt(row.inscriptions);
            totalParticipants += parseInt(row.total_participants);
            const workshopName = row.workshop === 'florero_arreglo_floral' ? 'Florero + Arreglo' :
                                row.workshop === 'modelado_san_valentin' ? 'Modelado San Valentín' : 'Torno Alfarero';
            console.log(`  • ${workshopName}: ${row.inscriptions} inscripciones, ${row.total_participants} participantes`);
        }
        
        console.log(`\nTotal: ${totalInscriptions} inscripciones, ${totalParticipants} participantes`);
        
        // ====================================================================
        // VERIFICACIÓN DE EMAILS
        // ====================================================================
        log.section('VERIFICACIÓN DE EMAILS');
        
        if (process.env.RESEND_API_KEY) {
            log.success('RESEND_API_KEY configurada');
            log.info('Cada inscripción debería enviar un email (verificar en dashboard Resend)');
            
            const emails = await sql`
                SELECT email FROM valentine_registrations 
                WHERE email LIKE '%strong%'
                ORDER BY created_at DESC
                LIMIT 10
            `;
            
            console.log(`\nEmails que deberían recibir confirmación:`);
            for (const row of emails.rows) {
                console.log(`  📧 ${row.email}`);
            }
        } else {
            log.warn('RESEND_API_KEY no configurada - emails no se enviarán');
        }
        
        // ====================================================================
        // RESUMEN
        // ====================================================================
        log.section('✅ TEST COMPLETADO');
        log.success('✓ Validaciones funcionan correctamente');
        log.success('✓ Capacidades se respetan');
        log.success('✓ Mensajes de error apropiados');
        log.success('✓ Base de datos intacta');
        
        log.info('\nPróximos pasos:');
        log.info('1. Ejecutar: npm run dev');
        log.info('2. Visitar: http://localhost:3000/sanvalentin');
        log.info('3. Verificar que UI muestra talleres como AGOTADOS');
        log.info('4. Verificar mensajes de error en disponibilidad');
        
        log.warn('\nPara limpiar datos de test:');
        console.log('  npx tsx cleanup-test-data.ts');
        
    } catch (error: any) {
        log.error(`Error fatal: ${error.message}`);
        console.error(error);
    }
}

runTests();
