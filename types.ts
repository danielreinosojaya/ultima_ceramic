// Basic Types
export type DayKey = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
export type AppView =
  | 'welcome'
  | 'techniques'
  | 'packages'
  | 'intro_classes'
  | 'schedule'
  | 'summary'
  | 'group_experience'
  | 'couples_experience'
  | 'team_building'
  | 'confirmation'
  | 'my-classes'
  | 'giftcard_landing'
  | 'giftcard_amount'
  | 'giftcard_personalization'
  | 'giftcard_delivery'
  | 'giftcard_payment'
  | 'giftcard_manual_payment'
  | 'giftcard_pending_review'
  | 'giftcard_confirmation'
  | 'giftcard_check_balance'
  | 'experience_type_selector'
  | 'group_class_wizard'
  | 'piece_experience_wizard'
  | 'single_class_wizard'
  | 'painting_booking'
  | 'experience_confirmation'
  | 'custom_experience_wizard'
  | 'wheel_course_landing'
  | 'wheel_course_schedule'
  | 'wheel_course_registration'
  | 'wheel_course_confirmation'
  | 'valentine_landing'
  | 'valentine_form'
  | 'valentine_success';
export type BookingMode = 'flexible' | 'monthly';
export type Technique = 'potters_wheel' | 'molding';


// User and Customer
export interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  birthday?: string | null;
}

// Delivery System Types
export type DeliveryStatus = 'pending' | 'ready' | 'completed' | 'overdue';
export type PaintingStatus = 'pending_payment' | 'paid' | 'scheduled' | 'completed';

export interface Delivery {
    id: string;
    customerEmail: string;
    description?: string; // Opcional - puede ser texto genérico si vacío
    scheduledDate: string; // ISO date string - fecha programada tentativa
    status: DeliveryStatus; // 'pending'=creada/sin comenzar, 'ready'=lista para recoger, 'completed'=entregada, 'overdue'=vencida
    createdAt: string; // ISO date string
    readyAt?: string | null; // ISO date string - fecha cuando se marcó como lista para recoger
    completedAt?: string | null; // ISO date string - fecha real de entrega
    deliveredAt?: string | null; // ISO date string - DEPRECATED: usar completedAt
    notes?: string | null;
    photos?: string[] | null; // Array de URLs de fotos
    hasPhotos?: boolean; // ⚡ Flag para lazy loading - indica si hay fotos sin cargarlas
    createdByClient?: boolean; // true si el cliente subió las fotos directamente
    // 🎨 Servicio de Pintura (Upsell)
    wantsPainting?: boolean; // Cliente manifestó intención de pintar pieza
    paintingPrice?: number | null; // Precio del servicio de pintura
    paintingStatus?: PaintingStatus | null; // Estado: pending_payment, paid, scheduled, completed
    paintingBookingDate?: string | null; // Fecha agendada para pintura
    paintingPaidAt?: string | null; // Timestamp cuando pagó servicio
    paintingCompletedAt?: string | null; // Timestamp cuando completó pintura
}

export interface Customer {
    email: string;
    userInfo: UserInfo;
    bookings: Booking[];
    totalBookings: number;
    totalSpent: number;
    lastBookingDate: Date;
    deliveries?: Delivery[];
}

export interface EditableBooking {
    userInfo: UserInfo;
    price: number;
}

// Products
export type ProductType = 'CLASS_PACKAGE' | 'OPEN_STUDIO_SUBSCRIPTION' | 'INTRODUCTORY_CLASS' | 'GROUP_EXPERIENCE' | 'COUPLES_EXPERIENCE' | 'SINGLE_CLASS' | 'GROUP_CLASS' | 'WHEEL_COURSE';

export interface ClassPackageDetails {
  duration: string;
  durationHours: number;
  activities: string[];
  generalRecommendations: string;
  materials: string;
  technique: Technique;
}

export interface OpenStudioSubscriptionDetails {
  durationDays: number;
  timeLimit: string;
  materialsLimit: string;
  howItWorks: string[];
}

export interface IntroductoryClassDetails extends ClassPackageDetails {}

// Wheel Course Types
export type CourseScheduleFormat = '3x2' | '2x3'; // 3 días x 2h o 2 días x 3h
export type SessionStatus = 'upcoming' | 'completed' | 'cancelled';
export type EnrollmentStatus = 'active' | 'completed' | 'dropped' | 'pending_payment';

