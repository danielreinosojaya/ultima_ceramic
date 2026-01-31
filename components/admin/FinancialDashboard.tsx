import React, { useState, useEffect, useMemo, useRef } from 'react';
import Chart from 'chart.js/auto';
import Papa from 'papaparse';
import type { Booking, Product, PaymentDetails, AdminTab, InvoiceRequest, GroupTechnique } from '../../types.js';
import * as dataService from '../../services/dataService.js';
import { AcceptPaymentModal } from './AcceptPaymentModal.js';
import { CurrencyDollarIcon } from '../icons/CurrencyDollarIcon.js';
import { UserIcon } from '../icons/UserIcon.js';
import { InvoiceReminderModal } from './InvoiceReminderModal.js';
import { DeleteConfirmationModal } from './DeleteConfirmationModal.js';
import { TrashIcon } from '../icons/TrashIcon.js';
import { CalendarIcon } from '../icons/CalendarIcon.js';
import { EditPaymentModal } from './EditPaymentModal';

// Helper para obtener nombre de técnica desde metadata
const getTechniqueName = (technique: GroupTechnique): string => {
  const names: Record<GroupTechnique, string> = {
    'potters_wheel': 'Torno Alfarero',
    'hand_modeling': 'Modelado a Mano',
    'painting': 'Pintura de piezas'
  };
  return names[technique] || technique;
};

// Helper para traducir productType a nombre legible
const getProductTypeName = (productType?: string): string => {
  const typeNames: Record<string, string> = {
    'SINGLE_CLASS': 'Clase Suelta',
    'CLASS_PACKAGE': 'Paquete de Clases',
    'INTRODUCTORY_CLASS': 'Clase Introductoria',
    'GROUP_CLASS': 'Clase Grupal',
    'COUPLES_EXPERIENCE': 'Experiencia de Parejas',
    'OPEN_STUDIO': 'Estudio Abierto'
  };
  return typeNames[productType || ''] || 'Clase';
};

