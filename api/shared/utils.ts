// Shared utilities for API modules
import type { Booking, Notification, ClientNotification, GroupInquiry, InvoiceRequest } from '../../types';

// ============ DATA TRANSFORMATION UTILITIES ============

// Convierte claves snake_case a camelCase en objetos y arrays
export function toCamelCase(obj: any): any {
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

// ============ DATE UTILITIES ============

// Función auxiliar para parsear fechas de forma segura
export function safeParseDate(value: any): Date | null {
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

// ============ PARSERS ============

export const parseBookingFromDB = (dbRow: any): Booking => {
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

export const parseNotificationFromDB = (dbRow: any): Notification => {
    if (!dbRow) return dbRow;
    const camelCased = toCamelCase(dbRow);
    const parsedDate = safeParseDate(camelCased.timestamp);
    camelCased.timestamp = parsedDate ? parsedDate.toISOString() : new Date().toISOString();
    return camelCased as Notification;
};

export const parseClientNotificationFromDB = (dbRow: any): ClientNotification => {
    if (!dbRow) return dbRow;
    const camelCased = toCamelCase(dbRow);
    
    camelCased.createdAt = camelCased.createdAtIso || null;
    delete camelCased.createdAtIso;

    const scheduledAtDate = safeParseDate(camelCased.scheduledAt);
    camelCased.scheduledAt = scheduledAtDate ? scheduledAtDate.toISOString() : undefined;

    return camelCased as ClientNotification;
};

export const parseGroupInquiryFromDB = (dbRow: any): GroupInquiry => {
    if (!dbRow) return dbRow;
    const camelCased = toCamelCase(dbRow);
    camelCased.createdAt = camelCased.createdAt || null;
    return camelCased as GroupInquiry;
}

export const parseInvoiceRequestFromDB = (dbRow: any): InvoiceRequest => {
    if (!dbRow) return dbRow;
    const camelCased = toCamelCase(dbRow);
    camelCased.requestedAt = camelCased.requestedAtIso;
    delete camelCased.requestedAtIso;
    camelCased.processedAt = safeParseDate(camelCased.processedAt)?.toISOString();
    return camelCased as InvoiceRequest;
};

// ============ ID GENERATORS ============

export const generateBookingCode = (): string => {
    const prefix = 'C-ALMA';
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${timestamp}${randomPart}`;
};

// ============ TIME UTILITIES ============

export const normalizeTime = (t: string): string => {
    if (!t) return '';
    if (/^\d{2}:\d{2}$/.test(t)) return t;
    const match = t.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    return t;
};

export const timeToMinutes = (timeStr: string): number => {
    const [hours, mins] = timeStr.split(':').map(Number);
    return hours * 60 + mins;
};

export const hasTimeOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
    return start1 < end2 && start2 < end1;
};
