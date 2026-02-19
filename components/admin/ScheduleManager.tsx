import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Instructor, Booking, IntroductoryClass, Product, EditableBooking, RescheduleSlotInfo, PaymentDetails, AppData, InvoiceRequest, AdminTab, Customer, ClassPackage, EnrichedAvailableSlot, SingleClass, GroupClass, DayKey, AvailableSlot, ClassCapacity, Technique, GroupTechnique } from '../../types';
import * as dataService from '../../services/dataService';

// Helper para obtener nombre de técnica desde metadata
// FIX: Acepta tanto Technique como GroupTechnique para mayor flexibilidad
const getTechniqueName = (technique: GroupTechnique | Technique | string): string => {
  const names: Record<string, string> = {
    'potters_wheel': 'Torno Alfarero',
    'hand_modeling': 'Modelado a Mano',
    'painting': 'Pintura de piezas',
    'molding': 'Modelado'
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

// Helper para extraer la técnica subyacente de un booking
// Unifica: "Clase suelta torno" + "Torno Alfarero" + "Clase intro torno" → "potters_wheel"
const getUnderlyingTechnique = (booking: Booking): string => {
  // 1. Buscar en groupClassMetadata (GROUP_CLASS)
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    if (uniqueTechniques.length === 1) {
      return uniqueTechniques[0]; // Retorna 'potters_wheel', 'hand_modeling', 'painting'
    }
    return 'mixed'; // Múltiples técnicas en un solo booking
  }
  
  // 2. Buscar en product.details.technique (CLASS_PACKAGE, SINGLE_CLASS)
  if ('details' in booking.product && 'technique' in booking.product.details) {
    return booking.product.details.technique;
  }
  
  // 3. Para INTRODUCTORY_CLASS, asumir que son molding o potters_wheel según el nombre
  if (booking.productType === 'INTRODUCTORY_CLASS') {
    const productName = booking.product?.name?.toLowerCase() || '';
    if (productName.includes('torno') || productName.includes('wheel')) {
      return 'potters_wheel';
    }
    return 'molding'; // Default para intro
  }
  
  // 4. Fallback: usar productType como identificador
  return booking.productType || 'unknown';
};

// Helper para obtener el nombre display de un booking
const getBookingDisplayName = (booking: Booking): string => {
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

// Helper para obtener el nombre display de un slot
// FIX: Prioriza product.name sobre techniqueAssignments para evitar inconsistencias
const getSlotDisplayName = (slot: { product: Product; bookings: Booking[] }): string => {
  if (slot.bookings.length === 0) {
    // Slot vacío, usar producto del slot
    const productName = slot.product?.name;
    if (!productName || productName === 'Unknown Product' || productName === 'Unknown') {
      return 'Clase';
    }
    return productName;
  }

  const firstBooking = slot.bookings[0];
  
  // FIX #0: Si es CUSTOM_GROUP_EXPERIENCE, mostrar la técnica directamente
  if (firstBooking.productType === 'CUSTOM_GROUP_EXPERIENCE' && firstBooking.technique) {
    return getTechniqueName(firstBooking.technique);
  }
  
  // FIX #1: Prioridad máxima a product.name (fuente más confiable)
  // Esto evita que techniqueAssignments incorrecto sobrescriba el nombre correcto
  const productName = firstBooking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown' && productName !== null) {
    return productName;
  }
  
  // Si product.name no está disponible, usar la técnica subyacente
  const technique = getUnderlyingTechnique(firstBooking);
  
  // Mapear técnica a nombre display unificado
  if (technique === 'potters_wheel') return 'Torno Alfarero';
  if (technique === 'hand_modeling') return 'Modelado a Mano';
  if (technique === 'painting') return 'Pintura de piezas';
  if (technique === 'molding') return 'Modelado';
  if (technique === 'mixed') return 'Clase Grupal (mixto)';
  
  // Último fallback
  return getBookingDisplayName(firstBooking);
};
// import { useLanguage } from '../../context/LanguageContext';
import { DAY_NAMES, PALETTE_COLORS } from '../../constants.js';
import { InstructorTag } from '../InstructorTag';
import { BookingDetailsModal } from './BookingDetailsModal';
import { generateWeeklySchedulePDF } from '../../services/pdfService';
import { DocumentDownloadIcon } from '../icons/DocumentDownloadIcon';
import { AcceptPaymentModal } from './AcceptPaymentModal';
import { EditBookingModal } from './EditBookingModal';
import { RescheduleModal } from './RescheduleModal';
import { InvoiceReminderModal } from './InvoiceReminderModal';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { CustomerSearchResultsPanel } from './CustomerSearchResultsPanel';
import { UserGroupIcon } from '../icons/UserGroupIcon';

const colorMap = PALETTE_COLORS.reduce((acc, color) => {
    acc[color.name] = { bg: color.bg.replace('bg-', ''), text: color.text.replace('text-', '') };
    return acc;
}, {} as Record<string, { bg: string, text: string }>);
const defaultColorName = 'secondary';

interface NavigationState {
    tab: AdminTab;
    targetId: string;
}

type EnrichedSlot = {
    date: string; // Keep date inside the slot for easier processing
    time: string;
    product: Product;
    bookings: Booking[];
    capacity: number;
    instructorId: number;
    isOverride: boolean;
};

type ScheduleData = Map<number, { instructor: Instructor, schedule: Record<string, EnrichedSlot[]> }>;

const formatDateToYYYYMMDD = (d: Date): string => {
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toISOString().split('T')[0];
};

const getWeekStartDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

const normalizeTime = (timeStr: string): string => {
  if (!timeStr) return '';
  
  const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)/i);
  if (ampmMatch) {
    let [ , hours, minutes, modifier ] = ampmMatch;
    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);

    if (modifier.toLowerCase() === 'p.m.' && h < 12) {
      h += 12;
    } else if (modifier.toLowerCase() === 'a.m.' && h === 12) {
      h = 0;
    }

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) {
    console.warn(`Could not normalize time: ${timeStr}`);
    return '00:00';
  }
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