export interface CourseSession {
  id: string;
  sessionNumber: number; // 1-6 o 1-3
  scheduledDate: string; // ISO date
  startTime: string; // "19:00"
  endTime: string; // "21:00"
  topic: string; // "Centrado y postura"
  instructorId: number;
  status: SessionStatus;
}

export interface CourseSchedule {
  id: string;
  format: CourseScheduleFormat;
  name: string; // "Noches" o "Mañanas"
  days: DayKey[]; // ['Tuesday', 'Wednesday', 'Thursday']
  startTime: string;
  endTime: string;
  startDate: string; // Fecha inicio del próximo ciclo
  capacity: number;
  currentEnrollments: number;
  sessions: CourseSession[];
}

export interface WheelCourseDetails {
  totalHours: number; // 6
  totalSessions: number; // 3 o 6
  pricePerHour: number; // 25
  availableSchedules: CourseSchedule[];
  curriculum: {
    sessionNumber: number;
    title: string;
    objectives: string[];
    duration: number; // horas
  }[];
}

export interface CourseEnrollment {
  id: string;
  studentEmail: string;
  studentInfo: UserInfo;
  courseScheduleId: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
  paymentStatus: 'full' | 'partial' | 'pending';
  amountPaid: number;
  sessions: {
    sessionId: string;
    attended: boolean;
    notes?: string;
    progressRating?: number; // 1-5
  }[];
  completedAt?: string | null;
  certificateIssued?: boolean;
}

export interface SchedulingRule {
  id: string;
  dayOfWeek: number;
  time: string; // "HH:mm"
  instructorId: number;
  capacity: number;
  technique?: Technique; // Para COUPLES_EXPERIENCE: 'potters_wheel' | 'molding'
}

export interface SessionOverride {
    date: string; // YYYY-MM-DD
    sessions: { time: string; instructorId: number; capacity: number }[] | null;
}

export interface BaseProduct {
    id: string;
    type: ProductType;
    name: string;
    description: string;
    imageUrl?: string;
    isActive: boolean;
    sortOrder?: number;
    price?: number; // Make price optional for all products
    details?: ClassPackageDetails | OpenStudioSubscriptionDetails; // Allow optional details
}

export interface ClassPackage extends BaseProduct {
    type: 'CLASS_PACKAGE';
    classes: number;
    price: number;
    details: ClassPackageDetails;
}

export interface SingleClass extends BaseProduct {
    type: 'SINGLE_CLASS';
    classes: 1;
    price: number;
    details: ClassPackageDetails;
}

export interface OpenStudioSubscription extends BaseProduct {
    type: 'OPEN_STUDIO_SUBSCRIPTION';
    price: number;
    details: OpenStudioSubscriptionDetails;
}

export interface IntroductoryClass extends BaseProduct {
    type: 'INTRODUCTORY_CLASS';
    price: number;
    details: IntroductoryClassDetails;
    schedulingRules: SchedulingRule[];
    overrides: SessionOverride[];
}

export interface GroupExperience extends BaseProduct {
    type: 'GROUP_EXPERIENCE';
}

export interface CouplesExperience extends BaseProduct {
    type: 'COUPLES_EXPERIENCE';
    price: number;
    details: ClassPackageDetails;
    schedulingRules: SchedulingRule[];
    overrides: SessionOverride[];
}

export interface GroupClass extends BaseProduct {
    type: 'GROUP_CLASS';
    minParticipants: number;
    pricePerPerson: number;
    details: ClassPackageDetails;
}

export type Product = ClassPackage | OpenStudioSubscription | IntroductoryClass | GroupExperience | CouplesExperience | SingleClass | GroupClass;


// Schedule & Booking
export interface TimeSlot {
  date: string; // YYYY-MM-DD
  time: string;
  instructorId: number;
  technique?: Technique; // Para COUPLES_EXPERIENCE: 'potters_wheel' | 'molding'
}

export interface AvailableSlot {
  time: string;
  instructorId: number;
  technique: Technique;
}

export interface EnrichedAvailableSlot extends AvailableSlot {
    paidBookingsCount: number;
    totalBookingsCount: number;
    maxCapacity: number;
}

export interface IntroClassSession {
    date: string;
    time: string;
    instructorId: number;
}

