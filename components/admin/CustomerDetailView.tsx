import React, { useState, useEffect } from 'react';
import type { Booking, InvoiceRequest, ClassPackage, Delivery, PaymentDetails, Customer, AppData, Product } from '../../types';
import { ActivePackagesDisplay } from './ActivePackagesDisplay';
import { AcceptPaymentModal } from './AcceptPaymentModal';
import { InvoiceReminderModal } from './InvoiceReminderModal';
import { NewDeliveryModal } from './NewDeliveryModal';
import { EditDeliveryModal } from './EditDeliveryModal';
import { DeliveryListWithFilters } from './DeliveryListWithFilters';
import { ManualBookingModal } from './ManualBookingModal';
import { RescheduleModal } from './RescheduleModal';
import { useAdminData } from '../../context/AdminDataContext';
import { 
    MapIcon, 
    PhoneIcon, 
    EnvelopeIcon, 
    UserIcon, 
    CreditCardIcon, 
    AcademicCapIcon, 
    TruckIcon, 
    CalendarIcon, 
    PlusIcon,
    CheckCircleIcon,
    TrashIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    PencilIcon,
    CurrencyDollarIcon,
    TagIcon
} from '@heroicons/react/24/outline';
import * as dataService from '../../services/dataService';
import { formatDate, formatCurrency, normalizeHour } from '../../utils/formatters';

interface CustomerDetailViewProps {
    customer: Customer;
    onBack: () => void;
    onDataChange: () => void;
    invoiceRequests?: InvoiceRequest[];
    setNavigateTo?: (view: string) => void;
}