// Helper para obtener el nombre del producto/técnica de un booking
const getBookingDisplayName = (booking: Booking): string => {
  // 1. Si tiene groupClassMetadata con techniqueAssignments
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    
    if (uniqueTechniques.length === 1) {
      return getTechniqueName(uniqueTechniques[0]);
    } else {
      return `Clase Grupal (mixto)`;
    }
  }
  
  // 2. Si tiene technique directamente (CUSTOM_GROUP_EXPERIENCE, COUPLES_EXPERIENCE)
  if (booking.technique) {
    return getTechniqueName(booking.technique);
  }
  
  // 3. Fallback: product.name si existe y no es genérico
  const productName = booking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown' && productName !== null) {
    return productName;
  }
  
  // 4. Último fallback: productType
  return getProductTypeName(booking.productType);
};


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
    // Idioma fijo español
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
        return <div>Cargando datos de capacidad...</div>;
    }

        return (
            <div className="animate-fade-in">
                <p className="text-brand-secondary mb-6">Salud de la capacidad de clases</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <KPICard title="Capacidad total" value={metrics.totalCapacity} />
                    <KPICard title="Clases reservadas" value={metrics.bookedSlots} />
                    <KPICard title="Ocupación" value={`${occupancy.toFixed(1)}%`} />
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="font-bold text-brand-text mb-2">Ocupación</h3>
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

    // Idioma fijo español
    const language = 'es-ES';
    const [activeTab, setActiveTab] = useState<FinancialTab>('summary');
    const [pendingSubTab, setPendingSubTab] = useState<PendingSubTab>('packages');

    // State for Summary Tab
    const [summaryPeriod, setSummaryPeriod] = useState<FilterPeriod>('month');
    const [summaryCustomRange, setSummaryCustomRange] = useState({ start: '', end: '' });
    // Advanced filters
    const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
    const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
    const [giftcardFilter, setGiftcardFilter] = useState<string>('all');

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

    // Formato de fecha fijo en español
    const formatDate = (dateInput: Date | string | undefined | null, options: Intl.DateTimeFormatOptions = {}) => {
        if (!dateInput) return '---';
        const date = new Date(dateInput);
        if (isNaN(date.getTime()) || date.getTime() === 0) return '---';
        // Hardcode Spanish format
        return date.toLocaleDateString('es-ES', { ...options });
    };

    // CORRECCIÓN: Filtrar las reservas por la fecha del pago, no la fecha de la reserva.
    const summaryBookings = useMemo(() => {
        const { startDate, endDate } = getDatesForPeriod(summaryPeriod, summaryCustomRange);
        
        console.log('[FinancialDashboard] Summary filter - Date range:', { 
            startDate: startDate.toISOString(), 
            endDate: endDate.toISOString(),
            period: summaryPeriod 
        });
        
        let filtered = allBookings.filter(b => {
            if (!b.isPaid || !b.paymentDetails) {
                console.log('[FinancialDashboard] Filtering out booking (not paid or no paymentDetails):', b.bookingCode, { isPaid: b.isPaid, hasPaymentDetails: !!b.paymentDetails });
                return false;
            }
            // Verificar si alguno de los pagos se recibió en el rango de fechas
            const hasPaymentInRange = b.paymentDetails.some(p => {
                const receivedAt = new Date(p.receivedAt!);
                if (isNaN(receivedAt.getTime())) {
                    console.log('[FinancialDashboard] Invalid receivedAt date:', p.receivedAt);
                    return false;
                }
                const inRange = receivedAt >= startDate && receivedAt <= endDate;
                console.log('[FinancialDashboard] Checking payment:', { 
                    bookingCode: b.bookingCode, 
                    receivedAt: receivedAt.toISOString(), 
                    inRange,
                    method: p.method,
                    giftcardAmount: p.giftcardAmount 
                });
                return inRange;
            });
            return hasPaymentInRange;
        });
        
        console.log('[FinancialDashboard] Filtered bookings before advanced filters:', filtered.length);
        
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
        if (giftcardFilter !== 'all') {
            filtered = filtered.filter(b => b.paymentDetails?.some(p => (giftcardFilter === 'giftcard' ? (p.giftcardAmount || p.giftcardId) : !(p.giftcardAmount || p.giftcardId))));
        }
        
        console.log('[FinancialDashboard] Final filtered bookings:', filtered.length);
        return filtered;
    }, [summaryPeriod, summaryCustomRange, allBookings, productTypeFilter, paymentMethodFilter, bookingStatusFilter, giftcardFilter]);


    const { pendingPackageBookings, pendingOpenStudioBookings } = useMemo(() => {
        // CORREGIDO: Mostrar TODAS las reservas impagas de paquetes/clases, 
        // incluyendo pre-reservas sin slots asignados (pendientes de coordinación)
        const packages = allBookings.filter(b => {
            return !b.isPaid && b.productType !== 'OPEN_STUDIO_SUBSCRIPTION';
            // ELIMINADO el filtro: && Array.isArray(b.slots) && b.slots.length > 0
            // Las pre-reservas sin fechas también son pendientes de pago válidos
        }).sort((a,b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));

        // Mostrar todas las reservas impagas de Open Studio, sin filtrar por slots
        const openStudio = allBookings.filter(b => {
            return !b.isPaid && b.productType === 'OPEN_STUDIO_SUBSCRIPTION';
        }).sort((a,b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));

        console.log('[FinancialDashboard] Pending bookings calculated:', {
            totalUnpaidPackages: packages.length,
            withSlots: packages.filter(b => Array.isArray(b.slots) && b.slots.length > 0).length,
            withoutSlots: packages.filter(b => !Array.isArray(b.slots) || b.slots.length === 0).length,
            openStudio: openStudio.length
        });

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
                datasets: [{ label: 'Ingresos totales', data: sortedDates.map(date => revenueByDate[date]), borderColor: '#828E98', backgroundColor: 'rgba(130, 142, 152, 0.2)', fill: true, tension: 0.3 }]
            }
        });

        // Doughnut Chart Data - Revenue by Package
        const revenueByPackage = summaryBookings.reduce((acc: Record<string, number>, b: Booking) => {
            if (!b.product || !b.paymentDetails) return acc;
            const key = getBookingDisplayName(b);
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

    }, [summaryBookings, language, activeTab]);

    const exportToCSV = () => {
        const headers = ['Fecha', 'Cliente', 'Paquete', 'Monto'];
        const rows = summaryBookings.map(b => ({
            [headers[0]]: formatDate(b.paymentDetails?.[0].receivedAt, {}),
            [headers[1]]: `${b.userInfo?.firstName} ${b.userInfo?.lastName}`,
            [headers[2]]: getBookingDisplayName(b),
            [headers[3]]: (b.paymentDetails?.[0]?.amount || 0).toFixed(2)
        }));
        const csv = Papa.unparse(rows, { quotes: true });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'reporte_financiero.csv');
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

    const handleSelectBooking = (id: string) => {
        setSelectedBookings(selected => selected.includes(id) ? selected.filter(bid => bid !== id) : [...selected, id]);
    };
    const handleSelectAll = () => {
        if (selectedBookings.length === paginatedBookings.length) {
            setSelectedBookings([]);
        }
    };
    const handleBulkDelete = async () => {
        setLoadingBulk(true);
        try {
            for (const id of selectedBookings) {
                await dataService.deleteBooking(id);
            }
            setSelectedBookings([]);
            setFeedbackMsg('Reservas eliminadas correctamente');
            setFeedbackType('success');
            onDataChange();
        } catch (e) {
            setFeedbackMsg('Error al eliminar reservas');
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
            setFeedbackMsg('Pagos aceptados correctamente');
            setFeedbackType('success');
            onDataChange();
        } catch (e) {
            setFeedbackMsg('Error al aceptar pagos');
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
            setFeedbackMsg('Recordatorios enviados correctamente');
            setFeedbackType('success');
            onDataChange();
        } catch (e) {
            setFeedbackMsg('Error al enviar recordatorios');
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
                    title="¿Eliminar reserva?"
                    message={`¿Estás seguro que deseas eliminar la reserva de ${bookingToDelete.userInfo.firstName} ${bookingToDelete.userInfo.lastName}? Esta acción no se puede deshacer.`}
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
                                    // Prefer paymentId if available, fallback to index
                                    const identifier = paymentToEdit.payment.id || paymentToEdit.index;
                                    await dataService.updatePaymentDetails(paymentToEdit.bookingId, identifier, updated);
                                    setPaymentToEdit(null);
                                    onDataChange();
                                }}
                            />
                        )}
            <h2 className="text-2xl font-serif text-brand-text mb-2">Panel financiero</h2>
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <TabButton isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>
                        {'Resumen de ingresos'}
                    </TabButton>
                        <TabButton isActive={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>
                            {'Pre-reservas Pendientes'}
                        </TabButton>
                    <TabButton isActive={activeTab === 'capacity'} onClick={() => setActiveTab('capacity')}>
                        {'Salud de capacidad'}
                    </TabButton>
                </nav>
            </div>
            {activeTab === 'summary' && (
                <div className="animate-fade-in">
                    <p className="text-brand-secondary mb-6">Resumen de ingresos y pagos recibidos</p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex items-center gap-2 flex-wrap">
                        <button onClick={() => setSummaryPeriod('today')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${summaryPeriod === 'today' ? 'bg-brand-primary text-white' : 'bg-white hover:bg-brand-background'}`}>Hoy</button>
                        <button onClick={() => setSummaryPeriod('week')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${summaryPeriod === 'week' ? 'bg-brand-primary text-white' : 'bg-white hover:bg-brand-background'}`}>Semana</button>
                        <button onClick={() => setSummaryPeriod('month')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${summaryPeriod === 'month' ? 'bg-brand-primary text-white' : 'bg-white hover:bg-brand-background'}`}>Mes</button>
                        <div className="flex items-center gap-2">
                            <input type="date" value={summaryCustomRange.start} onChange={e => {setSummaryCustomRange(c => ({...c, start: e.target.value})); setSummaryPeriod('custom');}} className="text-sm p-1 border rounded-md"/>
                            <span className="text-sm">to</span>
                            <input type="date" value={summaryCustomRange.end} onChange={e => {setSummaryCustomRange(c => ({...c, end: e.target.value})); setSummaryPeriod('custom');}} className="text-sm p-1 border rounded-md"/>
                        </div>
                        {/* Advanced filters */}
                        <select value={productTypeFilter} onChange={e => setProductTypeFilter(e.target.value)} className="text-sm p-1 border rounded-md" title="Filtrar por tipo de producto">
                            <option value="all">Todos los productos</option>
                            <option value="classPackage">Paquete de clases</option>
                            <option value="introClass">Clase introductoria</option>
                            <option value="openStudio">Open Studio</option>
                        </select>
                        <select value={paymentMethodFilter} onChange={e => setPaymentMethodFilter(e.target.value)} className="text-sm p-1 border rounded-md" title="Filtrar por método de pago">
                            <option value="all">Todos los métodos</option>
                            <option value="manual">Manual</option>
                            <option value="card">Tarjeta</option>
                            <option value="transfer">Transferencia</option>
                        </select>
                        <select value={bookingStatusFilter} onChange={e => setBookingStatusFilter(e.target.value)} className="text-sm p-1 border rounded-md" title="Filtrar por estado de reserva">
                            <option value="all">Todos los estados</option>
                            <option value="paid">Pagado</option>
                            <option value="pending">Pendiente</option>
                        </select>
                        <select value={giftcardFilter} onChange={e => setGiftcardFilter(e.target.value)} className="text-sm p-1 border rounded-md" title="Filtrar por pagos con giftcard">
                            <option value="all">Todos</option>
                            <option value="giftcard">Solo giftcard</option>
                            <option value="no-giftcard">Sin giftcard</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                         <div title={'Valor total de vida del cliente'}>
                             <KPICard title={'Valor total'} value={kpis.totalValue} />
                         </div>
                         <div title={'Total de reservas'}>
                             <KPICard title={'Reservas totales'} value={kpis.totalBookings} />
                         </div>
                         <div title={'Última reserva'}>
                             <KPICard title={'Última reserva'} value={kpis.lastBookingDate} />
                         </div>
                    </div>
                    {summaryBookings.length > 0 ? (
                        <>
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                                <h3 className="font-bold text-brand-text mb-2">Ingresos a lo largo del tiempo</h3>
                                <canvas ref={lineChartRef}></canvas>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"><h3 className="font-bold text-brand-text mb-2">Ingresos por paquete</h3><div className="relative h-64"><canvas ref={doughnutChartRef}></canvas></div></div>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"><h3 className="font-bold text-brand-text mb-2">Ingresos por método de pago</h3><div className="relative h-64"><canvas ref={paymentMethodChartRef}></canvas></div></div>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-brand-text">Reporte detallado</h3><button onClick={exportToCSV} className="text-sm font-semibold bg-brand-primary text-white py-1 px-3 rounded-md hover:bg-brand-accent transition-colors">Exportar CSV</button></div>
                                                                <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-brand-background"><tr><th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">Fecha</th><th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">Cliente</th><th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">Paquete</th><th className="px-4 py-2 text-right text-xs font-medium text-brand-secondary uppercase">Monto</th><th className="px-4 py-2 text-right text-xs font-medium text-brand-secondary uppercase">Editar</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{summaryBookings.map(b => (
                                                                    b.paymentDetails?.map((p, idx) => (
                                                                        <tr key={b.id + '-' + idx}>
                                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text">{formatDate(p.receivedAt, {})}</td>
                                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text">{b.userInfo?.firstName} {b.userInfo?.lastName}</td>
                                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text">{getBookingDisplayName(b)}</td>
                                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text text-right font-semibold">${(p.amount || 0).toFixed(2)}
                                                                                {(p.giftcardAmount || p.giftcardId) && (
                                                                                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 ml-2">
                                                                                        Giftcard: ${((p.giftcardAmount || 0)).toFixed(2)}
                                                                                        {p.giftcardId ? ` · ID:${p.giftcardId}` : ''}
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text text-right">
                                                                                <button className="bg-brand-primary text-white px-2 py-1 rounded text-xs" onClick={() => setPaymentToEdit({ payment: p, bookingId: b.id, index: idx })}>Editar pago</button>
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                ))}</tbody></table></div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200"><p className="text-brand-secondary">No hay datos disponibles.</p></div>
                    )}
                </div>
            )}
            {activeTab === 'pending' && (
                <div className="animate-fade-in">
                    <p className="text-brand-secondary mb-6">Rastrea y gestiona todas las pre-reservas pendientes de pago.</p>
                    
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <KPICard 
                            title="Pre-reservas Totales" 
                            value={pendingPackageBookings.length + pendingOpenStudioBookings.length}
                            subtext="Pendientes de pago"
                        />
                        <KPICard 
                            title="Monto en Espera" 
                            value={`$${(pendingPackageBookings.reduce((sum, b) => sum + (b.pendingBalance || 0), 0) + pendingOpenStudioBookings.reduce((sum, b) => sum + (b.pendingBalance || 0), 0)).toFixed(2)}`}
                            subtext="Total a cobrar"
                        />
                        <KPICard 
                            title="Urgentes (< 1h)" 
                            value={pendingPackageBookings.filter(b => b.expiresAt && new Date(b.expiresAt).getTime() - new Date().getTime() < 3600000).length}
                            subtext="Próximas a expirar"
                        />
                        <KPICard 
                            title="Con Giftcard" 
                            value={pendingPackageBookings.filter(b => b.giftcardApplied).length}
                            subtext="Pago parcial"
                        />
                    </div>

                    {/* Search & Advanced Filters */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                        <div className="space-y-4">
                            {/* Search Bar */}
                            <input 
                                type="text" 
                                placeholder="🔍 Buscar por nombre, email o código de reserva..." 
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                onChange={(e) => {
                                    // Implementar lógica de búsqueda
                                }}
                            />
                            
                            {/* Filter Buttons */}
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-sm font-semibold text-brand-secondary">Filtrar por:</span>
                                <button className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800 hover:bg-red-200 transition-colors">
                                    Críticas (&lt; 30 min)
                                </button>
                                <button className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors">
                                    Próximas a expirar
                                </button>
                                <button className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors">
                                    Con Giftcard
                                </button>
                                <button className="px-3 py-1 text-sm font-semibold rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors">
                                    Sin fechas
                                </button>
                                <button className="px-3 py-1 text-sm font-semibold rounded-full border-2 border-gray-300 text-gray-800 hover:bg-gray-50 transition-colors">
                                    Limpiar filtros
                                </button>
                            </div>

                            {/* Sort & View Options */}
                            <div className="flex gap-4 items-center justify-between">
                                <div className="flex gap-2">
                                    <label className="text-sm font-semibold text-brand-secondary">Ordenar por:</label>
                                    <select className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary">
                                        <option>Más recientes primero</option>
                                        <option>Más antiguos primero</option>
                                        <option>Mayor monto pendiente</option>
                                        <option>Menor tiempo restante</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <label className="text-sm font-semibold text-brand-secondary">Ver:</label>
                                    <select className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary">
                                        <option>Todos</option>
                                        <option>Paquetes de clases</option>
                                        <option>Open Studio</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                         <div className="mb-4 flex gap-2 items-center flex-wrap">
                             <button onClick={handleBulkAcceptPayment} disabled={selectedBookings.length === 0} className="px-3 py-1.5 text-sm font-semibold rounded-md bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50 transition-colors">✓ Aceptar pagos ({selectedBookings.length})</button>
                             <button onClick={handleBulkSendReminder} disabled={selectedBookings.length === 0} className="px-3 py-1.5 text-sm font-semibold rounded-md bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50 transition-colors">📧 Enviar recordatorio ({selectedBookings.length})</button>
                             <button onClick={handleBulkDelete} disabled={selectedBookings.length === 0} className="px-3 py-1.5 text-sm font-semibold rounded-md bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 transition-colors">🗑️ Eliminar ({selectedBookings.length})</button>
                             <span className="ml-auto text-xs text-brand-secondary font-semibold">Seleccionados: {selectedBookings.length} / {paginatedBookings.length}</span>
                         </div>
                         <div className="overflow-x-auto" role="region" aria-label="Tabla de reservas pendientes">
                            {loadingBulk && (
                                <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10">
                                    <span className="text-brand-primary font-bold">Cargando...</span>
                                </div>
                            )}
                            <table className="min-w-full divide-y divide-gray-200" role="table">
                                <thead className="bg-brand-background" role="rowgroup">
                                    <tr role="row">
                                        <th className="px-2 py-2" role="columnheader"><input type="checkbox" checked={selectedBookings.length === paginatedBookings.length && paginatedBookings.length > 0} onChange={handleSelectAll} aria-label="Seleccionar todos" /></th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider cursor-pointer hover:bg-gray-200" role="columnheader">📅 Fecha</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider" role="columnheader">👤 Cliente</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider" role="columnheader">📦 Producto</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider" role="columnheader">💰 Monto</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider" role="columnheader">⏳ Vence en</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider" role="columnheader">Pendiente</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider" role="columnheader">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200" role="rowgroup">
                                    {paginatedBookings.length > 0 ? paginatedBookings.map(b => {
                                        const timeUntilExpire = b.expiresAt ? new Date(b.expiresAt).getTime() - new Date().getTime() : null;
                                        const isUrgent = timeUntilExpire && timeUntilExpire < 1800000; // < 30 min
                                        const isCritical = timeUntilExpire && timeUntilExpire < 600000; // < 10 min
                                        
                                        return (
                                        <tr key={b.id} className={`transition-colors ${isCritical ? 'bg-red-50' : isUrgent ? 'bg-yellow-50' : 'hover:bg-gray-50'}`} role="row">
                                            <td className="px-2 py-2" role="cell"><input type="checkbox" checked={selectedBookings.includes(b.id)} onChange={() => handleSelectBooking(b.id)} aria-label={`Seleccionar reserva ${b.id}`} /></td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text font-medium" role="cell">{formatDate(b.createdAt, { year: 'numeric', month: 'short', day: 'numeric'})}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm" role="cell">
                                                <div className="font-semibold text-brand-text">{b.userInfo?.firstName} {b.userInfo?.lastName}</div>
                                                <div className="text-xs text-brand-secondary">{b.userInfo?.email}</div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text" role="cell">
                                                {getBookingDisplayName(b)}
                                                {(!Array.isArray(b.slots) || b.slots.length === 0) && (
                                                    <span className="inline-flex items-center px-2 py-1 ml-2 text-xs font-semibold rounded bg-amber-100 text-amber-800" title="Sin fechas asignadas aún">
                                                        ⏳ Sin fechas
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text text-right font-bold" role="cell">
                                                ${(b.price || 0).toFixed(2)}
                                                {b.giftcardApplied && (
                                                    <div className="text-xs text-indigo-700 font-semibold mt-1">-${(b.giftcardRedeemedAmount || 0).toFixed(2)}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right" role="cell">
                                                {b.expiresAt ? (
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${isCritical ? 'bg-red-100 text-red-800' : isUrgent ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                        {timeUntilExpire && timeUntilExpire > 0 
                                                            ? `${Math.floor(timeUntilExpire / 60000)}m` 
                                                            : '⚠️ Expirado'}
                                                    </span>
                                                ) : '---'}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-brand-text text-right font-bold" role="cell">
                                                <span className="text-red-600">${(b.pendingBalance || 0).toFixed(2)}</span>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right" role="cell">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setNavigateTo({ tab: 'customers', targetId: b.userInfo.email }); }}
                                                        title="Ver Perfil"
                                                        className="flex items-center gap-1 bg-gray-100 text-gray-800 text-xs font-bold py-1 px-2 rounded hover:bg-gray-200 transition-colors"
                                                        tabIndex={0}
                                                        aria-label="Ver perfil del cliente"
                                                    >
                                                        <UserIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAcceptPaymentClick(b); }}
                                                        className="flex items-center gap-1 bg-green-100 text-green-800 text-xs font-bold py-1 px-2 rounded hover:bg-green-200 transition-colors"
                                                        tabIndex={0}
                                                           aria-label="Aceptar pago"
                                                    >
                                                        <CurrencyDollarIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setBookingToViewDates(b); }}
                                                        className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold py-1 px-2 rounded hover:bg-blue-200 transition-colors"
                                                        tabIndex={0}
                                                        aria-label="Ver Fechas"
                                                    >
                                                        <CalendarIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setBookingToDelete(b); }}
                                                        title="Eliminar"
                                                        className="flex items-center gap-1 bg-red-100 text-red-800 text-xs font-bold py-1 px-2 rounded hover:bg-red-200 transition-colors"
                                                        tabIndex={0}
                                                        aria-label="Eliminar reserva"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    }) : (
                                        <tr role="row">
                                            <td colSpan={8} className="text-center py-10 text-brand-secondary" role="cell">
                                                ✨ ¡Excelente! No hay reservas pendientes
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            {/* Pagination controls */}
                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded bg-gray-100 text-gray-800 disabled:opacity-50 hover:bg-gray-200 transition-colors text-sm font-semibold" tabIndex={0} aria-label="Página anterior">
                                        ← Anterior
                                    </button>
                                    <span className="text-sm font-semibold text-brand-secondary">Página {currentPage} de {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded bg-gray-100 text-gray-800 disabled:opacity-50 hover:bg-gray-200 transition-colors text-sm font-semibold" tabIndex={0} aria-label="Página siguiente">
                                        Siguiente →
                                    </button>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <span className="text-sm font-semibold text-brand-secondary">Filas por página:</span>
                                    <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-sm p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary" aria-label="Filas por página"> 
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                            {/* Feedback message */}
                            {feedbackMsg && (
                                <div className={`mt-4 p-3 rounded-lg text-sm font-bold ${feedbackType === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`} role="alert">
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