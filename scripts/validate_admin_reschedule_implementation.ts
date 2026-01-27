/**
 * Test de Verificación Estática: Admin Reschedule Override
 * 
 * Este script verifica que el código tenga las modificaciones correctas
 * para permitir al admin reagendar sin restricciones.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
    test: string;
    passed: boolean;
    details: string;
}

function readFile(relativePath: string): string {
    const fullPath = path.join(process.cwd(), relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
}

function validateAdminOverrideLogic(): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // TEST 1: Verificar que api/data.ts tenga skip de acceptedNoRefund para admin
    console.log('📋 Test 1: Verificar skip de acceptedNoRefund con forceAdminReschedule');
    const apiDataContent = readFile('api/data.ts');
    
    const hasNoRefundSkip = apiDataContent.includes('booking.acceptedNoRefund === true && !forceAdminReschedule');
    results.push({
        test: 'acceptedNoRefund skip para admin',
        passed: hasNoRefundSkip,
        details: hasNoRefundSkip 
            ? '✅ Código verifica forceAdminReschedule antes de rechazar por acceptedNoRefund'
            : '❌ Falta verificación de forceAdminReschedule en política acceptedNoRefund'
    });
    
    // TEST 2: Verificar que api/data.ts tenga skip de límite de reagendamientos para admin
    console.log('📋 Test 2: Verificar skip de límite de reagendamientos con forceAdminReschedule');
    const hasLimitSkip = apiDataContent.includes('if (!forceAdminReschedule)') 
        && apiDataContent.includes('Admin override: Saltando validación de límite de reagendamientos');
    
    results.push({
        test: 'Límite de reagendamientos skip para admin',
        passed: hasLimitSkip,
        details: hasLimitSkip
            ? '✅ Código salta validación de límite cuando forceAdminReschedule=true'
            : '❌ Falta condicional para skip de límite de reagendamientos'
    });
    
    // TEST 3: Verificar que CustomerDetailView.tsx pase forceAdminReschedule=true
    console.log('📋 Test 3: Verificar que CustomerDetailView pasa forceAdminReschedule=true');
    const customerDetailContent = readFile('components/admin/CustomerDetailView.tsx');
    
    const rescheduleMatches = customerDetailContent.match(/rescheduleBookingSlot\(/g);
    const trueComments = customerDetailContent.match(/true,\s*\/\/\s*forceAdminReschedule/g);
    const adminUserParams = customerDetailContent.match(/'admin_user'/g);
    
    const customerDetailCallsCorrect = 
        rescheduleMatches?.length === 2 && 
        trueComments?.length >= 2 &&
        adminUserParams?.length >= 2;
    
    results.push({
        test: 'CustomerDetailView pasa flag admin correcto',
        passed: customerDetailCallsCorrect,
        details: customerDetailCallsCorrect
            ? '✅ Ambas llamadas en CustomerDetailView pasan forceAdminReschedule=true'
            : `❌ Flags incompletos (calls: ${rescheduleMatches?.length || 0}, true flags: ${trueComments?.length || 0}, admin_user: ${adminUserParams?.length || 0})`
    });
    
    // TEST 4: Verificar que RescheduleModal.tsx pase forceAdminReschedule=true
    console.log('📋 Test 4: Verificar que RescheduleModal pasa forceAdminReschedule=true');
    const rescheduleModalContent = readFile('components/admin/RescheduleModal.tsx');
    
    const modalCallCorrect = rescheduleModalContent.includes('true, // forceAdminReschedule: Admin siempre tiene control total');
    
    results.push({
        test: 'RescheduleModal pasa flag admin correcto',
        passed: modalCallCorrect,
        details: modalCallCorrect
            ? '✅ RescheduleModal pasa forceAdminReschedule=true con comentario explicativo'
            : '❌ RescheduleModal no pasa el flag correcto'
    });
    
    // TEST 5: Verificar que ScheduleManager.tsx pase forceAdminReschedule=true
    console.log('📋 Test 5: Verificar que ScheduleManager pasa forceAdminReschedule=true');
    const scheduleManagerContent = readFile('components/admin/ScheduleManager.tsx');
    
    const scheduleManagerCallCorrect = scheduleManagerContent.includes('true, // forceAdminReschedule: Admin puede reagendar sin restricciones');
    
    results.push({
        test: 'ScheduleManager pasa flag admin correcto',
        passed: scheduleManagerCallCorrect,
        details: scheduleManagerCallCorrect
            ? '✅ ScheduleManager pasa forceAdminReschedule=true con comentario explicativo'
            : '❌ ScheduleManager no pasa el flag correcto'
    });
    
    return results;
}

function runValidation() {
    console.log('🧪 VALIDACIÓN ESTÁTICA: Admin Reschedule Override\n');
    console.log('='.repeat(70));
    console.log();
    
    const results = validateAdminOverrideLogic();
    
    console.log();
    console.log('='.repeat(70));
    console.log('📊 RESULTADOS:\n');
    
    results.forEach(result => {
        console.log(result.details);
    });
    
    console.log();
    console.log('='.repeat(70));
    
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`\n🎯 RESUMEN: ${passedTests}/${totalTests} tests pasaron`);
    
    if (failedTests === 0) {
        console.log('✅ TODOS LOS TESTS PASARON - Implementación correcta');
        console.log('\n📝 COMPORTAMIENTO ESPERADO:');
        console.log('   • Admin con forceAdminReschedule=true → Salta todas las restricciones');
        console.log('   • acceptedNoRefund → Ignorado para admin');
        console.log('   • Límite de reagendamientos → Ignorado para admin');
        console.log('   • Validación de 72h → Respetada (pero con admin override disponible)');
        console.log('   • Validación de capacidad → Respetada (límite físico)');
    } else {
        console.log(`❌ ${failedTests} tests fallaron - Revisar implementación`);
        process.exit(1);
    }
    
    console.log();
}

// Ejecutar validación
try {
    runValidation();
} catch (error) {
    console.error('❌ ERROR durante validación:', error instanceof Error ? error.message : error);
    process.exit(1);
}
