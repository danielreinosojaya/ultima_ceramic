import type { Product, AvailableSlot, Instructor, ConfirmationMessage, ClassCapacity, CapacityMessageSettings, DayKey, FooterInfo, AutomationSettings, BankDetails } from './types.js';

export const SINGLE_CLASS_PRICE = 55;
export const VAT_RATE = 0.15;

// Servicio de Pintura de Piezas (Upsell)
export const PAINTING_SERVICE_PRICE = 20; // Precio base del servicio de pintura por pieza

export const PALETTE_COLORS = [
    { name: 'sky', bg: 'bg-sky-200', text: 'text-sky-800' },
    { name: 'teal', bg: 'bg-teal-200', text: 'text-teal-800' },
    { name: 'rose', bg: 'bg-rose-200', text: 'text-rose-800' },
    { name: 'indigo', bg: 'bg-indigo-200', text: 'text-indigo-800' },
    { name: 'amber', bg: 'bg-amber-200', text: 'text-amber-800' },
    { name: 'secondary', bg: 'bg-gray-200', text: 'text-gray-600' }
];

export const COUNTRIES = [
    { name: 'Ecuador', code: '+593', flag: '🇪🇨' },
    { name: 'Peru', code: '+51', flag: '🇵🇪' },
    { name: 'Argentina', code: '+54', flag: '🇦🇷' },
    { name: 'Australia', code: '+61', flag: '🇦🇺' },
    { name: 'Austria', code: '+43', flag: '🇦🇹' },
    { name: 'Belgium', code: '+32', flag: '🇧🇪' },
    { name: 'Bolivia', code: '+591', flag: '🇧🇴' },
    { name: 'Brazil', code: '+55', flag: '🇧🇷' },
    { name: 'Canada', code: '+1', flag: '🇨🇦' },
    { name: 'Chile', code: '+56', flag: '🇨🇱' },
    { name: 'China', code: '+86', flag: '🇨🇳' },
    { name: 'Colombia', code: '+57', flag: '🇨🇴' },
    { name: 'Costa Rica', code: '+506', flag: '🇨🇷' },
    { name: 'Denmark', code: '+45', flag: '🇩🇰' },
    { name: 'Finland', code: '+358', flag: '🇫🇮' },
    { name: 'France', code: '+33', flag: '🇫🇷' },
    { name: 'Germany', code: '+49', flag: '🇩🇪' },
    { name: 'Greece', code: '+30', flag: '🇬🇷' },
    { name: 'India', code: '+91', flag: '🇮🇳' },
    { name: 'Ireland', code: '+353', flag: '🇮🇪' },
    { name: 'Italy', code: '+39', flag: '🇮🇹' },
    { name: 'Japan', code: '+81', flag: '🇯🇵' },
    { name: 'Mexico', code: '+52', flag: '🇲🇽' },
    { name: 'Netherlands', code: '+31', flag: '🇳🇱' },
    { name: 'New Zealand', code: '+64', flag: '🇳🇿' },
    { name: 'Norway', code: '+47', flag: '🇳🇴' },
    { name: 'Panama', code: '+507', flag: '🇵🇦' },
    { name: 'Paraguay', code: '+595', flag: '🇵🇾' },
    { name: 'Portugal', code: '+351', flag: '🇵🇹' },
    { name: 'South Korea', code: '+82', flag: '🇰🇷' },
    { name: 'Spain', code: '+34', flag: '🇪🇸' },
    { name: 'Sweden', code: '+46', flag: '🇸🇪' },
    { name: 'Switzerland', code: '+41', flag: '🇨🇭' },
    { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
    { name: 'USA', code: '+1', flag: '🇺🇸' },
    { name: 'Uruguay', code: '+598', flag: '🇺🇾' },
    { name: 'Venezuela', code: '+58', flag: '🇻🇪' },
];

export const DAY_NAMES: DayKey[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "1",
    type: 'CLASS_PACKAGE',
    name: "Torno para Principiantes",
    classes: 4,
    price: 250,
    description: "Una introducción perfecta a los conceptos básicos del torno de alfarero.",
    imageUrl: "https://images.unsplash.com/photo-1554203198-0c19e710032b?q=80&w=1974&auto=format&fit=crop",
    details: {
      technique: 'potters_wheel',
      duration: "2 horas por clase",
      durationHours: 2,
      activities: ["Amasado y preparación de la arcilla", "Centrado de la pella en el torno", "Creación de cilindros y cuencos básicos", "Técnicas de retoque y acabado"],
      generalRecommendations: "Traer ropa cómoda que se pueda ensuciar, uñas cortas y el pelo recogido. ¡Muchas ganas de aprender!",
      materials: "Incluye toda la arcilla necesaria para las clases y el uso de herramientas del taller."
    },
    isActive: true
  },
    {
      id: "7",
      type: 'SINGLE_CLASS',
      name: "Clase Individual de Torno",
      classes: 1,
      price: 70,
      description: "Clase personalizada de torno para todos los niveles. Ideal para quienes buscan atención individual y avanzar a su ritmo.",
      imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1974&auto=format&fit=crop",
      details: {
        technique: 'potters_wheel',
        duration: "2 horas",
        durationHours: 2,
        activities: ["Amasado y preparación de la arcilla", "Centrado en el torno", "Creación de piezas según el nivel del alumno"],
        generalRecommendations: "Traer ropa cómoda y muchas ganas de aprender. Clase adaptada al nivel del participante.",
        materials: "Incluye arcilla, herramientas y quema de una pieza."
      },
      isActive: true
    },
    {
  id: "8",
      type: 'SINGLE_CLASS',
      name: "Clase Individual de Modelado",
      classes: 1,
      price: 65,
      description: "Clase personalizada de modelado manual para explorar técnicas y creatividad en cerámica.",
      imageUrl: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=1974&auto=format&fit=crop",
      details: {
        technique: 'molding',
        duration: "2 horas",
        durationHours: 2,
        activities: ["Técnica del pellizco", "Churros", "Planchas", "Decoración personalizada"],
        generalRecommendations: "No se requiere experiencia previa. Clase adaptada a los intereses del alumno.",
        materials: "Incluye arcilla, herramientas y quema de una pieza."
      },
      isActive: true
    },
  {
   id: "2",
    type: 'CLASS_PACKAGE',
    name: "Paquete de 4 Clases de Modelado",
    classes: 4,
    price: 220,
    description: "Explora tu creatividad sin el torno, creando piezas únicas con técnicas manuales.",
    imageUrl: "https://images.unsplash.com/photo-1565260524946-151243b3b4f9?q=80&w=1974&auto=format&fit=crop",
    details: {
      technique: 'molding',
      duration: "2 horas por clase",
      durationHours: 2,
      activities: ["Técnica del pellizco", "Construcción con churros", "Creación con planchas", "Esgrafiado y decoración"],
      generalRecommendations: "Ideal para quienes buscan una experiencia más escultórica y libre. No se requiere experiencia previa.",
      materials: "Incluye arcilla, herramientas y la quema de hasta 4 piezas medianas."
    },
    isActive: true
  },
  {
    id: "3",
    type: 'OPEN_STUDIO_SUBSCRIPTION',
    name: "Acceso a Estudio Abierto",
    price: 150,
    description: "Tu espacio para crear. Accede al taller y a todas las herramientas para tus proyectos personales.",
    imageUrl: "https://images.unsplash.com/photo-1548897501-195b095e72b4?q=80&w=1939&auto=format&fit=crop",
    details: {
      durationDays: 30,
      timeLimit: "Sin límites de horarios (según disponibilidad)",
      materialsLimit: "12 libras de pasta cerámica incluidas. Esmaltes de alta temperatura suficientes para tus 12 libras.",
      howItWorks: [
        "Uso de equipos: Acceso a torno alfarero, mesas de trabajo para modelado a mano, extrusora y áreas de secado.",
        "Herramientas: Alambres de corte, esponjas, estecas, agujas, espátulas, raspadores, tornetas, variedad de sellos y cortadores.",
        "Pasta cerámica adicional: Disponible para compra en el estudio. Por políticas de calidad, no se permite traer pasta de otros proveedores.",
        "Esmaltes: Incluimos esmaltes para tus 12 libras. ¿Tienes esmaltes propios? Puedes traerlos, solo necesitamos hacer una prueba previa para confirmar que sean compatibles con nuestras quemas de alta temperatura.",
        "Servicio de horno: Cocción de bizcocho y esmalte de alta temperatura incluidos.",
        "Comunidad: Un ambiente colaborativo donde compartir ideas, técnicas y experiencias con otros ceramistas."
      ]
    },
    isActive: true
  },
  {
   id: "5",
    type: 'GROUP_EXPERIENCE',
    name: "Experiencia Grupal en Cerámica",
    description: "Celebra un cumpleaños, un evento de team building o simplemente una reunión creativa con amigos. Una experiencia privada y memorable.",
    imageUrl: "https://images.unsplash.com/photo-1516592673884-4a382d112b03?q=80&w=2070&auto=format&fit=crop",
    isActive: true
  },
  {
    id: "6",
    type: 'COUPLES_EXPERIENCE',
    name: "Experiencia en Pareja",
    description: "Una cita creativa y diferente. Moldeen una pieza juntos en el torno o creen piezas individuales, con la guía de un instructor.",
    imageUrl: "https://images.unsplash.com/photo-1620531579344-59e514a331a3?q=80&w=1964&auto=format&fit=crop",
    price: 190,
    details: {
      duration: "2 horas",
      durationHours: 2,
      activities: [],
      generalRecommendations: "Llega 15 minutos antes",
      materials: "Incluidos: arcilla, agua, herramientas, vino y piqueos",
      technique: 'potters_wheel'
    },
    schedulingRules: [],
    overrides: [],
    isActive: true
  },
  {
    id: "GROUP_CLASS_PROD",
    type: 'GROUP_CLASS',
    name: "Experiencia Personalizada",
    price: 0, // Precio dinámico calculado: pricePerPerson × totalParticipants
    description: "Reúne a tu grupo y diseña la clase perfecta. Cada persona elige su técnica: torno, modelado o pintura.",
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2070&auto=format&fit=crop",
    minParticipants: 2,
    pricePerPerson: 15,
    details: {
      technique: 'potters_wheel', // Default, se sobreescribe con las técnicas individuales
      duration: "2 horas",
      durationHours: 2,
      activities: ["Cada participante elige su técnica", "Amasado y preparación", "Creación de piezas personalizadas", "Técnicas de acabado"],
      generalRecommendations: "Ideal para grupos de 2-30 personas. Traer ropa cómoda. Perfecto para celebraciones, eventos corporativos o reuniones creativas.",
      materials: "Incluye arcilla, herramientas y quema de una pieza por participante. Capacidades: Torno (máx 8), Modelado (máx 22), Pintura (máx 22)."
    },
    isActive: true,
    sortOrder: 5
  }
];

