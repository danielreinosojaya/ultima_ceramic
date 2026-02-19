import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode, useRef } from 'react';
import * as dataService from '../services/dataService';
import type { Product, Booking, Customer, GroupInquiry, Instructor, ScheduleOverrides, FreeDateTimeOverrides, DayKey, AvailableSlot, ClassCapacity, CapacityMessageSettings, Announcement, InvoiceRequest, Delivery, PaymentDetails } from '../types';

interface AdminData {
  products: Product[];
  bookings: Booking[];
  customers: Customer[];
  inquiries: GroupInquiry[];
  instructors: Instructor[];
  availability: any;
  scheduleOverrides: ScheduleOverrides;
  freeDateTimeOverrides: FreeDateTimeOverrides;
  classCapacity: ClassCapacity;
  capacityMessages: CapacityMessageSettings;
  announcements: Announcement[];
  invoiceRequests: InvoiceRequest[];
  giftcardRequests: import('../services/dataService').GiftcardRequest[];
  giftcards: any[];
  notifications: import('../types').Notification[];
  loading: boolean; // ✅ Cambiar a boolean para compatibilidad
  loadingState: {
    critical: boolean;
    extended: boolean;
    secondary: boolean;
    individual: Record<string, boolean>;
  };
  lastUpdated: {
    critical: number | null;
    extended: number | null;
    secondary: number | null;
  };
  error: string | null;
  refresh: () => void;
  refreshCritical: () => void;
  refreshExtended: () => void;
  refreshSecondary: () => void;

  // Optimistic updates (evitar refresh completo tras mutaciones)
  optimisticUpsertBooking: (booking: Booking) => void;
  optimisticPatchBooking: (bookingId: string, patch: Partial<Booking>) => void;
  optimisticUpdateBookingPayment: (bookingId: string, paymentIdOrIndex: string | number, patch: Partial<PaymentDetails>) => void;
  optimisticRemoveBookingPayment: (bookingId: string, paymentIdOrIndex: string | number) => void;
  optimisticRemoveBookingSlot: (bookingId: string, slotToRemove: { date: string; time: string }) => void;
  optimisticRemoveBooking: (bookingId: string) => void;
  optimisticPatchCustomer: (email: string, patch: Partial<Customer>) => void;
  optimisticRemoveCustomer: (email: string) => void;
  optimisticUpsertDelivery: (delivery: Delivery) => void;
  optimisticRemoveDelivery: (deliveryId: string) => void;
  optimisticUpsertInvoiceRequest: (request: InvoiceRequest) => void;
  optimisticPatchInvoiceRequest: (id: string, patch: Partial<InvoiceRequest>) => void;
}

// Estado inicial
const initialState = {
  products: [],
  bookings: [],
  customers: [],
  inquiries: [],
  instructors: [],
  availability: {},
  scheduleOverrides: {},
  freeDateTimeOverrides: {},
  classCapacity: { potters_wheel: 0, molding: 0, introductory_class: 0 },
  capacityMessages: { thresholds: [] },
  announcements: [],
  invoiceRequests: [],
  giftcardRequests: [],
  giftcards: [],
  notifications: [],
  loadingState: {
    critical: false,
    extended: false,
    secondary: false,
    individual: {} as Record<string, boolean>,
  },
  lastUpdated: {
    critical: null as number | null,
    extended: null as number | null,
    secondary: null as number | null,
  },
  error: null as string | null,
};

type AdminState = typeof initialState;