export interface EnrichedIntroClassSession {
    id: string;
    date: string;
    time: string;
    instructorId: number;
    capacity: number;
    paidBookingsCount: number;
    totalBookingsCount: number;
    isOverride: boolean;
}

// Horarios recurrentes (clases paquete)
export interface RecurringClassSlot {
  id: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Domingo, 1=Lunes, etc.
  startTime: string; // "17:00"
  endTime: string; // "19:00"
  technique: GroupTechnique;
  professorId: number;
  occupiedCapacity: number; // Cupos que ocupa en la clase
  isActive: boolean;
}

// Capacidad dinámica por técnica
export interface TechniqueCapacity {
  max: number;
  bookedInWindow: number;
  available: number;
  isAvailable: boolean;
}

// Información de solapamiento
export interface OverlappingClassInfo {
  id: string;
  time: string;
  technique: GroupTechnique;
  count: number;
  professeurName?: string;
}

// Slot dinámico cada 30 minutos con capacidad
export interface DynamicTimeSlot {
  id: string;
  date: string; // "2025-12-05"
  startTime: string; // "11:00"
  endTime: string; // "13:00"
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  professorId?: number | null;
  capacity: {
    potters_wheel: TechniqueCapacity;
    hand_modeling: TechniqueCapacity;
    painting: TechniqueCapacity;
  };
  overlappingSlots?: OverlappingClassInfo[];
}

// Lo que se muestra al cliente
export interface SlotDisplayInfo {
  date: string;
  startTime: string;
  endTime: string;
  professorName?: string;
  techniques: {
    potters_wheel: {
      available: number;
      total: number;
      bookedInWindow: number;
      isAvailable: boolean;
      overlappingClasses?: string[];
    };
    hand_modeling: {
      available: number;
      total: number;
      bookedInWindow: number;
      isAvailable: boolean;
      overlappingClasses?: string[];
    };
    painting: {
      available: number;
      total: number;
      bookedInWindow: number;
      isAvailable: boolean;
    };
  };
}

export type AttendanceStatus = 'attended' | 'no-show';

export interface PaymentDetails {
    id?: string;  // UUID único para identificar el pago (opcional para retrocompatibilidad)
    amount: number;
    method: 'Cash' | 'Card' | 'Transfer' | 'Giftcard' | 'Manual';
    receivedAt: string; // ISO date string
    giftcardAmount?: number;  // Monto pagado con giftcard (puede ser parcial)
    giftcardId?: string;      // ID de la giftcard usada
    metadata?: Record<string, any>;  // Datos adicionales (código, etc.)
}

export interface Booking {
    id: string;
    productId: string;
    productType: ProductType;
    product: Product;
    slots: TimeSlot[];
    userInfo: UserInfo;
    createdAt: Date;
    isPaid: boolean;
    price: number;
    bookingCode: string;
    bookingMode: BookingMode | null;
    customer?: Customer; // Adding customer to Booking
    // Si la reserva fue aceptada con la condición de "sin reembolsos ni reagendamientos" (para reservas <48h)
    acceptedNoRefund?: boolean;
    paymentDetails?: PaymentDetails[]; // Ensure it's treated as an array
    attendance?: Record<string, AttendanceStatus>; // key is `${date}_${time}`
    bookingDate: string;
    participants?: number;
    clientNote?: string;
    giftcardApplied?: boolean;
    giftcardRedeemedAmount?: number;
    giftcardId?: string;
    pendingBalance?: number;
    expiresAt?: Date; // Pre-reserva válida hasta esta fecha (NOW + 2 hours)
    status?: 'active' | 'expired' | 'paid'; // Estado de la reserva
    
    // COUPLES_EXPERIENCE specific
    technique?: Technique; // Técnica seleccionada para parejas
    
    // GROUP_CLASS specific
    groupClassMetadata?: GroupClassMetadata; // Metadata para experiencias personalizadas
    
    // RESCHEDULE POLICY for class packages
    rescheduleAllowance?: number; // Max veces que puede reagendar (basado en tipo paquete)
    rescheduleUsed?: number; // Cuántas veces ya reagendó
    rescheduleHistory?: RescheduleHistoryEntry[]; // Historial detallado de reagendamientos
    lastRescheduleAt?: string; // ISO timestamp del último reagendamiento

    // Propiedades derivadas
    date?: string; // Derivada de bookingDate
    time?: string; // Derivada de slots
}

