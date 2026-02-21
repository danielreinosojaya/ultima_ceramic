import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Logo } from '../Logo';
import { ProductManager } from './ProductManager';
import { CalendarOverview } from './CalendarOverview';
import { ScheduleManager } from './ScheduleManager';
import { FinancialDashboard } from './FinancialDashboard';
import CrmDashboard from './CrmDashboard';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationBell } from './NotificationBell';
import { NotificationToast } from './NotificationToast';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { CubeIcon } from '../icons/CubeIcon';
import { CogIcon } from '../icons/CogIcon';
import { SettingsManager } from './SettingsManager';
import { PiecesManager } from './PiecesManager';
import type { AdminTab, Notification, Product, Booking, Customer, GroupInquiry, Instructor, ScheduleOverrides, DayKey, AvailableSlot, ClassCapacity, CapacityMessageSettings, Announcement, AppData, BankDetails, InvoiceRequest, NavigationState } from '../../types';

type ExtendedAdminTab = AdminTab | 'giftcards' | 'expired-bookings' | 'pieces' | 'courses' | 'valentine';
import { ScheduleSettingsManager } from './ScheduleSettingsManager';
import { CalendarEditIcon } from '../icons/CalendarEditIcon';
import { InquiryManager } from './InquiryManager';
import { ChatBubbleLeftRightIcon } from '../icons/ChatBubbleLeftRightIcon';
import * as dataService from '../../services/dataService';
import GiftcardsManager from './GiftcardsManager';
import { useAdminData } from '../../context/AdminDataContext';
import { SyncButton } from './SyncButton';
import { ClientNotificationLog } from './ClientNotificationLog';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { InvoiceManager } from './InvoiceManager';
import { formatDistanceToNow } from 'date-fns';
import ErrorBoundary from './ErrorBoundary';
import { ExpiredBookingsManager } from './ExpiredBookingsManager';
import { AdminCourseManagement } from './AdminCourseManagement';
import { ValentineAdminPanel } from './ValentineAdminPanel';

interface AdminData {
  products: Product[];
  bookings: Booking[];
  customers: Customer[];
  inquiries: GroupInquiry[];
  instructors: Instructor[];
  availability: Record<DayKey, AvailableSlot[]>;
  scheduleOverrides: ScheduleOverrides;
  classCapacity: ClassCapacity;
  capacityMessages: CapacityMessageSettings;
  announcements: Announcement[];
  invoiceRequests: InvoiceRequest[];
}

const defaultAdminData: AdminData = {
  products: [],
  bookings: [],
  customers: [],
  inquiries: [],
  instructors: [],
  availability: {} as Record<DayKey, AvailableSlot[]>,
  scheduleOverrides: {},
  classCapacity: {} as ClassCapacity,
  capacityMessages: {} as CapacityMessageSettings,
  announcements: [],
  invoiceRequests: []
};


