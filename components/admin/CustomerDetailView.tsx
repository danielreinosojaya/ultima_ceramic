import React, { useMemo, useState, useEffect } from 'react';
import type { Customer, Booking, InvoiceRequest, AdminTab, ClassPackage, OpenStudioSubscription, IntroductoryClass, PaymentDetails, Delivery } from '../../types.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { MailIcon } from '../icons/MailIcon.js';
import { PhoneIcon } from '../icons/PhoneIcon.js';
import { ActivePackagesDisplay, AugmentedPackage } from './ActivePackagesDisplay.js';
import { AcceptPaymentModal } from './AcceptPaymentModal.js';
import * as dataService from '../../services/dataService.js';
import { CurrencyDollarIcon } from '../icons/CurrencyDollarIcon.js';
import { TrashIcon } from '../icons/TrashIcon.js';
import { UserIcon } from '../icons/UserIcon.js';
import { InvoiceReminderModal } from './InvoiceReminderModal.js';
import { CustomerAttendanceHistory } from './CustomerAttendanceHistory.js';
import { CalendarIcon } from '../icons/CalendarIcon.js';
import { NewDeliveryModal } from './NewDeliveryModal.js';


interface NavigationState {
    tab: AdminTab;
    targetId: string;
}

interface CustomerDetailViewProps {
  customer: Customer;
  onBack: () => void;
  onDataChange: () => void;
  invoiceRequests: InvoiceRequest[];
  setNavigateTo: React.Dispatch<React.SetStateAction<NavigationState | null>>;
}

// Add this helper function to your file
const formatDate = (dateInput: Date | string | undefined | null, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!dateInput) return 'No especificada';
  
  let date: Date;
  
  try {
    if (typeof dateInput === 'string') {
      // Handle different string formats
      if (dateInput === '' || dateInput === 'null' || dateInput === 'undefined') {
        return 'No especificada';
      }
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        // YYYY-MM-DD format - add time to avoid timezone issues
        date = new Date(dateInput + 'T12:00:00.000Z');
      } else if (/^\d{4}-\d{2}-\d{2}T/.test(dateInput)) {
        // ISO format
        date = new Date(dateInput);
      } else {
        // Try parsing as-is
        date = new Date(dateInput);
      }
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      // Fallback for other types
      date = new Date(dateInput as any);
    }
    
    if (isNaN(date.getTime()) || date.getTime() === 0) {
      // Try one more fallback: maybe it's a timestamp
      if (typeof dateInput === 'string' && /^\d+$/.test(dateInput)) {
        date = new Date(parseInt(dateInput));
        if (isNaN(date.getTime()) || date.getTime() <= 0) {
          return 'Fecha no guardada';
        }
      } else {
        return 'Fecha no guardada';
      }
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
      ...options
    };
    
    return date.toLocaleDateString('es', defaultOptions);
    
  } catch (error) {
    console.error('❌ Error in formatDate:', error, 'Input was:', dateInput);
    return 'Error al formatear fecha';
  }
};


// Add this helper function to your file
const getBookingDisplayDate = (booking: Booking, language: string): string => {
    // 1. Prioritize the new, reliable bookingDate field
    if (booking.bookingDate) {
        return formatDate(booking.bookingDate);
    } 
    // 2. Fallback to the first slot date for older bookings or class packages
    if (booking.slots && booking.slots.length > 0) {
        return formatDate(booking.slots[0].date);
    }
    // 3. Last resort is the server-side creation timestamp
    if (booking.createdAt) {
      return formatDate(booking.createdAt);
    }
    // 4. Return a placeholder if no valid date is found
    return '---';
};


