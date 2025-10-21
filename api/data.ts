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
import { slotToDate as utilSlotToDate, slotsRequireNoRefund } from '../utils/bookingPolicy.js';
import { seedDatabase, ensureTablesExist, createCustomer } from './db.js';
import * as emailService from './emailService.js';
import { VercelRequest, VercelResponse } from '@vercel/node';
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

        // Map accepted_no_refund flag from DB to camelCase
        camelCased.acceptedNoRefund = dbRow.accepted_no_refund === true;

        const totalPaid = (camelCased.paymentDetails || []).reduce((sum: number, p: any) => sum + p.amount, 0);
        camelCased.isPaid = totalPaid >= camelCased.price;

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
    const { key } = req.query;
    let data;
    const action = req.query.action as string | undefined;
    if (action) {
        switch (action) {
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
                    // Si es bankDetails y el valor es string, parsear JSON
                    if (key === 'bankDetails' && typeof settings[0].value === 'string') {
                        try {
                            data = JSON.parse(settings[0].value);
                        } catch (e) {
                            console.error('Error parsing bankDetails JSON:', e);
                            data = [];
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
                console.log('[API] addPaymentToBooking - Antes de agregar:', { bookingId, currentPayments });
                const updatedPayments = [...currentPayments, payment];
                const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
                const isPaid = totalPaid >= bookingRow.price;

                const { rows: [updatedBookingRow] } = await sql`
                    UPDATE bookings
                    SET payment_details = ${JSON.stringify(updatedPayments)}, is_paid = ${isPaid}
                    WHERE id = ${bookingId}
                    RETURNING *;
                `;
                console.log('[API] addPaymentToBooking - Después de agregar:', { bookingId, updatedPayments, totalPaid, isPaid });

                const updatedBooking = parseBookingFromDB(updatedBookingRow);
                result = { success: true, booking: updatedBooking };

            try {
                await emailService.sendPaymentReceiptEmail(updatedBooking, payment);
            } catch (emailError) {
                console.warn(`Payment receipt email for booking ${updatedBooking.bookingCode} failed to send:`, emailError);
            }
            break;
        }

        case 'deletePaymentFromBooking': {
            const { bookingId, paymentIndex, cancelReason } = req.body;
            const { rows: [bookingRow] } = await sql`SELECT payment_details, price FROM bookings WHERE id = ${bookingId}`;

            if (!bookingRow) {
                return res.status(404).json({ error: 'Booking not found.' });
            }

            const currentPayments = (bookingRow.payment_details && Array.isArray(bookingRow.payment_details))
                ? bookingRow.payment_details
                : [];

            if (paymentIndex >= 0 && paymentIndex < currentPayments.length) {
                const deletedPayment = currentPayments[paymentIndex];
                const updatedPayments = currentPayments.filter((_: any, i: number) => i !== paymentIndex);
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
            } else {
                return res.status(400).json({ error: 'Invalid payment index.' });
            }
            break;
        }
        case 'updatePaymentDetails': {
            const { bookingId, paymentIndex, updatedDetails } = req.body;
            const { rows: [bookingRow] } = await sql`SELECT payment_details, price FROM bookings WHERE id = ${bookingId}`;

            if (!bookingRow) {
                return res.status(404).json({ error: 'Booking not found.' });
            }

            const currentPayments = (bookingRow.payment_details && Array.isArray(bookingRow.payment_details))
                ? bookingRow.payment_details
                : [];

            if (paymentIndex >= 0 && paymentIndex < currentPayments.length) {
                // Actualiza solo los campos enviados en updatedDetails
                const updatedPayments = currentPayments.map((p: any, i: number) =>
                    i === paymentIndex ? { ...p, ...updatedDetails } : p
                );
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
            } else {
                return res.status(400).json({ error: 'Invalid payment index.' });
            }
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
                // Fetch full booking to check accepted_no_refund
                const { rows: [fullBookingRow] } = await sql`SELECT * FROM bookings WHERE id = ${rescheduleId}`;
                const parsed = parseBookingFromDB(fullBookingRow);

                // Helper to compute Date from slot (assume time is in HH:mm or parsable by Date)
                const slotToDate = (s: any) => {
                    try {
                        // Normalize time to HH:mm if possible
                        const dateStr = `${s.date}T${(s.time.length === 5 && s.time[2] === ':') ? s.time : s.time}`;
                        const dt = new Date(dateStr);
                        if (isNaN(dt.getTime())) {
                            // Try with 1970 time parse fallback
                            return new Date(`${s.date}T00:00:00`);
                        }
                        return dt;
                    } catch {
                        return new Date(`${s.date}T00:00:00`);
                    }
                };

                const newSlotDate = slotToDate(newSlot);
                const now = new Date();
                const diffMs = newSlotDate.getTime() - now.getTime();
                const hoursDiff = diffMs / (1000 * 60 * 60);

                if (hoursDiff < 48 && !parsed?.acceptedNoRefund) {
                    return res.status(400).json({ error: 'reschedule_requires_no_refund_acceptance', message: 'El reagendamiento solicitado cae dentro de las 48 horas y requiere aceptación de la política de no reembolsos/reagendamientos.' });
                }

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
            const { rows: [insertedInquiry] } = await sql`INSERT INTO inquiries (name, email, phone, country_code, participants, tentative_date, tentative_time, event_type, message, status, created_at, inquiry_type)
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


export async function addBookingAction(body: Omit<Booking, 'id' | 'createdAt' | 'bookingCode'> & { invoiceData?: Omit<InvoiceRequest, 'id' | 'bookingId' | 'status' | 'requestedAt' | 'processedAt'> }): Promise<AddBookingResult> {
    const { productId, slots, userInfo, productType, invoiceData, bookingDate, participants, clientNote } = body;

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
    // Validate 48-hour rule: if any selected slot starts within 48 hours, require acceptedNoRefund === true
    // Use shared util to determine if slots require no-refund acceptance
    const requiresAcceptance = slotsRequireNoRefund(Array.isArray(slots) ? slots : [], 48);

    if (requiresAcceptance && !body.acceptedNoRefund) {
        return { success: false, message: 'La(s) clase(s) seleccionada(s) inicia(n) en menos de 48 horas. Debes aceptar la política de no reembolsos ni reagendamientos.' };
    }

    const { rows: [insertedRow] } = await sql`
        INSERT INTO bookings (product_id, product_type, slots, user_info, created_at, is_paid, price, booking_mode, product, booking_code, booking_date, participants, client_note, accepted_no_refund)
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
            ${clientNote || null},
            ${body.acceptedNoRefund === true}
        )
        RETURNING *;
    `;
    
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
        const { rows: settingsRows } = await sql`SELECT key, value FROM settings WHERE key = 'automationSettings' OR key = 'bankDetails'`;
        const automationSettings = settingsRows.find(r => r.key === 'automationSettings')?.value as AutomationSettings;
    const bankDetails = settingsRows.find(r => r.key === 'bankDetails')?.value as BankDetails[];

        if (automationSettings?.preBookingConfirmation?.enabled && bankDetails && bankDetails.length > 0 && bankDetails[0].accountNumber) {
            await emailService.sendPreBookingConfirmationEmail(fullyParsedBooking, bankDetails[0]);
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
        } else if (automationSettings?.preBookingConfirmation?.enabled) {
            console.log(`Skipping pre-booking confirmation email for ${fullyParsedBooking.bookingCode}: Bank details are not configured.`);
        }
    } catch(emailError) {
        console.warn(`Booking ${fullyParsedBooking.bookingCode} created, but confirmation email failed to send:`, emailError);
    }

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
