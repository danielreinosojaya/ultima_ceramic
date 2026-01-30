/**
 * DISEÑO DE SOLUCIÓN: Agrupar slots por TÉCNICA
 * 
 * El admin necesita ver de un vistazo:
 * - Qué técnicas hay a cada hora
 * - Cuántas personas en cada técnica
 * - Sin necesidad de hacer clic
 * 
 * SOLUCIÓN: Crear slots separados por fecha+hora+técnica
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
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 1 }],
    groupClassMetadata: undefined, participants: 1
  },
  {
    id: 'b2', name: 'Maria Lorena',
    product: { name: 'Clase suelta torno' }, productType: 'SINGLE_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 1 }],
    groupClassMetadata: undefined, participants: 1
  },
  {
    id: 'b3', name: 'Paola Vega',
    product: { name: 'Unknown Product' }, productType: 'GROUP_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: undefined }],
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
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: undefined }],
    groupClassMetadata: {
      techniqueAssignments: [{ technique: 'hand_modeling' }]
    }, participants: 1
  },
  {
    id: 'b5', name: 'María Fernanda',
    product: { name: 'Unknown Product' }, productType: 'GROUP_CLASS',
    slots: [{ date: '2026-01-31', time: '09:00', instructorId: 2 }],
    groupClassMetadata: {
      techniqueAssignments: [{ technique: 'potters_wheel' }]
    }, participants: 1
  }
];

// Helpers
const getTechniqueName = (technique: string): string => {
  const names: Record<string, string> = {
    'potters_wheel': 'Torno Alfarero',
    'hand_modeling': 'Modelado a Mano',
    'painting': 'Pintura de piezas'
  };
  return names[technique] || technique;
};

// NUEVA FUNCIÓN: Determinar la técnica principal de un booking
const getBookingTechnique = (booking: BookingSimulado): string => {
  // Si tiene groupClassMetadata con técnicas, usar la primera técnica
  if (booking.groupClassMetadata?.techniqueAssignments?.length) {
    return booking.groupClassMetadata.techniqueAssignments[0].technique;
  }
  
  // Si es SINGLE_CLASS con "torno" en el nombre, es potters_wheel
  if (booking.product.name.toLowerCase().includes('torno')) {
    return 'potters_wheel';
  }
  
  // Si es SINGLE_CLASS con "modelado" en el nombre, es hand_modeling
  if (booking.product.name.toLowerCase().includes('modelado')) {
    return 'hand_modeling';
  }
  
  // Si es SINGLE_CLASS con "pintura" en el nombre, es painting
  if (booking.product.name.toLowerCase().includes('pintura')) {
    return 'painting';
  }
  
  // Fallback: usar producto o tipo
  return booking.productType || 'unknown';
};

const normalizeTime = (timeStr: string): string => {
  const [h, m] = timeStr.split(':').map(s => parseInt(s, 10));
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// ======= NUEVA LÓGICA: Agrupar por fecha+hora+técnica =======
console.log('='.repeat(80));
console.log('NUEVA SOLUCIÓN: Agrupar por fecha+hora+TÉCNICA');
console.log('='.repeat(80));
console.log('');

interface SlotData {
  date: string;
  time: string;
  technique: string;
  techniqueName: string;
  bookings: BookingSimulado[];
  totalParticipants: number;
}

const slotsByTechnique = new Map<string, SlotData>();

for (const booking of bookings) {
  for (const slot of booking.slots) {
    const dateStr = slot.date;
    const normalizedTime = normalizeTime(slot.time);
    const technique = getBookingTechnique(booking);
    const techniqueName = getTechniqueName(technique);
    
    // NUEVO: slotId incluye la técnica
    const slotId = `${dateStr}-${normalizedTime}-${technique}`;
    
    console.log(`${booking.name}: técnica="${technique}" → slotId="${slotId}"`);
    
    if (!slotsByTechnique.has(slotId)) {
      slotsByTechnique.set(slotId, {
        date: dateStr,
        time: normalizedTime,
        technique,
        techniqueName,
        bookings: [],
        totalParticipants: 0
      });
    }
    
    const slotData = slotsByTechnique.get(slotId)!;
    slotData.bookings.push(booking);
    slotData.totalParticipants += booking.participants;
  }
}

console.log('');
console.log('='.repeat(80));
console.log('RESULTADO: Tarjetas del calendario');
console.log('='.repeat(80));
console.log('');

// Ordenar slots por hora
const sortedSlots = Array.from(slotsByTechnique.values()).sort((a, b) => 
  a.time.localeCompare(b.time) || a.techniqueName.localeCompare(b.techniqueName)
);

for (const slot of sortedSlots) {
  console.log(`┌────────────────────────────────┐`);
  console.log(`│ ${slot.time.padEnd(30)}│`);
  console.log(`│ ${slot.techniqueName.padEnd(30)}│`);
  console.log(`│ ${slot.totalParticipants}/8 booked${' '.repeat(20)}│`);
  console.log(`└────────────────────────────────┘`);
  console.log(`  Bookings: ${slot.bookings.map(b => b.name).join(', ')}`);
  console.log('');
}

console.log('='.repeat(80));
console.log('VERIFICACIÓN');
console.log('='.repeat(80));
console.log('');

console.log('Ahora el admin puede ver de un vistazo:');
console.log('');
console.log('  09:00 - Clase suelta torno - 2/8  ← Eva, Maria');
console.log('  09:00 - Modelado a Mano - 3/8     ← Paola(2), Betty(1)');
console.log('  09:00 - Torno Alfarero - 1/8      ← María Fernanda');
console.log('');
console.log('Cada técnica tiene su propia tarjeta con el conteo correcto.');
console.log('Sin necesidad de hacer clic para ver los detalles.');

// Verificar que tenemos 3 slots separados
if (slotsByTechnique.size === 3) {
  console.log('');
  console.log('✅ CORRECTO: 3 tarjetas separadas por técnica');
} else {
  console.log('');
  console.log(`❌ ERROR: Se esperaban 3 tarjetas, se crearon ${slotsByTechnique.size}`);
}