// RESCHEDULE POLICY types
export interface RescheduleHistoryEntry {
    id: string;
    bookingId: string;
    fromSlot: TimeSlot;
    toSlot: TimeSlot;
    reason?: string; // Opcional: por qué se reagendó
    rescheduleCount: number; // Número de este reagendamiento (1, 2, 3...)
    timestamp: string; // ISO timestamp
    createdByAdmin?: boolean; // true si admin lo hizo, false si cliente
}

export interface ReschedulePolicy {
    packageClasses: number; // 4, 8, 12, etc.
    maxReschedules: number; // Allowance basado en clases
    hoursRequiredInAdvance: number; // 72 horas
    description: string; // "Paquete de 4 clases: 1 reagendamiento"
}

export interface BookingDetails {
  product: Product | null;
  slots: TimeSlot[];
  userInfo: UserInfo | null;
  technique?: Technique; // Para COUPLES_EXPERIENCE
  groupMetadata?: GroupClassMetadata; // Para GROUP_CLASS
}

export interface AddBookingResult {
    success: boolean;
    message: string;
    booking?: Booking;
}

export interface ScheduleOverrides {
  [date: string]: { // YYYY-MM-DD
    slots: AvailableSlot[] | null; // null to cancel all slots
    capacity?: number;
  }
}

export interface RescheduleSlotInfo {
    bookingId: string;
    slot: TimeSlot;
    attendeeName: string;
}

// Instructor
export interface Instructor {
  id: number;
  name: string;
  colorScheme: string;
}

// Inquiries
export type InquiryStatus = 'New' | 'Contacted' | 'Proposal Sent' | 'Confirmed' | 'Archived';

export interface GroupInquiry {
    id: string;
    name: string;
    email: string;
    phone: string;
    countryCode: string;
    participants: number;
    tentativeDate: string | null;
    tentativeTime: string | null;
    eventType: string;
    message: string;
    status: InquiryStatus;
    createdAt: string | null; // ISO date string
    inquiryType: 'group' | 'couple' | 'team_building';
}

export type InvoiceRequestStatus = 'Pending' | 'Processed';

export interface InvoiceRequest {
    id: string;
    bookingId: string;
    status: InvoiceRequestStatus;
    companyName: string;
    taxId: string;
    address: string;
    email: string;
    requestedAt: string; // ISO date string
    processedAt?: string; // ISO date string
    // Joined data from booking
    bookingCode?: string;
    userInfo?: UserInfo;
}

// App Settings & Data
export interface ConfirmationMessage {
  title: string;
  message: string;
}

export interface ClassCapacity {
  potters_wheel: number;
  molding: number;
  introductory_class: number;
}

export type CapacityLevel = 'available' | 'few' | 'last';
export interface CapacityThreshold {
    level: CapacityLevel;
    threshold: number;
    message: string;
}
export interface CapacityMessageSettings {
    thresholds: CapacityThreshold[];
}

export type UrgencyLevel = 'info' | 'warning' | 'urgent';
export interface Announcement {
  id: string;
  title: string;
  content: string;
  urgency: UrgencyLevel;
  createdAt: string; // ISO date string
}

export interface FooterInfo {
    address: string;
    email: string;
    whatsapp: string;
    googleMapsLink: string;
    instagramHandle: string;
}

export interface BankDetails {
    bankName?: string; // Adding bankName as optional
    accountHolder: string;
    accountNumber: string;
    accountType: string;
    taxId: string;
}

export type BankDetailsArray = BankDetails[];

export interface UITexts {
    [key: string]: any;
}

export interface UILabels {
    taxIdLabel: string; // "RUC", "Cédula", "Tax ID", etc.
}

export interface AutomationSettings {
    preBookingConfirmation: { enabled: boolean };
    paymentReceipt: { enabled: boolean };
    classReminder: { enabled: boolean; value: number; unit: 'hours' | 'days' };
    incentiveRenewal: { enabled: boolean; value: number; unit: 'classes' };
}

export interface BackgroundImageSetting {
    url: string;
    opacity: number;
    blendMode: 'normal' | 'multiply';
}
export interface BackgroundSettings {
    topLeft: BackgroundImageSetting | null;
    bottomRight: BackgroundImageSetting | null;
}

