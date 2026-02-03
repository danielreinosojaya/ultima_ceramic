export const addGiftcardRequest = async (request: Omit<GiftcardRequest, 'id' | 'status' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        console.log('[dataService] 📮 Enviando addGiftcardRequest:', request);
        const response = await fetch('/api/data?action=addGiftcardRequest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        console.log('[dataService] Response status:', response.status, 'ok:', response.ok);
        const result = await response.json();
        console.log('[dataService] 📬 Respuesta recibida:', result);
        return result;
    } catch (error) {
        console.error('[dataService] ❌ Error en addGiftcardRequest:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};
// Giftcard Requests
export type GiftcardRequest = {
    id: string;
    buyerName: string;
    buyerEmail: string;
    recipientName: string;
    recipientEmail?: string;
    recipientWhatsapp?: string;
    amount: number;
    code: string;
    message?: string;
    status: 'pending' | 'approved' | 'rejected' | 'delivered' | 'deleted';
    createdAt: string;
    sendMethod?: 'email' | 'whatsapp';
    scheduledSendAt?: string | null;
    metadata?: {
        issuedCode?: string;
        issued_code?: string;
        emailDelivery?: {
            buyer?: { sent: boolean };
            recipient?: { sent: boolean };
        };
        voucherUrl?: string;
    };
};

export const getGiftcardRequests = async (): Promise<GiftcardRequest[]> => {
    try {
        const response = await fetch('/api/data?action=listGiftcardRequests');
        if (!response.ok) throw new Error('Error fetching giftcard requests');
        const data = await response.json();
        if (!Array.isArray(data)) return [];
        return data.map((req: any) => ({
            id: req.id || '',
            buyerName: req.buyerName || '',
            buyerEmail: req.buyerEmail || '',
            recipientName: req.recipientName || '',
            recipientEmail: req.recipientEmail || '',
            recipientWhatsapp: req.recipientWhatsapp || '',
            amount: typeof req.amount === 'number' ? req.amount : parseFloat(req.amount || '0'),
            code: req.code || '',
            status: req.status || 'pending',
            createdAt: req.createdAt || '',
            sendMethod: req.sendMethod || null,
            scheduledSendAt: req.scheduledSendAt || null,
            // Preserve metadata from the server so admin UI can display issuedCode, voucherUrl, etc.
            metadata: req.metadata || null
        }));
    } catch (error) {
        console.error('getGiftcardRequests error:', error);
        return [];
    }
};
// Admin actions for giftcard requests (client wrappers)
export const approveGiftcardRequest = async (
    id: string,
    adminUser: string,
    note?: string,
    metadata?: any
): Promise<{ success: boolean; request?: GiftcardRequest; error?: string }> => {
    try {
        const res = await postAction('approveGiftcardRequest', { id, adminUser, note, metadata });
        if (res && res.success && res.request) {
            return { success: true, request: res.request as GiftcardRequest };
        }
        return { success: false, error: res?.error || 'Failed to approve giftcard request' };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};

export const createGiftcardManual = async (
    buyerName: string,
    buyerEmail: string,
    recipientName: string,
    amount: number,
    recipientEmail?: string,
    recipientWhatsapp?: string,
    message?: string,
    adminUser?: string
): Promise<{ success: boolean; giftcard?: any; error?: string; message?: string }> => {
    try {
        const res = await postAction('createGiftcardManual', {
            buyerName,
            buyerEmail,
            recipientName,
            amount,
            recipientEmail,
            recipientWhatsapp,
            message,
            adminUser
        });
        if (res && res.success) {
            return {
                success: true,
                giftcard: res.giftcard,
                message: res.message
            };
        }
        return { success: false, error: res?.error || 'Failed to create giftcard' };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};

export const rejectGiftcardRequest = async (
    id: string,
    adminUser: string,
    note?: string,
    metadata?: any
): Promise<{ success: boolean; request?: GiftcardRequest; error?: string }> => {
    try {
    const res = await postAction('rejectGiftcardRequest', { id, adminUser, note, metadata });
        if (res && res.success && res.request) {
            return { success: true, request: res.request as GiftcardRequest };
        }
        return { success: false, error: res?.error || 'Failed to reject giftcard request' };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};

export const attachGiftcardProof = async (
    id: string,
    proofUrl: string,
    adminUser: string,
    note?: string,
    metadata?: any
): Promise<{ success: boolean; request?: GiftcardRequest; error?: string }> => {
    try {
    const res = await postAction('attachGiftcardProof', { id, proofUrl, adminUser, note, metadata });
        if (res && res.success && res.request) {
            return { success: true, request: res.request as GiftcardRequest };
        }
        return { success: false, error: res?.error || 'Failed to attach proof to giftcard request' };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};

// Soft-delete a giftcard request (admin)
export const deleteGiftcardRequest = async (
    id: string,
    adminUser: string,
    note?: string,
    metadata?: any
): Promise<{ success: boolean; request?: GiftcardRequest; error?: string }> => {
    try {
        const res = await postAction('deleteGiftcardRequest', { id, adminUser, note, metadata });
        if (res && res.success && res.request) {
            return { success: true, request: res.request as GiftcardRequest };
        }
        return { success: false, error: res?.error || 'Failed to delete giftcard request' };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};

// Hard-delete a giftcard request (admin) - permanent removal
export const hardDeleteGiftcardRequest = async (
    id: string,
    adminUser: string,
    note?: string,
    metadata?: any
): Promise<{ success: boolean; deleted?: any; error?: string }> => {
    try {
        const res = await postAction('hardDeleteGiftcardRequest', { id, adminUser, note, metadata });
        if (res && res.success) {
            return { success: true, deleted: res.deleted };
        }
        return { success: false, error: res?.error || 'Failed to hard delete giftcard request' };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};

// Si el cliente no tiene reservas, agregarlo como standalone
export const ensureStandaloneCustomer = async (customerData: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    countryCode?: string;
    birthday?: string;
}): Promise<{ success: boolean; customer?: Customer; error?: string }> => {
    // Verificar si el cliente ya existe en la base de datos
    try {
        const response = await fetch(`/api/data?action=standaloneCustomers`);
        const customers = await response.json();
        const exists = customers.some((c: any) => c.email?.toLowerCase() === customerData.email.toLowerCase());
        if (exists) {
            return { success: true, customer: customers.find((c: any) => c.email?.toLowerCase() === customerData.email.toLowerCase()) };
        }
        // Si no existe, crearlo
        return await createOrUpdateCustomer(customerData);
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};
// Obtener reservas por email de cliente
export const getBookingsByCustomerEmail = async (email: string): Promise<Booking[]> => {
    const response = await fetch(`/api/data?action=bookingsByCustomerEmail&email=${encodeURIComponent(email)}`);
    if (!response.ok) throw new Error('Error fetching bookings for customer');
    return response.json();
};
// Crear o actualizar cliente en la base de datos
export const createOrUpdateCustomer = async (customerData: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    countryCode?: string;
    birthday?: string;
}): Promise<{ success: boolean; customer?: Customer; error?: string }> => {
    try {
        const response = await fetch('/api/data?key=customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerData),
        });
        const result = await response.json();
        return result;
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};

// Create a new customer
export const createCustomer = async (customerData: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    countryCode: string;
    birthday?: string;
}): Promise<Customer> => {
    const result = await createOrUpdateCustomer(customerData);
    if (!result.success || !result.customer) {
        throw new Error(result.error || 'Error creating customer');
    }
    return result.customer;
};
// Edit payment details for a booking (amount, method, date)
// import type { PaymentDetails } from '../types';

// Update payment by ID (new way) or by index (legacy fallback)
export const updatePaymentDetails = async (
    bookingId: string,
    paymentIdOrIndex: string | number,
    updatedDetails: Partial<PaymentDetails>
): Promise<{ success: boolean }> => {
    const params = typeof paymentIdOrIndex === 'string'
        ? { bookingId, paymentId: paymentIdOrIndex, updatedDetails }
        : { bookingId, paymentIndex: paymentIdOrIndex, updatedDetails };
    
    return postAction('updatePaymentDetails', params);
};

// Bulk actions for FinancialDashboard
export const acceptPaymentForBooking = async (bookingId: string): Promise<{ success: boolean }> => {
    // Placeholder: Integrate with backend/payment API as needed
    return postAction('acceptPaymentForBooking', { bookingId });
};

export const sendReminderForBooking = async (bookingId: string): Promise<{ success: boolean }> => {
    // Placeholder: Integrate with backend/notification API as needed
    return postAction('sendReminderForBooking', { bookingId });
};

// Send a test email from the server (useful to verify RESEND_API_KEY / EMAIL_FROM in runtime)
export const sendTestEmail = async (to: string, options: { type?: 'buyer' | 'recipient' | 'test'; name?: string; amount?: number; code?: string; pdfBase64?: string; downloadLink?: string; message?: string } = {}) => {
    try {
        const payload = { to, type: options.type || 'test', name: options.name, amount: options.amount, code: options.code, pdfBase64: options.pdfBase64, downloadLink: options.downloadLink, message: options.message };
        const res = await postAction('sendTestEmail', payload);
        return res;
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
};
import type { 
    Product, Booking, ScheduleOverrides, Notification, Announcement, Instructor, 
    ConfirmationMessage, ClassCapacity, EnrichedAvailableSlot, CapacityMessageSettings, 
    UITexts, FooterInfo, DayKey, AvailableSlot, GroupInquiry, AddBookingResult, 
    PaymentDetails, AttendanceStatus, ClientNotification, AutomationSettings, ClassPackage, 
    IntroductoryClass, OpenStudioSubscription, UserInfo, Customer, EnrichedIntroClassSession, 
    BackgroundSettings, AppData, BankDetails, InvoiceRequest, Technique, GroupClass, SingleClass,
    Delivery, DeliveryStatus, UILabels, RecurringClassSlot, DynamicTimeSlot, SlotDisplayInfo, GroupTechnique, TimeSlot
} from '../types';
import { DAY_NAMES, DEFAULT_PRODUCTS } from '../constants';

// --- API Helpers ---

const fetchData = async (url: string, options?: RequestInit, retries: number = 3) => {
    // ✅ OPTIMIZACIÓN: Reducir retries a máximo 2
    const maxRetries = Math.min(retries, 2);
    
    // Deduplicar requests - si la URL ya está siendo fetched, retornar la promesa existente
    const requestKey = `${url}_${JSON.stringify(options || {})}`;
    if (pendingRequests.has(requestKey)) {
        console.log(`[DEDUP] Request already pending for ${url}, returning cached promise...`);
        return pendingRequests.get(requestKey);
    }

    let lastError: Error | null = null;
    
    const fetchPromise = (async () => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Solo log en primer intento o errores
                if (attempt === 1) {
                    console.log(`Fetching ${url}`);
                } else {
                    console.log(`Retry attempt ${attempt}/${maxRetries} for ${url}`);
                }
                
                const response = await fetch(url, {
                    ...options,
                    // ✅ OPTIMIZACIÓN: Timeout reducido 30s → 20s (seguro para queries grandes)
                    signal: AbortSignal.timeout(20000)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
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
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`Fetch attempt ${attempt} failed:`, lastError.message);
                
                // Si no es el último intento, esperar antes de reintentar
                if (attempt < maxRetries) {
                    // ✅ OPTIMIZACIÓN: Backoff más conservador, max 2s
                    const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // Si todos los intentos fallaron, lanzar el último error
        if (lastError) {
            console.error(`All ${maxRetries} fetch attempts failed for ${url}`);
            throw lastError;
        } else {
            throw new Error('Unknown error occurred during fetch attempts.');
        }
    })();
    
    pendingRequests.set(requestKey, fetchPromise);
    
    return fetchPromise.finally(() => {
        pendingRequests.delete(requestKey);
    });
};

// Cache más agresivo para evitar requests innecesarias
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 horas para datos generales (optimizado)
const CRITICAL_CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 horas para datos críticos (optimizado)
const BOOKINGS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos para bookings (más dinámicos)

// Debounce para evitar requests duplicados
const pendingRequests = new Map<string, Promise<any>>();

const getCachedData = <T>(key: string): T | null => {
    const cached = cache.get(key);
    if (!cached) return null;
    
    const duration = ['products', 'instructors', 'policies'].includes(key) 
        ? CRITICAL_CACHE_DURATION 
        : key === 'bookings' 
        ? BOOKINGS_CACHE_DURATION
        : CACHE_DURATION;
    
    const isExpired = Date.now() - cached.timestamp > duration;
    if (isExpired) {
        cache.delete(key);
        return null;
    }
    return cached.data as T;
};

const setCachedData = <T>(key: string, data: T): void => {
    cache.set(key, { data, timestamp: Date.now() });
};

const clearCache = (key?: string): void => {
    if (key) {
        cache.delete(key);
        // También limpiar caches relacionados
        if (key === 'products') {
            cache.delete('packages');
            cache.delete('classes');
        }
    } else {
        cache.clear();
    }
};

// ===== OPTIMIZACIÓN: Invalidación granular de cache =====
// Reemplazar invalidación binaria con invalidación selectiva

// Timestamp de última mutation para cache-busting
let lastMutationTimestamp = 0;

export const invalidateBookingsCache = (): void => {
    console.log('[Cache] Invalidating bookings cache only');
    clearCache('bookings');
    lastMutationTimestamp = Date.now(); // Update timestamp para cache-busting
    // ✅ NO invalida: customers, products, instructors, giftcards
};

export const invalidateCustomersCache = (): void => {
    console.log('[Cache] Invalidating customers cache only');
    clearCache('customers');
    lastMutationTimestamp = Date.now();
};

export const invalidatePaymentsCache = (): void => {
    console.log('[Cache] Invalidating payments cache only');
    clearCache('payments');
    lastMutationTimestamp = Date.now();
};

export const invalidateGiftcardsCache = (): void => {
    console.log('[Cache] Invalidating giftcards cache only');
    clearCache('giftcards');
    lastMutationTimestamp = Date.now();
};

export const invalidateProductsCache = (): void => {
    console.log('[Cache] Invalidating products cache only');
    clearCache('products');
    lastMutationTimestamp = Date.now();
};

// Para operaciones que afectan múltiples recursos
export const invalidateMultiple = (keys: string[]): void => {
    console.log('[Cache] Invalidating multiple:', keys);
    keys.forEach(key => clearCache(key));
    lastMutationTimestamp = Date.now(); // Update timestamp
};

const getData = async <T>(key: string): Promise<T> => {
    // Parse key para extract cache-busting timestamp si existe
    const [actualKey, cacheBuster] = key.includes('&_t=') ? key.split('&') : [key, null];
    
    // Check si hay datos en cache válidos (solo si NO hay cache-buster)
    if (!cacheBuster) {
        const cached = getCachedData<T>(actualKey);
        if (cached) {
            console.log(`Cache hit for ${actualKey}`);
            return cached;
        }
    } else {
        // Si hay cache-buster, forzar bypass de cache
        console.log(`Cache-busting fetch for ${actualKey} with ${cacheBuster}`);
        clearCache(actualKey); // Limpiar cache viejo
    }
    
    // Verificar si ya hay un request pendiente para evitar duplicados
    const requestKey = `get_${actualKey}${cacheBuster || ''}`;
    if (pendingRequests.has(requestKey)) {
        console.log(`Request already pending for ${actualKey}, waiting...`);
        return pendingRequests.get(requestKey) as Promise<T>;
    }
    
    // Construir URL con cache-buster si existe
    const url = `/api/data?key=${actualKey}${cacheBuster ? `&${cacheBuster.substring(1)}` : ''}`;
    console.log(`Cache miss for ${actualKey}, fetching from API: ${url}`);
    
    const requestPromise = fetchData(url)
        .then(data => {
            setCachedData(actualKey, data);
            pendingRequests.delete(requestKey);
            return data;
        })
        .catch(error => {
            pendingRequests.delete(requestKey);
            console.error(`Failed to fetch ${actualKey}:`, error);
            
            // En caso de error, intentar devolver datos del cache aunque estén expirados
            const expiredCache = cache.get(actualKey);
            if (expiredCache) {
                console.warn(`Using expired cache for ${actualKey} due to fetch error`);
                return expiredCache.data as T;
            }
            
            // Si no hay cache, devolver datos por defecto según el tipo
            console.warn(`No cache available for ${actualKey}, returning default data`);
            return getDefaultData<T>(actualKey);
        });
    
    pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
};

const getDefaultData = <T>(key: string): T => {
    const defaults: Record<string, any> = {
        products: [],
        bookings: [],
        groupInquiries: [],
        instructors: [],
        availability: { Sunday: [], Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] },
        scheduleOverrides: {},
        classCapacity: { potters_wheel: 0, molding: 0, introductory_class: 0 },
        capacityMessages: { thresholds: [] },
        announcements: [],
        invoiceRequests: [],
        notifications: [],
        uiLabels: { taxIdLabel: 'RUC' },
        footerInfo: { whatsapp: '', email: '', instagramHandle: '', address: '', googleMapsLink: '#' },
        policies: { cancellation: '', general: '', noRefund: '' }
    };
    
    return defaults[key] || [] as T;
};

const setData = async <T>(key: string, data: T): Promise<{ success: boolean }> => {
    // Limpiar cache cuando se actualizan datos
    clearCache(key);
    return fetchData(`/api/data?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
};

const postAction = async (action: string, body: any): Promise<any> => {
    // Determine admin user for automatic header propagation when available.
    // Priority: explicit body.adminUser > payment.metadata.adminName > localStorage.adminUser > window.__ADMIN_USER__
    let adminUserHeader: string | null = null;
    try {
        if (body && typeof body === 'object') {
            if (body.adminUser) adminUserHeader = String(body.adminUser);
            else if (body.payment && body.payment.metadata && (body.payment.metadata.adminName || body.payment.metadata.adminUser)) {
                adminUserHeader = String(body.payment.metadata.adminName || body.payment.metadata.adminUser);
            }
        }
        if (!adminUserHeader && typeof window !== 'undefined') {
            // localStorage may contain admin user if the app sets it during admin login
            const ls = window.localStorage.getItem('adminUser');
            if (ls) adminUserHeader = ls;
            // global override (rare) -- small safety check
            if (!adminUserHeader && (window as any).__ADMIN_USER__) adminUserHeader = String((window as any).__ADMIN_USER__);
        }
    } catch (e) {
        // ignore any issues reading window/localStorage in non-browser contexts
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminUserHeader) headers['x-admin-user'] = adminUserHeader;

    return fetchData(`/api/data?action=${action}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
};

// --- Data Parsing and Type Conversion Layer ---
// This is the critical fix. The database sends numeric types as strings.
// We must parse them into the correct types before they reach the application logic.

// Helper function to safely parse price values
const safeParsePrice = (value: any): number => {
    if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
    }
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

const parseProduct = (p: any): Product => {
    // Validate that product data is not null/undefined
    if (!p || typeof p !== 'object') {
        console.warn('parseProduct: Invalid product data, creating minimal valid product:', p);
        return {
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
        } as SingleClass;
    }
    
    try {
        // Ensure all required fields exist with safe parsing
        const safeProduct = {
            ...p,
            id: typeof p.id === 'string' ? p.id : String(p.id || 'unknown'),
            price: safeParsePrice(p.price),
            sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : parseInt(p.sortOrder || '0', 10),
            isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
            name: p.name || 'Unknown Product',
            description: p.description || 'No description available',
            type: p.type || 'SINGLE_CLASS'
        };
        
        // Ensure details exist for products that need them
        if (['CLASS_PACKAGE', 'SINGLE_CLASS', 'INTRODUCTORY_CLASS'].includes(safeProduct.type)) {
            if (!safeProduct.details) {
                safeProduct.details = {
                    duration: '1 hour',
                    durationHours: 1,
                    activities: ['Pottery activity'],
                    generalRecommendations: 'Basic pottery class',
                    materials: 'Clay and tools provided',
                    technique: 'potters_wheel'
                };
            }
        }
        
        return safeProduct;
    } catch (error) {
        console.error('parseProduct: Error parsing product, using fallback:', error, p);
        return {
            id: 'error',
            type: 'SINGLE_CLASS',
            name: 'Error Product',
            description: 'Product parsing failed',
            isActive: false,
            classes: 1,
            price: 0,
            sortOrder: 0,
            details: {
                duration: '1 hour',
                durationHours: 1,
                activities: ['Error fallback'],
                generalRecommendations: 'Error fallback',
                materials: 'Error fallback',
                technique: 'potters_wheel'
            }
        } as SingleClass;
    }
};

const parseBooking = (b: any): Booking | null => {
    try {
        if (!b || typeof b !== 'object') {
            return null;
        }
        
        // Debug específico para Molina
        let createdAt: Date;
        try {
            createdAt = new Date(b.createdAt);
            if (isNaN(createdAt.getTime())) {
                createdAt = new Date();
            }
        } catch {
            createdAt = new Date();
        }
        
        let parsedProduct: Product;
        try {
            parsedProduct = parseProduct(b.product);
        } catch (error) {
            console.error('parseBooking: Failed to parse product, using fallback:', error);
            parsedProduct = parseProduct(null);
        }
        
        const booking = {
            ...b,
            id: b.id || 'unknown',
            productId: typeof b.productId === 'string' ? b.productId : String(b.productId || ''),
            price: safeParsePrice(b.price),
            createdAt,
            product: parsedProduct,
            userInfo: b.userInfo || {
                firstName: 'Unknown',
                lastName: 'Customer',
                email: 'unknown@email.com',
                phone: '',
                countryCode: '',
                birthday: null
            },
            slots: Array.isArray(b.slots) ? b.slots : [],
            isPaid: typeof b.isPaid === 'boolean' ? b.isPaid : false,
            bookingCode: b.bookingCode || 'UNKNOWN',
            bookingMode: b.bookingMode || 'flexible',
            productType: b.productType || 'SINGLE_CLASS'
        };
        
        if (b.paymentDetails) {
            try {
                const payments = typeof b.paymentDetails === 'string'
                    ? JSON.parse(b.paymentDetails)
                    : b.paymentDetails;
                
                if (Array.isArray(payments)) {
                    booking.paymentDetails = payments.map(p => {
                        let receivedAt: string;
                        try {
                            const receivedAtDate = new Date(p.receivedAt);
                            receivedAt = !isNaN(receivedAtDate.getTime()) ? receivedAtDate.toISOString() : new Date().toISOString();
                        } catch {
                            receivedAt = new Date().toISOString();
                        }
                        
                        return {
                            amount: safeParsePrice(p.amount),
                            method: p.method || 'Cash',
                            receivedAt
                        };
                    });
                } else {
                    booking.paymentDetails = [];
                }
            } catch (e) {
                console.warn('parseBooking: Error parsing paymentDetails for booking', b.id, e);
                booking.paymentDetails = [];
            }
        } else {
            booking.paymentDetails = [];
        }

        return booking;
    } catch (error) {
        console.error('parseBooking: Critical error parsing booking:', error, b?.id);
        return null;
    }
};

const parseInstructor = (i: any): Instructor => ({
    ...i,
    id: parseInt(i.id, 10),
});

const parseGroupInquiry = (i: any): GroupInquiry => {
    // Eliminado debug

    // Definimos una variable para la fecha tentativa
    let tentativeDate: Date | undefined;

    // Comprobamos si el valor de la fecha existe y es una cadena de texto
    if (i.tentativeDate && typeof i.tentativeDate === 'string') {
        // Usamos una expresión regular para verificar que el formato sea YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(i.tentativeDate)) {
            // Si el formato es correcto, creamos un objeto Date
            // Agregamos 'T00:00:00' para evitar problemas de zona horaria
            tentativeDate = new Date(i.tentativeDate + 'T00:00:00');
        } else {
            // Si la cadena tiene un formato inesperado, la convertimos a "Fecha Inválida"
            // Esto es para que la función formatDate pueda manejarlo correctamente
            tentativeDate = new Date('invalid date');
        }
    }

    return {
        ...i,
        participants: parseInt(i.participants, 10),
        tentativeDate: tentativeDate
    };
};


// --- Service Functions ---
// Update customer info (name, email, phone, birthday, etc)
export const updateCustomerInfo = async (email: string, info: Partial<UserInfo>): Promise<{ success: boolean }> => {
    return postAction('updateCustomerInfo', { email, info });
};

// Products - simplificado pero con cache
export const getProducts = async (): Promise<Product[]> => {
    try {
        const rawProducts = await getData<any[]>('products');
        if (!rawProducts || !Array.isArray(rawProducts)) {
            console.warn('No products data received, returning empty array');
            return [];
        }
        console.log('Raw products from API:', rawProducts.length);
        const parsedProducts = rawProducts.map(parseProduct);

        // Refuerzo: normalizar price en todos los productos
        const productsWithOrder = parsedProducts.map((product, index) => {
            let normalized = { ...product };
            if ('price' in normalized) {
                normalized.price = typeof (normalized as any).price === 'number' ? (normalized as any).price : parseFloat((normalized as any).price) || 0;
            }
            if ('pricePerPerson' in normalized) {
                normalized.pricePerPerson = typeof (normalized as any).pricePerPerson === 'number' ? (normalized as any).pricePerPerson : parseFloat((normalized as any).pricePerPerson) || 0;
            }
            normalized.sortOrder = normalized.sortOrder !== undefined && normalized.sortOrder !== null ? normalized.sortOrder : index;
            return normalized;
        });

        console.log('Parsed products:', productsWithOrder.length);
        return productsWithOrder;
    } catch (error) {
        console.error('Failed to get products:', error);
        return [];
    }
};
export const updateProducts = async (products: Product[]): Promise<{ success: boolean }> => {
    // No limpiar cache agresivamente para evitar requests excesivas
    const result = await setData('products', products);
    // Solo limpiar cache después de una actualización exitosa
    if (result.success) {
        setTimeout(() => clearCache('products'), 1000);
    }
    return result;
};

// Save a single product (more efficient than updating all products)
export const saveProduct = (product: Product): Promise<{ success: boolean }> => setData('products', product);

export const addProduct = (productData: Omit<Product, 'id' | 'isActive'>): Promise<{ success: boolean }> => postAction('addProduct', productData);
export const deleteProduct = async (id: string): Promise<{ success: boolean }> => {
    // Limpiar cache antes de eliminar
    clearCache('products');
    return fetchData(`/api/data?key=product&id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
};


// Bookings - working version

// Bookings - working version
export const getCustomers = async (): Promise<Customer[]> => {
  try {
    const response = await fetch('/api/data?action=getCustomers');
    const customers = await response.json();
    return Array.isArray(customers) ? customers : [];
  } catch {
    return [];
  }
};

export const getBookings = async (): Promise<Booking[]> => {
    try {
        // Agregar cache-busting timestamp si hubo mutation reciente
        const cacheBuster = lastMutationTimestamp > 0 ? `&_t=${lastMutationTimestamp}` : '';
        const rawBookings = await getData<any[]>(`bookings${cacheBuster}`);
        
        if (!rawBookings || !Array.isArray(rawBookings)) {
            console.warn('getBookings: No bookings data received, returning empty array');
            return [];
        }
        
        // Filter out null/undefined values before processing
        const validBookings = rawBookings.filter(booking => {
            if (!booking || typeof booking !== 'object') {
                return false;
            }
            return true;
        });
        
        // Parse bookings
        const parsedBookings: Booking[] = [];
        
        validBookings.forEach((booking, index) => {
            try {
                const parsed = parseBooking(booking);
                
                if (parsed) {
                    parsedBookings.push(parsed);
                }
            } catch (error) {
                console.error(`getBookings: Error parsing booking ${index + 1}:`, error);
            }
        });
        
        return parsedBookings;
    } catch (error) {
        console.error('getBookings: Error:', error);
        return [];
    }
};
export const addBooking = async (bookingData: any): Promise<AddBookingResult> => {
    const result = await postAction('addBooking', bookingData);
    if(result.success && result.booking) {
        // Invalidar cache después de crear booking exitosamente
        invalidateBookingsCache();
        return { ...result, booking: parseBooking(result.booking) };
    }
    return result;
};

// Obtener un booking por su ID
export const getBookingById = async (bookingId: string): Promise<Booking> => {
    try {
        const response = await fetch(`/api/data?action=getBookingById`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId })
        });
        if (!response.ok) throw new Error('Error fetching booking by ID');
        return response.json();
    } catch (error) {
        console.error('getBookingById error:', error);
        throw error;
    }
};

// Giftcard client helpers
export const validateGiftcard = async (code: string): Promise<any> => {
    try {
        console.debug('[dataService.validateGiftcard] validating code:', code);
        
        // Usar endpoint principal que ya existe y funciona
        const response = await fetch(`/api/data?action=validateGiftcard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        
        const body = await response.json();
        console.debug('[dataService.validateGiftcard] result:', body);
        
        return body;
    } catch (err) {
        console.error('[dataService.validateGiftcard] error:', err);
        return { valid: false, error: err instanceof Error ? err.message : String(err) };
    }
};

export const createGiftcardHold = async (payload: { code?: string; giftcardId?: string; amount: number; bookingTempRef?: string; ttlMinutes?: number }): Promise<any> => {
    try {
        const response = await fetch(`/api/data?action=createGiftcardHold`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const body = await response.json();
        return body;
    } catch (err) {
        console.error('[dataService.createGiftcardHold] error:', err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
};

export const releaseGiftcardHold = async (payload: { holdId: string }): Promise<any> => {
    try {
        const response = await fetch(`/api/data?action=releaseGiftcardHold`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const body = await response.json();
        return body;
    } catch (err) {
        console.error('[dataService.releaseGiftcardHold] error:', err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
};

// Admin: get all issued giftcards (for admin console)
export const getGiftcards = async (): Promise<any[]> => {
    try {
        console.debug('[dataService.getGiftcards] fetching listGiftcards from /api/data');
        const response = await fetch('/api/data?action=listGiftcards');
        if (!response.ok) throw new Error('Error fetching giftcards');
        const data = await response.json();
        console.debug('[dataService.getGiftcards] raw response length:', Array.isArray(data) ? data.length : 'non-array');
        if (!Array.isArray(data)) return [];
        return data.map((g: any) => ({
            id: String(g.id),
            code: g.code,
            balance: typeof g.balance === 'number' ? g.balance : (g.balance ? parseFloat(g.balance) : 0),
            initialValue: typeof g.initialValue === 'number' ? g.initialValue : (g.initial_value ? parseFloat(g.initial_value) : (g.initialValue ? parseFloat(g.initialValue) : null)),
            expiresAt: g.expiresAt || g.expires_at || null,
            metadata: g.metadata || g.meta || null,
            giftcardRequestId: g.giftcardRequestId || g.giftcard_request_id || null,
        }));
    } catch (err) {
        console.error('[dataService.getGiftcards] error fetching giftcards:', err);
        return [];
    }
};
// Admin: repair missing giftcards generated from approved requests
export const repairMissingGiftcards = async (options: { dryRun?: boolean; limit?: number } = {}): Promise<any> => {
    try {
        const res = await postAction('repairMissingGiftcards', { dryRun: !!options.dryRun, limit: options.limit || 200 });
        return res;
    } catch (err) {
        console.error('[dataService.repairMissingGiftcards] error:', err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
};
export const updateBooking = async (booking: Booking): Promise<{ success: boolean }> => {
    const result = await postAction('updateBooking', booking);
    if (result.success) {
        invalidateBookingsCache();
    }
    return result;
};
export const removeBookingSlot = async (bookingId: string, slotToRemove: any): Promise<{ success: boolean }> => {
    const result = await postAction('removeBookingSlot', { bookingId, slotToRemove });
    if (result.success) {
        invalidateBookingsCache();
    }
    return result;
};
export const addPaymentToBooking = async (bookingId: string, payment: PaymentDetails): Promise<{ success: boolean; booking?: Booking }> => {
    const result = await postAction('addPaymentToBooking', { bookingId, payment });
    if(result.success && result.booking) {
        return { ...result, booking: parseBooking(result.booking) };
    }
    return result;
};

// Delete payment by ID (new way) or by index (legacy fallback)
export const deletePaymentFromBooking = async (
    bookingId: string, 
    paymentIdOrIndex: string | number, 
    cancelReason?: string
): Promise<{ success: boolean; booking?: Booking }> => {
    const params = typeof paymentIdOrIndex === 'string'
        ? { bookingId, paymentId: paymentIdOrIndex, cancelReason }
        : { bookingId, paymentIndex: paymentIdOrIndex, cancelReason };
    
    const result = await postAction('deletePaymentFromBooking', params);
    if(result.success && result.booking) {
        return { ...result, booking: parseBooking(result.booking) };
    }
    return result;
};

export const markBookingAsPaid = (bookingId: string, details: Omit<PaymentDetails, 'receivedAt'>): Promise<{ success: boolean }> => postAction('markBookingAsPaid', { bookingId, details });
export const markBookingAsUnpaid = async (bookingId: string): Promise<{ success: boolean }> => {
    const result = await postAction('markBookingAsUnpaid', { bookingId });
    if (result.success) {
        invalidateBookingsCache();
    }
    return result;
};

// ============== RESCHEDULE POLICY MANAGER ==============

/**
 * RESCHEDULE POLICY RULES:
 * - Paquete 4 clases: 1 reagendamiento permitido
 * - Paquete 8 clases: 2 reagendamientos permitidos
 * - Paquete 12 clases: 3 reagendamientos permitidos
 * - Requirement: 72 horas de anticipación MÍNIMA
 * - Si no cumple 72h: clase se PIERDE (no se reagenda)
 */

const RESCHEDULE_POLICIES: Record<number, number> = {
    4: 1,   // 4 clases = 1 reagendamiento
    8: 2,   // 8 clases = 2 reagendamientos
    12: 3,  // 12 clases = 3 reagendamientos
};

/**
 * Calcula el allowance de reagendamientos basado en el tipo de paquete
 */
export const calculateRescheduleAllowance = (classesInPackage: number): number => {
    // Si el paquete no está en la tabla, permitir 1 reagendamiento por cada 4 clases (redondeado hacia arriba)
    if (RESCHEDULE_POLICIES[classesInPackage]) {
        return RESCHEDULE_POLICIES[classesInPackage];
    }
    return Math.ceil(classesInPackage / 4);
};

/**
 * Valida elegibilidad para reagendar
 * Retorna: { eligible: boolean, reason?: string }
 */
export const validateRescheduleEligibility = (
    booking: Booking,
    oldSlot: TimeSlot,
    newSlotDate: string // YYYY-MM-DD
): { eligible: boolean; reason?: string } => {
    // 1. Validar que sea un paquete reagendable
    if (!booking.product || typeof booking.product !== 'object') {
        return { eligible: false, reason: 'Producto no encontrado' };
    }

    const product = booking.product as any;
    const productType = booking.productType;

    // Solo permitir en CLASS_PACKAGE, SINGLE_CLASS
    const reagendableTypes = ['CLASS_PACKAGE', 'SINGLE_CLASS', 'INTRODUCTORY_CLASS'];
    if (!reagendableTypes.includes(productType)) {
        return { eligible: false, reason: `No se puede reagendar ${productType}` };
    }

    // 2. Validar política de no-reembolso (acceptedNoRefund)
    if (booking.acceptedNoRefund === true) {
        return { 
            eligible: false, 
            reason: 'Esta clase fue reservada con política de "No reembolsable ni reagendable"' 
        };
    }

    // 3. Validar 72 horas de anticipación
    const now = new Date();
    const oldSlotDate = new Date(oldSlot.date + 'T00:00:00');
    const hoursDifference = (oldSlotDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 72) {
        return { 
            eligible: false, 
            reason: `Requiere 72 horas de anticipación. Solo tienes ${Math.floor(hoursDifference)} horas. La clase se PERDERÁ.` 
        };
    }

    // 4. Validar que no haya excedido allowance
    const allowance = calculateRescheduleAllowance(product.classes || 1);
    const used = (booking.rescheduleUsed || 0);

    if (used >= allowance) {
        return { 
            eligible: false, 
            reason: `Agotaste tus ${allowance} reagendamientos disponibles para este paquete` 
        };
    }

    // 5. Validar que clase no haya pasado
    if (oldSlotDate < now) {
        return { 
            eligible: false, 
            reason: 'Esta clase ya pasó' 
        };
    }

    // ✅ ELEGIBLE
    return { eligible: true };
};

/**
 * Obtiene información sobre reagendamientos disponibles
 */
export const getRescheduleInfo = (booking: Booking): { 
    allowance: number; 
    used: number; 
    remaining: number;
    history: any[];
} => {
    const product = booking.product as any;
    const allowance = calculateRescheduleAllowance(product?.classes || 1);
    const used = booking.rescheduleUsed || 0;
    const remaining = Math.max(0, allowance - used);
    const history = booking.rescheduleHistory || [];

    return { allowance, used, remaining, history };
};

export const rescheduleBookingSlot = async (bookingId: string, oldSlot: any, newSlot: any, forceAdminReschedule?: boolean, adminUser?: string): Promise<AddBookingResult> => {
    console.log('[rescheduleBookingSlot] Starting reschedule:', { bookingId, oldSlot, newSlot, forceAdminReschedule, adminUser });
    const result = await postAction('rescheduleBookingSlot', { bookingId, oldSlot, newSlot, forceAdminReschedule, adminUser });
    
    // CRÍTICO: Siempre invalidar caché para forzar recarga
    invalidateBookingsCache();
    console.log('[rescheduleBookingSlot] Cache invalidated, result:', result);
    
    if(result.success && result.booking) {
        return { ...result, booking: parseBooking(result.booking) };
    }
    
    // Si no hay booking en respuesta pero fue exitoso, aún devolvemos success
    if (result.success) {
        console.warn('[rescheduleBookingSlot] Success but no booking returned from backend');
        return { success: true, message: 'Reschedule successful' };
    }
    
    return result;
};
export const deleteBookingsInDateRange = async (startDate: Date, endDate: Date): Promise<{ success: boolean }> => {
    const result = await postAction('deleteBookingsInDateRange', { startDate, endDate });
    if (result.success) {
        invalidateBookingsCache();
    }
    return result;
};
export const updateAttendanceStatus = (bookingId: string, slot: any, status: AttendanceStatus): Promise<{ success: boolean }> => postAction('updateAttendanceStatus', { bookingId, slot, status });
export const deleteBooking = async (bookingId: string): Promise<{ success: boolean }> => {
    const result = await postAction('deleteBooking', { bookingId });
    if (result.success) {
        invalidateBookingsCache();
    }
    return result;
};
export const updatePaymentReceivedDate = (bookingId: string, newDate: string): Promise<{ success: boolean }> => {
    return postAction('updatePaymentReceivedDate', { bookingId, newDate });
};

// Availability & Schedule
export const getAvailability = (): Promise<Record<DayKey, AvailableSlot[]>> => getData('availability');
export const updateAvailability = (availability: Record<DayKey, AvailableSlot[]>): Promise<{ success: boolean }> => setData('availability', availability);
export const getScheduleOverrides = (): Promise<ScheduleOverrides> => getData('scheduleOverrides');
export const updateScheduleOverrides = (overrides: ScheduleOverrides): Promise<{ success: boolean }> => setData('scheduleOverrides', overrides);

// Instructors - ✅ Usar cache para evitar requests múltiples
let instructorsCache: { data: Instructor[] | null; timestamp: number } = { data: null, timestamp: 0 };
const INSTRUCTORS_CACHE_DURATION = 60 * 60 * 1000; // 1 hora cache para instructors
let instructorsFetchPromise: Promise<Instructor[]> | null = null;

export const getInstructors = async (): Promise<Instructor[]> => {
    // ✅ Check cache primero
    const now = Date.now();
    if (instructorsCache.data && (now - instructorsCache.timestamp) < INSTRUCTORS_CACHE_DURATION) {
        console.log('[getInstructors] Cache hit');
        return instructorsCache.data;
    }
    
    // ✅ Deduplicar requests concurrentes
    if (instructorsFetchPromise) {
        console.log('[getInstructors] Reusing pending request');
        return instructorsFetchPromise;
    }
    
    console.log('[getInstructors] Cache miss, fetching...');
    instructorsFetchPromise = fetchData('/api/data?action=instructors')
        .then(rawInstructors => {
            const parsed = rawInstructors.map(parseInstructor);
            instructorsCache = { data: parsed, timestamp: Date.now() };
            instructorsFetchPromise = null;
            return parsed;
        })
        .catch(error => {
            instructorsFetchPromise = null;
            console.error('[getInstructors] Error:', error);
            // Retornar cache expirado si existe
            if (instructorsCache.data) {
                console.warn('[getInstructors] Using expired cache');
                return instructorsCache.data;
            }
            return [];
        });
    
    return instructorsFetchPromise;
};

// ✅ Invalidar cache de instructors cuando se actualizan
export const invalidateInstructorsCache = (): void => {
    console.log('[Cache] Invalidating instructors cache');
    instructorsCache = { data: null, timestamp: 0 };
    instructorsFetchPromise = null;
};

export const updateInstructors = async (instructors: Instructor[]): Promise<{ success: boolean }> => {
    const result = await setData('instructors', instructors);
    // Invalidar cache después de actualizar
    invalidateInstructorsCache();
    return result;
};
export const reassignAnddeleteInstructor = async (instructorIdToDelete: number, replacementInstructorId: number): Promise<{ success: boolean }> => {
    const result = await postAction('reassignAndDeleteInstructor', { instructorIdToDelete, replacementInstructorId });
    invalidateInstructorsCache();
    return result;
};
export const deleteInstructor = async (id: number): Promise<{ success: boolean }> => {
    const result = await postAction('deleteInstructor', { id });
    invalidateInstructorsCache();
    return result;
};
export const checkInstructorUsage = (instructorId: number): Promise<{ hasUsage: boolean }> => postAction('checkInstructorUsage', { instructorId });


// Inquiries
export const getGroupInquiries = async (): Promise<GroupInquiry[]> => {
    const rawInquiries = await fetchData('/api/data?action=inquiries');
    if (!rawInquiries) {
        return [];
    }
    return rawInquiries.map(parseGroupInquiry);
};
export const addGroupInquiry = async (inquiryData: Omit<GroupInquiry, 'id' | 'status' | 'createdAt'>): Promise<GroupInquiry> => {
    const result = await postAction('addGroupInquiry', inquiryData);
    return parseGroupInquiry(result);
};
export const updateGroupInquiry = (inquiry: GroupInquiry): Promise<{ success: boolean }> => postAction('updateGroupInquiry', inquiry);
export const deleteGroupInquiry = async (id: string): Promise<void> => {
    // Cambia la URL para incluir el 'key' que usarás en el backend
    const response = await fetch(`/api/data?key=inquiry&id=${id}`, {
    method: 'DELETE',
});

    if (!response.ok) {
        throw new Error(`Failed to delete inquiry: ${response.statusText}`);
    }
};

// Invoicing
export const getInvoiceRequests = async (): Promise<InvoiceRequest[]> => {
    const rawInvoices = await fetchData('/api/data?action=invoiceRequests');
    return rawInvoices || [];
};
export const markInvoiceAsProcessed = (invoiceId: string): Promise<InvoiceRequest> => postAction('markInvoiceAsProcessed', { invoiceId });

// Notifications & Announcements
export const getNotifications = async (): Promise<Notification[]> => {
    const rawNotifications = await fetchData('/api/data?action=notifications');
    return rawNotifications || [];
};
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
export const getUILabels = (): Promise<UILabels> => getData('uiLabels');
export const updateUILabels = (labels: UILabels): Promise<{ success: boolean }> => setData('uiLabels', labels);
export const getAutomationSettings = (): Promise<AutomationSettings> => getData('automationSettings');
export const updateAutomationSettings = (settings: AutomationSettings): Promise<{ success: boolean }> => setData('automationSettings', settings);
export const getClientNotifications = (): Promise<ClientNotification[]> => getData('clientNotifications');
export const deleteClientNotification = (id: string): Promise<{ success: boolean }> => postAction('deleteClientNotification', { id });
export const triggerScheduledNotifications = (): Promise<{ success: boolean }> => postAction('triggerScheduledNotifications', {});
export const getBackgroundSettings = (): Promise<BackgroundSettings> => getData('backgroundSettings');
export const updateBackgroundSettings = (settings: BackgroundSettings): Promise<{ success: boolean }> => setData('backgroundSettings', settings);
export const getBankDetails = (): Promise<BankDetails[]> => getData('bankDetails');

// Custom Experiences - Available Slots
export interface AvailableSlotSearchParams {
    technique: string;          // 'potters_wheel' | 'hand_modeling' | 'painting'
    participants: number;       // Cantidad de participantes
    startDate?: string;         // YYYY-MM-DD, default: hoy
    daysAhead?: number;         // default: 60 días
}

export interface AvailableSlotResult {
    date: string;               // YYYY-MM-DD
    time: string;               // HH:mm
    available: number;          // Cupos disponibles
    total: number;              // Capacidad total
    canBook: boolean;           // true si tiene espacio suficiente
    instructor: string;         // Nombre del instructor
    instructorId: number;       // ID del instructor
    technique: string;          // Técnica del slot
}

export const getAvailableSlotsForExperience = async (params: AvailableSlotSearchParams): Promise<AvailableSlotResult[]> => {
    const { technique, participants, startDate, daysAhead } = params;
    
    const queryParams = new URLSearchParams({
        technique,
        participants: participants.toString(),
        ...(startDate && { startDate }),
        ...(daysAhead && { daysAhead: daysAhead.toString() })
    });

    const response = await fetchData(`/api/data?action=getAvailableSlots&${queryParams.toString()}`);
    
    if (response && response.success) {
        return response.slots || [];
    }
    
    console.error('Error fetching available slots:', response);
    return [];
};

// Tipo para resultado de checkSlotAvailability
export interface SlotAvailabilityResult {
    success: boolean;
    available: boolean;
    date: string;
    time: string;
    technique: string;
    requestedParticipants: number;
    capacity: {
        max: number;
        booked: number;
        available: number;
    };
    bookingsCount: number;
    message: string;
}

// Validar disponibilidad de un slot específico en tiempo real
export const checkSlotAvailability = async (
    date: string, 
    time: string, 
    technique: string, 
    participants: number
): Promise<SlotAvailabilityResult> => {
    const queryParams = new URLSearchParams({
        action: 'checkSlotAvailability',
        date,
        time,
        technique,
        participants: participants.toString()
    });

    try {
        const response = await fetch(`/api/data?${queryParams.toString()}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error checking slot availability:', error);
        return {
            success: false,
            available: false,
            date,
            time,
            technique,
            requestedParticipants: participants,
            capacity: { max: 0, booked: 0, available: 0 },
            bookingsCount: 0,
            message: 'Error al verificar disponibilidad'
        };
    }
};

// Función optimizada para cargar múltiples datos en batch
export const getBatchedData = async (keys: string[]): Promise<Record<string, any>> => {
    const promises = keys.map(key => getData(key).then(data => ({ [key]: data })));
    const results = await Promise.all(promises);
    return results.reduce((acc, result) => ({ ...acc, ...result }), {});
};

// Función específica para datos esenciales de la app
export const getEssentialAppData = async () => {
    try {
        // Cargar datos críticos para primera renderización
        // Estos datos deben estar disponibles inmediatamente
        const criticalData = await getBatchedData(['products', 'announcements', 'footerInfo']);
        
        // Cargar datos menos críticos en background (no bloquean inicial render)
        // Se cargarán mientras el usuario interactúa
        const nonCriticalPromises = {
            policies: getData('policies'),
            uiLabels: getData('uiLabels')
        };

        // Validar que las claves críticas requeridas estén presentes
        const requiredCriticalKeys = ['products', 'announcements', 'footerInfo'];
        requiredCriticalKeys.forEach((key) => {
            if (!criticalData[key]) {
                console.warn(`Missing key: ${key} in essential app data. Using default value.`);
                criticalData[key] = getDefaultData(key);
            }
        });

        // Asegurar que COUPLES_EXPERIENCE existe en los productos (una sola vez)
        if (Array.isArray(criticalData.products)) {
            const hasCouplesExperience = criticalData.products.some((p: any) => p.type === 'COUPLES_EXPERIENCE');
            if (!hasCouplesExperience) {
                const couplexProduct = DEFAULT_PRODUCTS.find((p: any) => p.type === 'COUPLES_EXPERIENCE');
                if (couplexProduct) {
                    // Crear una copia profunda para evitar mutaciones
                    const productCopy = JSON.parse(JSON.stringify(couplexProduct));
                    criticalData.products = [...criticalData.products, productCopy];
                    console.log('✅ COUPLES_EXPERIENCE added successfully. New length:', criticalData.products.length);
                }
            }
        }

        // Cargar datos no críticos en background
        Promise.all([nonCriticalPromises.policies, nonCriticalPromises.uiLabels])
            .then(([policies, uiLabels]) => {
                console.log('Background: Non-critical data loaded');
            })
            .catch(err => console.error('Background load error:', err));

        return criticalData;
    } catch (error) {
        console.error('Error fetching essential app data:', error);
        // Retornar datos por defecto en caso de error
        return {
            products: getDefaultData('products'),
            announcements: getDefaultData('announcements'),
            footerInfo: getDefaultData('footerInfo'),
            policies: getDefaultData('policies'),
            uiLabels: getDefaultData('uiLabels'),
        };
    }
};

// Función específica para datos de scheduling
export const getSchedulingData = async () => {
    // Cargar datos críticos para disponibilidad (instructores y availability)
    // ✅ Usar getInstructors() que tiene cache dedicado de 1 hora
    const [instructors, availability] = await Promise.all([
        getInstructors(),
        getData('availability')
    ]);
    
    // Cargar datos complementarios (NO en background - necesarios para la UI)
    const [scheduleOverrides, classCapacity, capacityMessages] = await Promise.all([
        getData('scheduleOverrides'),
        getData('classCapacity'),
        getData('capacityMessages')
    ]).catch(err => {
        console.error('Background scheduling load error:', err);
        return [{}, { potters_wheel: 0, molding: 0, introductory_class: 0 }, { thresholds: [] }];
    });
    
    return {
        instructors: instructors || [],
        availability: availability || { Sunday: [], Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] },
        scheduleOverrides: scheduleOverrides || {},
        classCapacity: classCapacity || { potters_wheel: 0, molding: 0, introductory_class: 0 },
        capacityMessages: capacityMessages || { thresholds: [] }
    };
};
export const updateBankDetails = (details: BankDetails[]): Promise<{ success: boolean }> => setData('bankDetails', details);

// --- Client-side Calculations and Utilities ---

// Función auxiliar para generar customers desde bookings (exportada para uso en componentes)
export const generateCustomersFromBookings = (bookings: Booking[]): Customer[] => {
    console.log('generateCustomersFromBookings: Starting with', bookings?.length || 0, 'bookings');
    
    if (!bookings || bookings.length === 0) {
        console.log('generateCustomersFromBookings: No bookings provided, returning empty array');
        return [];
    }
    
    // PASO 1: Deduplicar bookings por ID
    const uniqueBookingsMap = new Map<string, Booking>();
    for (const booking of bookings) {
        if (booking && booking.id) {
            uniqueBookingsMap.set(booking.id, booking);
        }
    }
    const uniqueBookings = Array.from(uniqueBookingsMap.values());
    
    if (uniqueBookings.length !== bookings.length) {
        console.warn(`[generateCustomersFromBookings] Removed ${bookings.length - uniqueBookings.length} duplicate bookings`);
    }
    
    // PASO 2: Agrupar por email
    const customerMap: Map<string, { userInfo: UserInfo; bookings: Booking[] }> = new Map();
    for (const booking of uniqueBookings) {
        console.log('generateCustomersFromBookings: Processing booking', booking?.id, 'with userInfo:', !!booking?.userInfo);
        
        if (!booking.userInfo || !booking.userInfo.email) {
            console.warn('generateCustomersFromBookings: Skipping booking without userInfo/email:', booking?.id);
            continue;
        }
        
        const email = booking.userInfo.email.toLowerCase();
    // Eliminado debug
        
        if (!customerMap.has(email)) {
            // Eliminado debug
            customerMap.set(email, { userInfo: booking.userInfo, bookings: [] });
        }
        customerMap.get(email)!.bookings.push(booking);
    }
    
    console.log('generateCustomersFromBookings: Created customerMap with', customerMap.size, 'unique customers');
    
    const customers: Customer[] = Array.from(customerMap.values()).map(data => {
        const sortedBookings = data.bookings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        // Ensure userInfo has all required fields defined
        const safeUserInfo: UserInfo = {
            firstName: data.userInfo.firstName || '',
            lastName: data.userInfo.lastName || '',
            email: data.userInfo.email || '',
            phone: data.userInfo.phone || '',
            countryCode: data.userInfo.countryCode || '',
            birthday: data.userInfo.birthday || null
        };
        
        const customer = {
            email: safeUserInfo.email,
            userInfo: safeUserInfo,
            bookings: sortedBookings,
            totalBookings: data.bookings.length,
            // CORRECCIÓN: Sumar todos los montos de pago del historial en lugar de solo el precio de la reserva
            totalSpent: data.bookings.reduce((sum, b) => {
                const totalPaidForBooking = (b.paymentDetails || []).reduce((paymentSum, p) => paymentSum + (p.amount || 0), 0);
                return sum + totalPaidForBooking;
            }, 0),
            lastBookingDate: sortedBookings.length > 0 ? sortedBookings[0].createdAt : new Date(0),
        };
        
        console.log('generateCustomersFromBookings: Created customer:', customer.email, 'with', customer.totalBookings, 'bookings');
        return customer;
    });
    
    const sortedCustomers = customers.sort((a, b) => b.lastBookingDate.getTime() - a.lastBookingDate.getTime());
    console.log('generateCustomersFromBookings: Returning', sortedCustomers.length, 'sorted customers');
    
    return sortedCustomers;
};

// Get standalone customers from the customers table
export const getStandaloneCustomers = async (): Promise<Customer[]> => {
    try {
        const rawCustomers = await fetchData('/api/data?action=standaloneCustomers');
        if (!rawCustomers) return [];
        
        return rawCustomers.map((customerRow: any) => {
            const safeUserInfo: UserInfo = {
                firstName: customerRow.firstName || '',
                lastName: customerRow.lastName || '', 
                email: customerRow.email || '',
                phone: customerRow.phone || '',
                countryCode: customerRow.countryCode || '',
                birthday: customerRow.birthday || null
            };
            
            return {
                email: customerRow.email,
                userInfo: safeUserInfo,
                bookings: [], // Standalone customers have no bookings
                totalBookings: 0,
                totalSpent: 0,
                lastBookingDate: new Date(0),
                deliveries: [] // Will be populated later
            };
        });
    } catch (error) {
    // Eliminado debug
        return [];
    }
};

export const getCustomersWithDeliveries = async (bookings: Booking[]): Promise<Customer[]> => {
    // Get customers from bookings first
    const customersFromBookings = generateCustomersFromBookings(bookings);
    
    // Get standalone customers from the customers table
    const standaloneCustomers = await getStandaloneCustomers();
    
    // Merge customers, avoiding duplicates (booking-based customers take priority)
    const customerEmailsFromBookings = new Set(customersFromBookings.map(c => c.email.toLowerCase()));
    const uniqueStandaloneCustomers = standaloneCustomers.filter(c => 
        !customerEmailsFromBookings.has(c.email.toLowerCase())
    );
    
    const allCustomers = [...customersFromBookings, ...uniqueStandaloneCustomers];
    
    // ⚡ Get all deliveries (now lightweight - no photos loaded)
    const allDeliveries = await getDeliveries();
    
    // Add deliveries to each customer
    const customersWithDeliveries = allCustomers.map(customer => {
        const customerDeliveries = allDeliveries.filter(d => 
            d.customerEmail.toLowerCase() === customer.email.toLowerCase()
        );
        
        return {
            ...customer,
            deliveries: customerDeliveries
        };
    });
    
    return customersWithDeliveries;
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

        const rulesForDay = (product.schedulingRules || []).filter((rule) => rule.dayOfWeek === dayOfWeek);
        let todaysSessions = rulesForDay.map((rule) => ({
            id: `${dateStr}-${rule.time.replace(':', '')}-${rule.instructorId}`,
            date: dateStr,
            time: rule.time,
            instructorId: rule.instructorId,
            capacity: rule.capacity || 0,
            paidBookingsCount: 0,
            totalBookingsCount: 0,
            isOverride: false,
        }));

        const override = overridesByDate[dateStr];
        if (override !== undefined) {
            if (override !== null) {
                todaysSessions = override.map((s) => ({
                    id: `${dateStr}-${s.time.replace(':', '')}-${s.instructorId}`,
                    date: dateStr,
                    time: s.time,
                    instructorId: s.instructorId,
                    capacity: s.capacity,
                    paidBookingsCount: 0,
                    totalBookingsCount: 0,
                    isOverride: true,
                }));
            } else {
                todaysSessions = [];
            }
        }

        todaysSessions.forEach((session) => {
            const isFull = appData.bookings.some((b) => b.date === session.date && b.time === session.time);
            if (includeFull || !isFull) {
                allSessions.push(session);
            }
        });
    }

    return allSessions;
};

const getBookingsForSlot = (date: Date, slot: AvailableSlot, appData: Pick<AppData, 'bookings'>): Booking[] => {
    const dateStr = formatDateToYYYYMMDD(date);
    const normalizeTime = (t: string) => {
        if (!t) return '';
        if (/^\d{2}:\d{2}$/.test(t)) return t;
        const d = new Date(`1970-01-01T${t}`);
        if (!isNaN(d.getTime())) {
            return d.toISOString().substr(11,5);
        }
        return t.trim().toLowerCase();
    };
    
    // Contar cupos por TÉCNICA, no por instructorId
    // Esto permite acumular cupos de paquetes + clases sueltas + introducción
    // para la misma técnica a la misma hora
    return appData.bookings.filter(b => {
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
            // Fallback: usar campo technique si product.name no es informativo
            bookingTechnique = b.technique || (b.product?.details as any)?.technique;
        }
        
        if (!bookingTechnique) return false; // Si no tiene técnica, ignorar
        
        // Verificar que coincidan técnica, fecha y hora
        return bookingTechnique === slot.technique &&
            b.slots.some(s =>
                s.date === dateStr &&
                normalizeTime(s.time) === normalizeTime(slot.time)
            );
    });
};

export const getAvailableTimesForDate = (date: Date, appData: Pick<AppData, 'availability' | 'scheduleOverrides' | 'classCapacity' | 'bookings'>, technique?: Technique): EnrichedAvailableSlot[] => {
    const dateStr = formatDateToYYYYMMDD(date);
    const dayKey = DAY_NAMES[date.getDay()];
    const override = appData.scheduleOverrides[dateStr];
    
    if (override && override.slots === null) return [];

    let baseSlots = override ? override.slots! : appData.availability[dayKey];
    if (technique) {
        baseSlots = baseSlots.filter(s => s.technique === technique);
    }

    return baseSlots.map(slot => {
        const bookingsForSlot = getBookingsForSlot(date, slot, appData);
        const maxCapacity = override?.capacity ?? (slot.technique === 'molding' ? appData.classCapacity.molding : appData.classCapacity.potters_wheel);
        
        // FIX CRÍTICO: Contar TODOS los participantes (pagados + pendientes)
        // Los bookings pendientes de pago también ocupan cupos hasta que se cancelen
        const totalParticipants = bookingsForSlot
            .reduce((sum, b) => sum + (b.participants || 1), 0);
        
        const paidParticipants = bookingsForSlot
            .filter(b => b.isPaid)
            .reduce((sum, b) => sum + (b.participants || 1), 0);
        
        return {
            ...slot,
            paidBookingsCount: totalParticipants,  // Mostrar total, no solo pagados
            totalBookingsCount: totalParticipants,
            maxCapacity
        };
    });
};

export const getAllConfiguredTimesForDate = (date: Date, appData: Pick<AppData, 'availability' | 'scheduleOverrides' | 'classCapacity' | 'bookings'>, technique?: Technique): EnrichedAvailableSlot[] => {
    return getAvailableTimesForDate(date, appData, technique);
};

export const checkMonthlyAvailability = (startDate: Date, slot: AvailableSlot, appData: Pick<AppData, 'availability' | 'scheduleOverrides' | 'classCapacity' | 'bookings'>, technique: Technique): boolean => {
    console.log(`[checkMonthlyAvailability] Checking ${startDate.toISOString().split('T')[0]} at ${slot.time}`);
    
    let consecutiveAvailable = 0;
    let maxConsecutiveFromStart = 0;
    
    for (let i = 0; i < 4; i++) {
        const checkDate = new Date(startDate);
        checkDate.setDate(startDate.getDate() + (i * 7));
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const daySlots = getAvailableTimesForDate(checkDate, appData, technique);
        const matchingSlot = daySlots.find(s => s.time === slot.time && s.instructorId === slot.instructorId);
        
        console.log(`  Week ${i}: ${dateStr} - Slot found: ${!!matchingSlot}, Capacity: ${matchingSlot?.paidBookingsCount}/${matchingSlot?.maxCapacity}`);
        
        if (matchingSlot) {
            // Si el slot existe, verificar que tenga capacidad disponible
            if (matchingSlot.paidBookingsCount >= matchingSlot.maxCapacity) {
                console.log(`  ❌ REJECTED: Week ${i} is full`);
                return false;
            }
            consecutiveAvailable++;
            // Solo actualizar max si es consecutivo desde el inicio
            if (i === consecutiveAvailable - 1) {
                maxConsecutiveFromStart = consecutiveAvailable;
            }
        } else {
            // Slot no existe (feriado) - resetear contador
            consecutiveAvailable = 0;
        }
    }
    
    // Requerir al menos 2 semanas consecutivas disponibles DESDE EL INICIO
    // Esto permite que se inicie el paquete incluso si hay feriados después
    if (maxConsecutiveFromStart >= 2) {
        console.log(`  ✅ APPROVED: ${maxConsecutiveFromStart} consecutive weeks from start (minimum 2 required)`);
        return true;
    } else {
        console.log(`  ❌ REJECTED: Only ${maxConsecutiveFromStart} consecutive weeks from start (minimum 2 required)`);
        return false;
    }
};

export const getFutureCapacityMetrics = async (days: number): Promise<{ totalCapacity: number, bookedSlots: number }> => {
    const [products, bookings, availability, scheduleOverrides, classCapacity] = await Promise.all([
        getProducts(),
        getBookings(),
        getAvailability(),
        getScheduleOverrides(),
        getClassCapacity()
    ]);
    
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
            const slots = override?.slots ?? availability[dayKey];
            const dailyOverrideCapacity = override?.capacity;

            if (dailyOverrideCapacity !== undefined) {
                totalCapacity += slots.length * dailyOverrideCapacity;
            } else {
                slots.forEach(slot => {
                    const capacityForSlot = slot.technique === 'molding' ? classCapacity.molding : classCapacity.potters_wheel;
                    totalCapacity += capacityForSlot;
                });
            }
        }

        const introClasses = products.filter(p => p.type === 'INTRODUCTORY_CLASS') as IntroductoryClass[];
        introClasses.forEach(p => {
            const sessions = generateIntroClassSessions(p, { bookings }, { generationLimitInDays: days });
            sessions.filter(s => s.date === dateStr).forEach(s => {
                totalCapacity += s.capacity;
            });
        });
    }

    // FIX: Refactor bookedSlots calculation to account for booking.participants
    const futureBookedSlots = bookings.reduce((count, booking) => {
        const bookingSlotsCount = booking.slots.filter(slot => {
            const slotDate = new Date(slot.date);
            slotDate.setHours(0,0,0,0);
            return slotDate >= today;
        }).length;
        
        // CRÍTICO: Usar booking.participants si está disponible (admin manual booking)
        // Esto es especialmente importante para reservas con múltiples asistentes
        const participantCount = booking.participants ?? 1;
        
        if (booking.productType === 'GROUP_CLASS') {
             // For a Group Class, multiply participants by number of slots
             return count + (participantCount * bookingSlotsCount);
        } else if (booking.productType === 'SINGLE_CLASS' || booking.productType === 'CLASS_PACKAGE' || booking.productType === 'INTRODUCTORY_CLASS') {
            // For other classes, multiply participants by number of slots
            return count + (participantCount * bookingSlotsCount);
        }

        return count;
    }, 0);

    return { totalCapacity, bookedSlots: futureBookedSlots };
};

// --- Delivery System Functions ---
// Eliminar cliente por email
export const deleteCustomer = async (email: string): Promise<{ success: boolean }> => {
    return postAction('deleteCustomer', { email });
};

const parseDelivery = (d: any): Delivery => {
    let parsedPhotos: string[] = [];
    
    if (d.photos) {
        try {
            if (Array.isArray(d.photos)) {
                parsedPhotos = d.photos;
            } else if (typeof d.photos === 'string') {
                parsedPhotos = JSON.parse(d.photos || '[]');
            }
            // Filter out invalid/empty photos
            parsedPhotos = parsedPhotos.filter((photo: any) => {
                if (typeof photo === 'string' && photo.trim()) {
                    return photo.startsWith('data:') || photo.startsWith('http://') || photo.startsWith('https://');
                }
                return false;
            });
        } catch (error) {
            console.error('[parseDelivery] Error parsing photos:', error, 'raw:', d.photos);
            parsedPhotos = [];
        }
    }
    
    return {
        id: d.id,
        customerEmail: d.customerEmail || d.customer_email,
        description: d.description,
        scheduledDate: d.scheduledDate || d.scheduled_date,
        status: d.status as DeliveryStatus,
        createdAt: d.createdAt || d.created_at,
        completedAt: d.completedAt || d.completed_at || null,
        deliveredAt: d.deliveredAt || d.delivered_at || null,
        readyAt: d.readyAt || d.ready_at || null,
        notes: d.notes || null,
        photos: parsedPhotos,
        hasPhotos: d.hasPhotos || false // ⚡ Flag para lazy loading
    };
};

// ⚡ Carga ligera de deliveries (sin fotos - para listados)
export const getDeliveries = async (): Promise<Delivery[]> => {
    const rawDeliveries = await fetchData('/api/data?action=deliveries');
    return rawDeliveries ? rawDeliveries.map(parseDelivery) : [];
};

// ⚡ Carga de fotos bajo demanda para una delivery específica
export const getDeliveryPhotos = async (deliveryId: string): Promise<string[]> => {
    try {
        const result = await fetchData(`/api/data?action=getDeliveryPhotos&deliveryId=${deliveryId}`);
        if (!result || !result.photos) return [];
        
        let photos = result.photos;
        if (typeof photos === 'string') {
            try {
                photos = JSON.parse(photos);
            } catch {
                return [];
            }
        }
        
        if (!Array.isArray(photos)) return [];
        
        return photos.filter((photo: any) => {
            if (typeof photo === 'string' && photo.trim()) {
                return photo.startsWith('data:') || photo.startsWith('http://') || photo.startsWith('https://');
            }
            return false;
        });
    } catch (error) {
        console.error('[getDeliveryPhotos] Error:', error);
        return [];
    }
};

export const getDeliveriesByCustomer = async (customerEmail: string): Promise<Delivery[]> => {
    const allDeliveries = await getDeliveries();
    return allDeliveries.filter(d => d.customerEmail === customerEmail);
};

export const createDelivery = async (deliveryData: Omit<Delivery, 'id' | 'createdAt'>): Promise<{ success: boolean; delivery?: Delivery }> => {
    const result = await postAction('createDelivery', deliveryData);
    if (result.success && result.delivery) {
        return { ...result, delivery: parseDelivery(result.delivery) };
    }
    return result;
};

export const createDeliveryFromClient = async (data: {
    email: string;
    userInfo: UserInfo;
    description: string | null;
    scheduledDate: string;
    photos: string[] | null;
    wantsPainting?: boolean;
    paintingPrice?: number | null;
}): Promise<{ success: boolean; delivery?: Delivery; isNewCustomer?: boolean; error?: string; message?: string }> => {
    try {
        console.log('[dataService] createDeliveryFromClient called with painting:', data.wantsPainting);
        
        // Add 60-second timeout protection (increased for mobile connections)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const result = await Promise.race([
                postAction('createDeliveryFromClient', data),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000)
                )
            ]) as any;

            clearTimeout(timeoutId);
            
            console.log('[dataService] createDeliveryFromClient response:', result);
            
            if (result.success && result.delivery) {
                // Invalidar cache después de crear delivery
                invalidateCustomersCache();
                
                return { 
                    ...result, 
                    delivery: parseDelivery(result.delivery),
                    message: result.message || '✅ ¡Gracias! Hemos recibido tu información.'
                };
            }
            return { 
                success: false, 
                error: result.error || 'Error al procesar tu solicitud'
            };
        } catch (timeoutError) {
            clearTimeout(timeoutId);
            console.error('[dataService] createDeliveryFromClient timeout:', timeoutError);
            throw timeoutError;
        }
    } catch (error) {
        console.error('[dataService] createDeliveryFromClient error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        console.log('[ERROR_LOG_FOR_VERCEL]', JSON.stringify({
            timestamp: new Date().toISOString(),
            service: 'dataService',
            method: 'createDeliveryFromClient',
            error: errorMsg,
            errorStack: error instanceof Error ? error.stack : 'No stack available'
        }));
        return { 
            success: false, 
            error: errorMsg
        };
    }
};

export const updateDelivery = async (deliveryId: string, updates: Partial<Omit<Delivery, 'id' | 'customerEmail' | 'createdAt'>>): Promise<{ success: boolean; delivery?: Delivery }> => {
    const result = await postAction('updateDelivery', { deliveryId, updates });
    if (result.success && result.delivery) {
        return { ...result, delivery: parseDelivery(result.delivery) };
    }
    return result;
};

export const markDeliveryAsCompleted = async (deliveryId: string, notes?: string): Promise<{ success: boolean; delivery?: Delivery }> => {
    const result = await postAction('markDeliveryAsCompleted', { 
        deliveryId, 
        notes,
        deliveredAt: new Date().toISOString()
    });
    if (result.success && result.delivery) {
        return { ...result, delivery: parseDelivery(result.delivery) };
    }
    return result;
};

export const markDeliveryAsReady = async (deliveryId: string, resend: boolean = false): Promise<{ success: boolean; delivery?: Delivery; error?: string }> => {
    const result = await postAction('markDeliveryAsReady', { deliveryId, resend });
    if (result.success && result.delivery) {
        return { ...result, delivery: parseDelivery(result.delivery) };
    }
    return result;
};

export const deleteDelivery = async (deliveryId: string): Promise<{ success: boolean }> => {
    return postAction('deleteDelivery', { deliveryId });
};

export const bulkUpdateDeliveryStatus = async (
    deliveryIds: string[],
    action: 'markReady' | 'markCompleted' | 'delete',
    metadata?: any
): Promise<{
    success: boolean;
    results: Array<{ id: string; success: boolean; delivery?: Delivery }>;
    errors: Array<{ id: string; error: string }>;
    summary: { total: number; succeeded: number; failed: number };
    error?: string;
}> => {
    try {
        const result = await postAction('bulkUpdateDeliveryStatus', {
            deliveryIds,
            action,
            metadata
        });
        
        if (!result || !result.success) {
            return {
                success: false,
                results: [],
                errors: deliveryIds.map(id => ({ id, error: result?.error || 'Unknown error' })),
                summary: { total: deliveryIds.length, succeeded: 0, failed: deliveryIds.length },
                error: result?.error || 'Bulk operation failed'
            };
        }
        
        // Parse deliveries in results
        const parsedResults = (result.results || []).map((r: any) => ({
            ...r,
            delivery: r.delivery ? parseDelivery(r.delivery) : undefined
        }));
        
        return {
            success: true,
            results: parsedResults,
            errors: result.errors || [],
            summary: result.summary || { total: deliveryIds.length, succeeded: parsedResults.length, failed: (result.errors || []).length }
        };
    } catch (error) {
        console.error('[bulkUpdateDeliveryStatus] Error:', error);
        return {
            success: false,
            results: [],
            errors: deliveryIds.map(id => ({ 
                id, 
                error: error instanceof Error ? error.message : 'Network error' 
            })),
            summary: { total: deliveryIds.length, succeeded: 0, failed: deliveryIds.length },
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
};

export const updateDeliveryStatuses = async (): Promise<{ success: boolean; updated: number }> => {
    return postAction('updateDeliveryStatuses', {});
};

// Función para migrar productos existentes y asignar sort_order
export const migrateSortOrderForProducts = async (): Promise<{ success: boolean }> => {
    // Limpiar cache después de la migración
    const result = await postAction('migrateSortOrderForProducts', {}) as { success: boolean };
    if (result.success) {
        clearCache('products');
    }
    return result;
};

// Función para agregar la columna sort_order si no existe
export const addSortOrderColumn = async (): Promise<{ success: boolean }> => {
    // Limpiar cache después de agregar columna
    const result = await postAction('addSortOrderColumn', {}) as { success: boolean };
    if (result.success) {
        clearCache('products');
    }
    return result;
};

// Check giftcard balance by code
export const checkGiftcardBalance = async (code: string): Promise<{ 
    success: boolean; 
    giftcard?: { 
        balance: number; 
        beneficiaryName: string; 
        beneficiaryEmail: string; 
        expiresAt: string 
    }; 
    message?: string 
}> => {
    try {
        const response = await fetch('/api/giftcards?action=checkBalance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        return { 
            success: false, 
            message: error instanceof Error ? error.message : 'Error checking balance' 
        };
    }
};

// Send giftcard immediately (override scheduling)
export const sendGiftcardNow = async (requestId: string | number): Promise<{ success: boolean; error?: string }> => {
    try {
        const response = await fetch('/api/data?action=sendGiftcardNow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId })
        });
        const result = await response.json();
        return result;
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Error sending giftcard' };
    }
};

export const updateGiftcardSchedule = async (
    requestId: string | number, 
    scheduledSendAt: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
        const response = await fetch('/api/data?action=updateGiftcardSchedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, scheduledSendAt })
        });
        const result = await response.json();
        return result;
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Error updating schedule' };
    }
};

// ============== PACKAGE RENEWAL CHECK ==============

/**
 * Verifica si un paquete está por terminarse (<=2 clases restantes)
 * Retorna: { shouldSendReminder: boolean, remainingClasses: number, totalClasses: number }
 */
export const checkPackageCompletionStatus = (booking: Booking): {
    shouldSendReminder: boolean;
    remainingClasses: number;
    totalClasses: number;
} => {
    if (!booking.product || typeof booking.product !== 'object') {
        return { shouldSendReminder: false, remainingClasses: 0, totalClasses: 0 };
    }

    const product = booking.product as any;
    
    // Solo aplica a paquetes
    if (!['CLASS_PACKAGE'].includes(booking.productType)) {
        return { shouldSendReminder: false, remainingClasses: 0, totalClasses: 0 };
    }

    const totalClasses = product.classes || 0;
    const usedSlots = booking.slots?.length || 0;
    const remainingClasses = Math.max(0, totalClasses - usedSlots);

    // Enviar recordatorio si quedan <=2 clases
    const shouldSendReminder = remainingClasses > 0 && remainingClasses <= 2;

    return {
        shouldSendReminder,
        remainingClasses,
        totalClasses
    };
};

/**
 * Obtiene información completa para envío de email de renovación
 */
export const getPackageRenewalInfo = (booking: Booking) => {
    const product = booking.product as any;
    const check = checkPackageCompletionStatus(booking);

    const packageTypeLabel = `${product.classes} clases`;
    
    return {
        firstName: booking.userInfo?.firstName || 'Cliente',
        lastName: booking.userInfo?.lastName || '',
        email: booking.userInfo?.email || '',
        remainingClasses: check.remainingClasses,
        totalClasses: check.totalClasses,
        packageType: packageTypeLabel,
        packagePrice: product.price || 0,
        lastBookingDate: booking.slots?.[booking.slots.length - 1]?.date,
        shouldNotify: check.shouldSendReminder
    };
};

/**
 * Get client booking by email and booking code
 * Used for client login/identification
 */
export const getClientBooking = async (email: string, bookingCode: string): Promise<any> => {
    try {
        const response = await fetch(`/api/data?action=getClientBooking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, bookingCode })
        });

        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                message: error.message || 'Invalid email or booking code'
            };
        }

        const data = await response.json();
        return {
            success: true,
            booking: data
        };
    } catch (error) {
        console.error('getClientBooking error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error fetching booking'
        };
    }
};

// ==================== NEW EXPERIENCE FUNCTIONS ====================

/**
 * List all active pieces for experience selection
 */
export const listPieces = async () => {
    try {
        const response = await fetch('/api/data?action=listPieces');
        if (!response.ok) throw new Error('Error listing pieces');
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('[dataService] Error listing pieces:', error);
        throw error;
    }
};

/**
 * Create a new piece (admin only)
 */
export const createPiece = async (pieceData: {
    name: string;
    description?: string;
    category?: string;
    basePrice: number;
    estimatedHours?: number;
    imageUrl?: string;
    sortOrder?: number;
}) => {
    try {
        const response = await fetch('/api/data?action=createPiece', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pieceData),
        });
        if (!response.ok) throw new Error('Error creating piece');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('[dataService] Error creating piece:', error);
        throw error;
    }
};

/**
 * Update a piece (admin only)
 */
export const updatePiece = async (pieceId: string, updates: any) => {
    try {
        const response = await fetch('/api/data?action=updatePiece', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pieceId, ...updates }),
        });
        if (!response.ok) throw new Error('Error updating piece');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('[dataService] Error updating piece:', error);
        throw error;
    }
};

/**
 * Calculate experience pricing based on selected pieces and options
 */
export const calculateExperiencePricing = async (piecesSelected: any[], guidedOption: string) => {
    try {
        const response = await fetch('/api/data?action=calculateExperiencePricing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ piecesSelected, guidedOption }),
        });
        if (!response.ok) throw new Error('Error calculating pricing');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('[dataService] Error calculating pricing:', error);
        throw error;
    }
};

/**
 * List all experience confirmations (admin only)
 */
export const listExperienceConfirmations = async () => {
    try {
        const response = await fetch('/api/data?action=listExperienceConfirmations');
        if (!response.ok) throw new Error('Error listing confirmations');
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('[dataService] Error listing confirmations:', error);
        throw error;
    }
};

/**
 * Confirm an experience (admin only)
 */
export const confirmExperience = async (experienceConfirmationId: string, reason?: string) => {
    try {
        const response = await fetch(`/api/data?action=confirmExperience`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ experienceConfirmationId, reason }),
        });
        if (!response.ok) throw new Error('Error confirming experience');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[dataService] Error confirming experience:', error);
        throw error;
    }
};

/**
 * Reject an experience (admin only)
 */
export const rejectExperience = async (experienceConfirmationId: string, reason: string) => {
    try {
        const response = await fetch(`/api/data?action=rejectExperience`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ experienceConfirmationId, reason }),
        });
        if (!response.ok) throw new Error('Error rejecting experience');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[dataService] Error rejecting experience:', error);
        throw error;
    }
};

