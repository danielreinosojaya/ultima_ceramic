/**
 * Test Script: Verify Technique Display Fix
 * 
 * Este script verifica que el fix para la visualización de técnicas
 * en el calendario funciona correctamente.
 * 
 * Run with: node test-fix-technique-display.mjs
 */

// Mock data simulando el escenario del problema
const mockBookingPainting = {
  id: 'booking-001',
  productType: 'GROUP_CLASS',
  technique: 'potters_wheel', // INCORRECTO en BD - debería ser 'painting'
  product: {
    name: 'Pintura de piezas', // CORRECTO - este es el valor confiable
    type: 'GROUP_CLASS',
    details: { technique: 'painting' }
  },
  groupClassMetadata: {
    techniqueAssignments: [
      { technique: 'potters_wheel', displayName: 'Torno Alfarero' } // INCORRECTO
    ]
  },
  slots: [
    { date: '2026-01-31', time: '11:30', instructorId: 1 }
  ]
};

const mockBookingTorno = {
  id: 'booking-002',
  productType: 'GROUP_CLASS',
  technique: 'painting', // INCORRECTO en BD - debería ser 'potters_wheel'
  product: {
    name: 'Torno Alfarero', // CORRECTO
    type: 'GROUP_CLASS',
    details: { technique: 'potters_wheel' }
  },
  groupClassMetadata: {
    techniqueAssignments: [
      { technique: 'painting', displayName: 'Pintura de piezas' } // INCORRECTO
    ]
  },
  slots: [
    { date: '2026-01-31', time: '14:00', instructorId: 1 }
  ]
};

const mockBookingModelado = {
  id: 'booking-003',
  productType: 'GROUP_CLASS',
  technique: 'hand_modeling', // CORRECTO
  product: {
    name: 'Modelado a Mano', // CORRECTO
    type: 'GROUP_CLASS',
    details: { technique: 'hand_modeling' }
  },
  groupClassMetadata: {
    techniqueAssignments: [
      { technique: 'hand_modeling', displayName: 'Modelado a Mano' } // CORRECTO
    ]
  },
  slots: [
    { date: '2026-01-31', time: '16:00', instructorId: 1 }
  ]
};

// ============================================================================
// FUNCIÓN ORIGINAL (ANTES DEL FIX) - Simula el comportamiento anterior
// ============================================================================
function getSlotDisplayName_ORIGINAL(slot) {
  if (slot.bookings.length === 0) {
    const productName = slot.product?.name;
    if (!productName || productName === 'Unknown Product' || productName === 'Unknown') {
      return 'Clase';
    }
    return productName;
  }

  // Obtener la técnica subyacente del primer booking
  const technique = getUnderlyingTechnique_ORIGINAL(slot.bookings[0]);
  
  // Mapear técnica a nombre display unificado
  if (technique === 'potters_wheel') return 'Torno Alfarero';
  if (technique === 'hand_modeling') return 'Modelado a Mano';
  if (technique === 'painting') return 'Pintura de piezas';
  if (technique === 'molding') return 'Modelado';
  if (technique === 'mixed') return 'Clase Grupal (mixto)';
  
  return 'Clase';
}

function getUnderlyingTechnique_ORIGINAL(booking) {
  // 1. Buscar en groupClassMetadata (GROUP_CLASS) - PRIORIDAD ALTA
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    if (uniqueTechniques.length === 1) {
      return uniqueTechniques[0];
    }
    return 'mixed';
  }
  
  // 2. Buscar en product.details.technique
  if (booking.product?.details?.technique) {
    return booking.product.details.technique;
  }
  
  // 3. Fallback
  return booking.technique || 'unknown';
}

// ============================================================================
// FUNCIÓN NUEVA (DESPUÉS DEL FIX) - Comportamiento corregido
// ============================================================================
function getSlotDisplayName_FIXED(slot) {
  if (slot.bookings.length === 0) {
    const productName = slot.product?.name;
    if (!productName || productName === 'Unknown Product' || productName === 'Unknown') {
      return 'Clase';
    }
    return productName;
  }

  const firstBooking = slot.bookings[0];
  
  // FIX #1: Prioridad máxima a product.name (fuente más confiable)
  const productName = firstBooking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown' && productName !== null) {
    return productName;
  }
  
  // Si product.name no está disponible, usar la técnica subyacente
  const technique = getUnderlyingTechnique_ORIGINAL(firstBooking);
  
  // Mapear técnica a nombre display unificado
  if (technique === 'potters_wheel') return 'Torno Alfarero';
  if (technique === 'hand_modeling') return 'Modelado a Mano';
  if (technique === 'painting') return 'Pintura de piezas';
  if (technique === 'molding') return 'Modelado';
  if (technique === 'mixed') return 'Clase Grupal (mixto)';
  
  return 'Clase';
}