interface ScheduleManagerProps extends AppData {
    initialDate: Date;
    onBackToMonth: () => void;
    onDataChange: () => void;
    invoiceRequests: InvoiceRequest[];
    setNavigateTo: React.Dispatch<React.SetStateAction<NavigationState | null>>;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({ 
    initialDate, onBackToMonth, onDataChange, invoiceRequests, setNavigateTo, ...appData 
}) => {
    // Monolingüe español, textos hardcodeados
    const language = 'es-ES';
    const [currentDate, setCurrentDate] = useState(getWeekStartDate(initialDate));
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ date: string; time: string; attendees: any[]; instructorId: number; onClose?: () => void } | null>(null);
    const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
    const [now, setNow] = useState(new Date());
    const [bookingToHighlight, setBookingToHighlight] = useState<Booking | null>(null);
        // Handlers for BookingDetailsModal
        const handleMarkAsUnpaid = async (bookingId: string) => {
            await dataService.markBookingAsUnpaid(bookingId);
            closeAllModals();
            onDataChange();
        };

        const handleEditAttendee = (bookingId: string) => {
            setBookingToManageId(bookingId);
            setIsEditModalOpen(true);
        };

        const handleRescheduleAttendee = (bookingId: string, slot: any, attendeeName: string) => {
            setRescheduleInfo({ bookingId, slot, attendeeName });
            setIsRescheduleModalOpen(true);
        };
            // Handler for saving edited booking
            const handleSaveEditBooking = async (updatedData: EditableBooking) => {
          if (!bookingToManage) return;
          const updatedBooking = { ...bookingToManage, ...updatedData };
          await dataService.updateBooking(updatedBooking);
          setIsEditModalOpen(false);
          onDataChange();
            };
         // Panel lateral eliminado para restaurar el layout clásico
    
        useEffect(() => {
            // Highlight booking slot if navigated from dashboard
            const navState = (window as any).navigateToState || null;
            if (navState && navState.tab === 'schedule' && navState.targetId) {
                const booking = appData.bookings.find(b => b.id === navState.targetId);
                if (booking) {
                    // Set week to booking's first slot
                    if (booking.slots && booking.slots.length > 0) {
                        const firstSlot = booking.slots[0];
                        const slotDate = new Date(firstSlot.date + 'T00:00:00');
                        setCurrentDate(getWeekStartDate(slotDate));
                    }
                    setBookingToHighlight(booking);
                    setTimeout(() => setBookingToHighlight(null), 4000);
                }
                // Clear navigation state to avoid repeated highlight
                (window as any).navigateToState = null;
            }
        }, [appData.bookings]);

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
    const [searchCustomer, setSearchCustomer] = useState<Customer | null>(null);
    // ...existing code...

    const [bookingToManageId, setBookingToManageId] = useState<string | null>(null);
    const [isAcceptPaymentModalOpen, setIsAcceptPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [rescheduleInfo, setRescheduleInfo] = useState<RescheduleSlotInfo | null>(null);
    const [isInvoiceReminderOpen, setIsInvoiceReminderOpen] = useState(false);
    const [bookingIdForReminder, setBookingIdForReminder] = useState<string | null>(null);

     useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Abrir modal de detalles al navegar desde el dashboard
    useEffect(() => {
        const navState = (window as any).navigateToState || null;
        if (navState && navState.tab === 'schedule' && navState.targetId) {
            const booking = appData.bookings.find(b => b.id === navState.targetId);
            if (booking) {
                // Set week to booking's first slot
                if (booking.slots && booking.slots.length > 0) {
                    const firstSlot = booking.slots[0];
                    const slotDate = new Date(firstSlot.date + 'T00:00:00');
                    setCurrentDate(getWeekStartDate(slotDate));
                }
                setBookingToHighlight(booking);
                // Abrir modal de detalles - UN attendee por booking, no por slot
                setModalData({
                    date: booking.slots[0]?.date || '',
                    time: booking.slots[0]?.time || '',
                    instructorId: booking.slots[0]?.instructorId || 0,
                    attendees: [{
                        userInfo: booking.userInfo,
                        bookingId: booking.id,
                        isPaid: booking.isPaid,
                        bookingCode: booking.bookingCode,
                        paymentDetails: booking.paymentDetails
                    }]
                });
                setIsDetailsModalOpen(true);
                setTimeout(() => setBookingToHighlight(null), 4000);
            }
            // Limpiar navigation state para evitar highlight repetido
            (window as any).navigateToState = null;
        }
    }, [appData.bookings]);

    // Highlight booking slot if navigated from dashboard
    useEffect(() => {
        const navState = (window as any).navigateToState || null;
        if (navState && navState.tab === 'schedule' && navState.targetId) {
            const booking = appData.bookings.find(b => b.id === navState.targetId);
            if (booking) {
                // Set week to booking's first slot
                if (booking.slots && booking.slots.length > 0) {
                    const firstSlot = booking.slots[0];
                    const slotDate = new Date(firstSlot.date + 'T00:00:00');
                    setCurrentDate(getWeekStartDate(slotDate));
                }
                setBookingToHighlight(booking);
                setTimeout(() => setBookingToHighlight(null), 4000);
            }
            // Clear navigation state to avoid repeated highlight
            (window as any).navigateToState = null;
        }
    }, [appData.bookings]);

    useEffect(() => {
        setCurrentDate(getWeekStartDate(initialDate));
    }, [initialDate]);

    const { weekDates, scheduleData } = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const dates: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            dates.push(date);
        }