// ========== HORARIOS DINÁMICOS CON CAPACIDAD ==========

/**
 * Calcula la disponibilidad de un slot considerando solapamiento
 * Ventana: startTime ±30 min
 */
export const calculateSlotAvailability = (
  date: string, // "2025-12-05"
  startTime: string, // "11:00"
  appData: AppData
): SlotDisplayInfo => {
  const slotStart = new Date(`${date}T${startTime}`);
  const slotEnd = new Date(slotStart.getTime() + 2 * 60 * 60 * 1000); // +2 horas
  
  // FIX: Usar capacidad de appData en lugar de valores hardcodeados
  const capacity = {
    potters_wheel: { max: appData.classCapacity?.potters_wheel || 8, bookedInWindow: 0 },
    hand_modeling: { max: appData.classCapacity?.molding || 14, bookedInWindow: 0 },
    painting: { max: Infinity, bookedInWindow: 0 }
  };

  const overlappingDetails: string[] = [];

  // 1. Contar bookings que se solapan con esta ventana
  // FIX: Normalizar time para comparación consistente
  const normalizeTime = (t: string) => {
    if (!t) return '';
    if (/^\d{2}:\d{2}$/.test(t)) return t;
    const d = new Date(`1970-01-01T${t}`);
    if (!isNaN(d.getTime())) {
      return d.toISOString().substr(11,5);
    }
    return t.trim().toLowerCase();
  };
  
  // Bookings que se solapan - agrupados por técnica
  const bookingsByTechnique: Record<string, Booking[]> = {
    potters_wheel: [],
    hand_modeling: [],
    painting: []
  };
  
  appData.bookings.forEach(booking => {
    // ===== DERIVAR TÉCNICA REAL DEL BOOKING =====
    // Priorizar product.name para derivar técnica (datos más confiables)
    let bookingTechnique: 'potters_wheel' | 'hand_modeling' | 'painting' | undefined;
    const productName = booking.product?.name?.toLowerCase() || '';
    
    if (productName.includes('pintura')) {
      bookingTechnique = 'painting';
    } else if (productName.includes('torno')) {
      bookingTechnique = 'potters_wheel';
    } else if (productName.includes('modelado')) {
      bookingTechnique = 'hand_modeling';
    } else if (booking.technique) {
      bookingTechnique = booking.technique as any;
    } else if (booking.product && 'details' in booking.product) {
      const details = (booking.product as any).details;
      if (details && typeof details === 'object' && 'technique' in details) {
        bookingTechnique = details.technique;
      }
    }
    
    if (!bookingTechnique) {
      bookingTechnique = 'hand_modeling';
    }
    
    // Verificar si este booking coincide con la fecha/hora exacta (no ventana)
    const hasMatchingSlot = booking.slots.some(slot => {
      return slot.date === date && normalizeTime(slot.time) === normalizeTime(startTime);
    });
    
    if (hasMatchingSlot) {
      bookingsByTechnique[bookingTechnique].push(booking);
      const participantCount = booking.participants ?? 1;
      capacity[bookingTechnique].bookedInWindow += participantCount;
      overlappingDetails.push(`${booking.productType}: ${participantCount} personas (${bookingTechnique})`);
    }
  });

  const endTimeFormatted = new Date(slotEnd).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calcular disponibilidad
  return {
    date,
    startTime,
    endTime: endTimeFormatted,
    techniques: {
      potters_wheel: {
        available: Math.max(0, capacity.potters_wheel.max - capacity.potters_wheel.bookedInWindow),
        total: capacity.potters_wheel.max,
        bookedInWindow: capacity.potters_wheel.bookedInWindow,
        isAvailable: capacity.potters_wheel.bookedInWindow < capacity.potters_wheel.max,
        overlappingClasses: overlappingDetails.length > 0 ? overlappingDetails : undefined
      },
      hand_modeling: {
        available: Math.max(0, capacity.hand_modeling.max - capacity.hand_modeling.bookedInWindow),
        total: capacity.hand_modeling.max,
        bookedInWindow: capacity.hand_modeling.bookedInWindow,
        isAvailable: capacity.hand_modeling.bookedInWindow < capacity.hand_modeling.max,
        overlappingClasses: overlappingDetails.length > 0 ? overlappingDetails : undefined
      },
      painting: {
        available: Infinity,
        total: Infinity,
        bookedInWindow: capacity.painting.bookedInWindow,
        isAvailable: true
      }
    }
  };
};