function CustomerDetailView({ customer, onBack, onDataChange, invoiceRequests, setNavigateTo }: CustomerDetailViewProps) {
    // Estado para rescatar cliente
    const [rescueStatus, setRescueStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [rescuedCustomer, setRescuedCustomer] = useState<Customer | null>(null);
    
    // Estado para modal de auditoría de giftcard
    const [giftcardAuditModal, setGiftcardAuditModal] = useState<{ open: boolean; giftcardId: string | null }>({ open: false, giftcardId: null });

    // Usar AdminDataContext para datos compartidos
    const adminData = useAdminData();

    // useEffect para rescatar cliente si no tiene userInfo
    useEffect(() => {
        if ((!customer || !customer.userInfo) && rescueStatus === 'idle') {
            setRescueStatus('pending');
            (async () => {
                try {
                    const result = await dataService.ensureStandaloneCustomer({
                        email: customer?.email || 'estefania.alava@email.com',
                    });
                    if (result.success && result.customer) {
                        setRescuedCustomer(result.customer);
                        setRescueStatus('success');
                    } else {
                        setRescueStatus('error');
                    }
                } catch {
                    setRescueStatus('error');
                }
            })();
        }
    }, [customer, rescueStatus]);

    // Si estamos rescatando, mostrar loading
    if (rescueStatus === 'pending') {
        return <div className="p-8 text-center text-brand-secondary font-bold">Buscando cliente en la base de datos...</div>;
    }
    
    // Si rescatamos exitosamente, usar el cliente rescatado
    if (rescueStatus === 'success' && rescuedCustomer) {
        return <CustomerDetailView customer={rescuedCustomer} onBack={onBack} onDataChange={onDataChange} invoiceRequests={invoiceRequests} setNavigateTo={setNavigateTo} />;
    }
    
    // Si falló el rescate
    if (rescueStatus === 'error') {
        return (
            <div className="p-8 text-center text-red-500 font-bold">
                Error: No se encontró información del cliente y no fue posible rescatarlo.
            </div>
        );
    }

    const [state, setState] = useState({
        editMode: false,
        activeTab: 'info',
        editInfo: {
            firstName: customer.userInfo?.firstName || '',
            lastName: customer.userInfo?.lastName || '',
            email: customer.userInfo?.email || customer.email || '',
            phone: customer.userInfo?.phone || '',
            countryCode: customer.userInfo?.countryCode || '',
            birthday: customer.userInfo?.birthday || null,
        },
        deliveries: customer.deliveries || [],
        bookingToPay: null,
        bookingForReminder: null,
        isNewDeliveryModalOpen: false,
        deliveryToDelete: null,
        deliveryToEdit: null,
        selectedBookingToReschedule: null,
        isSchedulingModalOpen: false,
    });

    // Estado para eliminar cliente
    const [deleteCustomerModal, setDeleteCustomerModal] = useState(false);
    const [deleteCustomerLoading, setDeleteCustomerLoading] = useState(false);
    
    // Estado para feedback de eliminación
    const [feedbackMsg, setFeedbackMsg] = useState<string>('');
    const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
    
    const handleDeleteCustomer = async () => {
        setDeleteCustomerLoading(true);
        try {
            console.log('[DELETE CUSTOMER] Attempting to delete customer with email:', customer.email);
            console.log('[DELETE CUSTOMER] Customer object:', customer);
            
            const response = await fetch('/api/data?action=deleteCustomer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: customer.email }),
            });

            console.log('[DELETE CUSTOMER] Response status:', response.status);
            const deleteResult = await response.json();
            console.log('[DELETE CUSTOMER] Response body:', deleteResult);

            if (!response.ok) {
                throw new Error(deleteResult.error || 'Failed to delete customer');
            }

            if (deleteResult.success) {
                setFeedbackMsg('Cliente eliminado exitosamente');
                setFeedbackType('success');
                onDataChange(); // Refresh data
                onBack(); // Redirigir a la lista de clientes
            } else {
                throw new Error(deleteResult.error || 'Cliente no encontrado');
            }
        } catch (error) {
            console.error('Error eliminando cliente:', error);
            setFeedbackMsg('Error al eliminar cliente');
            setFeedbackType('error');
        } finally {
            setDeleteCustomerLoading(false);
        }
    };

    const [appData, setAppData] = useState<AppData | null>(null);
    // Usar datos del AdminDataContext en lugar de cargar localmente
    const allProducts = adminData.products;
    const allBookings = adminData.bookings;
    
    // Hooks para completar entrega
    const [completeModal, setCompleteModal] = useState<{ open: boolean; deliveryId: string | null }>({ open: false, deliveryId: null });
    const [completeDate, setCompleteDate] = useState<string>("");
    const [completeLoading, setCompleteLoading] = useState(false);
    
    // Hooks para eliminar clase programada
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; bookingId: string | null; slot: any | null }>({ open: false, bookingId: null, slot: null });
    const [deleteLoading, setDeleteLoading] = useState(false);

    const handleDeleteSlot = async () => {
        if (!deleteModal.bookingId || !deleteModal.slot) return;
        setDeleteLoading(true);
        try {
            await dataService.removeBookingSlot(deleteModal.bookingId, deleteModal.slot);
            // Validar si el cliente queda sin reservas
            const bookingsRestantes = customer.bookings.filter(b => {
                if (b.id !== deleteModal.bookingId) return true;
                // Si es el booking eliminado, verificar slots
                if (Array.isArray(b.slots)) {
                    return b.slots.length > 1;
                }
                return false;
            });
            if (bookingsRestantes.length === 0) {
                // Crear cliente standalone si no tiene reservas
                await dataService.createCustomer({
                    email: customer.email,
                    firstName: customer.userInfo?.firstName || '',
                    lastName: customer.userInfo?.lastName || '',
                    phone: customer.userInfo?.phone || '',
                    countryCode: customer.userInfo?.countryCode || '',
                    birthday: customer.userInfo?.birthday || undefined
                });
            }
            setDeleteModal({ open: false, bookingId: null, slot: null });
            onDataChange();
        } catch (e) {
            console.error('Error deleting slot:', e);
        }
        setDeleteLoading(false);
    };

    const handleCompleteDelivery = async () => {
        if (!completeModal.deliveryId || !completeDate) return;
        setCompleteLoading(true);
        try {
            const result = await dataService.markDeliveryAsCompleted(completeModal.deliveryId, undefined);
            if (result.success && result.delivery) {
                // Actualizar la fecha de entrega
                const updateRes = await dataService.updateDelivery(result.delivery.id, { deliveredAt: completeDate });
                if (updateRes.success && updateRes.delivery) {
                    setState(prev => ({
                        ...prev,
                        deliveries: prev.deliveries.map(d => d.id === updateRes.delivery.id ? updateRes.delivery : d)
                    }));
                    setCompleteModal({ open: false, deliveryId: null });
                    setCompleteDate("");
                    onDataChange();
                }
            }
        } catch (e) {
            console.error('Error completing delivery:', e);
        }
        setCompleteLoading(false);
    };

    const handleDeleteDelivery = async (deliveryId: string) => {
        try {
            await dataService.deleteDelivery(deliveryId);
            setState(prev => ({
                ...prev,
                deliveries: prev.deliveries.filter(d => d.id !== deliveryId)
            }));
        } catch (error) {
            console.error('Error deleting delivery:', error);
        }
    };

    const handleMarkDeliveryAsReady = async (deliveryId: string) => {
        try {
            const result = await dataService.markDeliveryAsReady(deliveryId);
            if (result.success && result.delivery) {
                setState(prev => ({
                    ...prev,
                    deliveries: prev.deliveries.map(d => d.id === result.delivery.id ? result.delivery : d)
                }));
                onDataChange();
                alert('✅ Cliente notificado. La pieza está marcada como lista para recoger.');
            } else if (result.error) {
                alert(`❌ ${result.error}`);
            }
        } catch (error) {
            console.error('Error marking delivery as ready:', error);
            alert('❌ Error al marcar como lista. Intenta nuevamente.');
        }
    };

    useEffect(() => {
        // Los datos ahora vienen del AdminDataContext, solo necesitamos configurar appData una vez
        if (!appData && adminData.instructors.length > 0 && adminData.products.length > 0) {
            setAppData({ 
                instructors: adminData.instructors, 
                availability: adminData.availability,
                products: adminData.products,
                scheduleOverrides: adminData.scheduleOverrides || {},
                classCapacity: adminData.classCapacity || { potters_wheel: 4, molding: 6, introductory_class: 8 },
                capacityMessages: adminData.capacityMessages || { thresholds: [] },
                announcements: adminData.announcements || [],
                bookings: adminData.bookings,
                policies: '',
                confirmationMessage: { title: '', message: '' },
                footerInfo: { address: '', email: '', whatsapp: '', googleMapsLink: '', instagramHandle: '' },
                bankDetails: [{ bankName: '', accountHolder: '', accountNumber: '', accountType: '', taxId: '' }]
            });
        }
    }, [adminData.instructors.length, adminData.products.length, appData]);

    // Clases pasadas = slots anteriores
    const renderPastClassesTab = () => {
        const now = new Date();
        const pastSlots = customer.bookings
            .flatMap(booking => booking.slots
                .filter(slot => new Date(slot.date + 'T00:00:00') < now)
                .map(slot => ({ slot, booking }))
            );
        return (
            <div className="space-y-6">
                <h3 className="text-lg font-medium">Clases Pasadas</h3>
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    {pastSlots.length > 0 ? pastSlots.map(({ slot, booking }, idx) => {
                        const isPaid = booking.isPaid;
                        const isNoRefund = booking.acceptedNoRefund === true;
                        return (
                            <div key={idx} className={`p-6 border-b last:border-b-0 flex justify-between items-center gap-4 ${isPaid ? '' : 'bg-yellow-50'}`}>
                                <div>
                                    <p className="font-bold text-lg text-brand-text mb-1 flex items-center gap-2">
                                        {booking.product?.name || 'Clase individual'}
                                        {!isPaid && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 ml-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20h.01" /></svg>
                                                Pago pendiente
                                            </span>
                                        )}
                                        {isNoRefund && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 ml-2" title="Reserva <48hrs: No reembolsable ni reagendable">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                No reagendable
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-sm text-brand-secondary mb-1">{formatDate(slot.date)} a las {slot.time}</p>
                                    <p className="text-sm text-brand-secondary mb-1">Código: {booking.bookingCode}</p>
                                    <p className="text-sm text-brand-secondary mb-1">Tipo: {booking.productType}</p>
                                    <p className="text-sm text-brand-secondary mb-1">Estado: <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>{isPaid ? 'Finalizada' : 'No pagada'}</span></p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className={`border px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                                            isNoRefund 
                                                ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                                                : 'border-brand-primary text-brand-primary hover:bg-blue-50'
                                        }`}
                                        onClick={() => !isNoRefund && setState(prev => ({ ...prev, selectedBookingToReschedule: { booking, slot } }))}
                                        disabled={isNoRefund}
                                        title={isNoRefund ? 'Esta reserva no es reagendable (reservada <48hrs)' : 'Reagendar clase'}
                                    >
                                        <span className="material-icons">schedule</span> Reagendar
                                    </button>
                                    <button
                                        className="border border-red-500 text-red-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-red-50"
                                        onClick={() => setDeleteModal({ open: true, bookingId: booking.id, slot })}
                                        title="Eliminar clase"
                                    >
                                        <span className="material-icons">delete</span> Eliminar
                                    </button>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="p-6 text-center text-brand-secondary">No hay clases pasadas.</div>
                    )}
                </div>
                {state.selectedBookingToReschedule && appData && (
                    <RescheduleModal
                        isOpen={true}
                        onClose={() => setState(prev => ({ ...prev, selectedBookingToReschedule: null }))}
                        onSave={async (newSlot) => {
                            console.log('[CustomerDetailView-PastClasses] Reschedule initiated:', { 
                                bookingId: state.selectedBookingToReschedule.booking.id, 
                                oldSlot: state.selectedBookingToReschedule.slot, 
                                newSlot 
                            });
                            
                            // 1. Ejecutar reagendamiento
                            const result = await dataService.rescheduleBookingSlot(
                                state.selectedBookingToReschedule.booking.id, 
                                state.selectedBookingToReschedule.slot, 
                                newSlot
                            );
                            
                            console.log('[CustomerDetailView-PastClasses] Reschedule result:', result);
                            
                            // 2. Forzar recarga inmediata de datos críticos (bookings y customers)
                            if (adminData.refreshCritical) {
                                console.log('[CustomerDetailView-PastClasses] Forcing critical data refresh...');
                                adminData.refreshCritical();
                            } else {
                                // Fallback: usar onDataChange si refreshCritical no está disponible
                                console.log('[CustomerDetailView-PastClasses] Using onDataChange fallback...');
                                onDataChange();
                            }
                            
                            // 3. Esperar a que los datos se actualicen
                            await new Promise(resolve => setTimeout(resolve, 500));
                            
                            // 4. Cerrar modal
                            setState(prev => ({ ...prev, selectedBookingToReschedule: null }));
                            
                            console.log('[CustomerDetailView-PastClasses] Reschedule complete and modal closed');
                        }}
                        slotInfo={{ slot: state.selectedBookingToReschedule.slot, attendeeName: customer.userInfo.firstName + ' ' + customer.userInfo.lastName, bookingId: state.selectedBookingToReschedule.booking.id }}
                        appData={appData}
                    />
                )}
            </div>
        );
    };

    // Clases programadas = todos los slots futuros
    const renderScheduledClassesTab = () => {
        const now = new Date();
        const scheduledSlots = customer.bookings
            .flatMap(booking => booking.slots
                .filter(slot => new Date(slot.date + 'T00:00:00') >= now)
                .map(slot => ({ slot, booking }))
            );
        return (
            <div className="space-y-6">
                <h3 className="text-lg font-medium">Clases Programadas</h3>
                <div className="flex justify-end mb-4">
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition font-semibold"
                        onClick={() => setState(prev => ({ ...prev, isSchedulingModalOpen: true }))}
                    >
                        <PlusIcon className="h-5 w-5" /> Agendar clase
                    </button>
                </div>
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    {scheduledSlots.length > 0 ? scheduledSlots.map(({ slot, booking }, idx) => {
                        const isNoRefund = booking.acceptedNoRefund === true;
                        return (
                        <div key={idx} className="p-6 border-b last:border-b-0 flex justify-between items-center gap-4">
                            <div>
                                <p className="font-bold text-lg text-brand-text mb-1 flex items-center gap-2">
                                    {booking.product?.name || 'Clase individual'}
                                    {!booking.isPaid && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 ml-2">
                                            <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
                                            No confirmada por pago
                                        </span>
                                    )}
                                    {isNoRefund && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 ml-2" title="Reserva <48hrs: No reembolsable ni reagendable">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            No reagendable
                                        </span>
                                    )}
                                </p>
                                <p className="text-sm text-brand-secondary mb-1">{formatDate(slot.date)} a las {slot.time}</p>
                                <p className="text-sm text-brand-secondary mb-1">Código: {booking.bookingCode}</p>
                                <p className="text-sm text-brand-secondary mb-1">Tipo: {booking.productType}</p>
                                <p className="text-sm text-brand-secondary mb-1">Estado: <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Programada</span></p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className={`border px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                                        isNoRefund 
                                            ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                                            : 'border-brand-primary text-brand-primary hover:bg-blue-50'
                                    }`}
                                    onClick={() => !isNoRefund && setState(prev => ({ ...prev, selectedBookingToReschedule: { booking, slot } }))}
                                    disabled={isNoRefund}
                                    title={isNoRefund ? 'Esta reserva no es reagendable (reservada <48hrs)' : 'Reagendar clase'}
                                >
                                    <span className="material-icons">schedule</span> Reagendar
                                </button>
                                <button
                                    className="border border-red-500 text-red-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-red-50"
                                    onClick={() => setDeleteModal({ open: true, bookingId: booking.id, slot })}
                                    title="Eliminar clase"
                                >
                                    <span className="material-icons">delete</span> Eliminar
                                </button>
                            </div>
                        </div>
                        );
                    }) : (
                        <div className="p-6 text-center text-brand-secondary">No hay clases programadas.</div>
                    )}
                </div>
                {state.selectedBookingToReschedule && appData && (
                    <RescheduleModal
                        isOpen={true}
                        onClose={() => setState(prev => ({ ...prev, selectedBookingToReschedule: null }))}
                        onSave={async (newSlot) => {
                            console.log('[CustomerDetailView-Scheduled] Reschedule initiated:', { 
                                bookingId: state.selectedBookingToReschedule.booking.id, 
                                oldSlot: state.selectedBookingToReschedule.slot, 
                                newSlot 
                            });
                            
                            // 1. Ejecutar reagendamiento
                            const result = await dataService.rescheduleBookingSlot(
                                state.selectedBookingToReschedule.booking.id, 
                                state.selectedBookingToReschedule.slot, 
                                newSlot
                            );
                            
                            console.log('[CustomerDetailView-Scheduled] Reschedule result:', result);
                            
                            // 2. Forzar recarga inmediata de datos críticos (bookings y customers)
                            if (adminData.refreshCritical) {
                                console.log('[CustomerDetailView-Scheduled] Forcing critical data refresh...');
                                adminData.refreshCritical();
                            } else {
                                // Fallback: usar onDataChange si refreshCritical no está disponible
                                console.log('[CustomerDetailView-Scheduled] Using onDataChange fallback...');
                                onDataChange();
                            }
                            
                            // 3. Esperar a que los datos se actualicen
                            await new Promise(resolve => setTimeout(resolve, 500));
                            
                            // 4. Cerrar modal
                            setState(prev => ({ ...prev, selectedBookingToReschedule: null }));
                            
                            console.log('[CustomerDetailView-Scheduled] Reschedule complete and modal closed');
                        }}
                        slotInfo={{ slot: state.selectedBookingToReschedule.slot, attendeeName: customer.userInfo.firstName + ' ' + customer.userInfo.lastName, bookingId: state.selectedBookingToReschedule.booking.id }}
                        appData={appData}
                    />
                )}
                {state.isSchedulingModalOpen && (
                    <ManualBookingModal
                        isOpen={state.isSchedulingModalOpen}
                        onClose={() => setState(prev => ({ ...prev, isSchedulingModalOpen: false }))}
                        onBookingAdded={() => {
                            setState(prev => ({ ...prev, isSchedulingModalOpen: false }));
                            onDataChange();
                        }}
                        existingBookings={allBookings}
                        availableProducts={allProducts}
                        preselectedCustomer={customer}
                    />
                )}
            </div>
        );
    };

    // Pagos realizados
    const renderPaymentsTab = () => {
        const payments = customer.bookings
            .flatMap(booking => (booking.paymentDetails || []).map((payment, idx) => ({ payment, booking, idx })));
        console.log('CustomerDetailView - Render payments tab - payments:', payments);
        payments.forEach(({ payment, booking, idx }) => {
            if (payment.giftcardAmount) {
                console.log(`Giftcard detectada en pago idx=${idx}, bookingId=${booking.id}, amount=${payment.giftcardAmount}, giftcardId=${payment.giftcardId}`);
            }
        });
        
        return (
            <div className="space-y-6">
                <h3 className="text-lg font-medium flex items-center gap-2">
                    <CurrencyDollarIcon className="h-6 w-6 text-green-500" />
                    Pagos Realizados
                </h3>
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    {payments.length > 0 ? payments.map(({ payment, booking, idx }) => (
                        <div key={idx} className="p-6 border-b last:border-b-0 flex items-center gap-6">
                            <div className="flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                                <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-xl text-brand-text mb-1 flex items-center gap-2">
                                    {booking.product?.name || 'Clase individual'}
                                    <span className="inline-flex items-center px-2 py-1 text-sm font-semibold rounded bg-green-50 text-green-700 ml-2">
                                        ${formatCurrency(payment.amount).replace('€', '')}
                                    </span>
                                    {payment.giftcardAmount && (
                                        <span className="inline-flex items-center px-2 py-1 text-sm font-semibold rounded bg-indigo-50 text-indigo-700 ml-2">
                                            Giftcard: ${formatCurrency(payment.giftcardAmount || 0).replace('€', '')}
                                            {payment.giftcardId ? ` · ID:${payment.giftcardId}` : ''}
                                        </span>
                                    )}
                                </p>
                                <p className="text-sm text-brand-secondary mb-1 flex items-center gap-2">
                                    <ClockIcon className="h-4 w-4 text-gray-400" />
                                    {formatDate(payment.receivedAt)}
                                    <CreditCardIcon className="h-4 w-4 text-blue-400 ml-4" />
                                    <span className="font-medium text-blue-700">{payment.method}</span>
                                </p>
                                <p className="text-sm text-brand-secondary mb-1 flex items-center gap-2">
                                    <TagIcon className="h-4 w-4 text-gray-400" />
                                    <span className="font-mono">Código: {booking.bookingCode}</span>
                                </p>
                                {payment.giftcardAmount && (
                                    <div className="mt-2">
                                        <button
                                            onClick={() => setGiftcardAuditModal({ open: true, giftcardId: payment.giftcardId || null })}
                                            className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                                        >Ver auditoría de giftcard</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 flex flex-col items-center justify-center text-brand-secondary">
                            <CurrencyDollarIcon className="h-10 w-10 text-gray-300 mb-2" />
                            <span className="text-lg font-semibold">No hay pagos registrados.</span>
                        </div>
                    )}
                </div>
                {giftcardAuditModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative animate-fade-in">
                            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setGiftcardAuditModal({ open: false, giftcardId: null })} aria-label="Cerrar">&times;</button>
                            <h3 className="text-lg font-bold mb-4 text-indigo-700">Auditoría de Giftcard</h3>
                            <p className="mb-2 text-sm text-brand-secondary">Giftcard ID: <span className="font-mono font-bold">{giftcardAuditModal.giftcardId}</span></p>
                            <div className="bg-gray-50 p-3 rounded text-xs text-gray-700">(Próximamente: historial de uso, saldos y logs de auditoría)</div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Delivery de piezas
    const renderDeliveryTab = () => {
        const deliveries = state.deliveries || [];
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <TruckIcon className="h-6 w-6 text-brand-primary" />
                        Recogida de Piezas
                    </h3>
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition font-semibold"
                        onClick={() => setState(prev => ({ ...prev, isNewDeliveryModalOpen: true }))}
                    >
                        <PlusIcon className="h-5 w-5" /> Nueva Recogida
                    </button>
                </div>
                
                <DeliveryListWithFilters
                    deliveries={deliveries}
                    onEdit={(delivery) => setState(prev => ({ ...prev, deliveryToEdit: delivery }))}
                    onDelete={(delivery) => setState(prev => ({ ...prev, deliveryToDelete: delivery }))}
                    onComplete={(deliveryId) => setCompleteModal({ open: true, deliveryId })}
                    onMarkReady={handleMarkDeliveryAsReady}
                    formatDate={formatDate}
                />
                <NewDeliveryModal
                    isOpen={state.isNewDeliveryModalOpen}
                    onClose={() => setState(prev => ({ ...prev, isNewDeliveryModalOpen: false }))}
                    onSave={async (deliveryData) => {
                        try {
                            const result = await dataService.createDelivery({
                                ...deliveryData,
                                customerEmail: customer.userInfo.email,
                                customerName: customer.userInfo.firstName
                            } as any);
                            if (result.success && result.delivery) {
                                setState(prev => ({
                                    ...prev,
                                    deliveries: [...prev.deliveries, result.delivery],
                                    isNewDeliveryModalOpen: false
                                }));
                                onDataChange();
                            } else {
                                setState(prev => ({ ...prev, isNewDeliveryModalOpen: false }));
                            }
                        } catch (error) {
                            setState(prev => ({ ...prev, isNewDeliveryModalOpen: false }));
                        }
                    }}
                    customerEmail={customer.userInfo.email}
                    customerName={customer.userInfo.firstName}
                />
                {state.deliveryToEdit && (
                    <EditDeliveryModal
                        isOpen={true}
                        delivery={state.deliveryToEdit}
                        onClose={() => setState(prev => ({ ...prev, deliveryToEdit: null }))}
                        onSave={async (deliveryId, updates) => {
                            try {
                                const result = await dataService.updateDelivery(deliveryId, updates);
                                if (result.success && result.delivery) {
                                    setState(prev => ({
                                        ...prev,
                                        deliveries: prev.deliveries.map(d => 
                                            d.id === result.delivery!.id ? result.delivery! : d
                                        ),
                                        deliveryToEdit: null
                                    }));
                                    onDataChange();
                                } else {
                                    setState(prev => ({ ...prev, deliveryToEdit: null }));
                                }
                            } catch (error) {
                                console.error('Error updating delivery:', error);
                                setState(prev => ({ ...prev, deliveryToEdit: null }));
                            }
                        }}
                    />
                )}
                {completeModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-600">
                                <CheckCircleIcon className="h-6 w-6" />
                                Completar entrega
                            </h4>
                            <label className="block mb-2 font-semibold">Fecha de entrega real</label>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="date"
                                    className="w-full border rounded px-3 py-2"
                                    value={completeDate}
                                    onChange={e => setCompleteDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    placeholder="dd/mm/yyyy"
                                />
                                <button
                                    type="button"
                                    className="px-3 py-2 rounded bg-green-50 hover:bg-green-100 text-green-700 font-semibold border border-green-200 transition"
                                    title="Seleccionar hoy"
                                    onClick={() => setCompleteDate(new Date().toISOString().split('T')[0])}
                                    disabled={completeLoading}
                                >Hoy</button>
                            </div>
                            <div className="flex gap-4 justify-end">
                                <button
                                    className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
                                    onClick={() => { setCompleteModal({ open: false, deliveryId: null }); setCompleteDate(""); }}
                                    disabled={completeLoading}
                                >Cancelar</button>
                                <button
                                    className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold"
                                    onClick={handleCompleteDelivery}
                                    disabled={completeLoading || !completeDate}
                                >{completeLoading ? 'Guardando...' : 'Completar'}</button>
                            </div>
                        </div>
                    </div>
                )}
                {state.deliveryToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600">
                                <ExclamationTriangleIcon className="h-6 w-6" />
                                Eliminar entrega
                            </h4>
                            <p className="mb-6">¿Seguro que deseas eliminar la entrega <span className="font-semibold">{state.deliveryToDelete.description}</span>?</p>
                            <div className="flex gap-4 justify-end">
                                <button
                                    className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
                                    onClick={() => setState(prev => ({ ...prev, deliveryToDelete: null }))}
                                >Cancelar</button>
                                <button
                                    className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                                    onClick={async () => {
                                        await handleDeleteDelivery(state.deliveryToDelete.id);
                                        setState(prev => ({ ...prev, deliveryToDelete: null }));
                                        onDataChange();
                                    }}
                                >Eliminar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Información del cliente
    const renderInfoTab = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Información del Cliente</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setState(prev => ({ ...prev, editMode: !prev.editMode }))}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        style={{ aspectRatio: '2.8/1' }}
                    >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        {state.editMode ? 'Cancelar' : 'Editar'}
                    </button>
                    <button
                        onClick={() => setDeleteCustomerModal(true)}
                        className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-600 bg-white hover:bg-red-50"
                        style={{ aspectRatio: '2.8/1' }}
                        title="Eliminar cliente"
                    >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Eliminar
                    </button>
                </div>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
                {state.editMode ? (
                    <form
                        className="space-y-4"
                        onSubmit={async e => {
                            e.preventDefault();
                            await dataService.updateCustomerInfo(
                                customer.email,
                                {
                                    email: state.editInfo.email,
                                    firstName: state.editInfo.firstName,
                                    lastName: state.editInfo.lastName,
                                    phone: state.editInfo.phone,
                                    countryCode: state.editInfo.countryCode,
                                    birthday: state.editInfo.birthday || undefined
                                }
                            );
                            setState(prev => ({
                                ...prev,
                                editMode: false,
                                editInfo: {
                                    ...prev.editInfo
                                }
                            }));
                            onDataChange();
                        }}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Nombre</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={state.editInfo.firstName}
                                    onChange={e => setState(prev => ({ ...prev, editInfo: { ...prev.editInfo, firstName: e.target.value } }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Apellido</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={state.editInfo.lastName}
                                    onChange={e => setState(prev => ({ ...prev, editInfo: { ...prev.editInfo, lastName: e.target.value } }))}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={state.editInfo.email}
                                    onChange={e => setState(prev => ({ ...prev, editInfo: { ...prev.editInfo, email: e.target.value } }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Teléfono</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={state.editInfo.phone}
                                    onChange={e => setState(prev => ({ ...prev, editInfo: { ...prev.editInfo, phone: e.target.value } }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Fecha de nacimiento</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={state.editInfo.birthday || ''}
                                    onChange={e => setState(prev => ({ ...prev, editInfo: { ...prev.editInfo, birthday: e.target.value } }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">País</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={state.editInfo.countryCode}
                                    onChange={e => setState(prev => ({ ...prev, editInfo: { ...prev.editInfo, countryCode: e.target.value } }))}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                className="bg-white border text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100"
                                onClick={() => setState(prev => ({ ...prev, editMode: false }))}
                            >Cancelar</button>
                            <button
                                type="submit"
                                className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent"
                            >Guardar</button>
                        </div>
                    </form>
                ) : (
                    <>
                        <p><strong>Nombre:</strong> {customer.userInfo.firstName} {customer.userInfo.lastName}</p>
                        <p><strong>Email:</strong> {customer.userInfo.email}</p>
                        <p><strong>Teléfono:</strong> {customer.userInfo.phone}</p>
                        <p><strong>Fecha de nacimiento:</strong> {customer.userInfo.birthday || 'No especificada'}</p>
                        <p><strong>País:</strong> {customer.userInfo.countryCode || 'No especificado'}</p>
                    </>
                )}
            </div>
        </div>
    );

    // Main tab renderer
    const renderTabContent = () => {
        switch (state.activeTab) {
            case 'info': return renderInfoTab();
            case 'past': return renderPastClassesTab();
            case 'schedule': return renderScheduledClassesTab();
            case 'payments': return renderPaymentsTab();
            case 'delivery': return renderDeliveryTab();
            default: return null;
        }
    };

    return (
        <div className="w-full max-w-4xl px-4 py-8">
            {/* Header mejorado */}
            <div className="grid grid-cols-12 gap-0 items-center bg-brand-surface rounded-xl shadow border border-brand-border mb-4 py-4 px-6">
                <div className="col-span-3 flex items-center">
                    <button onClick={onBack} className="text-brand-primary hover:text-brand-accent font-bold text-lg transition-colors duration-150 flex items-center gap-2">
                        <UserIcon className="h-6 w-6 text-brand-accent" />
                        <span>← Volver</span>
                    </button>
                </div>
                <div className="col-span-6 flex justify-center">
                    <h2 className="text-3xl font-extrabold text-brand-primary flex items-center gap-3">
                        <UserIcon className="h-8 w-8 text-brand-accent" />
                        {customer.userInfo.firstName} {customer.userInfo.lastName}
                    </h2>
                </div>
                <div className="col-span-3"></div>
            </div>

            {/* Tabs */}
            <div className="bg-brand-surface rounded-xl shadow border border-brand-border mb-6">
                <nav className="grid grid-cols-5 gap-0 px-2 py-2">
                    <button
                        onClick={() => setState(prev => ({ ...prev, activeTab: 'info' }))}
                        className={`flex flex-col items-center justify-center py-3 font-semibold border-2 transition-all duration-200 rounded-lg mx-1 ${state.activeTab === 'info' ? 'border-gray-400 bg-gray-50 text-gray-700 shadow' : 'border-transparent text-brand-secondary hover:text-gray-600 hover:bg-gray-50'}`}
                    >
                        <UserIcon className="h-6 w-6 mb-1 text-gray-400" />
                        <span className="text-sm">Información</span>
                    </button>
                    <button
                        onClick={() => setState(prev => ({ ...prev, activeTab: 'past' }))}
                        className={`flex flex-col items-center justify-center py-3 font-semibold border-2 transition-all duration-200 rounded-lg mx-1 ${state.activeTab === 'past' ? 'border-blue-400 bg-blue-50 text-blue-700 shadow' : 'border-transparent text-brand-secondary hover:text-blue-600 hover:bg-blue-50'}`}
                    >
                        <ClockIcon className="h-6 w-6 mb-1 text-blue-400" />
                        <span className="text-sm">Clases Pasadas</span>
                    </button>
                    <button
                        onClick={() => setState(prev => ({ ...prev, activeTab: 'schedule' }))}
                        className={`flex flex-col items-center justify-center py-3 font-semibold border-2 transition-all duration-200 rounded-lg mx-1 ${state.activeTab === 'schedule' ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow' : 'border-transparent text-brand-secondary hover:text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        <CalendarIcon className="h-6 w-6 mb-1 text-indigo-400" />
                        <span className="text-sm">Clases Programadas</span>
                    </button>
                    <button
                        onClick={() => setState(prev => ({ ...prev, activeTab: 'payments' }))}
                        className={`flex flex-col items-center justify-center py-3 font-semibold border-2 transition-all duration-200 rounded-lg mx-1 ${state.activeTab === 'payments' ? 'border-yellow-400 bg-yellow-50 text-yellow-700 shadow' : 'border-transparent text-brand-secondary hover:text-yellow-600 hover:bg-yellow-50'}`}
                    >
                        <CurrencyDollarIcon className="h-6 w-6 mb-1 text-yellow-400" />
                        <span className="text-sm">Pagos Realizados</span>
                    </button>
                    <button
                        onClick={() => setState(prev => ({ ...prev, activeTab: 'delivery' }))}
                        className={`flex flex-col items-center justify-center py-3 font-semibold border-2 transition-all duration-200 rounded-lg mx-1 ${state.activeTab === 'delivery' ? 'border-green-400 bg-green-50 text-green-700 shadow' : 'border-transparent text-brand-secondary hover:text-green-600 hover:bg-green-50'}`}
                    >
                        <TruckIcon className="h-6 w-6 mb-1 text-green-400" />
                        <span className="text-sm">Recogida de Piezas</span>
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {renderTabContent()}
            </div>

            {/* Modal de confirmación para eliminar clase programada */}
            {deleteModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                    <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
                        <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600">
                            <span className="material-icons">delete</span>
                            Eliminar clase programada
                        </h4>
                        <p className="mb-6">¿Seguro que deseas eliminar la clase <span className="font-semibold">{deleteModal.slot?.date} {deleteModal.slot?.time}</span>?</p>
                        <div className="flex gap-4 justify-end">
                            <button
                                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
                                onClick={() => setDeleteModal({ open: false, bookingId: null, slot: null })}
                                disabled={deleteLoading}
                            >Cancelar</button>
                            <button
                                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                                onClick={handleDeleteSlot}
                                disabled={deleteLoading}
                            >{deleteLoading ? 'Eliminando...' : 'Eliminar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación para eliminar cliente */}
            {deleteCustomerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                    <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
                        <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600">
                            <TrashIcon className="h-6 w-6" />
                            Eliminar cliente
                        </h4>
                        <p className="mb-6">¿Seguro que deseas eliminar al cliente <span className="font-semibold">{customer.userInfo.firstName} {customer.userInfo.lastName}</span>?<br />Esta acción eliminará todos sus datos y no se puede deshacer.</p>
                        <div className="flex gap-4 justify-end">
                            <button
                                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
                                onClick={() => setDeleteCustomerModal(false)}
                                disabled={deleteCustomerLoading}
                            >Cancelar</button>
                            <button
                                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                                onClick={handleDeleteCustomer}
                                disabled={deleteCustomerLoading}
                            >{deleteCustomerLoading ? 'Eliminando...' : 'Eliminar'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerDetailView;
