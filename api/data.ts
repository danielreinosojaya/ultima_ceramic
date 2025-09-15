import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { seedDatabase, ensureTablesExist } from './db.js';
import * as emailService from './emailService.js';
// FIX: Corrected import paths and added missing types.
import type { 
    Product, Booking, ScheduleOverrides, Notification, Announcement, Instructor, 
    ConfirmationMessage, ClassCapacity, CapacityMessageSettings, UITexts, FooterInfo, 
    GroupInquiry, AddBookingResult, PaymentDetails, AttendanceStatus,
    InquiryStatus, DayKey, AvailableSlot, AutomationSettings, UserInfo, BankDetails, TimeSlot, ClientNotification, InvoiceRequest
} from '../types.js';
import { 
    DEFAULT_PRODUCTS, DEFAULT_AVAILABLE_SLOTS_BY_DAY, DEFAULT_INSTRUCTORS, 
    DEFAULT_POLICIES_TEXT, DEFAULT_CONFIRMATION_MESSAGE, DEFAULT_CLASS_CAPACITY, 
    DEFAULT_CAPACITY_MESSAGES, DEFAULT_FOOTER_INFO, DEFAULT_AUTOMATION_SETTINGS 
} from '../constants.js';


// Helper to convert snake_case keys from DB to camelCase for the app
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

/**
 * A robust, centralized function to parse date values from the database.
 * It handles strings, existing Date objects, and null/undefined values gracefully.
 * @param value The value to parse.
 * @returns A valid Date object or null if the input is invalid.
 */
const safeParseDate = (value: any): Date | null => {
    if (value === null || value === undefined) {
        return null;
    }
    if (value instanceof Date) {
        return !isNaN(value.getTime()) ? value : null;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        if (value === '') return null; // Prevent empty strings from becoming invalid dates
        const date = new Date(value);
        return !isNaN(date.getTime()) ? date : null;
    }
    // Handle empty objects `{}` which can sometimes be returned by the DB for JSON fields
    if (typeof value === 'object' && Object.keys(value).length === 0) {
        return null;
    }

    console.warn(`Could not parse date from unexpected type: ${typeof value}`, value);
    return null;
};


// Helper to parse database rows into correctly typed objects for the application
const parseBookingFromDB = (dbRow: any): Booking => {
    if (!dbRow) return dbRow;
    const camelCased = toCamelCase(dbRow);
    
    // Ensure numeric fields are numbers, as vercel/postgres returns them as strings
    if (camelCased.price && typeof camelCased.price === 'string') {
        camelCased.price = parseFloat(camelCased.price);
    }
    if (camelCased.paymentDetails && camelCased.paymentDetails.amount && typeof camelCased.paymentDetails.amount === 'string') {
        camelCased.paymentDetails.amount = parseFloat(camelCased.paymentDetails.amount);
    }
    if (camelCased.product && camelCased.product.price && typeof camelCased.product.price === 'string') {
        camelCased.product.price = parseFloat(camelCased.product.price);
    }
    if (camelCased.product && camelCased.product.classes && typeof camelCased.product.classes === 'string') {
        camelCased.product.classes = parseInt(camelCased.product.classes, 10);
    }

    // Safely parse date fields
    camelCased.createdAt = safeParseDate(camelCased.createdAt);
    camelCased.bookingDate = safeParseDate(camelCased.bookingDate)?.toISOString();

    if (camelCased.paymentDetails) {
        camelCased.paymentDetails.receivedAt = safeParseDate(camelCased.paymentDetails.receivedAt)?.toISOString();
    }


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
    
    // Use the reliable ISO string from the database query
    camelCased.createdAt = camelCased.createdAtIso || null;
    delete camelCased.createdAtIso;

    const scheduledAtDate = safeParseDate(camelCased.scheduledAt);
    camelCased.scheduledAt = scheduledAtDate ? scheduledAtDate.toISOString() : undefined;

    return camelCased as ClientNotification;
};

