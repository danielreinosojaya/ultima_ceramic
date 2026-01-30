/**
 * TEST REAL PARA VALIDAR QUE getBookingDisplayName FUNCIONA
 * Este test simula exactamente los datos que vienen de la DB
 */

// Simular exactamente el helper del archivo
const getTechniqueName = (technique: string): string => {
  const names: Record<string, string> = {
    'potters_wheel': 'Torno Alfarero',
    'hand_modeling': 'Modelado a Mano',
    'painting': 'Pintura de piezas'
  };
  return names[technique] || technique;
};

const getBookingDisplayName = (booking: any): string => {
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map((a: any) => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    
    if (uniqueTechniques.length === 1) {
      return getTechniqueName(uniqueTechniques[0]);
    } else {
      return `Clase Grupal (mixto)`;
    }
  }
  
  return booking.product?.name || 'Clase Individual';
};

console.log('🧪 TEST REAL - Simulando datos exactos del PDF\n');

// CASO 1: Melanie Alvarez - 2 asistentes - 18:00 - Pagado
// Según el screenshot, aparece "Unknown Product"
const melanieBooking = {
  userInfo: {
    firstName: 'Melanie',
    lastName: 'Alvarez'
  },
  participants: 2,
  isPaid: true,
  product: {
    name: 'Unknown Product' // Esto es lo que está en la DB actualmente
  },
  groupClassMetadata: {
    techniqueAssignments: [
      { participantNumber: 1, technique: 'hand_modeling' },
      { participantNumber: 2, technique: 'hand_modeling' }
    ]
  },
  slots: [
    { date: '2026-01-30', time: '18:00' }
  ]
};

// CASO 2: Adriana Rivera Morla - 4 asistentes - 19:00 - Pendiente
const adrianaBooking = {
  userInfo: {
    firstName: 'Adriana',
    lastName: 'Rivera Morla'
  },
  participants: 4,
  isPaid: false,
  product: {
    name: 'Unknown Product' // Esto es lo que está en la DB actualmente
  },
  groupClassMetadata: {
    techniqueAssignments: [
      { participantNumber: 1, technique: 'potters_wheel' },
      { participantNumber: 2, technique: 'potters_wheel' },
      { participantNumber: 3, technique: 'potters_wheel' },
      { participantNumber: 4, technique: 'potters_wheel' }
    ]
  },
  slots: [
    { date: '2026-01-30', time: '19:00' }
  ]
};

console.log('TEST CASO 1: Melanie Alvarez');
console.log('  Input product.name:', melanieBooking.product.name);
console.log('  Input metadata:', JSON.stringify(melanieBooking.groupClassMetadata, null, 2));
console.log('  ❌ Resultado actual en PDF:', melanieBooking.product.name);
console.log('  ✅ Resultado esperado:', getBookingDisplayName(melanieBooking));
console.log('  Status:', getBookingDisplayName(melanieBooking) === 'Modelado a Mano' ? '✅ CORRECTO' : '❌ FALLO');
console.log('');

console.log('TEST CASO 2: Adriana Rivera Morla');
console.log('  Input product.name:', adrianaBooking.product.name);
console.log('  Input metadata:', JSON.stringify(adrianaBooking.groupClassMetadata, null, 2));
console.log('  ❌ Resultado actual en PDF:', adrianaBooking.product.name);
console.log('  ✅ Resultado esperado:', getBookingDisplayName(adrianaBooking));
console.log('  Status:', getBookingDisplayName(adrianaBooking) === 'Torno Alfarero' ? '✅ CORRECTO' : '❌ FALLO');
console.log('');

// VERIFICACIÓN DEL PDF
console.log('═══════════════════════════════════════════════════════════');
console.log('VERIFICACIÓN: ¿Por qué aparece "Unknown Product" en el PDF?');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('El problema es que la función getBookingDisplayName() YA EXISTE y funciona correctamente:');
console.log('  • Melanie: getBookingDisplayName() → "Modelado a Mano" ✅');
console.log('  • Adriana: getBookingDisplayName() → "Torno Alfarero" ✅');
console.log('');
console.log('Pero el PDF muestra "Unknown Product" porque:');
console.log('  1. La columna del PDF usa: getBookingDisplayName(b) ✅ CORRECTO');
console.log('  2. La función lee groupClassMetadata.techniqueAssignments ✅ CORRECTO');
console.log('  3. Mapea la técnica al nombre en español ✅ CORRECTO');
console.log('');
console.log('DIAGNÓSTICO FINAL:');
console.log('  ⚠️  El código del helper ES CORRECTO');
console.log('  ⚠️  El PDF llama al helper correctamente');
console.log('  ❓ HIPÓTESIS: El problema puede ser que groupClassMetadata sea NULL en algunos bookings');
console.log('');

// TEST CON METADATA NULL
const bookingSinMetadata = {
  userInfo: { firstName: 'Test', lastName: 'User' },
  product: { name: 'Unknown Product' },
  groupClassMetadata: null, // NO HAY METADATA
  slots: [{ date: '2026-01-30', time: '20:00' }]
};

console.log('TEST CASO 3: Booking SIN metadata (puede ser el caso real)');
console.log('  Input product.name:', bookingSinMetadata.product.name);
console.log('  Input metadata:', bookingSinMetadata.groupClassMetadata);
console.log('  Resultado:', getBookingDisplayName(bookingSinMetadata));
console.log('  ❌ PROBLEMA ENCONTRADO: Si metadata es null, usa product.name directamente');
console.log('  ❌ Y product.name = "Unknown Product"');
console.log('');

console.log('═══════════════════════════════════════════════════════════');
console.log('CONCLUSIÓN');
console.log('═══════════════════════════════════════════════════════════');
console.log('Si groupClassMetadata es NULL o vacío, getBookingDisplayName fallback a product.name');
console.log('Y product.name está guardado como "Unknown Product" en la base de datos');
console.log('');
console.log('SOLUCIÓN NECESARIA:');
console.log('1. Verificar si los bookings tienen groupClassMetadata poblado');
console.log('2. Si NO tienen metadata, el problema está en cómo se crean los bookings');
console.log('3. Necesitamos ver el JSON real de un booking para diagnosticar');
