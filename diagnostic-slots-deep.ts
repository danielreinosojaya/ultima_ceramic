/**
 * DIAGNÓSTICO PROFUNDO: Por qué el calendario muestra 5/8 en lugar de distribuir correctamente
 * 
 * Según la imagen:
 * - "Clase suelta torno" 5/8 booked
 * - "Torno Alfarero" 1/8 booked
 * 
 * Según el PDF:
 * - Eva Ninoska (1) - Clase suelta torno
 * - Maria Lorena (1) - Clase suelta torno
 * - Paola Vega (2) - Modelado a Mano
 * - Betty Martinez (1) - Modelado a Mano
 * - María Fernanda (1) - Torno Alfarero
 * 
 * HIPÓTESIS: Los bookings de "Modelado a Mano" están siendo agrupados con "Clase suelta torno"
 * porque tienen el mismo instructorId (1 por default).
 */

// Simular bookings donde algunos tienen instructorId undefined
const bookings = [
  {
    id: 'b1',
    name: 'Eva Ninoska',
    product: { name: 'Clase suelta torno' },
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 1 }],
    participants: 1
  },
  {
    id: 'b2',
    name: 'Maria Lorena',
    product: { name: 'Clase suelta torno' },
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 1 }],
    participants: 1
  },
  {
    id: 'b3',
    name: 'Paola Vega',
    product: { name: 'Modelado a Mano' },
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: undefined }], // ← SIN instructorId → fallback a 1
    participants: 2
  },
  {
    id: 'b4',
    name: 'Betty Martinez',
    product: { name: 'Modelado a Mano' },
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: undefined }], // ← SIN instructorId → fallback a 1
    participants: 1
  },
  {
    id: 'b5',
    name: 'María Fernanda',
    product: { name: 'Torno Alfarero' },
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 2 }], // ← instructorId diferente
    participants: 1
  }
];

const allSlots = new Map<string, { bookings: any[], product: any, capacity: number }>();

console.log('='.repeat(80));
console.log('ESCENARIO: instructorId undefined hace fallback a 1');
console.log('='.repeat(80));
console.log('');

for (const booking of bookings) {
  for (const slot of booking.slots) {
    const instructorId = slot.instructorId || 1; // El fallback problemático
    const slotId = `2026-01-31-09:00-${instructorId}`;
    
    console.log(`${booking.name}: instructorId=${slot.instructorId} → después del fallback: ${instructorId} → slotId=${slotId}`);
    
    if (!allSlots.has(slotId)) {
      allSlots.set(slotId, {
        bookings: [],
        product: booking.product,
        capacity: 8
      });
    }
    
    allSlots.get(slotId)!.bookings.push(booking);
  }
}

console.log('');
console.log('='.repeat(80));
console.log('RESULTADO: Tarjetas del calendario');
console.log('='.repeat(80));
console.log('');

allSlots.forEach((slot, slotId) => {
  const totalParticipants = slot.bookings.reduce((sum: number, b: any) => sum + b.participants, 0);
  console.log(`📅 Tarjeta: ${slotId.split('-')[3] === '1' ? 'Instructor 1' : 'Instructor 2'}`);
  console.log(`   Nombre mostrado: ${slot.product.name}`);
  console.log(`   Participantes: ${totalParticipants}/8 booked`);
  console.log(`   Bookings incluidos:`);
  slot.bookings.forEach((b: any) => {
    console.log(`     - ${b.name} (${b.participants} personas) - ${b.product.name}`);
  });
  console.log('');
});

console.log('='.repeat(80));
console.log('ANÁLISIS');
console.log('='.repeat(80));
console.log('');

const slot1 = allSlots.get('2026-01-31-09:00-1');
const slot2 = allSlots.get('2026-01-31-09:00-2');

if (slot1) {
  const total1 = slot1.bookings.reduce((sum: number, b: any) => sum + b.participants, 0);
  console.log(`Slot instructor 1: ${total1}/8 booked (muestra "${slot1.product.name}")`);
  
  // Verificar si el nombre del slot coincide con todos los bookings
  const uniqueProducts = [...new Set(slot1.bookings.map((b: any) => b.product.name))];
  if (uniqueProducts.length > 1) {
    console.log(`   ⚠️  PROBLEMA: Este slot contiene ${uniqueProducts.length} productos diferentes:`);
    console.log(`       ${uniqueProducts.join(', ')}`);
    console.log(`   ⚠️  Pero el nombre mostrado es solo: "${slot1.product.name}"`);
    console.log(`   ⚠️  Los otros productos no se ven en la tarjeta!`);
  }
}

if (slot2) {
  const total2 = slot2.bookings.reduce((sum: number, b: any) => sum + b.participants, 0);
  console.log(`Slot instructor 2: ${total2}/8 booked (muestra "${slot2.product.name}")`);
}

console.log('');
console.log('='.repeat(80));
console.log('CONCLUSIÓN');
console.log('='.repeat(80));
console.log('');
console.log('El problema tiene DOS partes:');
console.log('');
console.log('1. AGRUPACIÓN INCORRECTA:');
console.log('   Los bookings con instructorId=undefined usan fallback a 1');
console.log('   Esto los agrupa con otros bookings del instructor 1');
console.log('   Aunque sean de productos/técnicas diferentes');
console.log('');
console.log('2. NOMBRE INCORRECTO:');
console.log('   El nombre de la tarjeta usa el producto del PRIMER booking del slot');
console.log('   Ignora que puede haber bookings de diferentes productos');
console.log('');
console.log('SOLUCIÓN:');
console.log('   Para el PDF (correcto): Agrupar por fecha+hora sin importar instructor');
console.log('   Para el calendario: Mostrar nombre correcto según los bookings del slot');
console.log('   O: Agrupar slots por técnica/producto, no por instructor');
