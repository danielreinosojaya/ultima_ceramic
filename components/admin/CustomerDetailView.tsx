import React, { useMemo, useState, useEffect } from 'react';
import type { Customer, Booking, InvoiceRequest, AdminTab, ClassPackage, OpenStudioSubscription, IntroductoryClass, PaymentDetails } from '../../types.js';
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
  if (!dateInput) return '---';
  // If it's a YYYY-MM-DD string, add time to avoid timezone issues
  const dateStr = typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput) 
    ? dateInput + 'T00:00:00' 
    : dateInput;

  const date = new Date(dateStr);
  if (isNaN(date.getTime()) || date.getTime() === 0) return '---';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  };
  return date.toLocaleDateString('es', defaultOptions);
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
  const { t, language } = useLanguage();
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
        // CORRECCIÓN: Llamar a la función correcta en el servicio de datos
        await dataService.addPaymentToBooking(bookingToPay.id, details);
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

      <div className="mt-8">
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
    </div>
  );
};
