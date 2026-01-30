/**
 * SOLUCIÓN REFINADA: Agrupar por producto/técnica normalizado
 * 
 * Problema identificado:
 * - "Clase suelta torno" (SINGLE_CLASS) y "Torno Alfarero" (GROUP_CLASS) 
 *   son diferentes productos aunque usen la misma técnica
 * 
 * SOLUCIÓN: Usar el nombre del display (getBookingDisplayName) como clave de agrupación
 */

interface BookingSimulado {
  id: string;
  name: string;
  product: { name: string };
  productType: string;
  slots: { date: string; time: string; instructorId?: number }[];
  groupClassMetadata?: {
    techniqueAssignments?: { technique: string }[];
  };
  participants: number;
}

const bookings: BookingSimulado[] = [
  {
    id: 'b1', name: 'Eva Ninoska',
    product: { name: 'Clase suelta torno' }, productType: 'SINGLE_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00' }],
    groupClassMetadata: undefined, participants: 1
  },
  {
    id: 'b2', name: 'Maria Lorena',
    product: { name: 'Clase suelta torno' }, productType: 'SINGLE_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00' }],
    groupClassMetadata: undefined, participants: 1
  },
  {
    id: 'b3', name: 'Paola Vega',
    product: { name: 'Unknown Product' }, productType: 'GROUP_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00' }],
    groupClassMetadata: {
      techniqueAssignments: [
        { technique: 'hand_modeling' },
        { technique: 'hand_modeling' }
      ]
    }, participants: 2
  },
  {
    id: 'b4', name: 'Betty Martinez',
    product: { name: 'Unknown Product' }, productType: 'GROUP_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00' }],
    groupClassMetadata: {
      techniqueAssignments: [{ technique: 'hand_modeling' }]
    }, participants: 1
  },
  {
    id: 'b5', name: 'María Fernanda',
    product: { name: 'Unknown Product' }, productType: 'GROUP_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00' }],
    groupClassMetadata: {
      techniqueAssignments: [{ technique: 'potters_wheel' }]
    }, participants: 1
  }
];

// Helpers (idénticos a ScheduleManager)
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

// Esta es la función clave: obtiene el nombre de display para agrupar
const getBookingDisplayName = (booking: BookingSimulado): string => {
  // Si tiene groupClassMetadata con técnicas, usar la técnica
  if (booking.groupClassMetadata?.techniqueAssignments?.length) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    if (uniqueTechniques.length === 1) {
      return getTechniqueName(uniqueTechniques[0] as string);
    }
    return 'Clase Grupal (mixto)';
  }
  
  // Si no tiene metadata, usar el nombre del producto (si es válido)
  const productName = booking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown') {
    return productName;
  }
  
  // Fallback: usar tipo de producto
  return getProductTypeName(booking.productType);
};

const normalizeTime = (timeStr: string): string => {
  const [h, m] = timeStr.split(':').map(s => parseInt(s, 10));
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// ======= SOLUCIÓN FINAL: Agrupar por fecha+hora+displayName =======
console.log('='.repeat(80));
console.log('SOLUCIÓN FINAL: Agrupar por fecha+hora+displayName');
console.log('='.repeat(80));
console.log('');

interface SlotData {
  date: string;
  time: string;
  displayName: string;
  bookings: BookingSimulado[];
  totalParticipants: number;
}

const slotsByDisplayName = new Map<string, SlotData>();

for (const booking of bookings) {
  for (const slot of booking.slots) {
    const dateStr = slot.date;
    const normalizedTime = normalizeTime(slot.time);
    const displayName = getBookingDisplayName(booking);
    
    // slotId usa el displayName como clave de agrupación
    const slotId = `${dateStr}-${normalizedTime}-${displayName}`;
    
    console.log(`${booking.name}: displayName="${displayName}" → slotId="${slotId}"`);
    
    if (!slotsByDisplayName.has(slotId)) {
      slotsByDisplayName.set(slotId, {
        date: dateStr,
        time: normalizedTime,
        displayName,
        bookings: [],
        totalParticipants: 0
      });
    }
    
    const slotData = slotsByDisplayName.get(slotId)!;
    slotData.bookings.push(booking);
    slotData.totalParticipants += booking.participants;
  }
}

console.log('');
console.log('='.repeat(80));
console.log('RESULTADO: Tarjetas del calendario (SÁB 31)');
console.log('='.repeat(80));
console.log('');

// Ordenar slots por hora y luego por nombre
const sortedSlots = Array.from(slotsByDisplayName.values()).sort((a, b) => 
  a.time.localeCompare(b.time) || a.displayName.localeCompare(b.displayName)
);

for (const slot of sortedSlots) {
  const capacity = 8;
  console.log(`┌────────────────────────────────┐`);
  console.log(`│ ${slot.time}                            │`);
  console.log(`│ ${slot.displayName.padEnd(30)}│`);
  console.log(`│ ${slot.totalParticipants}/${capacity} booked${' '.repeat(20)}│`);
  console.log(`└────────────────────────────────┘`);
  console.log(`  → ${slot.bookings.map(b => `${b.name}(${b.participants})`).join(', ')}`);
  console.log('');
}

console.log('='.repeat(80));
console.log('VERIFICACIÓN vs PDF');
console.log('='.repeat(80));
console.log('');
console.log('PDF dice (a las 09:00):');
console.log('  - Eva Ninoska (1) - Clase suelta torno');
console.log('  - Maria Lorena (1) - Clase suelta torno');
console.log('  - Paola Vega (2) - Modelado a Mano');
console.log('  - Betty Martinez (1) - Modelado a Mano');
console.log('  - María Fernanda (1) - Torno Alfarero');
console.log('');

// Verificar
const expected = [
  { name: 'Clase suelta torno', count: 2 },
  { name: 'Modelado a Mano', count: 3 },
  { name: 'Torno Alfarero', count: 1 }
];

let allCorrect = true;
for (const exp of expected) {
  const found = sortedSlots.find(s => s.displayName === exp.name);
  if (found && found.totalParticipants === exp.count) {
    console.log(`✅ ${exp.name}: ${exp.count} participantes - CORRECTO`);
  } else {
    console.log(`❌ ${exp.name}: esperado ${exp.count}, encontrado ${found?.totalParticipants || 0}`);
    allCorrect = false;
  }
}

console.log('');
if (allCorrect && slotsByDisplayName.size === 3) {
  console.log('🎉 SOLUCIÓN VERIFICADA: 3 tarjetas con conteos correctos');
} else {
  console.log(`❌ PROBLEMA: ${slotsByDisplayName.size} tarjetas creadas`);
}
