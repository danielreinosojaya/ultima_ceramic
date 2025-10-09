// Basic Types
export type DayKey = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
export type AppView = 'welcome' | 'techniques' | 'packages' | 'intro_classes' | 'schedule' | 'summary' | 'group_experience' | 'couples_experience' | 'team_building' | 'confirmation';
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
export type DeliveryStatus = 'pending' | 'completed' | 'overdue';

export interface Delivery {
    id: string;
    customerEmail: string;
    description: string;
    scheduledDate: string; // ISO date string - fecha programada tentativa
    status: DeliveryStatus;
    createdAt: string; // ISO date string
    completedAt?: string | null; // ISO date string - fecha real de entrega
    deliveredAt?: string | null; // ISO date string - fecha cuando se marcó como entregada
    notes?: string | null;
    photos?: string[] | null; // Array de URLs de fotos
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

export type AttendanceStatus = 'attended' | 'no-show';

export interface PaymentDetails {
    amount: number;
    method: 'Cash' | 'Card' | 'Transfer';
    receivedAt: string; // ISO date string
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
    bookingMode: BookingMode;
    // FIX: Change to an array of payments
    paymentDetails?: PaymentDetails[];
    attendance?: Record<string, AttendanceStatus>; // key is `${date}_${time}`
    bookingDate: string;
    participants?: number;
    clientNote?: string;
}

export interface BookingDetails {
  product: Product;
  slots: TimeSlot[];
  userInfo: UserInfo | null;
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
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    accountType: string;
    taxId: string;
    details?: string;
}

// For settings, allow multiple accounts
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
  bankDetails: BankDetails;
  uiLabels?: UILabels;
}

// Admin & Notifications
export type AdminTab = 'products' | 'calendar' | 'schedule-settings' | 'financials' | 'customers' | 'inquiries' | 'settings' | 'communications' | 'invoicing';

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