export const DEFAULT_INSTRUCTORS: Instructor[] = [
  { id: 1, name: "Caro", colorScheme: "rose" },
  { id: 2, name: "Ana", colorScheme: "teal" },
  { id: 3, name: "Lucia", colorScheme: "amber" }
];

export const DEFAULT_AVAILABLE_SLOTS_BY_DAY: Record<DayKey, AvailableSlot[]> = {
  Sunday: [
    { time: '10:00', instructorId: 1, technique: 'molding' },
    { time: '12:00', instructorId: 2, technique: 'molding' },
    { time: '14:00', instructorId: 3, technique: 'molding' }
  ],
  Monday: [], // ❌ CERRADO - Sin clases de pintura los lunes
  Tuesday: [
    { time: '10:00', instructorId: 1, technique: 'molding' },
    { time: '12:00', instructorId: 2, technique: 'molding' },
    { time: '14:00', instructorId: 3, technique: 'molding' },
    { time: '16:00', instructorId: 1, technique: 'molding' },
    { time: '18:00', instructorId: 2, technique: 'molding' }
  ],
  Wednesday: [
    { time: '10:00', instructorId: 1, technique: 'molding' },
    { time: '12:00', instructorId: 2, technique: 'molding' },
    { time: '14:00', instructorId: 3, technique: 'molding' },
    { time: '16:00', instructorId: 1, technique: 'molding' },
    { time: '18:00', instructorId: 2, technique: 'molding' }
  ],
  Thursday: [
    { time: '10:00', instructorId: 2, technique: 'molding' },
    { time: '12:00', instructorId: 3, technique: 'molding' },
    { time: '14:00', instructorId: 1, technique: 'molding' },
    { time: '16:00', instructorId: 2, technique: 'molding' },
    { time: '18:00', instructorId: 3, technique: 'molding' }
  ],
  Friday: [
    { time: '10:00', instructorId: 1, technique: 'molding' },
    { time: '12:00', instructorId: 2, technique: 'molding' },
    { time: '14:00', instructorId: 3, technique: 'molding' },
    { time: '16:00', instructorId: 1, technique: 'molding' },
    { time: '18:00', instructorId: 2, technique: 'molding' }
  ],
  Saturday: [
    { time: '09:00', instructorId: 3, technique: 'molding' },
    { time: '11:00', instructorId: 1, technique: 'molding' },
    { time: '13:00', instructorId: 2, technique: 'molding' },
    { time: '15:00', instructorId: 3, technique: 'molding' },
    { time: '17:00', instructorId: 1, technique: 'molding' }
  ]
};

