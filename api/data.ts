import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { seedDatabase, ensureTablesExist } from './db.js';
import * as emailService from './emailService.js';
import type {
    Product, Booking, ScheduleOverrides, Notification, Announcement, Instructor,
    ConfirmationMessage, ClassCapacity, CapacityMessageSettings, UITexts, FooterInfo,
    GroupInquiry, AddBookingResult, PaymentDetails, AttendanceStatus,
    InquiryStatus, DayKey, AvailableSlot, AutomationSettings, UserInfo, BankDetails, TimeSlot, ClientNotification, InvoiceRequest, ProductType
} from '../types.js';
import {
    DEFAULT_PRODUCTS, DEFAULT_AVAILABLE_SLOTS_BY_DAY, DEFAULT_INSTRUCTORS,
    DEFAULT_POLICIES_TEXT, DEFAULT_CONFIRMATION_MESSAGE, DEFAULT_CLASS_CAPACITY,
    DEFAULT_CAPACITY_MESSAGES, DEFAULT_FOOTER_INFO, DEFAULT_AUTOMATION_SETTINGS
} from '../constants.js';


// Simple in-memory cache for UI text endpoints
const uiTextCache: Record<string, { value: any, timestamp: number }> = {};
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

const toCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            acc[camelKey] = toCamelCase(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

const safeParseDate = (value: any): Date | null => {
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

    console.warn(`Could not parse date from unexpected type: ${typeof value}`, value);
    return null;
};

const parseBookingFromDB = (dbRow: any): Booking => {
    if (!dbRow) return dbRow;
    const camelCased = toCamelCase(dbRow);
    
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

    const totalPaid = (camelCased.paymentDetails || []).reduce((sum: number, p: any) => sum + p.amount, 0);
    camelCased.isPaid = totalPaid >= camelCased.price;


    return camelCased as Booking;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
// Simple in-memory cache for UI text endpoints
const uiTextCache: Record<string, { value: any, timestamp: number }> = {};
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            await handleGet(req, res);
        } else if (req.method === 'POST') {
            await handlePost(req, res);
        // } else if (req.method === 'DELETE') {
        //     await handleDelete(req, res);
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
    const { key } = req.query;
    
    if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'A "key" query parameter is required.' });
    }
    if (key === 'uiText_es' || key === 'uiText_en') {
        const cached = uiTextCache[key];
        const now = Date.now();
        if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
            return res.status(200).json(cached.value);
        }
        const { rows: settings } = await sql`SELECT value FROM settings WHERE key = ${key}`;
        if (settings.length > 0) {
            uiTextCache[key] = { value: settings[0].value, timestamp: now };
            return res.status(200).json(settings[0].value);
        } else {
            return res.status(404).json({ error: `Setting with key "${key}" not found.` });
        }
    } else if (key === 'products') {
        const { rows: products } = await sql`SELECT * FROM products ORDER BY id ASC`;
        return res.status(200).json(toCamelCase(products));
    } else if (key === 'bookings') {
        const { rows: bookings } = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
        return res.status(200).json(bookings.map(parseBookingFromDB));
    } else if (key === 'instructors') {
        const { rows: instructors } = await sql`SELECT * FROM instructors ORDER BY id ASC`;
        return res.status(200).json(toCamelCase(instructors));
    } else if (key === 'groupInquiries') {
        const { rows: inquiries } = await sql`
            SELECT
                id, name, email, phone, country_code, participants,
                TO_CHAR(tentative_date, 'YYYY-MM-DD') as tentative_date,
                tentative_time, event_type, message, status,
                TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
                inquiry_type
            FROM inquiries ORDER BY created_at DESC
        `;
        return res.status(200).json(inquiries.map(parseGroupInquiryFromDB));
    } else if (key === 'notifications') {
        const { rows: notifications } = await sql`SELECT * FROM notifications ORDER BY timestamp DESC`;
        return res.status(200).json(notifications.map(parseNotificationFromDB));
    } else if (key === 'clientNotifications') {
        const { rows: clientNotifications } = await sql`
            SELECT
                *,
                TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at_iso
            FROM client_notifications ORDER BY created_at DESC
        `;
        return res.status(200).json(clientNotifications.map(parseClientNotificationFromDB));
    } else if (key === 'invoiceRequests') {
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
        return res.status(200).json(invoiceRequests.map(parseInvoiceRequestFromDB));
    } else {
        const { rows: settings } = await sql`SELECT value FROM settings WHERE key = ${key}`;
        if (settings.length > 0) {
            return res.status(200).json(settings[0].value);
        } else {
            return res.status(404).json({ error: `Setting with key "${key}" not found.` });
        }
    }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
    const { key, action } = req.query;

    // if (action) {
    //     return handleAction(action as string, req, res);
    // }
    
    if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'A "key" query parameter is required for data updates.' });
    }




async function addBookingAction(body: Omit<Booking, 'id' | 'createdAt' | 'bookingCode'> & { invoiceData?: Omit<InvoiceRequest, 'id' | 'bookingId' | 'status' | 'requestedAt' | 'processedAt'> }): Promise<AddBookingResult> {
    const { productId, slots, userInfo, productType, invoiceData, bookingDate } = body;
    // ...existing code for addBookingAction...
    return { success: false, message: 'NOT_IMPLEMENTED' };
}}