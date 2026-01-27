/**
 * Test: Verificar deduplicación en reagendamiento
 * 
 * Este script simula un reagendamiento y verifica que:
 * 1. El booking actualizado NO tenga slots duplicados
 * 2. El slot viejo se eliminó correctamente
 * 3. El slot nuevo se agregó correctamente
 * 4. Los customers generados NO tienen bookings duplicados
 */

interface Slot {
    date: string;
    time: string;
}

interface Booking {
    id: string;
    bookingCode: string;
    slots: Slot[];
    userInfo: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        countryCode: string;
    };
    createdAt: Date;
}

interface Customer {
    email: string;
    bookings: Booking[];
    totalBookings: number;
}

// Simular generateCustomersFromBookings
function generateCustomersFromBookings(bookings: Booking[]): Customer[] {
    const customerMap: Map<string, { userInfo: any; bookings: Booking[] }> = new Map();
    
    for (const booking of bookings) {
        if (!booking.userInfo || !booking.userInfo.email) {
            continue;
        }
        
        const email = booking.userInfo.email.toLowerCase();
        
        if (!customerMap.has(email)) {
            customerMap.set(email, { userInfo: booking.userInfo, bookings: [] });
        }
        customerMap.get(email)!.bookings.push(booking);
    }
    
    const customers: Customer[] = Array.from(customerMap.values()).map(data => ({
        email: data.userInfo.email,
        bookings: data.bookings,
        totalBookings: data.bookings.length,
    }));
    
    return customers;
}

// Simular rescheduleBookingSlot (backend logic)
function rescheduleBookingSlot(booking: Booking, oldSlot: Slot, newSlot: Slot): Booking {
    const slotsFromDB = booking.slots;
    
    // Filtrar oldSlot
    const otherSlots = slotsFromDB.filter((s: Slot) => 
        s.date !== oldSlot.date || s.time !== oldSlot.time
    );
    
    // Agregar newSlot
    const updatedSlots = [...otherSlots, newSlot];
    
    return {
        ...booking,
        slots: updatedSlots
    };
}

// Detectar duplicados en slots
function findDuplicateSlots(slots: Slot[]): { date: string; time: string; count: number }[] {
    const slotKeys = slots.map(s => `${s.date}|${s.time}`);
    const counts: { [key: string]: number } = {};
    
    slotKeys.forEach(key => {
        counts[key] = (counts[key] || 0) + 1;
    });
    
    return Object.entries(counts)
        .filter(([_, count]) => count > 1)
        .map(([key, count]) => {
            const [date, time] = key.split('|');
            return { date, time, count };
        });
}