export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({ customer, onBack, onDataChange, invoiceRequests, setNavigateTo }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'history' | 'deliveries'>('info');
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [isNewDeliveryModalOpen, setIsNewDeliveryModalOpen] = useState(false);
    const [deliveryToDelete, setDeliveryToDelete] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [deliveriesPerPage] = useState(5);
    const [editMode, setEditMode] = useState(false);
    const [editInfo, setEditInfo] = useState({
        firstName: customer.userInfo.firstName,
        lastName: customer.userInfo.lastName,
        email: customer.userInfo.email,
        phone: customer.userInfo.phone,
        countryCode: customer.userInfo.countryCode,
        birthday: customer.userInfo.birthday || ''
    });

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveEdit = async () => {
        // Save edited info using dataService
        await dataService.updateCustomerInfo(customer.email, editInfo);
        setEditMode(false);
        onDataChange();
    };

    // Load customer deliveries
    useEffect(() => {
        const loadDeliveries = async () => {
            try {
                const customerDeliveries = await dataService.getDeliveriesByCustomer(customer.userInfo.email);
                setDeliveries(customerDeliveries);
            } catch (error) {
                console.error('Error loading deliveries:', error);
            }
        };
        loadDeliveries();
    }, [customer.userInfo.email]);

    const handleCreateDelivery = async (deliveryData: Omit<Delivery, 'id' | 'createdAt'>) => {
        try {
            await dataService.createDelivery(deliveryData);
            // Reload deliveries after creation
            const customerDeliveries = await dataService.getDeliveriesByCustomer(customer.userInfo.email);
            setDeliveries(customerDeliveries);
        } catch (error) {
            console.error('Error creating delivery:', error);
            throw error; // Re-throw so the modal can handle the error
        }
    };

    const handleMarkDeliveryCompleted = async (deliveryId: string) => {
        try {
            const result = await dataService.markDeliveryAsCompleted(deliveryId);
            if (result.success && result.delivery) {
                setDeliveries(prev => 
                    prev.map(d => d.id === deliveryId ? result.delivery! : d)
                );
                onDataChange();
            }
        } catch (error) {
            console.error('Error marking delivery as completed:', error);
        }
    };

    const handleRevertDelivery = async (deliveryId: string) => {
        try {
            const result = await dataService.updateDelivery(deliveryId, { 
                status: 'pending',
                deliveredAt: null
            });
            if (result.success && result.delivery) {
                setDeliveries(prev => 
                    prev.map(d => d.id === deliveryId ? result.delivery! : d)
                );
                onDataChange();
            }
        } catch (error) {
            console.error('Error reverting delivery:', error);
        }
    };

    const handleDeleteDelivery = async (deliveryId: string) => {
        try {
            const result = await dataService.deleteDelivery(deliveryId);
            if (result.success) {
                setDeliveries(prev => prev.filter(d => d.id !== deliveryId));
                setDeliveryToDelete(null);
                // Ajustar página si es necesario
                const totalPages = Math.ceil((deliveries.length - 1) / deliveriesPerPage);
                if (currentPage > totalPages && totalPages > 0) {
                    setCurrentPage(totalPages);
                }
                onDataChange();
            }
        } catch (error) {
            console.error('Error deleting delivery:', error);
        }
    };
    // Hardcoded language and translation function
    const language = 'es';
    const t = (key: string, opts?: any) => {
        // Simple hardcoded translation function
        const translations: Record<string, string> = {
            'admin.customerDetail.deleteConfirmText': '¿Seguro que deseas eliminar esta reserva?',
            'admin.customerDetail.backButton': 'Volver',
            'admin.crm.lifetimeValue': 'Valor total',
            'admin.crm.totalBookings': 'Reservas totales',
            'admin.crm.lastBooking': 'Última reserva',
            'admin.customerDetail.packageStatus.active': 'Activo',
            'admin.customerDetail.packageStatus.pending payment': 'Pago pendiente',
            'admin.customerDetail.packageStatus.expired': 'Expirado',
            'admin.customerDetail.packageStatus.completed': 'Completado',
            'admin.customerDetail.packageStatusTooltip.active': 'Paquete activo',
            'admin.customerDetail.packageStatusTooltip.pending payment': 'Pago pendiente',
            'admin.customerDetail.packageStatusTooltip.expired': 'Paquete expirado',
            'admin.customerDetail.packageStatusTooltip.completed': 'Paquete completado',
            'admin.customerDetail.packageExpiryTooltip': 'Fecha de expiración',
            'admin.customerDetail.packageExpiryLabel': 'Expira',
            'admin.customerDetail.packageNextClassTooltip': 'Próxima clase',
            'admin.customerDetail.packageNextClassLabel': 'Próxima clase',
            'admin.customerDetail.packageProgressLabel': 'Progreso',
            'admin.customerDetail.viewAttendanceButton': 'Ver asistencia',
            'admin.customerDetail.historyTitle': 'Historial de reservas',
            'admin.customerDetail.history.date': 'Fecha',
            'admin.customerDetail.history.product': 'Producto',
            'admin.customerDetail.history.progress': 'Progreso',
            'admin.customerDetail.history.status': 'Estado',
            'admin.customerDetail.history.actions': 'Acciones',
            'admin.customerDetail.history.paidTooltip': 'Pagado',
            'admin.customerDetail.history.unpaidTooltip': 'No pagado',
            'admin.customerDetail.history.paid': 'Pagado',
            'admin.customerDetail.history.unpaid': 'No pagado',
            'admin.customerDetail.history.acceptPayment': 'Aceptar pago',
            'admin.customerDetail.history.acceptPaymentAria': 'Aceptar pago',
            'admin.customerDetail.history.deleteBooking': 'Eliminar reserva',
            'admin.customerDetail.history.deleteBookingAria': 'Eliminar reserva',
        };
        return translations[key] || opts?.default || key;
    };
  const [bookingToPay, setBookingToPay] = useState<Booking | null>(null);
  const [isInvoiceReminderOpen, setIsInvoiceReminderOpen] = useState(false);
  const [bookingForReminder, setBookingForReminder] = useState<Booking | null>(null);
  const [isViewingAttendance, setIsViewingAttendance] = useState(false);

  // CORRECCIÓN: El cálculo de `totalValue` debe sumar los montos de `paymentDetails`
  // en lugar del precio total de la reserva, que podría ser diferente.
    const { totalValue, totalBookings, lastBookingDate } = useMemo(() => {
        const totalSpent = customer.bookings.reduce((sum, b) => 
                sum + (b.paymentDetails || []).reduce((paymentSum, p) => paymentSum + p.amount, 0), 0
        );
        const totalBookingsCount = customer.bookings.length;
        // Find the most recent booking date
        const lastBooking = customer.bookings.length > 0
            ? customer.bookings.reduce((latest, b) => {
                    const date = b.createdAt ? new Date(b.createdAt) : null;
                    return (!latest || (date && date > latest)) ? date : latest;
                }, null)
            : null;
        return {
            totalValue: totalSpent,
            totalBookings: totalBookingsCount,
            lastBookingDate: lastBooking,
        };
    }, [customer.bookings]);

  // CORRECCIÓN: El estado del paquete activo se debe recalcular en función del total pagado,
  // no solo de la bandera `isPaid`.
  const augmentedPackages = useMemo((): AugmentedPackage[] => {
    const now = new Date();
    return customer.bookings
        .map(booking => {
            const totalPaid = (booking.paymentDetails || []).reduce((sum, p) => sum + p.amount, 0);
            let status: AugmentedPackage['status'] = totalPaid >= booking.price ? 'Active' : 'Pending Payment';
            let progressPercent = 0;
            let completedCount = 0;
            let totalCount = 0;
            let expiryDate: Date | null = null;
            let nextClassDate: Date | null = null;

            const isPackageOrIntro = booking.productType === 'CLASS_PACKAGE' || booking.productType === 'INTRODUCTORY_CLASS';
            
            if (isPackageOrIntro || booking.productType === 'OPEN_STUDIO_SUBSCRIPTION') {
                if (totalPaid >= booking.price) { // Usar totalPaid en lugar de isPaid
                    if (isPackageOrIntro) {
                        const pkg = booking.product as ClassPackage | IntroductoryClass;
                        totalCount = 'classes' in pkg ? pkg.classes : 1;
                        const sortedSlots = [...booking.slots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        
                        if (sortedSlots.length > 0) {
                            const firstClassDate = new Date(sortedSlots[0].date + 'T00:00:00Z'); // Use Z for UTC
                            expiryDate = new Date(firstClassDate);
                            expiryDate.setUTCDate(expiryDate.getUTCDate() + 30); // 30 day validity

                            completedCount = sortedSlots.filter(s => new Date(`${s.date}T${s.time}`) < now).length;
                            
                            const futureSlots = sortedSlots.filter(s => new Date(`${s.date}T${s.time}`) >= now);
                            if (futureSlots.length > 0) {
                                nextClassDate = new Date(`${futureSlots[0].date}T${futureSlots[0].time}`);
                            }
                        }

                        if (completedCount >= totalCount) {
                            status = 'Completed';
                        } else if (expiryDate && now > expiryDate) {
                            status = 'Expired';
                        } else {
                            status = 'Active';
                        }
                        progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                    } else if (booking.productType === 'OPEN_STUDIO_SUBSCRIPTION') {
                        const sub = booking.product as OpenStudioSubscription;
                        totalCount = sub.details.durationDays;
                        if (booking.paymentDetails?.receivedAt) {
                            const startDate = new Date(booking.paymentDetails.receivedAt);
                            expiryDate = new Date(startDate);
                            expiryDate.setDate(expiryDate.getDate() + totalCount);
                            
                            if (now > expiryDate) {
                                status = 'Expired';
                            } else {
                                status = 'Active';
                                const elapsed = now.getTime() - startDate.getTime();
                                const totalDuration = expiryDate.getTime() - startDate.getTime();
                                progressPercent = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
                                completedCount = Math.floor(elapsed / (1000 * 60 * 60 * 24));
                            }
                        }
                    }
                } else {
                    status = 'Pending Payment';
                }
            }
            
            return {
                ...booking, status, progressPercent, completedCount,
                totalCount, expiryDate, nextClassDate
            };
        })
        // Show all statuses for admin context
        .filter(p => ['Active', 'Pending Payment', 'Expired', 'Completed'].includes(p.status));
  }, [customer.bookings]);

  const handleConfirmPayment = async (details: Omit<PaymentDetails, 'receivedAt'>) => {
    if (bookingToPay) {
        // Add receivedAt property as current ISO date string
        const paymentDetails: PaymentDetails = {
            ...details,
            receivedAt: new Date().toISOString(),
        };
        await dataService.addPaymentToBooking(bookingToPay.id, paymentDetails);
        setBookingToPay(null);
        onDataChange();
    }
  };
  
  const handleAcceptPaymentClick = (booking: Booking) => {
        const pendingInvoiceRequest = invoiceRequests.find(
            req => req.bookingId === booking.id && req.status === 'Pending'
        );
        if (pendingInvoiceRequest) {
            setBookingForReminder(booking);
            setIsInvoiceReminderOpen(true);
        } else {
            setBookingToPay(booking);
        }
    };

    const handleGoToInvoicing = () => {
        if (!bookingForReminder) return;
        const request = invoiceRequests.find(req => req.bookingId === bookingForReminder.id);
        if (request) {
            setNavigateTo({ tab: 'invoicing', targetId: request.id });
        }
        setIsInvoiceReminderOpen(false);
        setBookingForReminder(null);
    };

    const handleProceedWithPayment = () => {
        if (bookingForReminder) {
            setBookingToPay(bookingForReminder);
        }
        setIsInvoiceReminderOpen(false);
        setBookingForReminder(null);
    };


  const handleDeleteBooking = async (bookingId: string) => {
      if(window.confirm(t('admin.customerDetail.deleteConfirmText'))) {
          await dataService.deleteBooking(bookingId);
          onDataChange();
      }
  }

  if (isViewingAttendance) {
      return (
        <CustomerAttendanceHistory 
            customer={customer}
            onBack={() => setIsViewingAttendance(false)}
        />
      );
  }

  return (
        <div className="animate-fade-in">
            <div className="flex justify-end mb-2">
                {!editMode ? (
                    <button onClick={() => setEditMode(true)} className="px-3 py-1 bg-brand-primary text-white rounded hover:bg-brand-secondary font-semibold text-xs">Editar Cliente</button>
                ) : (
                    <>
                        <button onClick={handleSaveEdit} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 font-semibold text-xs mr-2">Guardar</button>
                        <button onClick={() => setEditMode(false)} className="px-3 py-1 bg-gray-300 text-gray-700 rounded font-semibold text-xs">Cancelar</button>
                    </>
                )}
            </div>
       {bookingToPay && (
            <AcceptPaymentModal
                isOpen={!!bookingToPay}
                onClose={() => setBookingToPay(null)}
                // CORRECCIÓN: Pasar la reserva completa y la función onDataChange
                booking={bookingToPay}
                onDataChange={onDataChange}
            />
        )}
        {isInvoiceReminderOpen && (
            <InvoiceReminderModal
                isOpen={isInvoiceReminderOpen}
                onClose={() => setIsInvoiceReminderOpen(false)}
                onProceed={handleProceedWithPayment}
                onGoToInvoicing={handleGoToInvoicing}
            />
        )}
      <button onClick={onBack} className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold">
        &larr; {t('admin.customerDetail.backButton')}
      </button>

      <div className="bg-brand-background p-6 rounded-lg mb-6">
                {!editMode ? (
                    <>
                        <h2 className="text-2xl font-bold text-brand-text">{customer.userInfo.firstName.toUpperCase()} {customer.userInfo.lastName.toUpperCase()}</h2>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-brand-secondary">
                            <span className="flex items-center gap-2"><MailIcon className="w-4 h-4" />{customer.userInfo.email}</span>
                            <span className="flex items-center gap-2"><PhoneIcon className="w-4 h-4" />{customer.userInfo.countryCode} {customer.userInfo.phone}</span>
                            {customer.userInfo.birthday && (
                                <span className="flex items-center gap-2 font-semibold">
                                        <CalendarIcon className="w-4 h-4" />
                                        {formatDate(customer.userInfo.birthday, { day: 'numeric', month: 'long' })}
                                </span>
                            )}
                        </div>
                    </>
                ) : (
                    <form className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="block text-xs font-semibold mb-1">Nombre</label>
                            <input name="firstName" value={editInfo.firstName} onChange={handleEditChange} className="w-full border rounded px-2 py-1" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1">Apellido</label>
                            <input name="lastName" value={editInfo.lastName} onChange={handleEditChange} className="w-full border rounded px-2 py-1" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1">Correo</label>
                            <input name="email" value={editInfo.email} onChange={handleEditChange} className="w-full border rounded px-2 py-1" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1">Teléfono</label>
                            <input name="phone" value={editInfo.phone} onChange={handleEditChange} className="w-full border rounded px-2 py-1" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1">Código País</label>
                            <input name="countryCode" value={editInfo.countryCode} onChange={handleEditChange} className="w-full border rounded px-2 py-1" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1">Cumpleaños</label>
                            <input name="birthday" type="date" value={editInfo.birthday || ''} onChange={handleEditChange} className="w-full border rounded px-2 py-1" />
                        </div>
                    </form>
                )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-brand-background p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-brand-secondary">{t('admin.crm.lifetimeValue')}</h3>
          <p className="text-3xl font-bold text-brand-text mt-1">${totalValue.toFixed(2)}</p>
        </div>
        <div className="bg-brand-background p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-brand-secondary">{t('admin.crm.totalBookings')}</h3>
          <p className="text-3xl font-bold text-brand-text mt-1">{totalBookings}</p>
        </div>
        <div className="bg-brand-background p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-brand-secondary">{t('admin.crm.lastBooking')}</h3>
          <p className="text-3xl font-bold text-brand-text mt-1">{formatDate(lastBookingDate)}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-1 py-3 text-sm font-semibold border-b-2 ${
              activeTab === 'info' 
                ? 'border-brand-primary text-brand-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Información
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-1 py-3 text-sm font-semibold border-b-2 ${
              activeTab === 'history' 
                ? 'border-brand-primary text-brand-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Historial de reservas
          </button>
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`px-1 py-3 text-sm font-semibold border-b-2 ${
              activeTab === 'deliveries' 
                ? 'border-brand-primary text-brand-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Entregas
            {deliveries.filter(d => d.status === 'pending' || d.status === 'overdue').length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {deliveries.filter(d => d.status === 'pending' || d.status === 'overdue').length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
            <div className="animate-fade-in">
                <ActivePackagesDisplay packages={augmentedPackages} />
                {/* Show expiry and next class info for each package */}
                <div className="mt-4 grid gap-4">
                    {augmentedPackages.map(pkg => (
                        <div key={pkg.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${pkg.status === 'Active' ? 'bg-green-100 text-green-800' : pkg.status === 'Pending Payment' ? 'bg-yellow-100 text-yellow-800' : pkg.status === 'Expired' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}
                                    title={t(`admin.customerDetail.packageStatusTooltip.${pkg.status.toLowerCase()}`, { default: pkg.status })}
                                >
                                    {t(`admin.customerDetail.packageStatus.${pkg.status.toLowerCase()}`, { default: pkg.status })}
                                </span>
                                {pkg.expiryDate && (
                                    <span className="text-xs text-brand-secondary" title={t('admin.customerDetail.packageExpiryTooltip')}>{t('admin.customerDetail.packageExpiryLabel')}: {formatDate(pkg.expiryDate)}</span>
                                )}
                                {pkg.nextClassDate && (
                                    <span className="text-xs text-brand-secondary" title={t('admin.customerDetail.packageNextClassTooltip')}>{t('admin.customerDetail.packageNextClassLabel')}: {formatDate(pkg.nextClassDate)}</span>
                                )}
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                                <div className="bg-brand-primary h-2 rounded-full" style={{ width: `${pkg.progressPercent}%` }}></div>
                            </div>
                            <div className="text-xs text-brand-secondary">{t('admin.customerDetail.packageProgressLabel')}: {pkg.completedCount}/{pkg.totalCount}</div>
                        </div>
                    ))}
                </div>
          
               <div className="mt-8">
                    <button
                        onClick={() => setIsViewingAttendance(true)}
                        className="w-full bg-white border-2 border-brand-primary text-brand-primary font-bold py-3 px-6 rounded-lg hover:bg-brand-primary hover:text-white transition-colors duration-300"
                    >
                        {t('admin.customerDetail.viewAttendanceButton')}
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'history' && (
            <div className="animate-fade-in">
                <h3 className="text-xl font-bold text-brand-text mb-4">{t('admin.customerDetail.historyTitle')}</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-brand-background">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">{t('admin.customerDetail.history.date')}</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">{t('admin.customerDetail.history.product')}</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">{t('admin.customerDetail.history.progress')}</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">{t('admin.customerDetail.history.status')}</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">{t('admin.customerDetail.history.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {customer.bookings.map(booking => (
                                <tr key={booking.id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text">
                                        {/* Corrected date display logic */}
                                        {getBookingDisplayDate(booking, language)}
                                        <div className="text-xs text-gray-500">{booking.bookingCode}</div>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text">{booking.product.name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text">
                                        {booking.productType === 'CLASS_PACKAGE' || booking.productType === 'INTRODUCTORY_CLASS' ? (
                                            (() => {
                                                const pkg = augmentedPackages.find(p => p.id === booking.id);
                                                return pkg ? `${pkg.completedCount}/${pkg.totalCount}` : 'N/A';
                                            })()
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                                          title={booking.isPaid ? t('admin.customerDetail.history.paidTooltip') : t('admin.customerDetail.history.unpaidTooltip')}
                                        >
                                            {booking.isPaid ? t('admin.customerDetail.history.paid') : t('admin.customerDetail.history.unpaid')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        <div className="flex items-center gap-2">
                                            {!booking.isPaid && (
                                                <button 
                                                    onClick={() => handleAcceptPaymentClick(booking)}
                                                    className="p-1.5 text-green-600 hover:text-green-800 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
                                                    title={t('admin.customerDetail.history.acceptPayment')}
                                                    aria-label={t('admin.customerDetail.history.acceptPaymentAria')}
                                                >
                                                    <CurrencyDollarIcon className="w-4 h-4"/>
                                                </button>
                                            )}
                                             <button 
                                                onClick={() => handleDeleteBooking(booking.id)}
                                                className="p-1.5 text-red-600 hover:text-red-800 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
                                                title={t('admin.customerDetail.history.deleteBooking')}
                                                aria-label={t('admin.customerDetail.history.deleteBookingAria')}
                                            >
                                                <TrashIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'deliveries' && (() => {
            // Lógica de paginación
            const indexOfLastDelivery = currentPage * deliveriesPerPage;
            const indexOfFirstDelivery = indexOfLastDelivery - deliveriesPerPage;
            const currentDeliveries = deliveries.slice(indexOfFirstDelivery, indexOfLastDelivery);
            const totalPages = Math.ceil(deliveries.length / deliveriesPerPage);

            return (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <h3 className="text-xl font-bold text-brand-text">Entregas</h3>
                            {deliveries.length > 0 && (
                                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    {deliveries.length} total{deliveries.length !== 1 ? 'es' : ''}
                                </span>
                            )}
                        </div>
                        <button 
                            onClick={() => setIsNewDeliveryModalOpen(true)}
                            className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-secondary transition-colors font-semibold text-sm"
                        >
                            + Nueva entrega
                        </button>
                    </div>
                    
                    {deliveries.length > 0 ? (
                        <>
                            <div className="space-y-4 mb-6">
                                {currentDeliveries.map(delivery => (
                                    <div key={delivery.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-100 hover:shadow-lg transition-shadow">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-brand-text text-lg">{delivery.description}</h4>
                                                <div className="space-y-1 mt-2">
                                                    <p className="text-sm text-brand-secondary">
                                                        <span className="font-medium">Programada para:</span> 
                                                        <span className={`ml-1 ${
                                                            !delivery.scheduledDate || delivery.scheduledDate === 'No especificada' || delivery.scheduledDate === 'Fecha no guardada'
                                                                ? 'text-orange-600 font-medium' 
                                                                : ''
                                                        }`}>
                                                            {formatDate(delivery.scheduledDate)}
                                                        </span>
                                                        {(!delivery.scheduledDate || delivery.scheduledDate === 'No especificada' || delivery.scheduledDate === 'Fecha no guardada') && (
                                                            <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                                                                Editar para agregar fecha
                                                            </span>
                                                        )}
                                                    </p>
                                                    {delivery.status === 'completed' && delivery.deliveredAt && (
                                                        <p className="text-sm text-green-700">
                                                            <span className="font-medium">Entregada el:</span> {formatDate(delivery.deliveredAt)}
                                                        </p>
                                                    )}
                                                    {delivery.notes && (
                                                        <p className="text-sm text-gray-600 mt-2 italic">"{delivery.notes}"</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                    delivery.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    delivery.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {delivery.status === 'completed' ? '✓ Entregada' :
                                                     delivery.status === 'overdue' ? '⚠ Vencida' : '⏳ Pendiente'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Fotos de referencia */}
                                        {delivery.photos && delivery.photos.length > 0 && (
                                            <div className="mb-3">
                                                <p className="text-sm font-medium text-brand-text mb-2">
                                                    📸 Fotos de referencia ({delivery.photos.length}):
                                                </p>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                                    {delivery.photos.map((photo, index) => (
                                                        <div key={index} className="relative group">
                                                            <img 
                                                                src={photo} 
                                                                alt={`Referencia ${index + 1}`}
                                                                className="w-full h-16 object-cover rounded-lg border border-gray-200 hover:scale-105 transition-transform cursor-pointer shadow-sm"
                                                                onClick={() => window.open(photo, '_blank')}
                                                                onError={(e) => {
                                                                    console.error('Error loading image:', e);
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CjxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjMiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDM2TDI4IDI4TDM2IDM2TDQ0IDI4IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4=';
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                <span className="text-white text-xs font-bold bg-black bg-opacity-50 px-2 py-1 rounded">Ver</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Botones de acción */}
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                            <button 
                                                onClick={() => setDeliveryToDelete(delivery.id)}
                                                className="px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex items-center gap-1"
                                            >
                                                🗑️ Eliminar
                                            </button>
                                            
                                            <div className="flex gap-2">
                                                {delivery.status !== 'completed' ? (
                                                    <button 
                                                        onClick={() => handleMarkDeliveryCompleted(delivery.id)}
                                                        className="px-3 py-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                                                    >
                                                        ✓ Marcar como entregada
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleRevertDelivery(delivery.id)}
                                                        className="px-3 py-1.5 text-sm font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-md transition-colors"
                                                    >
                                                        ↶ Revertir entrega
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Paginación elegante */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center space-x-2 py-4">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            currentPage === 1 
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                                : 'bg-white text-brand-text border border-gray-200 hover:bg-brand-primary hover:text-white'
                                        }`}
                                    >
                                        ← Anterior
                                    </button>
                                    
                                    <div className="flex space-x-1">
                                        {[...Array(totalPages)].map((_, index) => {
                                            const pageNumber = index + 1;
                                            return (
                                                <button
                                                    key={pageNumber}
                                                    onClick={() => setCurrentPage(pageNumber)}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                        currentPage === pageNumber
                                                            ? 'bg-brand-primary text-white'
                                                            : 'bg-white text-brand-text border border-gray-200 hover:bg-brand-primary hover:text-white'
                                                    }`}
                                                >
                                                    {pageNumber}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            currentPage === totalPages 
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                                : 'bg-white text-brand-text border border-gray-200 hover:bg-brand-primary hover:text-white'
                                        }`}
                                    >
                                        Siguiente →
                                    </button>
                                </div>
                            )}

                            {/* Información de paginación */}
                            <div className="text-center text-sm text-gray-500 mt-2">
                                Mostrando {indexOfFirstDelivery + 1}-{Math.min(indexOfLastDelivery, deliveries.length)} de {deliveries.length} entregas
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-brand-secondary bg-gray-50 rounded-lg">
                            <div className="text-4xl mb-4">📦</div>
                            <p className="text-lg font-medium mb-2">No hay entregas programadas</p>
                            <p className="text-sm">Crea la primera entrega para este cliente usando el botón de arriba.</p>
                        </div>
                    )}
                </div>
            );
        })()}

        {/* New Delivery Modal */}
        <NewDeliveryModal
            isOpen={isNewDeliveryModalOpen}
            onClose={() => setIsNewDeliveryModalOpen(false)}
            onSave={handleCreateDelivery}
            customerEmail={customer.userInfo.email}
        />

        {/* Delete Delivery Confirmation Modal */}
        {deliveryToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            ¿Eliminar entrega?
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Esta acción no se puede deshacer. La entrega será eliminada permanentemente.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setDeliveryToDelete(null)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDeleteDelivery(deliveryToDelete)}
                                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
