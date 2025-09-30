import { VercelRequest, VercelResponse } from '@vercel/node';
// ...existing code...

// ...existing code...
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
                case 'bookings': {
                    const { rows: bookings } = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
                    data = bookings.map(parseBookingFromDB);
                    break;
                }
            default:
                return res.status(400).json({ error: `Unknown action: ${action}` });
        }
    } else {
        if (!key || typeof key !== 'string') {
            return res.status(400).json({ error: 'A "key" query parameter is required.' });
        }
        const { rows: settings } = await sql`SELECT value FROM settings WHERE key = ${key}`;
        if (settings.length > 0) {
            data = settings[0].value;
        } else {
            return res.status(404).json({ error: `Setting with key "${key}" not found.` });
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
    switch (key) {
        case 'products':
            await sql`BEGIN`;
            await sql.query('DELETE FROM products');
            for (const p of value) {
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
                        p.classes || null,
                        p.price || null,
                        p.description || null,
                        p.imageUrl || null,
                        p.details ? JSON.stringify(p.details) : null,
                        p.isActive,
                        p.schedulingRules ? JSON.stringify(p.schedulingRules) : null,
                        p.overrides ? JSON.stringify(p.overrides) : null,
                        p.minParticipants || null,
                        p.pricePerPerson || null
                    ]
                );
            }
            await sql`COMMIT`;
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
    }
}

async function handleAction(action: string, req: VercelRequest, res: VercelResponse) {
    let result: any = { success: true };
    switch (action) {
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
            const updatedPayments = [...currentPayments, payment];
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
        default:
            return res.status(400).json({ error: `Unknown action: ${action}` });
    }
    
    return res.status(200).json(result);
}


async function addBookingAction(body: Omit<Booking, 'id' | 'createdAt' | 'bookingCode'> & { invoiceData?: Omit<InvoiceRequest, 'id' | 'bookingId' | 'status' | 'requestedAt' | 'processedAt'> }): Promise<AddBookingResult> {
    const { productId, slots, userInfo, productType, invoiceData, bookingDate, participants, clientNote } = body;
    
    if (productType === 'INTRODUCTORY_CLASS' || productType === 'CLASS_PACKAGE' || productType === 'SINGLE_CLASS' || productType === 'GROUP_CLASS') {
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
    
    const newBooking: Omit<Booking, 'id'> = {
    ...body,
    bookingCode: generateBookingCode(),
    createdAt: new Date(),
    };

    const { rows: [insertedRow] } = await sql`
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