export const AdminConsole: React.FC = () => {
  // Traducción eliminada, usar texto en español directamente
  const [activeTab, setActiveTab] = useState<ExtendedAdminTab>('calendar');
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [weekStartDate, setWeekStartDate] = useState<Date | null>(null);
  const [navigateTo, setNavigateTo] = useState<NavigationState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { dataVersion, forceRefresh } = useNotifications();
  const adminData = useAdminData();
  
  // Show loading state while data is being fetched
  if (adminData.loadingState.critical) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-secondary">Cargando datos críticos...</p>
        </div>
      </div>
    );
  }
  
  const handleNavigationComplete = useCallback(() => {
    setNavigateTo(null);
  }, []);

  // Eliminar fetch local, los datos vienen del contexto
  
  const handleSync = () => {
    console.log('handleSync called, will increment dataVersion and refresh admin data');
    setIsSyncing(true);
    if (adminData.refresh) {
      adminData.refresh();
    }
    forceRefresh();
  };
  // Set isSyncing to false when adminData finishes loading
  useEffect(() => {
    if (!adminData.loading) {
      setIsSyncing(false);
    }
  }, [adminData.loading]);

  useEffect(() => {
  if (navigateTo) {
    // Si la navegación viene de 'schedule', activa el tab 'calendar' y modo 'week'
    if (navigateTo.tab === 'schedule') {
      setActiveTab('calendar');
      setCalendarView('week');
      // Opcional: buscar el booking y setear la semana si tienes la fecha
      // Esto se puede mejorar si tienes acceso a la fecha del slot
    } else {
      setActiveTab(navigateTo.tab);
    }
  }
  }, [navigateTo]);

  const handleNotificationClick = async (notification: Notification) => {
    handleSync(); 
    if (notification.type === 'new_booking') {
        // Use cached bookings instead of fetching again
        if (adminData?.bookings) {
            const booking = adminData.bookings.find(b => b.id === notification.targetId);
            if (booking) {
                setNavigateTo({ tab: 'customers', targetId: booking.userInfo.email });
            }
        }
    } else if (notification.type === 'new_inquiry') {
        setNavigateTo({ tab: 'inquiries', targetId: notification.targetId });
    } else if (notification.type === 'new_invoice_request') {
        setNavigateTo({ tab: 'invoicing', targetId: notification.targetId });
    }
  };

  const handleDateSelect = (date: Date) => {
    setWeekStartDate(date);
    setCalendarView('week');
  };

  const handleBackToMonth = () => {
    setCalendarView('month');
    setWeekStartDate(null);
  };

  const renderContent = () => {
    // Mantener contenido montado durante refresh para evitar pérdida de estado en módulos

  // targetId para ScheduleManager si la navegación viene de 'schedule' o 'calendar'
  const targetId = (navigateTo && (navigateTo.tab === 'schedule' || navigateTo.tab === 'calendar')) ? navigateTo.targetId : undefined;

    const appDataForScheduleManager: AppData = { 
        products: adminData.products,
        instructors: adminData.instructors,
        availability: adminData.availability,
        scheduleOverrides: adminData.scheduleOverrides,
        classCapacity: adminData.classCapacity,
        capacityMessages: adminData.capacityMessages,
        announcements: adminData.announcements,
        bookings: adminData.bookings,
        policies: '', 
        confirmationMessage: { title: '', message: ''}, 
        footerInfo: { address: '', email: '', whatsapp: '', googleMapsLink: '', instagramHandle: '' },
        bankDetails: [{ bankName: '', accountHolder: '', accountNumber: '', accountType: '', taxId: '' }]
    };

    switch (activeTab) {
      case 'giftcards':
        return <GiftcardsManager />;
      case 'products':
        return <ProductManager products={adminData.products} onDataChange={handleSync} />;
      case 'calendar':
        if (calendarView === 'month') {
          return <CalendarOverview bookings={adminData.bookings} onDateSelect={handleDateSelect} onDataChange={handleSync} products={adminData.products} />;
        } else {
          return (
            <ErrorBoundary fallback={<p className="text-center text-red-500 font-bold p-8">Hubo un error al cargar el calendario. Por favor, intenta de nuevo.</p>}>
              <ScheduleManager 
                initialDate={weekStartDate || new Date()} 
                onBackToMonth={handleBackToMonth}
                {...appDataForScheduleManager}
                invoiceRequests={adminData.invoiceRequests}
                setNavigateTo={setNavigateTo}
                onDataChange={handleSync}
              />
            </ErrorBoundary>
          );
        }
      case 'schedule-settings':
        return <ScheduleSettingsManager 
            availability={adminData.availability}
            overrides={adminData.scheduleOverrides}
            freeDateTimeOverrides={adminData.freeDateTimeOverrides || {}}
            experienceTypeOverrides={adminData.experienceTypeOverrides || {}}
            instructors={adminData.instructors}
            classCapacity={adminData.classCapacity}
            onDataChange={handleSync}
        />;
      case 'financials':
        return <FinancialDashboard 
                  bookings={adminData.bookings} 
                  onDataChange={handleSync} 
                  setNavigateTo={setNavigateTo}
                  invoiceRequests={adminData.invoiceRequests}
                />;
      case 'customers':
        return <CrmDashboard 
                  bookings={adminData.bookings}
                  customers={adminData.customers}
                  navigateToEmail={targetId} 
                  onDataChange={handleSync} 
                  onNavigationComplete={handleNavigationComplete}
                  invoiceRequests={adminData.invoiceRequests}
                  setNavigateTo={setNavigateTo}
                />;
      case 'inquiries':
        return <InquiryManager inquiries={adminData.inquiries} onDataChange={handleSync} navigateToId={targetId} />;
      case 'invoicing':
        return <InvoiceManager invoiceRequests={adminData.invoiceRequests} onDataChange={handleSync} navigateToId={targetId} setNavigateTo={setNavigateTo} />;
      case 'communications':
        return <ClientNotificationLog />;
      case 'courses':
        return <AdminCourseManagement />;
      case 'valentine':
        return <ValentineAdminPanel />;
      case 'expired-bookings':
        return <ExpiredBookingsManager />;
      case 'pieces':
        return <PiecesManager onDataChange={handleSync} />;
      case 'settings':
        return <SettingsManager />; 
      default:
        return null;
    }
  };

  const TabButton: React.FC<{ tab: ExtendedAdminTab; children: React.ReactNode; icon: React.ReactNode }> = ({ tab, children, icon }) => (
    <button
      onClick={() => {
        if (tab === 'calendar') setCalendarView('month');
        setActiveTab(tab);
      }}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors ${
        activeTab === tab
          ? 'bg-brand-primary text-white'
          : 'text-brand-secondary hover:bg-brand-background'
      }`}
    >
      {icon}
      {children}
    </button>
  );

  return (
    <div className="bg-brand-background min-h-screen text-brand-text font-sans">
      <NotificationToast />
      {adminData.loading && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none">
          <div className="mt-4 px-4 py-2 bg-white/90 border border-brand-border rounded-lg shadow text-sm font-semibold text-brand-secondary">
            Actualizando datos…
          </div>
        </div>
      )}
      <header className="bg-brand-surface shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="w-24">
            <Logo />
          </div>
          <h1 className="text-xl sm:text-2xl font-serif text-brand-accent text-center">
            Panel de Administración
          </h1>
          <div className="w-24 flex justify-end items-center gap-2">
              <SyncButton hasNewData={false} isSyncing={isSyncing} onClick={handleSync} />
              <NotificationBell onNotificationClick={handleNotificationClick} />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-screen-xl mx-auto">
          <div className="bg-brand-surface rounded-lg shadow-lg p-4 mb-6">
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <TabButton tab="products" icon={<CubeIcon className="w-4 h-4" />}>Productos</TabButton>
              <TabButton tab="calendar" icon={<CalendarIcon className="w-4 h-4" />}>Calendario</TabButton>
              <TabButton tab="schedule-settings" icon={<CalendarEditIcon className="w-4 h-4" />}>Configuración de Horarios</TabButton>
              <TabButton tab="inquiries" icon={<ChatBubbleLeftRightIcon className="w-4 h-4" />}>Consultas</TabButton>
              <TabButton tab="communications" icon={<PaperAirplaneIcon className="w-4 h-4" />}>Comunicaciones</TabButton>
              <TabButton tab="financials" icon={<ChartBarIcon className="w-4 h-4" />}>Finanzas</TabButton>
              <TabButton tab="customers" icon={<UserGroupIcon className="w-4 h-4" />}>Clientes</TabButton>
              <TabButton tab="invoicing" icon={<DocumentTextIcon className="w-4 h-4" />}>Facturación</TabButton>
              <button
                disabled
                title="Módulo en desarrollo"
                className="px-4 py-2 rounded-lg text-brand-secondary bg-gray-100 cursor-not-allowed opacity-50 flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="2" stroke="#A89C94" strokeWidth="2" fill="none"/><circle cx="16" cy="8" r="2" stroke="#A89C94" strokeWidth="2" fill="none"/><circle cx="12" cy="16" r="2" stroke="#A89C94" strokeWidth="2" fill="none"/><path d="M8 10v4M16 10v4M12 14v2" stroke="#A89C94" strokeWidth="1"/></svg>
                Piecitas <span className="text-xs bg-gray-300 px-2 py-1 rounded">Próximamente</span>
              </button>
              <TabButton tab="giftcards" icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="10" rx="2" stroke="#A89C94" strokeWidth="2" fill="#F5F3EA"/><path d="M3 7l9 7 9-7" stroke="#A89C94" strokeWidth="2" fill="none"/></svg>}>Giftcards</TabButton>
              <TabButton tab="courses" icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3" strokeWidth="2"/><path d="M12 1v6m0 6v6M1 12h6m6 0h6" strokeWidth="2" strokeLinecap="round"/></svg>}>Cursos</TabButton>
              <TabButton tab="valentine" icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#E11D48" stroke="#E11D48" strokeWidth="1"/></svg>}>San Valentín</TabButton>
              <TabButton tab="expired-bookings" icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#E11D48" strokeWidth="2"/><path d="M12 7v5" stroke="#E11D48" strokeWidth="2"/><circle cx="12" cy="19" r="1" fill="#E11D48"/></svg>}>Pre-Reservas</TabButton>
              <TabButton tab="settings" icon={<CogIcon className="w-4 h-4" />}>Ajustes</TabButton>
            </div>
          </div>
          <div className="bg-brand-surface rounded-lg shadow-lg p-6">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};