export interface AppData {
  products: Product[];
  instructors: Instructor[];
  availability: Record<DayKey, AvailableSlot[]>;
  scheduleOverrides: ScheduleOverrides;
  classCapacity: ClassCapacity;
  capacityMessages: CapacityMessageSettings;
  announcements: Announcement[];
  bookings: Booking[];
  policies: string;
  confirmationMessage: ConfirmationMessage;
  footerInfo: FooterInfo;
  bankDetails: BankDetails[];
  uiLabels?: UILabels;
  recurringClasses?: RecurringClassSlot[]; // Clases paquete recurrentes
}

// Admin & Notifications
export type AdminTab = 'calendar' | 'schedule' | 'products' | 'customers' | 'inquiries' | 'instructors' | 'settings' | 'schedule-settings' | 'communications' | 'financials' | 'invoicing';

export interface NavigationState {
    tab: AdminTab;
    targetId: string;
}

export interface Notification {
    id: string;
    type: 'new_booking' | 'new_inquiry' | 'new_invoice_request';
    targetId: string;
    userName: string;
    summary: string;
    timestamp: string | null;
    read: boolean;
}

export type ClientNotificationType = 'PRE_BOOKING_CONFIRMATION' | 'PAYMENT_RECEIPT' | 'CLASS_REMINDER';

export interface ClientNotification {
    id: string;
    createdAt: string | null; // ISO string
    clientName: string;
    clientEmail: string;
    type: ClientNotificationType;
    channel: 'Email' | 'WhatsApp';
    status: 'Sent' | 'Failed' | 'Pending';
    bookingCode: string;
    scheduledAt?: string; // ISO string
}

// Define DeliveryMethod type
export type DeliveryMethod = {
  type: 'email' | 'physical';
  data: Record<string, any>;
};

// Adjust activeGiftcardHold and appliedGiftcardHold types
export interface GiftcardHold {
  holdId?: string;
  expiresAt?: string;
  amount?: number;
  giftcardId?: string;
  code?: string;
}

// ==================== EXPERIENCE TYPES (NEW) ====================

// 1. Piece Type - for custom pottery pieces
export interface Piece {
  id: string;
  name: string;
  description?: string;
  category: string;
  basePrice: number;
  estimatedHours?: number;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 2. Group Booking Metadata
export interface GroupBookingMetadata {
  id: string;
  bookingId: string;
  groupSize: number;
  groupType?: string;
  isAutoConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

// 3. Experience Booking Metadata
export interface SelectedPiece {
  pieceId: string;
  pieceName: string;
  basePrice: number;
  quantity?: number;
}

export interface ExperienceBookingMetadata {
  id: string;
  bookingId: string;
  piecesSelected: SelectedPiece[];
  durationMinutes?: number;
  guidedOption?: 'none' | '60min' | '120min';
  totalPriceCalculated: number;
  createdAt: string;
  updatedAt: string;
}

// 4. Experience Confirmation
export interface ExperienceConfirmation {
  id: string;
  bookingId: string;
  status: 'pending' | 'confirmed' | 'rejected';
  confirmedByEmail?: string;
  confirmationReason?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

// 5. Booking Type Union
export type BookingType = 'individual' | 'group' | 'experience';

// 6. Extended Booking Interface
export interface BookingWithMetadata extends Booking {
  bookingType: BookingType;
  groupMetadata?: GroupBookingMetadata;
  experienceMetadata?: ExperienceBookingMetadata;
  experienceConfirmation?: ExperienceConfirmation;
  experienceConfirmationId?: string;
}

// 7. Group Class Configuration
export interface GroupClassConfig {
  minParticipants: number;
  maxParticipants: number;
  pricePerPerson: number;
  estimatedDuration: number; // in minutes
  instructorId?: number;
}

// 7a. Group Class Metadata (para guardar en bookings)
export interface GroupClassMetadata {
  totalParticipants: number;
  techniqueAssignments: ParticipantTechniqueAssignment[];
  pricePerPerson: number;
  totalPrice: number;
}

// 7a. Group Class Technique Types
export type GroupTechnique = 'hand_modeling' | 'potters_wheel' | 'painting';

export interface ParticipantTechniqueAssignment {
  participantNumber: number; // 1, 2, 3, ...
  technique: GroupTechnique;
  selectedPieceId?: string; // Only if technique is 'painting'
}

export interface GroupClassState {
  totalParticipants: number;
  participantAssignments: ParticipantTechniqueAssignment[];
  selectedSlot?: TimeSlot;
}

// Group Class Capacity Limits
export const GROUP_CLASS_CAPACITY = {
  potters_wheel: 8,      // Máximo 8 para torno
  hand_modeling: 14,     // Máximo 14 para modelado
  painting: Infinity     // Sin límite para pintura
} as const;

// 8. Experience Pricing
export interface ExperiencePricing {
  pieces: SelectedPiece[];
  guidedOption: 'none' | '60min' | '120min';
  guidedPricePerMinute?: number;
  subtotalPieces: number;
  guidedCost?: number;
  total: number;
}

// 9. Experience UI State
export interface ExperienceUIState {
  step: 1 | 2 | 3 | 4; // wizard step
  piecesSelected: SelectedPiece[];
  durationMinutes?: number;
  guidedOption?: 'none' | '60min' | '120min';
  pricing?: ExperiencePricing;
  isLoading: boolean;
  error?: string;
}

// 10. Confirmation Status Response
export interface ConfirmationStatusResponse {
  status: 'pending' | 'confirmed' | 'rejected';
  expiresIn?: number; // minutes
  reason?: string;
}

// 11. Update AppView type to include new views
export const EXPERIENCE_VIEWS = [
  'experience_type_selector',
  'group_class_wizard',
  'piece_experience_wizard',
  'single_class_wizard',
  'experience_confirmation'
] as const;

// 12. Admin Panel Types for Experiences
export interface ExperienceAdminPanel {
  tab: 'pieces' | 'confirmations';
  selectedPieceId?: string;
  selectedConfirmationId?: string;
}

// 13. Cashier Box Reconciliation Types
export type CashDenomination = '50_BILL' | '20_BILL' | '10_BILL' | '5_BILL' | '1_BILL' | 
                               '0_50_COIN' | '0_25_COIN' | '0_10_COIN' | '0_05_COIN' | '0_01_COIN';

export interface CashierEntry {
  id: string;
  date: string;
  