const parseGroupInquiryFromDB = (dbRow: any): GroupInquiry => {
    if (!dbRow) return dbRow;
    const camelCased = toCamelCase(dbRow);
    // The DB query now formats the date as an ISO string, so we just pass it through.
    // If it's null from the DB, it remains null.
    camelCased.createdAt = camelCased.createdAt || null;
    return camelCased as GroupInquiry;
}

const parseInvoiceRequestFromDB = (dbRow: any): InvoiceRequest => {
    if (!dbRow) return dbRow;
    const camelCased = toCamelCase(dbRow);
    // Use the explicitly formatted ISO string from the query
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

// Main handler for all API requests
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await ensureTablesExist();
        await seedDatabase();

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

// Handler for GET requests
async function handleGet(req: VercelRequest, res: VercelResponse) {
    const { key } = req.query;
    
    if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'A "key" query parameter is required.' });
    }

    let data;
    switch (key) {
        case 'products':
            const { rows: products } = await sql`SELECT * FROM products ORDER BY id ASC`;
            data = toCamelCase(products);
            break;
        case 'bookings':
            const { rows: bookings } = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
            data = bookings.map(parseBookingFromDB);
            break;
        case 'instructors':
            const { rows: instructors } = await sql`SELECT * FROM instructors ORDER BY id ASC`;
            data = toCamelCase(instructors);
            break;
            
        case 'groupInquiries':
            // FIX: Explicitly format the timestamp into a standard ISO 8601 string.
            // This prevents any date parsing ambiguity on the client side.
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
            
        case 'notifications':
            const { rows: notifications } = await sql`SELECT * FROM notifications ORDER BY timestamp DESC`;
            data = notifications.map(parseNotificationFromDB);
            break;
        case 'clientNotifications':
            // FIX: Explicitly format `created_at` to a reliable ISO string to fix display issues.
            const { rows: clientNotifications } = await sql`
                SELECT 
                    *,
                    TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at_iso
                FROM client_notifications ORDER BY created_at DESC
            `;
            data = clientNotifications.map(parseClientNotificationFromDB);
            break;
        case 'invoiceRequests':
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
        default:
            const { rows: settings } = await sql`SELECT value FROM settings WHERE key = ${key}`;
            if (settings.length > 0) {
                data = settings[0].value;
            } else {
                return res.status(404).json({ error: `Setting with key "${key}" not found.` });
            }
    }
    return res.status(200).json(data);
}

// Handler for POST requests (updates and actions)
async function handlePost(req: VercelRequest, res: VercelResponse) {
    const { key, action } = req.query;

    if (action) {
        return handleAction(action as string, req, res);
    }
    
    if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'A "key" query parameter is required for data updates.' });
    }

    const value = req.body;
    switch (key) {
        case 'products':
            await sql`BEGIN`;
            await sql`DELETE FROM products`;
            for (const p of value) {
                await sql`
                    INSERT INTO products (id, type, name, classes, price, description, image_url, details, is_active, scheduling_rules, overrides) 
                    VALUES (
                        ${p.id}, 
                        ${p.type}, 
                        ${p.name}, 
                        ${p.classes || null}, 
                        ${p.price || null}, 
                        ${p.description || null}, 
                        ${p.imageUrl || null}, 
                        ${p.details ? JSON.stringify(p.details) : null}, 
                        ${p.isActive}, 
                        ${p.schedulingRules ? JSON.stringify(p.schedulingRules) : null}, 
                        ${p.overrides ? JSON.stringify(p.overrides) : null}
                    )
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
                    overrides = EXCLUDED.overrides;
            `;
            }
            await sql`COMMIT`;
            break;
        case 'instructors':
            await sql`BEGIN`;
            await sql`DELETE FROM instructors`;
            for (const i of value) {
                await sql`INSERT INTO instructors (id, name, color_scheme) VALUES (${i.id}, ${i.name}, ${i.colorScheme});`;
            }
            await sql`COMMIT`;
            break;
        default:
            await sql`INSERT INTO settings (key, value) VALUES (${key}, ${JSON.stringify(value)}) 
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`;
    }

    return res.status(200).json({ success: true });
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
    const { key, id } = req.query;

    if (key === 'inquiry') {
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Inquiry ID is required for deletion.' });
        }
        const { rowCount } = await sql`DELETE FROM inquiries WHERE id = ${id};`;
        if (rowCount > 0) {
            return res.status(204).end();
        } else {
            return res.status(404).json({ error: 'Inquiry not found.' });
        }
    } else {
        return res.status(400).json({ error: 'Unknown deletion key.' });
    }
}

