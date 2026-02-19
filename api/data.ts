// Convierte claves snake_case a camelCase en objetos y arrays
function toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        // Handle Date objects specially
        if (obj instanceof Date) {
            return obj.toISOString(); // Return full ISO string with time
        }
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            let value = obj[key];
            // Convert Date objects to strings - preserve full timestamp for expires_at
            if (value instanceof Date) {
                value = value.toISOString();
            } else {
                value = toCamelCase(value);
            }
            acc[camelKey] = value;
            return acc;
        }, {} as any);
    }
    return obj;
}

import { sql } from '@vercel/postgres';
import { seedDatabase, ensureTablesExist, createCustomer } from './db.js';
import * as emailService from './emailService.js';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { generatePaymentId, generateGiftcardCode } from '../utils/formatters.js';
import { checkRateLimit } from './rateLimiter.js';
import type {
    Booking,
    ClientNotification,
    GroupInquiry,
    InvoiceRequest,
    Notification,
    AddBookingResult,
    AutomationSettings,
    BankDetails,
    TimeSlot,
    Delivery,
    DeliveryStatus,
    Customer
} from '../types';

// Función auxiliar para parsear fechas de forma segura
function safeParseDate(value: any): Date | null {
    if (value === null || value === undefined) {
        return null;
    }
    if (value instanceof Date) {
        return !isNaN(value.getTime()) ? value : null;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        if (value === '') return null;
        const date = new Date(value);
        return !isNaN(date.getTime()) ? date : null;
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
        return null;
    }
    return null;
}

const parseBookingFromDB = (dbRow: any): Booking => {
    if (!dbRow) return dbRow;
    
    try {
        const camelCased = toCamelCase(dbRow);
        
        // Parse userInfo from JSON string
        if (camelCased.userInfo && typeof camelCased.userInfo === 'string') {
            try {
                camelCased.userInfo = JSON.parse(camelCased.userInfo);
            } catch (e) {
                console.error('Error parsing userInfo JSON:', e);
                camelCased.userInfo = null;
            }
        }
        
        const productTypeFallbackNames: Record<string, string> = {
            SINGLE_CLASS: 'Clase Suelta',
            CLASS_PACKAGE: 'Paquete de Clases',
            INTRODUCTORY_CLASS: 'Clase Introductoria',
            GROUP_CLASS: 'Clase Grupal',
            COUPLES_EXPERIENCE: 'Experiencia de Parejas',
            OPEN_STUDIO: 'Estudio Abierto',
            CUSTOM_GROUP_EXPERIENCE: 'Experiencia Grupal Personalizada'
        };

        // ⚡ PHASE 5: `product` field omitted from SELECT for performance
        // Either NULL or missing - assign minimal fallback, never expect full object
        if (!camelCased.product) {
            // Usar productType para crear fallback mínimo
            const productType = camelCased.productType || 'SINGLE_CLASS';
            const fallbackName = dbRow.product_name || productTypeFallbackNames[productType] || productType.replace(/_/g, ' ');
            camelCased.product = {
                id: `${productType}-fallback`,
                type: productType,
                name: fallbackName,
                description: 'Product details available on demand',
                isActive: true,
                classes: 1,
                price: camelCased.price || 0,
                sortOrder: 0,
                details: {
                    duration: '1 hour',
                    durationHours: 1,
                    activities: ['Pottery activity'],
                    generalRecommendations: 'Class available',
                    materials: 'Clay and tools provided',
                    technique: productType.includes('WHEEL') ? 'potters_wheel' : 'molding'
                }
            };
        } else if (typeof camelCased.product === 'string') {
            // En caso de que sea string (no debería pasar con PHASE 5, pero por seguridad)
            try {
                camelCased.product = JSON.parse(camelCased.product);
            } catch (e) {
                console.error('Error parsing product JSON:', e);
                camelCased.product = null; // Fallback a null, será rellenado en línea anterior
            }
        }
        
        // Parse slots from JSON string
        if (camelCased.slots && typeof camelCased.slots === 'string') {
            try {
                camelCased.slots = JSON.parse(camelCased.slots);
            } catch (e) {
                console.error('Error parsing slots JSON:', e);
                camelCased.slots = [];
            }
        }
        
        // Parse groupClassMetadata from JSON string
        if (camelCased.groupClassMetadata && typeof camelCased.groupClassMetadata === 'string') {
            try {
                camelCased.groupClassMetadata = JSON.parse(camelCased.groupClassMetadata);
            } catch (e) {
                console.error('Error parsing groupClassMetadata JSON:', e);
                camelCased.groupClassMetadata = undefined;
            }
        }
        
        // Incluir client_note, participants y technique explícitamente
        camelCased.clientNote = dbRow.client_note || null;
        camelCased.participants = dbRow.participants !== undefined && dbRow.participants !== null 
            ? parseInt(dbRow.participants, 10) 
            : 1;
        camelCased.technique = dbRow.technique || undefined;
        
        if (camelCased.price && typeof camelCased.price === 'string') {
            camelCased.price = parseFloat(camelCased.price);
        }
        if (camelCased.product && camelCased.product.price && typeof camelCased.product.price === 'string') {
            camelCased.product.price = parseFloat(camelCased.product.price);
        }
        if (camelCased.product && camelCased.product.classes && typeof camelCased.product.classes === 'string') {
            camelCased.product.classes = parseInt(camelCased.product.classes, 10);
        }
        if (camelCased.product && camelCased.product.minParticipants && typeof camelCased.product.minParticipants === 'string') {
            camelCased.product.minParticipants = parseInt(camelCased.product.minParticipants, 10);
        }
        if (camelCased.product && camelCased.product.pricePerPerson && typeof camelCased.product.pricePerPerson === 'string') {
            camelCased.product.pricePerPerson = parseFloat(camelCased.product.pricePerPerson);
        }

        camelCased.createdAt = safeParseDate(camelCased.createdAt);
        camelCased.bookingDate = safeParseDate(camelCased.bookingDate)?.toISOString();
        camelCased.expiresAt = safeParseDate(camelCased.expiresAt); // Parse expires_at
        camelCased.status = dbRow.status || 'active'; // Default to 'active' if not set

        if (camelCased.paymentDetails) {
            try {
                // Intenta analizar paymentDetails si es una cadena, si no, úsalo directamente
                const payments = typeof camelCased.paymentDetails === 'string'
                    ? JSON.parse(camelCased.paymentDetails)
                    : camelCased.paymentDetails;
                
                if (Array.isArray(payments)) {
                    camelCased.paymentDetails = payments.map((p: any) => ({
                        ...p,
                        amount: typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount,
                        receivedAt: safeParseDate(p.receivedAt)?.toISOString() || p.receivedAt // Keep original if parsing fails
                    }));
                } else {
                    camelCased.paymentDetails = [];
                }
            } catch (e) {
                console.error('Error parsing paymentDetails JSON:', e);
                camelCased.paymentDetails = [];
            }
        } else {
            camelCased.paymentDetails = [];
        }

        // Map accepted_no_refund flag from DB to camelCase
        camelCased.acceptedNoRefund = dbRow.accepted_no_refund === true;

        // Ensure slots are not discarded if empty but valid
        if (!Array.isArray(camelCased.slots)) {
            camelCased.slots = [];
        }

        // Ensure paymentDetails are processed even if empty
        if (!camelCased.paymentDetails || !Array.isArray(camelCased.paymentDetails)) {
            camelCased.paymentDetails = [];
        }

        // Calculate isPaid and pendingBalance robustly
        const totalPaid = camelCased.paymentDetails.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        if (dbRow.is_paid !== undefined && dbRow.is_paid !== null) {
            camelCased.isPaid = Boolean(dbRow.is_paid);
        } else {
            camelCased.isPaid = totalPaid >= (camelCased.price || 0);
        }

        if (camelCased.isPaid && totalPaid === 0 && camelCased.paymentDetails.length === 0) {
            camelCased.pendingBalance = 0;
        } else {
            camelCased.pendingBalance = Math.max(0, (camelCased.price || 0) - totalPaid);
        }

        // Debug log for giftcard bookings
        const giftcardPayments = camelCased.paymentDetails.filter((p: any) => p.method === 'Giftcard');
        if (giftcardPayments.length > 0) {
            console.log('[parseBookingFromDB] Giftcard booking parsed:', {
                bookingCode: camelCased.bookingCode,
                isPaid: camelCased.isPaid,
                price: camelCased.price,
                totalPaid,
                giftcardRedeemedAmount: camelCased.giftcardRedeemedAmount,
                giftcardId: camelCased.giftcardId,
                paymentDetailsCount: camelCased.paymentDetails?.length || 0
            });
        }

        return camelCased as Booking;
    } catch (error) {
        console.error('Critical error in parseBookingFromDB:', error);
        // Fallback Booking válido si ocurre un error crítico
        return {
            id: 'unknown',
            productId: '',
            price: 0,
            createdAt: new Date(),
            product: {
                id: '0',
                type: 'SINGLE_CLASS',
                name: 'Unknown Product',
                description: 'Product data unavailable',
                isActive: false,
                classes: 1,
                price: 0,
                sortOrder: 0,
                details: {
                    duration: '1 hour',
                    durationHours: 1,
                    activities: ['General pottery activity'],
                    generalRecommendations: 'Basic pottery class',
                    materials: 'Clay and tools provided',
                    technique: 'potters_wheel'
                }
            },
            userInfo: {
                firstName: 'Unknown',
                lastName: 'Customer',
                email: 'unknown@email.com',
                phone: '',
                countryCode: '',
                birthday: null
            },
            slots: [],
            isPaid: false,
            bookingCode: 'UNKNOWN',
            bookingMode: 'flexible',
            productType: 'SINGLE_CLASS',
            paymentDetails: [],
            clientNote: undefined,
            participants: undefined,
            bookingDate: new Date().toISOString()
        };
    }
}

const parseNotificationFromDB = (dbRow: any): Notification => {
    if (!dbRow) return dbRow;
    const camelCased = toCamelCase(dbRow);
    const parsedDate = safeParseDate(camelCased.timestamp);
    camelCased.timestamp = parsedDate ? parsedDate.toISOString() : new Date().toISOString();
    return camelCased as Notification;
};

const parseClientNotificationFromDB = (dbRow: any): ClientNotification => {
    if (!dbRow) return dbRow;
    const camelCased = toCamelCase(dbRow);
    
    camelCased.createdAt = camelCased.createdAtIso || null;
    delete camelCased.createdAtIso;

    const scheduledAtDate = safeParseDate(camelCased.scheduledAt);
    camelCased.scheduledAt = scheduledAtDate ? scheduledAtDate.toISOString() : undefined;

    return camelCased as ClientNotification;
};

const parseGroupInquiryFromDB = (dbRow: any): GroupInquiry => {
    if (!dbRow) return dbRow;
    const camelCased = toCamelCase(dbRow);
    camelCased.createdAt = camelCased.createdAt || null;
    return camelCased as GroupInquiry;
}

const parseInvoiceRequestFromDB = (dbRow: any): InvoiceRequest => {
    if (!dbRow) return dbRow;
    const camelCased = toCamelCase(dbRow);
    camelCased.requestedAt = camelCased.requestedAtIso;
    delete camelCased.requestedAtIso;
    camelCased.processedAt = safeParseDate(camelCased.processedAt)?.toISOString();
    return camelCased as InvoiceRequest;
};