/**
 * Genera slots cada 30 minutos para los próximos N días
 */
export const generateTimeSlots = (
  startDate: Date,
  daysCount: number = 180
): DynamicTimeSlot[] => {
  const slots: DynamicTimeSlot[] = [];
  
  // Configuración: qué horas abren cada día
  const hoursPerDay = [
    { start: 9, end: 19, days: [1, 2, 3, 4, 5] }, // Lunes-Viernes: 9 AM a 7 PM
    { start: 9, end: 17, days: [6] } // Sábado: 9 AM a 5 PM
    // Domingo (0) no aparece, así que cerrado
  ];

  for (let d = 0; d < daysCount; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    const dayConfig = hoursPerDay.find(h => h.days.includes(dayOfWeek));
    if (!dayConfig) continue; // Día cerrado (domingo)

    // Generar slots cada 30 minutos
    for (let hour = dayConfig.start; hour < dayConfig.end; hour++) {
      for (let minute of [0, 30]) {
        const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        
        // End time: siempre +2 horas
        let endHour = hour;
        let endMin = minute;
        endHour += 2;
        
        // Si superamos el límite del día, no crear slot
        if (endHour > dayConfig.end) continue;
        
        const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

        slots.push({
          id: `${dateStr}-${startTime}`,
          date: dateStr,
          startTime,
          endTime,
          dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          professorId: null,
          capacity: {
            potters_wheel: { max: 8, bookedInWindow: 0, available: 8, isAvailable: true },
            hand_modeling: { max: 14, bookedInWindow: 0, available: 14, isAvailable: true },
            painting: { max: Infinity, bookedInWindow: 0, available: Infinity, isAvailable: true }
          }
        });
      }
    }
  }

  return slots;
};

