import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import * as dataService from '../services/dataService';
import type { Product, Booking, Customer, GroupInquiry, Instructor, ScheduleOverrides, DayKey, AvailableSlot, ClassCapacity, CapacityMessageSettings, Announcement, InvoiceRequest } from '../types';

interface AdminData {
  products: Product[];
  bookings: Booking[];
  customers: Customer[];
  inquiries: GroupInquiry[];
  instructors: Instructor[];
  availability: any;
  scheduleOverrides: ScheduleOverrides;
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
  | { type: 'SET_GIFTCARD_REQUESTS'; requests: import('../services/dataService').GiftcardRequest[] };

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
    default:
      return state;
  }
}

// Cache timeouts
const CRITICAL_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
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

  // Helper para verificar si necesita actualizar (sin dependencias de state)
  const needsUpdate = useCallback((lastUpdate: number | null, duration: number): boolean => {
    if (!lastUpdate) return true;
    return Date.now() - lastUpdate > duration;
  }, []);

  // Cargar datos críticos (más frecuentes)
  const fetchCriticalData = useCallback(async (force = false) => {
    // CORREGIDO: Si force=true, ignorar el chequeo de loading para garantizar recarga
    if (!force) {
      if (!needsUpdate(state.lastUpdated.critical, CRITICAL_CACHE_DURATION)) return;
      if (state.loadingState.critical) return;
    }
    
    // Si force=true y ya está cargando, esperar a que termine antes de recargar
    if (force && state.loadingState.critical) {
      console.log('[AdminDataContext] Force refresh requested but already loading, waiting...');
      // Esperar un poco para que termine la carga actual
      await new Promise(resolve => setTimeout(resolve, 200));
    }

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
      console.debug('[AdminDataContext] Loaded critical data: booking count', bookings.length, 'customers count', customersWithDeliveries.length, 'giftcardRequests:', results[3].status === 'fulfilled' ? (results[3].value || []).length : 0);
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
      dispatch({ type: 'SET_LOADING', dataType: 'critical', loading: false });
    }
  }, [needsUpdate]);

  // Cargar datos extendidos (menos frecuentes)
  const fetchExtendedData = useCallback(async (force = false) => {
    // CORREGIDO: Si force=true, ignorar el chequeo de loading para garantizar recarga
    if (!force) {
      if (!needsUpdate(state.lastUpdated.extended, EXTENDED_CACHE_DURATION)) return;
      if (state.loadingState.extended) return;
    }
    
    // Si force=true y ya está cargando, esperar a que termine antes de recargar
    if (force && state.loadingState.extended) {
      console.log('[AdminDataContext] Force refresh extended requested but already loading, waiting...');
      await new Promise(resolve => setTimeout(resolve, 200));
    }

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
      dispatch({ type: 'SET_LOADING', dataType: 'extended', loading: false });
    }
  }, [needsUpdate]);

  // Cargar datos secundarios (solo admin, lazy loading)
  const fetchSecondaryData = useCallback(async (force = false) => {
    if (!isAdmin) return; // No cargar si no es admin

    if (!force) {
      if (!needsUpdate(state.lastUpdated.secondary, SECONDARY_CACHE_DURATION)) return;
      if (state.loadingState.secondary) return;
    }

    if (force && state.loadingState.secondary) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    dispatch({ type: 'SET_LOADING', dataType: 'secondary', loading: true });

    try {
      // Cargar datos solo necesarios para admin y que no son críticos
      const results = await Promise.allSettled([
        dataService.getScheduleOverrides().catch(() => ({})),
        dataService.getCapacityMessageSettings().catch(() => ({ thresholds: [] })),
        dataService.getInvoiceRequests().catch(() => []),
        dataService.getGiftcards().catch(() => []),
      ]);

      dispatch({
        type: 'SET_SECONDARY_DATA',
        data: {
          scheduleOverrides: results[0].status === 'fulfilled' ? results[0].value : {},
          capacityMessages: results[1].status === 'fulfilled' ? results[1].value : { thresholds: [] },
          invoiceRequests: results[2].status === 'fulfilled' ? results[2].value : [],
          giftcards: results[3].status === 'fulfilled' ? results[3].value : [],
        }
      });
      console.debug('[AdminDataContext] Loaded secondary data (admin): giftcards count', results[3].status === 'fulfilled' ? (results[3].value || []).length : 0);
    } catch (error) {
      console.error('Error loading secondary admin data:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', dataType: 'secondary', loading: false });
    }
  }, [isAdmin, needsUpdate]);

  // Refrescar todo
  const refresh = useCallback(() => {
    fetchCriticalData(true);
    fetchExtendedData(true);
    fetchSecondaryData(true);
  }, [fetchCriticalData, fetchExtendedData, fetchSecondaryData]);

  // Refrescar solo críticos
  const refreshCritical = useCallback(() => {
    fetchCriticalData(true);
  }, [fetchCriticalData]);

  // Refrescar solo extendidos
  const refreshExtended = useCallback(() => {
    fetchExtendedData(true);
  }, [fetchExtendedData]);

  // Refrescar solo secundarios
  const refreshSecondary = useCallback(() => {
    fetchSecondaryData(true);
  }, [fetchSecondaryData]);

  // Cargar datos iniciales - solo una vez al montar
  useEffect(() => {
    let mounted = true;
    
    const loadInitialData = async () => {
      if (mounted) {
        await fetchCriticalData(true); // Force inicial load
        // Cargar datos extendidos después de un breve delay si aún está montado
        setTimeout(() => {
          if (mounted) {
            fetchExtendedData(true);
            // Si es admin, también cargar datos secundarios (después de más delay)
            if (isAdmin) {
              setTimeout(() => {
                if (mounted) {
                  fetchSecondaryData(true);
                }
              }, 300);
            }
          }
        }, 100);
      }
    };
    
    loadInitialData();
    
    return () => {
      mounted = false;
    };
  }, [isAdmin]); // Agrego isAdmin como dependencia para recargar si cambia

  const adminData: AdminData = {
  ...state,
  loading: state.loadingState.critical || state.loadingState.extended, // ✅ Boolean para compatibilidad
  refresh,
  refreshCritical,
  refreshExtended,
  refreshSecondary,
  };

  return (
    <AdminDataContext.Provider value={adminData}>
      {children}
    </AdminDataContext.Provider>
  );
};