        const { instructors, bookings, products, availability, scheduleOverrides, classCapacity } = appData;
        
        const scheduleMap: ScheduleData = new Map();
        instructors.forEach(i => scheduleMap.set(i.id, { instructor: i, schedule: {} }));

        const allSlots = new Map<string, EnrichedSlot>();

        // Step 1: Populate slots from all bookings for the current week.
        for (const booking of bookings) {
            for (const slot of booking.slots) {
                if (!slot.date || !slot.time) {
                    continue;
                }

                // Usar instructor del booking si existe, sino default
                const instructorId = slot.instructorId || 1;

                const slotDate = new Date(slot.date + "T00:00:00");
                if (isNaN(slotDate.getTime())) {
                    continue;
                }

                const inCurrentWeek = slotDate >= startOfWeek && slotDate <= new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

                if (inCurrentWeek) {
                    const dateStr = slot.date;
                    const normalizedTime = normalizeTime(slot.time);
                    
                    // CRÍTICO: Derivar técnica real del booking (priorizar technique field si existe)
                    let bookingTechnique: string;
                    if (booking.technique) {
                        // Usar technique del booking (ya corregido en DB)
                        bookingTechnique = booking.technique;
                    } else {
                        // Fallback: derivar de product.name
                        const productName = booking.product?.name?.toLowerCase() || '';
                        if (productName.includes('pintura')) {
                            bookingTechnique = 'painting';
                        } else if (productName.includes('torno')) {
                            bookingTechnique = 'potters_wheel';
                        } else if (productName.includes('modelado')) {
                            bookingTechnique = 'hand_modeling';
                        } else {
                            bookingTechnique = getUnderlyingTechnique(booking);
                        }
                    }
                    
                    // Agrupar slots por fecha + hora + técnica específica
                    const slotId = `${dateStr}-${normalizedTime}-${bookingTechnique}`;
                    
                    if (!allSlots.has(slotId)) {
                        let slotCapacity = 0;
                        let technique: Technique | undefined;
                        
                        // Determine technique from booking technique field
                        if (booking.technique) {
                            technique = booking.technique as Technique;
                        } else if ('details' in booking.product && 'technique' in booking.product.details) {
                            technique = booking.product.details.technique;
                        } else if (booking.productType === 'INTRODUCTORY_CLASS') {
                            technique = 'molding'; // Valor válido según type Technique
                        }
                        
                        // Determine capacity
                        const overrideForDate = scheduleOverrides[slot.date];
                        if (overrideForDate?.capacity) {
                            slotCapacity = overrideForDate.capacity;
                        } else if (booking.productType === 'INTRODUCTORY_CLASS' && 'schedulingRules' in booking.product) {
                           // For intro classes, capacity comes from rules or overrides
                           const introProduct = booking.product as IntroductoryClass;
                           const matchingRule = introProduct.schedulingRules.find(r => r.dayOfWeek === slotDate.getDay() && r.time === normalizedTime);
                           slotCapacity = matchingRule?.capacity || classCapacity.introductory_class;
                        } else if (technique) {
                             slotCapacity = technique === 'molding' ? classCapacity.molding : classCapacity.potters_wheel;
                        } else {
                            slotCapacity = 1; // Default for ad-hoc without clear capacity
                        }

                        allSlots.set(slotId, {
                            date: dateStr,
                            time: slot.time,
                            product: booking.product,
                            bookings: [],
                            capacity: slotCapacity,
                            instructorId: instructorId,
                            isOverride: !!scheduleOverrides[dateStr],
                        });
                    }
                    
                    // Evitar duplicados: solo agregar si el booking no existe ya
                    const existingSlot = allSlots.get(slotId)!;
                    if (!existingSlot.bookings.some(b => b.id === booking.id)) {
                        existingSlot.bookings.push(booking);
                    }
                }
            }
        }