// Acciones del reducer
type AdminAction =
  | { type: 'SET_LOADING'; dataType: 'critical' | 'extended' | 'secondary' | string; loading: boolean }
  | { type: 'SET_CRITICAL_DATA'; data: Partial<AdminState> }
  | { type: 'SET_EXTENDED_DATA'; data: Partial<AdminState> }
  | { type: 'SET_SECONDARY_DATA'; data: Partial<AdminState> }
  | { type: 'SET_INDIVIDUAL_DATA'; dataType: string; data: any }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'UPDATE_TIMESTAMP'; dataType: 'critical' | 'extended' | 'secondary' }
  | { type: 'SET_GIFTCARD_REQUESTS'; requests: import('../services/dataService').GiftcardRequest[] }
  | { type: 'UPSERT_BOOKING'; booking: Booking }
  | { type: 'PATCH_BOOKING'; bookingId: string; patch: Partial<Booking> }
  | { type: 'UPDATE_BOOKING_PAYMENT'; bookingId: string; paymentIdOrIndex: string | number; patch: Partial<PaymentDetails> }
  | { type: 'REMOVE_BOOKING_PAYMENT'; bookingId: string; paymentIdOrIndex: string | number }
  | { type: 'REMOVE_BOOKING_SLOT'; bookingId: string; slotToRemove: { date: string; time: string } }
  | { type: 'REMOVE_BOOKING'; bookingId: string }
  | { type: 'PATCH_CUSTOMER'; email: string; patch: Partial<Customer> }
  | { type: 'REMOVE_CUSTOMER'; email: string }
  | { type: 'UPSERT_DELIVERY'; delivery: Delivery }
  | { type: 'REMOVE_DELIVERY'; deliveryId: string }
  | { type: 'UPSERT_INVOICE_REQUEST'; request: InvoiceRequest }
  | { type: 'PATCH_INVOICE_REQUEST'; id: string; patch: Partial<InvoiceRequest> };

const normalizeEmail = (email: string | null | undefined): string => (email || '').trim().toLowerCase();

const recomputeCustomerSummary = (customer: Customer): Customer => {
  const bookings = Array.isArray(customer.bookings) ? customer.bookings : [];
  const totalBookings = bookings.length;
  const totalSpent = bookings.reduce((sum, booking) => {
    const bookingPayments = Array.isArray(booking.paymentDetails) ? booking.paymentDetails : [];
    const totalPaidForBooking = bookingPayments.reduce((s, p) => s + (typeof p.amount === 'number' ? p.amount : 0), 0);
    const paidAmount = totalPaidForBooking > 0 ? totalPaidForBooking : (booking.isPaid ? (booking.price || 0) : 0);
    return sum + paidAmount;
  }, 0);

  let lastBookingDate = customer.lastBookingDate instanceof Date ? customer.lastBookingDate : new Date(0);
  bookings.forEach((booking) => {
    const candidateDates: Date[] = [];
    if (booking.createdAt) {
      const d = new Date(booking.createdAt);
      if (!isNaN(d.getTime())) candidateDates.push(d);
    }
    if (Array.isArray(booking.slots)) {
      booking.slots.forEach((slot: any) => {
        if (slot?.date) {
          const d = new Date(String(slot.date) + 'T12:00:00');
          if (!isNaN(d.getTime())) candidateDates.push(d);
        }
      });
    }
    candidateDates.forEach((d) => {
      if (d.getTime() > lastBookingDate.getTime()) lastBookingDate = d;
    });
  });

  return {
    ...customer,
    totalBookings,
    totalSpent,
    lastBookingDate,
  };
};

const upsertById = <T extends { id: string }>(items: T[], item: T): T[] => {
  const idx = items.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...items];
  const next = items.slice();
  next[idx] = item;
  return next;
};

