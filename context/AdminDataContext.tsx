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
  loading: boolean; // ✅ Cambiar a boolean para compatibilidad
  loadingState: {
    critical: boolean;
    extended: boolean;
    individual: Record<string, boolean>;
  };
  lastUpdated: {
    critical: number | null;
    extended: number | null;
  };
  error: string | null;
  refresh: () => void;
  refreshCritical: () => void;
  refreshExtended: () => void;
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
  classCapacity: {},
  capacityMessages: {},
  announcements: [],
  invoiceRequests: [],
  giftcardRequests: [],
  loadingState: {
    critical: false,
    extended: false,
    individual: {} as Record<string, boolean>,
  },
  lastUpdated: {
    critical: null as number | null,
    extended: null as number | null,
  },
  error: null as string | null,
};

type AdminState = typeof initialState;

// Acciones del reducer
type AdminAction =
  | { type: 'SET_LOADING'; dataType: 'critical' | 'extended' | string; loading: boolean }
  | { type: 'SET_CRITICAL_DATA'; data: Partial<AdminState> }
  | { type: 'SET_EXTENDED_DATA'; data: Partial<AdminState> }
  | { type: 'SET_INDIVIDUAL_DATA'; dataType: string; data: any }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'UPDATE_TIMESTAMP'; dataType: 'critical' | 'extended' }
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

const AdminDataContext = createContext<AdminData | undefined>(undefined);

export const useAdminData = () => {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider');
  return ctx;
};

export const AdminDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState);

  // Helper para verificar si necesita actualizar (sin dependencias de state)
  const needsUpdate = useCallback((lastUpdate: number | null, duration: number): boolean => {
    if (!lastUpdate) return true;
    return Date.now() - lastUpdate > duration;
  }, []);

  // Cargar datos críticos (más frecuentes)
  const fetchCriticalData = useCallback(async (force = false) => {
    if (!force && !needsUpdate(state.lastUpdated.critical, CRITICAL_CACHE_DURATION)) return;
    if (state.loadingState.critical) return;

    dispatch({ type: 'SET_LOADING', dataType: 'critical', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      // Usar batch optimizado del dataService para datos críticos con fallback
      const results = await Promise.allSettled([
        dataService.getBookings().catch(() => []),
        dataService.getCustomers().catch(() => []),
        dataService.getGroupInquiries().catch(() => []),
        dataService.getAnnouncements().catch(() => []),
        dataService.getGiftcardRequests().catch(() => []),
      ]);
      dispatch({
        type: 'SET_CRITICAL_DATA',
        data: {
          bookings: results[0].status === 'fulfilled' ? results[0].value : [],
          customers: results[1].status === 'fulfilled' ? results[1].value : [],
          inquiries: results[2].status === 'fulfilled' ? results[2].value : [],
          announcements: results[3].status === 'fulfilled' ? results[3].value : [],
        }
      });
      dispatch({
        type: 'SET_GIFTCARD_REQUESTS',
        requests: results[4].status === 'fulfilled' ? results[4].value : [],
      });
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
    if (!force && !needsUpdate(state.lastUpdated.extended, EXTENDED_CACHE_DURATION)) return;
    if (state.loadingState.extended) return;

    dispatch({ type: 'SET_LOADING', dataType: 'extended', loading: true });

    try {
      const results = await Promise.allSettled([
        dataService.getProducts().catch(() => []),
        dataService.getInstructors().catch(() => []),
        dataService.getAvailability().catch(() => ({})),
        dataService.getScheduleOverrides().catch(() => ({})),
        dataService.getClassCapacity().catch(() => ({})),
        dataService.getCapacityMessageSettings().catch(() => ({})),
        dataService.getInvoiceRequests().catch(() => []),
      ]);

      dispatch({
        type: 'SET_EXTENDED_DATA',
        data: {
          products: results[0].status === 'fulfilled' ? results[0].value : [],
          instructors: results[1].status === 'fulfilled' ? results[1].value : [],
          availability: results[2].status === 'fulfilled' ? results[2].value : {},
          scheduleOverrides: results[3].status === 'fulfilled' ? results[3].value : {},
          classCapacity: results[4].status === 'fulfilled' ? results[4].value : {},
          capacityMessages: results[5].status === 'fulfilled' ? results[5].value : {},
          invoiceRequests: results[6].status === 'fulfilled' ? results[6].value : [],
        }
      });
    } catch (error) {
      console.error('Error loading extended admin data:', error);
      // Fallback con datos vacíos
      dispatch({
        type: 'SET_EXTENDED_DATA',
        data: {
          products: [],
          instructors: [],
          availability: {},
          scheduleOverrides: {},
          classCapacity: {},
          capacityMessages: {},
          invoiceRequests: [],
        }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', dataType: 'extended', loading: false });
    }
  }, [needsUpdate]);

  // Refrescar todo
  const refresh = useCallback(() => {
    fetchCriticalData(true);
    fetchExtendedData(true);
  }, [fetchCriticalData, fetchExtendedData]);

  // Refrescar solo críticos
  const refreshCritical = useCallback(() => {
    fetchCriticalData(true);
  }, [fetchCriticalData]);

  // Refrescar solo extendidos
  const refreshExtended = useCallback(() => {
    fetchExtendedData(true);
  }, [fetchExtendedData]);

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
          }
        }, 100);
      }
    };
    
    loadInitialData();
    
    return () => {
      mounted = false;
    };
  }, []); // Sin dependencias - solo se ejecuta al montar

  const adminData: AdminData = {
  ...state,
  loading: state.loadingState.critical || state.loadingState.extended, // ✅ Boolean para compatibilidad
  refresh,
  refreshCritical,
  refreshExtended,
  };

  return (
    <AdminDataContext.Provider value={adminData}>
      {children}
    </AdminDataContext.Provider>
  );
};
