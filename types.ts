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
  | 'experience_confirmation';
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
    createdByClient?: boolean; // true si el cliente subió las fotos directamente
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
export type ProductType = 'CLASS_PACKAGE' | 'OPEN_STUDIO_SUBSCRIPTION' | 'INTRODUCTORY_CLASS' | 'GROUP_EXPERIENCE' | 'COUPLES_EXPERIENCE' | 'SINGLE_CLASS' | 'GROUP_CLASS';

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
  
  // Input fields - Cuadre de Caja (efectivo solamente)
  initialBalance: number; // Saldo inicial de caja
  cashSales: number; // Ventas en efectivo
  
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
  
  // ===== NUEVO: Cuadre de Ventas Totales =====
  // Sistema (Lo que dice Contpago/Sistema)
  systemCashSales?: number; // Ventas en efectivo según sistema
  systemCardSales?: number; // Ventas en tarjeta según sistema
  systemTransferSales?: number; // Ventas en transferencia según sistema
  systemTotalSales?: number; // Total ventas según sistema (cash + card + transfer) - calculado
  
  // Lo que TÚ CONTAS
  myEffectiveSales?: number; // Mis ventas en efectivo
  myVouchersAccumulated?: number; // Mis vouchers acumulados (ventas TC)
  myTransfersReceived?: number; // Mis transferencias recibidas
  myTotalSales?: number; // Mi total (efectivo + vouchers + transfers) - calculado
  
  // Validación de cuadre de ventas
  salesDifference?: number; // systemTotalSales - myTotalSales
  salesDiscrepancy?: boolean; // Hay diferencia en ventas
  
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