  // Input fields - Cuadre de Caja
  initialBalance: number; // Saldo inicial de caja
  cashSales: number; // Ventas en efectivo
  cardSales?: number; // Ventas con tarjeta
  transferSales?: number; // Ventas con transferencia
  
  // Counted cash by denomination (cuadre físico de efectivo para calcular saldo final)
  cashDenominations: Record<CashDenomination, number>;
  finalCashBalance: number; // Saldo final de caja (initialBalance + cashSales - totalExpenses) - calculado, no editable
  
  // Expenses/Egresos (dinámicos)
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
  }>;
  totalExpenses: number; // Total gastos
  
  // Reconciliation cuadre físico de caja (para validación con sistema)
  manualValueFromSystem?: number; // Valor que muestra el sistema para comparación
  difference?: number; // finalCashBalance - manualValueFromSystem
  discrepancy?: boolean; // Hay diferencia
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export const CASH_DENOMINATIONS: { key: CashDenomination; label: string; value: number }[] = [
  { key: '50_BILL', label: 'Billete $50', value: 50 },
  { key: '20_BILL', label: 'Billete $20', value: 20 },
  { key: '10_BILL', label: 'Billete $10', value: 10 },
  { key: '5_BILL', label: 'Billete $5', value: 5 },
  { key: '1_BILL', label: 'Billete $1', value: 1 },
  { key: '0_50_COIN', label: 'Moneda $0.50', value: 0.5 },
  { key: '0_25_COIN', label: 'Moneda $0.25', value: 0.25 },
  { key: '0_10_COIN', label: 'Moneda $0.10', value: 0.1 },
  { key: '0_05_COIN', label: 'Moneda $0.05', value: 0.05 },
  { key: '0_01_COIN', label: 'Moneda $0.01', value: 0.01 },
];

// ==================== CUSTOM EXPERIENCE TYPES (NEW v2.0) ====================

/**
 * Tipo de actividad personalizada
 * - ceramic_only: Solo actividad de cerámica (técnica + personas)
 * - celebration: Incluye invitados, decoración, torta, menú
 */
export type CustomExperienceType = 'ceramic_only' | 'celebration';

/**
 * Técnicas disponibles para experiencia personalizada
 * Mismo que GroupTechnique pero con límites explícitos
 */
export interface CustomExperienceTechnique {
  id: GroupTechnique;
  name: string;
  description: string;
  maxCapacity: number;
  icon: string;
  tooltipInfo: string;
}

export const CUSTOM_EXPERIENCE_TECHNIQUES: CustomExperienceTechnique[] = [
  {
    id: 'potters_wheel',
    name: 'Torno Alfarero',
    description: 'Técnica tradicional que requiere coordinación y precisión',
    maxCapacity: 8,
    icon: '🎯',
    tooltipInfo: 'El torno alfarero permite crear formas simétricas giratorias como tazas, platos y vasijas. Requiere práctica pero es muy gratificante.'
  },
  {
    id: 'hand_modeling',
    name: 'Modelado a Mano',
    description: 'Crea formas libres usando solo tus manos',
    maxCapacity: 22,
    icon: '✋',
    tooltipInfo: 'El modelado a mano es más intuitivo y permite mayor libertad creativa. Ideal para esculturas, platos decorativos y piezas únicas.'
  },
  {
    id: 'painting',
    name: 'Pintado a Mano',
    description: 'Pinta piezas de cerámica pre-hechas con diseños personalizados',
    maxCapacity: 22,
    icon: '🎨',
    tooltipInfo: 'Pinta piezas de cerámica ya moldeadas con colores vibrantes. Perfecto para niños y quienes prefieren enfocarse en el diseño visual.'
  }
];

/**
 * Precios de técnicas por persona (YA INCLUYEN IVA)
 */
export const TECHNIQUE_PRICES = {
  potters_wheel: 55,    // $55 por persona (incluye IVA)
  hand_modeling: 45,    // $45 por persona (incluye IVA)
  painting: 18          // Mínimo $18 por pieza (incluye IVA)
} as const;

/**
 * Items del menú disponibles
 */
export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: 'bebidas' | 'snacks' | 'comidas';
  isAvailable: boolean;
}

/**
 * Selección de items del menú
 */
export interface MenuSelection {
  itemId: string;
  quantity: number;
  totalPrice: number;
}

/**
 * Pieza seleccionada para un niño
 */
export interface ChildPieceSelection {
  childNumber: number; // 1, 2, 3...
  pieceId: string;
  pieceName: string;
  piecePrice: number;
}

/**
 * Configuración de celebración
 */
export interface CelebrationConfig {
  // Participantes
  activeParticipants: number; // Personas que harán cerámica (pagan técnica)
  guests: number; // Invitados (no hacen cerámica, solo ocupan espacio)
  
