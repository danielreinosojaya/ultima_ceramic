/**
 * Test HTTP del Endpoint /api/valentine
 * Requiere servidor corriendo en localhost:3000
 */

// Colores
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
    section: (msg: string) => console.log(`\n${colors.cyan}${'━'.repeat(70)}${colors.reset}\n${msg}\n${colors.cyan}${'━'.repeat(70)}${colors.reset}\n`)
};

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEndpoint() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║   TEST HTTP - ENDPOINT /api/valentine                      ║
║   Validando APIs en tiempo real                            ║
╚════════════════════════════════════════════════════════════╝
    `);
    
    // 1. Test de disponibilidad
    log.section('1️⃣  TEST: GET /api/valentine?action=availability');
    
    try {
        const response = await fetch('http://localhost:3000/api/valentine?action=availability');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
            log.success('Endpoint availability responde correctamente');
            console.log(JSON.stringify(data.data, null, 2));
            
            // Verificar estructura
            const firstWorkshop = data.data[0];
            if (firstWorkshop.workshop && firstWorkshop.maxCapacity !== undefined && 
                firstWorkshop.usedCapacity !== undefined && firstWorkshop.availableSpots !== undefined) {
                log.success('Estructura de datos correcta');
            } else {
                log.error('Estructura de datos incorrecta');
            }
        } else {
            log.error('Respuesta inválida');
            console.log(data);
        }
    } catch (error: any) {
        log.error(`Error de conexión: ${error.message}`);
        log.info('Asegúrate de ejecutar: npm run dev');
        return;
    }
    
    await delay(500);
    
    // 2. Test inscripción válida
    log.section('2️⃣  TEST: POST /api/valentine?action=register (VÁLIDO)');
    
    try {
        const response = await fetch('http://localhost:3000/api/valentine?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Test Cliente HTTP',
                birthDate: '1995-05-15',
                phone: '0991234567',
                email: `test.http.${Date.now()}@example.com`,
                workshop: 'modelado_san_valentin',
                participants: 1,
                paymentProofUrl: 'data:image/png;base64,TEST_IMAGE_HTTP'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            log.success(`Inscripción creada: ${data.data.id}`);
            log.info('Email debería haberse enviado');
        } else {
            if (data.errorCode === 'CAPACITY_FULL' || data.errorCode === 'INSUFFICIENT_CAPACITY') {
                log.warn(`Taller lleno: ${data.error}`);
            } else {
                log.error(`Error: ${data.error}`);
            }
        }
    } catch (error: any) {
        log.error(`Error: ${error.message}`);
    }
    
    await delay(500);
    
    // 3. Test sin comprobante (debe fallar)
    log.section('3️⃣  TEST: POST sin comprobante (DEBE FALLAR)');
    
    try {
        const response = await fetch('http://localhost:3000/api/valentine?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Test Sin Comprobante',
                birthDate: '1995-05-15',
                phone: '0991234567',
                email: `no.proof.${Date.now()}@example.com`,
                workshop: 'modelado_san_valentin',
                participants: 1,
                paymentProofUrl: '' // SIN COMPROBANTE
            })
        });
        
        const data = await response.json();
        
        if (!data.success && data.error.toLowerCase().includes('obligatorio')) {
            log.success('✓ VALIDACIÓN CORRECTA: Rechazó inscripción sin comprobante');
            log.info(`Mensaje: ${data.error}`);
        } else {
            log.error('✗ VALIDACIÓN FALLÓ: Permitió inscripción sin comprobante');
        }
    } catch (error: any) {
        log.error(`Error: ${error.message}`);
    }
    
    await delay(500);
    
    // 4. Test taller inválido
    log.section('4️⃣  TEST: POST con taller inválido (DEBE FALLAR)');
    
    try {
        const response = await fetch('http://localhost:3000/api/valentine?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Test Taller Inválido',
                birthDate: '1995-05-15',
                phone: '0991234567',
                email: `invalid.workshop.${Date.now()}@example.com`,
                workshop: 'taller_inexistente',
                participants: 1,
                paymentProofUrl: 'data:image/png;base64,TEST'
            })
        });
        
        const data = await response.json();
        
        if (!data.success && data.error.toLowerCase().includes('inválido')) {
            log.success('✓ VALIDACIÓN CORRECTA: Rechazó taller inválido');
            log.info(`Mensaje: ${data.error}`);
        } else {
            log.error('✗ VALIDACIÓN FALLÓ: Aceptó taller inválido');
        }
    } catch (error: any) {
        log.error(`Error: ${error.message}`);
    }
    
    await delay(500);
    
    // 5. Test de estadísticas
    log.section('5️⃣  TEST: GET /api/valentine?action=stats');
    
    try {
        const response = await fetch('http://localhost:3000/api/valentine?action=stats');
        const data = await response.json();
        
        if (data.success) {
            log.success('Endpoint stats responde correctamente');
            console.log('\nEstadísticas:');
            console.log(`  Total inscripciones: ${data.data.total}`);
            console.log(`  Total participantes: ${data.data.totalParticipants}`);
            console.log(`\n  Por taller:`);
            for (const workshop of data.data.byWorkshop) {
                console.log(`    ${workshop.workshop}: ${workshop.count} inscripciones, ${workshop.participants} participantes`);
            }
            console.log(`\n  Por estado:`);
            for (const status of data.data.byStatus) {
                console.log(`    ${status.status}: ${status.count}`);
            }
        } else {
            log.error('Error obteniendo estadísticas');
            console.log(data);
        }
    } catch (error: any) {
        log.error(`Error: ${error.message}`);
    }
    
    await delay(500);
    
    // 6. Test de listado
    log.section('6️⃣  TEST: GET /api/valentine?action=list');
    
    try {
        const response = await fetch('http://localhost:3000/api/valentine?action=list&limit=5');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
            log.success(`Endpoint list responde correctamente (${data.data.length} registros)`);
            
            if (data.data.length > 0) {
                console.log('\nÚltimas inscripciones:');
                for (const reg of data.data.slice(0, 3)) {
                    console.log(`  • ${reg.fullName} - ${reg.workshop} - ${reg.status}`);
                }
            }
        } else {
            log.error('Error obteniendo listado');
            console.log(data);
        }
    } catch (error: any) {
        log.error(`Error: ${error.message}`);
    }
    
    // 7. Resumen
    log.section('✅ RESUMEN DE TESTS HTTP');
    log.success('Tests completados');
    log.info('Verifica que:');
    console.log('  1. ✓ Endpoint availability retorna datos correctos');
    console.log('  2. ✓ Endpoint register acepta inscripciones válidas');
    console.log('  3. ✓ Endpoint register rechaza inscripciones sin comprobante');
    console.log('  4. ✓ Endpoint register rechaza talleres inválidos');
    console.log('  5. ✓ Endpoint stats retorna estadísticas');
    console.log('  6. ✓ Endpoint list retorna inscripciones');
}

testEndpoint().catch(console.error);