// ============================================================================
// TESTS
// ============================================================================
console.log('='.repeat(70));
console.log('TEST: Verificación del Fix para Visualización de Técnicas');
console.log('='.repeat(70));

let passCount = 0;
let failCount = 0;

function test(name, expected, actual) {
  const passed = expected === actual;
  if (passed) {
    console.log(`✅ PASS: ${name}`);
    console.log(`   Esperado: "${expected}" | Obtenido: "${actual}"`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Esperado: "${expected}" | Obtenido: "${actual}"`);
    failCount++;
  }
  console.log('');
}

console.log('\n' + '-'.repeat(70));
console.log('ANTES DEL FIX (Comportamiento Incorrecto)');
console.log('-'.repeat(70) + '\n');

// Test 1: Booking de Pintura con techniqueAssignments incorrecto
const slotPainting = { bookings: [mockBookingPainting], product: mockBookingPainting.product };
test(
  'Booking de Pintura (11:30 AM) - ANTES',
  'Torno Alfarero', // El comportamiento anterior mostraba Torno (INCORRECTO)
  getSlotDisplayName_ORIGINAL(slotPainting)
);

// Test 2: Booking de Torno con techniqueAssignments incorrecto
const slotTorno = { bookings: [mockBookingTorno], product: mockBookingTorno.product };
test(
  'Booking de Torno (14:00) - ANTES',
  'Pintura de piezas', // El comportamiento anterior mostraba Pintura (INCORRECTO)
  getSlotDisplayName_ORIGINAL(slotTorno)
);

// Test 3: Booking de Modelado (correcto)
const slotModelado = { bookings: [mockBookingModelado], product: mockBookingModelado.product };
test(
  'Booking de Modelado (16:00) - ANTES',
  'Modelado a Mano', // Este estaba correcto
  getSlotDisplayName_ORIGINAL(slotModelado)
);

console.log('\n' + '-'.repeat(70));
console.log('DESPUÉS DEL FIX (Comportamiento Correcto)');
console.log('-'.repeat(70) + '\n');

// Test 4: Booking de Pintura con techniqueAssignments incorrecto
const slotPaintingFixed = { bookings: [mockBookingPainting], product: mockBookingPainting.product };
test(
  'Booking de Pintura (11:30 AM) - DESPUÉS',
  'Pintura de piezas', // Ahora muestra Pintura (CORRECTO)
  getSlotDisplayName_FIXED(slotPaintingFixed)
);

// Test 5: Booking de Torno con techniqueAssignments incorrecto
const slotTornoFixed = { bookings: [mockBookingTorno], product: mockBookingTorno.product };
test(
  'Booking de Torno (14:00) - DESPUÉS',
  'Torno Alfarero', // Ahora muestra Torno (CORRECTO)
  getSlotDisplayName_FIXED(slotTornoFixed)
);

// Test 6: Booking de Modelado (correcto)
const slotModeladoFixed = { bookings: [mockBookingModelado], product: mockBookingModelado.product };
test(
  'Booking de Modelado (16:00) - DESPUÉS',
  'Modelado a Mano', // Sigue correcto
  getSlotDisplayName_FIXED(slotModeladoFixed)
);

// ============================================================================
// RESUMEN
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log('RESUMEN');
console.log('='.repeat(70));
console.log(`Tests Pasados: ${passCount}`);
console.log(`Tests Fallidos: ${failCount}`);
console.log('');

if (failCount === 0) {
  console.log('✅ TODOS LOS TESTS PASARON');
  console.log('');
  console.log('El fix funciona correctamente:');
  console.log('  - Prioriza product.name sobre techniqueAssignments');
  console.log('  - Muestra la técnica correcta en el calendario');
  console.log('  - Maneja correctamente datos inconsistentes en la BD');
} else {
  console.log('❌ ALGUNOS TESTS FALLARON');
  console.log('Revisar la implementación del fix.');
}

console.log('\n' + '='.repeat(70));
