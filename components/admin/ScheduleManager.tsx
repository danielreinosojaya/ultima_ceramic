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
        'molding': 'Modelado a Mano'
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
    'OPEN_STUDIO': 'Estudio Abierto',
    'SPACE_RENTAL': 'Alquiler de espacio',
    'CUSTOM_GROUP_EXPERIENCE': 'Experiencia Grupal',
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

// Detecta el upsell de pintura post-clase (cliente pinta SU pieza ya hecha).
// Marcado explícitamente desde schedulePaintingBooking con product.kind.
const isPaintingUpsell = (booking: Booking): boolean => {
    const product = booking.product as any;
    return product?.kind === 'painting_upsell'
        || (booking.productType === 'CUSTOM_GROUP_EXPERIENCE'
            && booking.technique === 'painting'
            && (booking as any).productId === 'painting_service');
};

const PAINTING_UPSELL_LABEL = 'Upsell - pieza ya hecha';

// Helper para obtener el nombre display de un booking
const getBookingDisplayName = (booking: Booking): string => {
    // 0a. Upsell de pintura post-clase: etiqueta diferenciada
    if (isPaintingUpsell(booking)) {
        return PAINTING_UPSELL_LABEL;
    }

    // 0b. Alquiler / espacio privado exclusivo
    if (booking.productType === 'SPACE_RENTAL' || (booking.product as any)?.isExclusiveSpaceRental) {
        const hours = (booking.product as any)?.rentalHours || (booking.groupClassMetadata as any)?.rentalHours;
        return hours ? `Alquiler privado (${hours}h)` : 'Alquiler de espacio';
    }

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
  
    // 2. Prioridad: product.name (es la fuente más confiable, excepto nombre genérico ya manejado arriba)
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
// CRÍTICO: Para SINGLE_CLASS, SIEMPRE mostrar técnica, nunca "Clase Suelta"
const getSlotDisplayName = (slot: { product: Product; bookings: Booking[] }): string => {
  if (slot.bookings.length === 0) {
    // Slot vacío, usar producto del slot
    const productName = slot.product?.name;
    if (!productName || productName === 'Unknown Product' || productName === 'Unknown') {
      return 'Clase';
    }
    return productName;
  }

  // Slot 100% de upsells de pintura: etiqueta diferenciada
  if (slot.bookings.every(isPaintingUpsell)) {
    return PAINTING_UPSELL_LABEL;
  }

  // Alquiler / espacio privado
  if (slot.bookings.some((b) => b.productType === 'SPACE_RENTAL' || (b.product as any)?.isExclusiveSpaceRental)) {
    const rental = slot.bookings.find((b) => b.productType === 'SPACE_RENTAL' || (b.product as any)?.isExclusiveSpaceRental)!;
    return getBookingDisplayName(rental);
  }

  const firstBooking = slot.bookings[0];
  
  // CRÍTICO: Para SINGLE_CLASS, SIEMPRE mostrar técnica (nunca "Clase Suelta")
  if (firstBooking.productType === 'SINGLE_CLASS') {
    if (firstBooking.technique) {
      return getTechniqueName(firstBooking.technique);
    }
    // Fallback: derivar de product.name
    const productName = firstBooking.product?.name?.toLowerCase() || '';
    if (productName.includes('torno')) return 'Torno Alfarero';
    if (productName.includes('modelado')) return 'Modelado a Mano';
    if (productName.includes('pintura')) return 'Pintura de piezas';
    // Último fallback para SINGLE_CLASS sin identificador
    return 'Clase';
  }
  
  // Para experiencias personalizadas, usar técnica
  if ((firstBooking.productType === 'CUSTOM_GROUP_EXPERIENCE' || firstBooking.product?.name === 'Experiencia Grupal Personalizada') && firstBooking.technique) {
    return getTechniqueName(firstBooking.technique);
  }
  
  // Para otros tipos, priorizar product.name
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
import { getEcuadorToday, formatDateToYYYYMMDD as getEcuadorDateStr, slotDateKey } from '../../utils/formatters';
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
import { useAdminData } from '../../context/AdminDataContext';

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

type DayBookingRow = {
    booking: Booking;
    time: string;
    instructorId: number;
    slot: EnrichedSlot;
};

const collectBookingsForDay = (slots: EnrichedSlot[]): DayBookingRow[] => {
    const seen = new Set<string>();
    const rows: DayBookingRow[] = [];
    for (const slot of slots) {
        for (const booking of slot.bookings || []) {
            if (booking.status === 'expired' || booking.status === 'cancelled') continue;
            const key = `${booking.id}-${normalizeTime(slot.time)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            rows.push({
                booking,
                time: slot.time,
                instructorId: slot.instructorId,
                slot,
            });
        }
    }
    rows.sort((a, b) => {
        const byTime = normalizeTime(a.time).localeCompare(normalizeTime(b.time));
        if (byTime !== 0) return byTime;
        const nameA = `${a.booking.userInfo?.lastName || ''} ${a.booking.userInfo?.firstName || ''}`;
        const nameB = `${b.booking.userInfo?.lastName || ''} ${b.booking.userInfo?.firstName || ''}`;
        return nameA.localeCompare(nameB, 'es');
    });
    return rows;
};

const formatDateToYYYYMMDD = (d: Date): string => {
    if (isNaN(d.getTime())) return 'Invalid Date';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

const normalizeTechniqueForGrouping = (technique?: string): string => {
    if (!technique) return 'unknown';
    if (technique === 'molding' || technique === 'hand_modeling') return 'hand_modeling';
    if (technique === 'painting') return 'painting';
    if (technique === 'potters_wheel') return 'potters_wheel';
    return technique;
};

const deriveBookingTechniqueForSchedule = (booking: Booking): string => {
    const productName = booking.product?.name?.toLowerCase() || '';

    if (productName.includes('torno') || productName.includes('wheel') || productName.includes('potter')) {
        return 'potters_wheel';
    }
    if (productName.includes('modelado') || productName.includes('mano') || productName.includes('molding')) {
        return 'hand_modeling';
    }
    if (productName.includes('pintura') || productName.includes('painting')) {
        return 'painting';
    }

    if (booking.technique) {
        return normalizeTechniqueForGrouping(booking.technique);
    }

    if ('details' in booking.product && 'technique' in booking.product.details) {
        return normalizeTechniqueForGrouping(booking.product.details.technique);
    }

    return normalizeTechniqueForGrouping(getUnderlyingTechnique(booking));
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
    const adminData = useAdminData();
    const [currentDate, setCurrentDate] = useState(getWeekStartDate(initialDate));
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ date: string; time: string; attendees: any[]; instructorId: number; onClose?: () => void } | null>(null);
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

        // Precompute week date strings using LOCAL date methods (timezone-safe, no DST edge cases)
        const weekDateSet = new Set(dates.map(d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }));

        const { instructors, bookings, products, availability, scheduleOverrides, classCapacity } = appData;
        
        const scheduleMap: ScheduleData = new Map();
        instructors.forEach(i => scheduleMap.set(i.id, { instructor: i, schedule: {} }));

        const allSlots = new Map<string, EnrichedSlot>();

        // Step 1: Populate slots from all bookings for the current week.
        for (const booking of bookings) {
            const bookingSlots = Array.isArray(booking.slots) ? booking.slots : [];
            for (const slot of bookingSlots) {
                if (!slot.date || !slot.time) {
                    continue;
                }

                // Usar instructor del booking si existe, sino default
                const instructorId = slot.instructorId || 1;

                // Check if slot date falls within the current week (string-based, timezone-safe)
                // This avoids the DST/precision edge case where Sunday midnight === endOfWeek timestamp
                const dateStr = slotDateKey(slot.date);
                const inCurrentWeek = weekDateSet.has(dateStr);
                if (!inCurrentWeek) {
                    continue;
                }

                // Parse slot date for day-of-week capacity calculations
                const slotDate = new Date(dateStr + "T00:00:00");
                if (isNaN(slotDate.getTime())) {
                    continue;
                }
                    const normalizedTime = normalizeTime(slot.time);
                    
                    // CRÍTICO: Derivar técnica priorizando product.name (más confiable para históricos)
                    const bookingTechnique = deriveBookingTechniqueForSchedule(booking);
                    
                    // Agrupar slots por fecha + hora + técnica específica
                    const slotId = `${dateStr}-${normalizedTime}-${bookingTechnique}`;
                    
                    if (!allSlots.has(slotId)) {
                        let slotCapacity = 0;
                        let technique: Technique | undefined;
                        
                        // Determine technique from normalized derived technique
                        if (bookingTechnique === 'potters_wheel') {
                            technique = 'potters_wheel';
                        } else if (bookingTechnique === 'hand_modeling' || bookingTechnique === 'painting' || bookingTechnique === 'molding') {
                            technique = 'molding';
                        } else if (booking.productType === 'INTRODUCTORY_CLASS') {
                            technique = 'molding'; // Valor válido según type Technique
                        }
                        
                        // Determine capacity
                        const overrideForDate = scheduleOverrides[dateStr];
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

        // Step 2: Merge with default availability to show open slots.
        for (const date of dates) {
            const dateStr = formatDateToYYYYMMDD(date);
            const dayKey = DAY_NAMES[date.getDay()];
            const overrideForDate = scheduleOverrides[dateStr];
            const hasOverride = overrideForDate !== undefined;
            const slotsSource = hasOverride ? overrideForDate.slots : availability[dayKey];
            
            if (slotsSource) {
                slotsSource.forEach(s => {
                    // FIX: Incluir TÉCNICA en slotId para separar Torno de Modelado/Pintura
                    const slotId = `${dateStr}-${normalizeTime(s.time)}-${s.technique}`;
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

            // Solo intros activas (producto legacy suele estar isActive=false → no genera cupos fantasma)
            const introClassProducts = products.filter(p => p.type === 'INTRODUCTORY_CLASS' && p.isActive) as IntroductoryClass[];
            introClassProducts.forEach(p => {
                const introSessions = dataService.generateIntroClassSessions(p, { bookings: [] }, { includeFull: true });
                const sessionsForDay = introSessions.filter(s => s.date === dateStr);
                sessionsForDay.forEach(s => {
                    // CRÍTICO: Derivar técnica del producto intro class
                    const introTechnique = p.details.technique || 'molding';
                    // FIX: Incluir TÉCNICA en slotId para separar Torno de Modelado
                    const slotId = `${dateStr}-${normalizeTime(s.time)}-${introTechnique}`;
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
    
    const todayStr = useMemo(() => getEcuadorDateStr(getEcuadorToday()), []);
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
        if (!modalData) return;
        const slotToRemove = { date: modalData.date, time: modalData.time };
        try {
            const result = await dataService.removeBookingSlot(bookingId, slotToRemove);
            if (!result?.success) {
                alert(result?.error || 'No se pudo eliminar la reserva.');
                return;
            }
            if (result.deleted) {
                adminData.optimisticRemoveBooking(bookingId);
            } else {
                adminData.optimisticRemoveBookingSlot(bookingId, slotToRemove);
            }
            closeAllModals();
            onDataChange();
        } catch (e) {
            alert('Error al eliminar la reserva: ' + (e instanceof Error ? e.message : String(e)));
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
    generateWeeklySchedulePDF(weekDates, scheduleData, language, false);
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
            const firstSlotDate = new Date(slotDateKey(firstSlot.date) + 'T00:00:00');
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

    const bookingsByDate = useMemo(() => {
        const map: Record<string, DayBookingRow[]> = {};
        for (const date of weekDates) {
            const dateStr = formatDateToYYYYMMDD(date);
            const slotsForDay: EnrichedSlot[] = [];
            for (const { schedule } of scheduleData.values()) {
                slotsForDay.push(...(schedule[dateStr] || []));
            }
            map[dateStr] = collectBookingsForDay(slotsForDay);
        }
        return map;
    }, [weekDates, scheduleData]);

    const renderDayBookingCard = (dateStr: string, row: DayBookingRow) => {
        const { booking, time, instructorId, slot } = row;
        const instructor = appData.instructors.find(i => i.id === instructorId);
        const isHighlighted = bookingToHighlight?.id === booking.id;
        const isGroupClass = booking.productType === 'GROUP_CLASS' || booking.productType === 'CUSTOM_GROUP_EXPERIENCE';
        const isCorporate = Boolean(booking.corporateEventId);
        const participants = booking.participants ?? 1;
        const name = `${booking.userInfo?.firstName || ''} ${booking.userInfo?.lastName || ''}`.trim() || 'Sin nombre';
        const color = colorMap[instructor?.colorScheme || ''] || colorMap[defaultColorName];
        const bgColor = isCorporate ? 'bg-violet-100' : isGroupClass ? 'bg-blue-100' : booking.isPaid ? 'bg-green-100' : `bg-${color.bg}`;
        const borderColor = isCorporate ? 'border-violet-500' : isGroupClass ? 'border-blue-400' : `border-${color.text}/50`;
        const slotForClick: EnrichedSlot = { ...slot, time, bookings: [booking] };

        return (
            <button
                key={`${booking.id}-${normalizeTime(time)}`}
                type="button"
                onClick={() => handleShiftClick(dateStr, slotForClick)}
                aria-label={`${time} ${name}`}
                className={`w-full text-left p-2 rounded-md shadow-sm border-l-4 ${bgColor} ${borderColor} hover:shadow-md transition-shadow relative overflow-hidden ${isHighlighted ? 'animate-pulse-border' : ''}`}
            >
                {!booking.isPaid && <div className="absolute inset-0 unpaid-booking-stripe opacity-70"></div>}
                <div className="relative z-10">
                    <div className={`font-bold text-xs text-${isCorporate ? 'violet-900' : isGroupClass ? 'blue-800' : color.text} flex items-center gap-1 flex-wrap`}>
                        {time}
                        {isCorporate && (
                            <span className="text-[10px] font-bold uppercase bg-violet-200 text-violet-900 px-1 rounded">Corp</span>
                        )}
                        {isGroupClass && <UserGroupIcon className="w-3.5 h-3.5" />}
                    </div>
                    <div className="text-xs font-semibold text-gray-900 mt-0.5 truncate">{name}</div>
                    <div className="text-[11px] text-gray-600 mt-0.5 truncate">
                        {getBookingDisplayName(booking)}
                        {participants > 1 ? ` · ${participants} pers.` : ''}
                    </div>
                    {instructor && appData.instructors.length > 1 && (
                        <div className="text-[10px] text-gray-500 mt-0.5 truncate">{instructor.name}</div>
                    )}
                    {!booking.isPaid && (
                        <div className="text-[11px] font-bold text-brand-primary mt-0.5">sin pagar</div>
                    )}
                </div>
            </button>
        );
    };

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
                allBookings={appData.bookings}
                onClose={closeAllModals}
                onBookingUpdate={onDataChange}
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
                 <button onClick={() => setCurrentDate(getWeekStartDate(getEcuadorToday()))} className="text-sm font-bold bg-brand-background py-2 px-4 rounded-lg hover:bg-brand-primary/20 transition-colors">Hoy</button>
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

        {/* --- DESKTOP VIEW --- */}
        <div className="hidden lg:block border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {weekDates.map(date => {
                                const isToday = formatDateToYYYYMMDD(date) === todayStr;
                                const dateStr = formatDateToYYYYMMDD(date);
                                const count = (bookingsByDate[dateStr] || []).length;
                                return (
                                <th key={date.toISOString()} scope="col" className={`px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-1/7 transition-colors ${isToday ? 'bg-brand-primary/10' : ''}`}>
                                    {date.toLocaleDateString(language, { weekday: 'short' })}
                                    <span className="block font-normal text-lg text-gray-900">{date.getDate()}</span>
                                    <span className="block font-normal normal-case text-[11px] text-gray-500 mt-0.5">
                                        {count} {count === 1 ? 'reserva' : 'reservas'}
                                    </span>
                                </th>
                            )})}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                            <tr className="divide-x divide-gray-200">
                                {weekDates.map(date => {
                                    const dateStr = formatDateToYYYYMMDD(date);
                                    const isToday = dateStr === todayStr;
                                    const dayBookings = bookingsByDate[dateStr] || [];
                                    return (
                                        <td key={dateStr} className={`px-2 py-2 align-top w-1/7 min-h-[100px] relative transition-colors ${isToday ? 'bg-brand-primary/5' : ''}`}>
                                            <div className="space-y-2">
                                                {dayBookings.map(row => renderDayBookingCard(dateStr, row))}
                                                {dayBookings.length === 0 && (
                                                    <div className="text-[11px] text-gray-400 text-center py-4">Sin reservas</div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                    </tbody>
                </table>
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

            <div className="space-y-2">
                {(() => {
                    const selectedDate = weekDates[selectedDayIndex];
                    const dateStr = formatDateToYYYYMMDD(selectedDate);
                    const dayBookings = bookingsByDate[dateStr] || [];
                    if (dayBookings.length === 0) {
                        return (
                            <div className="text-center py-10 text-brand-secondary">
                                Sin reservas este día.
                            </div>
                        );
                    }
                    return dayBookings.map(row => renderDayBookingCard(dateStr, row));
                })()}
            </div>
        </div>
      </div>
    );
};
