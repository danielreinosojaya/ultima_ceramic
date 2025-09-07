import React, { useMemo, useState, useEffect } from 'react';
import type { Customer, Booking, ClassPackage, TimeSlot, OpenStudioSubscription, InvoiceRequest, AdminTab } from '../../types.js';
import { useLanguage } from '../../context/LanguageContext.js';
import * as dataService from '../../services/dataService.js';
import { MailIcon } from '../icons/MailIcon.js';
import { PhoneIcon } from '../icons/PhoneIcon.js';
import { CurrencyDollarIcon } from '../icons/CurrencyDollarIcon.js';
import { TrashIcon } from '../icons/TrashIcon.js';
import { DeleteConfirmationModal } from './DeleteConfirmationModal.js';
import { InvoiceReminderModal } from './InvoiceReminderModal.js';

const KPICard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-brand-background p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-brand-secondary">{title}</h3>
        <p className="text-2xl font-bold text-brand-text mt-1">{value}</p>
    </div>
);

interface NavigationState {
    tab: AdminTab;
    targetId: string;
}

const getSlotDateTime = (slot: TimeSlot) => {
    const time24h = new Date(`1970-01-01 ${slot.time}`).toTimeString().slice(0, 5);
    const [hours, minutes] = time24h.split(':').map(Number);
    const [year, month, day] = slot.date.split('-').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
};