  // Espacio (se cobra por hora + IVA)
  hours: number; // Horas de alquiler del espacio
  
  // Opciones extras
  bringDecoration?: boolean;
  bringCake?: boolean;
  
  // Niños (si aplica)
  hasChildren?: boolean;
  childrenCount?: number;
  
  // DEPRECATED: menuSelections ya no se usa (se puede traer comida propia)
  menuSelections?: string[];
}

/**
 * Configuración solo cerámica (sin celebración)
 * Precio por persona según técnica (ya incluye IVA)
 */
export interface CeramicOnlyConfig {
  participants: number; // Total de personas
  pieceSelections?: ChildPieceSelection[]; // Solo si technique = 'painting'
}

/**
 * Precios de espacio por hora
 */
export interface SpaceHourlyPricing {
  weekday: number; // Mar-Jue
  weekend: number; // Vie-Dom
  vatRate: number; // IVA Ecuador (0.15)
}

export const SPACE_HOURLY_PRICING: SpaceHourlyPricing = {
  weekday: 75,
  weekend: 100,
  vatRate: 0.15
};

/**
 * Resumen de precios calculado
 * 
 * LÓGICA:
 * - Solo Cerámica: técnica x personas (sin espacio, sin IVA adicional)
 * - Celebración: (espacio x horas + IVA) + (técnica x activos) + menú + piezas niños
 */
export interface CustomExperiencePricing {
  // Solo Cerámica
  techniquePrice?: number; // Precio unitario de la técnica ($55, $45, o pieza)
  techniqueTotal?: number; // techniquePrice x participants (YA incluye IVA)
  piecesTotal?: number; // Total de piezas seleccionadas si es painting
  