// Reducer
function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case 'SET_GIFTCARD_REQUESTS':
      return {
        ...state,
        giftcardRequests: action.requests,
      };
    case 'SET_LOADING':
      if (action.dataType === 'critical' || action.dataType === 'extended') {
        return {
          ...state,
          loadingState: {
            ...state.loadingState,
            [action.dataType]: action.loading,
          },
        };
      } else {
        return {
          ...state,
          loadingState: {
            ...state.loadingState,
            individual: {
              ...state.loadingState.individual,
              [action.dataType]: action.loading,
            },
          },
        };
      }
    case 'SET_CRITICAL_DATA':
      return {
        ...state,
        ...action.data,
        lastUpdated: {
          ...state.lastUpdated,
          critical: Date.now(),
        },
      };
    case 'SET_EXTENDED_DATA':
      return {
        ...state,
        ...action.data,
        lastUpdated: {
          ...state.lastUpdated,
          extended: Date.now(),
        },
      };
    case 'SET_SECONDARY_DATA':
      return {
        ...state,
        ...action.data,
        lastUpdated: {
          ...state.lastUpdated,
          secondary: Date.now(),
        },
      };
    case 'SET_INDIVIDUAL_DATA':
      return {
        ...state,
        [action.dataType]: action.data,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
      };
    case 'UPDATE_TIMESTAMP':
      return {
        ...state,
        lastUpdated: {
          ...state.lastUpdated,
          [action.dataType]: Date.now(),
        },
      };

    case 'UPSERT_BOOKING': {
      const nextBookings = upsertById(state.bookings as any, action.booking as any) as any;
      const bookingEmail = normalizeEmail((action.booking as any)?.userInfo?.email);
      const nextCustomers = state.customers.map((customer) => {
        const customerEmail = normalizeEmail(customer.email || customer.userInfo?.email);
        if (!bookingEmail || customerEmail !== bookingEmail) return customer;
        const nextCustomerBookings = upsertById(customer.bookings as any, action.booking as any) as any;
        return recomputeCustomerSummary({ ...customer, bookings: nextCustomerBookings });
      });
      return {
        ...state,
        bookings: nextBookings,
        customers: nextCustomers,
      };
    }

    case 'PATCH_BOOKING': {
      const nextBookings = state.bookings.map((b) => (b.id === action.bookingId ? ({ ...b, ...action.patch } as any) : b));
      const nextCustomers = state.customers.map((customer) => {
        const nextCustomerBookings = customer.bookings.map((b) => (b.id === action.bookingId ? ({ ...b, ...action.patch } as any) : b));
        const changed = nextCustomerBookings.some((b, idx) => b !== customer.bookings[idx]);
        return changed ? recomputeCustomerSummary({ ...customer, bookings: nextCustomerBookings }) : customer;
      });
      return {
        ...state,
        bookings: nextBookings,
        customers: nextCustomers,
      };
    }

    case 'UPDATE_BOOKING_PAYMENT': {
      const patchPayment = (payments: PaymentDetails[]): PaymentDetails[] => {
        if (!Array.isArray(payments)) return payments;
        if (typeof action.paymentIdOrIndex === 'number') {
          const idx = action.paymentIdOrIndex;
          if (idx < 0 || idx >= payments.length) return payments;
          return payments.map((p, i) => (i === idx ? ({ ...p, ...action.patch } as any) : p));
        }
        const id = String(action.paymentIdOrIndex);
        return payments.map((p: any) => {
          const pid = p?.id || p?.paymentId;
          return pid === id ? ({ ...p, ...action.patch } as any) : p;
        });
      };

      const nextBookings = state.bookings.map((b: any) => {
        if (b.id !== action.bookingId) return b;
        const nextPayments = patchPayment(Array.isArray(b.paymentDetails) ? b.paymentDetails : []);
        return { ...b, paymentDetails: nextPayments };
      });
      const nextCustomers = state.customers.map((customer) => {
        const nextCustomerBookings = customer.bookings.map((b: any) => {
          if (b.id !== action.bookingId) return b;
          const nextPayments = patchPayment(Array.isArray(b.paymentDetails) ? b.paymentDetails : []);
          return { ...b, paymentDetails: nextPayments };
        });
        const changed = nextCustomerBookings.some((b, idx) => b !== customer.bookings[idx]);
        return changed ? recomputeCustomerSummary({ ...customer, bookings: nextCustomerBookings }) : customer;
      });
      return { ...state, bookings: nextBookings, customers: nextCustomers };
    }

    case 'REMOVE_BOOKING_PAYMENT': {
      const removePayment = (payments: PaymentDetails[]): PaymentDetails[] => {
        if (!Array.isArray(payments)) return payments;
        if (typeof action.paymentIdOrIndex === 'number') {
          return payments.filter((_, i) => i !== action.paymentIdOrIndex);
        }
        const id = String(action.paymentIdOrIndex);
        return payments.filter((p: any) => {
          const pid = p?.id || p?.paymentId;
          return pid !== id;
        });
      };

      const nextBookings = state.bookings.map((b: any) => (b.id === action.bookingId ? { ...b, paymentDetails: removePayment(b.paymentDetails || []) } : b));
      const nextCustomers = state.customers.map((customer) => {
        const nextCustomerBookings = customer.bookings.map((b: any) => (b.id === action.bookingId ? { ...b, paymentDetails: removePayment(b.paymentDetails || []) } : b));
        const changed = nextCustomerBookings.some((b, idx) => b !== customer.bookings[idx]);
        return changed ? recomputeCustomerSummary({ ...customer, bookings: nextCustomerBookings }) : customer;
      });
      return { ...state, bookings: nextBookings, customers: nextCustomers };
    }

    case 'REMOVE_BOOKING_SLOT': {
      const slotMatches = (slot: any): boolean => slot?.date === action.slotToRemove.date && slot?.time === action.slotToRemove.time;
      const nextBookings = state.bookings.map((b: any) => {
        if (b.id !== action.bookingId) return b;
        const nextSlots = Array.isArray(b.slots) ? b.slots.filter((s: any) => !slotMatches(s)) : b.slots;
        return { ...b, slots: nextSlots };
      });
      const nextCustomers = state.customers.map((customer) => {
        const nextCustomerBookings = customer.bookings.map((b: any) => {
          if (b.id !== action.bookingId) return b;
          const nextSlots = Array.isArray(b.slots) ? b.slots.filter((s: any) => !slotMatches(s)) : b.slots;
          return { ...b, slots: nextSlots };
        });
        const changed = nextCustomerBookings.some((b, idx) => b !== customer.bookings[idx]);
        return changed ? recomputeCustomerSummary({ ...customer, bookings: nextCustomerBookings }) : customer;
      });
      return { ...state, bookings: nextBookings, customers: nextCustomers };
    }

    case 'REMOVE_BOOKING': {
      const nextBookings = state.bookings.filter((b) => b.id !== action.bookingId);
      const nextCustomers = state.customers.map((customer) => {
        const nextCustomerBookings = customer.bookings.filter((b) => b.id !== action.bookingId);
        if (nextCustomerBookings.length === customer.bookings.length) return customer;
        return recomputeCustomerSummary({ ...customer, bookings: nextCustomerBookings });
      });
      return { ...state, bookings: nextBookings, customers: nextCustomers };
    }

    case 'PATCH_CUSTOMER': {
      const targetEmail = normalizeEmail(action.email);
      const nextCustomers = state.customers.map((customer) => {
        const customerEmail = normalizeEmail(customer.email || customer.userInfo?.email);
        if (customerEmail !== targetEmail) return customer;
        const nextUserInfo = action.patch.userInfo
          ? { ...(customer.userInfo || {}), ...(action.patch.userInfo as any) }
          : customer.userInfo;
        return {
          ...customer,
          ...action.patch,
          userInfo: nextUserInfo,
        };
      });

      const nextBookings = state.bookings.map((booking: any) => {
        const bookingEmail = normalizeEmail(booking?.userInfo?.email);
        if (bookingEmail !== targetEmail) return booking;
        if (!action.patch.userInfo) return booking;
        return { ...booking, userInfo: { ...(booking.userInfo || {}), ...(action.patch.userInfo as any) } };
      });

      return { ...state, customers: nextCustomers, bookings: nextBookings };
    }

    case 'REMOVE_CUSTOMER': {
      const targetEmail = normalizeEmail(action.email);
      const nextCustomers = state.customers.filter((c) => normalizeEmail(c.email || c.userInfo?.email) !== targetEmail);
      const nextBookings = state.bookings.filter((b: any) => normalizeEmail(b?.userInfo?.email) !== targetEmail);
      return { ...state, customers: nextCustomers, bookings: nextBookings };
    }

    case 'UPSERT_DELIVERY': {
      const deliveryEmail = normalizeEmail((action.delivery as any)?.customerEmail);
      const nextCustomers = state.customers.map((customer) => {
        const customerEmail = normalizeEmail(customer.email || customer.userInfo?.email);
        if (!deliveryEmail || customerEmail !== deliveryEmail) return customer;
        const deliveries = Array.isArray(customer.deliveries) ? customer.deliveries : [];
        const idx = deliveries.findIndex((d) => d.id === action.delivery.id);
        const nextDeliveries = idx === -1
          ? [action.delivery, ...deliveries]
          : deliveries.map((d) => (d.id === action.delivery.id ? action.delivery : d));
        return { ...customer, deliveries: nextDeliveries };
      });
      return { ...state, customers: nextCustomers };
    }

    case 'REMOVE_DELIVERY': {
      const nextCustomers = state.customers.map((customer) => {
        const deliveries = Array.isArray(customer.deliveries) ? customer.deliveries : [];
        const nextDeliveries = deliveries.filter((d) => d.id !== action.deliveryId);
        return nextDeliveries.length === deliveries.length ? customer : { ...customer, deliveries: nextDeliveries };
      });
      return { ...state, customers: nextCustomers };
    }

    case 'UPSERT_INVOICE_REQUEST': {
      const next = upsertById(state.invoiceRequests as any, action.request as any) as any;
      return { ...state, invoiceRequests: next };
    }

    case 'PATCH_INVOICE_REQUEST': {
      const next = state.invoiceRequests.map((r) => (r.id === action.id ? ({ ...r, ...action.patch } as any) : r));
      return { ...state, invoiceRequests: next };
    }

    default:
      return state;
  }
}