export const DEFAULT_POLICIES_TEXT = `Políticas de Cancelación y Reprogramación:
- Se requiere un aviso de al menos 72 horas para reprogramar una clase sin penalización.
- Las cancelaciones con menos de 72 horas de antelación no son reembolsables.
- Los paquetes de clases deben completarse desde la fecha de la primera clase agendada:
  · Paquete de 4 clases: máximo 4 semanas.
  · Paquete de 8 clases: máximo 2 meses.
  · Paquete de 12 clases: máximo 3 meses.

Proceso de Devoluciones:
- No se realizan devoluciones monetarias una vez comprado un paquete o clase.
- Se puede ofrecer crédito en la tienda para futuras clases si la cancelación cumple con nuestras políticas.`;

export const DEFAULT_CONFIRMATION_MESSAGE: ConfirmationMessage = {
  title: "¡Pre-reserva Exitosa!",
  message: "¡Tu lugar está guardado! Completa el último paso para activar tu reserva."
};

export const DEFAULT_CLASS_CAPACITY: ClassCapacity = {
    potters_wheel: 8,
    molding: 8,
    introductory_class: 6
};

export const DEFAULT_CAPACITY_MESSAGES: CapacityMessageSettings = {
    thresholds: [
        { level: 'available', threshold: 0, message: '¡Cupos disponibles!' },
        { level: 'few', threshold: 50, message: '¡Quedan pocos cupos!' },
        { level: 'last', threshold: 80, message: '¡Últimos cupos!' }
    ]
};

export const DEFAULT_FOOTER_INFO: FooterInfo = {
    address: "123 Calle de la Cerámica, Miraflores, Lima",
    email: "hola@ceramicalma.com",
    whatsapp: "+51 987 654 321",
    googleMapsLink: "https://maps.google.com",
    instagramHandle: "@ceramicalma"
};

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
    preBookingConfirmation: { enabled: true },
    paymentReceipt: { enabled: true },
    classReminder: { enabled: true, value: 24, unit: 'hours' },
    incentiveRenewal: { enabled: false, value: 1, unit: 'classes' }
};

export const DEFAULT_BANK_DETAILS: BankDetails[] = [
    {
        bankName: "Banco Pichincha",
        accountHolder: "Carolina Massuh Morán",
        accountNumber: "2100334248",
        accountType: "Cuenta Corriente",
        taxId: "0921343935"
    },
    {
        bankName: "Banco Bolivariano",
        accountHolder: "Carolina Isabel Massuh Moran",
        accountNumber: "0004381834",
        accountType: "Ahorros",
        taxId: "0921343935"
    }
];