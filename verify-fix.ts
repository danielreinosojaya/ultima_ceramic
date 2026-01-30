/**
 * VERIFICACIÓN POST-FIX: Confirmar que la agrupación de slots ahora es correcta
 */

const bookings = [
  {
    id: 'b1', name: 'Eva Ninoska',
    product: { name: 'Clase suelta torno' }, productType: 'SINGLE_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 1 }],
    groupClassMetadata: null, participants: 1
  },
  {
    id: 'b2', name: 'Maria Lorena',
    product: { name: 'Clase suelta torno' }, productType: 'SINGLE_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 1 }],
    groupClassMetadata: null, participants: 1
  },
  {
    id: 'b3', name: 'Paola Vega',
    product: { name: 'Unknown Product' }, productType: 'GROUP_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: undefined }],
    groupClassMetadata: {
      totalParticipants: 2,
      techniqueAssignments: [
        { participantNumber: 1, technique: 'hand_modeling' },
        { participantNumber: 2, technique: 'hand_modeling' }
      ]
    }, participants: 2
  },
  {
    id: 'b4', name: 'Betty Martinez',
    product: { name: 'Unknown Product' }, productType: 'GROUP_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: undefined }],
    groupClassMetadata: {
      totalParticipants: 1,
      techniqueAssignments: [{ participantNumber: 1, technique: 'hand_modeling' }]
    }, participants: 1
  },
  {
    id: 'b5', name: 'María Fernanda',
    product: { name: 'Unknown Product' }, productType: 'GROUP_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 2 }],
    groupClassMetadata: {
      totalParticipants: 1,
      techniqueAssignments: [{ participantNumber: 1, technique: 'potters_wheel' }]
    }, participants: 1
  }
];

// Helpers simulados
const getTechniqueName = (technique: string): string => {
  const names: Record<string, string> = {
    'potters_wheel': 'Torno Alfarero',
    'hand_modeling': 'Modelado a Mano',
    'painting': 'Pintura de piezas'
  };
  return names[technique] || technique;
};

const getProductTypeName = (productType?: string): string => {
  const typeNames: Record<string, string> = {
    'SINGLE_CLASS': 'Clase Suelta',
    'CLASS_PACKAGE': 'Paquete de Clases',
    'GROUP_CLASS': 'Clase Grupal',
  };
  return typeNames[productType || ''] || 'Clase';
};

const getBookingDisplayName = (booking: any): string => {
  if (booking.groupClassMetadata?.techniqueAssignments?.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map((a: any) => a.technique);
    const uniqueTechniques = [...new Set(techniques)] as string[];
    if (uniqueTechniques.length === 1) {
      return getTechniqueName(uniqueTechniques[0]);
    }
    return 'Clase Grupal (mixto)';
  }
  const productName = booking.product?.name;
  if (!productName || productName === 'Unknown Product') {
    return getProductTypeName(booking.productType);
  }
  return productName;
};

const normalizeTime = (timeStr: string): string => {
  const [h, m] = timeStr.split(':').map(s => parseInt(s, 10));
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// ======= SIMULACIÓN DEL FIX =======
console.log('='.repeat(80));
console.log('VERIFICACIÓN POST-FIX: Agrupación sin instructorId');
console.log('='.repeat(80));
console.log('');

const allSlots = new Map<string, { bookings: any[], product: any }>();

for (const booking of bookings) {
  for (const slot of booking.slots) {
    const dateStr = slot.date;
    const normalizedTime = normalizeTime(slot.time);
    // FIX: slotId SIN instructorId
    const slotId = `${dateStr}-${normalizedTime}`;
    
    if (!allSlots.has(slotId)) {
      allSlots.set(slotId, { bookings: [], product: booking.product });
    }
    allSlots.get(slotId)!.bookings.push(booking);
  }
}

console.log(`Slots creados: ${allSlots.size}`);
console.log('');

allSlots.forEach((slot, slotId) => {
  // Simular getSlotDisplayName con el nuevo algoritmo
  const allTechniques: string[] = [];
  for (const booking of slot.bookings) {
    if (booking.groupClassMetadata?.techniqueAssignments?.length > 0) {
      for (const a of booking.groupClassMetadata.techniqueAssignments) {
        allTechniques.push(getTechniqueName(a.technique));
      }
    } else {
      allTechniques.push(getBookingDisplayName(booking));
    }
  }
  const uniqueTechniques = [...new Set(allTechniques)];
  const displayName = uniqueTechniques.length === 1 
    ? uniqueTechniques[0] 
    : `Mixto (${uniqueTechniques.length} tipos)`;
  
  const totalParticipants = slot.bookings.reduce((sum: number, b: any) => sum + b.participants, 0);
  
  console.log(`📅 Slot: ${slotId}`);
  console.log(`   Nombre mostrado: ${displayName}`);
  console.log(`   Participantes: ${totalParticipants}/8 booked`);
  console.log(`   Técnicas: ${uniqueTechniques.join(', ')}`);
  console.log(`   Bookings:`);
  slot.bookings.forEach((b: any) => {
    console.log(`     - ${b.name} (${b.participants}p) → ${getBookingDisplayName(b)}`);
  });
  console.log('');
});

console.log('='.repeat(80));
console.log('RESULTADO ESPERADO:');
console.log('='.repeat(80));
console.log('');
console.log('✅ UN SOLO slot para las 09:00 (no 2-3 tarjetas separadas)');
console.log('✅ Nombre: "Mixto (3 tipos)" porque hay 3 técnicas diferentes');
console.log('✅ Total: 6/8 booked (2+2+1+1 = 6 participantes)');
console.log('✅ Técnicas mostradas: Clase Suelta, Modelado a Mano, Torno Alfarero');
console.log('');

if (allSlots.size === 1) {
  console.log('🎉 FIX VERIFICADO: Solo se creó 1 slot');
} else {
  console.log('❌ PROBLEMA: Se crearon múltiples slots');
}