// Cache timeouts
const CRITICAL_CACHE_DURATION = 10 * 60 * 1000; // 10 minutos (optimizado para reducir requests)
const EXTENDED_CACHE_DURATION = 15 * 60 * 1000; // 15 minutos
const SECONDARY_CACHE_DURATION = 30 * 60 * 1000; // 30 minutos - datos no críticos

const AdminDataContext = createContext<AdminData | undefined>(undefined);

export const useAdminData = () => {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider');
  return ctx;
};

export const AdminDataProvider: React.FC<{ children: ReactNode; isAdmin?: boolean }> = ({ children, isAdmin = false }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState);

  // ✅ Refs para evitar dependencias de state en useCallback - PREVIENE LOOPS INFINITOS
  const loadingRef = useRef({
    critical: false,
    extended: false,
    secondary: false,
  });
  const lastUpdatedRef = useRef({
    critical: null as number | null,
    extended: null as number | null,
    secondary: null as number | null,
  });
  const isAdminRef = useRef(isAdmin);
  
  // Mantener ref actualizado
  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  // Helper para verificar si necesita actualizar - SIN dependencias
  const needsUpdate = useCallback((type: 'critical' | 'extended' | 'secondary', duration: number): boolean => {
    const lastUpdate = lastUpdatedRef.current[type];
    if (!lastUpdate) return true;
    return Date.now() - lastUpdate > duration;
  }, []);

  // Cargar datos críticos (más frecuentes)
  const fetchCriticalData = useCallback(async (force = false) => {
    // ✅ No cargar si tab está hidden (salvo que sea force explícito del usuario)
    if (!force && document.hidden) {
      console.log('[AdminDataContext] Tab hidden, skipping fetchCriticalData');
      return;
    }

    // ✅ Usar refs en lugar de state para evitar dependencias
    if (!force) {
      if (!needsUpdate('critical', CRITICAL_CACHE_DURATION)) return;
      if (loadingRef.current.critical) return;
    }
    
    if (loadingRef.current.critical) {
      console.log('[AdminDataContext] Already loading critical, skipping');
      return;
    }

    loadingRef.current.critical = true;
    dispatch({ type: 'SET_LOADING', dataType: 'critical', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      // Usar batch optimizado del dataService para datos críticos con fallback
      const results = await Promise.allSettled([
        dataService.getBookings().catch(() => []),
        dataService.getGroupInquiries().catch(() => []),
        dataService.getAnnouncements().catch(() => []),
        dataService.getGiftcardRequests().catch(() => []),
      ]);
      
      const bookings = results[0].status === 'fulfilled' ? results[0].value : [];
      
      // Get customers with deliveries (includes standalone + bookings)
      const customersWithDeliveries = await dataService.getCustomersWithDeliveries(bookings).catch(() => []);
      
      dispatch({
        type: 'SET_CRITICAL_DATA',
        data: {
          bookings,
          customers: customersWithDeliveries,
          inquiries: results[1].status === 'fulfilled' ? results[1].value : [],
          announcements: results[2].status === 'fulfilled' ? results[2].value : [],
        }
      });
      dispatch({
        type: 'SET_GIFTCARD_REQUESTS',
        requests: results[3].status === 'fulfilled' ? results[3].value : [],
      });
      const giftcards = results[3].status === 'fulfilled' ? results[3].value : [];
      console.log('[AdminDataContext] 🎁 Giftcard requests loaded:', giftcards.length);
      if (giftcards.length > 0) {
        const first = giftcards[0];
        console.log('[AdminDataContext] 📋 Primer giftcard COMPLETO:', {
          id: first.id,
          buyerName: first.buyerName,
          recipientName: first.recipientName,
          amount: first.amount,
          sendMethod: first.sendMethod,
          scheduledSendAt: first.scheduledSendAt,
          status: first.status,
          createdAt: first.createdAt
        });
        console.log('[AdminDataContext] Primeros 3 giftcards:', giftcards.slice(0, 3).map((g: any) => ({
          id: g.id,
          recipientName: g.recipientName,
          sendMethod: g.sendMethod,
          scheduledSendAt: g.scheduledSendAt
        })));
      }
      console.debug('[AdminDataContext] Loaded critical data: booking count', bookings.length, 'customers count', customersWithDeliveries.length, 'giftcardRequests:', results[3].status === 'fulfilled' ? (results[3].value || []).length : 0);
      lastUpdatedRef.current.critical = Date.now();
    } catch (error) {
      console.error('Error loading critical admin data:', error);
      // En lugar de mostrar error, cargar datos vacíos para que funcione
      dispatch({
        type: 'SET_CRITICAL_DATA',
        data: {
          bookings: [],
          customers: [],
          inquiries: [],
          announcements: [],
        }
      });
    } finally {
      loadingRef.current.critical = false;
      dispatch({ type: 'SET_LOADING', dataType: 'critical', loading: false });
    }
  }, [needsUpdate]);

  // Cargar datos extendidos (menos frecuentes)
  const fetchExtendedData = useCallback(async (force = false) => {
    // ✅ Usar refs en lugar de state para evitar dependencias
    if (!force) {
      if (!needsUpdate('extended', EXTENDED_CACHE_DURATION)) return;
      if (loadingRef.current.extended) return;
    }
    
    if (loadingRef.current.extended) {
      console.log('[AdminDataContext] Already loading extended, skipping');
      return;
    }

    loadingRef.current.extended = true;
    dispatch({ type: 'SET_LOADING', dataType: 'extended', loading: true });

    try {
      // Solo cargar datos públicos necesarios
      const results = await Promise.allSettled([
        dataService.getProducts().catch(() => []),
        dataService.getInstructors().catch(() => []),
        dataService.getAvailability().catch(() => ({})),
        dataService.getClassCapacity().catch(() => ({ potters_wheel: 0, molding: 0, introductory_class: 0 })),
        dataService.getNotifications().catch(() => []),
      ]);

      dispatch({
        type: 'SET_EXTENDED_DATA',
        data: {
          products: results[0].status === 'fulfilled' ? results[0].value : [],
          instructors: results[1].status === 'fulfilled' ? results[1].value : [],
          availability: results[2].status === 'fulfilled' ? results[2].value : {},
          classCapacity: results[3].status === 'fulfilled' ? results[3].value : { potters_wheel: 0, molding: 0, introductory_class: 0 },
          notifications: results[4].status === 'fulfilled' ? results[4].value : [],
        }
      });
      console.debug('[AdminDataContext] Loaded extended data: products count', results[0].status === 'fulfilled' ? (results[0].value || []).length : 0, 'notifications:', results[4].status === 'fulfilled' ? (results[4].value || []).length : 0);
      lastUpdatedRef.current.extended = Date.now();
    } catch (error) {
      console.error('Error loading extended admin data:', error);
      // Fallback con datos vacíos
      dispatch({
        type: 'SET_EXTENDED_DATA',
        data: {
          products: [],
          instructors: [],
          availability: {},
          classCapacity: { potters_wheel: 0, molding: 0, introductory_class: 0 },
          notifications: [],
        }
      });
    } finally {
      loadingRef.current.extended = false;
      dispatch({ type: 'SET_LOADING', dataType: 'extended', loading: false });
    }
  }, [needsUpdate]);

  // Cargar datos secundarios (solo admin, lazy loading)
  const fetchSecondaryData = useCallback(async (force = false) => {
    if (!isAdminRef.current) return; // ✅ Usar ref en lugar de prop para evitar dependencia

    // ✅ Usar refs en lugar de state para evitar dependencias
    if (!force) {
      if (!needsUpdate('secondary', SECONDARY_CACHE_DURATION)) return;
      if (loadingRef.current.secondary) return;
    }
    
    if (loadingRef.current.secondary) {
      console.log('[AdminDataContext] Already loading secondary, skipping');
      return;
    }

    loadingRef.current.secondary = true;
    dispatch({ type: 'SET_LOADING', dataType: 'secondary', loading: true });

    try {
      // Cargar datos solo necesarios para admin y que no son críticos
      const results = await Promise.allSettled([
        dataService.getScheduleOverrides().catch(() => ({})),
        dataService.getCapacityMessageSettings().catch(() => ({ thresholds: [] })),
        dataService.getInvoiceRequests().catch(() => []),
        dataService.getGiftcards().catch(() => []),
        dataService.getFreeDateTimeOverrides().catch(() => ({})),
      ]);

      dispatch({
        type: 'SET_SECONDARY_DATA',
        data: {
          scheduleOverrides: results[0].status === 'fulfilled' ? results[0].value : {},
          capacityMessages: results[1].status === 'fulfilled' ? results[1].value : { thresholds: [] },
          invoiceRequests: results[2].status === 'fulfilled' ? results[2].value : [],
          giftcards: results[3].status === 'fulfilled' ? results[3].value : [],
          freeDateTimeOverrides: results[4].status === 'fulfilled' ? results[4].value : {},
        }
      });
      console.debug('[AdminDataContext] Loaded secondary data (admin): giftcards count', results[3].status === 'fulfilled' ? (results[3].value || []).length : 0);
      lastUpdatedRef.current.secondary = Date.now();
    } catch (error) {
      console.error('Error loading secondary admin data:', error);
    } finally {
      loadingRef.current.secondary = false;
      dispatch({ type: 'SET_LOADING', dataType: 'secondary', loading: false });
    }
  }, [needsUpdate]); // ✅ Removido isAdmin - usar ref

  // ✅ Refs estables para las funciones fetch - PREVIENE LOOPS
  const fetchCriticalDataRef = useRef(fetchCriticalData);
  const fetchExtendedDataRef = useRef(fetchExtendedData);
  const fetchSecondaryDataRef = useRef(fetchSecondaryData);
  
  // Actualizar refs cuando las funciones cambien
  useEffect(() => {
    fetchCriticalDataRef.current = fetchCriticalData;
    fetchExtendedDataRef.current = fetchExtendedData;
    fetchSecondaryDataRef.current = fetchSecondaryData;
  });

  // Refrescar todo
  const refresh = useCallback(() => {
    fetchCriticalDataRef.current(true);
    fetchExtendedDataRef.current(true);
    fetchSecondaryDataRef.current(true);
  }, []); // ✅ Sin dependencias - usar refs

  // Refrescar solo críticos
  const refreshCritical = useCallback(() => {
    fetchCriticalDataRef.current(true);
  }, []); // ✅ Sin dependencias - usar refs

  // Refrescar solo extendidos
  const refreshExtended = useCallback(() => {
    fetchExtendedDataRef.current(true);
  }, []); // ✅ Sin dependencias - usar refs

  // Refrescar solo secundarios
  const refreshSecondary = useCallback(() => {
    fetchSecondaryDataRef.current(true);
  }, []); // ✅ Sin dependencias - usar refs

  const optimisticUpsertBooking = useCallback((booking: Booking) => {
    dispatch({ type: 'UPSERT_BOOKING', booking });
    lastUpdatedRef.current.critical = Date.now();
  }, []);

  const optimisticPatchBooking = useCallback((bookingId: string, patch: Partial<Booking>) => {
    dispatch({ type: 'PATCH_BOOKING', bookingId, patch });
    lastUpdatedRef.current.critical = Date.now();
  }, []);

  const optimisticUpdateBookingPayment = useCallback((bookingId: string, paymentIdOrIndex: string | number, patch: Partial<PaymentDetails>) => {
    dispatch({ type: 'UPDATE_BOOKING_PAYMENT', bookingId, paymentIdOrIndex, patch });
    lastUpdatedRef.current.critical = Date.now();
  }, []);

  const optimisticRemoveBookingPayment = useCallback((bookingId: string, paymentIdOrIndex: string | number) => {
    dispatch({ type: 'REMOVE_BOOKING_PAYMENT', bookingId, paymentIdOrIndex });
    lastUpdatedRef.current.critical = Date.now();
  }, []);

  const optimisticRemoveBookingSlot = useCallback((bookingId: string, slotToRemove: { date: string; time: string }) => {
    dispatch({ type: 'REMOVE_BOOKING_SLOT', bookingId, slotToRemove });
    lastUpdatedRef.current.critical = Date.now();
  }, []);

  const optimisticRemoveBooking = useCallback((bookingId: string) => {
    dispatch({ type: 'REMOVE_BOOKING', bookingId });
    lastUpdatedRef.current.critical = Date.now();
  }, []);

  const optimisticPatchCustomer = useCallback((email: string, patch: Partial<Customer>) => {
    dispatch({ type: 'PATCH_CUSTOMER', email, patch });
    lastUpdatedRef.current.critical = Date.now();
  }, []);

  const optimisticRemoveCustomer = useCallback((email: string) => {
    dispatch({ type: 'REMOVE_CUSTOMER', email });
    lastUpdatedRef.current.critical = Date.now();
  }, []);

  const optimisticUpsertDelivery = useCallback((delivery: Delivery) => {
    dispatch({ type: 'UPSERT_DELIVERY', delivery });
    lastUpdatedRef.current.critical = Date.now();
  }, []);

  const optimisticRemoveDelivery = useCallback((deliveryId: string) => {
    dispatch({ type: 'REMOVE_DELIVERY', deliveryId });
    lastUpdatedRef.current.critical = Date.now();
  }, []);

  const optimisticUpsertInvoiceRequest = useCallback((request: InvoiceRequest) => {
    dispatch({ type: 'UPSERT_INVOICE_REQUEST', request });
    lastUpdatedRef.current.secondary = Date.now();
  }, []);

  const optimisticPatchInvoiceRequest = useCallback((id: string, patch: Partial<InvoiceRequest>) => {
    dispatch({ type: 'PATCH_INVOICE_REQUEST', id, patch });
    lastUpdatedRef.current.secondary = Date.now();
  }, []);

  // Cargar datos iniciales - solo una vez al montar
  useEffect(() => {
    let mounted = true;
    
    const loadInitialData = async () => {
      if (mounted) {
        await fetchCriticalDataRef.current(true); // ✅ Usar ref
        // Cargar datos extendidos después de un breve delay si aún está montado
        setTimeout(() => {
          if (mounted) {
            fetchExtendedDataRef.current(true); // ✅ Usar ref
            // Si es admin, también cargar datos secundarios (después de más delay)
            if (isAdminRef.current) { // ✅ Usar ref
              setTimeout(() => {
                if (mounted) {
                  fetchSecondaryDataRef.current(true); // ✅ Usar ref
                }
              }, 300);
            }
          }
        }, 100);
      }
    };
    
    loadInitialData();

    // ✅ Visibility API: recargar cuando tab vuelve a ser visible (después de estar hidden >5min)
    let lastVisibleTime = Date.now();
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const hiddenDuration = Date.now() - lastVisibleTime;
        // Si estuvo hidden más de 5 minutos, refrescar datos
        if (hiddenDuration > 5 * 60 * 1000) {
          console.log('[AdminDataContext] Tab visible after', Math.round(hiddenDuration / 1000), 's - refreshing');
          if (mounted) fetchCriticalDataRef.current(true); // ✅ Usar ref
        }
        lastVisibleTime = Date.now();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // ✅ Sin dependencias - todo usa refs ahora

  const adminData: AdminData = {
  ...state,
  loading: state.loadingState.critical || state.loadingState.extended, // ✅ Boolean para compatibilidad
  refresh,
  refreshCritical,
  refreshExtended,
  refreshSecondary,
  optimisticUpsertBooking,
  optimisticPatchBooking,
  optimisticUpdateBookingPayment,
  optimisticRemoveBookingPayment,
  optimisticRemoveBookingSlot,
  optimisticRemoveBooking,
  optimisticPatchCustomer,
  optimisticRemoveCustomer,
  optimisticUpsertDelivery,
  optimisticRemoveDelivery,
  optimisticUpsertInvoiceRequest,
  optimisticPatchInvoiceRequest,
  };

  return (
    <AdminDataContext.Provider value={adminData}>
      {children}
    </AdminDataContext.Provider>
  );
};
