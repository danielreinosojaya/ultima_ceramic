import React, { useState, useEffect, useMemo, useRef } from 'react';
import Chart from 'chart.js/auto';
import Papa from 'papaparse';
import type { Booking, Product, PaymentDetails, AdminTab, InvoiceRequest } from '../../types.js';
import * as dataService from '../../services/dataService.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { AcceptPaymentModal } from './AcceptPaymentModal.js';
import { CurrencyDollarIcon } from '../icons/CurrencyDollarIcon.js';
import { UserIcon } from '../icons/UserIcon.js';
import { InvoiceReminderModal } from './InvoiceReminderModal.js';
import { DeleteConfirmationModal } from './DeleteConfirmationModal.js';
import { TrashIcon } from '../icons/TrashIcon.js';
import { CalendarIcon } from '../icons/CalendarIcon.js';
import { EditPaymentModal } from './EditPaymentModal';


type FilterPeriod = 'today' | 'week' | 'month' | 'custom';
type FinancialTab = 'summary' | 'pending' | 'capacity';
type PendingSubTab = 'packages' | 'openStudio';

interface NavigationState {
    tab: AdminTab;
    targetId: string;
}
interface FinancialDashboardProps {
    bookings: Booking[];
    invoiceRequests: InvoiceRequest[];
    onDataChange: () => void;
    setNavigateTo: React.Dispatch<React.SetStateAction<NavigationState | null>>;
}

const getDatesForPeriod = (period: FilterPeriod, customRange: { start: string, end: string }): { startDate: Date, endDate: Date } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    let startDate = new Date(today);

    switch (period) {
        case 'today':
            break;
        case 'week':
            // Week starts on Sunday
            const dayOfWeek = today.getDay();
            startDate.setDate(today.getDate() - dayOfWeek);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'custom':
            startDate = customRange.start ? new Date(customRange.start + 'T00:00:00') : new Date(0);
            endDate = customRange.end ? new Date(customRange.end + 'T23:59:59') : new Date();
            break;
    }
    return { startDate, endDate };
};

const KPICard: React.FC<{ title: string; value: string | number; subtext?: string; }> = ({ title, value, subtext }) => (
    <div className="bg-brand-background p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-brand-secondary">{title}</h3>
        <p className="text-3xl font-bold text-brand-text mt-1">{value}</p>
        {subtext && <p className="text-xs text-brand-secondary mt-1">{subtext}</p>}
    </div>
);

