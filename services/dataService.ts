import type { 
    Product, Booking, ScheduleOverrides, Notification, Announcement, Instructor, 
    ConfirmationMessage, ClassCapacity, EnrichedAvailableSlot, CapacityMessageSettings, 
    UITexts, FooterInfo, DayKey, AvailableSlot, GroupInquiry, AddBookingResult, 
    PaymentDetails, AttendanceStatus, ClientNotification, AutomationSettings, ClassPackage, 
    IntroductoryClass, OpenStudioSubscription, UserInfo, Customer, EnrichedIntroClassSession, 
    BackgroundSettings, AppData, BankDetails, InvoiceRequest
} from '../types';
import { DAY_NAMES } from '../constants.ts';

// --- API Helpers ---

const fetchData = async (url: string, options?: RequestInit) => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP error! status: ${response.status}`, errorText);
            // Vercel might return HTML for 404, so we can't assume JSON
            if (response.headers.get('content-type')?.includes('application/json')) {
                const errorData = JSON.parse(errorText || '{}');
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            } else {
                throw new Error(`${response.status} ${response.statusText}`);
            }
        }
        const text = await response.text();
        // Handle cases where the response might be empty
        return text ? JSON.parse(text) : null;
    } catch (error) {
        console.error(`API call failed: ${url}`, error);
        throw error;
    }
};


const getData = async <T>(key: string): Promise<T> => {
    return fetchData(`/api/data?key=${key}`);
};

const setData = async <T>(key: string, data: T): Promise<{ success: boolean }> => {
    return fetchData(`/api/data?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
};