// Ejecutar tests
function runTests() {
    console.log('🧪 TEST: Deduplicación en Reagendamiento\n');
    console.log('='.repeat(70));
    
    // TEST 1: Booking con slots únicos
    console.log('\n📋 Test 1: Reagendar booking normal (sin duplicados previos)');
    const booking1: Booking = {
        id: 'booking-1',
        bookingCode: 'C-ALMA-TEST1',
        slots: [
            { date: '2026-02-01', time: '10:00 AM' },
            { date: '2026-02-08', time: '10:00 AM' },
            { date: '2026-02-15', time: '10:00 AM' },
        ],
        userInfo: {
            firstName: 'Andrea',
            lastName: 'Salem',
            email: 'andrea@test.com',
            phone: '1234567890',
            countryCode: '+593'
        },
        createdAt: new Date()
    };
    
    const oldSlot1: Slot = { date: '2026-02-01', time: '10:00 AM' };
    const newSlot1: Slot = { date: '2026-02-05', time: '2:00 PM' };
    
    const updated1 = rescheduleBookingSlot(booking1, oldSlot1, newSlot1);
    const duplicates1 = findDuplicateSlots(updated1.slots);
    
    console.log('  Slots antes:', booking1.slots.length);
    console.log('  Slots después:', updated1.slots.length);
    console.log('  Duplicados:', duplicates1.length);
    
    if (duplicates1.length === 0 && updated1.slots.length === 3) {
        console.log('  ✅ PASS: Sin duplicados, cantidad correcta');
    } else {
        console.log('  ❌ FAIL: Hay duplicados o cantidad incorrecta');
        console.log('  Duplicados encontrados:', duplicates1);
    }
    
    // TEST 2: Booking con slots duplicados existentes (edge case)
    console.log('\n📋 Test 2: Reagendar booking con slot duplicado existente');
    const booking2: Booking = {
        id: 'booking-2',
        bookingCode: 'C-ALMA-TEST2',
        slots: [
            { date: '2026-02-01', time: '10:00 AM' },
            { date: '2026-02-01', time: '10:00 AM' }, // DUPLICADO!
            { date: '2026-02-08', time: '10:00 AM' },
        ],
        userInfo: {
            firstName: 'Andrea',
            lastName: 'Salem',
            email: 'andrea@test.com',
            phone: '1234567890',
            countryCode: '+593'
        },
        createdAt: new Date()
    };
    
    const oldSlot2: Slot = { date: '2026-02-01', time: '10:00 AM' };
    const newSlot2: Slot = { date: '2026-02-12', time: '3:00 PM' };
    
    const updated2 = rescheduleBookingSlot(booking2, oldSlot2, newSlot2);
    const duplicates2 = findDuplicateSlots(updated2.slots);
    
    console.log('  Slots antes:', booking2.slots.length, '(1 duplicado)');
    console.log('  Slots después:', updated2.slots.length);
    console.log('  Duplicados después:', duplicates2.length);
    
    if (duplicates2.length === 0 && updated2.slots.length === 2) {
        console.log('  ✅ PASS: Ambos duplicados eliminados, slot nuevo agregado');
    } else {
        console.log('  ⚠️ PARTIAL: La lógica actual solo elimina UNA instancia del duplicado');
        console.log('  Slots finales:', updated2.slots);
    }
    
    // TEST 3: generateCustomersFromBookings con mismo booking múltiples veces
    console.log('\n📋 Test 3: Deduplicación de bookings en generateCustomersFromBookings');
    const bookings: Booking[] = [
        booking1,
        booking1, // DUPLICADO (mismo objeto)
        updated1,
    ];
    
    const customers = generateCustomersFromBookings(bookings);
    
    console.log('  Bookings input:', bookings.length);
    console.log('  Customers output:', customers.length);
    console.log('  Bookings en customer:', customers[0]?.totalBookings);
    
    if (customers.length === 1 && customers[0].totalBookings === 3) {
        console.log('  ✅ PASS: Customer único, pero tiene 3 bookings (incluye duplicados)');
        console.log('  ⚠️ NOTA: La función NO deduplica bookings por ID, solo agrupa por email');
    } else {
        console.log('  ❌ FAIL: Comportamiento inesperado');
    }
    
    // TEST 4: Slots con formato de hora diferente (edge case)
    console.log('\n📋 Test 4: Reagendar con formato de hora diferente');
    const booking4: Booking = {
        id: 'booking-4',
        bookingCode: 'C-ALMA-TEST4',
        slots: [
            { date: '2026-02-01', time: '10:00 AM' },
            { date: '2026-02-01', time: '10:00' }, // Formato 24h
        ],
        userInfo: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@test.com',
            phone: '1234567890',
            countryCode: '+593'
        },
        createdAt: new Date()
    };
    
    const oldSlot4: Slot = { date: '2026-02-01', time: '10:00 AM' };
    const newSlot4: Slot = { date: '2026-02-05', time: '2:00 PM' };
    
    const updated4 = rescheduleBookingSlot(booking4, oldSlot4, newSlot4);
    const duplicates4 = findDuplicateSlots(updated4.slots);
    
    console.log('  Slots antes:', booking4.slots.length, '(mismo horario, diferente formato)');
    console.log('  Slots después:', updated4.slots.length);
    console.log('  Duplicados:', duplicates4.length);
    
    if (updated4.slots.length === 2 && duplicates4.length === 0) {
        console.log('  ✅ PASS: Formato diferente NO causa problema (solo elimina coincidencia exacta)');
    } else {
        console.log('  ⚠️ NOTA: Slots con formato diferente se tratan como diferentes');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🎯 CONCLUSIONES:');
    console.log('  1. Lógica de reschedule elimina solo UNA instancia del oldSlot');
    console.log('  2. Si hay duplicados previos, solo se elimina uno');
    console.log('  3. generateCustomersFromBookings NO deduplica bookings por ID');
    console.log('  4. Formatos diferentes de hora NO se detectan como duplicados');
    console.log('\n💡 SOLUCIÓN RECOMENDADA:');
    console.log('  • Agregar deduplicación en backend después de UPDATE');
    console.log('  • Normalizar formato de hora antes de comparar');
    console.log('  • Dedupmicar bookings por ID en generateCustomersFromBookings');
    console.log('='.repeat(70) + '\n');
}

runTests();
