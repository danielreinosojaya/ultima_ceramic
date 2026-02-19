import React, { useState, useEffect } from 'react';
import type { Booking, InvoiceRequest, ClassPackage, Delivery, PaymentDetails, Customer, AppData, Product, GroupTechnique } from '../../types';
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
        'CUSTOM_GROUP_EXPERIENCE': 'Experiencia Grupal Personalizada',
    'COUPLES_EXPERIENCE': 'Experiencia de Parejas',
    'OPEN_STUDIO': 'Estudio Abierto'
  };
  return typeNames[productType || ''] || 'Clase';
};

// Helper para obtener el nombre del producto/técnica de un booking
const getBookingDisplayName = (booking: Booking): string => {
    // 0. Para experiencia grupal personalizada, priorizar técnica sobre nombre genérico
    if (
        booking.technique &&
        (booking.productType === 'CUSTOM_GROUP_EXPERIENCE' || booking.product?.name === 'Experiencia Grupal Personalizada')
    ) {
        return getTechniqueName(booking.technique);
    }

  // 1. Si tiene groupClassMetadata con techniqueAssignments (GROUP_CLASS)
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    if (uniqueTechniques.length === 1) {
      return getTechniqueName(uniqueTechniques[0]);
    }
    return 'Clase Grupal (mixto)';
  }
  
  // 2. Prioridad: product.name (es la fuente más confiable)
  const productName = booking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown' && productName !== null) {
    return productName;
  }
  
  // 3. Fallback: technique directamente (solo si product.name no existe)
  if (booking.technique) {
    return getTechniqueName(booking.technique);
  }
  
  // 4. Último fallback: productType
  return getProductTypeName(booking.productType);
};
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
                adminData.optimisticRemoveCustomer(customer.email);
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
            adminData.optimisticRemoveBookingSlot(deleteModal.bookingId, {
                date: deleteModal.slot.date,
                time: deleteModal.slot.time
            });
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
                    adminData.optimisticUpsertDelivery(updateRes.delivery);
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
            // Check if delivery already has ready_at
            const existingDelivery = state.deliveries.find(d => d.id === deliveryId);
            const isResend = !!existingDelivery?.readyAt;
            
            if (isResend) {
                const confirmResend = window.confirm('Esta pieza ya fue marcada como lista.\n\n¿Deseas reenviar el email de notificación al cliente?');
                if (!confirmResend) return;
            }
            
            console.log('[handleMarkDeliveryAsReady] Starting for deliveryId:', deliveryId, 'isResend:', isResend);
            const result = await dataService.markDeliveryAsReady(deliveryId, isResend);
            console.log('[handleMarkDeliveryAsReady] Result:', result);
            
            if (result.success && result.delivery) {
                setState(prev => ({
                    ...prev,
                    deliveries: prev.deliveries.map(d => d.id === result.delivery.id ? result.delivery : d)
                }));
                adminData.optimisticUpsertDelivery(result.delivery);
                
                if (isResend) {
                    alert('✅ Email reenviado al cliente.');
                } else {
                    alert('✅ Cliente notificado. La pieza está marcada como lista para recoger.');
                }
            } else if (result.error) {
                console.error('[handleMarkDeliveryAsReady] Error from backend:', result.error);
                alert(`❌ ${result.error}`);
            } else {
                console.error('[handleMarkDeliveryAsReady] Unexpected result:', result);
                alert('❌ Error inesperado. Revisa los logs de Vercel.');
            }
        } catch (error) {
            console.error('[handleMarkDeliveryAsReady] Exception:', error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            alert(`❌ Error: ${errorMsg}`);
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
                        // Verificar si ESTE slot específico fue reservado con <48hrs
                        const slotDate = new Date(slot.date + 'T00:00:00');
                        const bookingCreatedAt = new Date(booking.createdAt);
                        const hoursDiff = (slotDate.getTime() - bookingCreatedAt.getTime()) / (1000 * 60 * 60);
                        const isNoRefund = hoursDiff < 48;
                        const uniqueKey = `${booking.id}-${slot.date}-${slot.time}`;
                        return (
                            <div key={uniqueKey} className={`p-6 border-b last:border-b-0 flex justify-between items-center gap-4 ${isPaid ? '' : 'bg-yellow-50'}`}>
                                <div>
                                    <p className="font-bold text-lg text-brand-text mb-1 flex items-center gap-2">
                                        {getBookingDisplayName(booking)}
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
                                newSlot,
                                true, // forceAdminReschedule: Admin puede reagendar sin restricciones
                                'admin_user'
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
                        // Verificar si ESTE slot específico fue reservado con <48hrs
                        const slotDate = new Date(slot.date + 'T00:00:00');
                        const bookingCreatedAt = new Date(booking.createdAt);
                        const hoursDiff = (slotDate.getTime() - bookingCreatedAt.getTime()) / (1000 * 60 * 60);
                        const isNoRefund = hoursDiff < 48;
                        const uniqueKey = `${booking.id}-${slot.date}-${slot.time}`;
                        return (
                        <div key={uniqueKey} className="p-6 border-b last:border-b-0 flex justify-between items-center gap-4">
                            <div>
                                <p className="font-bold text-lg text-brand-text mb-1 flex items-center gap-2">
                                    {getBookingDisplayName(booking)}
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
                                newSlot,
                                true, // forceAdminReschedule: Admin puede reagendar sin restricciones
                                'admin_user'
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
                    {payments.length > 0 ? payments.map(({ payment, booking, idx }) => {
                        const uniqueKey = `${payment.paymentId || payment.id || idx}-${booking.id}`;
                        return (
                        <div key={uniqueKey} className="p-6 border-b last:border-b-0 flex items-center gap-6">
                            <div className="flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                                <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-xl text-brand-text mb-1 flex items-center gap-2">
                                    {getBookingDisplayName(booking)}
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
                        );
                    }) : (
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
            <div className="space-y-3 sm:space-y-6 w-full">
                {/* Header - Mobile-first responsive */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
                    <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-gray-900">
                        <TruckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-brand-primary flex-shrink-0" />
                        <span>Recogida de Piezas</span>
                    </h3>
                    <button
                        className="flex-1 sm:flex-none inline-flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2 sm:py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition font-semibold text-xs sm:text-sm"
                        onClick={() => setState(prev => ({ ...prev, isNewDeliveryModalOpen: true }))}
                    >
                        <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span>Nueva Recogida</span>
                    </button>
                </div>
                
                {/* Delivery List - Responsive container */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 md:p-6 overflow-x-auto">
                    <DeliveryListWithFilters
                        deliveries={deliveries}
                        onEdit={(delivery) => setState(prev => ({ ...prev, deliveryToEdit: delivery }))}
                        onDelete={(delivery) => setState(prev => ({ ...prev, deliveryToDelete: delivery }))}
                        onComplete={(deliveryId) => setCompleteModal({ open: true, deliveryId })}
                        onMarkReady={handleMarkDeliveryAsReady}
                        formatDate={formatDate}
                        onDataChange={onDataChange}
                        onDeliveryUpdated={(updatedDelivery) => setState(prev => ({
                            ...prev,
                            deliveries: prev.deliveries.map(d => d.id === updatedDelivery.id ? updatedDelivery : d)
                        }))}
                    />
                </div>

                {/* New Delivery Modal */}
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
                                adminData.optimisticUpsertDelivery(result.delivery);
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

                {/* Edit Delivery Modal */}
                {state.deliveryToEdit && (
                    <EditDeliveryModal
                        isOpen={true}
                        delivery={state.deliveryToEdit}
                        onClose={() => setState(prev => ({ ...prev, deliveryToEdit: null }))}
                        formatDate={formatDate}
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
                                    adminData.optimisticUpsertDelivery(result.delivery);
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

                {/* Complete Delivery Modal - Mobile-first responsive */}
                {completeModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-0">
                        <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 md:p-8 max-w-sm w-full">
                            <h4 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 text-green-600">
                                <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                                Completar entrega
                            </h4>
                            <label className="block mb-2 sm:mb-3 font-semibold text-sm sm:text-base text-gray-900">Fecha de entrega real</label>
                            
                            {/* Date input and Today button - responsive layout */}
                            <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:mb-6">
                                <input
                                    type="date"
                                    className="flex-grow px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                    value={completeDate}
                                    onChange={e => setCompleteDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    placeholder="dd/mm/yyyy"
                                />
                                <button
                                    type="button"
                                    className="px-3 sm:px-4 py-2 rounded bg-green-50 hover:bg-green-100 text-green-700 font-semibold border border-green-200 transition text-xs sm:text-sm whitespace-nowrap"
                                    title="Seleccionar hoy"
                                    onClick={() => setCompleteDate(new Date().toISOString().split('T')[0])}
                                    disabled={completeLoading}
                                >
                                    Hoy
                                </button>
                            </div>

                            {/* Action buttons - responsive stacking */}
                            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4 justify-end">
                                <button
                                    className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs sm:text-sm transition"
                                    onClick={() => { setCompleteModal({ open: false, deliveryId: null }); setCompleteDate(""); }}
                                    disabled={completeLoading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-sm transition disabled:opacity-50"
                                    onClick={handleCompleteDelivery}
                                    disabled={completeLoading || !completeDate}
                                >
                                    {completeLoading ? 'Guardando...' : 'Completar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Delivery Confirmation Modal - Mobile-first responsive */}
                {state.deliveryToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-0">
                        <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 md:p-8 max-w-sm w-full">
                            <h4 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 text-red-600">
                                <ExclamationTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                                Eliminar entrega
                            </h4>
                            <p className="mb-4 sm:mb-6 text-sm sm:text-base text-gray-700">¿Seguro que deseas eliminar la entrega <span className="font-semibold">{state.deliveryToDelete.description}</span>?</p>
                            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4 justify-end">
                                <button
                                    className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs sm:text-sm transition"
                                    onClick={() => setState(prev => ({ ...prev, deliveryToDelete: null }))}
                                >Cancelar</button>
                                <button
                                    className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm transition"
                                    onClick={async () => {
                                        await handleDeleteDelivery(state.deliveryToDelete.id);
                                        setState(prev => ({ ...prev, deliveryToDelete: null }));
                                        adminData.optimisticRemoveDelivery(state.deliveryToDelete.id);
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
        <div className="space-y-4 sm:space-y-6">
            {/* Header con botones - responsive layout */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Información del Cliente</h3>
                <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setState(prev => ({ ...prev, editMode: !prev.editMode }))}
                        className="flex-1 xs:flex-auto inline-flex items-center justify-center xs:justify-start gap-2 px-3 py-2 border border-gray-300 shadow-sm text-xs xs:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
                    >
                        <PencilIcon className="h-4 w-4 flex-shrink-0" />
                        <span>{state.editMode ? 'Cancelar' : 'Editar'}</span>
                    </button>
                    <button
                        onClick={() => setDeleteCustomerModal(true)}
                        className="flex-1 xs:flex-auto inline-flex items-center justify-center xs:justify-start gap-2 px-3 py-2 border border-red-300 shadow-sm text-xs xs:text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 transition"
                        title="Eliminar cliente"
                    >
                        <TrashIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden xs:inline">Eliminar</span>
                    </button>
                </div>
            </div>

            {/* Content - edit mode or view mode */}
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6 space-y-4">
                {state.editMode ? (
                    <form
                        className="space-y-3 sm:space-y-4"
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

                            adminData.optimisticPatchCustomer(customer.email, {
                                email: state.editInfo.email,
                                userInfo: {
                                    ...(customer.userInfo || {}),
                                    email: state.editInfo.email,
                                    firstName: state.editInfo.firstName,
                                    lastName: state.editInfo.lastName,
                                    phone: state.editInfo.phone,
                                    countryCode: state.editInfo.countryCode,
                                    birthday: state.editInfo.birthday || null,
                                } as any,
                            } as any);
                            setState(prev => ({
                                ...prev,
                                editMode: false,
                                editInfo: {
                                    ...prev.editInfo
                                }
                            }));
                        }}
                    >
                        {/* Nombre y Apellido - responsive grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold mb-1 text-gray-700">Nombre</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                    value={state.editInfo.firstName}
                                    onChange={e => setState(prev => ({ ...prev, editInfo: { ...prev.editInfo, firstName: e.target.value } }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold mb-1 text-gray-700">Apellido</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                    value={state.editInfo.lastName}
                                    onChange={e => setState(prev => ({ ...prev, editInfo: { ...prev.editInfo, lastName: e.target.value } }))}
                                    required
                                />
                            </div>
                        </div>

                        {/* Email y Teléfono - responsive grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold mb-1 text-gray-700">Email</label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                    value={state.editInfo.email}
                                    onChange={e => setState(prev => ({ ...prev, editInfo: { ...prev.editInfo, email: e.target.value } }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold mb-1 text-gray-700">Teléfono</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                    value={state.editInfo.phone}
                                    onChange={e => setState(prev => ({ ...prev, editInfo: { ...prev.editInfo, phone: e.target.value } }))}
                                />
                            </div>
                        </div>

                        {/* Fecha de nacimiento y País - responsive grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold mb-1 text-gray-700">Fecha de nacimiento</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                    value={state.editInfo.birthday || ''}
                                    onChange={e => setState(prev => ({ ...prev, editInfo: { ...prev.editInfo, birthday: e.target.value } }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold mb-1 text-gray-700">País</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                    value={state.editInfo.countryCode}
                                    onChange={e => setState(prev => ({ ...prev, editInfo: { ...prev.editInfo, countryCode: e.target.value } }))}
                                />
                            </div>
                        </div>

                        {/* Botones - responsive layout */}
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition text-xs sm:text-sm"
                                onClick={() => setState(prev => ({ ...prev, editMode: false }))}
                            >Cancelar</button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-accent transition text-xs sm:text-sm"
                            >Guardar</button>
                        </div>
                    </form>
                ) : (
                    <>
                        {/* View mode - cards responsive layout */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                                <p className="text-xs text-gray-600 mb-1">Nombre</p>
                                <p className="font-semibold text-sm sm:text-base text-gray-900">{customer.userInfo.firstName} {customer.userInfo.lastName}</p>
                            </div>
                            <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                                <p className="text-xs text-gray-600 mb-1">Email</p>
                                <p className="font-semibold text-sm sm:text-base text-gray-900 break-all">{customer.userInfo.email}</p>
                            </div>
                            <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                                <p className="text-xs text-gray-600 mb-1">Teléfono</p>
                                <p className="font-semibold text-sm sm:text-base text-gray-900">{customer.userInfo.phone || 'No especificado'}</p>
                            </div>
                            <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                                <p className="text-xs text-gray-600 mb-1">Fecha de nacimiento</p>
                                <p className="font-semibold text-sm sm:text-base text-gray-900">{customer.userInfo.birthday || 'No especificada'}</p>
                            </div>
                            <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 sm:col-span-2">
                                <p className="text-xs text-gray-600 mb-1">País</p>
                                <p className="font-semibold text-sm sm:text-base text-gray-900">{customer.userInfo.countryCode || 'No especificado'}</p>
                            </div>
                        </div>
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
        <div className="w-full min-h-screen bg-brand-background p-2 sm:p-4 md:p-6">
            {/* Header - Mobile-first responsive */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-brand-border mb-3 sm:mb-4 md:mb-6 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 md:p-6">
                    
                    {/* Back button */}
                    <button 
                        onClick={onBack} 
                        className="text-brand-primary hover:text-brand-accent font-bold text-sm sm:text-base md:text-lg transition-colors flex items-center gap-2 w-fit"
                    >
                        <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-brand-accent flex-shrink-0" />
                        <span>← Volver</span>
                    </button>

                    {/* Customer name - centered on mobile, left on sm+ */}
                    <div className="text-center sm:text-left flex-grow">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-brand-primary">
                            {customer.userInfo.firstName} {customer.userInfo.lastName}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Tabs - Mobile-first horizontal scroll / desktop grid */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-md border border-brand-border mb-3 sm:mb-4 md:mb-6 overflow-x-auto">
                <nav className="flex sm:grid sm:grid-cols-5 gap-1 sm:gap-0 p-2 sm:p-0 min-w-min sm:min-w-full">
                    {[
                        { id: 'info', icon: UserIcon, label: 'Información', color: 'gray' },
                        { id: 'past', icon: ClockIcon, label: 'Pasadas', color: 'blue' },
                        { id: 'schedule', icon: CalendarIcon, label: 'Programadas', color: 'indigo' },
                        { id: 'payments', icon: CurrencyDollarIcon, label: 'Pagos', color: 'yellow' },
                        { id: 'delivery', icon: TruckIcon, label: 'Recogida', color: 'green' }
                    ].map(({ id, icon: Icon, label, color }) => {
                        const isActive = state.activeTab === id;
                        const colorClasses = {
                            gray: isActive ? 'border-gray-400 bg-gray-50 text-gray-700' : 'border-transparent text-brand-secondary hover:text-gray-600 hover:bg-gray-50',
                            blue: isActive ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-transparent text-brand-secondary hover:text-blue-600 hover:bg-blue-50',
                            indigo: isActive ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-transparent text-brand-secondary hover:text-indigo-600 hover:bg-indigo-50',
                            yellow: isActive ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-transparent text-brand-secondary hover:text-yellow-600 hover:bg-yellow-50',
                            green: isActive ? 'border-green-400 bg-green-50 text-green-700' : 'border-transparent text-brand-secondary hover:text-green-600 hover:bg-green-50'
                        };
                        
                        return (
                            <button
                                key={id}
                                onClick={() => setState(prev => ({ ...prev, activeTab: id }))}
                                className={`flex flex-col items-center justify-center py-2 sm:py-3 px-2 sm:px-1 font-semibold border-2 transition-all duration-200 rounded-lg whitespace-nowrap flex-shrink-0 sm:flex-shrink mx-0.5 sm:mx-1 ${colorClasses[color as keyof typeof colorClasses]} ${isActive ? 'shadow' : ''}`}
                            >
                                <Icon className="h-5 w-5 sm:h-6 sm:w-6 mb-0.5 sm:mb-1 flex-shrink-0" />
                                <span className="text-xs sm:text-sm">{label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content - Scrollable container */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-md border border-brand-border p-3 sm:p-4 md:p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                {renderTabContent()}
            </div>

            {/* Modal de confirmación para eliminar clase programada */}
            {deleteModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-0">
                    <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 md:p-8 max-w-sm w-full">
                        <h4 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 text-red-600">
                            <TrashIcon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                            Eliminar clase
                        </h4>
                        <p className="mb-4 sm:mb-6 text-sm sm:text-base text-gray-700">¿Eliminar la clase <span className="font-semibold">{deleteModal.slot?.date} {deleteModal.slot?.time}</span>?</p>
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4 justify-end">
                            <button
                                className="px-3 sm:px-4 py-2 sm:py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm sm:text-base transition"
                                onClick={() => setDeleteModal({ open: false, bookingId: null, slot: null })}
                                disabled={deleteLoading}
                            >Cancelar</button>
                            <button
                                className="px-3 sm:px-4 py-2 sm:py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-sm sm:text-base transition disabled:opacity-50"
                                onClick={handleDeleteSlot}
                                disabled={deleteLoading}
                            >{deleteLoading ? 'Eliminando...' : 'Eliminar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación para eliminar cliente */}
            {deleteCustomerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-0">
                    <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 md:p-8 max-w-sm w-full">
                        <h4 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 text-red-600">
                            <TrashIcon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                            Eliminar cliente
                        </h4>
                        <p className="mb-4 sm:mb-6 text-sm sm:text-base text-gray-700">¿Eliminar a <span className="font-semibold">{customer.userInfo.firstName} {customer.userInfo.lastName}</span>? Esta acción no se puede deshacer.</p>
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4 justify-end">
                            <button
                                className="px-3 sm:px-4 py-2 sm:py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm sm:text-base transition"
                                onClick={() => setDeleteCustomerModal(false)}
                                disabled={deleteCustomerLoading}
                            >Cancelar</button>
                            <button
                                className="px-3 sm:px-4 py-2 sm:py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-sm sm:text-base transition disabled:opacity-50"
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