        // Step 2: Merge with default availability to show open slots.
        for (const date of dates) {
            const dateStr = formatDateToYYYYMMDD(date);
            const dayKey = DAY_NAMES[date.getDay()];
            const overrideForDate = scheduleOverrides[dateStr];
            const hasOverride = overrideForDate !== undefined;
            const slotsSource = hasOverride ? overrideForDate.slots : availability[dayKey];
            
            if (slotsSource) {
                slotsSource.forEach(s => {
                    // FIX: Usar mismo formato de slotId sin instructorId
                    const slotId = `${dateStr}-${normalizeTime(s.time)}`;
                    if (!allSlots.has(slotId)) {
                        const productForSlot = products.find(p => p.type === 'CLASS_PACKAGE' && p.details.technique === s.technique);
                        if (!productForSlot) return;

                        const capacity = overrideForDate?.capacity ?? (s.technique === 'molding' ? classCapacity.molding : classCapacity.potters_wheel);

                        allSlots.set(slotId, {
                            date: dateStr,
                            time: s.time,
                            product: productForSlot,
                            capacity,
                            instructorId: s.instructorId,
                            isOverride: hasOverride,
                            bookings: []
                        });
                    }
                });
            }

            const introClassProducts = products.filter(p => p.type === 'INTRODUCTORY_CLASS') as IntroductoryClass[];
            introClassProducts.forEach(p => {
                const introSessions = dataService.generateIntroClassSessions(p, { bookings: [] }, { includeFull: true });
                const sessionsForDay = introSessions.filter(s => s.date === dateStr);
                sessionsForDay.forEach(s => {
                    // FIX: Usar mismo formato de slotId sin instructorId
                    const slotId = `${dateStr}-${normalizeTime(s.time)}`;
                    if (!allSlots.has(slotId)) {
                         allSlots.set(slotId, {
                            date: dateStr,
                            time: s.time,
                            product: p,
                            capacity: s.capacity,
                            instructorId: s.instructorId,
                            isOverride: s.isOverride,
                            bookings: []
                        });
                    }
                });
            });
        }
        
        // Step 3: Populate the final schedule map from allSlots
        allSlots.forEach(slot => {
            let instructorData = scheduleMap.get(slot.instructorId);
            
            // SOLUCIÓN DEFINITIVA: Si el instructor ID no existe, usar el primer instructor disponible
            if (!instructorData && scheduleMap.size > 0) {
                const firstInstructorId = Array.from(scheduleMap.keys())[0];
                instructorData = scheduleMap.get(firstInstructorId);
                // Actualizar el slot para usar el instructor válido
                slot.instructorId = firstInstructorId;
            }
            
            if (instructorData) {
                 if (!instructorData.schedule[slot.date]) {
                    instructorData.schedule[slot.date] = [];
                 }
                instructorData.schedule[slot.date].push(slot);
            }
        });

        // Step 4: Sort slots for each day
        scheduleMap.forEach(data => {
            Object.values(data.schedule).forEach(slots => {
                slots.sort((a,b) => normalizeTime(a.time).localeCompare(normalizeTime(b.time)));
            });
        });

