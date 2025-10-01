import React, { useState, useEffect, useCallback } from 'react';
// ...existing code...
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
import type { AdminTab, Notification, Product, Booking, GroupInquiry, Instructor, ScheduleOverrides, DayKey, AvailableSlot, ClassCapacity, CapacityMessageSettings, Announcement, AppData, BankDetails, InvoiceRequest, NavigationState } from '../../types';
import { ScheduleSettingsManager } from './ScheduleSettingsManager';
import { CalendarEditIcon } from '../icons/CalendarEditIcon';
import { InquiryManager } from './InquiryManager';
import { ChatBubbleLeftRightIcon } from '../icons/ChatBubbleLeftRightIcon';
import * as dataService from '../../services/dataService';
import { SyncButton } from './SyncButton';
import { ClientNotificationLog } from './ClientNotificationLog';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { InvoiceManager } from './InvoiceManager';
import { formatDistanceToNow } from 'date-fns';
import ErrorBoundary from './ErrorBoundary';

interface AdminData {
  products: Product[];
  bookings: Booking[];
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
    inquiries: [],
    instructors: [],
    availability: {
        Sunday: [], Monday: [], Tuesday: [], Wednesday: [],
        Thursday: [], Friday: [], Saturday: []
    },
    scheduleOverrides: {},
    classCapacity: { potters_wheel: 0, molding: 0, introductory_class: 0 },
    capacityMessages: { thresholds: [] },
    announcements: [],
    invoiceRequests: []
};


export const AdminConsole: React.FC = () => {
  // Traducción eliminada, usar texto en español directamente
  const [activeTab, setActiveTab] = useState<AdminTab>('calendar');
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [weekStartDate, setWeekStartDate] = useState<Date | null>(null);
  const [navigateTo, setNavigateTo] = useState<NavigationState | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState<AdminData | null>(null);

  const { dataVersion, forceRefresh } = useNotifications();
  
  const handleNavigationComplete = useCallback(() => {
    setNavigateTo(null);
  }, []);

  const fetchData = useCallback(async () => {
      !isLoading && setIsSyncing(true);
      try {
          const [
              products, bookings, inquiries, instructors, availability, 
              scheduleOverrides, classCapacity, capacityMessages, announcements,
              invoiceRequests
          ] = await Promise.all([
              dataService.getProducts(),
              dataService.getBookings(),
              dataService.getGroupInquiries(),
              dataService.getInstructors(),
              dataService.getAvailability(),
              dataService.getScheduleOverrides(),
              dataService.getClassCapacity(),
              dataService.getCapacityMessageSettings(),
              dataService.getAnnouncements(),
              dataService.getInvoiceRequests(),
          ]);
          setAdminData({ 
              products, bookings, inquiries, instructors, availability, 
              scheduleOverrides, classCapacity, capacityMessages, announcements,
              invoiceRequests
          });
      } catch (error) {
          console.error("Failed to fetch admin data", error);
          setAdminData(defaultAdminData);
      } finally {
          setIsLoading(false);
          setIsSyncing(false);
      }
  }, [isLoading]);

  useEffect(() => {
    fetchData();
  }, [dataVersion, fetchData]);
  
  const handleSync = forceRefresh;

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
        const bookings = await dataService.getBookings();
        const booking = bookings.find(b => b.id === notification.targetId);
        if (booking) {
            setNavigateTo({ tab: 'customers', targetId: booking.userInfo.email });
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
    if (isLoading || !adminData) {
  return <div>Cargando datos de administración...</div>;
    }

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
        bankDetails: { bankName: '', accountHolder: '', accountNumber: '', accountType: '', taxId: '' }
    };

    switch (activeTab) {
      case 'products':
        return <ProductManager products={adminData.products} onDataChange={handleSync} />;
      case 'calendar':
        if (calendarView === 'month') {
          return <CalendarOverview bookings={adminData.bookings} onDateSelect={handleDateSelect} onDataChange={handleSync} />;
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
      case 'settings':
        return <SettingsManager />; 
      default:
        return null;
    }
  };

  const TabButton: React.FC<{ tab: AdminTab; children: React.ReactNode; icon: React.ReactNode }> = ({ tab, children, icon }) => (
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