export const CustomerDetailView: React.FC<{ 
    customer: Customer; 
    onBack: () => void; 
    onDataChange: () => void;
    invoiceRequests: InvoiceRequest[];
    setNavigateTo: React.Dispatch<React.SetStateAction<NavigationState | null>>;
}> = ({ customer, onBack, onDataChange, invoiceRequests, setNavigateTo }) => {
    const { t, language } = useLanguage();
    
    const [now, setNow] = useState(new Date());
    const [bookingsPage, setBookingsPage] = useState(1);
    const recordsPerPage = 5;
    const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
    const [isInvoiceReminderOpen, setIsInvoiceReminderOpen] = useState(false);
    const [bookingForReminder, setBookingForReminder] = useState<Booking | null>(null);

    useEffect(() => {
        const timerId = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timerId);
    }, []);

    const formatDate = (dateInput: Date | string | undefined | null): string => {
        if (!dateInput) return '---';
        
        const date = new Date(dateInput);

        // Robust check for invalid dates AND the Unix epoch date (which causes the 1969 bug)
        if (isNaN(date.getTime()) || date.getTime() === 0) {
            return '---'; 
        }

        return date.toLocaleDateString(language, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const handleTogglePaidStatus = async (booking: Booking) => {
        if (booking.isPaid) {
            if (window.confirm("Are you sure you want to mark this booking as UNPAID? This will remove the payment details.")) {
               await dataService.markBookingAsUnpaid(booking.id);
               onDataChange();
            }
        } else {
            const pendingInvoiceRequest = invoiceRequests.find(
                req => req.bookingId === booking.id && req.status === 'Pending'
            );

            if (pendingInvoiceRequest) {
                setBookingForReminder(booking);
                setIsInvoiceReminderOpen(true);
            } else {
                await dataService.markBookingAsPaid(booking.id, { method: 'Cash', amount: booking.price });
                onDataChange();
            }
        }
    };
    
    const handleDeleteRequest = (booking: Booking) => {
        setBookingToDelete(booking);
    };

    const handleDeleteConfirm = async () => {
        if (bookingToDelete) {
            await dataService.deleteBooking(bookingToDelete.id);
            setBookingToDelete(null);
            onDataChange();
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

    const handleProceedWithPayment = async () => {
        if (bookingForReminder) {
            await dataService.markBookingAsPaid(bookingForReminder.id, { method: 'Cash', amount: bookingForReminder.price });
            onDataChange();
        }
        setIsInvoiceReminderOpen(false);
        setBookingForReminder(null);
    };

    const { userInfo, totalSpent, lastBookingDate, bookings } = customer;

    const allBookingsSorted = useMemo(() => 
        [...bookings].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        }),
        [bookings]
    );

    const totalBookingPages = Math.ceil(allBookingsSorted.length / recordsPerPage);
    const paginatedBookings = allBookingsSorted.slice((bookingsPage - 1) * recordsPerPage, bookingsPage * recordsPerPage);

    const renderProgressExpiry = (booking: Booking) => {
        if (booking.productType === 'CLASS_PACKAGE' && booking.product.type === 'CLASS_PACKAGE' && booking.slots && booking.slots.length > 0) {
            const completed = booking.slots.filter(s => getSlotDateTime(s) < now).length;
            const total = booking.product.classes;
            return <span className="text-sm">{t('admin.crm.completedOf', { completed, total })}</span>
        }
        if (booking.productType === 'OPEN_STUDIO_SUBSCRIPTION' && booking.product.type === 'OPEN_STUDIO_SUBSCRIPTION' && booking.isPaid && booking.paymentDetails?.receivedAt) {
            const startDate = new Date(booking.paymentDetails.receivedAt);
            if (isNaN(startDate.getTime())) return <span className="text-sm text-gray-400">N/A</span>;
            
            const expiryDate = new Date(startDate);
            const durationDays = booking.product.details.durationDays;
            expiryDate.setDate(startDate.getDate() + durationDays);
            const isActive = now < expiryDate;

            return (
                 <span className={`text-sm ${isActive ? 'text-brand-text' : 'text-gray-500'}`}>
                    {t('admin.crm.expiresOn', { date: formatDate(expiryDate) })}
                </span>
            )
        }
        return <span className="text-sm text-gray-400">N/A</span>;
    };

    return (
        <div className="animate-fade-in">
            {bookingToDelete && (
                <DeleteConfirmationModal
                    isOpen={!!bookingToDelete}
                    onClose={() => setBookingToDelete(null)}
                    onConfirm={handleDeleteConfirm}
                    title={t('admin.crm.deleteBookingTitle')}
                    message={t('admin.crm.deleteBookingMessage', { code: bookingToDelete.bookingCode || 'N/A' })}
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
            <button onClick={onBack} className="text-brand-secondary hover:text-brand-accent mb-4 transition-colors font-semibold">
                &larr; {t('admin.crm.backToList')}
            </button>
            <div className="bg-brand-background p-6 rounded-lg mb-6">
                <h3 className="text-2xl font-serif text-brand-accent">{userInfo.firstName} {userInfo.lastName}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-brand-secondary">
                    <a href={`mailto:${userInfo.email}`} className="flex items-center gap-2 hover:text-brand-accent"><MailIcon className="w-4 h-4" /> {userInfo.email}</a>
                    <div className="flex items-center gap-2"><PhoneIcon className="w-4 h-4" /> {userInfo.countryCode} {userInfo.phone}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <KPICard title={t('admin.crm.lifetimeValue')} value={`$${totalSpent.toFixed(2)}`} />
                <KPICard title={t('admin.crm.totalBookings')} value={customer.totalBookings} />
                <KPICard title={t('admin.crm.lastBooking')} value={formatDate(lastBookingDate)} />
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-bold text-brand-text mb-4">{t('admin.crm.bookingAndPrebookingHistory')}</h3>
                <div className="overflow-x-auto">
                     {allBookingsSorted.length > 0 ? (
                        <>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-brand-background">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.crm.date')}</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.crm.package')}</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.crm.progressExpiry')}</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.crm.status')}</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.productManager.actionsLabel')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedBookings.map(b => (
                                        <tr key={b.id}>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-brand-text">{formatDate(b.createdAt)}</div>
                                                <div className="text-xs font-mono text-brand-secondary">{b.bookingCode || '---'}</div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text">{b.product?.name || 'N/A'}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{renderProgressExpiry(b)}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${b.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{b.isPaid ? t('admin.bookingModal.paidStatus') : t('admin.bookingModal.unpaidStatus')}</span>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                                <div className="flex items-center justify-end">
                                                    <button onClick={() => handleTogglePaidStatus(b)} title={t('admin.bookingModal.togglePaid')} className={`p-2 rounded-full transition-colors ${b.isPaid ? 'text-brand-success hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}><CurrencyDollarIcon className="w-5 h-5"/></button>
                                                    <button onClick={() => handleDeleteRequest(b)} title="Delete Booking" className="p-2 rounded-full text-red-500 hover:bg-red-100"><TrashIcon className="w-5 h-5" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                             {totalBookingPages > 1 && (
                                <div className="mt-4 flex justify-between items-center text-sm">
                                    <button onClick={() => setBookingsPage(p => Math.max(1, p - 1))} disabled={bookingsPage === 1} className="font-semibold disabled:text-gray-400">&larr; {t('admin.crm.previous')}</button>
                                    <span>{t('admin.crm.page')} {bookingsPage} {t('admin.crm.of')} {totalBookingPages}</span>
                                    <button onClick={() => setBookingsPage(p => Math.min(totalBookingPages, p + 1))} disabled={bookingsPage === totalBookingPages} className="font-semibold disabled:text-gray-400">{t('admin.crm.next')} &rarr;</button>
                                </div>
                            )}
                        </>
                    ) : (
                         <p className="text-sm text-brand-secondary text-center py-4">{t('admin.crm.noCustomers')}</p>
                    )}
                </div>
            </div>
        </div>
    );
};