        return { weekDates: dates, scheduleData: scheduleMap };
    }, [currentDate, appData]);
    
    const calculateTotalParticipants = (bookings: Booking[]): number => {
        let count = 0;
        for (const b of bookings) {
            // CRÍTICO: Usar booking.participants si está disponible (reserva manual con N asistentes)
            // Fallback a minParticipants del producto solo si booking.participants no existe
            const participantCount = b.participants ?? (
                b.product.type === 'GROUP_CLASS' && 'minParticipants' in b.product 
                    ? b.product.minParticipants 
                    : 1
            );
            count += participantCount;
        }
        return count;
    };
    
    const todayStr = useMemo(() => formatDateToYYYYMMDD(new Date()), []);
    const todayIndex = useMemo(() => weekDates.findIndex(d => formatDateToYYYYMMDD(d) === todayStr), [weekDates, todayStr]);
    const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex !== -1 ? todayIndex : 0);

    useEffect(() => {
        const newTodayIndex = weekDates.findIndex(d => formatDateToYYYYMMDD(d) === todayStr);
        setSelectedDayIndex(newTodayIndex !== -1 ? newTodayIndex : 0);
    }, [weekDates, todayStr]);

    const bookingToManage = useMemo(() => {
        if (!bookingToManageId) return null;
        return appData.bookings.find(b => b.id === bookingToManageId);
    }, [bookingToManageId, appData.bookings]);

    const bookingForReminder = useMemo(() => {
        if (!bookingIdForReminder) return null;
        return appData.bookings.find(b => b.id === bookingIdForReminder);
    }, [bookingIdForReminder, appData.bookings]);


    const closeAllModals = () => {
        setIsDetailsModalOpen(false);
        setIsAcceptPaymentModalOpen(false);
        setIsEditModalOpen(false);
        setIsRescheduleModalOpen(false);
        setModalData(null);
        setBookingToManageId(null);
        setRescheduleInfo(null);
        setIsInvoiceReminderOpen(false);
        setBookingIdForReminder(null);
    };
    
    const handleShiftClick = (date: string, slot: EnrichedSlot) => {
        // Deduplicar bookings por ID antes de mostrar modal
        const uniqueBookingsMap = new Map<string, typeof slot.bookings[0]>();
        slot.bookings.forEach(b => {
            if (!uniqueBookingsMap.has(b.id)) {
                uniqueBookingsMap.set(b.id, b);
            }
        });
        const uniqueBookings = Array.from(uniqueBookingsMap.values());
        
        setModalData({
            date: date,
            time: slot.time,
            instructorId: slot.instructorId,
            attendees: uniqueBookings.map(b => ({ userInfo: b.userInfo, bookingId: b.id, isPaid: b.isPaid, bookingCode: b.bookingCode, paymentDetails: b.paymentDetails }))
        });
        setIsDetailsModalOpen(true);
    };

    const handleAcceptPayment = (bookingId: string) => {
        const pendingInvoiceRequest = invoiceRequests.find(
            req => req.bookingId === bookingId && req.status === 'Pending'
        );

        if (pendingInvoiceRequest) {
            setBookingIdForReminder(bookingId);
            setIsInvoiceReminderOpen(true);
        } else {
            setBookingToManageId(bookingId);
            setIsAcceptPaymentModalOpen(true);
        }
    };
    
    const handleConfirmPayment = async (details: PaymentDetails) => {
                        {/* Panel lateral eliminado para restaurar el layout clásico */}
        setIsRescheduleModalOpen(true);
    };

    const handleConfirmReschedule = async (newSlot: any) => {
        if (rescheduleInfo) {
            const result = await dataService.rescheduleBookingSlot(
                rescheduleInfo.bookingId, 
                rescheduleInfo.slot, 
                newSlot,
                true, // forceAdminReschedule: Admin puede reagendar sin restricciones
                'admin_user'
            );
            if (!result.success) {
                alert('Error al reprogramar la reserva: ' + result.message);
                return;
            }
            
            closeAllModals();
            
            // CORREGIDO: Forzar recarga de datos y dar tiempo al contexto para actualizar
            onDataChange();
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    };
    
    const handleRemoveAttendee = async (bookingId: string) => {
        if (modalData) {
            const slotToRemove = { date: modalData.date, time: modalData.time, instructorId: modalData.instructorId };
            await dataService.removeBookingSlot(bookingId, slotToRemove);
            closeAllModals();
            onDataChange();
        }
    };

    const handleGoToInvoicing = () => {
        if (!bookingForReminder) return;
        const request = invoiceRequests.find(req => req.bookingId === bookingForReminder.id);
        if (request) {
            setNavigateTo({ tab: 'invoicing', targetId: request.id });
        }
        closeAllModals();
    };

    const handleProceedWithPayment = () => {
        if (bookingIdForReminder) {
            setBookingToManageId(bookingIdForReminder);
            setIsAcceptPaymentModalOpen(true);
        }
        setIsInvoiceReminderOpen(false);
        setBookingIdForReminder(null);
    };
    
    const handleNextWeek = () => {
        setCurrentDate(prevDate => {
            const nextWeek = new Date(prevDate);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return nextWeek;
        });
    };

    const handlePrevWeek = () => {
        setCurrentDate(prevDate => {
            const prevWeek = new Date(prevDate);
            prevWeek.setDate(prevWeek.getDate() - 7);
            return prevWeek;
        });
    };

    const handleDownloadPdf = () => {
    const dataToExport = showUnpaidOnly ? filteredScheduleData : scheduleData;
    const subtitle = showUnpaidOnly ? 'Solo reservas no pagadas' : undefined;
    generateWeeklySchedulePDF(weekDates, dataToExport, language, showUnpaidOnly, subtitle);
    };
    
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) {
            setIsSearchPanelOpen(false);
            setSearchCustomer(null);
            return;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        const customers = dataService.generateCustomersFromBookings(appData.bookings);
        
        const foundCustomer = customers.find(customer => {
            const userInfo = customer.userInfo;
            return (
                userInfo.firstName.toLowerCase().includes(lowercasedTerm) ||
                userInfo.lastName.toLowerCase().includes(lowercasedTerm) ||
                userInfo.email.toLowerCase().includes(lowercasedTerm) ||
                customer.bookings.some(b => b.bookingCode?.toLowerCase().includes(lowercasedTerm))
            );
        });

        setSearchCustomer(foundCustomer || null);
        setIsSearchPanelOpen(true);
    };

    const handleNavigateFromSearch = (booking: Booking) => {
        // CORREGIDO: Manejar pre-reservas sin slots asignados
        if (!booking.slots || booking.slots.length === 0) {
            // Si no tiene slots, mostrar mensaje informativo al usuario
            alert(`⏳ Esta es una pre-reserva sin fechas asignadas aún.\n\nCódigo: ${booking.bookingCode}\nCliente: ${booking.userInfo.firstName} ${booking.userInfo.lastName}\n\nPuedes gestionar esta reserva desde el panel de Clientes o Financiero.`);
            setIsSearchPanelOpen(false);
            return;
        }
        
        const firstSlot = booking.slots.sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];
        if (firstSlot && firstSlot.date && firstSlot.time) {
            const firstSlotDate = new Date(firstSlot.date + 'T00:00:00');
            setCurrentDate(getWeekStartDate(firstSlotDate));
            setBookingToHighlight(booking);
            setIsSearchPanelOpen(false);

            setTimeout(() => {
                setBookingToHighlight(null);
            }, 4000); 
        } else {
            // Slot existe pero no tiene fecha/hora válida
            alert(`⚠️ Esta reserva tiene slots incompletos.\n\nCódigo: ${booking.bookingCode}\nCliente: ${booking.userInfo.firstName} ${booking.userInfo.lastName}\n\nPor favor, asigna fechas completas desde el panel de Clientes.`);
            setIsSearchPanelOpen(false);
        }
    };

    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    
    const filteredScheduleData = useMemo(() => {
        if (!showUnpaidOnly) {
            return scheduleData;
        }
        
        const filtered: ScheduleData = new Map();
        for (const [instructorId, data] of scheduleData.entries()) {
            const newSchedule: Record<string, EnrichedSlot[]> = {};
            let instructorHasUnpaid = false;
            for (const [dateStr, slots] of Object.entries(data.schedule)) {
                const slotsArr = Array.isArray(slots) ? slots : [];
                const slotsWithUnpaid = slotsArr.map(slot => {
                    const unpaidBookings = slot.bookings.filter(b => !b.isPaid);
                    
                    return {
                        ...slot,
                        bookings: unpaidBookings
                    };
                }).filter(slot => slot.bookings.length > 0);

                if (slotsWithUnpaid.length > 0) {
                    newSchedule[dateStr] = slotsWithUnpaid;
                    instructorHasUnpaid = true;
                }
            }
            if (instructorHasUnpaid) {
                filtered.set(instructorId, { ...data, schedule: newSchedule });
            }
        }
        return filtered;
    }, [showUnpaidOnly, scheduleData]);

    const hasVisibleSlotsInFilter = useMemo(() => {
        if (!showUnpaidOnly) return true;
        for (const { schedule } of filteredScheduleData.values()) {
            for (const slots of Object.values(schedule)) {
                if ((slots as any[]).length > 0) return true;
            }
        }
        return false;
    }, [showUnpaidOnly, filteredScheduleData]);

    const isTodayInView = weekDates.some(d => formatDateToYYYYMMDD(d) === todayStr);

    const dayStartHour = 8;
    const dayEndHour = 22;
    const totalMinutesInDay = (dayEndHour - dayStartHour) * 60;
    const currentMinutes = (now.getHours() - dayStartHour) * 60 + now.getMinutes();
    const progressPercent = (currentMinutes / totalMinutesInDay) * 100;
    const showTimeIndicator = isTodayInView && progressPercent >= 0 && progressPercent <= 100;

    return (
                    <div className="animate-fade-in">
                        {/* Panel lateral eliminado para restaurar el layout clásico */}
        {isDetailsModalOpen && modalData && (
            <BookingDetailsModal
                isOpen={isDetailsModalOpen}
                date={modalData.date}
                time={modalData.time}
                attendees={modalData.attendees}
                instructorId={modalData.instructorId}
                product={{ id: 'placeholder', name: 'Clase', type: 'class', price: 0 } as any}
                allBookings={[]}
                onClose={closeAllModals}
                onRemoveAttendee={handleRemoveAttendee}
                onAcceptPayment={handleAcceptPayment}
                onMarkAsUnpaid={handleMarkAsUnpaid}
                onEditAttendee={handleEditAttendee}
                onRescheduleAttendee={handleRescheduleAttendee}
            />
        )}
        {isAcceptPaymentModalOpen && bookingToManage && (
            <AcceptPaymentModal
                isOpen={isAcceptPaymentModalOpen}
                onClose={closeAllModals}
                booking={bookingToManage}
                onDataChange={onDataChange}
            />
        )}
        {isEditModalOpen && bookingToManage && (
            <EditBookingModal
                booking={bookingToManage}
                onClose={closeAllModals}
                    onSave={handleSaveEditBooking}
            />
        )}
        {isRescheduleModalOpen && rescheduleInfo && (
            <RescheduleModal
                isOpen={isRescheduleModalOpen}
                onClose={closeAllModals}
                onSave={handleConfirmReschedule}
                slotInfo={rescheduleInfo}
                appData={appData}
            />
        )}
        {isInvoiceReminderOpen && (
            <InvoiceReminderModal
                isOpen={isInvoiceReminderOpen}
                onClose={closeAllModals}
                onProceed={handleProceedWithPayment}
                onGoToInvoicing={handleGoToInvoicing}
            />
        )}
        {isSearchPanelOpen && (
            <CustomerSearchResultsPanel 
                customer={searchCustomer}
                onClose={() => setIsSearchPanelOpen(false)}
                onNavigate={handleNavigateFromSearch}
            />
        )}

        <div className="flex justify-between items-center mb-6">
            <div>
                 <button onClick={onBackToMonth} className="text-brand-secondary hover:text-brand-accent mb-2 transition-colors font-semibold">
                    &larr; Volver al Mes
                </button>
                <h2 className="text-2xl font-serif text-brand-text">Vista Semanal</h2>
            </div>
            <div className="flex items-center gap-4">
                 <form onSubmit={handleSearch} className="relative">
                    <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar cliente, correo o código de reserva"
                        className="w-64 pl-4 pr-10 py-2 text-sm border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                    <button type="submit" className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-brand-primary">
                        <MagnifyingGlassIcon className="w-5 h-5" />
                    </button>
                </form>
                 <button 
                    onClick={handleDownloadPdf}
                    className="flex items-center justify-center gap-2 bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-4 rounded-lg hover:bg-brand-secondary hover:text-white transition-colors text-sm"
                >
                    <DocumentDownloadIcon className="w-4 h-4" />
                    Descargar PDF
                </button>
                 <button onClick={() => setCurrentDate(getWeekStartDate(new Date()))} className="text-sm font-bold bg-brand-background py-2 px-4 rounded-lg hover:bg-brand-primary/20 transition-colors">Hoy</button>
                <button onClick={handlePrevWeek} className="p-2 rounded-full hover:bg-gray-100">
                    &lt;
                </button>
                <div className="font-semibold text-brand-text text-center">
                    {weekStart.toLocaleDateString(language, { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <button onClick={handleNextWeek} className="p-2 rounded-full hover:bg-gray-100">
                    &gt;
                </button>
            </div>
        </div>

        {/* Banner: Pre-reservas sin fechas asignadas */}
        {(() => {
            const pendingBookingsWithoutSlots = appData.bookings.filter(b => 
                !b.isPaid && (!Array.isArray(b.slots) || b.slots.length === 0 || b.slots.every(s => !s.date || !s.time))
            );
            
            if (pendingBookingsWithoutSlots.length > 0) {
                return (
                    <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-md animate-fade-in">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                                <span className="text-2xl">⏳</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-amber-900 mb-1">
                                    Pre-reservas pendientes de asignar fechas ({pendingBookingsWithoutSlots.length})
                                </h3>
                                <p className="text-xs text-amber-800 mb-2">
                                    Las siguientes reservas aún no tienen fechas asignadas. Usa el panel de Clientes o Financiero para coordinar y asignar horarios.
                                </p>
                                <div className="space-y-1">
                                    {pendingBookingsWithoutSlots.slice(0, 3).map(b => (
                                        <div key={b.id} className="text-xs text-amber-900 bg-white bg-opacity-50 p-2 rounded flex items-center justify-between">
                                            <span>
                                                <strong>{b.bookingCode}</strong> · {b.userInfo.firstName} {b.userInfo.lastName} · {getBookingDisplayName(b)}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    const customer = dataService.generateCustomersFromBookings(appData.bookings).find(c => c.email === b.userInfo.email);
                                                    if (customer) {
                                                        setSearchCustomer(customer);
                                                        setIsSearchPanelOpen(true);
                                                    }
                                                }}
                                                className="text-amber-700 hover:text-amber-900 font-semibold underline"
                                            >
                                                Ver detalles →
                                            </button>
                                        </div>
                                    ))}
                                    {pendingBookingsWithoutSlots.length > 3 && (
                                        <p className="text-xs text-amber-700 italic">
                                            ... y {pendingBookingsWithoutSlots.length - 3} más. Ve a "Financiero → Pendientes" para ver todas.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }
            return null;
        })()}

        <div className="flex justify-end mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-brand-secondary">
                 <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${showUnpaidOnly ? 'bg-brand-primary' : 'bg-gray-200'}`}>
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${showUnpaidOnly ? 'translate-x-6' : 'translate-x-1'}`}/>
                </div>
                <input type="checkbox" checked={showUnpaidOnly} onChange={() => setShowUnpaidOnly(!showUnpaidOnly)} className="hidden" />
                Mostrar solo reservas no pagadas
            </label>
        </div>

        {/* --- DESKTOP VIEW --- */}
        <div className="hidden lg:block border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48">
                                Instructor
                            </th>
                            {weekDates.map(date => {
                                const isToday = formatDateToYYYYMMDD(date) === todayStr;
                                return (
                                <th key={date.toISOString()} scope="col" className={`px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-1/7 transition-colors ${isToday ? 'bg-brand-primary/10' : ''}`}>
                                    {date.toLocaleDateString(language, { weekday: 'short' })}
                                    <span className="block font-normal text-lg text-gray-900">{date.getDate()}</span>
                                </th>
                            )})}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                       {[...filteredScheduleData.values()].map(({ instructor, schedule }, instructorIndex) => (
                            <tr key={instructor.id} className="divide-x divide-gray-200">
                                <th scope="row" className="sticky left-0 bg-white px-4 py-3 text-left w-48 align-top">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-${colorMap[instructor.colorScheme]?.bg || colorMap[defaultColorName].bg} text-${colorMap[instructor.colorScheme]?.text || colorMap[defaultColorName].text}`}> 
                                            {instructor.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-brand-text">{instructor.name}</div>
                                        </div>
                                    </div>
                                </th>
                                {weekDates.map(date => {
                                    const dateStr = formatDateToYYYYMMDD(date);
                                    const isToday = dateStr === todayStr;
                                    const slots = schedule[dateStr] || [];
                                    return (
                                        <td key={dateStr} className={`px-2 py-2 align-top w-1/7 min-h-[100px] relative transition-colors ${isToday ? 'bg-brand-primary/5' : ''}`}>
                                            <div className="space-y-2">
                                                {slots.map((slot, slotIndex) => {
                                                    const totalParticipants = calculateTotalParticipants(slot.bookings);
                                                    const unpaidBookingsCount = slot.bookings.filter(b => !b.isPaid).length;
                                                    const hasUnpaidBookings = unpaidBookingsCount > 0;
                                                    const isHighlighted = bookingToHighlight && slot.bookings.some(b => b.id === bookingToHighlight.id);
                                                    const isGroupClass = slot.bookings.some(b => b.productType === 'GROUP_CLASS');
                                                    const hasPaidBooking = slot.bookings.some(b => b.isPaid);
                                                    const isEmptySlot = slot.bookings.length === 0;
                                                    const bgColor = isEmptySlot
                                                        ? 'bg-gray-50'
                                                        : isGroupClass
                                                        ? 'bg-blue-100'
                                                        : hasPaidBooking
                                                        ? 'bg-green-100'
                                                        : `bg-${colorMap[instructor.colorScheme]?.bg || colorMap[defaultColorName].bg}`;
                                                    const borderColor = isGroupClass ? 'border-blue-400' : `border-${colorMap[instructor.colorScheme]?.text || colorMap[defaultColorName].text}/50`;
                                                    const slotKey = `${slot.date}-${normalizeTime(slot.time)}-${slot.instructorId}-${slotIndex}`;
                                                    return (
                                                        <button 
                                                            key={slotKey} 
                                                            onClick={() => handleShiftClick(dateStr, slot)}
                                                            aria-label={hasUnpaidBookings ? 'Slot no pagado' : 'Slot'}
                                                            className={`w-full text-left p-2 rounded-md shadow-sm border-l-4 ${bgColor} ${borderColor} hover:shadow-md transition-shadow relative overflow-hidden ${isHighlighted ? 'animate-pulse-border' : ''}`}> 
                                                            {hasUnpaidBookings && <div className="absolute inset-0 unpaid-booking-stripe opacity-70"></div>}
                                                            <div className="relative z-10">
                                                                <div className={`font-bold text-xs text-${isGroupClass ? 'blue-800' : colorMap[instructor.colorScheme]?.text || colorMap[defaultColorName].text} flex items-center gap-1`}>
                                                                    {slot.time}
                                                                    {isGroupClass && <UserGroupIcon className="w-3.5 h-3.5" />}
                                                                </div>
                                                                <div className="text-xs font-semibold text-gray-800 mt-1 truncate">
                                                                    {getSlotDisplayName(slot)}
                                                                </div>
                                                                <div className="text-xs text-gray-600 mt-1">
                                                                    {totalParticipants}/{slot.capacity} booked
                                                                    {hasUnpaidBookings && <span className="font-bold text-brand-primary ml-1">({unpaidBookingsCount} sin pagar)</span>}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                       ))}
                    </tbody>
                </table>
                    {/* Mensaje si no hay slots visibles en el filtro */}
                    {/* {hasVisibleSlotsInFilter ? null : (
                        <div className="text-center py-10 text-brand-secondary">
                            {t('admin.weeklyView.noUnpaidFound')}
                        </div>
                    )} */}
            </div>
        </div>
        
        {/* --- MOBILE VIEW --- */}
        <div className="block lg:hidden">
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Days">
                    {weekDates.map((date, index) => {
                        const isSelected = index === selectedDayIndex;
                        return (
                            <button
                                key={date.toISOString()}
                                onClick={() => setSelectedDayIndex(index)}
                                className={`flex-shrink-0 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm text-center w-14 transition-colors duration-200 ${
                                isSelected
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <span className="block">{date.toLocaleDateString(language, { weekday: 'short' })}</span>
                                <span className="text-lg font-bold">{date.getDate()}</span>
                            </button>
                        )
                    })}
                </nav>
            </div>

            <div className="space-y-6">
                {[...filteredScheduleData.values()].map(({ instructor, schedule }) => {
                    const selectedDate = weekDates[selectedDayIndex];
                    const dateStr = formatDateToYYYYMMDD(selectedDate);
                    const slots = schedule[dateStr] || [];

                    if (slots.length === 0) return null;

                    return (
                        <div key={instructor.id}>
                            <InstructorTag instructorId={instructor.id} instructors={appData.instructors} />
                            <div className="space-y-2 mt-2 border-l-2 pl-4 ml-3 border-gray-200">
                                {slots.map((slot, slotIndex) => {
                                    const totalParticipants = calculateTotalParticipants(slot.bookings);
                                    const unpaidBookingsCount = slot.bookings.filter(b => !b.isPaid).length;
                                    const hasUnpaidBookings = unpaidBookingsCount > 0;
                                    const isHighlighted = bookingToHighlight && slot.bookings.some(b => b.id === bookingToHighlight.id);
                                    const isGroupClass = slot.bookings.some(b => b.productType === 'GROUP_CLASS');
                                    const hasPaidBooking = slot.bookings.some(b => b.isPaid);
                                    const bgColor = isGroupClass ? 'bg-blue-100' : hasPaidBooking ? 'bg-green-50' : 'bg-white';
                                    const borderColor = isGroupClass ? 'border-blue-400' : 'border-gray-200';
                                    const slotKey = `${slot.date}-${normalizeTime(slot.time)}-${slot.instructorId}-${slotIndex}`;
                                    return (
                                        <button
                                            key={slotKey}
                                            onClick={() => handleShiftClick(dateStr, slot)}
                                            aria-label={hasUnpaidBookings ? 'Slot no pagado' : 'Slot'}
                                            className={`w-full text-left p-3 rounded-lg shadow-sm ${bgColor} hover:shadow-md transition-shadow relative overflow-hidden border ${borderColor} ${isHighlighted ? 'animate-pulse-border' : ''}`}
                                        >
                                            {hasUnpaidBookings && <div className="absolute inset-0 unpaid-booking-stripe opacity-70"></div>}
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-bold text-sm text-brand-text flex items-center gap-1">{slot.time}
                                                        {isGroupClass && <UserGroupIcon className="w-3.5 h-3.5 text-blue-800" />}
                                                        </div>
                                                        <div className="text-xs font-semibold text-gray-600 mt-1 truncate">{getSlotDisplayName(slot)}</div>
                                                    </div>
                                                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${totalParticipants >= slot.capacity ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}> 
                                                        {totalParticipants}/{slot.capacity}
                                                    </div>
                                                </div>
                                                {hasUnpaidBookings && 
                                                    <div className="text-xs text-brand-primary font-bold mt-2">
                                                        {unpaidBookingsCount} sin pagar
                                                    </div>
                                                }
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {!hasVisibleSlotsInFilter && (
                    <div className="text-center py-10 text-brand-secondary">
                        No se encontraron reservas no pagadas.
                    </div>
                )}
                
                {![...filteredScheduleData.values()].some(({ schedule }) => (schedule[formatDateToYYYYMMDD(weekDates[selectedDayIndex])] || []).length > 0) && (
                  <div className="text-center py-10 text-brand-secondary">
                    No classes scheduled for this day.
                  </div>
                )}
            </div>
        </div>
      </div>
    );
};