  // Celebración (espacio)
  spaceHours?: number; // Horas reservadas
  spaceRate?: number; // Tarifa por hora ($65 o $100)
  spaceSubtotal?: number; // spaceHours * spaceRate (sin IVA)
  spaceVat?: number; // IVA solo del espacio
  spaceTotalWithVat?: number; // spaceSubtotal + spaceVat
  
  // Celebración (técnicas para activos)
  activeTechniqueTotal?: number; // Técnica x activeParticipants (YA incluye IVA)
  
  // Extras
  menuTotal?: number; // Total de menú
  childrenPiecesTotal?: number; // Total de piezas para niños
  
  // Total Final
  total: number; // Gran total
  
  // Información adicional
  spaceIncludes?: string[]; // ["A/C", "wifi", "mesas", "sillas", "menaje", "servicio"]
}

/**
 * Slot de fecha/hora para experiencia personalizada
 */
export interface CustomExperienceTimeSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  hours: number; // Duración en horas
  isWeekend: boolean; // Determina precio
  hourlyRate: number; // Tarifa aplicable
}

/**
 * Estado del wizard de experiencia personalizada
 */
export interface CustomExperienceWizardState {
  // Step 1: Tipo de actividad
  experienceType: CustomExperienceType | null;
  
  // Step 2: Configuración
  technique: GroupTechnique | null;
  config: CeramicOnlyConfig | CelebrationConfig | null;
  
  // Step 2.5: Menú (si es celebración)
  menuItems?: MenuItem[];
  
  // Step 3: Fecha y hora
  selectedTimeSlot: CustomExperienceTimeSlot | null;
  
  // Step 4: Precios calculados
  pricing: CustomExperiencePricing | null;
  
  // UI State
  currentStep: 1 | 2 | 3 | 4 | 5;
  isLoading: boolean;
  error: string | null;
}

/**
 * Booking de experiencia personalizada (para enviar al backend)
 */
export interface CustomExperienceBooking {
  experienceType: CustomExperienceType;
  technique: GroupTechnique;
  config: CeramicOnlyConfig | CelebrationConfig;
  timeSlot: CustomExperienceTimeSlot;
  pricing: CustomExperiencePricing;
  userInfo: UserInfo;
  
  // Metadata
  createdAt?: string;
  bookingCode?: string;
}

// ============================================
// San Valentín 2026 - Inscripciones
// ============================================

export type ValentineWorkshopType = 
  | 'florero_arreglo_floral'
  | 'modelado_san_valentin'
  | 'torno_san_valentin';

export type ValentineRegistrationStatus = 
  | 'pending'      // Esperando validación de pago
  | 'confirmed'    // Pago verificado
  | 'cancelled'    // Cancelado
  | 'attended';    // Asistió al taller

export interface ValentineWorkshopInfo {
  type: ValentineWorkshopType;
  name: string;
  time: string;
  priceIndividual: number;
  pricePair: number;
  description: string;
  maxCapacity: number; // Cupos máximos (cuenta participantes, no inscripciones)
}

export const VALENTINE_WORKSHOPS: ValentineWorkshopInfo[] = [
  {
    type: 'florero_arreglo_floral',
    name: 'Decoración de florero de cerámica + Arreglo Floral',
    time: '10h00 a 12h00',
    priceIndividual: 75,
    pricePair: 140,
    description: 'Ideal para compartir con amigas, familia o para ti mismo',
    maxCapacity: 15
  },
  {
    type: 'modelado_san_valentin',
    name: 'Modelado a mano + Colores San Valentín',
    time: '14h00 a 16h00',
    priceIndividual: 65,
    pricePair: 120,
    description: 'Para mentes creativas que deseen explorar diversas formas',
    maxCapacity: 20
  },
  {
    type: 'torno_san_valentin',
    name: 'Torno Alfarero San Valentín',
    time: '17h00 a 19h00',
    priceIndividual: 70,
    pricePair: 130,
    description: 'Conectaremos con los sentidos y daremos forma a una pieza única',
    maxCapacity: 8
  }
];

export interface ValentineRegistration {
  id: string;
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  phone: string;
  email: string;
  workshop: ValentineWorkshopType;
  participants: 1 | 2; // Individual o pareja
  paymentProofUrl: string; // URL de la foto/screenshot del comprobante
  status: ValentineRegistrationStatus;
  createdAt: string;
  updatedAt?: string;
  adminNotes?: string;
  confirmedBy?: string; // Admin que confirmó
  confirmedAt?: string;
}
