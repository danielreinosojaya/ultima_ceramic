import type { Product, AvailableSlot, Instructor, ConfirmationMessage, ClassCapacity, CapacityMessageSettings, DayKey, FooterInfo, AutomationSettings, BankDetails } from './types.js';

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
    id: 1,
    type: 'CLASS_PACKAGE',
    name: "Torno para Principiantes",
    classes: 4,
    price: 250,
    description: "Una introducción perfecta a los conceptos básicos del torno de alfarero.",
    imageUrl: "https://images.unsplash.com/photo-1554203198-0c19e710032b?q=80&w=1974&auto=format&fit=crop",
    details: {
      duration: "2 horas por clase",
      durationHours: 2,
      activities: ["Amasado y preparación de la arcilla", "Centrado de la pella en el torno", "Creación de cilindros y cuencos básicos", "Técnicas de retoque y acabado"],
      generalRecommendations: "Traer ropa cómoda que se pueda ensuciar, uñas cortas y el pelo recogido. ¡Muchas ganas de aprender!",
      materials: "Incluye toda la arcilla necesaria para las clases y el uso de herramientas del taller."
    },
    isActive: true
  },
  {
    id: 2,
    type: 'CLASS_PACKAGE',
    name: "Paquete de 8 Clases Libres",
    classes: 8,
    price: 450,
    description: "Perfecciona tu técnica y desarrolla proyectos personales con más tiempo en el torno.",
    imageUrl: "https://images.unsplash.com/photo-1605416325121-875b3d3f925c?q=80&w=2070&auto=format&fit=crop",
    details: {
      duration: "2.5 horas por clase",
      durationHours: 2.5,
      activities: ["Desarrollo de proyectos personales", "Técnicas avanzadas de torneado", "Retorneado de piezas complejas", "Introducción al esmaltado"],
      generalRecommendations: "Ideal para alumnos que ya completaron el curso de principiantes. Traer ideas y bocetos.",
      materials: "Incluye 1 bolsa de arcilla y acceso a una variedad de esmaltes del taller."
    },
    isActive: true
  },
  {
    id: 3,
    type: 'OPEN_STUDIO_SUBSCRIPTION',
    name: "Acceso a Estudio Abierto",
    price: 150,
    description: "Tu espacio para crear. Accede al taller y a todas las herramientas para tus proyectos personales.",
    imageUrl: "https://images.unsplash.com/photo-1548897501-195b095e72b4?q=80&w=1939&auto=format&fit=crop",
    details: {
      durationDays: 30,
      timeLimit: "Hasta 10 horas por semana durante el horario de estudio abierto.",
      materialsLimit: "La primera bolsa de arcilla está incluida. Las adicionales tienen costo extra.",
      howItWorks: ["Reserva tu horario en el torno vía WhatsApp.", "Acceso a todas las herramientas y estanterías.", "Quemas de piezas se coordinan y pagan por separado."]
    },
    isActive: true
  },
  {
    id: 4,
    type: 'INTRODUCTORY_CLASS',
    name: "Clase Introductoria al Torno",
    price: 75,
    description: "Una experiencia única para un primer contacto con la arcilla y el torno. ¡Ideal para principiantes!",
    imageUrl: "https://images.unsplash.com/photo-1578701925695-8a0327f495e0?q=80&w=1968&auto=format&fit=crop",
    details: {
      duration: "2.5 horas",
      durationHours: 2.5,
      activities: ["Demostración de amasado y centrado.", "Práctica guiada para crear tu primera pieza.", "Decoración básica con engobes.", "La pieza será esmaltada por el taller y estará lista en 3 semanas."],
      generalRecommendations: "¡Solo trae tu curiosidad! Nosotros nos encargamos del resto.",
      materials: "Todo incluido: arcilla, herramientas, delantal y la quema de una pieza."
    },
    isActive: true,
    schedulingRules: [
        { id: '6-1000-1', dayOfWeek: 6, time: '10:00', instructorId: 1, capacity: 6 },
        { id: '6-1500-2', dayOfWeek: 6, time: '15:00', instructorId: 2, capacity: 6 }
    ],
    overrides: []
  },
   {
    id: 5,
    type: 'GROUP_EXPERIENCE',
    name: "Experiencia Grupal en Cerámica",
    description: "Celebra un cumpleaños, un evento de team building o simplemente una reunión creativa con amigos. Una experiencia privada y memorable.",
    imageUrl: "https://images.unsplash.com/photo-1516592673884-4a382d112b03?q=80&w=2070&auto=format&fit=crop",
    isActive: true
  },
  {
    id: 6,
    type: 'COUPLES_EXPERIENCE',
    name: "Experiencia en Pareja",
    description: "Una cita creativa y diferente. Moldeen una pieza juntos en el torno o creen piezas individuales, con la guía de un instructor.",
    imageUrl: "https://images.unsplash.com/photo-1620531579344-59e514a331a3?q=80&w=1964&auto=format&fit=crop",
    isActive: true
  }
];

export const DEFAULT_INSTRUCTORS: Instructor[] = [
  { id: 1, name: "Caro", colorScheme: "rose" },
  { id: 2, name: "Ana", colorScheme: "teal" },
  { id: 3, name: "Lucia", colorScheme: "amber" }
];

export const DEFAULT_AVAILABLE_SLOTS_BY_DAY: Record<DayKey, AvailableSlot[]> = {
  Sunday: [],
  Monday: [{ time: '18:00', instructorId: 1 }, { time: '20:30', instructorId: 2 }],
  Tuesday: [{ time: '10:00', instructorId: 1 }, { time: '18:00', instructorId: 2 }],
  Wednesday: [{ time: '18:00', instructorId: 1 }, { time: '20:30', instructorId: 3 }],
  Thursday: [{ time: '10:00', instructorId: 2 }, { time: '18:00', instructorId: 3 }],
  Friday: [{ time: '17:00', instructorId: 1 }],
  Saturday: [{ time: '10:00', instructorId: 3 }, { time: '12:30', instructorId: 1 }],
};

export const DEFAULT_POLICIES_TEXT = `Políticas de Cancelación y Reprogramación:
- Se requiere un aviso de al menos 72 horas para reprogramar una clase sin penalización.
- Las cancelaciones con menos de 72 horas de antelación no son reembolsables.
- Los paquetes de clases tienen una validez de 30 días desde la fecha de la primera clase agendada.

Proceso de Devoluciones:
- No se realizan devoluciones monetarias una vez comprado un paquete o clase.
- Se puede ofrecer crédito en la tienda para futuras clases si la cancelación cumple con nuestras políticas.`;

export const DEFAULT_CONFIRMATION_MESSAGE: ConfirmationMessage = {
  title: "¡Pre-reserva Exitosa!",
  message: "¡Tu lugar está guardado! Completa el último paso para activar tu reserva."
};

export const DEFAULT_CLASS_CAPACITY: ClassCapacity = { max: 8 };

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

export const DEFAULT_BANK_DETAILS: BankDetails = {
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    accountType: "",
    taxId: "",
    details: ""
};