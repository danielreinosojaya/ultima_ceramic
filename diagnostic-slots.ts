/**
 * DIAGNÓSTICO: Por qué los slots del calendario no coinciden con el PDF
 * 
 * Problema observado:
 * - PDF (correcto): Muestra 5 asistentes a las 09:00 con diferentes técnicas
 * - Calendario: Muestra 2 tarjetas separadas - "Clase suelta torno" 5/8 y "Torno Alfarero" 1/8
 * 
 * Hipótesis: La lógica de agrupación en ScheduleManager.tsx agrupa por instructorId
 * pero los bookings tienen diferentes instructorIds causando múltiples tarjetas.
 */

// Simular datos según el PDF del 31 de enero 2026 a las 09:00
const bookings = [
  {
    id: 'booking1',
    userInfo: { firstName: 'Eva Ninoska', lastName: 'Ordoñez' },
    product: { name: 'Clase suelta torno', type: 'SINGLE_CLASS' },
    productType: 'SINGLE_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 1 }], // ¿instructorId = 1?
    groupClassMetadata: null,
    participants: 1
  },
  {
    id: 'booking2',
    userInfo: { firstName: 'Maria Lorena', lastName: 'Herdoiza' },
    product: { name: 'Clase suelta torno', type: 'SINGLE_CLASS' },
    productType: 'SINGLE_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 1 }],
    groupClassMetadata: null,
    participants: 1
  },
  {
    id: 'booking3',
    userInfo: { firstName: 'Paola', lastName: 'Vega' },
    product: { name: 'Modelado a Mano', type: 'GROUP_CLASS' },
    productType: 'GROUP_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 2 }], // ¿instructorId diferente?
    groupClassMetadata: {
      totalParticipants: 2,
      techniqueAssignments: [
        { participantNumber: 1, technique: 'hand_modeling' },
        { participantNumber: 2, technique: 'hand_modeling' }
      ],
      pricePerPerson: 40,
      totalPrice: 80
    },
    participants: 2
  },
  {
    id: 'booking4',
    userInfo: { firstName: 'Betty', lastName: 'Martinez Rizzo' },
    product: { name: 'Modelado a Mano', type: 'GROUP_CLASS' },
    productType: 'GROUP_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 2 }],
    groupClassMetadata: {
      totalParticipants: 1,
      techniqueAssignments: [
        { participantNumber: 1, technique: 'hand_modeling' }
      ],
      pricePerPerson: 40,
      totalPrice: 40
    },
    participants: 1
  },
  {
    id: 'booking5',
    userInfo: { firstName: 'María Fernanda', lastName: 'Garcia Encalada' },
    product: { name: 'Torno Alfarero', type: 'GROUP_CLASS' },
    productType: 'GROUP_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 3 }], // ¿Otro instructorId?
    groupClassMetadata: {
      totalParticipants: 1,
      techniqueAssignments: [
        { participantNumber: 1, technique: 'potters_wheel' }
      ],
      pricePerPerson: 40,
      totalPrice: 40
    },
    participants: 1
  }
];

// Simular la lógica de ScheduleManager
const allSlots = new Map<string, { bookings: any[], product: any, capacity: number }>();

const normalizeTime = (timeStr: string): string => {
  if (!timeStr) return '';
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

console.log('='.repeat(80));
console.log('DIAGNÓSTICO: Lógica de agrupación de slots en ScheduleManager');
console.log('='.repeat(80));
console.log('');

// Step 1: Simular la creación de slots (como en líneas 308-370)
for (const booking of bookings) {
  for (const slot of booking.slots) {
    const instructorId = slot.instructorId || 1;
    const dateStr = slot.date;
    const normalizedTime = normalizeTime(slot.time);
    
    // ESTE ES EL PROBLEMA: slotId incluye instructorId
    const slotId = `${dateStr}-${normalizedTime}-${instructorId}`;
    
    console.log(`Booking ${booking.userInfo.firstName}: slotId = "${slotId}"`);
    
    if (!allSlots.has(slotId)) {
      allSlots.set(slotId, {
        bookings: [],
        product: booking.product,
        capacity: 8
      });
    }
    
    const existingSlot = allSlots.get(slotId)!;
    existingSlot.bookings.push(booking);
  }
}

console.log('');
console.log('='.repeat(80));
console.log('RESULTADO: Slots creados');
console.log('='.repeat(80));
console.log('');

allSlots.forEach((slot, slotId) => {
  const totalParticipants = slot.bookings.reduce((sum: number, b: any) => sum + (b.participants || 1), 0);
  console.log(`Slot: ${slotId}`);
  console.log(`  Producto: ${slot.product.name}`);
  console.log(`  Bookings: ${slot.bookings.length}`);
  console.log(`  Participantes: ${totalParticipants}/${slot.capacity}`);
  console.log(`  Nombres: ${slot.bookings.map((b: any) => b.userInfo.firstName).join(', ')}`);
  console.log('');
});

console.log('='.repeat(80));
console.log('DIAGNÓSTICO FINAL');
console.log('='.repeat(80));
console.log('');

if (allSlots.size > 1) {
  console.log('⚠️  PROBLEMA CONFIRMADO: Se están creando MÚLTIPLES slots para la misma hora');
  console.log('');
  console.log('CAUSA: El slotId incluye instructorId en su composición:');
  console.log('  slotId = `${dateStr}-${normalizedTime}-${instructorId}`');
  console.log('');
  console.log('Cuando los bookings tienen diferentes instructorId, se crean tarjetas separadas.');
  console.log('');
  console.log('SOLUCIÓN PROPUESTA:');
  console.log('  Para la visualización del calendario, todos los bookings de la misma');
  console.log('  fecha+hora deberían agruparse en UNA SOLA tarjeta, independientemente');
  console.log('  del instructorId.');
  console.log('');
  console.log('  El slotId para agrupación visual debería ser:');
  console.log('  slotId = `${dateStr}-${normalizedTime}` (SIN instructorId)');
} else {
  console.log('✅ Solo se creó 1 slot - el problema puede ser diferente');
}

console.log('');
console.log('='.repeat(80));
console.log('ALTERNATIVA: Si instructorId está undefined/null en algunos bookings');
console.log('='.repeat(80));

// Probar con instructorId undefined
const bookingsWithMixedInstructor = [
  { name: 'Eva', slots: [{ date: '2026-01-31', time: '09:00', instructorId: 1 }] },
  { name: 'Maria', slots: [{ date: '2026-01-31', time: '09:00', instructorId: undefined }] },
  { name: 'Paola', slots: [{ date: '2026-01-31', time: '09:00' }] }, // Sin instructorId
];

const testSlots = new Map<string, string[]>();
for (const b of bookingsWithMixedInstructor) {
  const slot = b.slots[0];
  const instructorId = (slot as any).instructorId || 1;
  const slotId = `2026-01-31-09:00-${instructorId}`;
  
  if (!testSlots.has(slotId)) {
    testSlots.set(slotId, []);
  }
  testSlots.get(slotId)!.push(b.name);
}

console.log('');
console.log('Slots con instructorId mixto:');
testSlots.forEach((names, slotId) => {
  console.log(`  ${slotId}: [${names.join(', ')}]`);
});
console.log('');
console.log('Conclusión: Si algunos bookings tienen instructorId=undefined,');
console.log('el fallback `|| 1` los agrupa con instructor 1.');
console.log('Pero si tienen IDs diferentes explícitos, se separan.');
