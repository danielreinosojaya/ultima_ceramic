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
        
        // Parse product from JSON string
            if (camelCased.product && typeof camelCased.product === 'string') {
                try {
                    camelCased.product = JSON.parse(camelCased.product);
                } catch (e) {
                    console.error('Error parsing product JSON:', e);
                    // Asignar producto de fallback válido en vez de null
                    camelCased.product = {
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
                    };
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
        
        // Incluir client_note y participants explícitamente
        camelCased.clientNote = dbRow.client_note || null;
        camelCased.participants = dbRow.participants !== undefined && dbRow.participants !== null 
            ? parseInt(dbRow.participants, 10) 
            : 1;
        
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
        camelCased.isPaid = totalPaid >= (camelCased.price || 0);
        camelCased.pendingBalance = Math.max(0, (camelCased.price || 0) - totalPaid);

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
    const settingsResult = await sql`SELECT * FROM settings WHERE key IN ('availability', 'scheduleOverrides', 'classCapacity')`;
    const availability: any = settingsResult.rows.find(s => s.key === 'availability')?.value || 
        { Sunday: [], Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };
    const scheduleOverrides: any = settingsResult.rows.find(s => s.key === 'scheduleOverrides')?.value || {};
    const classCapacity: any = settingsResult.rows.find(s => s.key === 'classCapacity')?.value || 
        { potters_wheel: 8, molding: 22, introductory_class: 8 };
    return { availability, scheduleOverrides, classCapacity };
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
    const productName = booking.product?.name?.toLowerCase() || '';

    if (productName.includes('pintura')) return 'painting';
    if (productName.includes('torno')) return 'potters_wheel';
    if (productName.includes('modelado')) return 'hand_modeling';

    return booking.technique || (booking.product?.details as any)?.technique;
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

    const bookingTechnique = deriveBookingTechnique(booking) || 'hand_modeling';
    const participantCount = booking.participants
        ?? booking.groupClassMetadata?.totalParticipants
        ?? (typeof booking.product === 'object' && 'minParticipants' in booking.product
            ? (booking.product as any).minParticipants
            : undefined)
        ?? 1;

    if (bookingTechnique === 'potters_wheel') {
        potters = participantCount;
    } else {
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
    const times = baseSlots
        .filter((slot: any) => slot.technique === techniqueKey)
        .map((slot: any) => normalizeTime(slot.time));

    if (techniqueKey === 'potters_wheel') {
        if (dayKey === 'Tuesday') times.push('19:00');
        if (dayKey === 'Wednesday') times.push('11:00');
    }

    return [...new Set(times)].sort();
};

const isPottersFixedConflict = (candidateStart: number, fixedTimes: number[]) =>
    fixedTimes.some(fixedStart => {
        if (candidateStart === fixedStart) return false;
        return candidateStart >= fixedStart - 120 && candidateStart < fixedStart + 120;
    });

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
    // ⚡ CRÍTICO: Buscar bookings que TENGAN SLOTS en la fecha solicitada
    const bookingsResult = await sql`
        SELECT * FROM bookings 
        WHERE status != 'expired'
        ORDER BY created_at DESC
    `;

    // Filtrar en memoria: solo bookings que tengan slots en la fecha solicitada
    const allBookings = bookingsResult.rows.map(parseBookingFromDB);
    const bookings = allBookings.filter(booking => {
        if (!booking.slots || !Array.isArray(booking.slots)) return false;
        return booking.slots.some((s: any) => s.date === requestedDate);
    });

    const { scheduleOverrides, classCapacity } = await parseSlotAvailabilitySettings();
    const maxCapacityMap = getMaxCapacityMap(classCapacity);

    const normalizedTime = normalizeTime(requestedTime);
    const requestedStartMinutes = timeToMinutes(normalizedTime);
    const requestedEndMinutes = requestedStartMinutes + (2 * 60); // 2 horas

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

    const maxCapacity = resolveCapacity(requestedDate, requestedTechnique, maxCapacityMap, scheduleOverrides);
    const availableCapacity = maxCapacity - overlappingParticipants;
    const canBook = availableCapacity >= requestedParticipants;

    return {
        available: canBook,
        normalizedTime,
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

    // Ensure tables exist and migrations are applied
    try {
        await ensureTablesExist();
    } catch (err) {
        console.error('Error ensuring tables exist:', err);
        // Continue anyway, don't fail the request
    }

    // Test database connectivity with a simple query and timeout
    try {
        console.log('Testing database connectivity...');
        const startTime = Date.now();
        
        // Create a promise that resolves with the SQL query
        const queryPromise = sql`SELECT 1 as test`;
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Database query timeout after 10 seconds')), 10000);
        });
        
        // Race between the query and timeout
        await Promise.race([queryPromise, timeoutPromise]);
        
        const endTime = Date.now();
        console.log(`Database connectivity test passed in ${endTime - startTime}ms`);
    } catch (error) {
        console.error('Database connectivity test failed:', error);
        return res.status(500).json({ 
            error: 'Database connection failed', 
            details: error instanceof Error ? error.message : 'Database is unreachable' 
        });
    }

    // Skip table initialization for product operations to avoid timeouts
    // Tables should already exist from previous deployments
    console.log('Skipping table initialization for faster response');

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
                    await sql`CREATE TABLE IF NOT EXISTS giftcards (
                        id SERIAL PRIMARY KEY,
                        code VARCHAR(32) NOT NULL UNIQUE,
                        initial_value NUMERIC,
                        balance NUMERIC,
                        giftcard_request_id INTEGER,
                        expires_at TIMESTAMP,
                        metadata JSONB,
                        created_at TIMESTAMP DEFAULT NOW()
                    )`;
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
                const { rows: notifications } = await sql`SELECT * FROM notifications ORDER BY timestamp DESC`;
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
                    const limit = req.query.limit ? parseInt(req.query.limit as string) : 2000;
                    
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
                    const { rows: customers } = await sql`SELECT * FROM customers ORDER BY first_name ASC, last_name ASC`;
                    data = customers.map(toCamelCase);
                    break;
                }
                case 'getStandaloneCustomers': {
                    // Get all customers from customers table (standalone customers without necessarily having bookings)
                    const { rows: standaloneCustomers } = await sql`SELECT * FROM customers ORDER BY first_name ASC, last_name ASC`;
                    
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
                    // ⚡ OPTIMIZACIÓN: Usar pagination y caché agresivo (10 minutos)
                    const page = req.query.page ? parseInt(req.query.page as string) : 1;
                    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
                    const offset = (page - 1) * limit;
                    
                    console.log(`[getCustomers] Page ${page}, Limit ${limit}`);
                    
                    // Get all unique customers from bookings first
                    const { rows: bookings } = await sql`SELECT * FROM bookings WHERE status != 'expired' ORDER BY created_at DESC LIMIT 1000`;
                    const validBookings = bookings.filter(booking => booking && typeof booking === 'object');
                    const parsedBookings = validBookings.map(parseBookingFromDB).filter(Boolean);
                    const customerMap = new Map<string, Customer>();
                    
                    // Process booking customers
                    parsedBookings.forEach((booking: Booking) => {
                        if (!booking || !booking.userInfo || !booking.userInfo.email) return;
                        const email = booking.userInfo.email;
                        const existing = customerMap.get(email);
                        if (existing) {
                            existing.bookings.push(booking);
                            existing.totalBookings += 1;
                            existing.totalSpent += booking.price || 0;
                            const bookingDate = new Date(booking.createdAt);
                            if (bookingDate > existing.lastBookingDate) {
                                existing.lastBookingDate = bookingDate;
                            }
                        } else {
                            customerMap.set(email, {
                                email,
                                userInfo: booking.userInfo,
                                bookings: [booking],
                                totalBookings: 1,
                                totalSpent: booking.price || 0,
                                lastBookingDate: new Date(booking.createdAt),
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

                    // ⚡ CRÍTICO: No filtrar por created_at - debemos cargar todos los bookings activos
                    // y luego filtrar por fecha de slots en memoria
                    // Una reserva creada hace 3 meses para una fecha futura DEBE considerarse
                    
                    // Obtener datos necesarios
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
                        
                        // AGREGAR CLASES DE INTRODUCCIÓN DE TORNO PARA GRUPOS
                        // Martes 19:00 y Miércoles 11:00 para grupos de 2+ personas
                        if (requestedTechnique === 'potters_wheel' && requestedParticipants >= 2) {
                            if ((dayKey === 'Tuesday' && currentDate >= searchStartDate) || 
                                (dayKey === 'Wednesday' && currentDate >= searchStartDate)) {
                                
                                const introTime = dayKey === 'Tuesday' ? '19:00' : '11:00';
                                const slotStartMinutes = timeToMinutes(introTime);
                                const slotEndMinutes = slotStartMinutes + (2 * 60); // 2 horas

                                const hasCourseBlock = hasCourseOverlap(dateStr, slotStartMinutes, slotEndMinutes, courseSessionsByDate);
                                
                                if (!hasCourseBlock) {
                                    // Contar participantes que se solapan con este slot de introducción
                                    const bookingsOverlappingIntro = bookings.filter((b: any) => {
                                        if (!b.slots || !Array.isArray(b.slots)) return false;
                                        
                                        const bookingTechnique = b.technique || (b.product?.details as any)?.technique;
                                        if (bookingTechnique !== 'potters_wheel') return false;
                                        
                                        return b.slots.some((s: any) => {
                                            if (s.date !== dateStr) return false;
                                            
                                            const bookingStartMinutes = timeToMinutes(normalizeTime(s.time));
                                            const bookingEndMinutes = bookingStartMinutes + (2 * 60);
                                            
                                            return hasTimeOverlap(slotStartMinutes, slotEndMinutes, bookingStartMinutes, bookingEndMinutes);
                                        });
                                    });
                                    
                                    let bookedParticipantsIntro = bookingsOverlappingIntro.reduce((sum: number, b: any) => {
                                        return sum + (b.participants || 1);
                                    }, 0);
                                    
                                    // 🔒 REGLA CRÍTICA: Clases de introducción de torno son pre-establecidas, asumir MÍNIMO 1 persona
                                    if (bookedParticipantsIntro === 0) {
                                        bookedParticipantsIntro = 1;
                                        console.log(`🔒 [getAvailableSlots] Torno introducción ${introTime}: asumiendo 1 persona mínimo (clase pre-establecida)`);
                                    }
                                    
                                    const maxCapacityIntro = resolveCapacity(dateStr, 'potters_wheel', maxCapacityMap, scheduleOverrides);
                                    const availableCapacityIntro = maxCapacityIntro - bookedParticipantsIntro;
                                    const canBookIntro = availableCapacityIntro >= requestedParticipants;
                                    
                                    allSlots.push({
                                        date: dateStr,
                                        time: introTime,
                                        available: Math.max(0, availableCapacityIntro),
                                        total: maxCapacityIntro,
                                        canBook: canBookIntro,
                                        instructor: 'Instructor',
                                        instructorId: 0,
                                        technique: 'potters_wheel',
                                        blockedReason: null
                                    });
                                } else {
                                    // Slot bloqueado por curso
                                    allSlots.push({
                                        date: dateStr,
                                        time: introTime,
                                        available: 0,
                                        total: 0,
                                        canBook: false,
                                        instructor: 'Instructor',
                                        instructorId: 0,
                                        technique: 'potters_wheel',
                                        blockedReason: 'course_conflict'
                                    });
                                }
                            }
                        }
                        
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

                                if (!blockedReason) {
                                    bookings.forEach(booking => {
                                        if (!booking.slots || !Array.isArray(booking.slots)) return;

                                if (!blockedReason) {