const CapacityHealthView: React.FC = () => {
    const { t } = useLanguage();
    const [metrics, setMetrics] = useState({ totalCapacity: 0, bookedSlots: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            const fetchedMetrics = await dataService.getFutureCapacityMetrics(30);
            setMetrics(fetchedMetrics);
            setLoading(false);
        };
        fetchMetrics();
    }, []);

    const occupancy = metrics.totalCapacity > 0 ? (metrics.bookedSlots / metrics.totalCapacity) * 100 : 0;
    
    let progressBarColor = 'bg-green-500';
    if (occupancy > 85) {
        progressBarColor = 'bg-red-500';
    } else if (occupancy > 60) {
        progressBarColor = 'bg-yellow-500';
    }

    if (loading) {
        return <div>Loading capacity data...</div>;
    }

    return (
      <div className="animate-fade-in">
        <p className="text-brand-secondary mb-6">{t('admin.financialDashboard.capacityHealth.subtitle')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <KPICard title={t('admin.financialDashboard.capacityHealth.totalCapacity')} value={metrics.totalCapacity} />
          <KPICard title={t('admin.financialDashboard.capacityHealth.bookedSlots')} value={metrics.bookedSlots} />
          <KPICard title={t('admin.financialDashboard.capacityHealth.occupancyRate')} value={`${occupancy.toFixed(1)}%`} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-bold text-brand-text mb-2">{t('admin.financialDashboard.capacityHealth.occupancyRate')}</h3>
            <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                <div 
                    className={`${progressBarColor} h-4 rounded-full transition-all duration-500 ease-out`} 
                    style={{ width: `${occupancy}%` }}
                ></div>
            </div>
            <div className="flex justify-between text-xs font-semibold text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
            </div>
        </div>
      </div>
    );
};

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ bookings: allBookings, invoiceRequests, onDataChange, setNavigateTo }) => {
    // Feedback state
    const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
    const [feedbackType, setFeedbackType] = useState<'success' | 'error' | null>(null);
    const [loadingBulk, setLoadingBulk] = useState(false);
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    // Bulk selection state
    const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
    const [paymentToEdit, setPaymentToEdit] = useState<{ payment: PaymentDetails, bookingId: string, index: number } | null>(null);

    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<FinancialTab>('summary');
    const [pendingSubTab, setPendingSubTab] = useState<PendingSubTab>('packages');

    // State for Summary Tab
    const [summaryPeriod, setSummaryPeriod] = useState<FilterPeriod>('month');
    const [summaryCustomRange, setSummaryCustomRange] = useState({ start: '', end: '' });
    // Advanced filters
    const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
    const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');

    // State for Pending Tab
    const [pendingPeriod, setPendingPeriod] = useState<FilterPeriod>('month');
    const [pendingCustomRange, setPendingCustomRange] = useState({ start: '', end: '' });

    // State for action modals
    const [bookingToPay, setBookingToPay] = useState<Booking | null>(null);
    const [isInvoiceReminderOpen, setIsInvoiceReminderOpen] = useState(false);
    const [bookingForReminder, setBookingForReminder] = useState<Booking | null>(null);
    const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
        // Modal para ver fechas reservadas
        const [bookingToViewDates, setBookingToViewDates] = useState<Booking | null>(null);

    const formatDate = (dateInput: Date | string | undefined | null, options: Intl.DateTimeFormatOptions = {}): string => {
        if (!dateInput) return '---';
        const date = new Date(dateInput);
        if (isNaN(date.getTime()) || date.getTime() === 0) return '---';
        return date.toLocaleString(language, options);
    };

    // CORRECCIÓN: Filtrar las reservas por la fecha del pago, no la fecha de la reserva.
    const summaryBookings = useMemo(() => {
        const { startDate, endDate } = getDatesForPeriod(summaryPeriod, summaryCustomRange);
        let filtered = allBookings.filter(b => {
            if (!b.isPaid || !b.paymentDetails) return false;
            // Verificar si alguno de los pagos se recibió en el rango de fechas
            return b.paymentDetails.some(p => {
                const receivedAt = new Date(p.receivedAt!);
                if (isNaN(receivedAt.getTime())) return false;
                return receivedAt >= startDate && receivedAt <= endDate;
            });
        });
        // Advanced filters
        if (productTypeFilter !== 'all') {
            filtered = filtered.filter(b => b.product?.type === productTypeFilter);
        }
        if (paymentMethodFilter !== 'all') {
            filtered = filtered.filter(b => b.paymentDetails?.some(p => p.method === paymentMethodFilter));
        }
        if (bookingStatusFilter !== 'all') {
            filtered = filtered.filter(b => {
                if (bookingStatusFilter === 'paid') return b.isPaid;
                if (bookingStatusFilter === 'pending') return !b.isPaid;
                return true;
            });
        }
        return filtered;
    }, [summaryPeriod, summaryCustomRange, allBookings, productTypeFilter, paymentMethodFilter, bookingStatusFilter]);


    const { pendingPackageBookings, pendingOpenStudioBookings } = useMemo(() => {
        // Get all unpaid bookings, regardless of date range for pending payments
        // The date filter should only apply to the summary view, not pending payments
        
        const packages = allBookings.filter(b => {
            // Include ALL unpaid bookings except Open Studio subscriptions
            return !b.isPaid && b.productType !== 'OPEN_STUDIO_SUBSCRIPTION';
        }).sort((a,b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));

        const openStudio = allBookings.filter(b => {
            return !b.isPaid && b.productType === 'OPEN_STUDIO_SUBSCRIPTION';
        }).sort((a,b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
        
        return { pendingPackageBookings: packages, pendingOpenStudioBookings: openStudio };
    }, [allBookings]); // Remove date dependencies since pending payments should show all unpaid bookings
    
    const pendingBookingsToDisplay = pendingSubTab === 'packages' ? pendingPackageBookings : pendingOpenStudioBookings;
    // Pagination logic
    const totalRows = pendingBookingsToDisplay.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const paginatedBookings = pendingBookingsToDisplay.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    // CORRECCIÓN: Calcular el valor total sumando todos los pagos, no el precio de la reserva.
    const kpis = useMemo(() => {
        let totalRevenue = 0;
        let lastBookingPaymentDate: Date | null = null;
        
        summaryBookings.forEach(booking => {
            if (booking.paymentDetails) {
                booking.paymentDetails.forEach(p => {
                    const receivedAt = new Date(p.receivedAt!);
                    totalRevenue += p.amount;
                    if (!lastBookingPaymentDate || receivedAt > lastBookingPaymentDate) {
                        lastBookingPaymentDate = receivedAt;
                    }
                });
            }
        });

        return {
            totalValue: `$${totalRevenue.toFixed(2)}`,
            totalBookings: summaryBookings.length,
            lastBookingDate: lastBookingPaymentDate ? formatDate(lastBookingPaymentDate, { month: 'short', day: 'numeric', year: 'numeric' }) : '---',
        };
    }, [summaryBookings]);

    // Chart logic
    const lineChartRef = useRef<HTMLCanvasElement>(null);
    const doughnutChartRef = useRef<HTMLCanvasElement>(null);
    const paymentMethodChartRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (activeTab !== 'summary' || !lineChartRef.current || !doughnutChartRef.current || !paymentMethodChartRef.current) return;
    
        const charts = [lineChartRef, doughnutChartRef, paymentMethodChartRef];
        charts.forEach(ref => {
            if (ref.current) {
                const chartInstance = Chart.getChart(ref.current);
                if (chartInstance) {
                    chartInstance.destroy();
                }
            }
        });

        const lineCtx = lineChartRef.current.getContext('2d');
        const doughnutCtx = doughnutChartRef.current.getContext('2d');
        const paymentMethodCtx = paymentMethodChartRef.current.getContext('2d');

        if (!lineCtx || !doughnutCtx || !paymentMethodCtx) return;

        // Line Chart Data
        const revenueByDate = summaryBookings.reduce((acc: Record<string, number>, b: Booking) => {
            if (!b.paymentDetails) return acc;
            b.paymentDetails.forEach(p => {
                const date = new Date(p.receivedAt!).toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + (p.amount || 0);
            });
            return acc;
        }, {});
        
        const sortedDates = Object.keys(revenueByDate).sort();
        
        new Chart(lineCtx, {
            type: 'line', data: {
                labels: sortedDates.map(d => new Date(d + 'T12:00:00').toLocaleDateString(language, { month: 'short', day: 'numeric' })),
                datasets: [{ label: t('admin.financialDashboard.totalRevenue'), data: sortedDates.map(date => revenueByDate[date]), borderColor: '#828E98', backgroundColor: 'rgba(130, 142, 152, 0.2)', fill: true, tension: 0.3 }]
            }
        });

        // Doughnut Chart Data - Revenue by Package
        const revenueByPackage = summaryBookings.reduce((acc: Record<string, number>, b: Booking) => {
            if (!b.product || !b.paymentDetails) return acc;
            const key = b.product.name;
            acc[key] = (acc[key] || 0) + b.paymentDetails.reduce((sum, p) => sum + p.amount, 0);
            return acc;
        }, {} as Record<string, number>);
        
        new Chart(doughnutCtx, {
            type: 'doughnut', data: {
                labels: Object.keys(revenueByPackage),
                datasets: [{ data: Object.values(revenueByPackage), backgroundColor: ['#828E98', '#958985', '#CCBCB2', '#4A4540', '#D1D0C6'], borderColor: '#fff', borderWidth: 2 }]
            }, options: { responsive: true, maintainAspectRatio: false }
        });

        // Doughnut Chart Data - Revenue by Payment Method
        const paymentMethodData = summaryBookings.reduce((acc: Record<string, number>, b: Booking) => {
            if (!b.paymentDetails) return acc;
            b.paymentDetails.forEach(p => {
                const method = p.method || 'Manual';
                acc[method] = (acc[method] || 0) + (p.amount || 0);
            });
            return acc;
        }, {});

        new Chart(paymentMethodCtx, {
            type: 'doughnut', data: {
                labels: Object.keys(paymentMethodData),
                datasets: [{ data: Object.values(paymentMethodData), backgroundColor: ['#828E98', '#958985', '#CCBCB2', '#4A4540'], borderColor: '#fff', borderWidth: 2 }]
            }, options: { responsive: true, maintainAspectRatio: false }
        });

    }, [summaryBookings, language, t, activeTab]);

    const exportToCSV = () => {
        const headers = [t('admin.financialDashboard.date'), t('admin.financialDashboard.customer'), t('admin.financialDashboard.package'), t('admin.financialDashboard.amount')];
        const rows = summaryBookings.map(b => ({
            [headers[0]]: formatDate(b.paymentDetails?.[0].receivedAt, {}),
            [headers[1]]: `${b.userInfo?.firstName} ${b.userInfo?.lastName}`,
            [headers[2]]: b.product?.name || 'N/A',
            [headers[3]]: (b.paymentDetails?.[0]?.amount || 0).toFixed(2)
        }));
        const csv = Papa.unparse(rows, { quotes: true });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'financial_report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

    const handleConfirmPayment = async (details: Omit<PaymentDetails, 'receivedAt'>) => {
        if (bookingToPay) {
            // Add receivedAt as now for PaymentDetails
            const payment: PaymentDetails = {
                ...details,
                receivedAt: new Date().toISOString()
            };
            await dataService.addPaymentToBooking(bookingToPay.id, payment);
            setBookingToPay(null);
            onDataChange();
        }
    };
    
    const handleDeleteBooking = async () => {
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

    const handleProceedWithPayment = () => {
        if (bookingForReminder) {
            setBookingToPay(bookingForReminder);
        }
        setIsInvoiceReminderOpen(false);
        setBookingForReminder(null);
    };
    
    const TabButton: React.FC<{ isActive: boolean, onClick: () => void, children: React.ReactNode }> = ({ isActive, onClick, children }) => (
      <button
        onClick={onClick}
        className={`px-1 py-4 text-sm font-semibold border-b-2 ${isActive ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
      >
        {children}
      </button>
    );

    const PendingSubTabButton: React.FC<{ isActive: boolean; onClick: () => void; count: number; children: React.ReactNode; }> = ({ isActive, onClick, count, children }) => (
        <button
          onClick={onClick}
          className={`flex items-center px-1 py-2 text-sm font-semibold border-b-2 transition-colors ${isActive ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          {children}
          {count > 0 && (
            <span className="ml-2 bg-brand-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {count}
            </span>
          )}
        </button>
    );

    // Bulk actions
    const handleSelectBooking = (id: string) => {
        setSelectedBookings(selected => selected.includes(id) ? selected.filter(bid => bid !== id) : [...selected, id]);
    };
    const handleSelectAll = () => {
        if (selectedBookings.length === paginatedBookings.length) {
            setSelectedBookings([]);
        } else {
            setSelectedBookings(paginatedBookings.map(b => b.id));
        }
    };
    const handleBulkDelete = async () => {
        setLoadingBulk(true);
        try {
            for (const id of selectedBookings) {
                await dataService.deleteBooking(id);
            }
            setSelectedBookings([]);
            setFeedbackMsg(t('admin.financialDashboard.feedback.bulkDeleteSuccess'));
            setFeedbackType('success');
            onDataChange();
        } catch (e) {
            setFeedbackMsg(t('admin.financialDashboard.feedback.bulkDeleteError'));
            setFeedbackType('error');
        }
        setLoadingBulk(false);
    };
    const handleBulkAcceptPayment = async () => {
        setLoadingBulk(true);
        try {
            for (const id of selectedBookings) {
                await dataService.acceptPaymentForBooking(id);
            }
            setSelectedBookings([]);
            setFeedbackMsg(t('admin.financialDashboard.feedback.bulkPaymentSuccess'));
            setFeedbackType('success');
            onDataChange();
        } catch (e) {
            setFeedbackMsg(t('admin.financialDashboard.feedback.bulkPaymentError'));
            setFeedbackType('error');
        }
        setLoadingBulk(false);
    };
    const handleBulkSendReminder = async () => {
        setLoadingBulk(true);
        try {
            for (const id of selectedBookings) {
                await dataService.sendReminderForBooking(id);
            }
            setSelectedBookings([]);
            setFeedbackMsg(t('admin.financialDashboard.feedback.bulkReminderSuccess'));
            setFeedbackType('success');
            onDataChange();
        } catch (e) {
            setFeedbackMsg(t('admin.financialDashboard.feedback.bulkReminderError'));
            setFeedbackType('error');
        }
        setLoadingBulk(false);
    };

        return (
        <div>
            {/* Modal para ver fechas reservadas */}
            {bookingToViewDates && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative animate-fade-in">
                        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setBookingToViewDates(null)} aria-label="Cerrar">
                            &times;
                        </button>
                        <h3 className="text-lg font-bold mb-4 text-brand-text">Fechas pre-seleccionadas</h3>
                        {(bookingToViewDates.slots && bookingToViewDates.slots.length > 0) ? (
                                                        <ul className="list-disc pl-5">
                                                                {bookingToViewDates.slots.map((slot, idx) => {
                                                                    // Fix: use T12:00:00 to avoid timezone offset
                                                                    const localDate = new Date(slot.date + 'T12:00:00');
                                                                    return (
                                                                        <li key={idx} className="mb-2 text-brand-secondary">
                                                                            {localDate.toLocaleDateString(language, { year: 'numeric', month: 'short', day: 'numeric' })} @ {slot.time}
                                                                        </li>
                                                                    );
                                                                })}
                                                        </ul>
                        ) : (
                            <p className="text-brand-secondary">No hay fechas pre-seleccionadas para esta reserva.</p>
                        )}
                    </div>
                </div>
            )}
            {bookingToPay && (
                <AcceptPaymentModal
                    isOpen={!!bookingToPay}
                    onClose={() => setBookingToPay(null)}
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
            {bookingToDelete && (
                <DeleteConfirmationModal
                    isOpen={!!bookingToDelete}
                    onClose={() => setBookingToDelete(null)}
                    onConfirm={handleDeleteBooking}
                    title={t('admin.financialDashboard.deleteConfirmTitle')}
                    message={t('admin.financialDashboard.deleteConfirmText', { name: `${bookingToDelete.userInfo.firstName} ${bookingToDelete.userInfo.lastName}`})}
                />
            )}
                        {paymentToEdit && (
                            <EditPaymentModal
                                isOpen={!!paymentToEdit}
                                payment={paymentToEdit.payment}
                                paymentIndex={paymentToEdit.index}
                                bookingId={paymentToEdit.bookingId}
                                onClose={() => setPaymentToEdit(null)}
                                onSave={async (updated) => {
                                    await dataService.updatePaymentDetails(paymentToEdit.bookingId, paymentToEdit.index, updated);
                                    setPaymentToEdit(null);
                                    onDataChange();
                                }}
                            />
                        )}
            <h2 className="text-2xl font-serif text-brand-text mb-2">{t('admin.financialDashboard.title')}</h2>
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <TabButton isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>
                        {t('admin.financialDashboard.incomeSummaryTab')}
                    </TabButton>
                    <TabButton isActive={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>
                        {t('admin.financialDashboard.pendingPreservationsTab')}
                    </TabButton>
                    <TabButton isActive={activeTab === 'capacity'} onClick={() => setActiveTab('capacity')}>
                        {t('admin.financialDashboard.capacityHealthTab')}
                    </TabButton>
                </nav>
            </div>
            {activeTab === 'summary' && (
                <div className="animate-fade-in">
                    <p className="text-brand-secondary mb-6">{t('admin.financialDashboard.subtitle')}</p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex items-center gap-2 flex-wrap">
                        <button onClick={() => setSummaryPeriod('today')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${summaryPeriod === 'today' ? 'bg-brand-primary text-white' : 'bg-white hover:bg-brand-background'}`}>{t('admin.financialDashboard.today')}</button>
                        <button onClick={() => setSummaryPeriod('week')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${summaryPeriod === 'week' ? 'bg-brand-primary text-white' : 'bg-white hover:bg-brand-background'}`}>{t('admin.financialDashboard.thisWeek')}</button>
                        <button onClick={() => setSummaryPeriod('month')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${summaryPeriod === 'month' ? 'bg-brand-primary text-white' : 'bg-white hover:bg-brand-background'}`}>{t('admin.financialDashboard.thisMonth')}</button>
                        <div className="flex items-center gap-2">
                            <input type="date" value={summaryCustomRange.start} onChange={e => {setSummaryCustomRange(c => ({...c, start: e.target.value})); setSummaryPeriod('custom');}} className="text-sm p-1 border rounded-md"/>
                            <span className="text-sm">to</span>
                            <input type="date" value={summaryCustomRange.end} onChange={e => {setSummaryCustomRange(c => ({...c, end: e.target.value})); setSummaryPeriod('custom');}} className="text-sm p-1 border rounded-md"/>
                        </div>
                        {/* Advanced filters */}
                        <select value={productTypeFilter} onChange={e => setProductTypeFilter(e.target.value)} className="text-sm p-1 border rounded-md" title="Filtrar por tipo de producto">
                            <option value="all">{t('admin.financialDashboard.filters.allProducts')}</option>
                            <option value="CLASS_PACKAGE">{t('admin.financialDashboard.filters.classPackage')}</option>
                            <option value="INTRODUCTORY_CLASS">{t('admin.financialDashboard.filters.introClass')}</option>
                            <option value="OPEN_STUDIO_SUBSCRIPTION">{t('admin.financialDashboard.filters.openStudio')}</option>
                        </select>
                        <select value={paymentMethodFilter} onChange={e => setPaymentMethodFilter(e.target.value)} className="text-sm p-1 border rounded-md" title="Filtrar por método de pago">
                            <option value="all">{t('admin.financialDashboard.filters.allMethods')}</option>
                            <option value="Manual">{t('admin.financialDashboard.filters.manual')}</option>
                            <option value="Card">{t('admin.financialDashboard.filters.card')}</option>
                            <option value="Transfer">{t('admin.financialDashboard.filters.transfer')}</option>
                        </select>
                        <select value={bookingStatusFilter} onChange={e => setBookingStatusFilter(e.target.value)} className="text-sm p-1 border rounded-md" title="Filtrar por estado de reserva">
                            <option value="all">{t('admin.financialDashboard.filters.allStatus')}</option>
                            <option value="paid">{t('admin.financialDashboard.filters.paid')}</option>
                            <option value="pending">{t('admin.financialDashboard.filters.pending')}</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                         <div title={t('admin.financialDashboard.tooltips.lifetimeValue')}>
                             <KPICard title={t('admin.crm.lifetimeValue')} value={kpis.totalValue} />
                         </div>
                         <div title={t('admin.financialDashboard.tooltips.totalBookings')}>
                             <KPICard title={t('admin.crm.totalBookings')} value={kpis.totalBookings} />
                         </div>
                         <div title={t('admin.financialDashboard.tooltips.lastBooking')}>
                             <KPICard title={t('admin.crm.lastBooking')} value={kpis.lastBookingDate} />
                         </div>
                    </div>
                    {summaryBookings.length > 0 ? (
                        <>
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                                <h3 className="font-bold text-brand-text mb-2">{t('admin.financialDashboard.revenueOverTime')}</h3>
                                <canvas ref={lineChartRef}></canvas>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"><h3 className="font-bold text-brand-text mb-2">{t('admin.financialDashboard.revenueByPackage')}</h3><div className="relative h-64"><canvas ref={doughnutChartRef}></canvas></div></div>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"><h3 className="font-bold text-brand-text mb-2">{t('admin.financialDashboard.revenueByPaymentMethod')}</h3><div className="relative h-64"><canvas ref={paymentMethodChartRef}></canvas></div></div>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-brand-text">{t('admin.financialDashboard.detailedReport')}</h3><button onClick={exportToCSV} className="text-sm font-semibold bg-brand-primary text-white py-1 px-3 rounded-md hover:bg-brand-accent transition-colors">{t('admin.financialDashboard.exportCSV')}</button></div>
                                                                <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-brand-background"><tr><th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">{t('admin.financialDashboard.date')}</th><th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">{t('admin.financialDashboard.customer')}</th><th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">{t('admin.financialDashboard.package')}</th><th className="px-4 py-2 text-right text-xs font-medium text-brand-secondary uppercase">{t('admin.financialDashboard.amount')}</th><th className="px-4 py-2 text-right text-xs font-medium text-brand-secondary uppercase">Editar</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{summaryBookings.map(b => (
                                                                    b.paymentDetails?.map((p, idx) => (
                                                                        <tr key={b.id + '-' + idx}>
                                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text">{formatDate(p.receivedAt, {})}</td>
                                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text">{b.userInfo?.firstName} {b.userInfo?.lastName}</td>
                                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text">{b.product?.name || 'N/A'}</td>
                                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text text-right font-semibold">${(p.amount || 0).toFixed(2)}</td>
                                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text text-right">
                                                                                <button className="bg-brand-primary text-white px-2 py-1 rounded text-xs" onClick={() => setPaymentToEdit({ payment: p, bookingId: b.id, index: idx })}>Editar pago</button>
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                ))}</tbody></table></div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200"><p className="text-brand-secondary">{t('admin.financialDashboard.noData')}</p></div>
                    )}
                </div>
            )}
            {activeTab === 'pending' && (
                <div className="animate-fade-in">
                    <p className="text-brand-secondary mb-6">{t('admin.financialDashboard.pendingSubtitle')}</p>
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-6" aria-label="Pending Tabs">
                            <PendingSubTabButton
                                isActive={pendingSubTab === 'packages'}
                                onClick={() => setPendingSubTab('packages')}
                                count={pendingPackageBookings.length}
                            >
                                {t('admin.financialDashboard.packagesAndClasses')}
                            </PendingSubTabButton>
                            <PendingSubTabButton
                                isActive={pendingSubTab === 'openStudio'}
                                onClick={() => setPendingSubTab('openStudio')}
                                count={pendingOpenStudioBookings.length}
                            >
                                {t('admin.financialDashboard.openStudio')}
                            </PendingSubTabButton>
                        </nav>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                        <div className="p-3 bg-blue-50 border-l-4 border-blue-400 mb-4">
                            <p className="text-sm text-blue-800">
                                <strong>📋 Todas las reservas pendientes:</strong> Se muestran TODAS las reservas sin pagar, independientemente de la fecha. 
                                Incluye clases individuales, paquetes, introducciones y clases grupales.
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                         <div className="mb-4 flex gap-2 items-center">
                             <button onClick={handleBulkAcceptPayment} disabled={selectedBookings.length === 0} className="px-3 py-1 text-sm font-semibold rounded-md bg-green-100 text-green-800 disabled:opacity-50">{t('admin.financialDashboard.bulkAcceptPayment')}</button>
                             <button onClick={handleBulkSendReminder} disabled={selectedBookings.length === 0} className="px-3 py-1 text-sm font-semibold rounded-md bg-yellow-100 text-yellow-800 disabled:opacity-50">{t('admin.financialDashboard.bulkSendReminder')}</button>
                             <button onClick={handleBulkDelete} disabled={selectedBookings.length === 0} className="px-3 py-1 text-sm font-semibold rounded-md bg-red-100 text-red-800 disabled:opacity-50">{t('admin.financialDashboard.bulkDelete')}</button>
                             <span className="ml-auto text-xs text-brand-secondary">{t('admin.financialDashboard.selectedCount', { count: selectedBookings.length })}</span>
                         </div>
                         <div className="overflow-x-auto" role="region" aria-label="Tabla de reservas pendientes">
                            {loadingBulk && (
                                <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10">
                                    <span className="text-brand-primary font-bold">{t('admin.financialDashboard.feedback.loading')}</span>
                                </div>
                            )}
                            <table className="min-w-full divide-y divide-gray-200" role="table">
                                <thead className="bg-brand-background" role="rowgroup">
                                    <tr role="row">
                                        <th className="px-2 py-2" role="columnheader"><input type="checkbox" checked={selectedBookings.length === paginatedBookings.length && paginatedBookings.length > 0} onChange={handleSelectAll} aria-label="Seleccionar todos" /></th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider" role="columnheader">{t('admin.financialDashboard.pendingTable.date')}</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider" role="columnheader">{t('admin.financialDashboard.pendingTable.customer')}</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider" role="columnheader">{t('admin.financialDashboard.pendingTable.product')}</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider" role="columnheader">{t('admin.financialDashboard.pendingTable.amount')}</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider" role="columnheader">{t('admin.financialDashboard.pendingTable.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200" role="rowgroup">
                                    {paginatedBookings.length > 0 ? paginatedBookings.map(b => (
                                        <tr key={b.id} role="row">
                                            <td className="px-2 py-2" role="cell"><input type="checkbox" checked={selectedBookings.includes(b.id)} onChange={() => handleSelectBooking(b.id)} aria-label={`Seleccionar reserva ${b.id}`} /></td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text" role="cell">{formatDate(b.createdAt, { year: 'numeric', month: 'short', day: 'numeric'})}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text" role="cell">
                                                <div className="font-semibold">{b.userInfo?.firstName} {b.userInfo?.lastName}</div>
                                                <div className="text-xs text-brand-secondary">{b.userInfo?.email}</div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text" role="cell">{b.product?.name || 'N/A'}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text text-right font-semibold" role="cell">${(b.price || 0).toFixed(2)}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right" role="cell">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setNavigateTo({ tab: 'customers', targetId: b.userInfo.email }); }}
                                                        title="View Customer Profile"
                                                        className="flex items-center gap-1.5 bg-gray-100 text-gray-800 text-xs font-bold py-1 px-2.5 rounded-md hover:bg-gray-200 transition-colors"
                                                        tabIndex={0}
                                                        aria-label={t('admin.financialDashboard.pendingTable.viewCustomer')}
                                                    >
                                                        <UserIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAcceptPaymentClick(b); }}
                                                        className="flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-bold py-1 px-2.5 rounded-md hover:bg-green-200 transition-colors"
                                                        tabIndex={0}
                                                        aria-label={t('admin.financialDashboard.pendingTable.acceptPayment')}
                                                    >
                                                        <CurrencyDollarIcon className="w-4 h-4" />
                                                        {t('admin.financialDashboard.pendingTable.acceptPayment')}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setBookingToViewDates(b); }}
                                                        className="flex items-center gap-1.5 bg-blue-100 text-blue-800 text-xs font-bold py-1 px-2.5 rounded-md hover:bg-blue-200 transition-colors"
                                                        tabIndex={0}
                                                        aria-label="Ver Fechas Reservadas"
                                                    >
                                                        <CalendarIcon className="w-4 h-4" />
                                                        Ver Fechas
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setBookingToDelete(b); }}
                                                        title={t('admin.financialDashboard.deleteBooking')}
                                                        className="flex items-center gap-1.5 bg-red-100 text-red-800 text-xs font-bold py-1 px-2.5 rounded-md hover:bg-red-200 transition-colors"
                                                        tabIndex={0}
                                                        aria-label={t('admin.financialDashboard.pendingTable.deleteBooking')}
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr role="row">
                                            <td colSpan={6} className="text-center py-10 text-brand-secondary" role="cell">
                                                {t('admin.financialDashboard.pendingTable.noPending')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            {/* Pagination controls */}
                            <div className="flex justify-between items-center mt-4">
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 rounded bg-gray-100 text-gray-800 disabled:opacity-50" tabIndex={0} aria-label={t('admin.financialDashboard.prevPage')}>
                                        {t('admin.financialDashboard.prevPage')}
                                    </button>
                                    <span className="text-sm">{t('admin.financialDashboard.page', { current: currentPage, total: totalPages })}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 rounded bg-gray-100 text-gray-800 disabled:opacity-50" tabIndex={0} aria-label={t('admin.financialDashboard.nextPage')}>
                                        {t('admin.financialDashboard.nextPage')}
                                    </button>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <span className="text-sm">{t('admin.financialDashboard.rowsPerPage')}</span>
                                    <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-sm p-1 border rounded-md" aria-label={t('admin.financialDashboard.rowsPerPage')}> 
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                            </div>
                            {/* Feedback message */}
                            {feedbackMsg && (
                                <div className={`mt-4 p-2 rounded text-sm font-bold ${feedbackType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} role="alert">
                                    {feedbackMsg}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'capacity' && <CapacityHealthView />}
        </div>
    );
}