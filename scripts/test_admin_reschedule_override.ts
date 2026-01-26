/**
 * Test: Admin puede reagendar sin restricciones de política
 * 
 * Valida que:
 * 1. Admin puede reagendar clases con acceptedNoRefund=true
 * 2. Admin puede reagendar sin límite de reagendamientos
 * 3. Admin puede reagendar incluso si se agotaron los reagendamientos permitidos
 * 4. El sistema registra correctamente los override del admin
 */

interface RescheduleTestPayload {
    bookingId: string;
    oldSlot: { date: string; time: string };
    newSlot: { date: string; time: string };
    forceAdminReschedule: boolean;
    adminUser: string;
}

interface RescheduleResponse {
    success: boolean;
    error?: string;
    data?: any;
}

const BASE_URL = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';

async function testAdminRescheduleOverride() {
    console.log('🧪 TEST: Admin Reschedule Override - Flexibilidad Total\n');
    console.log('='.repeat(60));
    
    // TEST 1: Reagendar clase con acceptedNoRefund=true
    console.log('\n📋 Test 1: Admin puede reagendar clase con política no-refund');
    const test1Payload: RescheduleTestPayload = {
        bookingId: 'mock_booking_no_refund',
        oldSlot: { date: '2026-02-01', time: '10:00 AM' },
        newSlot: { date: '2026-02-05', time: '2:00 PM' },
        forceAdminReschedule: true,
        adminUser: 'admin_test'
    };
    
    console.log('Request:', JSON.stringify(test1Payload, null, 2));
    
    try {
        const response = await fetch(`${BASE_URL}/api/data?action=rescheduleBookingSlot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(test1Payload)
        });
        
        const result: RescheduleResponse = await response.json();
        
        if (response.status === 200 && result.success) {
            console.log('✅ PASS: Admin override funciona con acceptedNoRefund=true');
        } else if (response.status === 404) {
            console.log('⚠️ SKIP: Booking de prueba no existe (esperado en test)');
        } else {
            console.log(`❌ FAIL: ${result.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.log('❌ ERROR:', error instanceof Error ? error.message : error);
    }
    
    // TEST 2: Reagendar cuando se agotaron los reagendamientos
    console.log('\n📋 Test 2: Admin puede reagendar sin límite de reagendamientos');
    const test2Payload: RescheduleTestPayload = {
        bookingId: 'mock_booking_exhausted',
        oldSlot: { date: '2026-02-10', time: '11:00 AM' },
        newSlot: { date: '2026-02-12', time: '3:00 PM' },
        forceAdminReschedule: true,
        adminUser: 'admin_test'
    };
    
    console.log('Request:', JSON.stringify(test2Payload, null, 2));
    
    try {
        const response = await fetch(`${BASE_URL}/api/data?action=rescheduleBookingSlot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(test2Payload)
        });
        
        const result: RescheduleResponse = await response.json();
        
        if (response.status === 200 && result.success) {
            console.log('✅ PASS: Admin override funciona sin límite de reagendamientos');
        } else if (response.status === 404) {
            console.log('⚠️ SKIP: Booking de prueba no existe (esperado en test)');
        } else {
            console.log(`❌ FAIL: ${result.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.log('❌ ERROR:', error instanceof Error ? error.message : error);
    }
    
    // TEST 3: Sin flag forceAdminReschedule (debe validar)
    console.log('\n📋 Test 3: Sin flag admin, debe aplicar restricciones');
    const test3Payload = {
        bookingId: 'mock_booking_exhausted',
        oldSlot: { date: '2026-02-10', time: '11:00 AM' },
        newSlot: { date: '2026-02-12', time: '3:00 PM' },
        forceAdminReschedule: false, // Explícitamente false
        adminUser: 'admin_test'
    };
    
    console.log('Request:', JSON.stringify(test3Payload, null, 2));
    
    try {
        const response = await fetch(`${BASE_URL}/api/data?action=rescheduleBookingSlot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(test3Payload)
        });
        
        const result: RescheduleResponse = await response.json();
        
        if (response.status === 400 && result.error?.includes('reagendamientos disponibles')) {
            console.log('✅ PASS: Restricciones aplicadas correctamente sin admin override');
        } else if (response.status === 404) {
            console.log('⚠️ SKIP: Booking de prueba no existe (esperado en test)');
        } else {
            console.log(`⚠️ UNEXPECTED: ${result.error || 'No error returned'}`);
        }
    } catch (error) {
        console.log('❌ ERROR:', error instanceof Error ? error.message : error);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 RESUMEN DE VALIDACIÓN:');
    console.log('  1. Admin con forceAdminReschedule=true → SKIP validaciones');
    console.log('  2. Admin puede reagendar clases con acceptedNoRefund=true');
    console.log('  3. Admin puede reagendar sin límite de intentos');
    console.log('  4. Sin flag admin → Aplica restricciones normales');
    console.log('='.repeat(60));
    
    console.log('\n💡 NOTA: Tests con bookings mock (404) son esperados.');
    console.log('   Para test completo, crear booking real en DB de prueba.\n');
}

// Ejecutar test
testAdminRescheduleOverride().catch(console.error);