const postAction = async <T>(action: string, body: any): Promise<T> => {
    return fetchData(`/api/data?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
};

// --- Data Parsing and Type Conversion Layer ---
// This is the critical fix. The database sends numeric types as strings.
// We must parse them into the correct types before they reach the application logic.

const parseProduct = (p: any): Product => ({
    ...p,
    id: parseInt(p.id, 10),
    classes: p.classes ? parseInt(p.classes, 10) : undefined,
    price: p.price ? parseFloat(p.price) : undefined,
    details: p.details ? {
        ...p.details,
        durationHours: p.details.durationHours ? parseFloat(p.details.durationHours) : undefined,
        durationDays: p.details.durationDays ? parseInt(p.details.durationDays, 10) : undefined
    } : undefined
});

const parseBooking = (b: any): Booking => ({
    ...b,
    productId: parseInt(b.productId, 10),
    price: parseFloat(b.price),
    createdAt: new Date(b.createdAt),
    product: parseProduct(b.product), // Also parse the nested product
    paymentDetails: b.paymentDetails ? {
        ...b.paymentDetails,
        amount: parseFloat(b.paymentDetails.amount)
    } : undefined
});

const parseInstructor = (i: any): Instructor => ({
    ...i,
    id: parseInt(i.id, 10),
});

const parseGroupInquiry = (i: any): GroupInquiry => ({
    ...i,
    participants: parseInt(i.participants, 10),
});


// --- Service Functions ---

// Products
export const getProducts = async (): Promise<Product[]> => {
    const rawProducts = await getData<any[]>('products');
    return rawProducts.map(parseProduct);
};
export const updateProducts = (products: Product[]): Promise<{ success: boolean }> => setData('products', products);
export const addProduct = (productData: Omit<Product, 'id' | 'isActive'>): Promise<{ success: boolean }> => postAction('addProduct', productData);
export const deleteProduct = (id: number): Promise<{ success: boolean }> => postAction('deleteProduct', { id });


// Bookings
export const getBookings = async (): Promise<Booking[]> => {
    const rawBookings = await getData<any[]>('bookings');
    return rawBookings.map(parseBooking);
};
export const addBooking = async (bookingData: any): Promise<AddBookingResult> => {
    const result = await postAction<any>('addBooking', bookingData);
    if(result.success && result.booking) {
        return { ...result, booking: parseBooking(result.booking) };
    }
    return result;
};
export const updateBooking = (booking: Booking): Promise<{ success: boolean }> => postAction('updateBooking', booking);
export const removeBookingSlot = (bookingId: string, slotToRemove: any): Promise<{ success: boolean }> => postAction('removeBookingSlot', { bookingId, slotToRemove });
export const markBookingAsPaid = (bookingId: string, details: Omit<PaymentDetails, 'receivedAt'>): Promise<{ success: boolean }> => postAction('markBookingAsPaid', { bookingId, details });
export const markBookingAsUnpaid = (bookingId: string): Promise<{ success: boolean }> => postAction('markBookingAsUnpaid', { bookingId });
export const rescheduleBookingSlot = async (bookingId: string, oldSlot: any, newSlot: any): Promise<AddBookingResult> => {
    const result = await postAction<any>('rescheduleBookingSlot', { bookingId, oldSlot, newSlot });
     if(result.success && result.booking) {
        return { ...result, booking: parseBooking(result.booking) };
    }
    return result;
};
export const deleteBookingsInDateRange = (startDate: Date, endDate: Date): Promise<{ success: boolean }> => postAction('deleteBookingsInDateRange', { startDate, endDate });
export const updateAttendanceStatus = (bookingId: string, slot: any, status: AttendanceStatus): Promise<{ success: boolean }> => postAction('updateAttendanceStatus', { bookingId, slot, status });
export const deleteBooking = (bookingId: string): Promise<{ success: boolean }> => postAction('deleteBooking', { bookingId });

// Availability & Schedule
export const getAvailability = (): Promise<Record<DayKey, AvailableSlot[]>> => getData('availability');
export const updateAvailability = (availability: Record<DayKey, AvailableSlot[]>): Promise<{ success: boolean }> => setData('availability', availability);
export const getScheduleOverrides = (): Promise<ScheduleOverrides> => getData('scheduleOverrides');
export const updateScheduleOverrides = (overrides: ScheduleOverrides): Promise<{ success: boolean }> => setData('scheduleOverrides', overrides);

// Instructors
export const getInstructors = async (): Promise<Instructor[]> => {
    const rawInstructors = await getData<any[]>('instructors');
    return rawInstructors.map(parseInstructor);
};
export const updateInstructors = (instructors: Instructor[]): Promise<{ success: boolean }> => setData('instructors', instructors);
export const reassignAnddeleteInstructor = (instructorIdToDelete: number, replacementInstructorId: number): Promise<{ success: boolean }> => postAction('reassignAndDeleteInstructor', { instructorIdToDelete, replacementInstructorId });
export const deleteInstructor = (id: number): Promise<{ success: boolean }> => postAction('deleteInstructor', { id });
export const checkInstructorUsage = (instructorId: number): Promise<{ hasUsage: boolean }> => postAction('checkInstructorUsage', { instructorId });


// Inquiries
export const getGroupInquiries = async (): Promise<GroupInquiry[]> => {
    const rawInquiries = await getData<any[] | null>('groupInquiries');
    if (!rawInquiries) {
        return [];
    }
    return rawInquiries.map(parseGroupInquiry);
};
export const addGroupInquiry = async (inquiryData: Omit<GroupInquiry, 'id' | 'status' | 'createdAt'>): Promise<GroupInquiry> => {
    const result = await postAction<any>('addGroupInquiry', inquiryData);
    return parseGroupInquiry(result);
};
export const updateGroupInquiry = (inquiry: GroupInquiry): Promise<{ success: boolean }> => postAction('updateGroupInquiry', inquiry);

// Invoicing
export const getInvoiceRequests = (): Promise<InvoiceRequest[]> => getData('invoiceRequests');
export const markInvoiceAsProcessed = (invoiceId: string): Promise<InvoiceRequest> => postAction('markInvoiceAsProcessed', { invoiceId });

// Notifications & Announcements
export const getNotifications = (): Promise<Notification[]> => getData('notifications');
export const markAllNotificationsAsRead = (): Promise<Notification[]> => postAction('markAllNotificationsAsRead', {});
export const getAnnouncements = (): Promise<Announcement[]> => getData('announcements');
export const updateAnnouncements = (announcements: Announcement[]): Promise<{ success: boolean }> => setData('announcements', announcements);
export const deleteAnnouncement = (id: string): Promise<{success: boolean}> => getAnnouncements().then(ann => updateAnnouncements(ann.filter(a => a.id !== id)));

// Settings
export const getPolicies = (): Promise<string> => getData('policies');
export const updatePolicies = (text: string): Promise<{ success: boolean }> => setData('policies', text);
export const getConfirmationMessage = (): Promise<ConfirmationMessage> => getData('confirmationMessage');
export const updateConfirmationMessage = (message: ConfirmationMessage): Promise<{ success: boolean }> => setData('confirmationMessage', message);
export const getClassCapacity = (): Promise<ClassCapacity> => getData('classCapacity');
export const updateClassCapacity = (capacity: ClassCapacity): Promise<{ success: boolean }> => setData('classCapacity', capacity);
export const getCapacityMessageSettings = (): Promise<CapacityMessageSettings> => getData('capacityMessages');
export const updateCapacityMessageSettings = (settings: CapacityMessageSettings): Promise<{ success: boolean }> => setData('capacityMessageSettings', settings);
export const getUITexts = (lang: 'es' | 'en'): Promise<UITexts> => getData(`uiText_${lang}`);
export const updateUITexts = (lang: 'es' | 'en', texts: UITexts): Promise<{ success: boolean }> => setData(`uiText_${lang}`, texts);
export const getFooterInfo = (): Promise<FooterInfo> => getData('footerInfo');
export const updateFooterInfo = (info: FooterInfo): Promise<{ success: boolean }> => setData('footerInfo', info);
export const getAutomationSettings = (): Promise<AutomationSettings> => getData('automationSettings');
export const updateAutomationSettings = (settings: AutomationSettings): Promise<{ success: boolean }> => setData('automationSettings', settings);
export const getClientNotifications = (): Promise<ClientNotification[]> => getData('clientNotifications');
export const triggerScheduledNotifications = (): Promise<{ success: boolean }> => postAction('triggerScheduledNotifications', {});
export const getBackgroundSettings = (): Promise<BackgroundSettings> => getData('backgroundSettings');
export const updateBackgroundSettings = (settings: BackgroundSettings): Promise<{ success: boolean }> => setData('backgroundSettings', settings);
export const getBankDetails = (): Promise<BankDetails> => getData('bankDetails');
export const updateBankDetails = (details: BankDetails): Promise<{ success: boolean }> => setData('bankDetails', details);

// --- Client-side Calculations and Utilities ---

export const getCustomers = (bookings: Booking[]): Customer[] => {
    const customerMap: Map<string, { userInfo: UserInfo; bookings: Booking[] }> = new Map();
    for (const booking of bookings) {
        if (!booking.userInfo || !booking.userInfo.email) continue;
        const email = booking.userInfo.email.toLowerCase();
        if (!customerMap.has(email)) {
            customerMap.set(email, { userInfo: booking.userInfo, bookings: [] });
        }
        customerMap.get(email)!.bookings.push(booking);
    }
    const customers: Customer[] = Array.from(customerMap.values()).map(data => {
        const sortedBookings = data.bookings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return {
            email: data.userInfo.email,
            userInfo: data.userInfo,
            bookings: sortedBookings,
            totalBookings: data.bookings.length,
            totalSpent: data.bookings.reduce((sum, b) => sum + (b.isPaid && typeof b.price === 'number' ? b.price : 0), 0),
            lastBookingDate: sortedBookings.length > 0 ? sortedBookings[0].createdAt : new Date(0),
        };
    });
    return customers.sort((a, b) => b.lastBookingDate.getTime() - a.lastBookingDate.getTime());
};

const formatDateToYYYYMMDD = (d: Date): string => d.toISOString().split('T')[0];

export const generateIntroClassSessions = (
    product: IntroductoryClass,
    appData: Pick<AppData, 'bookings'>,
    options: { generationLimitInDays?: number; includeFull?: boolean } = {}
): EnrichedIntroClassSession[] => {
    const { generationLimitInDays = 30, includeFull = false } = options;
    const allSessions: EnrichedIntroClassSession[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overridesByDate = (product.overrides || []).reduce((acc, override) => {
        acc[override.date] = override.sessions;
        return acc;
    }, {} as Record<string, { time: string; instructorId: number; capacity: number }[] | null>);

    for (let i = 0; i < generationLimitInDays; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = formatDateToYYYYMMDD(date);
        const dayOfWeek = date.getDay();

        let todaysSessions: Omit<EnrichedIntroClassSession, 'paidBookingsCount' | 'totalBookingsCount'>[] = [];
        const override = overridesByDate[dateStr];

        if (override !== undefined) { 
            if (override !== null) { 
                todaysSessions = override.map(s => ({
                    id: `${dateStr}-${s.time.replace(':', '')}-${s.instructorId}`,
                    date: dateStr,
                    time: new Date(`1970-01-01T${s.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                    instructorId: s.instructorId,
                    capacity: s.capacity,
                    isOverride: true
                }));
            }
        } else { 
            const rulesForDay = (product.schedulingRules || []).filter(rule => rule.dayOfWeek === dayOfWeek);
            todaysSessions = rulesForDay.map(rule => ({
                id: `${dateStr}-${rule.time.replace(':', '')}-${rule.instructorId}`,
                date: dateStr,
                time: new Date(`1970-01-01T${rule.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                instructorId: rule.instructorId,
                capacity: rule.capacity,
                isOverride: false
            }));
        }

        const enrichedSessions = todaysSessions.map(session => {
            const bookingsForSession = (appData?.bookings || []).filter(b => 
                b.productId === product.id &&
                b.slots.some(s => s.date === session.date && s.time === session.time)
            );
            return {
                ...session,
                paidBookingsCount: bookingsForSession.filter(b => b.isPaid).length,
                totalBookingsCount: bookingsForSession.length,
            };
        });
        
        allSessions.push(...(includeFull ? enrichedSessions : enrichedSessions.filter(s => s.paidBookingsCount < s.capacity)));
    }
    return allSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time));
};

const getBookingsForSlot = (date: Date, time: string, appData: Pick<AppData, 'bookings'>): Booking[] => {
    const dateStr = formatDateToYYYYMMDD(date);
    return appData.bookings.filter(b => b.slots.some(s => s.date === dateStr && s.time === time));
};

export const getAvailableTimesForDate = (date: Date, appData: Pick<AppData, 'availability' | 'scheduleOverrides' | 'classCapacity' | 'bookings'>): EnrichedAvailableSlot[] => {
    const dateStr = formatDateToYYYYMMDD(date);
    const dayKey = DAY_NAMES[date.getDay()];
    const override = appData.scheduleOverrides[dateStr];
    
    if (override && override.slots === null) return [];

    const baseSlots = override ? override.slots! : appData.availability[dayKey];
    const maxCapacity = override?.capacity ?? appData.classCapacity.max;

    return baseSlots.map(slot => {
        const bookingsForSlot = getBookingsForSlot(date, slot.time, appData);
        return {
            ...slot,
            paidBookingsCount: bookingsForSlot.filter(b => b.isPaid).length,
            totalBookingsCount: bookingsForSlot.length,
            maxCapacity
        };
    });
};

export const getAllConfiguredTimesForDate = (date: Date, appData: Pick<AppData, 'availability' | 'scheduleOverrides' | 'classCapacity' | 'bookings'>): EnrichedAvailableSlot[] => {
    return getAvailableTimesForDate(date, appData);
};

export const checkMonthlyAvailability = (startDate: Date, slot: AvailableSlot, appData: Pick<AppData, 'availability' | 'scheduleOverrides' | 'classCapacity' | 'bookings'>): boolean => {
    for (let i = 0; i < 4; i++) {
        const checkDate = new Date(startDate);
        checkDate.setDate(startDate.getDate() + (i * 7));
        const daySlots = getAvailableTimesForDate(checkDate, appData);
        const matchingSlot = daySlots.find(s => s.time === slot.time && s.instructorId === slot.instructorId);
        if (!matchingSlot || matchingSlot.paidBookingsCount >= matchingSlot.maxCapacity) {
            return false;
        }
    }
    return true;
};

export const getFutureCapacityMetrics = async (days: number): Promise<{ totalCapacity: number, bookedSlots: number }> => {
    const [products, bookings, availability, scheduleOverrides, classCapacity] = await Promise.all([
        getProducts(),
        getBookings(),
        getAvailability(),
        getScheduleOverrides(),
        getClassCapacity()
    ]);
    
    const appData = { products, bookings, availability, scheduleOverrides, classCapacity, instructors: [], capacityMessages: {} as any, announcements: [], policies: '', confirmationMessage: {} as any, footerInfo: {} as any, bankDetails: {} as any };

    let totalCapacity = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = formatDateToYYYYMMDD(date);
        const dayKey = DAY_NAMES[date.getDay()];
        
        const override = scheduleOverrides[dateStr];
        
        if (!(override && override.slots === null)) {
            const slots = override ? override.slots! : availability[dayKey];
            const capacity = override?.capacity ?? classCapacity.max;
            totalCapacity += slots.length * capacity;
        }

        const introClasses = products.filter(p => p.type === 'INTRODUCTORY_CLASS') as IntroductoryClass[];
        introClasses.forEach(p => {
            const sessions = generateIntroClassSessions(p, { bookings }, { generationLimitInDays: days });
            sessions.filter(s => s.date === dateStr).forEach(s => {
                totalCapacity += s.capacity;
            });
        });
    }

    const futureBookedSlots = bookings.reduce((count, booking) => {
        return count + booking.slots.filter(slot => {
            const slotDate = new Date(slot.date);
            slotDate.setHours(0,0,0,0);
            return slotDate >= today;
        }).length;
    }, 0);

    return { totalCapacity, bookedSlots: futureBookedSlots };
};