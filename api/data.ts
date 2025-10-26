// Convierte claves snake_case a camelCase en objetos y arrays
function toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        // Handle Date objects specially
        if (obj instanceof Date) {
            return obj.toISOString().split('T')[0]; // Return YYYY-MM-DD format
        }
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            let value = obj[key];
            // Convert Date objects to strings
            if (value instanceof Date) {
                value = value.toISOString().split('T')[0];
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
import { generatePaymentId } from '../utils/formatters.js';
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
        camelCased.participants = dbRow.participants !== undefined ? dbRow.participants : null;
        
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

        // Calculate giftcard-specific fields
        const giftcardPayments = (camelCased.paymentDetails || []).filter((p: any) => p.method === 'Giftcard');
        camelCased.giftcardApplied = giftcardPayments.length > 0;
        camelCased.giftcardRedeemedAmount = giftcardPayments.reduce((sum: number, p: any) => sum + (p.giftcardAmount || p.amount || 0), 0);
        camelCased.giftcardId = giftcardPayments.length > 0 ? (giftcardPayments[0].giftcardId || null) : null;
        camelCased.pendingBalance = Math.max(0, camelCased.price - totalPaid);

        // Debug log for giftcard bookings
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
                        // Include metadata so admin UI can surface issued codes, voucher URLs, etc.
                        metadata: row.metadata || null
                    }));
                    data = formatted;
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
                    FROM inquiries ORDER BY created_at DESC
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
                    break;
                }
                case 'deliveries': {
                    const { rows: deliveries } = await sql`SELECT * FROM deliveries ORDER BY scheduled_date ASC, created_at DESC`;
                    data = deliveries.map(toCamelCase);
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
                    // Get all unique customers from bookings
                    const { rows: bookings } = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
                    const validBookings = bookings.filter(booking => booking && typeof booking === 'object');
                    const parsedBookings = validBookings.map(parseBookingFromDB).filter(Boolean);
                    const customerMap = new Map<string, Customer>();
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
                    data = Array.from(customerMap.values());
                    console.log(`[API] Generated ${data.length} customers from ${parsedBookings.length} bookings`);
                    break;
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
                const { rows: products } = await sql`SELECT * FROM products ORDER BY sort_order ASC NULLS LAST, name ASC`;
                console.log('GET products from DB:', products.length, 'SINGLE_CLASS:', products.filter(p => p.type === 'SINGLE_CLASS').length);
                data = products.map(toCamelCase);
            } else if (key === 'bookings') {
                const { rows: bookings } = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
                console.log(`API: Raw database query returned ${bookings.length} rows`);
                
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
            } else if (key === 'customers') {
                // Get all unique customers from bookings
                const { rows: bookings } = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
                const validBookings = bookings.filter(booking => booking && typeof booking === 'object');
                const parsedBookings = validBookings.map(parseBookingFromDB).filter(Boolean);
                
                const customerMap = new Map<string, Customer>();
                
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
                
                data = Array.from(customerMap.values());
                console.log(`Generated ${data.length} customers from ${parsedBookings.length} bookings`);
            } else {
                const { rows: settings } = await sql`SELECT value FROM settings WHERE key = ${key}`;
                if (settings.length > 0) {
                    data = settings[0].value;
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
                        case 'classCapacity':
                        case 'automationSettings':
                        case 'footerInfo':
                        case 'backgroundSettings':
                            data = {};
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
    switch (action) {
        case 'addGiftcardRequest': {
            // Inserta una nueva solicitud de giftcard en la base de datos
            const body = req.body;
            if (!body || !body.buyerName || !body.buyerEmail || !body.recipientName || !body.amount || !body.code) {
                return res.status(400).json({ success: false, error: 'Datos incompletos para registrar giftcard.' });
            }
            try {
                // Crear tabla si no existe y agregar columna buyer_message si falta
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
                        buyer_message TEXT
                    )
                `;
                // Asegura la columna buyer_message si la tabla ya existía
                try {
                    await sql`ALTER TABLE giftcard_requests ADD COLUMN IF NOT EXISTS buyer_message TEXT`;
                } catch (e) {}
                const { rows } = await sql`
                    INSERT INTO giftcard_requests (
                        buyer_name, buyer_email, recipient_name, recipient_email, recipient_whatsapp, amount, code, status, buyer_message
                    ) VALUES (
                        ${body.buyerName}, ${body.buyerEmail}, ${body.recipientName}, ${body.recipientEmail || null}, ${body.recipientWhatsapp || null}, ${body.amount}, ${body.code}, 'pending', ${body.message || null}
                    ) RETURNING id, created_at;
                `;
                // Enviar email de confirmación de recepción de solicitud
                try {
                    const emailServiceModule = await import('./emailService.js');
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
                } catch (err) {
                    console.warn('No se pudo enviar el email de confirmación de solicitud de giftcard:', err);
                }
                return res.status(200).json({ success: true, id: rows[0].id, createdAt: rows[0].created_at });
            } catch (error) {
                console.error('Error al registrar giftcard:', error);
                return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
        }

        case 'validateGiftcard': {
            // Validate a giftcard code and return balance, expiry and status.
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
                const { rows } = await sql`SELECT * FROM giftcard_requests WHERE COALESCE(status, '') <> 'deleted' ORDER BY created_at DESC`;
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
                        // Include metadata so admin UI can surface issued codes, voucher URLs, etc.
                        metadata: row.metadata || null
                }));
                return res.status(200).json(formatted);
            } catch (error) {
                console.error('Error al listar giftcards:', error);
                return res.status(500).json([]);
            }
        }
            break;
        case 'approveGiftcardRequest': {
            // Admin action: mark request as approved and insert audit event
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
                let s3Module: any = null;
                let qrModule: any = null;
                let pdfModule: any = null;
                try {
                    s3Module = await import('./s3.js');
                } catch (e) {
                    // ignore
                }
                try {
                    qrModule = await import('./qr.js');
                } catch (e) {}
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


                // Send emails: buyer receipt (attach PDF) and optionally recipient email — always attempt
                let buyerEmailResult: any = null;
                let recipientEmailResult: any = null;
                try {
                    const emailServiceModule = await import('./emailService.js');
                    let pdfBase64: string | undefined;
                    let downloadLink: string | undefined;
                    if (pdfS3Url) {
                        // If uploaded to S3, create a presigned GET URL for download
                        try {
                            const s3m = await import('./s3.js');
                            const key = pdfS3Url.replace(`s3://${s3m.defaultBucket || ''}/`, '');
                            const maybe = await s3m.generatePresignedGetUrl(key, 60 * 60 * 24 * 7); // 7 days
                            if (maybe) downloadLink = maybe;
                        } catch (err) {
                            console.warn('Failed to generate presigned URL for pdf:', err);
                        }
                    } else if (typeof localPdfBuffer !== 'undefined' && localPdfBuffer) {
                        pdfBase64 = localPdfBuffer.toString('base64');
                    }

                    if (!downloadLink && pdfS3Url) downloadLink = pdfS3Url;

                    const buyerEmail = updated.buyer_email || updated.buyerEmail;
                    const buyerName = updated.buyer_name || updated.buyerName;
                    const buyerMessage = updated.buyer_message || null;
                    if (buyerEmail) {
                        try {
                            buyerEmailResult = await emailServiceModule.sendGiftcardPaymentConfirmedEmail(
                                buyerEmail,
                                {
                                    buyerName,
                                    amount: Number(updated.amount),
                                    code,
                                    recipientName: updated.recipient_name || updated.recipientName,
                                    recipientEmail: updated.recipient_email || updated.recipientEmail,
                                    message: buyerMessage
                                },
                                pdfBase64,
                                downloadLink
                            );
                        } catch (e) {
                            console.warn('Buyer email send failed:', e);
                            buyerEmailResult = { sent: false, error: e instanceof Error ? e.message : String(e) };
                        }
                    }
                    const recipientEmail = updated.recipient_email || updated.recipientEmail;
                    if (recipientEmail) {
                        try {
                            recipientEmailResult = await emailServiceModule.sendGiftcardRecipientEmail(
                                recipientEmail,
                                {
                                    recipientName: updated.recipient_name || updated.recipientName,
                                    amount: Number(updated.amount),
                                    code,
                                    message: buyerMessage,
                                    buyerName
                                },
                                pdfBase64,
                                downloadLink
                            );
                        } catch (e) {
                            console.warn('Recipient email send failed:', e);
                            recipientEmailResult = { sent: false, error: e instanceof Error ? e.message : String(e) };
                        }
                    }

                    // Persist email result metadata to request
                    try {
                        const emailMeta = { buyer: buyerEmailResult, recipient: recipientEmailResult };
                        await sql`
                            UPDATE giftcard_requests SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ emailDelivery: emailMeta })}::jsonb WHERE id = ${id}
                        `;
                    } catch (metaErr) {
                        console.warn('Failed to persist email delivery metadata:', metaErr);
                    }
                } catch (emailErr) {
                    console.warn('Failed to send giftcard emails:', emailErr);
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
                            p.description || null,
                            p.imageUrl || null,
                            details,
                            p.isActive,
                            schedulingRules,
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
                return res.status(400).json({ error: 'Email is required.' });
            }
            await sql`DELETE FROM customers WHERE email = ${email}`;
            return res.status(200).json({ success: true });
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
            const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
            const isPaid = totalPaid >= bookingRow.price;

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
            
            const { rows: [bookingRow] } = await sql`SELECT payment_details, price FROM bookings WHERE id = ${bookingId}`;

            if (!bookingRow) {
                return res.status(404).json({ error: 'Booking not found.' });
            }

            const currentPayments = (bookingRow.payment_details && Array.isArray(bookingRow.payment_details))
                ? bookingRow.payment_details
                : [];

            console.log('[API][deletePaymentFromBooking] Current payments:', currentPayments.length);

            let deletedPayment: any = null;
            let updatedPayments: any[] = [];

            if (paymentId) {
                // New way: Find and remove by ID
                const paymentIndex = currentPayments.findIndex((p: any) => p.id === paymentId);
                
                if (paymentIndex === -1) {
                    console.error('[API][deletePaymentFromBooking] Payment not found with ID:', paymentId);
                    return res.status(404).json({ error: `Payment not found with ID: ${paymentId}` });
                }
                
                deletedPayment = currentPayments[paymentIndex];
                updatedPayments = currentPayments.filter((p: any) => p.id !== paymentId);
                console.log('[API][deletePaymentFromBooking] Deleted payment by ID:', paymentId, 'at index:', paymentIndex);
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
            await sql`
                INSERT INTO notifications (type, target_id, user_name, summary)
                VALUES ('payment_deleted', ${bookingId}, ${deletedPayment.method || 'N/A'}, ${cancelReason || 'Deleted by admin'});
            `;
            
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
            const { bookingId: rescheduleId, oldSlot, newSlot } = rescheduleBody;
            const { rows: [bookingToReschedule] } = await sql`SELECT slots FROM bookings WHERE id = ${rescheduleId}`;
            if (bookingToReschedule) {
                const otherSlots = bookingToReschedule.slots.filter((s: any) => s.date !== oldSlot.date || s.time !== oldSlot.time);
                const updatedSlots = [...otherSlots, newSlot];
                await sql`UPDATE bookings SET slots = ${JSON.stringify(updatedSlots)} WHERE id = ${rescheduleId}`;
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
            if (!bookingId) {
                return res.status(400).json({ error: 'bookingId is required' });
            }
            await sql`DELETE FROM bookings WHERE id = ${bookingId}`;
            return res.status(200).json({ success: true });
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
            await sql`UPDATE bookings SET attendance = COALESCE(attendance, '{}'::jsonb) || ${JSON.stringify({ [slotIdentifier]: status })}::jsonb WHERE id = ${attendanceId}`;
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
        case 'createDelivery': {
            const { customerEmail, description, scheduledDate, status = 'pending', notes, photos } = req.body;
            
            if (!customerEmail || !description || !scheduledDate) {
                return res.status(400).json({ error: 'customerEmail, description, and scheduledDate are required.' });
            }
            
            // Convert photos array to JSON string for storage
            const photosJson = photos && Array.isArray(photos) ? JSON.stringify(photos) : null;
            
            const { rows: [newDelivery] } = await sql`
                INSERT INTO deliveries (customer_email, description, scheduled_date, status, notes, photos)
                VALUES (${customerEmail}, ${description}, ${scheduledDate}, ${status}, ${notes || null}, ${photosJson})
                RETURNING *;
            `;
            
            return res.status(200).json({ success: true, delivery: toCamelCase(newDelivery) });
        }
        case 'updateDelivery': {
            const { deliveryId, updates } = req.body;
            if (!deliveryId || !updates) {
                return res.status(400).json({ error: 'deliveryId and updates are required.' });
            }
            const setClause = Object.entries(updates)
                .filter(([key, value]) => value !== undefined)
                .map(([key, value]) => {
                    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    return `${snakeKey} = $${Object.keys(updates).indexOf(key) + 2}`;
                })
                .join(', ');
            
            if (!setClause) {
                return res.status(400).json({ error: 'No valid updates provided.' });
            }
            
            const values = [deliveryId, ...Object.values(updates).filter(v => v !== undefined)];
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
            
            return res.status(200).json({ success: true, delivery: toCamelCase(completedDelivery) });
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
        default:
            return res.status(400).json({ error: `Unknown action: ${action}` });
    }
    
    return res.status(200).json(result);
}


async function addBookingAction(body: Omit<Booking, 'id' | 'createdAt' | 'bookingCode'> & { invoiceData?: Omit<InvoiceRequest, 'id' | 'bookingId' | 'status' | 'requestedAt' | 'processedAt'> }): Promise<AddBookingResult> {
    const { productId, slots, userInfo, productType, invoiceData, bookingDate, participants, clientNote } = body;

    // IDEMPOTENCY: Check if bookingCode already exists (prevent duplicate submissions)
    const bookingCodeCheck = (body as any).bookingCode;
    if (bookingCodeCheck) {
        const { rows: existingByCode } = await sql`SELECT * FROM bookings WHERE booking_code = ${bookingCodeCheck}`;
        if (existingByCode.length > 0) {
            console.log('[IDEMPOTENCY] Booking already exists with code:', bookingCodeCheck);
            return { success: true, message: 'Booking already exists (idempotent).', booking: parseBookingFromDB(existingByCode[0]) };
        }
    }

        // Sincronizar cliente en tabla customers
        try {
            await createCustomer({
                email: userInfo.email,
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                phone: userInfo.phone,
                countryCode: userInfo.countryCode,
                birthday: typeof userInfo.birthday === 'string' ? userInfo.birthday : undefined
            });
        } catch (error) {
            // No romper el flujo si falla la creación del cliente
            console.error('Error creando/actualizando cliente:', error);
        }
    
    // Atomic deduplication: check for existing booking and slot, prevent race conditions
    if (productType === 'INTRODUCTORY_CLASS' || productType === 'CLASS_PACKAGE' || productType === 'SINGLE_CLASS' || productType === 'GROUP_CLASS') {
        for (const newSlot of slots) {
            // Buscar todas las reservas del usuario
            const { rows: userBookings } = await sql`
                SELECT * FROM bookings WHERE user_info->>'email' = ${userInfo.email}
            `;
            for (const booking of userBookings) {
                const bookingSlots = Array.isArray(booking.slots) ? booking.slots : [];
                // Comparar cada slot existente por date, time, instructorId
                const duplicateSlot = bookingSlots.find((s: any) =>
                    s.date === newSlot.date &&
                    s.time === newSlot.time &&
                    s.instructorId === newSlot.instructorId
                );
                if (duplicateSlot) {
                    // Si existe, retorna la reserva existente
                    const parsedExisting = parseBookingFromDB(booking);
                    return { success: true, message: 'Booking already exists.', booking: parsedExisting };
                }
            }
        }
    }
    
    const newBooking: Omit<Booking, 'id'> = {
    ...body,
    bookingCode: generateBookingCode(),
    createdAt: new Date(),
    };
    // If the client provided a holdId, confirm and consume the hold atomically with the booking creation
    const holdId = (body as any).holdId || (body as any).hold_id || null;

    let insertedRow: any;

    if (holdId) {
        try {
            await sql`BEGIN`;

            // Lock the hold row
            const { rows: [holdRow] } = await sql`SELECT * FROM giftcard_holds WHERE id = ${holdId} FOR UPDATE`;
            if (!holdRow) {
                await sql`ROLLBACK`;
                return { success: false, message: 'hold_not_found' };
            }

            // Check expiration
            if (holdRow.expires_at && new Date(holdRow.expires_at) <= new Date()) {
                await sql`ROLLBACK`;
                return { success: false, message: 'hold_expired' };
            }

            const gid = String(holdRow.giftcard_id);

            // Lock the giftcard row to avoid races
            const { rows: [giftcardRow] } = await sql`SELECT * FROM giftcards WHERE id = ${gid} FOR UPDATE`;
            if (!giftcardRow) {
                await sql`ROLLBACK`;
                return { success: false, message: 'giftcard_not_found' };
            }

            const currentBalance = (typeof giftcardRow.balance === 'number') ? Number(giftcardRow.balance) : (giftcardRow.balance ? Number(giftcardRow.balance) : 0);
            const holdAmount = Number(holdRow.amount);

            if (currentBalance < holdAmount) {
                await sql`ROLLBACK`;
                return { success: false, message: 'insufficient_balance' };
            }

            // Deduct balance and append to redeemed_history if column exists
            const redeemedEntry = JSON.stringify({ amount: holdAmount, redeemedAt: new Date().toISOString(), holdId, bookingTempRef: holdRow.booking_temp_ref || null });
            try {
                await sql`
                    UPDATE giftcards
                    SET balance = ${currentBalance - holdAmount}, redeemed_history = COALESCE(redeemed_history, '[]'::jsonb) || ${redeemedEntry}::jsonb
                    WHERE id = ${gid}
                `;
            } catch (e) {
                // If the update fails for any reason, rollback
                console.error('Failed updating giftcard balance:', e);
                await sql`ROLLBACK`;
                return { success: false, message: 'failed_update_giftcard' };
            }

            // Remove the hold (consumed)
            await sql`DELETE FROM giftcard_holds WHERE id = ${holdId}`;

            // Create paymentDetails entry for giftcard
            const paymentDetails = JSON.stringify([{ 
                amount: holdAmount, 
                method: 'Giftcard', 
                receivedAt: new Date().toISOString(), 
                giftcardAmount: holdAmount,
                giftcardId: String(giftcardRow.id),
                metadata: { giftcardId: giftcardRow.id, code: giftcardRow.code } 
            }]);

            // If giftcard covers total price, mark as paid
            const isPaidFinal = holdAmount >= Number(newBooking.price || 0);

            // Insert booking inside the same transaction with payment details
            const { rows: [created] } = await sql`
                INSERT INTO bookings (product_id, product_type, slots, user_info, created_at, is_paid, price, booking_mode, product, booking_code, booking_date, participants, client_note, payment_details, giftcard_redeemed_amount, giftcard_id)
                VALUES (
                    ${newBooking.productId},
                    ${newBooking.productType},
                    ${JSON.stringify(newBooking.slots)},
                    ${JSON.stringify(newBooking.userInfo)},
                    ${new Date().toISOString()},
                    ${isPaidFinal},
                    ${newBooking.price},
                    ${newBooking.bookingMode},
                    ${JSON.stringify(newBooking.product)},
                    ${newBooking.bookingCode},
                    ${bookingDate},
                    ${participants || 1},
                    ${clientNote || null},
                    ${paymentDetails},
                    ${holdAmount},
                    ${String(giftcardRow.id)}
                )
                RETURNING *;
            `;

            insertedRow = created;

            console.log('[GIFTCARD BOOKING] Booking created with hold:', {
                bookingId: created.id,
                bookingCode: created.booking_code,
                email: created.user_info?.email || 'N/A',
                isPaid: isPaidFinal,
                paymentDetails: paymentDetails,
                giftcardAmount: holdAmount,
                giftcardId: String(giftcardRow.id)
            });

            // Optionally create invoice request here as before
            if (invoiceData) {
                const { rows: [invoiceRequestRow] } = await sql`
                    INSERT INTO invoice_requests (booking_id, status, company_name, tax_id, address, email)
                    VALUES (${created.id}, 'Pending', ${invoiceData.companyName}, ${invoiceData.taxId}, ${invoiceData.address}, ${invoiceData.email})
                    RETURNING id;
                `;
                await sql`
                    INSERT INTO notifications (type, target_id, user_name, summary)
                    VALUES ('new_invoice_request', ${invoiceRequestRow.id}, ${`${userInfo.firstName} ${userInfo.lastName}`}, ${created.booking_code});
                `;
            }

            // Notification insertion as before
            await sql`
                INSERT INTO notifications (type, target_id, user_name, summary)
                VALUES ('new_booking', ${created.id}, ${`${userInfo.firstName} ${userInfo.lastName}`}, ${newBooking.product.name});
            `;

            await sql`COMMIT`;
        } catch (err) {
            try { await sql`ROLLBACK`; } catch(e){}
            
            // CRITICAL: Clean up orphaned hold if one was created
            if (holdId) {
                try {
                    await sql`DELETE FROM giftcard_holds WHERE id = ${holdId}`;
                    console.log('[HOLD CLEANUP] Deleted orphaned hold:', holdId);
                } catch (cleanupErr) {
                    console.error('[HOLD CLEANUP] Failed to delete hold:', holdId, cleanupErr);
                }
            }
            
            console.error('Error in booking+hold transaction:', err);
            return { success: false, message: err instanceof Error ? err.message : String(err) };
        }
    } else {
        // Support immediate giftcard consumption (no hold) when client sends giftcard info
        const giftcardCode = (body as any).giftcardCode || (body as any).giftcard_code || (body as any).code || null;
        const giftcardId = (body as any).giftcardId || (body as any).giftcard_id || null;
        const giftcardAmount = typeof (body as any).giftcardAmount !== 'undefined' ? Number((body as any).giftcardAmount) : (typeof (body as any).giftcard_amount !== 'undefined' ? Number((body as any).giftcard_amount) : null);

        if ((giftcardCode || giftcardId) && giftcardAmount && giftcardAmount > 0) {
            // Attempt to consume the giftcard atomically and create booking with paymentDetails
            try {
                await sql`BEGIN`;

                // Lock giftcard row (by id or code)
                let giftcardRow: any = null;
                if (giftcardId) {
                    const { rows: [g] } = await sql`SELECT * FROM giftcards WHERE id = ${String(giftcardId)} FOR UPDATE`;
                    giftcardRow = g;
                } else {
                    const { rows: [g] } = await sql`SELECT * FROM giftcards WHERE code = ${giftcardCode} FOR UPDATE`;
                    giftcardRow = g;
                }

                if (!giftcardRow) {
                    await sql`ROLLBACK`;
                    return { success: false, message: 'giftcard_not_found' } as AddBookingResult;
                }

                const currentBalance = (typeof giftcardRow.balance === 'number') ? Number(giftcardRow.balance) : (giftcardRow.balance ? Number(giftcardRow.balance) : 0);
                if (currentBalance < giftcardAmount) {
                    await sql`ROLLBACK`;
                    return { success: false, message: 'insufficient_balance' } as AddBookingResult;
                }

                // Deduct balance and append to redeemed_history if column exists
                const redeemedEntry = JSON.stringify({ amount: giftcardAmount, redeemedAt: new Date().toISOString(), giftcardId: giftcardRow.id || null });
                try {
                    await sql`
                        UPDATE giftcards
                        SET balance = ${currentBalance - giftcardAmount}, redeemed_history = COALESCE(redeemed_history, '[]'::jsonb) || ${redeemedEntry}::jsonb
                        WHERE id = ${String(giftcardRow.id)}
                    `;
                } catch (e) {
                    await sql`ROLLBACK`;
                    return { success: false, message: 'failed_update_giftcard' } as AddBookingResult;
                }

                // Create booking and include paymentDetails entry for giftcard
                const paymentDetails = JSON.stringify([{ 
                    amount: giftcardAmount, 
                    method: 'Giftcard', 
                    receivedAt: new Date().toISOString(), 
                    giftcardAmount: giftcardAmount,
                    giftcardId: String(giftcardRow.id || null),
                    metadata: { giftcardId: giftcardRow.id || null, code: giftcardRow.code || giftcardCode } 
                }]);

                // If giftcard covers total price, mark as paid
                const isPaidFinal = giftcardAmount >= Number(newBooking.price || 0);

                const { rows: [created] } = await sql`
                    INSERT INTO bookings (product_id, product_type, slots, user_info, created_at, is_paid, price, booking_mode, product, booking_code, booking_date, participants, client_note, payment_details, giftcard_redeemed_amount, giftcard_id)
                    VALUES (
                        ${newBooking.productId},
                        ${newBooking.productType},
                        ${JSON.stringify(newBooking.slots)},
                        ${JSON.stringify(newBooking.userInfo)},
                        ${new Date().toISOString()},
                        ${isPaidFinal},
                        ${newBooking.price},
                        ${newBooking.bookingMode},
                        ${JSON.stringify(newBooking.product)},
                        ${newBooking.bookingCode},
                        ${bookingDate},
                        ${participants || 1},
                        ${clientNote || null},
                        ${paymentDetails},
                        ${giftcardAmount},
                        ${String(giftcardRow.id)}
                    )
                    RETURNING *;
                `;

                insertedRow = created;

                await sql`COMMIT`;
            } catch (err) {
                try { await sql`ROLLBACK`; } catch(e){}
                
                // CRITICAL: Clean up orphaned hold if giftcard was validated but booking failed
                // (In immediate consume flow, no hold is created, but keeping this for consistency)
                console.error('Error creating booking with immediate giftcard consume:', err);
                return { success: false, message: err instanceof Error ? err.message : String(err) } as AddBookingResult;
            }
        } else {
            // No giftcard consumption requested: insert booking normally
            const { rows: [created] } = await sql`
                INSERT INTO bookings (product_id, product_type, slots, user_info, created_at, is_paid, price, booking_mode, product, booking_code, booking_date, participants, client_note)
                VALUES (
                    ${newBooking.productId},
                    ${newBooking.productType},
                    ${JSON.stringify(newBooking.slots)},
                    ${JSON.stringify(newBooking.userInfo)},
                    ${new Date().toISOString()},
                    ${newBooking.isPaid},
                    ${newBooking.price},
                    ${newBooking.bookingMode},
                    ${JSON.stringify(newBooking.product)},
                    ${newBooking.bookingCode},
                    ${bookingDate},
                    ${participants || 1},
                    ${clientNote || null}
                )
                RETURNING *;
            `;
            insertedRow = created;
        }
    }
    
    const fullyParsedBooking = parseBookingFromDB(insertedRow);

    if (invoiceData) {
        const { rows: [invoiceRequestRow] } = await sql`
            INSERT INTO invoice_requests (booking_id, status, company_name, tax_id, address, email)
            VALUES (${fullyParsedBooking.id}, 'Pending', ${invoiceData.companyName}, ${invoiceData.taxId}, ${invoiceData.address}, ${invoiceData.email})
            RETURNING id;
        `;
        await sql`
            INSERT INTO notifications (type, target_id, user_name, summary)
            VALUES ('new_invoice_request', ${invoiceRequestRow.id}, ${`${userInfo.firstName} ${userInfo.lastName}`}, ${fullyParsedBooking.bookingCode});
        `;
    }

    await sql`
    INSERT INTO notifications (type, target_id, user_name, summary)
    VALUES ('new_booking', ${fullyParsedBooking.id}, ${`${userInfo.firstName} ${fullyParsedBooking.userInfo.lastName}`}, ${newBooking.product.name});
    `;
    
    try {
        console.log(`[EMAIL DEBUG] Fetching automation settings for booking ${fullyParsedBooking.bookingCode}`);
        const { rows: settingsRows } = await sql`SELECT key, value FROM settings WHERE key = 'automationSettings' OR key = 'bankDetails'`;
        const automationSettings = settingsRows.find(r => r.key === 'automationSettings')?.value as AutomationSettings;
    const bankDetails = settingsRows.find(r => r.key === 'bankDetails')?.value as BankDetails[];

        console.log(`[EMAIL DEBUG] automationSettings.preBookingConfirmation.enabled:`, automationSettings?.preBookingConfirmation?.enabled);
        console.log(`[EMAIL DEBUG] bankDetails exists:`, !!bankDetails && bankDetails.length > 0);

        if (automationSettings?.preBookingConfirmation?.enabled && bankDetails && bankDetails.length > 0 && bankDetails[0].accountNumber) {
            console.log(`[EMAIL DEBUG] Sending pre-booking confirmation email to ${fullyParsedBooking.userInfo.email} for booking ${fullyParsedBooking.bookingCode}`);
            await emailService.sendPreBookingConfirmationEmail(fullyParsedBooking, bankDetails[0]);
            console.log(`[EMAIL DEBUG] Email sent successfully!`);
            await sql`
                INSERT INTO client_notifications (created_at, client_name, client_email, type, channel, status, booking_code)
                VALUES (
                    ${new Date().toISOString()},
                    ${`${fullyParsedBooking.userInfo.firstName} ${fullyParsedBooking.userInfo.lastName}`},
                    ${fullyParsedBooking.userInfo.email},
                    'PRE_BOOKING_CONFIRMATION', 'Email', 'Sent',
                    ${fullyParsedBooking.bookingCode}
                );
            `;
            console.log(`[EMAIL DEBUG] client_notifications record inserted`);
        } else if (automationSettings?.preBookingConfirmation?.enabled) {
            console.log(`[EMAIL DEBUG] Skipping pre-booking confirmation email for ${fullyParsedBooking.bookingCode}: Bank details are not configured.`);
        } else {
            console.log(`[EMAIL DEBUG] Skipping pre-booking confirmation email for ${fullyParsedBooking.bookingCode}: Feature is disabled.`);
        }
    } catch(emailError) {
        console.error(`[EMAIL DEBUG] ERROR: Booking ${fullyParsedBooking.bookingCode} created, but confirmation email failed to send:`, emailError);
    }

    console.log('[BOOKING SUCCESS] Returning booking:', {
        id: fullyParsedBooking.id,
        bookingCode: fullyParsedBooking.bookingCode,
        email: fullyParsedBooking.userInfo?.email,
        isPaid: fullyParsedBooking.isPaid,
        price: fullyParsedBooking.price,
        giftcardApplied: fullyParsedBooking.giftcardApplied,
        giftcardRedeemedAmount: fullyParsedBooking.giftcardRedeemedAmount,
        paymentDetailsCount: fullyParsedBooking.paymentDetails?.length || 0
    });

    return { success: true, message: 'Booking added.', booking: fullyParsedBooking };
}
async function handleDelete(req: VercelRequest, res: VercelResponse) {
    const { key, id } = req.query;

    if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'A "key" query parameter is required for deletion.' });
    }
    if (!id) {
        return res.status(400).json({ error: 'An "id" query parameter is required for deletion.' });
    }

    try {
        switch (key) {
            case 'booking':
                await sql`DELETE FROM bookings WHERE id = ${Array.isArray(id) ? id[0] : id}`;
                break;
            case 'inquiry':
                await sql`DELETE FROM inquiries WHERE id = ${Array.isArray(id) ? id[0] : id}`;
                break;
            case 'notification':
                await sql`DELETE FROM notifications WHERE id = ${Array.isArray(id) ? id[0] : id}`;
                break;
            case 'clientNotification':
                await sql`DELETE FROM client_notifications WHERE id = ${Array.isArray(id) ? id[0] : id}`;
                break;
            case 'invoiceRequest':
                await sql`DELETE FROM invoice_requests WHERE id = ${Array.isArray(id) ? id[0] : id}`;
                break;
            case 'instructor':
                await sql`DELETE FROM instructors WHERE id = ${Array.isArray(id) ? id[0] : id}`;
                break;
            case 'product':
                await sql`DELETE FROM products WHERE id = ${Array.isArray(id) ? id[0] : id}`;
                break;
            default:
                return res.status(400).json({ error: `Unknown key for deletion: ${key}` });
        }
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Delete Error:', error);
        const errorMessage = (error instanceof Error) ? error.message : 'An internal server error occurred.';
        return res.status(500).json({ error: errorMessage });
    }
}