// Handler for specific actions
async function handleAction(action: string, req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;
    
    let result: any = { success: true };

    switch (action) {
        case 'addBooking':
            const addBookingBody = req.body;
            result = await addBookingAction(addBookingBody);
            break;
        case 'updateBooking':
            const updateBookingBody = req.body;
            await sql`UPDATE bookings SET user_info = ${JSON.stringify(updateBookingBody.userInfo)}, price = ${updateBookingBody.price} WHERE id = ${updateBookingBody.id}`;
            break;
        case 'deleteBooking':
            const deleteBookingBody = req.body;
            await sql`DELETE FROM bookings WHERE id = ${deleteBookingBody.bookingId}`;
            break;
        case 'deleteProduct':
            const productId = parseInt(id as string, 10);
            if (isNaN(productId)) return res.status(400).json({ error: 'Product ID must be a valid number.' });
            await sql`DELETE FROM products WHERE id = ${productId}`;
            break;
        case 'removeBookingSlot':
            const removeBookingBody = req.body;
            const { bookingId: removeId, slotToRemove } = removeBookingBody;
            const { rows: [bookingToRemoveFrom] } = await sql`SELECT slots FROM bookings WHERE id = ${removeId}`;
            if (bookingToRemoveFrom) {
                const updatedSlots = bookingToRemoveFrom.slots.filter((s: any) => s.date !== slotToRemove.date || s.time !== slotToRemove.time);
                await sql`UPDATE bookings SET slots = ${JSON.stringify(updatedSlots)} WHERE id = ${removeId}`;
            }
            break;
        case 'markBookingAsPaid':
            const markPaidBody = req.body;
            const { bookingId: paidId, details } = markPaidBody;
            const paymentDetails: PaymentDetails = { ...details, receivedAt: new Date().toISOString() };
            const { rows: [updatedBookingRow] } = await sql`
                UPDATE bookings 
                SET is_paid = true, payment_details = ${JSON.stringify(paymentDetails)} 
                WHERE id = ${paidId}
                RETURNING *;
            `;
            
            try {
            if (updatedBookingRow) {
                const { rows: settingsRows } = await sql`SELECT value FROM settings WHERE key = 'automationSettings'`;
                const automationSettings = settingsRows[0]?.value as AutomationSettings;
                if (automationSettings?.paymentReceipt?.enabled) {
                    const fullyParsedBooking = parseBookingFromDB(updatedBookingRow);
                    await emailService.sendPaymentReceiptEmail(fullyParsedBooking);
                    await sql`
                        INSERT INTO client_notifications (created_at, client_name, client_email, type, channel, status, booking_code)
                        VALUES (
                            ${new Date().toISOString()}, 
                            ${`${fullyParsedBooking.userInfo.firstName} ${fullyParsedBooking.userInfo.lastName}`},
                            ${fullyParsedBooking.userInfo.email},
                            'PAYMENT_RECEIPT', 'Email', 'Sent',
                            ${fullyParsedBooking.bookingCode}
                        );
                    `;
                }
            }
            } catch (emailError) {
            console.warn(`Booking ${updatedBookingRow.booking_code} marked as paid, but receipt email failed to send:`, emailError);
            }
            break;
        case 'markBookingAsUnpaid':
            const markUnpaidBody = req.body;
            await sql`UPDATE bookings SET is_paid = false, payment_details = NULL WHERE id = ${markUnpaidBody.bookingId}`;
            break;
        case 'rescheduleBookingSlot':
            const rescheduleBody = req.body;
            const { bookingId: rescheduleId, oldSlot, newSlot } = rescheduleBody;
            const { rows: [bookingToReschedule] } = await sql`SELECT slots FROM bookings WHERE id = ${rescheduleId}`;
            if (bookingToReschedule) {
                const otherSlots = bookingToReschedule.slots.filter((s: any) => s.date !== oldSlot.date || s.time !== oldSlot.time);
                const updatedSlots = [...otherSlots, newSlot];
                await sql`UPDATE bookings SET slots = ${JSON.stringify(updatedSlots)} WHERE id = ${rescheduleId}`;
            }
            break;
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
            // Create notification
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
        case 'triggerScheduledNotifications':
            const { rows: settingsRows } = await sql`SELECT value FROM settings WHERE key = 'automationSettings'`;
            const automationSettings = settingsRows[0]?.value as AutomationSettings;

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
        default:
            return res.status(400).json({ error: `Unknown action: ${action}` });
    }
    
    return res.status(200).json(result);
}