const generateBookingCode = (): string => {
    const prefix = 'C-ALMA';
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${timestamp}${randomPart}`;
};

// ============ FUNCIONES HELPER COMPARTIDAS PARA DISPONIBILIDAD ============
// Funciones reutilizables para getAvailableSlots, checkSlotAvailability y createCustomExperienceBooking
const parseSlotAvailabilitySettings = async () => {
    const settingsResult = await sql`SELECT * FROM settings WHERE key IN ('availability', 'scheduleOverrides', 'classCapacity', 'freeDateTimeOverrides')`;
    const availability: any = settingsResult.rows.find(s => s.key === 'availability')?.value || 
        { Sunday: [], Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };
    const scheduleOverrides: any = settingsResult.rows.find(s => s.key === 'scheduleOverrides')?.value || {};
    const freeDateTimeOverrides: any = settingsResult.rows.find(s => s.key === 'freeDateTimeOverrides')?.value || {};
    const classCapacity: any = settingsResult.rows.find(s => s.key === 'classCapacity')?.value || 
        { potters_wheel: 8, molding: 22, introductory_class: 8 };
    return { availability, scheduleOverrides, freeDateTimeOverrides, classCapacity };
};

const slotTechniqueKey = (tech: string) => {
    if (tech === 'hand_modeling' || tech === 'painting' || tech === 'molding') return 'molding';
    if (tech === 'potters_wheel') return 'potters_wheel';
    return tech;
};

const getMaxCapacityMap = (classCapacity: any): Record<string, number> => ({
    'potters_wheel': classCapacity.potters_wheel || 8,
    'hand_modeling': classCapacity.molding || 22,
    'painting': classCapacity.molding || 22,
    'molding': classCapacity.molding || 22
});

const getMaxCapacityForTechnique = (tech: string, maxCapacityMap: Record<string, number>) => {
    const key = slotTechniqueKey(tech);
    const cap = maxCapacityMap[tech] ?? maxCapacityMap[key];
    return Number.isFinite(cap) ? (cap as number) : 22;
};

const resolveCapacity = (dateStr: string, tech: string, maxCapacityMap: Record<string, number>, scheduleOverrides: any) => {
    const override = scheduleOverrides[dateStr];
    const overrideCap = override?.capacity;
    if (typeof overrideCap === 'number' && overrideCap > 0) return overrideCap;
    return getMaxCapacityForTechnique(tech, maxCapacityMap);
};

const normalizeTime = (t: string): string => {
    if (!t) return '';
    if (/^\d{2}:\d{2}$/.test(t)) return t;
    const match = t.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    return t;
};

const timeToMinutes = (timeStr: string): number => {
    const [hours, mins] = timeStr.split(':').map(Number);
    return hours * 60 + mins;
};

const hasTimeOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
    return start1 < end2 && start2 < end1;
};

const normalizeDateValue = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value.split('T')[0];
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().split('T')[0];
    return String(value).split('T')[0];
};

const loadCourseSessionsByDate = async (startDateStr: string, endDateStr: string) => {
    const { rows } = await sql`
        SELECT cs.scheduled_date, cs.start_time, cs.end_time
        FROM course_sessions cs
        JOIN course_schedules sched ON sched.id = cs.course_schedule_id
        WHERE cs.status != 'cancelled'
        AND sched.is_active = true
        AND cs.scheduled_date BETWEEN ${startDateStr} AND ${endDateStr}
    `;

    const sessionsByDate: Record<string, { startMinutes: number; endMinutes: number }[]> = {};

    rows.forEach(row => {
        const dateStr = normalizeDateValue(row.scheduled_date);
        const startMinutes = timeToMinutes(normalizeTime(String(row.start_time)));
        const endMinutes = timeToMinutes(normalizeTime(String(row.end_time)));

        if (!dateStr || !Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) return;

        if (!sessionsByDate[dateStr]) {
            sessionsByDate[dateStr] = [];
        }

        sessionsByDate[dateStr].push({ startMinutes, endMinutes });
    });

    return sessionsByDate;
};

const hasCourseOverlap = (
    dateStr: string,
    startMinutes: number,
    endMinutes: number,
    sessionsByDate: Record<string, { startMinutes: number; endMinutes: number }[]>
): boolean => {
    const sessions = sessionsByDate[dateStr] || [];
    return sessions.some(session => hasTimeOverlap(startMinutes, endMinutes, session.startMinutes, session.endMinutes));
};

const deriveBookingTechnique = (booking: any): string | undefined => {
    const productName = (booking.product?.name || '').toLowerCase();

    if (productName.includes('pintura') || productName.includes('painting')) return 'painting';
    if (productName.includes('torno') || productName.includes('wheel') || productName.includes('potter')) return 'potters_wheel';
    if (productName.includes('modelado') || productName.includes('molding') || productName.includes('hand')) return 'hand_modeling';

    // Check technique field directly on booking
    if (booking.technique === 'potters_wheel') return 'potters_wheel';
    if (booking.technique === 'molding' || booking.technique === 'hand_modeling') return 'hand_modeling';
    if (booking.technique === 'painting') return 'painting';

    // Check product.details.technique
    const detailsTechnique = booking.product?.details?.technique;
    if (detailsTechnique === 'potters_wheel') return 'potters_wheel';
    if (detailsTechnique === 'molding' || detailsTechnique === 'hand_modeling') return 'hand_modeling';
    if (detailsTechnique === 'painting') return 'painting';

    // Check product type for introductory classes (usually potters_wheel)
    const productType = booking.productType || booking.product?.type;
    if (productType === 'INTRODUCTORY_CLASS') return 'potters_wheel';
    if (productType === 'WHEEL_COURSE') return 'potters_wheel';

    return undefined;
};

const isHandWorkTechnique = (tech?: string) =>
    tech === 'molding' || tech === 'painting' || tech === 'hand_modeling';

const getGroupClassBookingCounts = (booking: any) => {
    let potters = 0;
    let handWork = 0;

    if (booking.productType === 'GROUP_CLASS' && booking.groupClassMetadata?.techniqueAssignments?.length) {
        booking.groupClassMetadata.techniqueAssignments.forEach((assignment: any) => {
            if (assignment.technique === 'potters_wheel') {
                potters += 1;
            } else {
                handWork += 1;
            }
        });
        return { potters, handWork };
    }

    const bookingTechnique = deriveBookingTechnique(booking);
    const participantCount = booking.participants
        ?? booking.groupClassMetadata?.totalParticipants
        ?? (typeof booking.product === 'object' && 'minParticipants' in booking.product
            ? (booking.product as any).minParticipants
            : undefined)
        ?? 1;

    if (bookingTechnique === 'potters_wheel') {
        potters = participantCount;
    } else if (bookingTechnique === 'painting' || bookingTechnique === 'hand_modeling' || bookingTechnique === 'molding') {
        handWork = participantCount;
    } else {
        // Unknown technique - count as BOTH to be safe (conservative approach)
        potters = participantCount;
        handWork = participantCount;
    }

    return { potters, handWork };
};

const getFixedSlotTimesForDate = (
    dateStr: string,
    dayKey: string,
    availability: any,
    scheduleOverrides: any,
    techniqueKey: 'potters_wheel' | 'molding'
): string[] => {
    const override = scheduleOverrides[dateStr];
    if (override && override.slots === null) return [];

    const baseSlots = override?.slots ?? availability[dayKey] ?? [];
    const times: string[] = baseSlots
        .filter((slot: any) => slot.technique === techniqueKey)
        .map((slot: any) => normalizeTime(slot.time));

    if (techniqueKey === 'potters_wheel') {
        if (dayKey === 'Tuesday') times.push('19:00');
        if (dayKey === 'Wednesday') times.push('11:00');
    }

    return Array.from(new Set(times)).sort();
};

const isPottersFixedConflict = (candidateStart: number, fixedTimes: number[]) => {
    // Si coincide exactamente con un inicio fijo, SIEMPRE permitir
    if (fixedTimes.includes(candidateStart)) return false;

    // Bloquear únicamente horarios intermedios que inician DURANTE una clase fija (2h)
    return fixedTimes.some(fixedStart => candidateStart > fixedStart && candidateStart < fixedStart + 120);
};

const getBusinessHoursForDay = (dayOfWeek: number): string[] => {
    const hours: string[] = [];

    if (dayOfWeek === 1) return hours; // Lunes cerrado

    // Sábado: 9:00-18:00 (último start 18:00, NO 18:30)
    if (dayOfWeek === 6) {
        for (let hour = 9; hour <= 18; hour++) {
            const mins = hour === 18 ? ['00'] : ['00', '30'];
            for (const min of mins) {
                hours.push(`${String(hour).padStart(2, '0')}:${min}`);
            }
        }
        return hours;
    }

    // Domingo: 10:00-16:00 (último start 16:00, NO 16:30)
    if (dayOfWeek === 0) {
        for (let hour = 10; hour <= 16; hour++) {
            const mins = hour === 16 ? ['00'] : ['00', '30'];
            for (const min of mins) {
                hours.push(`${String(hour).padStart(2, '0')}:${min}`);
            }
        }
        return hours;
    }

    // Martes-Viernes: 10:00-19:00 (último start 19:00, NO 19:30)
    for (let hour = 10; hour <= 19; hour++) {
        const mins = hour === 19 ? ['00'] : ['00', '30'];
        for (const min of mins) {
            hours.push(`${String(hour).padStart(2, '0')}:${min}`);
        }
    }

    return hours;
};

const computeSlotAvailability = async (
    requestedDate: string,
    requestedTime: string,
    requestedTechnique: string,
    requestedParticipants: number
) => {
    // ✅ OPTIMIZATION PHASE 2: Buscar bookings que TENGAN SLOTS en la fecha solicitada
    // Con LIMIT 1000 para evitar saturación (traer todos los bookings es ineficiente)
    // Filtramos en memoria: solo bookings que tengan slots en la fecha solicitada
    const bookingsResult = await sql`
        SELECT * FROM bookings 
        WHERE status != 'expired'
        ORDER BY created_at DESC
        LIMIT 1000
    `;

    // Filtrar en memoria: solo bookings que tengan slots en la fecha solicitada
    const allBookings = bookingsResult.rows.map(parseBookingFromDB);
    const bookings = allBookings.filter(booking => {
        if (!booking.slots || !Array.isArray(booking.slots)) return false;
        return booking.slots.some((s: any) => s.date === requestedDate);
    });

    const { scheduleOverrides, classCapacity, freeDateTimeOverrides } = await parseSlotAvailabilitySettings();
    const maxCapacityMap = getMaxCapacityMap(classCapacity);
    const isSpecialDayNoRules = scheduleOverrides?.[requestedDate]?.disableRules === true;

    const normalizedTime = normalizeTime(requestedTime);
    const requestedStartMinutes = timeToMinutes(normalizedTime);
    const requestedEndMinutes = requestedStartMinutes + (2 * 60); // 2 horas

    const requestedDayOfWeek = new Date(`${requestedDate}T00:00:00`).getDay();
    if (!isSpecialDayNoRules && requestedTechnique === 'painting' && requestedDayOfWeek === 1) {
        const maxCapacity = resolveCapacity(requestedDate, requestedTechnique, maxCapacityMap, scheduleOverrides);
        return {
            available: false,
            normalizedTime,
            capacity: {
                max: maxCapacity,
                booked: maxCapacity,
                available: 0
            },
            bookingsCount: 0,
            message: 'Pintura no está disponible los lunes'
        };
    }

    const disabledTimes = freeDateTimeOverrides?.[requestedDate]?.disabledTimes || [];
    if (!isSpecialDayNoRules && disabledTimes.includes(normalizedTime)) {
        const maxCapacity = resolveCapacity(requestedDate, requestedTechnique, maxCapacityMap, scheduleOverrides);
        return {
            available: false,
            normalizedTime,
            capacity: {
                max: maxCapacity,
                booked: maxCapacity,
                available: 0
            },
            bookingsCount: 0,
            message: 'Horario no disponible por evento'
        };
    }

    const courseSessionsByDate = await loadCourseSessionsByDate(requestedDate, requestedDate);
    if (hasCourseOverlap(requestedDate, requestedStartMinutes, requestedEndMinutes, courseSessionsByDate)) {
        const maxCapacity = resolveCapacity(requestedDate, requestedTechnique, maxCapacityMap, scheduleOverrides);
        return {
            available: false,
            normalizedTime,
            capacity: {
                max: maxCapacity,
                booked: maxCapacity,
                available: 0
            },
            bookingsCount: 0,
            message: 'Horario no disponible por curso'
        };
    }

    let exactMatchParticipants = 0;
    let overlappingParticipants = 0;
    const bookingsInSlot: any[] = [];

    for (const booking of bookings) {
        if (!booking.slots || !Array.isArray(booking.slots)) continue;

        let bookingTechnique: string | undefined;
        const productName = booking.product?.name?.toLowerCase() || '';

        if (productName.includes('pintura')) {
            bookingTechnique = 'painting';
        } else if (productName.includes('torno')) {
            bookingTechnique = 'potters_wheel';
        } else if (productName.includes('modelado')) {
            bookingTechnique = 'hand_modeling';
        } else {
            bookingTechnique = booking.technique || (booking.product?.details as any)?.technique;
        }

        const isHandWork = (tech: string | undefined) => 
            tech === 'molding' || tech === 'painting' || tech === 'hand_modeling';
        const isHandWorkGroup = isHandWork(requestedTechnique);
        const isBookingHandWorkGroup = isHandWork(bookingTechnique);

        let techniquesMatch = false;
        if (isHandWorkGroup && isBookingHandWorkGroup) {
            techniquesMatch = true;
        } else if (isHandWorkGroup && !bookingTechnique) {
            techniquesMatch = true;
        } else if (!isHandWorkGroup && bookingTechnique === requestedTechnique) {
            techniquesMatch = true;
        } else if (!isHandWorkGroup && !bookingTechnique) {
            techniquesMatch = true;
        }

        if (!techniquesMatch) {
            continue;
        }

        const overlapInfo = booking.slots.find((s: any) => {
            if (s.date !== requestedDate) return false;

            const bookingStartMinutes = timeToMinutes(normalizeTime(s.time));
            const bookingEndMinutes = bookingStartMinutes + (2 * 60);

            const hasOverlap = hasTimeOverlap(requestedStartMinutes, requestedEndMinutes, bookingStartMinutes, bookingEndMinutes);
            const isSameExactTime = bookingStartMinutes === requestedStartMinutes && 
                                   bookingEndMinutes === requestedEndMinutes;

            if (hasOverlap) {
                const participantCount = booking.participants || 1;
                overlappingParticipants += participantCount;

                if (isSameExactTime) {
                    exactMatchParticipants += participantCount;
                }
            }

            return isSameExactTime;
        });

        if (overlapInfo) {
            const participantCount = booking.participants || 1;
            bookingsInSlot.push({
                id: booking.id,
                participants: participantCount,
                userInfo: { 
                    name: booking.userInfo?.firstName 
                        ? `${booking.userInfo.firstName} ${booking.userInfo.lastName || ''}`.trim()
                        : 'Unknown'
                },
                isPaid: booking.isPaid,
                bookingTechnique: bookingTechnique || 'unknown',
                requestedTechnique: requestedTechnique
            });
        }
    }

    // Check for fixed class conflicts (potters_wheel only)
    const { availability } = await parseSlotAvailabilitySettings();
    const dayKey = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${requestedDate}T00:00:00`).getDay()];
    
    if (!isSpecialDayNoRules && requestedTechnique === 'potters_wheel') {
        const fixedPottersTimes = getFixedSlotTimesForDate(requestedDate, dayKey, availability, scheduleOverrides, 'potters_wheel');
        const fixedPottersMinutes = fixedPottersTimes.map(timeToMinutes);
        
        // Check if requested slot conflicts with fixed class times (±120 min window)
        if (isPottersFixedConflict(requestedStartMinutes, fixedPottersMinutes)) {
            const maxCapacity = resolveCapacity(requestedDate, requestedTechnique, maxCapacityMap, scheduleOverrides);
            return {
                available: false,
                normalizedTime,
                capacity: {
                    max: maxCapacity,
                    booked: maxCapacity,
                    available: 0
                },
                bookingsCount: 0,
                message: 'Horario no disponible por clase fija de torno'
            };
        }
    }

    const maxCapacity = resolveCapacity(requestedDate, requestedTechnique, maxCapacityMap, scheduleOverrides);
    const availableCapacity = maxCapacity - overlappingParticipants;
    const canBook = availableCapacity >= requestedParticipants;

    const openedByLargeGroup = bookingsInSlot.some(b => (b?.participants || 0) >= 3);

    return {
        available: canBook,
        normalizedTime,
        openedByLargeGroup,
        capacity: {
            max: maxCapacity,
            booked: exactMatchParticipants,
            available: availableCapacity
        },
        bookingsCount: bookingsInSlot.length,
        message: canBook 
            ? `¡Disponible! ${availableCapacity} cupos libres` 
            : `Solo hay ${availableCapacity} cupos disponibles, necesitas ${requestedParticipants}`
    };
};
// ============ FIN FUNCIONES HELPER ============

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Validate database connection early - check multiple possible env var names
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
    if (!dbUrl) {
        console.error('Database connection error: No database URL found in environment variables');
        console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('POSTGRES') || key.includes('DATABASE')));
        return res.status(500).json({ 
            error: 'Database configuration error', 
            details: 'Database URL environment variable is required (POSTGRES_URL, DATABASE_URL, or POSTGRES_PRISMA_URL)' 
        });
    }

    console.log('Using database URL:', dbUrl.substring(0, 30) + '...');

    // ✅ OPTIMIZATION PHASE 1: Removed ensureTablesExist() and SELECT 1 ping
    // Tables are pre-initialized during first deployment and persist thereafter
    // No need for DDL on every request (saves network + CU-hours)
    // Database connectivity is guaranteed by Vercel connection pooling
    console.log('✅ Database ready. Tables pre-initialized from previous deployments.');

    try {
        if (req.method === 'GET') {
            await handleGet(req, res);
        } else if (req.method === 'POST') {
            await handlePost(req, res);
        } else if (req.method === 'DELETE') {
            await handleDelete(req, res);
        } else {
            res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        console.error('API Error:', error);
        const errorMessage = (error instanceof Error) ? error.message : 'An internal server error occurred.';
        res.status(500).json({ error: errorMessage });
    }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
    const { key, action } = req.query;

    if (action === 'ping') {
        const info = {
            ok: true,
            method: req.method,
            query: req.query || null,
            bodyPresent: !!req.body,
            body: typeof req.body === 'object' ? req.body : String(req.body || null),
            ts: new Date().toISOString()
        };
        console.log('[ping] received', info.method, info.query);
        return res.status(200).json(info);
    }


    // � FIX CAPACITY: Resetear classCapacity a valores correctos
    if (action === 'fixClassCapacity') {
        console.log('🔧 [FIX] Reseteando classCapacity a valores correctos...');
        try {
            const correctCapacity = {
                potters_wheel: 8,
                molding: 22,
                introductory_class: 8
            };
            
            await sql`
                INSERT INTO settings (key, value) 
                VALUES ('classCapacity', ${JSON.stringify(correctCapacity)})
                ON CONFLICT (key) 
                DO UPDATE SET value = EXCLUDED.value
            `;
            
            console.log('✅ classCapacity actualizado:', correctCapacity);
            
            return res.status(200).json({
                success: true,
                message: 'classCapacity actualizado correctamente',
                classCapacity: correctCapacity
            });
        } catch (error) {
            console.error('❌ [FIX] Error:', error);
            return res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    // �🚨 MIGRATION ENDPOINT: Forzar creación de columnas
    if (action === 'migrateGiftcardColumns') {
        console.log('🔧 [MIGRATION] Iniciando migración de columnas giftcard_requests...');
        try {
            // Crear tabla base si no existe
            await sql`
                CREATE TABLE IF NOT EXISTS giftcard_requests (
                    id SERIAL PRIMARY KEY,
                    buyer_name VARCHAR(100) NOT NULL,
                    buyer_email VARCHAR(100) NOT NULL,
                    recipient_name VARCHAR(100) NOT NULL,
                    recipient_email VARCHAR(100),
                    recipient_whatsapp VARCHAR(30),
                    amount NUMERIC NOT NULL,
                    code VARCHAR(32) NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `;
            console.log('✅ Tabla base verificada');
            
            // Agregar columnas con try/catch individual
            let sendMethodResult = 'unknown';
            try {
                await sql`ALTER TABLE giftcard_requests ADD COLUMN send_method VARCHAR(20)`;
                sendMethodResult = 'created';
                console.log('✅ Columna send_method CREADA');
            } catch (e: any) {
                if (e.message?.includes('already exists') || e.message?.includes('duplicate column')) {
                    sendMethodResult = 'already_exists';
                    console.log('ℹ️ Columna send_method ya existe');
                } else {
                    sendMethodResult = `error: ${e.message}`;
                    console.error('❌ Error creando send_method:', e.message);
                }
            }
            
            let scheduledResult = 'unknown';
            try {
                await sql`ALTER TABLE giftcard_requests ADD COLUMN scheduled_send_at TIMESTAMP`;
                scheduledResult = 'created';
                console.log('✅ Columna scheduled_send_at CREADA');
            } catch (e: any) {
                if (e.message?.includes('already exists') || e.message?.includes('duplicate column')) {
                    scheduledResult = 'already_exists';
                    console.log('ℹ️ Columna scheduled_send_at ya existe');
                } else {
                    scheduledResult = `error: ${e.message}`;
                    console.error('❌ Error creando scheduled_send_at:', e.message);
                }
            }
            
            // Verificar columnas finales
            const { rows } = await sql`SELECT * FROM giftcard_requests LIMIT 1`;
            const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
            
            return res.status(200).json({
                success: true,
                migration: {
                    send_method: sendMethodResult,
                    scheduled_send_at: scheduledResult,
                    available_columns: columns
                }
            });
        } catch (error) {
            console.error('❌ [MIGRATION] Error fatal:', error);
            return res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    let data;
    if (action) {
        switch (action) {
            case 'listGiftcardRequests': {
                // Devuelve todas las solicitudes de giftcard
                try {
                    // ✅ OPTIMIZATION: Removed CREATE TABLE from GET (DDL in production is redundant)
                    // Table created once during initial deployment
                    const { rows } = await sql`SELECT * FROM giftcard_requests ORDER BY created_at DESC`;
                    // Formatear a camelCase y parsear tipos
                    const formatted = rows.map(row => ({
                        id: String(row.id),
                        buyerName: row.buyer_name,
                        buyerEmail: row.buyer_email,
                        recipientName: row.recipient_name,
                        recipientEmail: row.recipient_email || '',
                        recipientWhatsapp: row.recipient_whatsapp || '',
                        amount: typeof row.amount === 'number' ? row.amount : parseFloat(row.amount),
                        code: row.code,
                        status: row.status,
                        createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
                        sendMethod: row.send_method || null,
                        scheduledSendAt: row.scheduled_send_at ? new Date(row.scheduled_send_at).toISOString() : null,
                        // Include metadata so admin UI can surface issued codes, voucher URLs, etc.
                        metadata: row.metadata || null
                    }));
                    data = formatted;
                    // ✅ OPTIMIZACIÓN: Cache CDN 5 minutos (datos dinámicos)
                    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
                } catch (error) {
                    console.error('Error al listar giftcards:', error);
                    data = [];
                }
                break;
            }
            case 'listGiftcards': {
                // Devuelve todas las giftcards emitidas (para el panel admin)
                try {
                    console.debug('[API] listGiftcards called - fetching issued giftcards');
                    // ✅ OPTIMIZATION: Removed CREATE TABLE from GET (DDL in production is redundant)
                    // Table created once during initial deployment
                    const { rows } = await sql`SELECT * FROM giftcards ORDER BY created_at DESC`;
                    const formattedG = rows.map(r => ({
                        id: String(r.id),
                        code: r.code,
                        initialValue: typeof r.initial_value === 'number' ? r.initial_value : (r.initial_value ? parseFloat(r.initial_value) : null),
                        balance: typeof r.balance === 'number' ? r.balance : (r.balance ? parseFloat(r.balance) : 0),
                        giftcardRequestId: r.giftcard_request_id || null,
                        expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
                        metadata: r.metadata || null,
                        createdAt: r.created_at ? new Date(r.created_at).toISOString() : null
                    }));
                    console.debug('[API] listGiftcards fetched rows:', rows.length);
                    data = formattedG;
                    // ✅ OPTIMIZACIÓN: Cache CDN 5 minutos (datos dinámicos)
                    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
                } catch (err) {
                    console.error('Error listing giftcards:', err);
                    data = [];
                }
                break;
            }
            case 'inquiries': {
                const { rows: inquiries } = await sql`
                    SELECT
                        id, name, email, phone, country_code, participants,
                        TO_CHAR(tentative_date, 'YYYY-MM-DD') as tentative_date,
                        tentative_time, event_type, message, status,
                        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
                        inquiry_type
                    FROM inquiries ORDER by created_at DESC
                `;
                data = inquiries.map(parseGroupInquiryFromDB);
                break;
            }
            case 'notifications': {
                // ⚡ FIX #6: LIMIT 1000 para evitar cargar toda la tabla de notificaciones históricas
                // Reduce de cargar 10000+ registros a 1000 (típicamente ~30-40% reduction en payload)
                const { rows: notifications } = await sql`
                    SELECT * FROM notifications 
                    ORDER BY timestamp DESC 
                    LIMIT 1000
                `;
                data = notifications.map(parseNotificationFromDB);
                break;
            }
            case 'clientNotifications': {
                const { rows: clientNotifications } = await sql`
                    SELECT
                        *,
                        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at_iso
                    FROM client_notifications ORDER BY created_at DESC
                `;
                data = clientNotifications.map(parseClientNotificationFromDB);
                break;
            }
            case 'invoiceRequests': {
                const { rows: invoiceRequests } = await sql`
                    SELECT
                        i.*,
                        to_char(i.requested_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as requested_at_iso,
                        b.booking_code,
                        b.user_info
                    FROM invoice_requests i
                    JOIN bookings b ON i.booking_id = b.id
                    ORDER BY i.requested_at DESC
                `;
                data = invoiceRequests.map(parseInvoiceRequestFromDB);
                break;
            }
                case 'instructors': {
                    const { rows: instructors } = await sql`SELECT * FROM instructors ORDER BY name ASC`;
                    data = instructors.map(toCamelCase);
                    // ✅ OPTIMIZACIÓN: Cache CDN 1 hora (datos muy estables)
                    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
                    break;
                }
                case 'deliveries': {
                    // ⚡ OPTIMIZACIÓN: Excluir fotos por defecto (muy pesadas - base64)
                    // Las fotos se cargan bajo demanda con getDeliveryPhotos
                    const includePhotos = req.query.includePhotos === 'true';
                    // ⚡ FIX #9: Reduce default limit from 2000 to 500 (safe default for UI pagination)
                    const limit = req.query.limit ? parseInt(req.query.limit as string) : 500;
                    
                    if (includePhotos) {
                        // Carga completa (solo cuando explícitamente se pide)
                        const { rows: deliveries } = await sql`
                            SELECT * FROM deliveries 
                            ORDER BY scheduled_date ASC, created_at DESC 
                            LIMIT ${limit}
                        `;
                        data = deliveries.map(toCamelCase);
                    } else {
                        // Carga ligera: excluir columna photos pero INCLUIR campos de pintura
                        const { rows: deliveries } = await sql`
                            SELECT id, customer_email, description, scheduled_date, status, 
                                   created_at, completed_at, delivered_at, ready_at, notes,
                                   wants_painting, painting_price, painting_status, 
                                   painting_booking_date, painting_paid_at, painting_completed_at,
                                   CASE WHEN photos IS NOT NULL AND photos != '[]' AND photos != 'null' 
                                        THEN true ELSE false END as has_photos
                            FROM deliveries 
                            ORDER BY scheduled_date ASC, created_at DESC 
                            LIMIT ${limit}
                        `;
                        data = deliveries.map((d: any) => ({
                            ...toCamelCase(d),
                            photos: [] // Array vacío, se cargan bajo demanda
                        }));
                    }
                    // ⚡ Cache 30 segundos para listado de deliveries
                    res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
                    break;
                }
                case 'getDeliveryPhotos': {
                    // ⚡ Endpoint para cargar fotos de una delivery específica
                    const deliveryId = req.query.deliveryId as string;
                    if (!deliveryId) {
                        return res.status(400).json({ error: 'deliveryId required' });
                    }
                    const { rows } = await sql`
                        SELECT photos FROM deliveries WHERE id = ${deliveryId}
                    `;
                    if (rows.length === 0) {
                        return res.status(404).json({ error: 'Delivery not found' });
                    }
                    // ⚡ Cache 5 minutos para fotos (raramente cambian)
                    res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
                    data = { photos: rows[0].photos || [] };
                    break;
                }
                case 'standaloneCustomers': {
                    // ⚡ FIX #7: LIMIT 500 para limitar resultado a primeros 500 clientes
                    // Reduce payload al limitar rowset, no mediante partial SELECT
                    const { rows: customers } = await sql`
                        SELECT * FROM customers 
                        ORDER BY first_name ASC, last_name ASC 
                        LIMIT 500
                    `;
                    data = customers.map(toCamelCase);
                    break;
                }
                case 'getStandaloneCustomers': {
                    // Get all customers from customers table (standalone customers without necessarily having bookings)
                    // ⚡ FIX #8: Apply LIMIT 500 to prevent loading all customers
                    const { rows: standaloneCustomers } = await sql`
                        SELECT * FROM customers 
                        ORDER BY first_name ASC, last_name ASC 
                        LIMIT 500
                    `;
                    
                    // Convert to Customer format
                    const formattedCustomers = standaloneCustomers.map(customer => ({
                        email: customer.email,
                        userInfo: {
                            firstName: customer.first_name || '',
                            lastName: customer.last_name || '',
                            email: customer.email,
                            phone: customer.phone || '',
                            countryCode: customer.country_code || '',
                            birthday: customer.birthday || null
                        },
                        bookings: [], // Start with empty bookings, will be populated if needed
                        totalBookings: 0,
                        totalSpent: 0,
                        lastBookingDate: new Date(0) // Default old date
                    }));
                    
                    data = formattedCustomers;
                    break;
                }
                case 'getCustomers': {
                    // ⚡ OPTIMIZACIÓN: Usar pagination y caché agresivo
                    const page = req.query.page ? parseInt(req.query.page as string) : 1;
                    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
                    const offset = (page - 1) * limit;
                    
                    console.log(`[getCustomers] Page ${page}, Limit ${limit}`);
                    
                    // ✅ OPTIMIZATION PHASE 2: SELECT only necessary fields for customer summary
                    // Previously: SELECT * (all slots, product JSONB, payment_details, etc) - heavy payload
                    // Now: Only email, basic user info, price, and created_at - 80% smaller
                    const { rows: bookingData } = await sql`
                        SELECT 
                            id,
                            user_info,
                            price,
                            created_at
                        FROM bookings 
                        WHERE status != 'expired'
                        ORDER BY created_at DESC 
                        LIMIT 500
                    `;
                    
                    const customerMap = new Map<string, Customer>();
                    
                    // Process booking customers - Extract data directly without parseBookingFromDB
                    bookingData.forEach((row: any) => {
                        if (!row || !row.user_info) return;
                        
                        let userInfo;
                        if (typeof row.user_info === 'string') {
                            try {
                                userInfo = JSON.parse(row.user_info);
                            } catch (e) {
                                console.error('Error parsing userInfo:', e);
                                return;
                            }
                        } else {
                            userInfo = row.user_info;
                        }
                        
                        if (!userInfo.email) return;
                        
                        const email = userInfo.email;
                        const price = typeof row.price === 'number' ? row.price : (row.price ? parseFloat(row.price) : 0);
                        const createdAt = new Date(row.created_at);
                        
                        const existing = customerMap.get(email);
                        if (existing) {
                            existing.totalBookings += 1;
                            existing.totalSpent += price;
                            if (createdAt > existing.lastBookingDate) {
                                existing.lastBookingDate = createdAt;
                            }
                        } else {
                            customerMap.set(email, {
                                email,
                                userInfo,
                                bookings: [], // Don't load full booking details - aggregate only
                                totalBookings: 1,
                                totalSpent: price,
                                lastBookingDate: createdAt,
                                deliveries: []
                            });
                        }
                    });

                    // Also get standalone customers from customers table
                    const { rows: standaloneCustomers } = await sql`SELECT * FROM customers ORDER BY first_name ASC LIMIT 500`;
                    standaloneCustomers.forEach(customerRow => {
                        const email = customerRow.email;
                        if (!customerMap.has(email)) {
                            customerMap.set(email, {
                                email,
                                userInfo: {
                                    firstName: customerRow.first_name || '',
                                    lastName: customerRow.last_name || '',
                                    email: customerRow.email,
                                    phone: customerRow.phone || '',
                                    countryCode: customerRow.country_code || '',
                                    birthday: customerRow.birthday || null
                                },
                                bookings: [],
                                totalBookings: 0,
                                totalSpent: 0,
                                lastBookingDate: new Date(0),
                                deliveries: []
                            });
                        } else {
                            const existing = customerMap.get(email)!;
                            if (customerRow.phone && !existing.userInfo.phone) {
                                existing.userInfo.phone = customerRow.phone;
                            }
                            if (customerRow.country_code && !existing.userInfo.countryCode) {
                                existing.userInfo.countryCode = customerRow.country_code;
                            }
                        }
                    });
                    
                    const allCustomers = Array.from(customerMap.values());
                    const paginatedCustomers = allCustomers.slice(offset, offset + limit);
                    
                    console.log(`[API] Generated ${allCustomers.length} customers, returning ${paginatedCustomers.length} for page ${page}`);
                    
                    // ✅ CACHE STRATEGY: 30 segundos para permitir updates rápidos después de pagos/bookings
                    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
                    data = {
                        customers: paginatedCustomers,
                        total: allCustomers.length,
                        page,
                        limit,
                        pages: Math.ceil(allCustomers.length / limit)
                    };
                    break;
                }

                case 'getAvailableSlots': {
                    // Endpoint inteligente para experiencias personalizadas
                    const { technique, participants, startDate, daysAhead } = req.query;
                    
                    if (!technique || !participants) {
                        return res.status(400).json({ 
                            success: false, 
                            error: 'Missing required parameters: technique and participants' 
                        });
                    }

                    const requestedParticipants = parseInt(participants as string);
                    const requestedTechnique = technique as string;
                    const searchStartDate = startDate ? new Date(startDate as string) : new Date();
                    const searchDays = daysAhead ? parseInt(daysAhead as string) : 60;

                    console.log(`[getAvailableSlots] Searching: technique=${requestedTechnique}, participants=${requestedParticipants}, from=${searchStartDate.toISOString().split('T')[0]}, days=${searchDays}`);

                    // ⚡ CRÍTICO: NO filtrar por created_at en query — bookings pueden ser creados hace meses con slots en el futuro
                    // OPTIMIZACIÓN: Agregar LIMIT 2000 para evitar traer TODOS los bookings indefinidamente
                    // Una reserva creada hace 3 meses para una fecha futura DEBE considerarse (pero con limit)
                    
                    const totalBookingsCheck = await sql`
                        SELECT COUNT(*) as count FROM bookings WHERE status != 'expired'
                    `;
                    const totalCount = totalBookingsCheck.rows[0]?.count || 0;
                    if (totalCount > 2000) {
                        console.warn(`[getAvailableSlots] ⚠️ ${totalCount} total bookings in DB - performance may degrade. Consider archiving old bookings.`);
                    }
                    
                    // Obtener datos necesarios - con LIMIT para evitar saturación
                    const [bookingsResult, instructorsResult] = await Promise.all([
                        sql`
                            SELECT * FROM bookings 
                            WHERE status != 'expired'
                            ORDER BY created_at DESC
                            LIMIT 2000
                        `,
                        sql`SELECT * FROM instructors ORDER BY name ASC`
                    ]);

                    const allBookings = bookingsResult.rows.map(parseBookingFromDB);
                    const instructors = instructorsResult.rows.map(toCamelCase);
                    
                    // Filtrar bookings que tengan slots dentro del rango de búsqueda
                    const rangeStart = new Date(searchStartDate);
                    rangeStart.setDate(rangeStart.getDate() - 1); // 1 día buffer antes
                    const rangeEnd = new Date(searchStartDate);
                    rangeEnd.setDate(rangeEnd.getDate() + searchDays + 1); // 1 día buffer después
                    
                    const rangeStartStr = rangeStart.toISOString().split('T')[0];
                    const rangeEndStr = rangeEnd.toISOString().split('T')[0];
                    
                    const bookings = allBookings.filter(booking => {
                        if (!booking.slots || !Array.isArray(booking.slots)) return false;
                        return booking.slots.some((s: any) => {
                            const slotDate = s.date;
                            return slotDate >= rangeStartStr && slotDate <= rangeEndStr;
                        });
                    });
                    
                    console.log(`[getAvailableSlots] Filtered ${bookings.length} bookings with slots in range (out of ${allBookings.length} total)`);

                    const courseSessionsByDate = await loadCourseSessionsByDate(rangeStartStr, rangeEndStr);
                    
                    // Parse settings reutilizando función helper
                    const { availability, scheduleOverrides, classCapacity } = await parseSlotAvailabilitySettings();
                    const maxCapacityMap = getMaxCapacityMap(classCapacity);

                    const allSlots: any[] = []; // TODOS los slots (disponibles e indisponibles)
                    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

                    // Iterar sobre cada día
                    for (let i = 0; i < searchDays; i++) {
                        const currentDate = new Date(searchStartDate);
                        currentDate.setDate(currentDate.getDate() + i);
                        const dateStr = currentDate.toISOString().split('T')[0];
                        const dayKey = DAY_NAMES[currentDate.getDay()];
                        
                        // Obtener slots del día (availability o override)
                        const override = scheduleOverrides[dateStr];
                        const hasOverride = override !== undefined;
                        
                        if (hasOverride && override.slots === null) {
                            // Día cerrado por override
                            continue;
                        }

                        const baseSlots = hasOverride ? override.slots : availability[dayKey];
                        if (!baseSlots || baseSlots.length === 0) continue;

                        baseSlots.forEach((slot: any) => {
                            // Verificar si el slot es de la técnica solicitada
                            // IMPORTANTE: Solo contar overlaps de LA MISMA TÉCNICA, no de otras técnicas
                            const normalizedSlotTechnique = slotTechniqueKey(requestedTechnique);
                            if (slot.technique !== normalizedSlotTechnique) return;

                            const slotTime = normalizeTime(slot.time);
                            
                            // Calcular rango horario de este slot (2 horas de duración)
                            const slotStartMinutes = timeToMinutes(slotTime);
                            const slotEndMinutes = slotStartMinutes + (2 * 60); // 2 horas

                            const hasCourseBlock = hasCourseOverlap(dateStr, slotStartMinutes, slotEndMinutes, courseSessionsByDate);

                            if (!hasCourseBlock) {
                                // Contar participantes que se solapan temporalmente con este slot
                                // IMPORTANTE: Solo contar bookings de LA MISMA TÉCNICA, no de otras
                                const bookingsOverlapingSlot = bookings.filter((b: any) => {
                                    if (!b.slots || !Array.isArray(b.slots)) return false;
                                    
                                    // ===== DERIVAR TÉCNICA REAL DEL BOOKING =====
                                    // Priorizar product.name para derivar técnica (datos más confiables)
                                    let bookingTechnique: string | undefined;
                                    const productName = b.product?.name?.toLowerCase() || '';
                                    
                                    if (productName.includes('pintura')) {
                                        bookingTechnique = 'painting';
                                    } else if (productName.includes('torno')) {
                                        bookingTechnique = 'potters_wheel';
                                    } else if (productName.includes('modelado')) {
                                        bookingTechnique = 'hand_modeling';
                                    } else {
                                        bookingTechnique = b.technique || (b.product?.details as any)?.technique;
                                    }
                                    
                                    // Para handwork (painting, modeling), verificar si comparten capacidad
                                    const isHandWork = (tech: string | undefined) => 
                                        tech === 'molding' || tech === 'painting' || tech === 'hand_modeling';
                                    
                                    if (isHandWork(requestedTechnique) && isHandWork(bookingTechnique)) {
                                        // Handwork comparte capacidad entre sí
                                    } else if (bookingTechnique !== requestedTechnique) {
                                        return false; // Técnicas diferentes, no contar
                                    }
                                    
                                    return b.slots.some((s: any) => {
                                        if (s.date !== dateStr) return false;
                                        
                                        // Calcular rango horario del booking (también 2 horas)
                                        const bookingStartMinutes = timeToMinutes(normalizeTime(s.time));
                                        const bookingEndMinutes = bookingStartMinutes + (2 * 60); // 2 horas
                                        
                                        // Verificar si hay overlap temporal
                                        return hasTimeOverlap(slotStartMinutes, slotEndMinutes, bookingStartMinutes, bookingEndMinutes);
                                    });
                                });

                                // Sumar participantes que solapan
                                let bookedParticipants = bookingsOverlapingSlot.reduce((sum: number, b: any) => {
                                    return sum + (b.participants || 1);
                                }, 0);

                                // 🔒 REGLA CRÍTICA: Para torno en horarios pre-establecidos, asumir MÍNIMO 1 persona
                                // Esto previene que se reserve en slots intermedios (9:30) cuando hay clase fija a las 9:00
                                // incluso si esa clase aún no tiene estudiantes registrados en la base de datos
                                if (requestedTechnique === 'potters_wheel' && bookedParticipants === 0) {
                                    bookedParticipants = 1; // Asumir siempre 1 persona mínimo
                                    console.log(`🔒 [getAvailableSlots] Torno ${slotTime}: asumiendo 1 persona mínimo (clase pre-establecida)`);
                                }

                                // Capacidad máxima del slot (override válido o fallback por técnica)
                                const maxCapacity = resolveCapacity(dateStr, requestedTechnique, maxCapacityMap, scheduleOverrides);
                                const availableCapacity = maxCapacity - bookedParticipants;
                                const canBook = availableCapacity >= requestedParticipants;

                                const instructor = instructors.find((inst: any) => inst.id === slot.instructorId);
                                
                                allSlots.push({
                                    date: dateStr,
                                    time: slotTime,
                                    available: Math.max(0, availableCapacity),
                                    total: maxCapacity,
                                    canBook,
                                    instructor: instructor?.name || 'Instructor',
                                    instructorId: slot.instructorId,
                                    technique: requestedTechnique,
                                    blockedReason: null
                                });
                            } else {
                                // Slot bloqueado por curso
                                const maxCapacity = resolveCapacity(dateStr, requestedTechnique, maxCapacityMap, scheduleOverrides);
                                const instructor = instructors.find((inst: any) => inst.id === slot.instructorId);
                                
                                allSlots.push({
                                    date: dateStr,
                                    time: slotTime,
                                    available: 0,
                                    total: maxCapacity,
                                    canBook: false,
                                    instructor: instructor?.name || 'Instructor',
                                    instructorId: slot.instructorId,
                                    technique: requestedTechnique,
                                    blockedReason: 'course_conflict'
                                });
                            }
                        });
                    }

                    console.log(`[getAvailableSlots] Found ${allSlots.filter((s:any) => s.canBook).length} bookable slots (${allSlots.length} total)`);
                    
                    data = {
                        success: true,
                        slots: allSlots,
                        searchParams: {
                            technique: requestedTechnique,
                            participants: requestedParticipants,
                            startDate: searchStartDate.toISOString().split('T')[0],
                            daysAhead: searchDays
                        }
                    };

                    // Cache de 2 minutos (datos dinámicos que cambian con reservas)
                    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
                    break;
                }
                case 'getGroupClassSlots': {
                    const { pottersWheel, handModeling, painting, startDate, daysAhead } = req.query;

                    const pottersCount = Math.max(0, parseInt(String(pottersWheel || 0), 10) || 0);
                    const handModelingCount = Math.max(0, parseInt(String(handModeling || 0), 10) || 0);
                    const paintingCount = Math.max(0, parseInt(String(painting || 0), 10) || 0);
                    const handWorkCount = handModelingCount + paintingCount;
                    const totalParticipants = pottersCount + handWorkCount;

                    if (totalParticipants < 2) {
                        return res.status(400).json({
                            success: false,
                            error: 'Las experiencias grupales requieren minimo 2 personas'
                        });
                    }

                    const searchStartDate = startDate ? new Date(startDate as string) : new Date();
                    const searchDays = daysAhead ? parseInt(daysAhead as string, 10) : 60;

                    const [bookingsResult, instructorsResult] = await Promise.all([
                        sql`
                            SELECT * FROM bookings
                            WHERE status != 'expired'
                            ORDER BY created_at DESC
                        `,
                        sql`SELECT * FROM instructors ORDER BY name ASC`
                    ]);

                    const allBookings = bookingsResult.rows.map(parseBookingFromDB);
                    const instructors = instructorsResult.rows.map(toCamelCase);

                    const rangeStart = new Date(searchStartDate);
                    rangeStart.setDate(rangeStart.getDate() - 1);
                    const rangeEnd = new Date(searchStartDate);
                    rangeEnd.setDate(rangeEnd.getDate() + searchDays + 1);

                    const rangeStartStr = rangeStart.toISOString().split('T')[0];
                    const rangeEndStr = rangeEnd.toISOString().split('T')[0];

                    const bookings = allBookings.filter(booking => {
                        if (!booking.slots || !Array.isArray(booking.slots)) return false;
                        return booking.slots.some((s: any) => {
                            const slotDate = s.date;
                            return slotDate >= rangeStartStr && slotDate <= rangeEndStr;
                        });
                    });

                    const courseSessionsByDate = await loadCourseSessionsByDate(rangeStartStr, rangeEndStr);
                    const { availability, scheduleOverrides, classCapacity } = await parseSlotAvailabilitySettings();
                    const maxCapacityMap = getMaxCapacityMap(classCapacity);

                    const allSlots: any[] = [];
                    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

                    for (let i = 0; i < searchDays; i++) {
                        const currentDate = new Date(searchStartDate);
                        currentDate.setDate(currentDate.getDate() + i);
                        const dateStr = currentDate.toISOString().split('T')[0];
                        const dayKey = DAY_NAMES[currentDate.getDay()];

                        const override = scheduleOverrides[dateStr];
                        if (override && override.slots === null) {
                            continue;
                        }

                        const fixedPottersTimes = getFixedSlotTimesForDate(dateStr, dayKey, availability, scheduleOverrides, 'potters_wheel');
                        const fixedPottersMinutes = fixedPottersTimes.map(timeToMinutes);
                        const fixedHandTimes = getFixedSlotTimesForDate(dateStr, dayKey, availability, scheduleOverrides, 'molding');

                        // ALWAYS generate ALL candidate times - block individually per rule
                        const candidateTimes: string[] = getBusinessHoursForDay(currentDate.getDay());

                        if (candidateTimes.length === 0) continue;

                        candidateTimes.forEach(slotTime => {
                            const normalizedTime = normalizeTime(slotTime);
                            const slotStartMinutes = timeToMinutes(normalizedTime);
                            const slotEndMinutes = slotStartMinutes + (2 * 60);

                            const courseBlocked = hasCourseOverlap(dateStr, slotStartMinutes, slotEndMinutes, courseSessionsByDate);
                            let blockedReason: string | null = courseBlocked ? 'course_conflict' : null;

                            let pottersAvailable = 0;
                            let pottersTotal = 0;
                            let pottersBooked = 0;
                            let pottersBlocked = false;

                            if (pottersCount > 0) {
                                pottersTotal = resolveCapacity(dateStr, 'potters_wheel', maxCapacityMap, scheduleOverrides);

                                if (totalParticipants < 3 && !fixedPottersTimes.includes(normalizedTime)) {
                                    pottersBlocked = true;
                                    blockedReason = blockedReason || 'fixed_class_conflict';
                                }

                                if (totalParticipants >= 3 && isPottersFixedConflict(slotStartMinutes, fixedPottersMinutes)) {
                                    pottersBlocked = true;
                                    blockedReason = blockedReason || 'fixed_class_conflict';
                                }

                                // ALWAYS check booking overlaps (regardless of other blocked reasons)
                                bookings.forEach(booking => {
                                    const { potters: bookingPotters } = getGroupClassBookingCounts(booking);
                                    if (bookingPotters <= 0) return;

                                    // Check slots array (group bookings)
                                    if (booking.slots && Array.isArray(booking.slots)) {
                                        booking.slots.forEach((s: any) => {
                                            if (s.date !== dateStr) return;

                                            const bookingStart = timeToMinutes(normalizeTime(s.time));
                                            if (Number.isNaN(bookingStart)) return;

                                            if (bookingStart === slotStartMinutes) {
                                                pottersBooked += bookingPotters;
                                            } else if (slotStartMinutes >= bookingStart - 120 && slotStartMinutes < bookingStart + 120) {
                                                pottersBlocked = true;
                                            }
                                        });
                                    }

                                    // Also check direct booking date/time (individual bookings without slots array)
                                    if (!booking.slots && (booking.date || booking.bookingDate) && booking.time) {
                                        const bookingDate = normalizeDateValue(booking.date || booking.bookingDate);
                                        if (bookingDate === dateStr) {
                                            const bookingStart = timeToMinutes(normalizeTime(String(booking.time)));
                                            if (!Number.isNaN(bookingStart)) {
                                                if (bookingStart === slotStartMinutes) {
                                                    pottersBooked += bookingPotters;
                                                } else if (slotStartMinutes >= bookingStart - 120 && slotStartMinutes < bookingStart + 120) {
                                                    pottersBlocked = true;
                                                }
                                            }
                                        }
                                    }
                                });

                                pottersAvailable = Math.max(0, pottersTotal - pottersBooked);

                                if (pottersBlocked) {
                                    blockedReason = blockedReason || 'fixed_class_conflict';
                                }

                                if (pottersAvailable < pottersCount) {
                                    blockedReason = blockedReason || 'capacity';
                                }
                            }

                            let handWorkAvailable = 0;
                            let handWorkTotal = 0;
                            let handWorkBooked = 0;

                            if (handWorkCount > 0) {
                                handWorkTotal = resolveCapacity(dateStr, 'hand_modeling', maxCapacityMap, scheduleOverrides);

                                if (totalParticipants < 3 && pottersCount === 0 && !fixedHandTimes.includes(normalizedTime)) {
                                    blockedReason = blockedReason || 'fixed_class_conflict';
                                }

                                bookings.forEach(booking => {
                                    const { handWork: bookingHandWork } = getGroupClassBookingCounts(booking);
                                    if (bookingHandWork <= 0) return;

                                    if (booking.slots && Array.isArray(booking.slots)) {
                                        booking.slots.forEach((s: any) => {
                                            if (s.date !== dateStr) return;

                                            const bookingStart = timeToMinutes(normalizeTime(s.time));
                                            if (Number.isNaN(bookingStart)) return;

                                            const bookingEnd = bookingStart + (2 * 60);
                                            if (hasTimeOverlap(slotStartMinutes, slotEndMinutes, bookingStart, bookingEnd)) {
                                                handWorkBooked += bookingHandWork;
                                            }
                                        });
                                    }

                                    // Also check direct booking date/time (individual bookings without slots array)
                                    if (!booking.slots && (booking.date || booking.bookingDate) && booking.time) {
                                        const bookingDate = normalizeDateValue(booking.date || booking.bookingDate);
                                        if (bookingDate === dateStr) {
                                            const bookingStart = timeToMinutes(normalizeTime(String(booking.time)));
                                            if (!Number.isNaN(bookingStart)) {
                                                const bookingEnd = bookingStart + (2 * 60);
                                                if (hasTimeOverlap(slotStartMinutes, slotEndMinutes, bookingStart, bookingEnd)) {
                                                    handWorkBooked += bookingHandWork;
                                                }
                                            }
                                        }
                                    }
                                });

                                handWorkAvailable = Math.max(0, handWorkTotal - handWorkBooked);

                                if (handWorkAvailable < handWorkCount) {
                                    blockedReason = blockedReason || 'capacity';
                                }
                            }

                            const displayAvailable = pottersCount > 0 && handWorkCount > 0
                                ? Math.min(pottersAvailable, handWorkAvailable)
                                : pottersCount > 0
                                ? pottersAvailable
                                : handWorkAvailable;

                            const displayTotal = pottersCount > 0 && handWorkCount > 0
                                ? Math.min(pottersTotal, handWorkTotal)
                                : pottersCount > 0
                                ? pottersTotal
                                : handWorkTotal;

                            const canBook = !blockedReason
                                && (pottersCount === 0 || pottersAvailable >= pottersCount)
                                && (handWorkCount === 0 || handWorkAvailable >= handWorkCount);

                            const instructor = instructors.find((inst: any) => inst.id === 0);

                            allSlots.push({
                                date: dateStr,
                                time: normalizedTime,
                                available: displayAvailable,
                                total: displayTotal,
                                canBook,
                                instructor: instructor?.name || 'Instructor',
                                instructorId: 0,
                                technique: 'group_class',
                                blockedReason,
                                capacityDetails: {
                                    pottersWheel: pottersCount > 0 ? {
                                        available: pottersAvailable,
                                        total: pottersTotal,
                                        requested: pottersCount
                                    } : undefined,
                                    handWork: handWorkCount > 0 ? {
                                        available: handWorkAvailable,
                                        total: handWorkTotal,
                                        requested: handWorkCount
                                    } : undefined
                                }
                            });
                        });
                    }

                    data = {
                        success: true,
                        slots: allSlots,
                        searchParams: {
                            pottersWheel: pottersCount,
                            handModeling: handModelingCount,
                            painting: paintingCount,
                            startDate: searchStartDate.toISOString().split('T')[0],
                            daysAhead: searchDays
                        }
                    };

                    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
                    break;
                }
                case 'checkSlotAvailability': {
                    // Endpoint para validar disponibilidad de un slot específico en tiempo real
                    const { date, time, technique, participants } = req.query;
                    
                    if (!date || !time || !technique || !participants) {
                        return res.status(400).json({ 
                            success: false, 
                            error: 'Missing required parameters: date, time, technique, participants' 
                        });
                    }

                    const requestedDate = date as string;
                    const requestedTime = time as string;
                    const requestedTechnique = technique as string;
                    const requestedParticipants = parseInt(participants as string);

                    try {
                        const availability = await computeSlotAvailability(
                            requestedDate,
                            requestedTime,
                            requestedTechnique,
                            requestedParticipants
                        );

                        const responseData = {
                            success: true,
                            available: availability.available,
                            date: requestedDate,
                            time: availability.normalizedTime,
                            technique: requestedTechnique,
                            requestedParticipants,
                            capacity: availability.capacity,
                            bookingsCount: availability.bookingsCount,
                            message: availability.message,
                            openedByLargeGroup: Boolean((availability as any).openedByLargeGroup)
                        };

                        res.setHeader('Cache-Control', 'no-store');
                        return res.status(200).json(responseData);
                    } catch (error) {
                        console.error('[checkSlotAvailability] Error:', error);
                        return res.status(500).json({ 
                            success: false, 
                            error: error instanceof Error ? error.message : 'Unknown error checking availability' 
                        });
                    }
                }
                case 'listPieces': {
                    try {
                        const { rows } = await sql`
                            SELECT * FROM pieces WHERE is_active = true ORDER BY sort_order, name ASC
                        `;
                        data = toCamelCase(rows);
                    } catch (error) {
                        console.error('[listPieces GET] Error:', error);
                        return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
                    }
                    break;
                }
                case 'expireOldBookings': {
                    try {
                        const { rows: expiredBookings } = await sql`
                            UPDATE bookings 
                            SET status = 'expired'
                            WHERE status = 'active' 
                              AND is_paid = false 
                              AND expires_at < NOW()
                            RETURNING id, booking_code, user_info
                        `;

                        try {
                            await sql`
                                UPDATE admin_tasks 
                                SET last_executed_at = NOW(), updated_at = NOW()
                                WHERE task_name = 'expire_old_bookings'
                            `;
                        } catch (taskErr) {
                            console.warn('[EXPIRE BOOKINGS][GET] Could not update admin_tasks:', taskErr);
                        }

                        return res.status(200).json({
                            success: true,
                            message: 'Pre-reservas expiradas marcadas',
                            expired: expiredBookings.length
                        });
                    } catch (error) {
                        console.error('[expireOldBookings][GET] Error:', error);
                        return res.status(500).json({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        });
                    }
                }
            default:
                return res.status(400).json({ error: `Unknown action: ${action}` });
        }
    } else {
        if (!key || typeof key !== 'string') {
            return res.status(400).json({ error: 'A "key" query parameter is required.' });
        }
        if (key === 'clientNotifications') {
            const { rows: clientNotifications } = await sql`
                SELECT
                    *,
                    TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at_iso
                FROM client_notifications ORDER BY created_at DESC
            `;
            data = clientNotifications.map(parseClientNotificationFromDB);
        } else {
            // Special handling for products - fetch from products table
            if (key === 'products') {
                try {
                    // ⚡ PHASE 5: Added LIMIT 1000 to prevent loading all product jSONB data
                    // Products table stores: details, scheduling_rules, overrides (all JSONB)
                    const { rows: products } = await sql`SELECT * FROM products ORDER BY name ASC LIMIT 1000`;
                    data = products.map(toCamelCase);
                    // ✅ OPTIMIZACIÓN: Cache CDN 1 hora (datos muy estables)
                    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
                } catch (error) {
                    console.error('Error fetching products:', error);
                    data = [];
                }
                        } else if (key === 'bookings') {
                                // ⚡ PHASE 5 FINAL OPTIMIZATION: Partial SELECT sin campo `product` (10-20 KB por booking)
                                // Omitir `product`, `payment_details`, `attendance` → ~85% payload reduction
                                // Lazy load detalles solo cuando se abre modal de pagos/detalles
                                const daysLimit = parseInt(req.query.daysLimit as string) || 30;
                                const limitDate = new Date();
                                limitDate.setDate(limitDate.getDate() - daysLimit);
                
                                // ⚡ PERFORMANCE FIX: Removed expensive EXISTS subquery that was checking every booking's slots
                                // Now relies on daysLimit to filter recent bookings (most active bookings are recent)
                                // If you need future slots from old bookings, increase daysLimit query param
                                const { rows: bookings } = await sql`
                                        SELECT 
                                            b.id,
                                            b.product_id,
                                            b.product_type,
                                            p.name AS product_name,
                                            b.slots,
                                            b.user_info,
                                            b.created_at,
                                            b.is_paid,
                                            b.price,
                                            b.booking_mode,
                                            b.booking_code,
                                            b.booking_date,
                                            b.attendance,
                                            b.status,
                                            b.expires_at,
                                            b.participants,
                                            b.group_class_metadata,
                                            b.technique
                                        FROM bookings b
                                        LEFT JOIN products p ON p.id = b.product_id
                                        WHERE b.status != 'expired'
                                            AND b.created_at >= ${limitDate.toISOString()}
                                        ORDER BY b.created_at DESC
                                        LIMIT 500
                                `;
                                console.log(`API: Loaded ${bookings.length} bookings from last ${daysLimit} days (OMITTED: product, payment_details)`);
                
                if (bookings.length === 0) {
                    console.warn('API: No bookings found in database');
                    data = [];
                } else {
                    // Parse bookings properly using parseBookingFromDB
                    const processedBookings = bookings
                        .map(parseBookingFromDB)
                        .filter(Boolean);
                    
                    console.log(`API: Successfully processed ${processedBookings.length} bookings out of ${bookings.length} raw bookings`);
                    data = processedBookings;
                }
                // ✅ CACHE STRATEGY: Cache CDN 30 segundos para balance entre performance y freshness
                // Permite updates rápidos después de mutations sin sacrificar totalmente CDN
                res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
            } else if (key === 'customers') {
                // ⚡ PHASE 6b EXTREME OPTIMIZATION: Aggregate-only, no full booking objects
                //  VERCEL DEPLOYMENT TEST: 2026-02-18T22:16:00Z - Should see change immediately
                //  Don't load booking details at all - just aggregate stats
                // Previous: Customer.bookings = [full booking objects] = 4MB payload
                // New: Customer.bookings = [] (empty), only totalBookings/totalSpent
                const daysLimit = 90;
                const limitDate = new Date();
                limitDate.setDate(limitDate.getDate() - daysLimit);
                
                const { rows: bookings } = await sql`
                    SELECT 
                        id,
                        user_info,
                        is_paid,
                        price,
                        created_at
                    FROM bookings 
                    WHERE created_at >= ${limitDate.toISOString()}
                    ORDER BY created_at DESC
                    LIMIT 1000
                `;
                console.log(`API: Loading customers (AGGREGATE ONLY, no booking details) from ${bookings.length} recent bookings - PHASE 6b v2`);
                
                // Disable client-side caching for this endpoint
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                
                const customerMap = new Map<string, Customer>();
                
                // Process bookings for aggregation ONLY - don't include booking details
                bookings.forEach((row: any) => {
                    if (!row || !row.user_info) return;
                    
                    let userInfo;
                    if (typeof row.user_info === 'string') {
                        try {
                            userInfo = JSON.parse(row.user_info);
                        } catch (e) {
                            return;
                        }
                    } else {
                        userInfo = row.user_info;
                    }
                    
                    if (!userInfo.email) return;
                    
                    const email = userInfo.email;
                    const price = typeof row.price === 'number' ? row.price : (row.price ? parseFloat(row.price) : 0);
                    const createdAt = new Date(row.created_at);
                    
                    const existing = customerMap.get(email);
                    if (existing) {
                        existing.totalBookings += 1;
                        existing.totalSpent += price;
                        if (createdAt > existing.lastBookingDate) {
                            existing.lastBookingDate = createdAt;
                        }
                    } else {
                        customerMap.set(email, {
                            email,
                            userInfo,
                            bookings: [], // EMPTY - don't load full booking objects
                            totalBookings: 1,
                            totalSpent: price,
                            lastBookingDate: createdAt,
                            deliveries: []
                        });
                    }
                });
                
                data = Array.from(customerMap.values());
                console.log(`Generated ${data.length} customers from ${bookings.length} bookings (AGGREGATE ONLY)`);
            } else {
                const { rows: settings } = await sql`SELECT value FROM settings WHERE key = ${key}`;
                if (settings.length > 0) {
                    // Si es bankDetails y el valor es string, parsear JSON
                    // Parse JSON fields that are stored as strings
                    const jsonFields = ['bankDetails', 'classCapacity', 'availability', 'scheduleOverrides', 'capacityMessages', 'freeDateTimeOverrides'];
                    if (jsonFields.includes(key) && typeof settings[0].value === 'string') {
                        try {
                            data = JSON.parse(settings[0].value);
                        } catch (e) {
                            console.error(`Error parsing ${key} JSON:`, e);
                            data = key === 'classCapacity' ? { potters_wheel: 0, molding: 0, introductory_class: 0 } : [];
                        }
                    } else {
                        data = settings[0].value;
                    }
                } else {
                    // Si el key no existe, devuelve un valor por defecto según el tipo esperado
                    switch (key) {
                        case 'bankDetails':
                        case 'announcements':
                        case 'capacityMessages':
                            data = [];
                            break;
                        case 'availability':
                        case 'scheduleOverrides':
                        case 'automationSettings':
                        case 'footerInfo':
                        case 'backgroundSettings':
                        case 'freeDateTimeOverrides':
                            data = {};
                            break;
                        case 'classCapacity':
                            data = { potters_wheel: 0, molding: 0, introductory_class: 0 };
                            break;
                        case 'uiLabels':
                            data = { taxIdLabel: 'RUC' };
                            break;
                        case 'policies':
                        case 'confirmationMessage':
                            data = '';
                            break;
                        default:
                            data = null;
                    }
                }
            }
        }
    }
    return res.status(200).json(data);
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
    const { key, action } = req.query;

    if (action) {
        return handleAction(action as string, req, res);
    }
    
    if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'A "key" query parameter is required for data updates.' });
    }

    const value = req.body;
    try {
        switch (key) {
            case 'customer': {
                // Crear o actualizar cliente
                try {
                    const customer = await createCustomer(value);
                    return res.status(200).json({ success: true, customer });
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    return res.status(500).json({ success: false, error: errorMsg });
                }
            }
        case 'products':
            try {
                console.log('Processing products update:', value);
                
                // Si es un solo producto (desde modal), hacer upsert individual
                if (!Array.isArray(value)) {
                    const p = value;
                    console.log('Single product upsert:', p.id);
                    
                    await sql.query(
                        `INSERT INTO products (id, type, name, classes, price, description, image_url, details, is_active, scheduling_rules, overrides, min_participants, price_per_person, sort_order)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                        ON CONFLICT (id) DO UPDATE SET
                            type = EXCLUDED.type,
                            name = EXCLUDED.name,
                            classes = EXCLUDED.classes,
                            price = EXCLUDED.price,
                            description = EXCLUDED.description,
                            image_url = EXCLUDED.image_url,
                            details = EXCLUDED.details,
                            is_active = EXCLUDED.is_active,
                            scheduling_rules = EXCLUDED.scheduling_rules,
                            overrides = EXCLUDED.overrides,
                            min_participants = EXCLUDED.min_participants,
                            price_per_person = EXCLUDED.price_per_person,
                            sort_order = EXCLUDED.sort_order;`,
                        [
                            p.id,
                            p.type,
                            p.name,
                            p.classes || null,
                            p.price || null,
                            p.description || null,
                            p.imageUrl || null,
                            p.details ? JSON.stringify(p.details) : null,
                            p.isActive,
                            p.schedulingRules ? JSON.stringify(p.schedulingRules) : null,
                            p.overrides ? JSON.stringify(p.overrides) : null,
                            p.minParticipants || null,
                            p.pricePerPerson || null,
                            p.sortOrder || 0
                        ]
                    );
                    console.log('Single product saved successfully');
                    return res.status(200).json({ success: true });
                }
                
                // Si es un array (actualización masiva), usar UPSERT en lugar de DELETE/INSERT
                console.log('Bulk products update, count:', value.length);
                await sql`BEGIN`;
                
                for (const p of value) {
                    await sql.query(
                        `INSERT INTO products (id, type, name, classes, price, description, image_url, details, is_active, scheduling_rules, overrides, min_participants, price_per_person, sort_order)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                        ON CONFLICT (id) DO UPDATE SET
                            type = EXCLUDED.type,
                            name = EXCLUDED.name,
                            classes = EXCLUDED.classes,
                            price = EXCLUDED.price,
                            description = EXCLUDED.description,
                            image_url = EXCLUDED.image_url,
                            details = EXCLUDED.details,
                            is_active = EXCLUDED.is_active,
                            scheduling_rules = EXCLUDED.scheduling_rules,
                            overrides = EXCLUDED.overrides,
                            min_participants = EXCLUDED.min_participants,
                            price_per_person = EXCLUDED.price_per_person,
                            sort_order = EXCLUDED.sort_order`,
                        [
                            p.id,
                            p.type,
                            p.name,
                            p.classes || null,
                            p.price || null,
                            p.description || null,
                            p.imageUrl || null,
                            p.details ? JSON.stringify(p.details) : null,
                            p.isActive,
                            p.schedulingRules ? JSON.stringify(p.schedulingRules) : null,
                            p.overrides ? JSON.stringify(p.overrides) : null,
                            p.minParticipants || null,
                            p.pricePerPerson || null,
                            p.sortOrder || 0
                        ]
                    );
                }
                await sql`COMMIT`;
                console.log('Bulk products saved successfully');
            } catch (err) {
                console.error('Error al guardar productos:', err, value);
                await sql`ROLLBACK`;
                return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
            }
            break;
        case 'instructors':
            await sql`BEGIN`;
            await sql.query('DELETE FROM instructors');
            for (const i of value) {
                await sql.query('INSERT INTO instructors (id, name, color_scheme) VALUES ($1, $2, $3);', [i.id, i.name, i.colorScheme]);
            }
            await sql`COMMIT`;
            break;
        default:
            await sql.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;', [key, JSON.stringify(value)]);
            break;
    }
    return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error in handlePost:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function handleAction(action: string, req: VercelRequest, res: VercelResponse) {
    let result: any = { success: true };
    switch (action) {  // Corregido: Se agregó el paréntesis faltante
        case 'addGiftcardRequest': {
            // Inserta una nueva solicitud de giftcard en la base de datos
            const body = req.body;
            
            // DEBUG: Log what we receive
            if (body?.sendMethod || body?.scheduledSendAt) {
                console.log('📥 [addGiftcardRequest] Recibido giftcard con programación:', {
                    sendMethod: body.sendMethod,
                    scheduledSendAt: body.scheduledSendAt,
                    recipient: body.recipientName
                });
            }
            
            // Rate limit: 10 requests/día por email
            if (!checkRateLimit(req, res, 'email', body?.buyerEmail)) {
                return; // checkRateLimit ya envió la respuesta 429
            }
            
            if (!body || !body.buyerName || !body.buyerEmail || !body.recipientName || !body.amount || !body.code) {
                return res.status(400).json({ success: false, error: 'Datos incompletos para registrar giftcard.' });
            }
            try {
                console.log('[addGiftcardRequest] 1️⃣ Iniciando creación de tabla...');
                // Crear tabla si no existe y agregar columnas si faltan
                await sql`
                    CREATE TABLE IF NOT EXISTS giftcard_requests (
                        id SERIAL PRIMARY KEY,
                        buyer_name VARCHAR(100) NOT NULL,
                        buyer_email VARCHAR(100) NOT NULL,
                        recipient_name VARCHAR(100) NOT NULL,
                        recipient_email VARCHAR(100),
                        recipient_whatsapp VARCHAR(30),
                        amount NUMERIC NOT NULL,
                        code VARCHAR(32) NOT NULL,
                        status VARCHAR(20) DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT NOW(),
                        buyer_message TEXT,
                        send_method VARCHAR(20),
                        scheduled_send_at TIMESTAMP
                    )
                `;
                console.log('[addGiftcardRequest] 2️⃣ Tabla creada, agregando columnas...');
                // Asegura las columnas si la tabla ya existía
                try {
                    await sql`ALTER TABLE giftcard_requests ADD COLUMN IF NOT EXISTS buyer_message TEXT`;
                    await sql`ALTER TABLE giftcard_requests ADD COLUMN IF NOT EXISTS send_method VARCHAR(20)`;
                    await sql`ALTER TABLE giftcard_requests ADD COLUMN IF NOT EXISTS scheduled_send_at TIMESTAMP`;
                } catch (e) {
                    console.warn('[addGiftcardRequest] Advertencia al agregar columnas:', e);
                }
                console.log('[addGiftcardRequest] 3️⃣ Insertando giftcard con:', { buyerEmail: body.buyerEmail, recipientName: body.recipientName, sendMethod: body.sendMethod, scheduledSendAt: body.scheduledSendAt });
                const { rows } = await sql`
                    INSERT INTO giftcard_requests (
                        buyer_name, buyer_email, recipient_name, recipient_email, recipient_whatsapp, amount, code, status, buyer_message, send_method, scheduled_send_at
                    ) VALUES (
                        ${body.buyerName}, ${body.buyerEmail}, ${body.recipientName}, ${body.recipientEmail || null}, ${body.recipientWhatsapp || null}, ${body.amount}, ${body.code}, 'pending', ${body.message || null}, ${body.sendMethod || null}, ${body.scheduledSendAt || null}
                    ) RETURNING id, created_at;
                `;
                console.log('[addGiftcardRequest] 4️⃣ Giftcard insertado con ID:', rows[0]?.id);
                // Enviar email de confirmación de recepción de solicitud
                try {
                    console.log('[addGiftcardRequest] 5️⃣ Importando emailService...');
                    const emailServiceModule = await import('./emailService.js');
                    console.log('[addGiftcardRequest] 6️⃣ Enviando email de confirmación...');
                    await emailServiceModule.sendGiftcardRequestReceivedEmail(
                        body.buyerEmail,
                        {
                            buyerName: body.buyerName,
                            amount: body.amount,
                            code: body.code,
                            recipientName: body.recipientName,
                            message: body.message || ''
                        }
                    );
                    console.log('[addGiftcardRequest] 7️⃣ Email enviado exitosamente');
                } catch (err) {
                    console.warn('[addGiftcardRequest] ⚠️ No se pudo enviar el email de confirmación de solicitud de giftcard:', err);
                }
                console.log('[addGiftcardRequest] ✅ Retornando respuesta exitosa');
                return res.status(200).json({ success: true, id: rows[0].id, createdAt: rows[0].created_at });
            } catch (error) {
                console.error('Error al registrar giftcard:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }

        case 'updateGiftcardSchedule': {
            // Actualizar la fecha/hora de envío programado de un giftcard
            const body = req.body;
            
            if (!body || !body.requestId || !body.scheduledSendAt) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'requestId y scheduledSendAt son requeridos' 
                });
            }

            try {
                console.log('[updateGiftcardSchedule] Actualizando giftcard:', {
                    requestId: body.requestId,
                    scheduledSendAt: body.scheduledSendAt
                });

                const { rows } = await sql`
                    UPDATE giftcard_requests 
                    SET scheduled_send_at = ${body.scheduledSendAt}
                    WHERE id = ${body.requestId}
                    RETURNING id, scheduled_send_at, send_method, status;
                `;

                if (rows.length === 0) {
                    return res.status(404).json({ 
                        success: false, 
                        error: 'Giftcard no encontrado' 
                    });
                }

                console.log('[updateGiftcardSchedule] ✅ Actualizado exitosamente');
                return res.status(200).json({
                    success: true,
                    data: {
                        id: String(rows[0].id),
                        scheduledSendAt: rows[0].scheduled_send_at ? new Date(rows[0].scheduled_send_at).toISOString() : null,
                        sendMethod: rows[0].send_method,
                        status: rows[0].status
                    }
                });
            } catch (error) {
                console.error('[updateGiftcardSchedule] Error:', error);
                return res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        case 'validateGiftcard': {
            // Validate a giftcard code and return balance, expiry and status.
            
            // Rate limit: 5 requests/minuto por IP (prevenir brute-force)
            if (!checkRateLimit(req, res, 'ip')) {
                return; // checkRateLimit ya envió la respuesta 429
            }
            
            const body = req.body || {};
            const code = (body.code || req.query.code || '').toString();
            console.debug('[API] validateGiftcard called with code:', code);
            if (!code) return res.status(400).json({ success: false, error: 'code is required' });

            try {
                // Try to find an issued giftcard first
                const { rows: giftcardRows } = await sql`SELECT * FROM giftcards WHERE code = ${code} LIMIT 1`;
                if (giftcardRows && giftcardRows.length > 0) {
                    const g = giftcardRows[0];
                    const balance = (typeof g.balance === 'number') ? g.balance : (g.balance ? parseFloat(g.balance) : 0);
                    const initialValue = (typeof g.initial_value === 'number') ? g.initial_value : (g.initial_value ? parseFloat(g.initial_value) : null);
                    const expiresAt = g.expires_at ? new Date(g.expires_at).toISOString() : null;
                    const isExpired = expiresAt ? (new Date() > new Date(expiresAt)) : false;
                    return res.status(200).json({
                        valid: !isExpired,
                        code: g.code,
                        giftcardId: g.id,
                        balance: Number(balance),
                        initialValue: initialValue !== null ? Number(initialValue) : null,
                        expiresAt,
                        status: isExpired ? 'expired' : 'active',
                        metadata: g.metadata || {}
                    });
                }

                // If no issued giftcard, check if there's a request (pending/approved/rejected).
                // Try to find by request.code first, then by metadata->>'issuedCode' so that
                // looking up an issued code still returns the original request even if the
                // giftcard row wasn't successfully created.
                let reqRows = (await sql`SELECT * FROM giftcard_requests WHERE code = ${code} LIMIT 1`).rows;
                if ((!reqRows || reqRows.length === 0)) {
                    try {
                        reqRows = (await sql`SELECT * FROM giftcard_requests WHERE (metadata->>'issuedCode') = ${code} LIMIT 1`).rows;
                    } catch (e) {
                        // If metadata is stored as text, fall back to text search (best-effort)
                        try {
                            reqRows = (await sql`SELECT * FROM giftcard_requests WHERE metadata::text LIKE ${'%' + code + '%'} LIMIT 1`).rows;
                        } catch (inner) {
                            reqRows = [];
                        }
                    }
                }
                if (reqRows && reqRows.length > 0) {
                    const r = reqRows[0];
                    // If the request exists, return helpful info for the UI.
                    // If the request was already approved and an issuedCode exists in metadata,
                    // try to resolve it to an issued giftcard and return that as valid if present.
                    const reqCamel = toCamelCase(r);
                    const status = (r.status || '').toString();
                    let issuedCode: string | null = null;
                    try {
                        if (r.metadata && typeof r.metadata === 'object' && r.metadata.issuedCode) {
                            issuedCode = String(r.metadata.issuedCode);
                        } else if (r.metadata && typeof r.metadata === 'string') {
                            // in case metadata is stored as stringified JSON
                            try { const parsed = JSON.parse(r.metadata); if (parsed && parsed.issuedCode) issuedCode = String(parsed.issuedCode); } catch(e){}
                        }
                    } catch (e) { issuedCode = null; }

                    if (status === 'approved' && issuedCode) {
                        // check if a giftcard with issuedCode exists
                        try {
                            const { rows: issuedRows } = await sql`SELECT * FROM giftcards WHERE code = ${issuedCode} LIMIT 1`;
                            if (issuedRows && issuedRows.length > 0) {
                                const g = issuedRows[0];
                                const balance = (typeof g.balance === 'number') ? g.balance : (g.balance ? parseFloat(g.balance) : 0);
                                const initialValue = (typeof g.initial_value === 'number') ? g.initial_value : (g.initial_value ? parseFloat(g.initial_value) : null);
                                const expiresAt = g.expires_at ? new Date(g.expires_at).toISOString() : null;
                                const isExpired = expiresAt ? (new Date() > new Date(expiresAt)) : false;
                                return res.status(200).json({
                                    valid: !isExpired,
                                    code: g.code,
                                    giftcardId: g.id,
                                    balance: Number(balance),
                                    initialValue: initialValue !== null ? Number(initialValue) : null,
                                    expiresAt,
                                    status: isExpired ? 'expired' : 'active',
                                    metadata: g.metadata || {},
                                    request: reqCamel
                                });
                            }
                        } catch (e) {
                            console.warn('Error resolving issuedCode for approved request:', e);
                        }
                        // If we fallthrough, we'll still inform UI the request is approved and include issuedCode
                        return res.status(200).json({ valid: false, reason: 'approved_request_has_issued_code', issuedCode, request: reqCamel });
                    }

                    // generic case: return request info and its status so UI can show a tailored message
                    return res.status(200).json({ valid: false, reason: 'request_found', request: reqCamel });
                }

                return res.status(404).json({ valid: false, reason: 'not_found' });
            } catch (err) {
                console.error('validateGiftcard error:', err);
                return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
            }
        }
        
        case 'createGiftcardHold': {
            // Create a temporary hold on a giftcard balance to avoid double-spend.
            // Rate limit: 5 requests/minuto por IP
            if (!checkRateLimit(req, res, 'ip')) {
                return; // checkRateLimit ya envió la respuesta 429
            }
            
            // Body params: code (giftcard code) OR giftcardId, amount (numeric), bookingTempRef (string), ttlMinutes (optional)
            const body = req.body || {};
            const amount = body.amount !== undefined ? Number(body.amount) : null;
            const ttlMinutes = Number(body.ttlMinutes || 15);
            const bookingTempRef = body.bookingTempRef || body.booking_temp_ref || null;
            const code = body.code || null;
            const giftcardId = body.giftcardId || body.giftcard_id || null;

            console.log('[createGiftcardHold] Request:', { code, giftcardId, amount: body.amount, amountParsed: amount });

            if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'amount is required and must be > 0' });
            if (!code && !giftcardId) return res.status(400).json({ success: false, error: 'code or giftcardId is required' });

            try {
                // Use a transaction + row-level lock to avoid race conditions where
                // two concurrent requests read the same balance and both create holds
                // that together exceed the available amount.
                await sql`BEGIN`;

                // Find giftcard by code or id and lock the row
                let giftcardRow: any = null;
                if (code) {
                    const { rows: gRows } = await sql`SELECT * FROM giftcards WHERE code = ${code} LIMIT 1 FOR UPDATE`;
                    giftcardRow = gRows && gRows.length > 0 ? gRows[0] : null;
                } else {
                    const { rows: gRows } = await sql`SELECT * FROM giftcards WHERE id = ${giftcardId} LIMIT 1 FOR UPDATE`;
                    giftcardRow = gRows && gRows.length > 0 ? gRows[0] : null;
                }

                if (!giftcardRow) {
                    await sql`ROLLBACK`;
                    return res.status(404).json({ success: false, error: 'giftcard_not_found' });
                }

                const gid = String(giftcardRow.id);
                const balance = (typeof giftcardRow.balance === 'number') ? Number(giftcardRow.balance) : (giftcardRow.balance ? Number(giftcardRow.balance) : 0);

                console.log('[createGiftcardHold] Giftcard (locked):', { id: gid, balance, balanceType: typeof giftcardRow.balance });

                // LIMPIEZA AGRESIVA: Eliminar TODOS los holds previos de esta giftcard para esta sesión
                // Esto garantiza que no queden holds huérfanos de intentos previos
                let deletedHolds = 0;
                if (bookingTempRef) {
                    // Con booking_temp_ref: PRIORIDAD a limpiar todos los holds de esta sesión primero
                    const { rowCount: sessionDeleted } = await sql`
                        DELETE FROM giftcard_holds
                        WHERE giftcard_id = ${gid} AND booking_temp_ref = ${bookingTempRef}
                    `;
                    console.log('[createGiftcardHold] Deleted session holds:', sessionDeleted);
                    
                    // Luego limpiar todos los expirados de cualquier sesión
                    const { rowCount: expiredDeleted } = await sql`
                        DELETE FROM giftcard_holds
                        WHERE giftcard_id = ${gid} AND expires_at <= NOW()
                    `;
                    deletedHolds = (sessionDeleted || 0) + (expiredDeleted || 0);
                    console.log('[createGiftcardHold] Total cleaned:', { session: sessionDeleted, expired: expiredDeleted, total: deletedHolds });
                } else {
                    // Sin booking_temp_ref: solo limpiar expirados
                    const { rowCount } = await sql`
                        DELETE FROM giftcard_holds
                        WHERE giftcard_id = ${gid} AND expires_at <= NOW()
                    `;
                    deletedHolds = rowCount || 0;
                    console.log('[createGiftcardHold] Cleaned expired holds:', deletedHolds);
                }

                // Sum active holds for this giftcard (inside the same transaction)
                const { rows: [holdSumRow] } = await sql`
                    SELECT COALESCE(SUM(amount), 0) AS total_holds
                    FROM giftcard_holds
                    WHERE giftcard_id = ${gid} AND expires_at > NOW()
                `;
                const totalHolds = holdSumRow ? Number(holdSumRow.total_holds) : 0;
                const available = Number(balance) - Number(totalHolds);

                console.log('[createGiftcardHold] Calculation (transactional):', { balance, totalHolds, available, requestedAmount: amount, sufficient: available >= amount });

                if (available < Number(amount)) {
                    console.log('[createGiftcardHold] INSUFFICIENT FUNDS:', { available, balance, requested: amount });
                    await sql`ROLLBACK`;
                    return res.status(400).json({ success: false, error: 'insufficient_funds', available, balance });
                }

                // Insert hold with TTL
                const { rows: [inserted] } = await sql`
                    INSERT INTO giftcard_holds (id, giftcard_id, amount, booking_temp_ref, expires_at)
                    VALUES (uuid_generate_v4(), ${gid}, ${amount}, ${bookingTempRef}, NOW() + (${ttlMinutes} * INTERVAL '1 minute'))
                    RETURNING *
                `;

                // Best-effort audit insert (don't fail the whole operation if audit not available)
                try {
                    await sql`
                        INSERT INTO giftcard_audit (id, giftcard_id, event_type, amount, booking_temp_ref, metadata, created_at)
                        VALUES (uuid_generate_v4(), ${gid}, 'hold_created', ${amount}, ${bookingTempRef}, ${JSON.stringify({ source: 'createGiftcardHold' })}::jsonb, NOW())
                    `;
                } catch (auditErr) {
                    console.warn('[createGiftcardHold] audit insert failed (continuing):', auditErr);
                }

                await sql`COMMIT`;

                console.log('[createGiftcardHold] Hold created:', inserted.id);
                return res.status(200).json({ success: true, hold: toCamelCase(inserted), available: Number(available) - Number(amount), balance });
            } catch (err) {
                try { await sql`ROLLBACK`; } catch (rbErr) { console.warn('rollback failed after createGiftcardHold error', rbErr); }
                console.error('createGiftcardHold error:', err);
                return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
            }
        }
        case 'listGiftcardRequests': {
            // Devuelve todas las solicitudes de giftcard
            try {
                console.log('[listGiftcardRequests] 🔍 Iniciando listado de giftcards...');
                await sql`
                    CREATE TABLE IF NOT EXISTS giftcard_requests (
                        id SERIAL PRIMARY KEY,
                        buyer_name VARCHAR(100) NOT NULL,
                        buyer_email VARCHAR(100) NOT NULL,
                        recipient_name VARCHAR(100) NOT NULL,
                        recipient_email VARCHAR(100),
                        recipient_whatsapp VARCHAR(30),
                        amount NUMERIC NOT NULL,
                        code VARCHAR(32) NOT NULL,
                        status VARCHAR(20) DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT NOW(),
                        send_method VARCHAR(20),
                        scheduled_send_at TIMESTAMP
                    )
                `;
                // FORZAR creación de columnas con manejo de errores individual
                console.log('[listGiftcardRequests] Verificando columnas send_method y scheduled_send_at...');
                
                try {
                    await sql`ALTER TABLE giftcard_requests ADD COLUMN send_method VARCHAR(20)`;
                    console.log('[listGiftcardRequests] ✅ Columna send_method creada');
                } catch (e: any) {
                    if (e.message?.includes('already exists')) {
                        console.log('[listGiftcardRequests] ℹ️ Columna send_method ya existe');
                    } else {
                        console.warn('[listGiftcardRequests] ⚠️ Error creando send_method:', e.message);
                    }
                }
                
                try {
                    await sql`ALTER TABLE giftcard_requests ADD COLUMN scheduled_send_at TIMESTAMP`;
                    console.log('[listGiftcardRequests] ✅ Columna scheduled_send_at creada');
                } catch (e: any) {
                    if (e.message?.includes('already exists')) {
                        console.log('[listGiftcardRequests] ℹ️ Columna scheduled_send_at ya existe');
                    } else {
                        console.warn('[listGiftcardRequests] ⚠️ Error creando scheduled_send_at:', e.message);
                    }
                }
                
                console.log('[listGiftcardRequests] ✅ Verificación de columnas completada');
                
                const { rows } = await sql`SELECT * FROM giftcard_requests WHERE COALESCE(status, '') <> 'deleted' ORDER BY created_at DESC`;
                console.log(`[listGiftcardRequests] 📊 Se encontraron ${rows.length} giftcards`);
                
                // Verificar columnas disponibles
                if (rows.length > 0) {
                    console.log('[listGiftcardRequests] 🔑 Columnas disponibles:', Object.keys(rows[0]));
                }
                
                // Query específico para verificar el giftcard más reciente con scheduling
                const { rows: recentRows } = await sql`
                    SELECT id, code, buyer_name, recipient_name, send_method, scheduled_send_at, created_at 
                    FROM giftcard_requests 
                    WHERE id >= 115 
                    ORDER BY id DESC 
                    LIMIT 1
                `;
                if (recentRows.length > 0) {
                    console.log('[listGiftcardRequests] 🔍 Giftcard ID 115+ verificado directamente:', {
                        id: recentRows[0].id,
                        code: recentRows[0].code,
                        recipientName: recentRows[0].recipient_name,
                        send_method: recentRows[0].send_method,
                        scheduled_send_at: recentRows[0].scheduled_send_at,
                        created_at: recentRows[0].created_at
                    });
                }
                
                if (rows.length > 0) {
                    console.log('[listGiftcardRequests] Primer giftcard RAW:', {
                        id: rows[0].id,
                        code: rows[0].code,
                        send_method: rows[0].send_method,
                        scheduled_send_at: rows[0].scheduled_send_at,
                        has_send_method_column: 'send_method' in rows[0],
                        has_scheduled_column: 'scheduled_send_at' in rows[0]
                    });
                    console.log('[listGiftcardRequests] Primer giftcard (formatted keys):', {
                        id: rows[0].id,
                        code: rows[0].code,
                        sendMethod: rows[0].send_method,
                        scheduledSendAt: rows[0].scheduled_send_at
                    });
                }
                // Formatear a camelCase y parsear tipos
                const formatted = rows.map(row => ({
                    id: String(row.id),
                    buyerName: row.buyer_name,
                    buyerEmail: row.buyer_email,
                    recipientName: row.recipient_name,
                    recipientEmail: row.recipient_email || '',
                    recipientWhatsapp: row.recipient_whatsapp || '',
                    amount: typeof row.amount === 'number' ? row.amount : parseFloat(row.amount),
                    code: row.code,
                    status: row.status,
                    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
                    sendMethod: row.send_method || null,
                    scheduledSendAt: row.scheduled_send_at ? new Date(row.scheduled_send_at).toISOString() : null,
                    // Include metadata so admin UI can surface issued codes, voucher URLs, etc.
                    metadata: row.metadata || null
                }));
                console.log('[listGiftcardRequests] ✅ Retornando giftcards formateados');
                return res.status(200).json(formatted);
            } catch (error) {
                console.error('Error al listar giftcards:', error);
                return res.status(500).json([]);
            }
        }
        case 'approveGiftcardRequest': {
            // Admin action: mark request as approved and insert audit event
            // Rate limit: 5 requests/minuto por IP
            if (!checkRateLimit(req, res, 'ip')) {
                return; // checkRateLimit ya envió la respuesta 429
            }
            const body = req.body || {};
            const id = body.id;
            const adminUser = req.headers['x-admin-user'] || body.adminUser || null;
            if (!id || !adminUser) return res.status(400).json({ success: false, error: 'id and adminUser are required.' });
            try {
                await sql`BEGIN`;

                // Mark request as approved and add basic metadata
                const { rows: [updated] } = await sql`
                    UPDATE giftcard_requests SET status = 'approved', approved_by = ${String(adminUser)}, approved_at = NOW(), metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ approvedBy: adminUser })}::jsonb WHERE id = ${id} RETURNING *;
                `;

                // Insert approval event
                await sql`
                    INSERT INTO giftcard_events (giftcard_request_id, event_type, admin_user, note, metadata)
                    VALUES (${id}, 'approved', ${String(adminUser)}, ${body.note || null}, ${body.metadata ? JSON.stringify(body.metadata) : null});
                `;

                // Issue giftcard assets (code, QR, PDF) and persist giftcard record
                // Generate unique code: GC- + 6 base36 chars (uppercase)
                const generateCode = () => {
                    const part = Math.random().toString(36).slice(2, 8).toUpperCase();
                    return `GC-${part}`;
                };

                // Ensure giftcards table exists and has required columns (safe, idempotent)
                try {
                    await sql`CREATE TABLE IF NOT EXISTS giftcards (
                        id SERIAL PRIMARY KEY,
                        code VARCHAR(32) NOT NULL UNIQUE,
                        created_at TIMESTAMP DEFAULT NOW()
                    )`;
                } catch (e) {
                    console.warn('Could not create giftcards table (it may already exist):', e);
                }

                // Add missing columns if they don't exist to avoid "column does not exist" errors
                try {
                    await sql`ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS initial_value NUMERIC`;
                    await sql`ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS balance NUMERIC`;
                    await sql`ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS giftcard_request_id INTEGER`;
                    await sql`ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP`;
                    await sql`ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS metadata JSONB`;
                    await sql`ALTER TABLE giftcards ADD COLUMN IF NOT EXISTS value NUMERIC`;
                    // Ensure id column has a sequence/default only if id is integer-type
                    try {
                        const { rows: [colInfo] } = await sql`
                            SELECT udt_name FROM information_schema.columns
                            WHERE table_name = 'giftcards' AND column_name = 'id'
                        `;
                        const idType = colInfo ? colInfo.udt_name : null;
                        if (idType === 'int4' || idType === 'int8' || idType === 'int2') {
                            await sql`CREATE SEQUENCE IF NOT EXISTS giftcards_id_seq`;
                            await sql`ALTER TABLE giftcards ALTER COLUMN id SET DEFAULT nextval('giftcards_id_seq')`;
                            await sql`ALTER SEQUENCE giftcards_id_seq OWNED BY giftcards.id`;
                            // Safely compute max id as bigint
                            const { rows: [r] } = await sql`SELECT MAX(id) as max_id FROM giftcards`;
                            const maxId = r && r.max_id ? Number(r.max_id) : 0;
                            const next = maxId + 1;
                            await sql`SELECT setval('giftcards_id_seq', ${next}, false)`;
                        } else {
                            console.warn('Skipping giftcards id sequence setup: id column is not integer type:', idType);
                        }
                    } catch (seqErr) {
                        console.warn('Failed to ensure giftcards id sequence/default:', seqErr);
                    }
                } catch (e) {
                    console.warn('Error ensuring giftcards columns exist:', e);
                }

                // Load helpers dynamically to avoid load errors in tests when env not configured
                // S3 and QR modules removed to reduce serverless function count
                let s3Module: any = null;
                let qrModule: any = null;
                let pdfModule: any = null;
                // S3 module no longer available
                // try {
                //     s3Module = await import('./s3.js');
                // } catch (e) {
                //     // ignore
                // }
                // QR module no longer available
                // try {
                //     qrModule = await import('./qr.js');
                // } catch (e) {}
                try {
                    pdfModule = await import('./pdf.js');
                } catch (e) {}

                // Prepare buyer and recipient info for NOT NULL constraints
                const buyerInfo = JSON.stringify({
                    name: updated.buyer_name || updated.buyerName || '',
                    email: updated.buyer_email || updated.buyerEmail || ''
                });
                const recipientInfo = JSON.stringify({
                    name: updated.recipient_name || updated.recipientName || '',
                    email: updated.recipient_email || updated.recipientEmail || ''
                });

                // Generate code and attempt to insert (retry if collision)
                let code = generateCode();
                let issuedGiftcard: any = null;
                for (let attempt = 0; attempt < 4; attempt++) {
                    try {
                        // Single unified INSERT with ALL required fields for production DB
                        const { rows: [giftcardRow] } = await sql`
                            INSERT INTO giftcards (
                                code, value, balance, initial_value, status,
                                giftcard_request_id, expires_at, metadata,
                                buyer_info, recipient_info
                            )
                            VALUES (
                                ${code}, 
                                ${updated.amount}, 
                                ${updated.amount}, 
                                ${updated.amount},
                                'active',
                                ${id}, 
                                NOW() + INTERVAL '3 months', 
                                ${JSON.stringify({ issuedBy: adminUser })}::jsonb,
                                ${buyerInfo}::jsonb,
                                ${recipientInfo}::jsonb
                            )
                            RETURNING *;
                        `;
                        issuedGiftcard = giftcardRow;
                        break;
                    } catch (err: any) {
                        // If unique constraint violated, generate a new code and retry
                        console.warn('Giftcard code insert failed, retrying with new code:', err && err.message ? err.message : String(err));
                        code = generateCode();
                    }
                }

                // If insert still failed, log warning but proceed with email delivery
                if (!issuedGiftcard) {
                    console.warn('[API][approveGiftcardRequest] Failed to persist giftcard after all retries for code:', code);
                }

                // Regardless of whether we created a DB giftcard, if not created we will still attempt to send emails using the generated code
                if (!issuedGiftcard) {
                    console.warn('Proceeding without persisted giftcard record; will send best-effort emails to buyer/recipient with code:', code);
                }

                // Generate QR and PDF and upload to S3 (best-effort) — try even if issuedGiftcard is missing
                const baseUrl = process.env.APP_BASE_URL || (req.headers.host ? `https://${req.headers.host}` : '');
                const redeemUrl = baseUrl ? `${baseUrl}/giftcard/redeem?code=${encodeURIComponent(code)}` : `code:${code}`;

                let qrS3Url: string | null = null;
                let pdfS3Url: string | null = null;
                let localPdfBuffer: Buffer | undefined;
                try {
                    let qrBuffer: Buffer | undefined;
                    if (qrModule && qrModule.generateQrPngBuffer) {
                        qrBuffer = await qrModule.generateQrPngBuffer(redeemUrl, 400);
                    }

                    // Use localPdfBuffer for the generated PDF
                    if (pdfModule && pdfModule.generateVoucherPdfBuffer) {
                        localPdfBuffer = await pdfModule.generateVoucherPdfBuffer({
                            buyerName: updated.buyer_name || updated.buyerName,
                            recipientName: updated.recipient_name || updated.recipientName,
                            amount: Number(updated.amount),
                            code,
                            note: body.note || '' ,
                            qrPngBuffer: qrBuffer
                        });
                    }

                    if (s3Module && s3Module.uploadBufferToS3) {
                        if (qrBuffer) {
                            const qrKey = s3Module.generateS3Key('giftcards', `qr-${code}.png`);
                            const maybe = await s3Module.uploadBufferToS3(qrKey, qrBuffer, 'image/png');
                            qrS3Url = maybe;
                        }
                        if (localPdfBuffer) {
                            const pdfKey = s3Module.generateS3Key('giftcards', `voucher-${code}.pdf`);
                            const maybePdf = await s3Module.uploadBufferToS3(pdfKey, localPdfBuffer, 'application/pdf');
                            pdfS3Url = maybePdf;
                        }
                    }
                } catch (assetErr) {
                    console.warn('Failed generating/uploading giftcard assets:', assetErr);
                }

                // Prepare metaPatch for DB (include asset URLs if we have them and issued code)
                const metaPatch: any = { issuedCode: code };
                if (issuedGiftcard) metaPatch.issuedGiftcardId = issuedGiftcard.id;
                if (qrS3Url) metaPatch.qrUrl = qrS3Url;
                if (pdfS3Url) metaPatch.voucherUrl = pdfS3Url;

                // Persist asset metadata if giftcard row exists
                try {
                    if (issuedGiftcard) {
                        await sql`
                            UPDATE giftcard_requests SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(metaPatch)}::jsonb WHERE id = ${id}
                        `;
                        await sql`
                            UPDATE giftcards SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(metaPatch)}::jsonb WHERE id = ${issuedGiftcard.id}
                        `;
                    } else {
                        // Update request metadata with issuedCode even if giftcard record missing
                        await sql`
                            UPDATE giftcard_requests SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(metaPatch)}::jsonb WHERE id = ${id}
                        `;
                    }
                } catch (persistErr) {
                    console.warn('Failed to persist giftcard metadata:', persistErr);
                }


                // 📧 LÓGICA DE EMAILS MEJORADA:
                // - SIEMPRE enviar email al buyer confirmando aprobación (y fecha de envío si hay programación)
                // - NUNCA enviar email al recipient en este punto (se envía con sendGiftcardNow)
                let buyerEmailResult: any = null;
                try {
                    const emailServiceModule = await import('./emailService.js');
                    const buyerEmail = updated.buyer_email || updated.buyerEmail;
                    const buyerName = updated.buyer_name || updated.buyerName;
                    
                    if (buyerEmail) {
                        try {
                            // Obtener fecha de programación si existe
                            const scheduledSendAt = updated.scheduled_send_at || updated.scheduledSendAt;
                            const sendMethod = updated.send_method || updated.sendMethod;
                            const buyerMessage = updated.buyer_message || updated.buyerMessage || '';
                            
                            // Construir información de programación (separada del mensaje del comprador)
                            let schedulingInfo = '';
                            
                            if (scheduledSendAt) {
                              const scheduledDate = new Date(scheduledSendAt);
                              const localDate = new Date(scheduledDate.getTime() - (5 * 60 * 60 * 1000)); // Convertir a local UTC-5
                              const timeStr = localDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                              schedulingInfo = `Será enviada el ${localDate.toLocaleDateString('es-ES')} a las ${timeStr} vía ${sendMethod === 'whatsapp' ? 'WhatsApp' : 'Email'}.`;
                            } else {
                              schedulingInfo = `Será enviada inmediatamente.`;
                            }
                            
                            buyerEmailResult = await emailServiceModule.sendGiftcardPaymentConfirmedEmail(
                                buyerEmail,
                                {
                                    buyerName,
                                    amount: Number(updated.amount),
                                    code,
                                    recipientName: updated.recipient_name || updated.recipientName,
                                    recipientEmail: updated.recipient_email || updated.recipientEmail,
                                    message: buyerMessage,
                                    schedulingInfo: schedulingInfo
                                }
                            );
                        } catch (e) {
                            console.warn('Buyer confirmation email send failed:', e);
                            buyerEmailResult = { sent: false, error: e instanceof Error ? e.message : String(e) };
                        }
                    }
                    
                    // Persist email result metadata to request
                    try {
                        const emailMeta = { buyer: buyerEmailResult };
                        await sql`
                            UPDATE giftcard_requests SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ emailDelivery: emailMeta })}::jsonb WHERE id = ${id}
                        `;
                    } catch (metaErr) {
                        console.warn('Failed to persist email delivery metadata:', metaErr);
                    }
                } catch (emailErr) {
                    console.warn('Failed to send buyer confirmation email:', emailErr);
                }

                await sql`COMMIT`;
                const responsePayload: any = { success: true, request: toCamelCase(updated) };
                if (issuedGiftcard) responsePayload.giftcard = toCamelCase(issuedGiftcard);
                return res.status(200).json(responsePayload);
            } catch (error) {
                await sql`ROLLBACK`;
                console.error('approveGiftcardRequest error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }

        case 'rejectGiftcardRequest': {
            const body = req.body || {};
            const id = body.id;
            const adminUser = req.headers['x-admin-user'] || body.adminUser || null;
            if (!id || !adminUser) return res.status(400).json({ success: false, error: 'id and adminUser are required.' });
            try {
                await sql`BEGIN`;
                const { rows: [updated] } = await sql`
                    UPDATE giftcard_requests SET status = 'rejected', rejected_by = ${String(adminUser)}, rejected_at = NOW(), metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ rejectedBy: adminUser })}::jsonb WHERE id = ${id} RETURNING *;
                `;
                await sql`
                    INSERT INTO giftcard_events (giftcard_request_id, event_type, admin_user, note, metadata)
                    VALUES (${id}, 'rejected', ${String(adminUser)}, ${body.note || null}, ${body.metadata ? JSON.stringify(body.metadata) : null});
                `;
                await sql`COMMIT`;
                return res.status(200).json({ success: true, request: toCamelCase(updated) });
            } catch (error) {
                await sql`ROLLBACK`;
                console.error('rejectGiftcardRequest error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }
        
        case 'deleteGiftcardRequest': {
            const body = req.body || {};
            const id = body.id;
            const adminUser = req.headers['x-admin-user'] || body.adminUser || null;
            if (!id || !adminUser) return res.status(400).json({ success: false, error: 'id and adminUser are required.' });
            try {
                await sql`BEGIN`;
                const { rows: [updated] } = await sql`
                    UPDATE giftcard_requests SET status = 'deleted', deleted_by = ${String(adminUser)}, deleted_at = NOW(), metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ deletedBy: adminUser })}::jsonb WHERE id = ${id} RETURNING *;
                `;
                await sql`
                    INSERT INTO giftcard_events (giftcard_request_id, event_type, admin_user, note, metadata)
                    VALUES (${id}, 'deleted', ${String(adminUser)}, ${body.note || null}, ${body.metadata ? JSON.stringify(body.metadata) : null});
                `;
                await sql`COMMIT`;
                return res.status(200).json({ success: true, request: toCamelCase(updated) });
            } catch (error) {
                await sql`ROLLBACK`;
                console.error('deleteGiftcardRequest error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }

        case 'hardDeleteGiftcardRequest': {
            const body = req.body || {};
            const id = body.id;
            const adminUser = req.headers['x-admin-user'] || body.adminUser || null;
            if (!id || !adminUser) return res.status(400).json({ success: false, error: 'id and adminUser are required.' });
            try {
                await sql`BEGIN`;
                // Insert event recording the impending hard delete
                await sql`
                    INSERT INTO giftcard_events (giftcard_request_id, event_type, admin_user, note, metadata)
                    VALUES (${id}, 'hard_deleted', ${String(adminUser)}, ${body.note || null}, ${body.metadata ? JSON.stringify(body.metadata) : null});
                `;
                // Perform delete
                await sql`DELETE FROM giftcard_requests WHERE id = ${id}`;
                await sql`COMMIT`;
                return res.status(200).json({ success: true, deletedId: id });
            } catch (error) {
                await sql`ROLLBACK`;
                console.error('hardDeleteGiftcardRequest error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }

        case 'sendGiftcardNow': {
            // Admin action: send giftcard NOW (override scheduling)
            // Envía la giftcard al recipient ignorando la programación
            const body = req.body || {};
            const requestId = body.requestId;
            
            if (!requestId) {
                return res.status(400).json({ success: false, error: 'requestId is required' });
            }
            
            try {
                // Fetch the giftcard request
                const { rows: [request] } = await sql`
                    SELECT * FROM giftcard_requests WHERE id = ${requestId}
                `;
                
                if (!request) {
                    return res.status(404).json({ success: false, error: 'Giftcard request not found' });
                }

                if (request.status !== 'approved') {
                    return res.status(400).json({ success: false, error: 'Giftcard must be approved before sending' });
                }
                
                const emailService = await import('./emailService.js');
                const issuedCode = request.metadata?.issued_code || request.metadata?.issuedCode || request.code;
                
                // Send based on send_method
                if (request.send_method === 'whatsapp') {
                    // Send via WhatsApp - create a wa.me link with the giftcard info
                    const recipientPhone = request.recipient_whatsapp;
                    const message = `Hola ${request.recipient_name}, tu giftcard de $${request.amount} ha sido aprobada.%0A%0ACódigo: ${issuedCode || request.code}%0AMonto: USD $${Number(request.amount).toFixed(2)}%0AValidez: 3 meses desde la fecha de emisión%0A%0AContáctanos por WhatsApp para redimirla.`;
                    
                    // Log the wa.me link (in real implementation, you'd send this via API or webhook)
                    const waLink = `https://wa.me/${recipientPhone}?text=${message}`;
                    console.log('[sendGiftcardNow] WhatsApp link for manual send:', waLink);
                    console.log('[sendGiftcardNow] WhatsApp recipient:', recipientPhone);
                    
                    // For now, mark as sent and store the wa.me link
                    await sql`
                        UPDATE giftcard_requests 
                        SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ 
                            whatsapp_sent_at: new Date().toISOString(),
                            whatsapp_link: waLink,
                            whatsapp_phone: recipientPhone
                        })}::jsonb
                        WHERE id = ${requestId}
                    `;
                    
                    console.log('[sendGiftcardNow] ✅ WhatsApp link generado para:', recipientPhone);
                } else {
                    // Send via email to recipient (NOW, regardless of scheduling)
                    if (request.recipient_email) {
                        await emailService.sendGiftcardRecipientEmail(request.recipient_email, {
                            recipientName: request.recipient_name,
                            amount: request.amount,
                            code: issuedCode || request.code,
                            message: request.buyer_message || '',
                            buyerName: request.buyer_name
                        });
                        
                        console.log('[sendGiftcardNow] ✅ Email enviado a recipient:', request.recipient_email);
                    }
                    
                    // Mark as sent in metadata
                    await sql`
                        UPDATE giftcard_requests 
                        SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ 
                            emailDelivery: {
                                recipient: { sent: true, sentAt: new Date().toISOString() }
                            }
                        })}::jsonb
                        WHERE id = ${requestId}
                    `;
                }
                
                console.log('[sendGiftcardNow] Giftcard sent successfully:', requestId);
                return res.status(200).json({ success: true, message: 'Giftcard sent successfully' });
            } catch (error) {
                console.error('[sendGiftcardNow] Error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }
        
        case 'createGiftcardManual': {
            // Admin panel: crear giftcard manualmente sin pasar por solicitud
            // Rate limit: 5 requests/minuto por IP
            if (!checkRateLimit(req, res, 'ip')) {
                return;
            }
            
            const body = req.body || {};
            const adminUser = req.headers['x-admin-user'] || body.adminUser || 'unknown';
            
            // Validaciones
            if (!body.buyerName || !body.buyerEmail || !body.recipientName || !body.amount) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'buyerName, buyerEmail, recipientName, amount son requeridos' 
                });
            }
            
            if (typeof body.amount !== 'number' || body.amount < 10 || body.amount > 500) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'amount debe estar entre $10 y $500' 
                });
            }
            
            try {
                // Generar código único
                let code = generateGiftcardCode();
                let attempts = 0;
                const maxAttempts = 5;
                
                // Asegurar que el código sea único
                while (attempts < maxAttempts) {
                    const { rows: existing } = await sql`SELECT id FROM giftcards WHERE code = ${code} LIMIT 1`;
                    if (!existing || existing.length === 0) {
                        break; // Código único encontrado
                    }
                    code = generateGiftcardCode();
                    attempts++;
                }
                
                if (attempts >= maxAttempts) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'No se pudo generar código único después de varios intentos' 
                    });
                }
                
                await sql`BEGIN`;
                
                // 1. Crear tabla si no existe
                await sql`
                    CREATE TABLE IF NOT EXISTS giftcard_requests (
                        id SERIAL PRIMARY KEY,
                        buyer_name VARCHAR(100) NOT NULL,
                        buyer_email VARCHAR(100) NOT NULL,
                        recipient_name VARCHAR(100) NOT NULL,
                        recipient_email VARCHAR(100),
                        recipient_whatsapp VARCHAR(30),
                        amount NUMERIC NOT NULL,
                        code VARCHAR(32) NOT NULL,
                        status VARCHAR(20) DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT NOW(),
                        buyer_message TEXT,
                        approved_by VARCHAR(100),
                        approved_at TIMESTAMP,
                        metadata JSONB
                    )
                `;
                
                // 2. Crear solicitud con status 'manual' (bypass approval)
                const { rows: [request] } = await sql`
                    INSERT INTO giftcard_requests (
                        buyer_name, buyer_email, recipient_name, recipient_email, 
                        recipient_whatsapp, amount, code, status, approved_by, 
                        approved_at, metadata
                    ) VALUES (
                        ${body.buyerName},
                        ${body.buyerEmail},
                        ${body.recipientName},
                        ${body.recipientEmail || null},
                        ${body.recipientWhatsapp || null},
                        ${body.amount},
                        ${code},
                        'approved',
                        ${String(adminUser)},
                        NOW(),
                        ${JSON.stringify({ 
                            createdManually: true,
                            createdBy: adminUser,
                            createdAt: new Date().toISOString()
                        })}
                    )
                    RETURNING id, created_at
                `;
                
                // 3. Crear tabla giftcards si no existe
                await sql`
                    CREATE TABLE IF NOT EXISTS giftcards (
                        id SERIAL PRIMARY KEY,
                        code VARCHAR(32) NOT NULL UNIQUE,
                        initial_value NUMERIC,
                        balance NUMERIC,
                        giftcard_request_id INTEGER,
                        expires_at TIMESTAMP,
                        metadata JSONB,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                `;
                
                // 4. Crear giftcard emitida
                const { rows: [giftcard] } = await sql`
                    INSERT INTO giftcards (
                        code, initial_value, balance, giftcard_request_id, 
                        expires_at, metadata
                    ) VALUES (
                        ${code},
                        ${body.amount},
                        ${body.amount},
                        ${request.id},
                        NOW() + INTERVAL '3 months',
                        ${JSON.stringify({ 
                            createdManually: true,
                            createdBy: adminUser
                        })}
                    )
                    RETURNING id, code, balance, expires_at
                `;
                
                // 5. Crear tabla eventos si no existe
                await sql`
                    CREATE TABLE IF NOT EXISTS giftcard_events (
                        id SERIAL PRIMARY KEY,
                        giftcard_request_id INTEGER,
                        event_type VARCHAR(50),
                        admin_user VARCHAR(100),
                        note TEXT,
                        metadata JSONB,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                `;
                
                // 6. Registrar evento
                await sql`
                    INSERT INTO giftcard_events (
                        giftcard_request_id, event_type, admin_user, 
                        note, metadata
                    ) VALUES (
                        ${request.id},
                        'created_manually',
                        ${String(adminUser)},
                        'Giftcard creada manualmente desde admin panel',
                        ${JSON.stringify({ code, amount: body.amount })}
                    )
                `;
                
                await sql`COMMIT`;
                
                // 7. Enviar emails
                try {
                    // Email al comprador
                    await emailService.sendGiftcardPaymentConfirmedEmail(
                        body.buyerEmail,
                        {
                            buyerName: body.buyerName,
                            recipientName: body.recipientName,
                            amount: body.amount,
                            code: code,
                            recipientEmail: body.recipientEmail || undefined,
                            message: body.message || ''
                        }
                    );
                    
                    // Email al destinatario (si tiene)
                    if (body.recipientEmail) {
                        await emailService.sendGiftcardRecipientEmail(
                            body.recipientEmail,
                            {
                                code: code,
                                amount: body.amount,
                                message: body.message || '',
                                buyerName: body.buyerName,
                                recipientName: body.recipientName
                            }
                        );
                    }
                } catch (emailError) {
                    console.warn('Error enviando emails de giftcard manual:', emailError);
                    // No retornar error - giftcard se creó ok
                }
                
                return res.status(200).json({
                    success: true,
                    giftcard: {
                        id: giftcard.id,
                        code: giftcard.code,
                        balance: Number(giftcard.balance),
                        expiresAt: giftcard.expires_at,
                        requestId: request.id
                    },
                    message: `Giftcard ${code} creada exitosamente`
                });
                
            } catch (error) {
                await sql`ROLLBACK`;
                console.error('createGiftcardManual error:', error);
                return res.status(500).json({ 
                    success: false, 
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        }
        
        case 'sendTestEmail': {
            // Lightweight test email sender to validate RESEND_API_KEY and EMAIL_FROM at runtime
            const body = req.body || {};
            const to = body.to;
            const type = body.type || 'test';
            if (!to || typeof to !== 'string') return res.status(400).json({ success: false, error: 'to email is required' });
            try {
                const emailModule = await import('./emailService.js');
                const code = body.code || 'TEST-CODE';
                const amount = typeof body.amount === 'number' ? body.amount : (body.amount ? Number(body.amount) : 0);
                const buyerName = body.name || 'Cliente de Prueba';
                let pdfBase64: string | undefined = undefined;
                let downloadLink: string | undefined = undefined;
                if (body.pdfBase64) pdfBase64 = body.pdfBase64;
                if (body.downloadLink) downloadLink = body.downloadLink;

                // Use the same giftcard email logic depending on 'type'
                if (type === 'recipient') {
                    await emailModule.sendGiftcardRecipientEmail(to, { recipientName: buyerName, amount, code, message: body.message || '' }, pdfBase64, downloadLink);
                } else {
                    await emailModule.sendGiftcardPaymentConfirmedEmail(to, { buyerName, amount, code }, pdfBase64, downloadLink);
                }

                return res.status(200).json({ success: true, sentTo: to });
            } catch (err) {
                console.error('sendTestEmail failed:', err);
                return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
            }
        }
        case 'attachGiftcardProof': {
            // Attach proof URL to giftcard request and insert event
            const body = req.body || {};
            const id = body.id;
            const proofUrl = body.proofUrl;
            const adminUser = req.headers['x-admin-user'] || body.adminUser || null;
            if (!id || !proofUrl || !adminUser) return res.status(400).json({ success: false, error: 'id, proofUrl and adminUser are required.' });
            try {
                await sql`BEGIN`;
                const { rows: [updated] } = await sql`
                    UPDATE giftcard_requests SET payment_proof_url = ${proofUrl}, metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ proofUrl })}::jsonb WHERE id = ${id} RETURNING *;
                `;
                await sql`
                    INSERT INTO giftcard_events (giftcard_request_id, event_type, admin_user, note, metadata)
                    VALUES (${id}, 'attached_proof', ${String(adminUser)}, ${body.note || null}, ${body.metadata ? JSON.stringify(body.metadata) : null});
                `;
                await sql`COMMIT`;
                return res.status(200).json({ success: true, request: toCamelCase(updated) });
            } catch (error) {
                await sql`ROLLBACK`;
                console.error('attachGiftcardProof error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }
        case 'repairMissingGiftcards': {
            // Scan approved giftcard_requests with metadata.issuedCode but no giftcards row, and insert missing giftcards.
            const body = req.body || {};
            const dryRun = !!body.dryRun;
            const limit = body.limit ? Number(body.limit) : 200;
            try {
                console.debug('[API] repairMissingGiftcards called, dryRun=', dryRun, 'limit=', limit);

                // Find approved requests with issuedCode
                const { rows: reqRows } = await sql`
                    SELECT id, amount, metadata
                    FROM giftcard_requests
                    WHERE status = 'approved' AND (metadata->>'issuedCode') IS NOT NULL
                    ORDER BY created_at DESC
                `;

                const candidates: Array<{ id: any; issuedCode: string; amount: number | null; metadata: any }> = [];
                for (const r of reqRows) {
                    if (!r) continue;
                    let issuedCode: string | null = null;
                    try {
                        if (r.metadata && typeof r.metadata === 'object' && r.metadata.issuedCode) issuedCode = String(r.metadata.issuedCode);
                        else if (r.metadata && typeof r.metadata === 'string') {
                            try { const parsed = JSON.parse(r.metadata); if (parsed && parsed.issuedCode) issuedCode = String(parsed.issuedCode); } catch(e) {}
                        }
                    } catch (e) { issuedCode = null; }
                    if (!issuedCode) continue;

                    const { rows: giftRows } = await sql`SELECT id FROM giftcards WHERE code = ${issuedCode} LIMIT 1`;
                    if (!giftRows || giftRows.length === 0) {
                        let amountVal: number | null = null;
                        if (typeof r.amount === 'number') amountVal = r.amount;
                        else if (r.amount) amountVal = Number(r.amount);
                        else if (r.metadata && r.metadata.amount) amountVal = Number(r.metadata.amount);
                        candidates.push({ id: r.id, issuedCode, amount: amountVal, metadata: r.metadata });
                    }
                    if (candidates.length >= limit) break;
                }

                console.debug('[API] repairMissingGiftcards candidates found:', candidates.length);

                // Determine which numeric columns exist in giftcards
                const { rows: colCheck } = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='giftcards' AND column_name IN ('initial_value','value','balance')`;
                const cols = (colCheck || []).map((c: any) => c.column_name);
                const hasInitial = cols.includes('initial_value');
                const hasValue = cols.includes('value');
                const hasBalance = cols.includes('balance');

                const repaired: any[] = [];
                const failed: any[] = [];

                for (const c of candidates) {
                    try {
                        if (dryRun) {
                            repaired.push({ id: c.id, code: c.issuedCode, wouldInsert: true });
                            continue;
                        }

                        // Attempt insertion with the safest set of columns available
                        let inserted: any = null;
                        if (hasInitial && hasBalance) {
                            const { rows: [r] } = await sql`
                                INSERT INTO giftcards (code, initial_value, balance, giftcard_request_id, expires_at, metadata)
                                VALUES (${c.issuedCode}, ${c.amount || 0}, ${c.amount || 0}, ${c.id}, NOW() + INTERVAL '3 months', ${JSON.stringify({ repairedBy: 'repairMissingGiftcards', repairedAt: new Date().toISOString() })}::jsonb)
                                RETURNING *;
                            `;
                            inserted = r;
                        } else if (hasInitial) {
                            const { rows: [r] } = await sql`
                                INSERT INTO giftcards (code, initial_value, giftcard_request_id, expires_at, metadata)
                                VALUES (${c.issuedCode}, ${c.amount || 0}, ${c.id}, NOW() + INTERVAL '3 months', ${JSON.stringify({ repairedBy: 'repairMissingGiftcards', repairedAt: new Date().toISOString() })}::jsonb)
                                RETURNING *;
                            `;
                            inserted = r;
                        } else if (hasValue && hasBalance) {
                            const { rows: [r] } = await sql`
                                INSERT INTO giftcards (code, value, balance, giftcard_request_id, expires_at, metadata)
                                VALUES (${c.issuedCode}, ${c.amount || 0}, ${c.amount || 0}, ${c.id}, NOW() + INTERVAL '3 months', ${JSON.stringify({ repairedBy: 'repairMissingGiftcards', repairedAt: new Date().toISOString() })}::jsonb)
                                RETURNING *;
                            `;
                            inserted = r;
                        } else {
                            const { rows: [r] } = await sql`
                                INSERT INTO giftcards (code, giftcard_request_id, expires_at, metadata)
                                VALUES (${c.issuedCode}, ${c.id}, NOW() + INTERVAL '3 months', ${JSON.stringify({ repairedBy: 'repairMissingGiftcards', repairedAt: new Date().toISOString(), amount: c.amount })}::jsonb)
                                RETURNING *;
                            `;
                            inserted = r;
                        }

                        if (inserted) {
                            repaired.push({ id: c.id, code: c.issuedCode, giftcardId: inserted.id });
                        } else {
                            failed.push({ id: c.id, code: c.issuedCode, error: 'insert returned no row' });
                        }
                    } catch (err) {
                        console.error('[API][repairMissingGiftcards] failed inserting for', c.issuedCode, err);
                        failed.push({ id: c.id, code: c.issuedCode, error: err instanceof Error ? err.message : String(err) });
                    }
                }

                return res.status(200).json({ success: true, dryRun, candidates: candidates.length, repaired, failed });
            } catch (err) {
                console.error('[API][repairMissingGiftcards] error:', err);
                return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
            }
        }
        case 'syncProducts': {
                // Sincroniza los productos de DEFAULT_PRODUCTS con la base de datos
                try {
                    // Import dinámico para evitar problemas de ESM/CJS
                    const constantsModule = await import('../constants.js');
                    const products = constantsModule.DEFAULT_PRODUCTS;
                await sql`BEGIN`;
                await sql.query('DELETE FROM products');
                for (const p of products) {
                    // Discriminación de tipos para evitar errores
                    let classes = null, price = null, details = null, schedulingRules = null, overrides = null, minParticipants = null, pricePerPerson = null;
                    if ('classes' in p) classes = p.classes;
                    if ('price' in p) price = p.price;
                    if ('details' in p) details = JSON.stringify(p.details);
                    if ('schedulingRules' in p) schedulingRules = JSON.stringify((p as any).schedulingRules);
                    if ('overrides' in p) overrides = JSON.stringify((p as any).overrides);
                    if ('minParticipants' in p) minParticipants = (p as any).minParticipants;
                    if ('pricePerPerson' in p) pricePerPerson = (p as any).pricePerPerson;
                    await sql.query(
                        `INSERT INTO products (id, type, name, classes, price, description, image_url, details, is_active, scheduling_rules, overrides, min_participants, price_per_person)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                        ON CONFLICT (id) DO UPDATE SET
                            type = EXCLUDED.type,
                            name = EXCLUDED.name,
                            classes = EXCLUDED.classes,
                            price = EXCLUDED.price,
                            description = EXCLUDED.description,
                            image_url = EXCLUDED.image_url,
                            details = EXCLUDED.details,
                            is_active = EXCLUDED.is_active,
                            scheduling_rules = EXCLUDED.scheduling_rules,
                            overrides = EXCLUDED.overrides,
                            min_participants = EXCLUDED.min_participants,
                            price_per_person = EXCLUDED.price_per_person;`,
                        [
                            p.id,
                            p.type,
                            p.name,
                            classes,
                            price,
                            overrides,
                            minParticipants,
                            pricePerPerson
                        ]
                    );
                }
                await sql`COMMIT`;
                return res.status(200).json({ success: true });
            } catch (error) {
                await sql`ROLLBACK`;
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }
        case 'deleteCustomer': {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Email is required.' 
                });
            }
            
            try {
                console.log('[DELETE CUSTOMER] Attempting to delete customer with email:', email);
                
                // Use the complete deletion function from lib/database
                const { deleteCustomerByEmail } = await import('../lib/database.js');
                const result = await deleteCustomerByEmail(email);
                
                console.log('[DELETE CUSTOMER] Deletion result:', result);
                
                if (result) {
                    return res.status(200).json({ 
                        success: true, 
                        message: 'Customer and related data deleted successfully' 
                    });
                } else {
                    return res.status(404).json({ 
                        success: false, 
                        error: 'Customer not found or no data to delete' 
                    });
                }
            } catch (error) {
                console.error('[DELETE CUSTOMER] Error:', error);
                return res.status(500).json({ 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error deleting customer' 
                });
            }
        }
        case 'updateBooking': {
            const { id, userInfo, price, participants } = req.body;
            if (!id || !userInfo || typeof price === 'undefined') {
                return res.status(400).json({ error: 'id, userInfo, and price are required.' });
            }
            const { rows: [updatedBookingRow] } = await sql`
                UPDATE bookings
                SET user_info = ${JSON.stringify(userInfo)}, price = ${price}, participants = ${typeof participants !== 'undefined' ? participants : null}
                WHERE id = ${id}
                RETURNING *;
            `;
            const updatedBooking = parseBookingFromDB(updatedBookingRow);
            return res.status(200).json({ success: true, booking: updatedBooking });
        }
        case 'updateCustomerInfo': {
            const { email, info } = req.body;
            if (!email || !info) {
                return res.status(400).json({ error: 'Email and info are required.' });
            }
            const { rows: bookings } = await sql.query('SELECT id, user_info FROM bookings WHERE user_info->>\'email\' = $1', [email]);
            for (const booking of bookings) {
                const currentInfo = typeof booking.user_info === 'string' ? JSON.parse(booking.user_info) : booking.user_info;
                const updatedInfo = { ...currentInfo, ...info };
                await sql.query('UPDATE bookings SET user_info = $1 WHERE id = $2', [JSON.stringify(updatedInfo), booking.id]);
            }
            return res.status(200).json({ success: true });
        }
        // Only one switch block should exist here. All cases including updateCustomerInfo are already present above.
        case 'addPaymentToBooking': {
            const { bookingId, payment } = req.body;
            
            // Validate required inputs
            if (!bookingId || typeof bookingId !== 'string') {
                return res.status(400).json({ error: 'bookingId is required and must be a string' });
            }
            if (!payment || typeof payment !== 'object') {
                return res.status(400).json({ error: 'payment object is required' });
            }
            if (typeof payment.amount !== 'number' || payment.amount <= 0) {
                return res.status(400).json({ error: 'payment.amount is required and must be a positive number' });
            }
            if (!payment.method || typeof payment.method !== 'string') {
                return res.status(400).json({ error: 'payment.method is required and must be a string' });
            }
            
            try {
                const { rows: [bookingRow] } = await sql`SELECT payment_details, price FROM bookings WHERE id = ${bookingId}`;
                if (!bookingRow) {
                    return res.status(404).json({ error: 'Booking not found.' });
                }
                const currentPayments = (bookingRow.payment_details && Array.isArray(bookingRow.payment_details))
                    ? bookingRow.payment_details
                    : [];
                
                // Generate unique ID for the new payment if not present
                const paymentWithId = {
                    ...payment,
                    id: payment.id || generatePaymentId()
                };
                
                const updatedPayments = [...currentPayments, paymentWithId];
                const totalPaid = updatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                const isPaid = totalPaid >= bookingRow.price;

                // If payment is via Giftcard, update giftcard balance
                if (payment.method === 'Giftcard' && payment.metadata?.giftcardCode) {
                    const giftcardCode = payment.metadata.giftcardCode;
                    const redemptionAmount = payment.amount;
                    
                    try {
                        // Find giftcard by code and update balance
                        const { rows: [giftcard] } = await sql`
                            SELECT id, balance, giftcard_request_id FROM giftcards WHERE code = ${giftcardCode}
                        `;
                        
                        if (giftcard) {
                            const newBalance = Math.max(0, giftcard.balance - redemptionAmount);
                            
                            await sql`
                                UPDATE giftcards 
                                SET balance = ${newBalance}
                                WHERE id = ${giftcard.id}
                            `;
                            
                            // Log the redemption in giftcard_events (using giftcard_request_id if available)
                            if (giftcard.giftcard_request_id) {
                                await sql`
                                    INSERT INTO giftcard_events (giftcard_request_id, event_type, admin_user, note, metadata)
                                    VALUES (
                                        ${giftcard.giftcard_request_id},
                                        'redemption_payment',
                                        'admin_console',
                                        'Used as payment for booking ' || ${String(bookingId)},
                                        ${JSON.stringify({
                                            bookingId,
                                            giftcardCode: giftcardCode,
                                            redeemedAmount: redemptionAmount,
                                            newBalance: newBalance,
                                            previousBalance: giftcard.balance
                                        })}
                                    )
                                `;
                            }
                        }
                    } catch (giftcardError) {
                        console.error('[addPaymentToBooking] Error updating giftcard:', giftcardError);
                        // Continue anyway - payment should still be recorded even if giftcard update fails
                    }
                }

                const { rows: [updatedBookingRow] } = await sql`
                    UPDATE bookings
                    SET payment_details = ${JSON.stringify(updatedPayments)}, is_paid = ${isPaid}
                    WHERE id = ${bookingId}
                    RETURNING *;
                `;

                const updatedBooking = parseBookingFromDB(updatedBookingRow);
                result = { success: true, booking: updatedBooking };

                try {
                    await emailService.sendPaymentReceiptEmail(updatedBooking, paymentWithId);
                } catch (emailError) {
                    console.warn(`Payment receipt email for booking ${updatedBooking.bookingCode} failed to send:`, emailError);
                }
            } catch (error) {
                console.error('[addPaymentToBooking] Error:', error);
                // If booking doesn't exist or has invalid format, return 404
                return res.status(404).json({ error: 'Booking not found' });
            }
            break;
        }

        case 'deletePaymentFromBooking': {
            const { bookingId, paymentId, paymentIndex, cancelReason } = req.body;
            
            console.log('[API][deletePaymentFromBooking] Request:', { bookingId, paymentId, paymentIndex, cancelReason });
            
            if (!bookingId) {
                return res.status(400).json({ error: 'bookingId is required' });
            }
            
            // Support both paymentId (new way) and paymentIndex (legacy fallback)
            if (!paymentId && (typeof paymentIndex !== 'number' || paymentIndex < 0)) {
                return res.status(400).json({ error: 'Either paymentId or valid paymentIndex (>= 0) is required' });
            }
            
            // CRÍTICO: Verificar si el booking existe primero
            const { rows: bookingRows } = await sql`SELECT payment_details, price FROM bookings WHERE id = ${bookingId}`;

            if (!bookingRows || bookingRows.length === 0) {
                console.warn('[API][deletePaymentFromBooking] Booking not found (may have been deleted):', bookingId);
                return res.status(404).json({ 
                    success: false, 
                    error: 'Booking not found', 
                    message: 'La reserva ya no existe. Puede haber sido eliminada junto con el cliente.' 
                });
            }

            const bookingRow = bookingRows[0];
            const currentPayments = (bookingRow.payment_details && Array.isArray(bookingRow.payment_details))
                ? bookingRow.payment_details
                : [];

            console.log('[API][deletePaymentFromBooking] Current payments:', currentPayments.length);

            let deletedPayment: any = null;
            let updatedPayments: any[] = [];

            if (paymentId) {
                // New way: Find and remove by ID
                const paymentIndexFound = currentPayments.findIndex((p: any) => p.id === paymentId);
                
                if (paymentIndexFound === -1) {
                    console.error('[API][deletePaymentFromBooking] Payment not found with ID:', paymentId);
                    return res.status(404).json({ error: `Payment not found with ID: ${paymentId}` });
                }
                
                deletedPayment = currentPayments[paymentIndexFound];
                updatedPayments = currentPayments.filter((p: any) => p.id !== paymentId);
                console.log('[API][deletePaymentFromBooking] Deleted payment by ID:', paymentId, 'at index:', paymentIndexFound);
            } else {
                // Legacy way: Use index (for backward compatibility)
                if (paymentIndex >= 0 && paymentIndex < currentPayments.length) {
                    deletedPayment = currentPayments[paymentIndex];
                    updatedPayments = currentPayments.filter((_: any, i: number) => i !== paymentIndex);
                    console.log('[API][deletePaymentFromBooking] Deleted payment by index:', paymentIndex);
                } else {
                    console.error('[API][deletePaymentFromBooking] Invalid index:', paymentIndex, 'for array length:', currentPayments.length);
                    return res.status(400).json({ error: `Invalid payment index. Request index: ${paymentIndex}, Available payments: ${currentPayments.length}` });
                }
            }

            const totalPaid = updatedPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
            const isPaid = totalPaid >= bookingRow.price;
            
            const { rows: [updatedBookingRow] } = await sql`
                UPDATE bookings
                SET payment_details = ${JSON.stringify(updatedPayments)}, is_paid = ${isPaid}
                WHERE id = ${bookingId}
                RETURNING *;
            `;
            
            const updatedBooking = parseBookingFromDB(updatedBookingRow);
            result = { success: true, booking: updatedBooking };
            
            // Audit log: guardar cancelación en notifications
            try {
                await sql`
                    INSERT INTO notifications (type, target_id, user_name, summary)
                    VALUES ('payment_deleted', ${bookingId}, ${deletedPayment.method || 'N/A'}, ${cancelReason || 'Deleted by admin'});
                `;
            } catch (auditErr) {
                console.warn('[API][deletePaymentFromBooking] Failed to insert audit notification:', auditErr);
            }
            
            console.log('[API][deletePaymentFromBooking] Success: Deleted payment');
            break;
        }
        case 'updatePaymentDetails': {
            const { bookingId, paymentId, paymentIndex, updatedDetails } = req.body;
            
            console.log('[API][updatePaymentDetails] Request:', { bookingId, paymentId, paymentIndex, updatedDetails });
            
            if (!bookingId) {
                return res.status(400).json({ error: 'bookingId is required' });
            }
            
            // Support both paymentId (new way) and paymentIndex (legacy fallback)
            if (!paymentId && (typeof paymentIndex !== 'number' || paymentIndex < 0)) {
                return res.status(400).json({ error: 'Either paymentId or valid paymentIndex (>= 0) is required' });
            }
            
            const { rows: [bookingRow] } = await sql`SELECT payment_details, price FROM bookings WHERE id = ${bookingId}`;

            if (!bookingRow) {
                return res.status(404).json({ error: 'Booking not found.' });
            }

            const currentPayments = (bookingRow.payment_details && Array.isArray(bookingRow.payment_details))
                ? bookingRow.payment_details
                : [];

            console.log('[API][updatePaymentDetails] Current payments:', currentPayments.length);

            let updatedPayments: any[] = [];

            if (paymentId) {
                // New way: Find and update by ID
                const targetIndex = currentPayments.findIndex((p: any) => p.id === paymentId);
                
                if (targetIndex === -1) {
                    console.error('[API][updatePaymentDetails] Payment not found with ID:', paymentId);
                    return res.status(404).json({ error: `Payment not found with ID: ${paymentId}` });
                }
                
                updatedPayments = currentPayments.map((p: any) =>
                    p.id === paymentId ? { ...p, ...updatedDetails } : p
                );
                console.log('[API][updatePaymentDetails] Updated payment by ID:', paymentId);
            } else {
                // Legacy way: Use index (for backward compatibility)
                if (paymentIndex >= 0 && paymentIndex < currentPayments.length) {
                    updatedPayments = currentPayments.map((p: any, i: number) =>
                        i === paymentIndex ? { ...p, ...updatedDetails } : p
                    );
                    console.log('[API][updatePaymentDetails] Updated payment by index:', paymentIndex);
                } else {
                    console.error('[API][updatePaymentDetails] Invalid index:', paymentIndex, 'for array length:', currentPayments.length);
                    return res.status(400).json({ error: `Invalid payment index. Request index: ${paymentIndex}, Available payments: ${currentPayments.length}` });
                }
            }

            const totalPaid = updatedPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
            const isPaid = totalPaid >= bookingRow.price;

            const { rows: [updatedBookingRow] } = await sql`
                UPDATE bookings
                SET payment_details = ${JSON.stringify(updatedPayments)}, is_paid = ${isPaid}
                WHERE id = ${bookingId}
                RETURNING *;
            `;
            const updatedBooking = parseBookingFromDB(updatedBookingRow);
            result = { success: true, booking: updatedBooking };
            
            console.log('[API][updatePaymentDetails] Success');
            break;
        }
        case 'markBookingAsUnpaid':
            const markUnpaidBody = req.body;
            await sql`UPDATE bookings SET is_paid = false, payment_details = NULL WHERE id = ${markUnpaidBody.bookingId}`;
            break;
        case 'rescheduleBookingSlot': {
            const rescheduleBody = req.body;
            const { bookingId: rescheduleId, oldSlot, newSlot, reason, forceAdminReschedule, adminUser } = rescheduleBody;
            
            try {
                const { rows: [bookingToReschedule] } = await sql`SELECT * FROM bookings WHERE id = ${rescheduleId}`;
                
                if (!bookingToReschedule) {
                    return res.status(404).json({ success: false, error: 'Booking not found' });
                }

                const booking = toCamelCase(bookingToReschedule);
                
                // ============ VALIDACIONES DE RESCHEDULE ============
                
                // 1. Validar fechas retroactivas (permitir hasta 30 días en el pasado)
                const newDateObj = new Date(newSlot.date + 'T00:00:00');
                const todayObj = new Date();
                todayObj.setHours(0, 0, 0, 0);
                const isRetroactive = newDateObj < todayObj;
                const daysDiff = Math.floor((todayObj.getTime() - newDateObj.getTime()) / (1000 * 60 * 60 * 24));
                
                if (isRetroactive && daysDiff > 30) {
                    return res.status(400).json({
                        success: false,
                        error: `No se puede agendar más de 30 días en el pasado. Esta fecha es ${daysDiff} días atrás.`
                    });
                }
                
                // 2. Validar 72 horas de anticipación (solo para futuro)
                if (!isRetroactive) {
                    const now = new Date();
                    const oldSlotDate = new Date(oldSlot.date + 'T00:00:00');
                    const hoursDifference = (oldSlotDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                    
                    if (hoursDifference < 72 && !forceAdminReschedule) {
                        console.log(`[RESCHEDULE] Clase en ${Math.floor(hoursDifference)}h < 72h. RECHAZADO. Clase se PIERDE.`);
                        return res.status(400).json({ 
                            success: false, 
                            error: 'Requiere 72 horas de anticipación. La clase se ha PERDIDO.',
                            hoursUntilClass: hoursDifference,
                            requiresAdminApproval: true
                        });
                    }
                    
                    if (hoursDifference < 72 && forceAdminReschedule) {
                        console.log(`[RESCHEDULE] Admin force reschedule. Clase en ${Math.floor(hoursDifference)}h < 72h. PERMITIDO POR ADMIN.`);
                    }
                }
                
                // 3. Validar si tiene política acceptedNoRefund (SKIP SI ES ADMIN)
                if (booking.acceptedNoRefund === true && !forceAdminReschedule) {
                    return res.status(400).json({
                        success: false,
                        error: 'Esta clase no es reagendable (política de no reembolso)'
                    });
                }
                
                // 4. Calcular allowance y rescheduleUsed ANTES de validaciones
                const product = booking.product as any;
                const classCount = product?.classes || 1;
                
                // Calcular allowance según paquete
                let allowance = 1; // default
                if (classCount === 4) allowance = 1;
                else if (classCount === 8) allowance = 2;
                else if (classCount === 12) allowance = 3;
                else if (classCount > 12) allowance = Math.ceil(classCount / 4);
                
                const rescheduleUsed = booking.rescheduleUsed || 0;
                
                // 5. Validar límite de reagendamientos (SKIP SI ES ADMIN)
                if (!forceAdminReschedule) {
                    if (rescheduleUsed >= allowance && !isRetroactive) {
                        return res.status(400).json({
                            success: false,
                            error: `Agotaste tus ${allowance} reagendamientos disponibles para este paquete`
                        });
                    }
                } else {
                    console.log(`[RESCHEDULE] Admin override: Saltando validación de límite de reagendamientos`);
                }
                
                // 6. Validar capacidad del nuevo slot
                const { rows: products } = await sql`SELECT * FROM products WHERE id = ${bookingToReschedule.product_id}`;
                if (products.length > 0) {
                    const classCapacityStr = process.env.CLASS_CAPACITY || '8,8,8';
                    const capacityMap: any = {
                        'potters_wheel': 8,
                        'molding': 8,
                        'introductory_class': 8
                    };
                    
                    try {
                        const capacities = classCapacityStr.split(',').map((c: string) => parseInt(c, 10));
                        if (bookingToReschedule.product_type === 'INTRODUCTORY_CLASS') {
                            capacityMap.introductory_class = capacities[2] || 8;
                        } else if (bookingToReschedule.product_type === 'CLASS_PACKAGE') {
                            const technique = bookingToReschedule.product?.details?.technique || 'potters_wheel';
                            capacityMap[technique] = capacities[0] || 8;
                        }
                    } catch (e) {
                        console.error('Error parsing CLASS_CAPACITY:', e);
                    }
                    
                    const { rows: otherBookings } = await sql`
                        SELECT COUNT(*) as count FROM bookings 
                        WHERE product_id = ${bookingToReschedule.product_id}
                        AND id != ${rescheduleId}
                        AND slots @> ${JSON.stringify([{ date: newSlot.date, time: newSlot.time }])}
                    `;
                    
                    const technique = bookingToReschedule.product?.details?.technique || 'potters_wheel';
                    const maxCapacity = capacityMap[technique] || 8;
                    const currentCount = otherBookings[0]?.count || 0;
                    
                    if (currentCount >= maxCapacity) {
                        return res.status(400).json({
                            success: false,
                            error: `Slot completo (${currentCount}/${maxCapacity}). No se puede agregar más bookings.`
                        });
                    }
                }
                
                // ============ AUDIT LOG PARA RETROACTIVOS ============
                if (isRetroactive && adminUser) {
                    try {
                        await sql`
                            INSERT INTO audit_logs (booking_id, admin_user, action, details, created_at)
                            VALUES (
                                ${rescheduleId},
                                ${adminUser},
                                'retrospective_booking',
                                ${JSON.stringify({
                                    oldSlot,
                                    newSlot,
                                    isRetroactive: true,
                                    daysDifference: daysDiff,
                                    timestamp: new Date().toISOString()
                                })},
                                NOW()
                            )
                        `;
                        console.log(`[audit] Retrospective booking created: ${rescheduleId} by ${adminUser}`);
                    } catch (auditError) {
                        console.error('[audit] Error creating audit log:', auditError);
                    }
                }
                
                // ============ PROCEDER CON REAGENDAMIENTO ============
                
                // Actualizar slots: remover oldSlot y agregar newSlot
                const slotsFromDB = Array.isArray(bookingToReschedule.slots) 
                    ? bookingToReschedule.slots 
                    : (typeof bookingToReschedule.slots === 'string' ? JSON.parse(bookingToReschedule.slots) : []);
                
                const otherSlots = slotsFromDB.filter((s: any) => 
                    s.date !== oldSlot.date || s.time !== oldSlot.time
                );
                const updatedSlots = [...otherSlots, newSlot];
                
                // Deduplicar slots por seguridad (evitar duplicados si ya existían)
                const uniqueSlotsMap = new Map<string, any>();
                updatedSlots.forEach(slot => {
                    const key = `${slot.date}|${slot.time}`;
                    uniqueSlotsMap.set(key, slot);
                });
                const finalSlots = Array.from(uniqueSlotsMap.values());
                
                if (finalSlots.length !== updatedSlots.length) {
                    console.warn(`[RESCHEDULE] Removed ${updatedSlots.length - finalSlots.length} duplicate slots`);
                }
                
                // Crear entrada de historia
                const rescheduleHistoryEntry = {
                    id: `reschedule_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    bookingId: rescheduleId,
                    fromSlot: oldSlot,
                    toSlot: newSlot,
                    reason: reason || null,
                    rescheduleCount: rescheduleUsed + 1,
                    timestamp: new Date().toISOString(),
                    createdByAdmin: !!adminUser,
                    isRetroactive: isRetroactive
                };
                
                // Obtener historia actual
                let currentHistory = [];
                try {
                    if (bookingToReschedule.reschedule_history) {
                        const parsed = JSON.parse(bookingToReschedule.reschedule_history);
                        currentHistory = Array.isArray(parsed) ? parsed : [];
                    }
                } catch (e) {
                    console.warn('[RESCHEDULE] Could not parse reschedule_history, starting fresh:', e);
                    currentHistory = [];
                }
                
                const updatedHistory = [...currentHistory, rescheduleHistoryEntry];
                
                // Actualizar booking
                await sql`
                    UPDATE bookings SET 
                        slots = ${JSON.stringify(finalSlots)},
                        reschedule_used = ${rescheduleUsed + 1},
                        reschedule_history = ${JSON.stringify(updatedHistory)},
                        last_reschedule_at = NOW()
                    WHERE id = ${rescheduleId}
                `;
                
                // Obtener booking actualizado
                const { rows: [updatedBooking] } = await sql`SELECT * FROM bookings WHERE id = ${rescheduleId}`;
                
                console.log(`[RESCHEDULE] Exitoso: ${rescheduleId}, usado ${rescheduleUsed + 1}/${allowance}, retroactivo: ${isRetroactive}`);
                
                result = { 
                    success: true, 
                    booking: toCamelCase(updatedBooking),
                    rescheduleInfo: {
                        used: rescheduleUsed + 1,
                        allowance: allowance,
                        remaining: allowance - (rescheduleUsed + 1)
                    },
                    isRetroactive
                };
                
            } catch (error) {
                console.error('[RESCHEDULE] Error:', error);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Error al reagendar: ' + (error instanceof Error ? error.message : String(error))
                });
            }
            break;
        }
        case 'removeBookingSlot': {
            const { bookingId, slotToRemove } = req.body;
            if (!bookingId || !slotToRemove) {
                return res.status(400).json({ error: 'bookingId and slotToRemove are required.' });
            }
            // Fetch current slots
            const { rows: [bookingRow] } = await sql`SELECT slots FROM bookings WHERE id = ${bookingId}`;
            if (!bookingRow) {
                return res.status(404).json({ error: 'Booking not found.' });
            }
            const currentSlots = Array.isArray(bookingRow.slots) ? bookingRow.slots : [];
            // Remove the slot matching date, time, instructorId
            const updatedSlots = currentSlots.filter((s: any) => {
                return !(s.date === slotToRemove.date && s.time === slotToRemove.time && s.instructorId === slotToRemove.instructorId);
            });
            if (updatedSlots.length === 0) {
                // If no slots left, delete the booking
                await sql`DELETE FROM bookings WHERE id = ${bookingId}`;
                return res.status(200).json({ success: true, deleted: true });
            } else {
                await sql`UPDATE bookings SET slots = ${JSON.stringify(updatedSlots)} WHERE id = ${bookingId}`;
                return res.status(200).json({ success: true, updatedSlots });
            }
        }
        case 'deleteBooking': {
            const { bookingId } = req.body;
            if (!bookingId || typeof bookingId !== 'string') {
                return res.status(400).json({ error: 'bookingId is required and must be a string' });
            }
            try {
                const { rowCount } = await sql`DELETE FROM bookings WHERE id = ${bookingId}`;
                if (rowCount === 0) {
                    return res.status(404).json({ error: 'Booking not found' });
                }
                return res.status(200).json({ success: true, message: 'Booking deleted successfully' });
            } catch (error) {
                console.error('[deleteBooking] Error:', error);
                // If booking doesn't exist or has invalid format, return 404
                return res.status(404).json({ error: 'Booking not found' });
            }
        }
        case 'deleteBookingsInDateRange':
            const deleteRangeBody = req.body;
            const { startDate, endDate } = deleteRangeBody;
            const { rows: bookingsInRange } = await sql`SELECT id, slots FROM bookings`;
            for (const booking of bookingsInRange) {
                const remainingSlots = booking.slots.filter((s: any) => {
                    const slotDate = new Date(s.date);
                    return slotDate < new Date(startDate) || slotDate > new Date(endDate);
                });
                if (remainingSlots.length < booking.slots.length) {
                    if (remainingSlots.length === 0) {
                        await sql`DELETE FROM bookings WHERE id = ${booking.id}`;
                    } else {
                        await sql`UPDATE bookings SET slots = ${JSON.stringify(remainingSlots)} WHERE id = ${booking.id}`;
                    }
                }
            }
            break;
        case 'updateAttendanceStatus':
            const updateAttendanceBody = req.body;
            const { bookingId: attendanceId, slot, status } = updateAttendanceBody;
            const slotIdentifier = `${slot.date}_${slot.time}`;
            
            // 1. Actualizar attendance
            await sql`UPDATE bookings SET attendance = COALESCE(attendance, '{}'::jsonb) || ${JSON.stringify({ [slotIdentifier]: status })}::jsonb WHERE id = ${attendanceId}`;
            
            // 2. Obtener el booking actualizado para verificar clases restantes
            try {
                const { rows: [bookingData] } = await sql`SELECT * FROM bookings WHERE id = ${attendanceId}`;
                
                if (bookingData && bookingData.product_type === 'CLASS_PACKAGE') {
                    const parsedBooking = parseBookingFromDB(bookingData);
                    const product = parsedBooking.product as any;
                    const customerEmail = parsedBooking.userInfo?.email;
                    const firstName = parsedBooking.userInfo?.firstName || 'Cliente';
                    const lastName = parsedBooking.userInfo?.lastName || '';
                    
                    if (product && customerEmail) {
                        const totalClasses = product.classes || 0;
                        const usedSlots = parsedBooking.slots?.length || 0;
                        const remainingClasses = Math.max(0, totalClasses - usedSlots);
                        
                        // Obtener nombre de técnica
                        let techniqueName = 'Cerámica';
                        if (product.details?.technique) {
                            const techniqueMap: Record<string, string> = {
                                'potters_wheel': 'Torno Alfarero',
                                'hand_modeling': 'Modelado a Mano',
                                'molding': 'Modelado a Mano',
                                'painting': 'Pintura de Piezas'
                            };
                            techniqueName = techniqueMap[product.details.technique] || 'Cerámica';
                        }
                        
                        // 3. Disparar email automático si quedan 2 o 1 clases
                        // Prevenir duplicados: verificar si ya se envió email de este tipo
                        if (remainingClasses === 2) {
                            const { rows: existingEmail } = await sql`
                                SELECT id FROM client_notifications 
                                WHERE client_email = ${customerEmail} 
                                AND type = 'package-two-classes-reminder'
                                AND booking_code = ${parsedBooking.bookingCode}
                                LIMIT 1
                            `;
                            
                            if (existingEmail.length === 0) {
                                // Enviar email de 2 clases restantes
                                const emailPayload = {
                                    firstName,
                                    lastName,
                                    remainingClasses: 2,
                                    totalClasses,
                                    packageType: `${totalClasses} clases`,
                                    packagePrice: product.price || 0,
                                    technique: techniqueName
                                };
                                
                                try {
                                    await emailService.sendPackageTwoClassesReminderEmail(customerEmail, emailPayload);
                                    console.info(`[attendance] Sent 2-classes reminder email to ${customerEmail} for booking ${parsedBooking.bookingCode}`);
                                } catch (emailErr) {
                                    console.error(`[attendance] Failed to send 2-classes reminder email:`, emailErr);
                                }
                            }
                        } else if (remainingClasses === 1) {
                            const { rows: existingEmail } = await sql`
                                SELECT id FROM client_notifications 
                                WHERE client_email = ${customerEmail} 
                                AND type = 'package-last-class-warning'
                                AND booking_code = ${parsedBooking.bookingCode}
                                LIMIT 1
                            `;
                            
                            if (existingEmail.length === 0) {
                                // Enviar email de última clase
                                const emailPayload = {
                                    firstName,
                                    lastName,
                                    packageType: `${totalClasses} clases`,
                                    packagePrice: product.price || 0,
                                    technique: techniqueName
                                };
                                
                                try {
                                    await emailService.sendPackageLastClassWarningEmail(customerEmail, emailPayload);
                                    console.info(`[attendance] Sent last-class warning email to ${customerEmail} for booking ${parsedBooking.bookingCode}`);
                                } catch (emailErr) {
                                    console.error(`[attendance] Failed to send last-class warning email:`, emailErr);
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('[attendance] Error processing package completion emails:', err);
                // No lanzar error, solo loguear - el attendance se guardó correctamente
            }
            break;
        case 'addGroupInquiry':
            const addInquiryBody = req.body;
            const newInquiry = { ...addInquiryBody, status: 'New', createdAt: new Date().toISOString() };
            const { rows: [insertedInquiry] = [{}] } = await sql`INSERT INTO inquiries (name, email, phone, country_code, participants, tentative_date, tentative_time, event_type, message, status, created_at, inquiry_type)
            VALUES (${newInquiry.name}, ${newInquiry.email}, ${newInquiry.phone}, ${newInquiry.countryCode}, ${newInquiry.participants}, ${newInquiry.tentativeDate || null}, ${newInquiry.tentativeTime || null}, ${newInquiry.eventType}, ${newInquiry.message}, ${newInquiry.status}, ${newInquiry.createdAt}, ${newInquiry.inquiryType})
            RETURNING *;`;
            await sql`INSERT INTO notifications (type, target_id, user_name, summary) VALUES ('new_inquiry', ${insertedInquiry.id}, ${insertedInquiry.name}, ${insertedInquiry.inquiry_type});`;
            result = toCamelCase(insertedInquiry);
            break;
        case 'updateGroupInquiry':
            const updateInquiryBody = req.body;
            await sql`UPDATE inquiries SET status = ${updateInquiryBody.status} WHERE id = ${updateInquiryBody.id}`;
            break;
        case 'checkInstructorUsage':
            const checkInstructorBody = req.body;
            const { instructorId } = checkInstructorBody;
            const { rows: productUsage } = await sql`
                SELECT 1 FROM products WHERE EXISTS (
                    SELECT 1 FROM jsonb_array_elements(scheduling_rules) AS rule
                    WHERE (rule->>'instructorId')::int = ${instructorId}
                ) OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements(overrides) AS override,
                    jsonb_array_elements(override->'sessions') AS session
                    WHERE (session->>'instructorId')::int = ${instructorId}
                ) LIMIT 1
            `;
            const { rows: bookingUsage } = await sql`
                SELECT 1 FROM bookings WHERE EXISTS (
                    SELECT 1 FROM jsonb_array_elements(slots) AS slot
                    WHERE (slot->>'instructorId')::int = ${instructorId}
                ) LIMIT 1
            `;
            result = { hasUsage: productUsage.length > 0 || bookingUsage.length > 0 };
            break;
        case 'reassignAndDeleteInstructor':
            const reassignBody = req.body;
            const { instructorIdToDelete, replacementInstructorId } = reassignBody;
            await sql`BEGIN`;
            const { rows: introClasses } = await sql`SELECT id, scheduling_rules FROM products WHERE type = 'INTRODUCTORY_CLASS'`;
            for (const p of introClasses) {
                const updatedRules = p.scheduling_rules.map((r: any) => r.instructorId === instructorIdToDelete ? { ...r, instructorId: replacementInstructorId } : r);
                await sql`UPDATE products SET scheduling_rules = ${JSON.stringify(updatedRules)} WHERE id = ${p.id}`;
            }
            await sql`DELETE FROM instructors WHERE id = ${instructorIdToDelete}`;
            await sql`COMMIT`;
            break;
        case 'deleteInstructor':
            const deleteInstructorBody = req.body;
            await sql`DELETE FROM instructors WHERE id = ${deleteInstructorBody.id}`;
            break;
        case 'markAllNotificationsAsRead':
            await sql`UPDATE notifications SET read = true`;
            const { rows: notifications } = await sql`SELECT * FROM notifications ORDER BY timestamp DESC`;
            result = notifications.map(parseNotificationFromDB);
            break;
        case 'markInvoiceAsProcessed':
            const processInvoiceBody = req.body;
            const { rows: [processedInvoice] } = await sql`
                UPDATE invoice_requests
                SET status = 'Processed', processed_at = NOW()
                WHERE id = ${processInvoiceBody.invoiceId}
                RETURNING *;
            `;
            result = parseInvoiceRequestFromDB(processedInvoice);
            break;
        case 'deleteClientNotification':
            const { id: notificationIdToDelete } = req.body;
            if (!notificationIdToDelete) {
                return res.status(400).json({ error: 'Notification ID is required.' });
            }
            await sql`DELETE FROM client_notifications WHERE id = ${notificationIdToDelete}`;
            break;
        case 'triggerScheduledNotifications':
            const { rows: settingsRows } = await sql`SELECT key, value FROM settings WHERE key = 'automationSettings' OR key = 'bankDetails'`;
            const automationSettings = settingsRows.find(r => r.key === 'automationSettings')?.value as AutomationSettings;
            const bankDetails = settingsRows.find(r => r.key === 'bankDetails')?.value as BankDetails[];

            if (automationSettings?.classReminder?.enabled) {
                const { value, unit } = automationSettings.classReminder;
                const now = new Date();
                const reminderTimeAhead = (unit === 'hours' ? value : value * 24) * 60 * 60 * 1000;
                
                const { rows: allBookings } = await sql`SELECT * FROM bookings WHERE is_paid = true`;
                const { rows: sentReminders } = await sql`SELECT booking_code FROM client_notifications WHERE type = 'CLASS_REMINDER'`;
                const sentReminderCodes = new Set(sentReminders.map(r => r.booking_code));

                const parseTime = (timeStr: string) => {
                    const [time, modifier] = timeStr.split(' ');
                    let [hours, minutes] = time.split(':').map(Number);
                    if (modifier && modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
                    if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
                    return { hours, minutes };
                };

                for (const bookingRow of allBookings) {
                    const booking = parseBookingFromDB(bookingRow);
                    for (const slot of booking.slots as TimeSlot[]) {
                        const { hours, minutes } = parseTime(slot.time);
                        const [year, month, day] = slot.date.split('-').map(Number);
                        const slotDateTime = new Date(year, month - 1, day, hours, minutes);
                        const reminderDateTime = new Date(slotDateTime.getTime() - reminderTimeAhead);
                        
                        if (now >= reminderDateTime && now < slotDateTime) {
                            const slotIdentifier = `${booking.bookingCode}_${slot.date}_${slot.time}`;
                            if (!sentReminderCodes.has(slotIdentifier)) {
                                try {
                                await emailService.sendClassReminderEmail(booking, slot);
                                await sql`
                                    INSERT INTO client_notifications (created_at, client_name, client_email, type, channel, status, booking_code, scheduled_at)
                                    VALUES (
                                        ${new Date().toISOString()},
                                        ${`${booking.userInfo.firstName} ${booking.userInfo.lastName}`},
                                        ${booking.userInfo.email},
                                        'CLASS_REMINDER', 'Email', 'Sent',
                                        ${slotIdentifier}, ${new Date().toISOString()}
                                    );
                                `;
                                } catch (emailError) {
                                console.warn(`Reminder email for booking ${slotIdentifier} failed to send:`, emailError);
                                }
                            }
                        }
                    }
                }
            }
            break;
        case 'addBooking': {
            // Call the addBookingAction function with request body
            const bookingResult = await addBookingAction(req.body);
            if (!bookingResult.success) {
                return res.status(400).json({ error: bookingResult.message || 'Failed to add booking.' });
            }
            return res.status(200).json(bookingResult);
        }
        case 'createCustomExperienceBooking': {
            try {
                const { experienceType, technique, date, time, participants, config, userInfo, invoiceData, needsInvoice, totalPrice, menuSelections, childrenPieces } = req.body;

                // Validar campos requeridos
                if (!experienceType || !technique || !date || !time || !participants || !userInfo || !totalPrice) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Faltan campos requeridos para la experiencia personalizada' 
                    });
                }

                // ===== VALIDACIÓN DE CAPACIDAD Y SOLAPAMIENTO =====
                // CRÍTICO: Verificar disponibilidad ANTES de crear la reserva
                
                const requestedTechnique = technique as string;
                const requestedParticipants = parseInt(participants as string);
                const requestedDate = date as string;
                const requestedTime = time as string;

                const requestedStartMinutes = timeToMinutes(normalizeTime(requestedTime));
                const requestedEndMinutes = requestedStartMinutes + (2 * 60);

                const courseSessionsByDate = await loadCourseSessionsByDate(requestedDate, requestedDate);
                if (hasCourseOverlap(requestedDate, requestedStartMinutes, requestedEndMinutes, courseSessionsByDate)) {
                    return res.status(400).json({
                        success: false,
                        error: `Lo sentimos, ${requestedDate} a las ${requestedTime} está reservado por un curso.`
                    });
                }
                
                // Obtener todos los bookings activos que tengan slots en esa fecha
                const { rows: allBookingsRows } = await sql`
                    SELECT * FROM bookings 
                    WHERE status != 'expired'
                    ORDER BY created_at DESC
                `;
                const allBookings = allBookingsRows.map(parseBookingFromDB);
                const bookingsOnDate = allBookings.filter(b => {
                    if (!b.slots || !Array.isArray(b.slots)) return false;
                    return b.slots.some((s: any) => s.date === requestedDate);
                });
                
                // Obtener capacidades/config y horarios (para reglas de horarios fijos)
                const { availability, scheduleOverrides, classCapacity } = await parseSlotAvailabilitySettings();
                const maxCapacityMap = getMaxCapacityMap(classCapacity);
                const maxCapacity = resolveCapacity(requestedDate, requestedTechnique, maxCapacityMap, scheduleOverrides);
                
                // Contar participantes que solapan temporalmente
                let overlappingParticipants = 0;
                let openedByLargeGroupExactMatch = false;
                
                for (const booking of bookingsOnDate) {
                    if (!booking.slots || !Array.isArray(booking.slots)) continue;
                    
                    // ===== DERIVAR TÉCNICA REAL DEL BOOKING =====
                    // Priorizar product.name para derivar técnica (datos más confiables)
                    let bookingTechnique: string | undefined;
                    const productName = booking.product?.name?.toLowerCase() || '';
                    
                    if (productName.includes('pintura')) {
                        bookingTechnique = 'painting';
                    } else if (productName.includes('torno')) {
                        bookingTechnique = 'potters_wheel';
                    } else if (productName.includes('modelado')) {
                        bookingTechnique = 'hand_modeling';
                    } else {
                        bookingTechnique = booking.technique || (booking.product?.details as any)?.technique;
                    }
                    
                    // Definir grupos de técnicas que comparten capacidad
                    const isHandWork = (tech: string | undefined) => 
                        tech === 'molding' || tech === 'painting' || tech === 'hand_modeling';
                    const isHandWorkGroup = isHandWork(requestedTechnique);
                    const isBookingHandWorkGroup = isHandWork(bookingTechnique);
                    
                    // Determinar si la técnica del booking compite por capacidad
                    let techniquesMatch = false;
                    if (isHandWorkGroup && isBookingHandWorkGroup) {
                        techniquesMatch = true;
                    } else if (isHandWorkGroup && !bookingTechnique) {
                        techniquesMatch = true;
                    } else if (!isHandWorkGroup && bookingTechnique === requestedTechnique) {
                        techniquesMatch = true;
                    } else if (!isHandWorkGroup && !bookingTechnique) {
                        techniquesMatch = true;
                    }
                    
                    if (!techniquesMatch) continue;
                    
                    // Verificar si hay overlap temporal en la misma fecha
                    for (const s of booking.slots) {
                        if (s.date !== requestedDate) continue;
                        
                        const bookingStartMinutes = timeToMinutes(normalizeTime(s.time));
                        const bookingEndMinutes = bookingStartMinutes + (2 * 60);
                        
                        const hasOverlap = hasTimeOverlap(requestedStartMinutes, requestedEndMinutes, bookingStartMinutes, bookingEndMinutes);
                        
                        if (hasOverlap) {
                            const participantCount = booking.participants || 1;
                            overlappingParticipants += participantCount;
                            console.log(`[createCustomExperienceBooking] OVERLAP: ${s.time} with ${participantCount} participants`);

                            const isExactMatch = bookingStartMinutes === requestedStartMinutes;
                            if (isExactMatch && participantCount >= 3) {
                                openedByLargeGroupExactMatch = true;
                            }
                        }
                    }
                }

                // ===== REGLA ESPECIAL: hand_modeling con 1 persona =====
                // No debe abrir horarios libres: solo horarios fijos del calendario (molding)
                // o slots ya abiertos por una reserva previa de 3+ personas en el mismo horario.
                const isSpecialDayNoRules = scheduleOverrides?.[requestedDate]?.disableRules === true;
                if (!isSpecialDayNoRules && requestedTechnique === 'hand_modeling' && requestedParticipants === 1) {
                    const dayKey = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${requestedDate}T00:00:00`).getDay()];
                    const normalizedRequestedTime = normalizeTime(requestedTime);
                    const fixedHandTimes = getFixedSlotTimesForDate(requestedDate, dayKey, availability, scheduleOverrides, 'molding')
                        .map(t => normalizeTime(t));

                    const isFixedHandSlot = fixedHandTimes.includes(normalizedRequestedTime);
                    if (!isFixedHandSlot && !openedByLargeGroupExactMatch) {
                        return res.status(400).json({
                            success: false,
                            error: 'Para Modelado a Mano con 1 persona solo se permiten horarios fijos o unirse a una reserva ya abierta (3+ personas).'
                        });
                    }
                }
                
                const availableCapacity = maxCapacity - overlappingParticipants;
                const canBook = availableCapacity >= requestedParticipants;
                
                console.log(`[createCustomExperienceBooking] Capacity check: max=${maxCapacity}, overlapping=${overlappingParticipants}, available=${availableCapacity}, requested=${requestedParticipants}, canBook=${canBook}`);
                
                if (!canBook) {
                    return res.status(400).json({
                        success: false,
                        error: availableCapacity <= 0
                            ? `Lo sentimos, no hay cupos disponibles para ${requestedDate} a las ${requestedTime}. El horario está lleno.`
                            : `Solo hay ${availableCapacity} cupos disponibles, pero necesitas ${requestedParticipants}.`
                    });
                }
                // ===== FIN VALIDACIÓN DE CAPACIDAD =====

                // Generar código de reserva
                const bookingCode = generateBookingCode();

                // Preparar slot
                const slot = { date, time };

                // Preparar product object
                const productDetails = {
                    type: 'CUSTOM_GROUP_EXPERIENCE',
                    experienceType,
                    technique,
                    config,
                    menuSelections: menuSelections || [],
                    childrenPieces: childrenPieces || []
                };

                // Insertar booking en la base de datos
                const { rows } = await sql`
                    INSERT INTO bookings (
                        booking_code,
                        product_type,
                        technique,
                        slots,
                        participants,
                        user_info,
                        price,
                        is_paid,
                        status,
                        created_at,
                        expires_at,
                        booking_mode,
                        product,
                        group_metadata
                    ) VALUES (
                        ${bookingCode},
                        'CUSTOM_GROUP_EXPERIENCE',
                        ${technique},
                        ${JSON.stringify([slot])},
                        ${participants},
                        ${JSON.stringify(userInfo)},
                        ${totalPrice},
                        false,
                        'pending',
                        NOW(),
                        NOW() + INTERVAL '2 hours',
                        'online',
                        ${JSON.stringify(productDetails)},
                        ${JSON.stringify({ experienceType, config, menuSelections, childrenPieces })}
                    )
                    RETURNING *
                `;

                if (!rows || rows.length === 0) {
                    throw new Error('Failed to create booking - no data returned from database');
                }

                const newBooking = rows[0];
                console.log('[createCustomExperienceBooking] Booking created:', bookingCode, 'ID:', newBooking.id);

                // Crear invoice request si se proporcionó invoiceData
                if (needsInvoice && invoiceData && newBooking.id) {
                    try {
                        console.log('[createCustomExperienceBooking] Creating invoice request for booking:', bookingCode, 'ID:', newBooking.id);
                        await sql`
                            INSERT INTO invoice_requests (
                                booking_id, company_name, tax_id, address, email, status, requested_at
                            ) VALUES (
                                ${newBooking.id},
                                ${invoiceData.companyName || ''},
                                ${invoiceData.taxId || ''},
                                ${invoiceData.address || ''},
                                ${invoiceData.email || userInfo.email},
                                'Pending',
                                NOW()
                            )
                        `;
                        console.log('[createCustomExperienceBooking] Invoice request created successfully');
                    } catch (invoiceError) {
                        console.error('[createCustomExperienceBooking] Error creating invoice request:', invoiceError);
                        // No fallar la reserva si la factura falla
                    }
                }

                // Obtener detalles bancarios
                const { rows: settingsRows } = await sql`SELECT key, value FROM settings WHERE key = 'bankDetails'`;
                const bankDetailsArray = (settingsRows.find(r => r.key === 'bankDetails')?.value as BankDetails[]) || [];
                const bankDetails = bankDetailsArray[0] || {} as BankDetails;

                // Enviar correo de pre-reserva
                try {
                    await emailService.sendCustomExperiencePreBookingEmail({
                        userInfo,
                        bookingCode,
                        experienceType,
                        technique,
                        date,
                        time,
                        participants,
                        totalPrice,
                        config
                    }, bankDetails);
                    console.log('[createCustomExperienceBooking] Email sent successfully');
                } catch (emailError) {
                    console.error('[createCustomExperienceBooking] Email send failed:', emailError);
                    // No fallar la reserva si el email falla
                }

                return res.status(200).json({
                    success: true,
                    bookingCode,
                    booking: toCamelCase(newBooking),
                    message: 'Pre-reserva creada exitosamente. Revisa tu correo para instrucciones de pago.'
                });
            } catch (error) {
                console.error('[createCustomExperienceBooking] Error:', error);
                return res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Error al crear la pre-reserva'
                });
            }
        }
        case 'createDelivery': {
            const { 
                customerEmail, 
                customerName, 
                description, 
                scheduledDate, 
                status = 'pending', 
                notes, 
                photos,
                wantsPainting,
                paintingPrice,
                paintingStatus,
                paintingBookingDate,
                paintingPaidAt,
                paintingCompletedAt
            } = req.body;
            
            // description ahora es opcional
            if (!customerEmail || !scheduledDate) {
                return res.status(400).json({ error: 'customerEmail and scheduledDate are required.' });
            }
            
            // Convert photos array to JSON string for storage
            const photosJson = photos && Array.isArray(photos) ? JSON.stringify(photos) : null;
            
            const { rows: [newDelivery] } = await sql`
                INSERT INTO deliveries (
                    customer_email, 
                    description, 
                    scheduled_date, 
                    status, 
                    notes, 
                    photos,
                    wants_painting,
                    painting_price,
                    painting_status,
                    painting_booking_date,
                    painting_paid_at,
                    painting_completed_at
                )
                VALUES (
                    ${customerEmail}, 
                    ${description || null}, 
                    ${scheduledDate}, 
                    ${status}, 
                    ${notes || null}, 
                    ${photosJson},
                    ${typeof wantsPainting === 'boolean' ? wantsPainting : null},
                    ${typeof paintingPrice === 'number' ? paintingPrice : null},
                    ${paintingStatus || null},
                    ${paintingBookingDate || null},
                    ${paintingPaidAt || null},
                    ${paintingCompletedAt || null}
                )
                RETURNING *;
            `;
            
            // Send creation email (fire and forget)
            try {
                let finalCustomerName = customerName || 'Cliente';
                
                // If customerName not provided, try to get from bookings
                if (!customerName) {
                    const { rows: [bookingData] } = await sql`
                        SELECT user_info FROM bookings 
                        WHERE user_info->>'email' = ${customerEmail} 
                        ORDER BY created_at DESC LIMIT 1
                    `;
                    if (bookingData?.user_info) {
                        const userInfo = typeof bookingData.user_info === 'string' 
                            ? JSON.parse(bookingData.user_info) 
                            : bookingData.user_info;
                        finalCustomerName = userInfo.firstName || 'Cliente';
                    }
                }
                
                console.log('[createDelivery] Attempting to send email to:', customerEmail, 'name:', finalCustomerName);
                
                // Import emailService dynamically
                const emailServiceModule = await import('./emailService.js');
                await emailServiceModule.sendDeliveryCreatedEmail(customerEmail, finalCustomerName, {
                    description: description || null,
                    scheduledDate
                }).then(() => {
                    console.log('[createDelivery] ✅ Email sent successfully to:', customerEmail);
                }).catch(err => {
                    console.error('[createDelivery] ❌ Email send failed:', err);
                });
            } catch (emailErr) {
                console.error('[createDelivery] ❌ Email setup failed:', emailErr);
            }
            
            return res.status(200).json({ success: true, delivery: toCamelCase(newDelivery) });
        }
        case 'createDeliveryFromClient': {
            const { email, userInfo, description, scheduledDate, photos, wantsPainting, paintingPrice } = req.body;
            
            if (!email || !scheduledDate) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Email y fecha de recogida son requeridos' 
                });
            }

            try {
                // 1️⃣ Validar email (debe ser cliente existente o crear uno nuevo)
                let { rows: [existingCustomer] } = await sql`
                    SELECT * FROM customers WHERE email = ${email}
                `;

                // 2️⃣ Si no existe, crear cliente nuevo
                if (!existingCustomer) {
                    console.log('[createDeliveryFromClient] Creating new customer:', email);
                    
                    if (!userInfo) {
                        return res.status(400).json({ 
                            success: false,
                            error: 'userInfo es requerido para clientes nuevos' 
                        });
                    }

                    try {
                        const { rows: [newCustomer] } = await sql`
                            INSERT INTO customers (email, first_name, last_name, phone, country_code, birthday)
                            VALUES (
                                ${email}, 
                                ${userInfo.firstName || null}, 
                                ${userInfo.lastName || null}, 
                                ${userInfo.phone || null}, 
                                ${userInfo.countryCode || null}, 
                                ${userInfo.birthday || null}
                            )
                            RETURNING *
                        `;
                        existingCustomer = newCustomer;
                        console.log('[createDeliveryFromClient] ✅ New customer created:', email);
                    } catch (customerError: any) {
                        // Si falla por email duplicado, obtener el existente
                        if (customerError?.code === '23505') {
                            const { rows: [duplicate] } = await sql`
                                SELECT * FROM customers WHERE email = ${email}
                            `;
                            existingCustomer = duplicate;
                        } else {
                            throw customerError;
                        }
                    }
                }

                // 3️⃣ Crear entrega con created_by_client = true y campos de pintura
                const photosJson = photos && Array.isArray(photos) ? JSON.stringify(photos) : null;
                const paintingStatus = wantsPainting ? 'pending_payment' : null;
                
                const { rows: [newDelivery] } = await sql`
                    INSERT INTO deliveries (
                        customer_email, 
                        description, 
                        scheduled_date, 
                        status, 
                        photos,
                        created_by_client,
                        wants_painting,
                        painting_price,
                        painting_status
                    )
                    VALUES (
                        ${email}, 
                        ${description || null}, 
                        ${scheduledDate}, 
                        'pending', 
                        ${photosJson},
                        true,
                        ${wantsPainting || false},
                        ${paintingPrice || null},
                        ${paintingStatus}
                    )
                    RETURNING *
                `;

                console.log('[createDeliveryFromClient] ✅ Delivery created:', newDelivery.id, 'wantsPainting:', wantsPainting);

                // 4️⃣ Enviar email de confirmación (diferenciado según servicio de pintura)
                try {
                    const customerName = userInfo?.firstName || 'Cliente';
                    const emailServiceModule = await import('./emailService.js');
                    
                    try {
                        if (wantsPainting) {
                            // Email especial para clientes que quieren pintura
                            await emailServiceModule.sendDeliveryWithPaintingServiceEmail(
                                email, 
                                customerName, 
                                {
                                    description: description || null,
                                    scheduledDate,
                                    photos: photos?.length || 0,
                                    paintingPrice: paintingPrice || 0
                                }
                            );
                        } else {
                            // Email estándar sin pintura
                            await emailServiceModule.sendDeliveryCreatedByClientEmail(
                                email, 
                                customerName, 
                                {
                                    description: description || null,
                                    scheduledDate,
                                    photos: photos?.length || 0
                                }
                            );
                        }
                        console.log('[createDeliveryFromClient] ✅ Confirmation email sent to:', email);
                    } catch (err) {
                        console.error('[createDeliveryFromClient] ⚠️ Email send failed:', err);
                        // No retornar error, continuar de todas formas
                    }
                } catch (emailErr) {
                    console.error('[createDeliveryFromClient] ⚠️ Email setup failed:', emailErr);
                }

                return res.status(200).json({ 
                    success: true, 
                    delivery: toCamelCase(newDelivery),
                    isNewCustomer: !existingCustomer,
                    message: '✅ Información recibida exitosamente'
                });

            } catch (error: any) {
                console.error('[createDeliveryFromClient] Error:', error);
                return res.status(500).json({ 
                    success: false,
                    error: error.message || 'Error al procesar la solicitud'
                });
            }
        }
        case 'updateDelivery': {
            const { deliveryId, updates } = req.body;
            if (!deliveryId || !updates) {
                return res.status(400).json({ error: 'deliveryId and updates are required.' });
            }
            const definedEntries = Object.entries(updates).filter(([, value]) => value !== undefined);
            const setClause = definedEntries
                .map(([key], idx) => {
                    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    return `${snakeKey} = $${idx + 2}`;
                })
                .join(', ');
            
            if (!setClause) {
                return res.status(400).json({ error: 'No valid updates provided.' });
            }
            
            const values = [deliveryId, ...definedEntries.map(([, value]) => value)];
            const { rows: [updatedDelivery] } = await sql.query(
                `UPDATE deliveries SET ${setClause} WHERE id = $1 RETURNING *`,
                values
            );
            
            if (!updatedDelivery) {
                return res.status(404).json({ error: 'Delivery not found.' });
            }
            
            return res.status(200).json({ success: true, delivery: toCamelCase(updatedDelivery) });
        }
        case 'markDeliveryAsCompleted': {
            const { deliveryId, notes, deliveredAt } = req.body;
            if (!deliveryId) {
                return res.status(400).json({ error: 'deliveryId is required.' });
            }
            const { rows: [completedDelivery] } = await sql`
                UPDATE deliveries 
                SET status = 'completed', 
                    completed_at = NOW(), 
                    delivered_at = ${deliveredAt || 'NOW()'},
                    notes = ${notes || null}
                WHERE id = ${deliveryId}
                RETURNING *;
            `;
            
            if (!completedDelivery) {
                return res.status(404).json({ error: 'Delivery not found.' });
            }
            
            // Send completion email (fire and forget)
            try {
                const { rows: [customerData] } = await sql`
                    SELECT user_info FROM customers WHERE email = ${completedDelivery.customer_email} LIMIT 1
                `;
                if (customerData?.user_info) {
                    const userInfo = typeof customerData.user_info === 'string' 
                        ? JSON.parse(customerData.user_info) 
                        : customerData.user_info;
                    const customerName = userInfo.firstName || 'Cliente';
                    
                    const emailServiceModule = await import('./emailService.js');
                    emailServiceModule.sendDeliveryCompletedEmail(customerData.customer_email || completedDelivery.customer_email, customerName, {
                        description: completedDelivery.description,
                        deliveredAt: completedDelivery.delivered_at || completedDelivery.completed_at
                    }).catch(err => console.error('[markDeliveryAsCompleted] Email send failed:', err));
                }
            } catch (emailErr) {
                console.warn('[markDeliveryAsCompleted] Could not send email:', emailErr);
            }
            
            return res.status(200).json({ success: true, delivery: toCamelCase(completedDelivery) });
        }
        case 'updatePaintingStatus': {
            // Endpoint específico para actualizar estado del servicio de pintura
            const { deliveryId, paintingStatus, paintingBookingDate, paintingPaidAt, paintingCompletedAt } = req.body;
            
            if (!deliveryId) {
                return res.status(400).json({ error: 'deliveryId is required' });
            }
            
            if (!paintingStatus) {
                return res.status(400).json({ error: 'paintingStatus is required' });
            }
            
            // Validar estados permitidos
            const validStatuses = ['pending_payment', 'paid', 'scheduled', 'completed'];
            if (!validStatuses.includes(paintingStatus)) {
                return res.status(400).json({ error: 'Invalid paintingStatus' });
            }
            
            try {
                // Construir query dinámico basado en los campos provistos
                let updateFields = [`painting_status = '${paintingStatus}'`];
                
                // Auto-setear timestamps según el estado
                if (paintingStatus === 'paid' && !paintingPaidAt) {
                    updateFields.push(`painting_paid_at = NOW()`);
                } else if (paintingPaidAt) {
                    updateFields.push(`painting_paid_at = '${paintingPaidAt}'`);
                }
                
                if (paintingStatus === 'completed' && !paintingCompletedAt) {
                    updateFields.push(`painting_completed_at = NOW()`);
                } else if (paintingCompletedAt) {
                    updateFields.push(`painting_completed_at = '${paintingCompletedAt}'`);
                }
                
                if (paintingStatus === 'scheduled' && paintingBookingDate) {
                    updateFields.push(`painting_booking_date = '${paintingBookingDate}'`);
                } else if (paintingBookingDate) {
                    updateFields.push(`painting_booking_date = '${paintingBookingDate}'`);
                }
                
                const { rows: [updatedDelivery] } = await sql.query(
                    `UPDATE deliveries 
                     SET ${updateFields.join(', ')} 
                     WHERE id = $1 
                     RETURNING *`,
                    [deliveryId]
                );
                
                if (!updatedDelivery) {
                    return res.status(404).json({ error: 'Delivery not found' });
                }
                
                console.log(`[updatePaintingStatus] Updated delivery ${deliveryId} to status: ${paintingStatus}`);
                
                return res.status(200).json({ 
                    success: true, 
                    delivery: toCamelCase(updatedDelivery) 
                });
                
            } catch (error: any) {
                console.error('[updatePaintingStatus] Error:', error);
                return res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Error updating painting status' 
                });
            }
        }
        case 'schedulePaintingBooking': {
            const { deliveryId, date, time, participants } = req.body;

            if (!deliveryId || !date || !time || participants === undefined || participants === null) {
                return res.status(400).json({ error: 'deliveryId, date, time, participants are required' });
            }

            const requestedParticipants = Math.max(1, Math.min(22, parseInt(String(participants), 10)));
            if (!Number.isFinite(requestedParticipants)) {
                return res.status(400).json({ error: 'Invalid participants' });
            }

            try {
                const availability = await computeSlotAvailability(date, time, 'painting', requestedParticipants);
                if (!availability.available) {
                    return res.status(409).json({
                        success: false,
                        error: availability.message,
                        capacity: availability.capacity
                    });
                }

                const { rows: [delivery] } = await sql`
                    SELECT * FROM deliveries WHERE id = ${deliveryId}
                `;

                if (!delivery) {
                    return res.status(404).json({ error: 'Delivery not found' });
                }

                const wantsPainting = Boolean((delivery as any).wants_painting ?? (delivery as any).wantsPainting);
                if (!wantsPainting) {
                    return res.status(400).json({ error: 'Delivery does not have painting service enabled' });
                }

                const currentPaintingStatus = (delivery as any).painting_status ?? (delivery as any).paintingStatus ?? null;
                const existingBookingDate = (delivery as any).painting_booking_date ?? (delivery as any).paintingBookingDate ?? null;
                if (currentPaintingStatus === 'scheduled' && existingBookingDate) {
                    return res.status(409).json({ error: 'Painting session already scheduled for this delivery' });
                }
                if (currentPaintingStatus && currentPaintingStatus !== 'paid' && currentPaintingStatus !== 'scheduled') {
                    return res.status(400).json({ error: 'Painting service is not marked as paid' });
                }

                let userInfo: any = null;
                const { rows: [bookingData] } = await sql`
                    SELECT user_info FROM bookings 
                    WHERE user_info->>'email' = ${delivery.customer_email}
                    ORDER BY created_at DESC LIMIT 1
                `;

                if (bookingData?.user_info) {
                    userInfo = typeof bookingData.user_info === 'string'
                        ? JSON.parse(bookingData.user_info)
                        : bookingData.user_info;
                }

                if (!userInfo) {
                    const { rows: [customerData] } = await sql`
                        SELECT first_name, last_name, phone, country_code FROM customers
                        WHERE email = ${delivery.customer_email} LIMIT 1
                    `;

                    userInfo = {
                        firstName: customerData?.first_name || 'Cliente',
                        lastName: customerData?.last_name || '',
                        email: delivery.customer_email,
                        phone: customerData?.phone || '',
                        countryCode: customerData?.country_code || '+593'
                    };
                }

                userInfo = {
                    firstName: userInfo?.firstName || 'Cliente',
                    lastName: userInfo?.lastName || '',
                    email: userInfo?.email || delivery.customer_email,
                    phone: userInfo?.phone || '',
                    countryCode: userInfo?.countryCode || '+593'
                };

                const { rows: productRows } = await sql`
                    SELECT * FROM products 
                    WHERE LOWER(name) LIKE '%pintura%' AND is_active = true
                    ORDER BY sort_order NULLS LAST, created_at DESC
                    LIMIT 1
                `;

                const product = productRows[0]
                    ? toCamelCase(productRows[0])
                    : {
                        id: 'painting_service',
                        type: 'GROUP_EXPERIENCE',
                        name: 'Pintura de piezas',
                        description: 'Reserva de pintura (servicio prepagado)',
                        isActive: true,
                        price: 0,
                        details: {
                            technique: 'painting',
                            duration: '2 horas',
                            durationHours: 2,
                            activities: [],
                            generalRecommendations: '',
                            materials: ''
                        }
                    } as any;

                const bookingPayload: any = {
                    productId: product.id || 'painting_service',
                    productType: product.type || 'GROUP_EXPERIENCE',
                    product,
                    slots: [{ date, time: availability.normalizedTime, instructorId: 0 }],
                    userInfo,
                    isPaid: true,
                    price: 0,
                    bookingMode: 'flexible',
                    bookingDate: date,
                    participants: requestedParticipants,
                    technique: 'painting'
                };

                const bookingResult = await addBookingAction(bookingPayload, { suppressPreBookingEmail: true });
                if (!bookingResult?.success) {
                    return res.status(500).json({
                        success: false,
                        error: bookingResult?.message || 'Failed to create booking'
                    });
                }

                const bookingDateTimeLocal = new Date(`${date}T${availability.normalizedTime}:00`);
                const bookingDateIso = bookingDateTimeLocal.toISOString();

                const { rows: [updatedDelivery] } = await sql`
                    UPDATE deliveries
                    SET painting_status = 'scheduled',
                        painting_booking_date = ${bookingDateIso}
                    WHERE id = ${deliveryId}
                    RETURNING *
                `;

                if (!updatedDelivery) {
                    if (bookingResult.booking?.bookingCode) {
                        await sql`
                            UPDATE bookings SET status = 'expired'
                            WHERE booking_code = ${bookingResult.booking.bookingCode}
                        `;
                    }
                    return res.status(500).json({ success: false, error: 'Failed to update delivery' });
                }

                try {
                    const emailServiceModule = await import('./emailService.js');
                    const customerName = userInfo?.firstName || 'Cliente';
                    await emailServiceModule.sendPaintingBookingScheduledEmail(
                        delivery.customer_email,
                        customerName,
                        {
                            description: delivery.description,
                            bookingDate: date,
                            bookingTime: availability.normalizedTime,
                            participants: requestedParticipants
                        }
                    );
                } catch (emailErr) {
                    console.warn('[schedulePaintingBooking] Email failed:', emailErr);
                }

                return res.status(200).json({
                    success: true,
                    delivery: toCamelCase(updatedDelivery)
                });
            } catch (error: any) {
                console.error('[schedulePaintingBooking] Error:', error);
                return res.status(500).json({
                    success: false,
                    error: error.message || 'Error scheduling painting booking'
                });
            }
        }
        case 'markDeliveryAsReady': {
            const { deliveryId, resend = false } = req.body;
            
            if (!deliveryId) {
                return res.status(400).json({ error: 'deliveryId is required.' });
            }
            
            // Check if already marked as ready
            const { rows: [existingDelivery] } = await sql`
                SELECT * FROM deliveries WHERE id = ${deliveryId}
            `;
            
            if (!existingDelivery) {
                return res.status(404).json({ error: 'Delivery not found.' });
            }
            
            // If already marked and not resend, reject
            if (existingDelivery.ready_at && !resend) {
                return res.status(400).json({ 
                    error: 'Delivery already marked as ready',
                    readyAt: existingDelivery.ready_at
                });
            }
            
            // Mark as ready (or use existing ready_at if resending)
            let readyAt: string;
            let readyDelivery: any;
            
            if (resend && existingDelivery.ready_at) {
                // Resending email, don't update ready_at timestamp
                readyAt = existingDelivery.ready_at;
                readyDelivery = existingDelivery;
                console.log('[markDeliveryAsReady] RESEND mode - using existing ready_at:', readyAt);
            } else {
                // First time marking as ready
                readyAt = new Date().toISOString();
                const { rows: [updatedDelivery] } = await sql`
                    UPDATE deliveries 
                    SET ready_at = ${readyAt}
                    WHERE id = ${deliveryId}
                    RETURNING *;
                `;
                readyDelivery = updatedDelivery;
                console.log('[markDeliveryAsReady] Delivery marked as ready:', deliveryId, 'at:', readyAt);
            }
            
            // Send ready notification email
            let emailSentSuccessfully = false;
            try {
                console.log('[markDeliveryAsReady] 🔍 Step 1: Getting customer name for email:', readyDelivery.customer_email);
                
                // Get customer name from most recent booking (email is stored in user_info JSON)
                const { rows: [bookingData] } = await sql`
                    SELECT user_info FROM bookings 
                    WHERE user_info->>'email' = ${readyDelivery.customer_email} 
                    ORDER BY created_at DESC LIMIT 1
                `;
                
                let customerName = 'Cliente';
                if (bookingData?.user_info) {
                    const userInfo = typeof bookingData.user_info === 'string' 
                        ? JSON.parse(bookingData.user_info) 
                        : bookingData.user_info;
                    customerName = userInfo.firstName || 'Cliente';
                }
                
                console.log('[markDeliveryAsReady] 🔍 Step 2: Customer name resolved:', customerName);
                console.log('[markDeliveryAsReady] 🔍 Step 3: Importing emailService module...');
                
                const emailServiceModule = await import('./emailService.js');
                
                const wantsPainting = Boolean((readyDelivery as any).wants_painting ?? (readyDelivery as any).wantsPainting);
                const paintingPrice = (readyDelivery as any).painting_price ?? (readyDelivery as any).paintingPrice ?? null;
                console.log('[markDeliveryAsReady] 🔍 Step 4: Calling sendDeliveryReadyEmail with:', {
                    id: readyDelivery.id,
                    email: readyDelivery.customer_email,
                    name: customerName,
                    description: readyDelivery.description,
                    readyAt: readyAt,
                    wantsPainting,
                    paintingPrice
                });
                
                const emailResult = await emailServiceModule.sendDeliveryReadyEmail(
                    readyDelivery.customer_email, 
                    customerName, 
                    {
                        id: readyDelivery.id,
                        description: readyDelivery.description,
                        readyAt: readyAt,
                        wantsPainting,
                        paintingPrice
                    }
                );
                
                console.log('[markDeliveryAsReady] 🔍 Step 5: Email function returned:', JSON.stringify(emailResult));
                
                if (emailResult && (emailResult as any).sent === true) {
                    console.log('[markDeliveryAsReady] ✅ EMAIL SENT SUCCESSFULLY');
                    emailSentSuccessfully = true;
                } else {
                    console.error('[markDeliveryAsReady] ⚠️ EMAIL NOT SENT - Result:', emailResult);
                }
            } catch (emailErr: any) {
                console.error('[markDeliveryAsReady] ❌ EMAIL ERROR - Type:', typeof emailErr);
                console.error('[markDeliveryAsReady] ❌ EMAIL ERROR - Message:', emailErr?.message || 'No message');
                console.error('[markDeliveryAsReady] ❌ EMAIL ERROR - Stack:', emailErr?.stack || 'No stack');
                console.error('[markDeliveryAsReady] ❌ EMAIL ERROR - Full:', JSON.stringify(emailErr, null, 2));
            }
            
            console.log('[markDeliveryAsReady] 🔍 Final: Returning response with emailSent:', emailSentSuccessfully);
            
            return res.status(200).json({ 
                success: true, 
                delivery: toCamelCase(readyDelivery),
                emailSent: emailSentSuccessfully
            });
        }
        case 'deleteDelivery': {
            const { deliveryId } = req.body;
            if (!deliveryId) {
                return res.status(400).json({ error: 'deliveryId is required.' });
            }
            const { rowCount } = await sql`DELETE FROM deliveries WHERE id = ${deliveryId}`;
            
            if (rowCount === 0) {
                return res.status(404).json({ error: 'Delivery not found.' });
            }
            
            return res.status(200).json({ success: true });
        }
        case 'bulkUpdateDeliveryStatus': {
            console.log('[bulkUpdateDeliveryStatus] ✅ ENDPOINT RECEIVED');
            const { deliveryIds, action, metadata } = req.body;
            console.log('[bulkUpdateDeliveryStatus] Parameters:', { deliveryIds, action, metadata });
            
            // Validations
            if (!deliveryIds || !Array.isArray(deliveryIds) || deliveryIds.length === 0) {
                console.warn('[bulkUpdateDeliveryStatus] ❌ Invalid deliveryIds:', deliveryIds);
                return res.status(400).json({ 
                    success: false, 
                    error: 'deliveryIds array is required and must not be empty' 
                });
            }
            
            if (!['markReady', 'markCompleted', 'delete'].includes(action)) {
                console.warn('[bulkUpdateDeliveryStatus] ❌ Invalid action:', action);
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid action. Must be: markReady, markCompleted, or delete' 
                });
            }
            
            console.log(`[bulkUpdateDeliveryStatus] 🔄 Processing ${deliveryIds.length} deliveries with action: ${action}`);
            
            // Process bulk operation
            try {
                const results = [];
                const errors = [];
                
                for (const deliveryId of deliveryIds) {
                    try {
                        switch(action) {
                            case 'markReady': {
                                console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] Checking if exists...`);
                                const { rows: [existingDelivery] } = await sql`
                                    SELECT * FROM deliveries WHERE id = ${deliveryId}
                                `;
                                
                                if (!existingDelivery) {
                                    console.warn(`[bulkUpdateDeliveryStatus] [${deliveryId}] Not found`);
                                    errors.push({ id: deliveryId, error: 'Delivery not found' });
                                    break;
                                }
                                
                                if (existingDelivery.status === 'completed') {
                                    console.warn(`[bulkUpdateDeliveryStatus] [${deliveryId}] Already completed`);
                                    errors.push({ id: deliveryId, error: 'Delivery already completed' });
                                    break;
                                }
                                
                                // Mark as ready
                                const readyAt = existingDelivery.ready_at || new Date().toISOString();
                                console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] Updating status to 'ready'...`);
                                const { rows: [readyDelivery] } = await sql`
                                    UPDATE deliveries 
                                    SET status = 'ready', ready_at = ${readyAt}
                                    WHERE id = ${deliveryId}
                                    RETURNING *
                                `;
                                console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] ✅ Updated successfully`);
                                
                                // Send email synchronously (wait for it)
                                let emailSent = false as boolean;
                                let emailError: string | undefined = undefined;
                                let emailDryRunPath: string | undefined = undefined;
                                try {
                                    console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] Fetching customer data...`);
                                    const { rows: [customerData] } = await sql`
                                        SELECT first_name, last_name FROM customers WHERE email = ${readyDelivery.customer_email} LIMIT 1
                                    `;
                                    if (customerData) {
                                        const customerName = customerData.first_name || 'Cliente';
                                        
                                        console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] Sending email to ${customerName} (${readyDelivery.customer_email})...`);
                                        const emailServiceModule = await import('./emailService.js');
                                        const wantsPainting = Boolean((readyDelivery as any).wants_painting ?? (readyDelivery as any).wantsPainting);
                                        const paintingPrice = (readyDelivery as any).painting_price ?? (readyDelivery as any).paintingPrice ?? null;
                                        const emailResult = await emailServiceModule.sendDeliveryReadyEmail(
                                            readyDelivery.customer_email, 
                                            customerName, 
                                            {
                                                id: readyDelivery.id,
                                                description: readyDelivery.description,
                                                readyAt: readyDelivery.ready_at,
                                                wantsPainting,
                                                paintingPrice
                                            }
                                        );
                                        emailSent = !!(emailResult && emailResult.sent);
                                        emailError = (emailResult && !emailResult.sent) ? emailResult.error : undefined;
                                        emailDryRunPath = (emailResult && !emailResult.sent) ? emailResult.dryRunPath : undefined;
                                        console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] 📧 Email sent successfully:`, emailResult);
                                    } else {
                                        console.warn(`[bulkUpdateDeliveryStatus] [${deliveryId}] Customer data not found for email`);
                                    }
                                } catch (emailErr) {
                                    console.error(`[bulkUpdateDeliveryStatus] [${deliveryId}] ❌ Email failed:`, emailErr);
                                    emailSent = false;
                                    emailError = emailErr instanceof Error ? emailErr.message : String(emailErr);
                                }
                                
                                results.push({ 
                                    id: deliveryId, 
                                    success: true, 
                                    delivery: toCamelCase(readyDelivery),
                                    emailSent,
                                    emailError,
                                    emailDryRunPath
                                });
                                break;
                            }
                            
                            case 'markCompleted': {
                                console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] Checking if exists...`);
                                const { rows: [existingDelivery] } = await sql`
                                    SELECT * FROM deliveries WHERE id = ${deliveryId}
                                `;
                                
                                if (!existingDelivery) {
                                    console.warn(`[bulkUpdateDeliveryStatus] [${deliveryId}] Not found`);
                                    errors.push({ id: deliveryId, error: 'Delivery not found' });
                                    break;
                                }
                                
                                if (existingDelivery.status === 'completed') {
                                    console.warn(`[bulkUpdateDeliveryStatus] [${deliveryId}] Already completed`);
                                    errors.push({ id: deliveryId, error: 'Delivery already completed' });
                                    break;
                                }
                                
                                console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] Updating status to 'completed'...`);
                                const { rows: [completedDelivery] } = await sql`
                                    UPDATE deliveries 
                                    SET status = 'completed', 
                                        completed_at = NOW(),
                                        delivered_at = NOW()
                                    WHERE id = ${deliveryId}
                                    RETURNING *
                                `;
                                console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] ✅ Updated successfully`);
                                
                                // Send email synchronously (wait for it)
                                let emailSent = false as boolean;
                                let emailError: string | undefined = undefined;
                                let emailDryRunPath: string | undefined = undefined;
                                try {
                                    console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] Fetching customer data...`);
                                    const { rows: [customerData] } = await sql`
                                        SELECT first_name, last_name FROM customers WHERE email = ${completedDelivery.customer_email} LIMIT 1
                                    `;
                                    if (customerData) {
                                        const customerName = customerData.first_name || 'Cliente';
                                        
                                        console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] Sending email to ${customerName} (${completedDelivery.customer_email})...`);
                                        const emailServiceModule = await import('./emailService.js');
                                        const emailResult = await emailServiceModule.sendDeliveryCompletedEmail(
                                            completedDelivery.customer_email,
                                            customerName,
                                            {
                                                description: completedDelivery.description,
                                                deliveredAt: completedDelivery.delivered_at || completedDelivery.completed_at
                                            }
                                        );
                                        emailSent = !!(emailResult && emailResult.sent);
                                        emailError = (emailResult && !emailResult.sent) ? emailResult.error : undefined;
                                        emailDryRunPath = (emailResult && !emailResult.sent) ? emailResult.dryRunPath : undefined;
                                        console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] 📧 Email sent successfully:`, emailResult);
                                    } else {
                                        console.warn(`[bulkUpdateDeliveryStatus] [${deliveryId}] Customer data not found for email`);
                                    }
                                } catch (emailErr) {
                                    console.error(`[bulkUpdateDeliveryStatus] [${deliveryId}] ❌ Email failed:`, emailErr);
                                    emailSent = false;
                                    emailError = emailErr instanceof Error ? emailErr.message : String(emailErr);
                                }
                                
                                results.push({ 
                                    id: deliveryId, 
                                    success: true, 
                                    delivery: toCamelCase(completedDelivery),
                                    emailSent,
                                    emailError,
                                    emailDryRunPath
                                });
                                break;
                            }
                            
                            case 'delete': {
                                console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] Deleting...`);
                                const { rowCount } = await sql`
                                    DELETE FROM deliveries WHERE id = ${deliveryId}
                                `;
                                
                                if (rowCount === 0) {
                                    console.warn(`[bulkUpdateDeliveryStatus] [${deliveryId}] Not found`);
                                    errors.push({ id: deliveryId, error: 'Delivery not found' });
                                } else {
                                    console.log(`[bulkUpdateDeliveryStatus] [${deliveryId}] ✅ Deleted successfully`);
                                    results.push({ id: deliveryId, success: true });
                                }
                                break;
                            }
                        }
                    } catch (err) {
                        console.error(`[bulkUpdateDeliveryStatus] [${deliveryId}] ❌ Error:`, err);
                        errors.push({ 
                            id: deliveryId, 
                            error: err instanceof Error ? err.message : 'Unknown error' 
                        });
                    }
                }
                
                console.log('[bulkUpdateDeliveryStatus] ✅ COMPLETED', { succeeded: results.length, failed: errors.length });
                return res.status(200).json({
                    success: true,
                    results,
                    errors,
                    summary: {
                        total: deliveryIds.length,
                        succeeded: results.length,
                        failed: errors.length
                    }
                });
                
            } catch (err) {
                console.error('[bulkUpdateDeliveryStatus] ❌ FATAL ERROR:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Bulk operation failed',
                    details: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        }
        case 'updateDeliveryStatuses': {
            // Update overdue deliveries
            const { rows: overdueDeliveries } = await sql`
                UPDATE deliveries 
                SET status = 'overdue' 
                WHERE status = 'pending' AND scheduled_date < CURRENT_DATE
                RETURNING id;
            `;
            
            return res.status(200).json({ 
                success: true, 
                updated: overdueDeliveries.length 
            });
        }
        case 'migrateSortOrderForProducts': {
            try {
                // Primero intentar agregar la columna si no existe
                try {
                    await sql`ALTER TABLE products ADD COLUMN sort_order INT DEFAULT 0`;
                    console.log('Columna sort_order agregada exitosamente');
                } catch (error) {
                    // Si la columna ya existe, continuamos
                    console.log('Columna sort_order ya existe o error al agregarla:', error);
                }
                
                // Obtener productos que necesitan sort_order
                const { rows: products } = await sql`
                    SELECT id FROM products 
                    WHERE sort_order IS NULL OR sort_order = 0 
                    ORDER BY name ASC
                `;
                
                // Asignar valores uno por uno
                for (let i = 0; i < products.length; i++) {
                    await sql`
                        UPDATE products 
                        SET sort_order = ${i + 1}
                        WHERE id = ${products[i].id}
                    `;
                }
                
                return res.status(200).json({ 
                    success: true, 
                    updated: products.length 
                });
            } catch (error) {
                console.error('Error migrating sort_order:', error);
                return res.status(500).json({ 
                    success: false, 
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        }
        case 'addSortOrderColumn': {
            try {
                // Agregar la columna sort_order si no existe
                await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0`;
                
                // Obtener todos los productos ordenados por nombre
                const { rows: products } = await sql`
                    SELECT id FROM products 
                    WHERE sort_order IS NULL OR sort_order = 0 
                    ORDER BY name ASC
                `;
                
                // Asignar valores de sort_order uno por uno
                for (let i = 0; i < products.length; i++) {
                    await sql`
                        UPDATE products 
                        SET sort_order = ${i + 1}
                        WHERE id = ${products[i].id}
                    `;
                }
                
                return res.status(200).json({ 
                    success: true, 
                    message: 'Columna sort_order agregada y productos migrados',
                    updated: products.length
                });
            } catch (error) {
                console.error('Error adding sort_order column:', error);
                return res.status(500).json({ 
                    success: false, 
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        }
        case 'expireOldBookings': {
            // Marcar pre-reservas expiradas (> 2 horas sin pago)
            try {
                const { rows: expiredBookings } = await sql`
                    UPDATE bookings 
                    SET status = 'expired'
                    WHERE status = 'active' 
                      AND is_paid = false 
                      AND expires_at < NOW()
                    RETURNING id, booking_code, user_info
                `;
                
                // Actualizar último tiempo de ejecución en admin_tasks
                try {
                    await sql`
                        UPDATE admin_tasks 
                        SET last_executed_at = NOW(), updated_at = NOW()
                        WHERE task_name = 'expire_old_bookings'
                    `;
                } catch (taskErr) {
                    console.warn('[EXPIRE BOOKINGS] Could not update admin_tasks:', taskErr);
                }
                
                console.log(`[EXPIRE BOOKINGS] Marked ${expiredBookings.length} bookings as expired`);
                
                return res.status(200).json({ 
                    success: true, 
                    message: 'Pre-reservas expiradas marcadas',
                    expired: expiredBookings.length
                });
            } catch (error) {
                console.error('Error expiring old bookings:', error);
                return res.status(500).json({ 
                    success: false, 
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        }
        case 'getClientBooking': {
            try {
                const { email, bookingCode } = req.body;
                
                if (!email || !bookingCode) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Email and booking code required' 
                    });
                }

                // Query for booking by email and code
                const { rows } = await sql`
                    SELECT * FROM bookings 
                    WHERE user_info->>'email' = ${email} 
                    AND booking_code = ${bookingCode.toUpperCase()}
                    LIMIT 1
                `;

                if (rows.length === 0) {
                    return res.status(404).json({ 
                        success: false, 
                        error: 'Invalid email or booking code' 
                    });
                }

                const booking = parseBookingFromDB(rows[0]);
                return res.status(200).json(booking);
            } catch (error) {
                console.error('[getClientBooking] Error:', error);
                return res.status(500).json({ 
                    success: false, 
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        }
        case 'getBookingById': {
            try {
                const { bookingId } = req.body;
                
                if (!bookingId) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Booking ID required' 
                    });
                }

                // Query for booking by ID
                const { rows } = await sql`
                    SELECT * FROM bookings 
                    WHERE id = ${String(bookingId)}
                    LIMIT 1
                `;

                if (rows.length === 0) {
                    return res.status(404).json({ 
                        success: false, 
                        error: 'Booking not found' 
                    });
                }

                const booking = parseBookingFromDB(rows[0]);
                return res.status(200).json(booking);
            } catch (error) {
                console.error('[getBookingById] Error:', error);
                return res.status(500).json({ 
                    success: false, 
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        }
        case 'getBookingById': {
            try {
                const { bookingId } = req.query;
                
                if (!bookingId) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Booking ID required' 
                    });
                }

                // Query for booking by ID
                const { rows } = await sql`
                    SELECT * FROM bookings 
                    WHERE id = ${String(bookingId)}
                    LIMIT 1
                `;

                if (rows.length === 0) {
                    return res.status(404).json({ 
                        success: false, 
                        error: 'Booking not found' 
                    });
                }

                const booking = parseBookingFromDB(rows[0]);
                return res.status(200).json(booking);
            } catch (error) {
                console.error('[getBookingById] Error:', error);
                return res.status(500).json({ 
                    success: false, 
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        }

        // ==================== NEW EXPERIENCE ENDPOINTS ====================

        case 'listPieces': {
            try {
                const { rows } = await sql`
                    SELECT * FROM pieces WHERE is_active = true ORDER BY sort_order, name ASC
                `;
                return res.status(200).json({ success: true, data: toCamelCase(rows) });
            } catch (error) {
                console.error('[listPieces] Error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }

        case 'createPiece': {
            const body = req.body;
            if (!body.name || !body.basePrice) {
                return res.status(400).json({ error: 'name and basePrice are required' });
            }
            try {
                const { rows } = await sql`
                    INSERT INTO pieces (name, description, category, base_price, estimated_hours, image_url, is_active, sort_order)
                    VALUES (${body.name}, ${body.description || null}, ${body.category || null}, ${body.basePrice}, ${body.estimatedHours || null}, ${body.imageUrl || null}, true, ${body.sortOrder || 0})
                    RETURNING *
                `;
                return res.status(200).json({ success: true, data: toCamelCase(rows[0]) });
            } catch (error) {
                console.error('[createPiece] Error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }

        case 'updatePiece': {
            const body = req.body;
            if (!body.id) {
                return res.status(400).json({ error: 'id is required' });
            }
            try {
                const { rows } = await sql`
                    UPDATE pieces 
                    SET name = ${body.name || sql`name`}, 
                        description = ${body.description || null},
                        category = ${body.category || null},
                        base_price = ${body.basePrice || sql`base_price`},
                        estimated_hours = ${body.estimatedHours || null},
                        image_url = ${body.imageUrl || null},
                        is_active = ${body.isActive !== undefined ? body.isActive : sql`is_active`},
                        sort_order = ${body.sortOrder !== undefined ? body.sortOrder : sql`sort_order`},
                        updated_at = NOW()
                    WHERE id = ${body.id}
                    RETURNING *
                `;
                return res.status(200).json({ success: true, data: toCamelCase(rows[0]) });
            } catch (error) {
                console.error('[updatePiece] Error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }

        case 'calculateExperiencePricing': {
            const body = req.body;
            if (!body.piecesSelected || !Array.isArray(body.piecesSelected)) {
                return res.status(400).json({ error: 'piecesSelected array is required' });
            }
            try {
                // Get piece details
                const pieceIds = body.piecesSelected.map((p: any) => p.pieceId);
                const { rows: pieces } = await sql`
                    SELECT id, name, base_price FROM pieces WHERE id = ANY(${pieceIds}::uuid[])
                `;
                
                let subtotalPieces = 0;
                const piecesWithPrice = body.piecesSelected.map((p: any) => {
                    const piece = pieces.find((pc: any) => pc.id === p.pieceId);
                    const pricePerPiece = piece?.base_price || p.basePrice || 0;
                    const quantity = p.quantity || 1;
                    subtotalPieces += pricePerPiece * quantity;
                    return { ...p, basePrice: pricePerPiece };
                });

                // Calculate guided cost
                let guidedCost = 0;
                const guidedOption = body.guidedOption || 'none';
                const guidedPricePerMinute = 0.5; // Configurable
                if (guidedOption === '60min') {
                    guidedCost = 60 * guidedPricePerMinute;
                } else if (guidedOption === '120min') {
                    guidedCost = 120 * guidedPricePerMinute;
                }

                const total = subtotalPieces + guidedCost;

                return res.status(200).json({
                    success: true,
                    data: {
                        pieces: piecesWithPrice,
                        guidedOption,
                        guidedPricePerMinute,
                        subtotalPieces,
                        guidedCost,
                        total
                    }
                });
            } catch (error) {
                console.error('[calculateExperiencePricing] Error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }

        case 'listExperienceConfirmations': {
            try {
                const { rows } = await sql`
                    SELECT ec.*, b.user_info, b.booking_code, b.price, ebm.pieces_selected
                    FROM experience_confirmations ec
                    LEFT JOIN bookings b ON b.id = ec.booking_id
                    LEFT JOIN experience_bookings_metadata ebm ON ebm.booking_id = ec.booking_id
                    ORDER BY ec.created_at DESC
                `;
                
                return res.status(200).json({ 
                    success: true, 
                    data: toCamelCase(rows) 
                });
            } catch (error) {
                console.error('[listExperienceConfirmations] Error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }

        case 'confirmExperience': {
            const body = req.body;
            if (!body.experienceConfirmationId) {
                return res.status(400).json({ error: 'experienceConfirmationId is required' });
            }
            try {
                const { rows } = await sql`
                    UPDATE experience_confirmations 
                    SET status = 'confirmed', 
                        confirmed_by_email = ${body.confirmedByEmail || null},
                        confirmation_reason = ${body.reason || null},
                        updated_at = NOW()
                    WHERE id = ${body.experienceConfirmationId}
                    RETURNING *
                `;
                
                if (rows.length === 0) {
                    return res.status(404).json({ success: false, error: 'Experience confirmation not found' });
                }

                // Get booking details to send email
                const { rows: bookingRows } = await sql`
                    SELECT * FROM bookings WHERE id = ${rows[0].booking_id}
                `;

                if (bookingRows.length > 0 && bookingRows[0].user_info) {
                    const userInfo = bookingRows[0].user_info;
                    await emailService.sendExperienceConfirmedEmail(userInfo.email, {
                        firstName: userInfo.firstName,
                        bookingCode: bookingRows[0].booking_code,
                        piecesCount: 1,
                        totalPrice: bookingRows[0].price,
                        confirmationReason: body.reason
                    });
                }

                return res.status(200).json({ success: true, data: toCamelCase(rows[0]) });
            } catch (error) {
                console.error('[confirmExperience] Error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }

        case 'rejectExperience': {
            const body = req.body;
            if (!body.experienceConfirmationId || !body.reason) {
                return res.status(400).json({ error: 'experienceConfirmationId and reason are required' });
            }
            try {
                const { rows } = await sql`
                    UPDATE experience_confirmations 
                    SET status = 'rejected', 
                        rejection_reason = ${body.reason},
                        updated_at = NOW()
                    WHERE id = ${body.experienceConfirmationId}
                    RETURNING *
                `;
                
                if (rows.length === 0) {
                    return res.status(404).json({ success: false, error: 'Experience confirmation not found' });
                }

                // Get booking details to send email and process refund
                const { rows: bookingRows } = await sql`
                    SELECT * FROM bookings WHERE id = ${rows[0].booking_id}
                `;

                if (bookingRows.length > 0) {
                    const booking = bookingRows[0];
                    const userInfo = booking.user_info;
                    
                    // Send rejection email
                    await emailService.sendExperienceRejectedEmail(userInfo.email, {
                        firstName: userInfo.firstName,
                        bookingCode: booking.booking_code,
                        rejectionReason: body.reason
                    });

                    // TODO: Process refund if payment was made
                    console.log('[rejectExperience] Refund needed for booking:', booking.id, 'Amount:', booking.price);
                }

                return res.status(200).json({ success: true, data: toCamelCase(rows[0]) });
            } catch (error) {
                console.error('[rejectExperience] Error:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }

        default:
            return res.status(400).json({ error: `Unknown action: ${action}` });
    }
    
    return res.status(200).json(result);
}


async function addBookingAction(
    body: Omit<Booking, 'id' | 'createdAt' | 'bookingCode'> & { 
      invoiceData?: Omit<InvoiceRequest, 'id' | 'bookingId' | 'status' | 'requestedAt' | 'processedAt'>;
      adminOverride?: boolean;
      overrideReason?: string;
      violatedRules?: any[];
    },
    options?: { 
      suppressPreBookingEmail?: boolean;
      adminOverride?: boolean;
      overrideReason?: string;
      violatedRules?: any[];
    }
): Promise<AddBookingResult> {
  const bookingCodeCheck = (body as any).bookingCode;
  if (bookingCodeCheck) {
    const { rows: existingByCode } = await sql`SELECT * FROM bookings WHERE booking_code = ${bookingCodeCheck}`;
    if (existingByCode.length > 0) {
      console.log('[IDEMPOTENCY] Booking already exists with code:', bookingCodeCheck);
      throw new Error('Booking code already exists');
    }
  }

  try {
    const newBookingCode = generateBookingCode();
    
    // Intentar agregar columnas si no existen
    try {
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE`;
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'`;
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS technique VARCHAR(50)`;
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_allowance INT DEFAULT 0`;
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_used INT DEFAULT 0`;
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_history JSONB DEFAULT '[]'::jsonb`;
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_reschedule_at TIMESTAMP WITH TIME ZONE`;
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS participants INT DEFAULT 1`;
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS group_metadata JSONB`;
    } catch (e) {
      console.warn('[ADD BOOKING] Could not add columns (may already exist):', e);
    }

    // COUPLES_EXPERIENCE VALIDATION
    const isCouplesExperience = body.productType === 'COUPLES_EXPERIENCE';
    
    // Extract technique: first from direct field, then from product.details
    let technique = (body as any).technique;
    if (!technique && body.product && (body.product as any).details) {
      technique = (body.product as any).details.technique;
    }
    
    console.log(`[addBookingAction] productType=${body.productType}, technique=${technique} (from body.technique=${(body as any).technique}, from product.details=${body.product && (body.product as any).details ? (body.product as any).details.technique : 'N/A'})`);

    // FIX: Derivar technique desde product.name para garantizar consistencia
    const productName = body.product?.name || '';
    const normalizedProductName = productName.toLowerCase();
    
    // Mapeo de nombres de producto -> técnica válida
    const productToTechnique: Record<string, string> = {
      'pintura de piezas': 'painting',
      'torno alfarero': 'potters_wheel',
      'modelado a mano': 'hand_modeling',
      'clase grupal': 'potters_wheel',
      'clase grupal (mixto)': 'potters_wheel', // fallback para mixto
    };
    
    // Encontrar técnica correcta basada en product.name
    let correctTechnique: string | null = null;
    for (const [name, tech] of Object.entries(productToTechnique)) {
      if (normalizedProductName.includes(name)) {
        correctTechnique = tech;
        break;
      }
    }
    
    // Validar y corregir técnica si hay inconsistencia
    if (correctTechnique && technique !== correctTechnique) {
      console.log(`[addBookingAction] CORRECCIÓN: technique "${technique}" → "${correctTechnique}" basado en product.name="${productName}"`);
      technique = correctTechnique;
    } else if (!technique) {
      // Si no hay técnica y no se puede derivar, usar fallback
      technique = 'potters_wheel';
      console.log(`[addBookingAction] ADVERTENCIA: technique null, usando fallback "potters_wheel"`);
    }

    if (isCouplesExperience) {
      // Must have exactly 1 slot
      if (!body.slots || body.slots.length !== 1) {
        throw new Error('COUPLES_EXPERIENCE must have exactly 1 slot');
      }

      // Must have technique specified
      if (!technique || !['potters_wheel', 'molding'].includes(technique)) {
        throw new Error('COUPLES_EXPERIENCE must specify a valid technique (potters_wheel or molding)');
      }

      const slot = body.slots[0];
      const slotDate = new Date(slot.date);
      const dayOfWeek = slotDate.getDay();

      console.log(`[ADD BOOKING] Validating COUPLES_EXPERIENCE: technique=${technique}, date=${slot.date}, time=${slot.time}, dayOfWeek=${dayOfWeek}`);

      // Fetch the product to get SchedulingRules
      if (body.product && (body.product as any).schedulingRules) {
        const rules = (body.product as any).schedulingRules as any[];
        
        // Find matching rule for this day/time/technique
        const matchingRule = rules.find(r => 
          r.dayOfWeek === dayOfWeek && 
          r.time === slot.time && 
          r.technique === technique
        );

        if (!matchingRule) {
          throw new Error(`No scheduling rule found for ${technique} on this day/time`);
        }

        // Calculate couple capacity (capacity / 2 for pairs)
        const totalCapacity = matchingRule.capacity || 6;
        const coupleCapacity = Math.floor(totalCapacity / 2);

        console.log(`[ADD BOOKING] Rule found: capacity=${totalCapacity}, couple capacity=${coupleCapacity}`);

        // Count existing COUPLES_EXPERIENCE bookings for same date/time/technique
        const { rows: existingCouples } = await sql`
          SELECT COUNT(*) as count FROM bookings 
          WHERE product_type = 'COUPLES_EXPERIENCE' 
            AND technique = ${technique}
            AND slots::text LIKE ${'%' + slot.date + '%'}
            AND status = 'active'
        `;

        const existingCount = parseInt(existingCouples[0]?.count || 0);
        console.log(`[ADD BOOKING] Existing COUPLES bookings for this slot: ${existingCount}/${coupleCapacity}`);

        if (existingCount >= coupleCapacity) {
          throw new Error(`No available capacity for ${technique} at this time (${existingCount}/${coupleCapacity} couples booked)`);
        }
      }
    }

    // Load schedule settings once for all product types
    const { availability, scheduleOverrides, classCapacity } = await parseSlotAvailabilitySettings();
    const maxCapacityMap = getMaxCapacityMap(classCapacity);

        if (body.productType === 'GROUP_CLASS') {
            if (!body.slots || body.slots.length !== 1) {
                throw new Error('GROUP_CLASS must have exactly 1 slot');
            }

            const groupMetadata = (body as any).groupClassMetadata;
            if (!groupMetadata || !Array.isArray(groupMetadata.techniqueAssignments)) {
                throw new Error('GROUP_CLASS requires technique assignments');
            }

            const pottersCount = groupMetadata.techniqueAssignments.filter((a: any) => a.technique === 'potters_wheel').length;
            const handModelingCount = groupMetadata.techniqueAssignments.filter((a: any) => a.technique === 'hand_modeling').length;
            const paintingCount = groupMetadata.techniqueAssignments.filter((a: any) => a.technique === 'painting').length;
            const handWorkCount = handModelingCount + paintingCount;
            const totalParticipants = groupMetadata.totalParticipants || groupMetadata.techniqueAssignments.length;

            if (totalParticipants < 2) {
                throw new Error('Las experiencias grupales requieren minimo 2 personas');
            }

            const slot = body.slots[0];
            const normalizedTime = normalizeTime(slot.time);
            const slotStartMinutes = timeToMinutes(normalizedTime);
            const slotEndMinutes = slotStartMinutes + (2 * 60);
            const dayKey = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${slot.date}T00:00:00`).getDay()];

            const fixedPottersTimes = getFixedSlotTimesForDate(slot.date, dayKey, availability, scheduleOverrides, 'potters_wheel');
            const fixedPottersMinutes = fixedPottersTimes.map(timeToMinutes);
            const fixedHandTimes = getFixedSlotTimesForDate(slot.date, dayKey, availability, scheduleOverrides, 'molding');

            if (totalParticipants < 3) {
                if (pottersCount > 0 && !fixedPottersTimes.includes(normalizedTime)) {
                    throw new Error('Para 2 personas solo se permiten horarios fijos de torno');
                }
                if (pottersCount === 0 && !fixedHandTimes.includes(normalizedTime)) {
                    throw new Error('Para 2 personas solo se permiten horarios fijos de modelado');
                }
            }

            const courseSessionsByDate = await loadCourseSessionsByDate(slot.date, slot.date);
            if (hasCourseOverlap(slot.date, slotStartMinutes, slotEndMinutes, courseSessionsByDate)) {
                throw new Error('Horario no disponible por curso');
            }

            if (pottersCount > 0 && totalParticipants >= 3 && isPottersFixedConflict(slotStartMinutes, fixedPottersMinutes)) {
                throw new Error('Horario no disponible por clase fija de torno');
            }

            const { rows: bookingsRows } = await sql`
                SELECT * FROM bookings
                WHERE status != 'expired'
                ORDER BY created_at DESC
            `;
            const allBookings = bookingsRows.map(parseBookingFromDB);
            const bookingsOnDate = allBookings.filter(b => b.slots?.some((s: any) => s.date === slot.date));

            let pottersBooked = 0;
            let pottersBlocked = false;
            let handWorkBooked = 0;

            bookingsOnDate.forEach(booking => {
                if (!booking.slots || !Array.isArray(booking.slots)) return;
                const { potters: bookingPotters, handWork: bookingHandWork } = getGroupClassBookingCounts(booking);

                booking.slots.forEach((s: any) => {
                    if (s.date !== slot.date) return;

                    const bookingStart = timeToMinutes(normalizeTime(s.time));
                    if (Number.isNaN(bookingStart)) return;
                    const bookingEnd = bookingStart + (2 * 60);

                    if (bookingPotters > 0) {
                        if (bookingStart === slotStartMinutes) {
                            pottersBooked += bookingPotters;
                        } else if (slotStartMinutes >= bookingStart - 120 && slotStartMinutes < bookingStart + 120) {
                            pottersBlocked = true;
                        }
                    }

                    if (bookingHandWork > 0 && hasTimeOverlap(slotStartMinutes, slotEndMinutes, bookingStart, bookingEnd)) {
                        handWorkBooked += bookingHandWork;
                    }
                });
            });

            if (pottersBlocked) {
                throw new Error('Horario no disponible por solapamiento de torno');
            }

            if (pottersCount > 0) {
                const pottersMax = resolveCapacity(slot.date, 'potters_wheel', maxCapacityMap, scheduleOverrides);
                const pottersAvailable = Math.max(0, pottersMax - pottersBooked);
                if (pottersAvailable < pottersCount) {
                    throw new Error('No hay cupos suficientes en torno para este horario');
                }
            }

            if (handWorkCount > 0) {
                const handWorkMax = resolveCapacity(slot.date, 'hand_modeling', maxCapacityMap, scheduleOverrides);
                const handWorkAvailable = Math.max(0, handWorkMax - handWorkBooked);
                if (handWorkAvailable < handWorkCount) {
                    throw new Error('No hay cupos suficientes en modelado/pintura para este horario');
                }
            }
        }

        if (body.productType === 'SINGLE_CLASS') {
            // ===== VALIDACIÓN PARA SINGLE_CLASS (1 persona) =====
            if (!body.slots || body.slots.length !== 1) {
                throw new Error('SINGLE_CLASS must have exactly 1 slot');
            }

            const slot = body.slots[0];
            const requestedParticipants = (body as any).participants || 1;
            const requestedTechnique = technique; // Derivada previamente
            const normalizedTime = normalizeTime(slot.time);
            const slotStartMinutes = timeToMinutes(normalizedTime);
            const slotEndMinutes = slotStartMinutes + (2 * 60); // 2 horas

            if (requestedParticipants !== 1) {
                throw new Error('SINGLE_CLASS debe tener exactamente 1 participante');
            }

            // Validar que no sea lunes (regla de negocio para pintura) - PERO permitir si hay override
            const slotDate = new Date(`${slot.date}T00:00:00`);
            const dayOfWeek = slotDate.getDay();
            const isSpecialDayNoRules = scheduleOverrides?.[slot.date]?.disableRules === true;
            if (!isSpecialDayNoRules && dayOfWeek === 1 && requestedTechnique === 'painting') {
                // Revisar si hay scheduleOverride para este lunes específico
                const hasExceptionForThisDay = scheduleOverrides && scheduleOverrides[slot.date];
                
                // Solo bloquear si NO hay excepción
                if (!hasExceptionForThisDay) {
                    throw new Error('Las clases de pintura no están disponibles los lunes. Excepto en semanas especiales con excepción configurada.');
                }
                // Si hay excepción, permitir que continúe
            }

            // Verificar disponibilidad usando computeSlotAvailability
            const slotAvailability = await computeSlotAvailability(
                slot.date,
                normalizedTime,
                requestedTechnique,
                requestedParticipants
            );

            if (!slotAvailability.available) {
                throw new Error(slotAvailability.message || `No hay cupos disponibles para ${requestedTechnique} en ${slot.date} a las ${normalizedTime}`);
            }

            // REGLA ESPECIAL: Torno (potters_wheel) y Modelado (hand_modeling) con 1 persona
            // Solo se permite si: (a) es horario fijo del calendario, O (b) fue abierto por reserva 3+
            if (!isSpecialDayNoRules && (requestedTechnique === 'potters_wheel' || requestedTechnique === 'hand_modeling') && requestedParticipants === 1) {
                const dayKey = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
                
                // Técnica de calendario a buscar
                const techToCheck = requestedTechnique === 'hand_modeling' ? 'molding' : 'potters_wheel';
                const fixedSlots = getFixedSlotTimesForDate(slot.date, dayKey, availability, scheduleOverrides, techToCheck as 'potters_wheel' | 'molding');
                const isFixedScheduleSlot = fixedSlots.includes(normalizedTime);
                const isOpenedByLargeGroup = slotAvailability.openedByLargeGroup === true;

                if (!isFixedScheduleSlot && !isOpenedByLargeGroup) {
                    const techName = requestedTechnique === 'hand_modeling' ? 'Modelado a Mano' : 'Torno Alfarero';
                    throw new Error(
                        `${techName}: Para 1 persona, solo puedes reservar horarios fijos del calendario o slots ya abiertos por un grupo de 3+ personas. ` +
                        `El horario ${normalizedTime} no cumple estas condiciones.`
                    );
                }
            }

            console.log(`[addBookingAction SINGLE_CLASS] ✅ Capacity & rules validated: ${requestedTechnique} on ${slot.date} at ${normalizedTime}, ${slotAvailability.capacity.available} slots available`);
        }

    // 🔒 FAILSAFE: Para SINGLE_CLASS, forzar siempre participants = 1
    if (body.productType === 'SINGLE_CLASS') {
      const originalParticipants = (body as any).participants;
      if (originalParticipants && originalParticipants !== 1) {
        console.log(`[addBookingAction] SINGLE_CLASS: Forzando participants = 1 (was: ${originalParticipants})`);
      }
      (body as any).participants = 1;
    }

    // Calcular reschedule allowance basado en tipo de paquete
    let rescheduleAllowance = 0;
    if (body.productType === 'CLASS_PACKAGE' || body.productType === 'SINGLE_CLASS') {
      const classCount = (body.product as any)?.classes || 1;
      if (classCount === 4) rescheduleAllowance = 1;
      else if (classCount === 8) rescheduleAllowance = 2;
      else if (classCount === 12) rescheduleAllowance = 3;
      else if (classCount > 12) rescheduleAllowance = Math.ceil(classCount / 4);
      else rescheduleAllowance = 1;
    } else if (body.productType === 'INTRODUCTORY_CLASS') {
      rescheduleAllowance = 1; // Intro classes: 1 reagendamiento
    }

    const groupMetadata = (body as any).groupClassMetadata || null;

    // FIX: Para GROUP_CLASS, actualizar product.name con la técnica específica
    let finalProduct = body.product;
    if (body.productType === 'GROUP_CLASS' && groupMetadata && groupMetadata.techniqueAssignments && groupMetadata.techniqueAssignments.length > 0) {
      const techniques = groupMetadata.techniqueAssignments.map((a: any) => a.technique);
      const uniqueTechniques = [...new Set(techniques)];
      
      // Nombres legibles de técnicas
      const techniqueNames: Record<string, string> = {
        'potters_wheel': 'Torno Alfarero',
        'hand_modeling': 'Modelado a Mano',
        'painting': 'Pintura de piezas'
      };
      
      let productName: string;
      if (uniqueTechniques.length === 1) {
        // Todos usan la misma técnica - nombre específico
        productName = techniqueNames[uniqueTechniques[0] as string] || 'Clase Grupal';
      } else {
        // Técnicas mixtas
        productName = 'Clase Grupal (mixto)';
      }
      
      // Clonar producto y actualizar name
      finalProduct = { ...body.product, name: productName };
      console.log(`[addBooking] GROUP_CLASS: Updated product.name from "${body.product.name}" to "${productName}"`);
    }

    const { rows: created } = await sql`
      INSERT INTO bookings (
        booking_code, product_id, product_type, slots, user_info, created_at, is_paid, price, booking_mode, product, booking_date, accepted_no_refund, expires_at, status, technique, reschedule_allowance, reschedule_used, reschedule_history, participants, group_metadata
      ) VALUES (
        ${newBookingCode}, ${body.productId}, ${body.productType}, ${JSON.stringify(body.slots)}, ${JSON.stringify(body.userInfo)}, NOW(), ${body.isPaid}, ${body.price}, ${body.bookingMode}, ${JSON.stringify(finalProduct)}, ${body.bookingDate}, ${(body as any).acceptedNoRefund || false}, NOW() + INTERVAL '2 hours', 'active', ${technique || null}, ${rescheduleAllowance}, 0, '[]'::jsonb, ${(body as any).participants || 1}, ${groupMetadata ? JSON.stringify(groupMetadata) : null}
      ) RETURNING *;
    `;

    const booking: Booking = {
      id: created[0].id,
      productId: created[0].product_id,
      productType: created[0].product_type,
      product: created[0].product,
      slots: created[0].slots,
      userInfo: created[0].user_info,
      createdAt: new Date(created[0].created_at),
      isPaid: created[0].is_paid,
      price: created[0].price,
      bookingCode: created[0].booking_code,
      bookingMode: created[0].booking_mode,
      bookingDate: created[0].booking_date,
      expiresAt: created[0].expires_at ? new Date(created[0].expires_at) : undefined,
      status: created[0].status || 'active',
      technique: created[0].technique,
      participants: created[0].participants ? parseInt(created[0].participants, 10) : 1,
      groupClassMetadata: created[0].group_metadata || undefined,
    };

    // 🔓 LOG ADMIN OVERRIDE IF PRESENT
    const adminOverride = (body as any).adminOverride || (options?.adminOverride);
    const overrideReason = (body as any).overrideReason || (options?.overrideReason);
    const violatedRules = (body as any).violatedRules || (options?.violatedRules);
    
    if (adminOverride) {
      console.log('[🔓 ADMIN OVERRIDE] Booking created with admin override:', {
        bookingCode: booking.bookingCode,
        bookingId: booking.id,
        customer: `${booking.userInfo.firstName} ${booking.userInfo.lastName}`,
        product: booking.product?.name,
        date: booking.slots?.[0]?.date,
        time: booking.slots?.[0]?.time,
        participants: booking.participants,
        violatedRules: violatedRules?.map((r: any) => `${r.rule}: ${r.message}`) || [],
        reason: overrideReason || 'No reason provided',
        timestamp: new Date().toISOString()
      });

      // TODO: Insertar en tabla admin_override_logs una vez creada
      // await sql`
      //   INSERT INTO admin_override_logs (booking_id, violated_rules, override_reason, created_at)
      //   VALUES (${booking.id}, ${JSON.stringify(violatedRules)}, ${overrideReason}, NOW())
      // `;
    }

    // Process giftcard hold if provided
    const giftcardHoldId = (body as any).holdId;
    const giftcardAmount = typeof (body as any).giftcardAmount === 'number' ? (body as any).giftcardAmount : 0;
    const expectedPrice = Number(body.price || 0);

    if (giftcardHoldId && giftcardAmount > 0) {
      try {
        console.log('[ADD BOOKING] Processing giftcard hold:', { 
          holdId: giftcardHoldId, 
          declaredAmount: giftcardAmount,
          bookingPrice: expectedPrice
        });
        
        // Begin transaction for giftcard consumption
        await sql`BEGIN`;
        
        // Lock and fetch the hold
        const { rows: [holdRow] } = await sql`SELECT * FROM giftcard_holds WHERE id = ${giftcardHoldId} FOR UPDATE`;
        if (!holdRow) {
          await sql`ROLLBACK`;
          console.error('[ADD BOOKING] Giftcard hold not found:', giftcardHoldId);
          throw new Error('Giftcard hold not found');
        }

        // Lock and fetch the giftcard
        const giftcardId = holdRow.giftcard_id;
        const { rows: [giftcardRow] } = await sql`SELECT * FROM giftcards WHERE id = ${giftcardId} FOR UPDATE`;
        if (!giftcardRow) {
          await sql`ROLLBACK`;
          console.error('[ADD BOOKING] Giftcard not found:', giftcardId);
          throw new Error('Giftcard not found');
        }

        const currentBalance = Number(giftcardRow.balance || 0);
        const holdAmount = Number(holdRow.amount || 0);

        // CRÍTICO: El monto a consumir SIEMPRE es el holdAmount retenido
        // NO permitir consumir más basado en parámetros del cliente
        let actualAmountToConsume = holdAmount;
        
        // Validar que el monto a consumir no exceda el precio del booking
        if (actualAmountToConsume > expectedPrice) {
          actualAmountToConsume = expectedPrice;
          console.log('[ADD BOOKING] Capping giftcard amount to booking price:', actualAmountToConsume);
        }

        if (currentBalance < actualAmountToConsume) {
          await sql`ROLLBACK`;
          console.error('[ADD BOOKING] Insufficient giftcard balance:', { 
            current: currentBalance, 
            required: actualAmountToConsume,
            holdAmount
          });
          throw new Error('Insufficient giftcard balance');
        }

        // Update giftcard balance with the ACTUAL amount being consumed
        await sql`UPDATE giftcards SET balance = ${currentBalance - actualAmountToConsume} WHERE id = ${giftcardId}`;
        
        // Delete the hold
        await sql`DELETE FROM giftcard_holds WHERE id = ${giftcardHoldId}`;

        // CRÍTICO: Crear registro de pago con giftcard
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const giftcardCode = giftcardRow.code || 'unknown';
        const paymentDetails = [{
          id: paymentId,
          amount: actualAmountToConsume,
          method: 'Giftcard',
          receivedAt: new Date().toISOString(),
          giftcardAmount: actualAmountToConsume,
          giftcardId: String(giftcardId),
          metadata: {
            giftcardCode,
            holdId: giftcardHoldId,
            originalHoldAmount: holdAmount
          }
        }];

        // Determinar si el booking está completamente pagado
        const isPaid = actualAmountToConsume >= expectedPrice;

        // Update booking record to reflect giftcard usage AND payment
        await sql`
          UPDATE bookings 
          SET giftcard_redeemed_amount = ${actualAmountToConsume},
              giftcard_id = ${String(giftcardId)},
              payment_details = ${JSON.stringify(paymentDetails)}::jsonb,
              is_paid = ${isPaid}
          WHERE booking_code = ${newBookingCode}
        `;

        console.log('[ADD BOOKING] Payment registered:', {
          paymentId,
          amount: actualAmountToConsume,
          bookingPrice: expectedPrice,
          isPaid,
          method: 'Giftcard',
          code: giftcardCode
        });

        // Insert audit log with ACTUAL consumed amount
        try {
          await sql`
            INSERT INTO giftcard_audit (
              id, giftcard_id, event_type, amount, metadata, created_at
            ) VALUES (
              uuid_generate_v4(),
              ${String(giftcardId)},
              'hold_consumed',
              ${actualAmountToConsume},
              ${JSON.stringify({ 
                holdId: giftcardHoldId, 
                bookingCode: booking.bookingCode,
                originalHoldAmount: holdAmount,
                actualConsumed: actualAmountToConsume,
                paymentId,
                isPaid
              })}::jsonb,
              NOW()
            )
          `;
        } catch (auditErr) {
          console.warn('[ADD BOOKING] Failed to insert giftcard audit:', auditErr);
          // Don't fail the transaction if audit fails
        }

        await sql`COMMIT`;
        console.log('[ADD BOOKING] Giftcard consumed successfully:', { 
          giftcardId, 
          consumedAmount: actualAmountToConsume,
          newBalance: currentBalance - actualAmountToConsume,
          hadDiscrepancy: holdAmount !== actualAmountToConsume,
          bookingPaid: isPaid
        });
      } catch (giftcardError) {
        try { await sql`ROLLBACK`; } catch (rbErr) { console.warn('rollback failed after giftcard processing error', rbErr); }
        console.error('[ADD BOOKING] Error processing giftcard:', giftcardError);
        // Don't fail the booking creation, but log the error
      }
    }

    // Create invoice request if invoiceData is provided
    if (body.invoiceData) {
      try {
        console.log('[ADD BOOKING] Creating invoice request for booking:', booking.bookingCode);
        const invoiceData = body.invoiceData;
        
        await sql`
          INSERT INTO invoice_requests (
            booking_id, company_name, tax_id, address, email, status, requested_at
          ) VALUES (
            ${booking.id}, 
            ${invoiceData.companyName || ''}, 
            ${invoiceData.taxId || ''}, 
            ${invoiceData.address || ''}, 
            ${invoiceData.email || booking.userInfo.email}, 
            'Pending', 
            NOW()
          )
        `;
        
        console.log('[ADD BOOKING] Invoice request created successfully');
      } catch (invoiceError) {
        console.error('[ADD BOOKING] Error creating invoice request:', invoiceError);
        // Don't fail the booking creation if invoice request fails
        // The booking is already created, just log the error
      }
    }

        // Send pre-booking confirmation email
        const suppressPreBookingEmail = Boolean(options?.suppressPreBookingEmail) || technique === 'painting';
        if (!suppressPreBookingEmail) {
            try {
                console.log('[ADD BOOKING] Sending pre-booking confirmation email to:', booking.userInfo.email);
      
      // CRÍTICO: Re-fetch booking ANTES de enviar email para obtener payment_details actualizados
      let bookingForEmail = booking;
      try {
        const { rows: [updatedBookingRow] } = await sql`
          SELECT * FROM bookings WHERE booking_code = ${newBookingCode} LIMIT 1
        `;
        if (updatedBookingRow) {
          bookingForEmail = parseBookingFromDB(updatedBookingRow);
          console.log('[ADD BOOKING] Refreshed booking before email - paymentDetails:', bookingForEmail.paymentDetails?.length || 0);
        }
      } catch (refetchErr) {
        console.warn('[ADD BOOKING] Could not refresh booking before email:', refetchErr);
        // Continue with original booking if refetch fails
      }
      
      // Get bank details from environment or use default
      const bankDetails = {
        bankName: 'Banco Pichincha',
        accountHolder: 'Carolina Massuh Morán',
        accountNumber: '2100334248',
        accountType: 'Cuenta Corriente',
        taxId: '0921343935'
      };
      
      // Use couples-specific email for COUPLES_EXPERIENCE
      if (isCouplesExperience) {
        await emailService.sendCouplesTourConfirmationEmail(bookingForEmail, bankDetails);
      } else {
        await emailService.sendPreBookingConfirmationEmail(bookingForEmail, bankDetails);
      }
                console.log('[ADD BOOKING] Confirmation email sent successfully');
            } catch (emailError) {
                console.error('[ADD BOOKING] Error sending confirmation email:', emailError);
                // Don't fail the booking creation if email fails
                // The booking is already created, just log the error
            }
        }

    // Re-fetch booking para obtener datos actualizados después de payment_details
    try {
      const { rows: [updatedBookingRow] } = await sql`
        SELECT * FROM bookings WHERE booking_code = ${newBookingCode} LIMIT 1
      `;
      if (updatedBookingRow) {
        const refreshedBooking = parseBookingFromDB(updatedBookingRow);
        console.log('[ADD BOOKING] Returning refreshed booking:', {
          bookingCode: refreshedBooking.bookingCode,
          isPaid: refreshedBooking.isPaid,
          hasPaymentDetails: !!refreshedBooking.paymentDetails?.length,
          paymentCount: refreshedBooking.paymentDetails?.length || 0
        });
        return {
          success: true,
          message: 'Booking created successfully',
          booking: refreshedBooking,
        };
      }
    } catch (refetchError) {
      console.warn('[ADD BOOKING] Could not refetch updated booking, returning original:', refetchError);
    }

    return {
      success: true,
      message: 'Booking created successfully',
      booking,
    };
  } catch (error) {
    console.error('Error creating booking:', error);
    throw new Error('Failed to create booking');
  }
}

// Eliminar clases por ID
async function deleteClassesByIds(classIds: number[]): Promise<number> {
    if (!Array.isArray(classIds) || classIds.length === 0) {
        throw new Error('Invalid classIds array');
    }
    
    // Convert classIds to an array of strings to ensure compatibility with SQL
    const stringClassIds = classIds.map(String);
    const deletedCount = await sql`
        DELETE FROM products WHERE id = ANY(ARRAY[${stringClassIds.map(id => `'${id}'`).join(',')}])
        RETURNING *;
    `;

    // Ensure rowCount is not null
    const rowCount = deletedCount.rowCount || 0;
    return rowCount;
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
    const { action } = req.query;

    if (action === 'deleteClassesBatch') {
        const { classIds } = req.body;

        if (!Array.isArray(classIds) || classIds.length === 0) {
            return res.status(400).json({ error: 'classIds must be a non-empty array.' });
        }

        try {
            const deletedCount = await deleteClassesByIds(classIds);
            return res.status(200).json({ success: true, deletedCount });
        } catch (error) {
            console.error('Error deleting classes:', error);
            return res.status(500).json({ error: 'Failed to delete classes.' });
        }
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
}