// ========================================
// COURSE SYSTEM API
// ========================================

export const getCourseSchedules = async (): Promise<any[]> => {
    try {
        const response = await fetch('/api/courses?action=getSchedules');
        if (!response.ok) throw new Error('Error fetching course schedules');
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Error getting course schedules:', error);
        return [];
    }
};

export const enrollInCourse = async (enrollmentData: {
    studentEmail: string;
    studentInfo: {
        firstName: string;
        lastName: string;
        phoneNumber: string;
    };
    courseScheduleId: string;
    experience?: 'beginner' | 'intermediate';
    specialConsiderations?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
        const response = await fetch('/api/courses?action=enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(enrollmentData)
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error enrolling in course:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
};

export const getCourseEnrollment = async (enrollmentId: string): Promise<any | null> => {
    try {
        const response = await fetch(`/api/courses?action=getEnrollment&enrollmentId=${enrollmentId}`);
        if (!response.ok) return null;
        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('Error getting enrollment:', error);
        return null;
    }
};

export const updateCoursePaymentStatus = async (
    enrollmentId: string,
    amountPaid: number,
    paymentMethod?: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
        const response = await fetch('/api/courses?action=updatePaymentStatus', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enrollmentId, amountPaid, paymentMethod })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error updating payment status:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
};

export const markCourseAttendance = async (
    enrollmentId: string,
    sessionId: string,
    attended: boolean,
    notes?: string,
    progressRating?: number
): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
        const response = await fetch('/api/courses?action=markAttendance', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enrollmentId, sessionId, attended, notes, progressRating })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error marking attendance:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
};

export const getCourseEnrollments = async (scheduleId?: string, status?: string): Promise<any[]> => {
    try {
        let url = '/api/courses?action=getAllEnrollments';
        const params = new URLSearchParams();
        if (scheduleId) params.append('scheduleId', scheduleId);
        if (status) params.append('status', status);
        if (params.toString()) url += '&' + params.toString();
        
        const response = await fetch(url);
        if (!response.ok) return [];
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Error getting enrollments:', error);
        return [];
    }
};

export const toggleCourseScheduleActive = async (
    scheduleId: string,
    isActive: boolean
): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
        const response = await fetch('/api/courses?action=toggleScheduleActive', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduleId, isActive })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error toggling schedule:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
};

export const createCourseSchedule = async (scheduleData: {
    format: '3x2' | '2x3';
    name: string;
    days: string[];
    startTime: string;
    endTime: string;
    startDate: string;
    capacity: number;
}): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
        const response = await fetch('/api/courses?action=createSchedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scheduleData)
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error creating schedule:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
};