async function addBookingAction(body: Omit<Booking, 'id' | 'createdAt' | 'bookingCode'> & { invoiceData?: Omit<InvoiceRequest, 'id' | 'bookingId' | 'status' | 'requestedAt' | 'processedAt'> }): Promise<AddBookingResult> {
    const { productId, slots, userInfo, productType, invoiceData, bookingDate } = body;
    
    // Server-side validation
    if (productType === 'INTRODUCTORY_CLASS' || productType === 'CLASS_PACKAGE') {
        const { rows: existingBookings } = await sql`SELECT slots FROM bookings WHERE user_info->>'email' = ${userInfo.email}`;
        for (const existing of existingBookings) {
            for (const existingSlot of existing.slots) {
                for (const newSlot of slots) {
                    if (existingSlot.date === newSlot.date && existingSlot.time === newSlot.time) {
                        return { success: false, message: 'DUPLICATE_BOOKING_ERROR' };
                    }
                }
            }
        }
    }
    
    // Create new booking
    const newBooking: Omit<Booking, 'id'> = {
    ...body,
    bookingCode: generateBookingCode(),
    createdAt: new Date(),
    };

    const { rows: [insertedRow] } = await sql`
        INSERT INTO bookings (product_id, product_type, slots, user_info, created_at, is_paid, price, booking_mode, product, booking_code, booking_date)
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
            ${bookingDate}
        )
        RETURNING *;
    `;
    
    const fullyParsedBooking = parseBookingFromDB(insertedRow);

    // Create invoice request if data is provided
    if (invoiceData) {
        const { rows: [invoiceRequestRow] } = await sql`
            INSERT INTO invoice_requests (booking_id, status, company_name, tax_id, address, email)
            VALUES (${fullyParsedBooking.id}, 'Pending', ${invoiceData.companyName}, ${invoiceData.taxId}, ${invoiceData.address}, ${invoiceData.email})
            RETURNING id;
        `;
        // Create notification for new invoice request
        await sql`
            INSERT INTO notifications (type, target_id, user_name, summary)
            VALUES ('new_invoice_request', ${invoiceRequestRow.id}, ${`${userInfo.firstName} ${userInfo.lastName}`}, ${fullyParsedBooking.bookingCode});
        `;
    }

    // Create admin notification for new booking
    await sql`
    INSERT INTO notifications (type, target_id, user_name, summary)
    VALUES ('new_booking', ${fullyParsedBooking.id}, ${`${userInfo.firstName} ${userInfo.lastName}`}, ${newBooking.product.name});
    `;
    
    // Send pre-booking confirmation email, but don't fail the whole request if it errors out
    try {
    const { rows: settingsRows } = await sql`SELECT key, value FROM settings WHERE key = 'automationSettings' OR key = 'bankDetails'`;
    const automationSettings = settingsRows.find(r => r.key === 'automationSettings')?.value as AutomationSettings;
    const bankDetails = settingsRows.find(r => r.key === 'bankDetails')?.value as BankDetails;

    if (automationSettings?.preBookingConfirmation?.enabled && bankDetails && bankDetails.accountNumber) {
        await emailService.sendPreBookingConfirmationEmail(fullyParsedBooking, bankDetails);
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