export const addGiftcardRequest = async (request: Omit<GiftcardRequest, 'id' | 'status' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        const response = await fetch('/api/data?action=addGiftcardRequest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        const result = await response.json();
        return result;
    } catch (error) {
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
    Delivery, DeliveryStatus, UILabels
} from '../types';
import { DAY_NAMES } from '../constants';

// --- API Helpers ---

const fetchData = async (url: string, options?: RequestInit, retries: number = 3) => {
    let lastError: Error | null = null; // Inicialización de la variable
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Solo log en primer intento o errores
            if (attempt === 1) {
                console.log(`Fetching ${url}`);
            } else {
                console.log(`Retry attempt ${attempt}/${retries} for ${url}`);
            }
            
            const response = await fetch(url, {
                ...options,
                // Timeout más largo para mejor compatibilidad
                signal: AbortSignal.timeout(30000) // 30 segundos timeout
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
            
            // Si es timeout, intentar con timeout más largo en el último intento
            if (attempt === retries && lastError.message.includes('timed out')) {
                console.log('Final attempt with longer timeout...');
                try {
                    const response = await fetch(url, {
                        ...options,
                        signal: AbortSignal.timeout(60000) // 60 segundos para último intento
                    });
                    
                    if (response.ok) {
                        const text = await response.text();
                        return text ? JSON.parse(text) : null;
                    }
                } catch (finalError) {
                    console.error('Even extended timeout failed:', finalError);
                }
            }
            
            // Si no es el último intento, esperar antes de reintentar
            if (attempt < retries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // Si todos los intentos fallaron, lanzar el último error
    if (lastError) {
        console.error(`All ${retries} fetch attempts failed for ${url}`);
        throw lastError;
    } else {
        throw new Error('Unknown error occurred during fetch attempts.');
    }
};

// Cache más agresivo para evitar requests innecesarias
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos para datos generales
const CRITICAL_CACHE_DURATION = 60 * 60 * 1000; // 1 hora para datos críticos
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

// Función específica para invalidar bookings cuando se modifiquen
export const invalidateBookingsCache = (): void => {
    clearCache('bookings');
};

const getData = async <T>(key: string): Promise<T> => {
    // Intentar obtener de cache primero con prioridad alta
    const cached = getCachedData<T>(key);
    if (cached) {
        console.log(`Cache hit for ${key}`);
        return cached;
    }
    
    // Verificar si ya hay un request pendiente para evitar duplicados
    const requestKey = `get_${key}`;
    if (pendingRequests.has(requestKey)) {
        console.log(`Request already pending for ${key}, waiting...`);
        return pendingRequests.get(requestKey) as Promise<T>;
    }
    
    console.log(`Cache miss for ${key}, fetching from API`);
    const requestPromise = fetchData(`/api/data?key=${key}`)
        .then(data => {
            setCachedData(key, data);
            pendingRequests.delete(requestKey);
            return data;
        })
        .catch(error => {
            pendingRequests.delete(requestKey);
            console.error(`Failed to fetch ${key}:`, error);
            
            // En caso de error, intentar devolver datos del cache aunque estén expirados
            const expiredCache = cache.get(key);
            if (expiredCache) {
                console.warn(`Using expired cache for ${key} due to fetch error`);
                return expiredCache.data as T;
            }
            
            // Si no hay cache, devolver datos por defecto según el tipo
            console.warn(`No cache available for ${key}, returning default data`);
            return getDefaultData<T>(key);
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
        uiLabels: { taxIdLabel: 'RUC' }
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
        // Usar cache normal sin forzar limpieza
        const rawBookings = await getData<any[]>('bookings');
        
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
        const response = await fetch(`/api/data?action=getBookingById&bookingId=${encodeURIComponent(bookingId)}`);
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
        console.debug('[dataService.validateGiftcard] requesting validation for code:', code);
        // Prefer dedicated endpoint (more reliable routing)
        const response = await fetch('/api/giftcards/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        // If we get any JSON response from the dedicated endpoint, return it (even on 4xx/5xx)
        try {
            const body = await response.json().catch(() => null);
            if (body) return body;
        } catch (e) {}
        // If POST didn't return JSON or body, try GET fallback to the same endpoint
        if (response.status === 404 || response.status === 405) {
            const resp = await fetch(`/api/giftcards/validate?code=${encodeURIComponent(code)}`, { method: 'GET' });
            try {
                const body = await resp.json().catch(() => null);
                if (body) return body;
            } catch (e) {}
        }
        // Last resort: try legacy action router via POST (legacy router expects actions via POST)
        try {
            const legacyPost = await fetch(`/api/data?action=validateGiftcard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            // Return any JSON payload from legacy route even if status is 4xx/5xx
            const legacyBody = await legacyPost.json().catch(() => null);
            console.debug('[dataService.validateGiftcard] legacyPost response body:', legacyBody);
            if (legacyBody) return legacyBody;
        } catch (legacyErr) {
            console.warn('Legacy POST fallback failed for validateGiftcard:', legacyErr);
        }
        console.debug('[dataService.validateGiftcard] all fallbacks failed for code:', code, 'response status:', response.status);
        return { success: false, error: `validateGiftcard failed (${response.status})` };
    } catch (err) {
        console.error('[dataService.validateGiftcard] unexpected error for code:', code, err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
};

export const createGiftcardHold = async (payload: { code?: string; giftcardId?: string; amount: number; bookingTempRef?: string; ttlMinutes?: number }): Promise<any> => {
    try {
        const response = await fetch('/api/giftcards/create-hold', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        // If we received JSON from dedicated endpoint return it even if status is 4xx
        try {
            const body = await response.json().catch(() => null);
            if (body) return body;
        } catch (e) {}

        // Fallback: use legacy action router which supports POST actions
        try {
            const legacy = await fetch(`/api/data?action=createGiftcardHold`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const legacyBody = await legacy.json().catch(() => null);
            if (legacyBody) return legacyBody;
        } catch (legacyErr) {
            console.warn('Legacy POST fallback failed for createGiftcardHold:', legacyErr);
        }
        return { success: false, error: `createGiftcardHold failed (${response.status})` };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
};
export const releaseGiftcardHold = async (payload: { holdId: string }): Promise<any> => {
    try {
        const response = await fetch('/api/giftcards/release-hold', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        try {
            const body = await response.json().catch(() => null);
            if (body) return body;
        } catch (e) {}

        // Fallback to legacy router if needed
        try {
            const legacy = await fetch(`/api/data?action=releaseGiftcardHold`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const legacyBody = await legacy.json().catch(() => null);
            if (legacyBody) return legacyBody;
        } catch (legacyErr) {
            console.warn('Legacy POST fallback failed for releaseGiftcardHold:', legacyErr);
        }

        return { success: false, error: `releaseGiftcardHold failed (${response.status})` };
    } catch (err) {
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
export const rescheduleBookingSlot = async (bookingId: string, oldSlot: any, newSlot: any): Promise<AddBookingResult> => {
    console.log('[rescheduleBookingSlot] Starting reschedule:', { bookingId, oldSlot, newSlot });
    const result = await postAction('rescheduleBookingSlot', { bookingId, oldSlot, newSlot });
    
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

// Instructors
export const getInstructors = async (): Promise<Instructor[]> => {
    const rawInstructors = await fetchData('/api/data?action=instructors');
    return rawInstructors.map(parseInstructor);
};
export const updateInstructors = (instructors: Instructor[]): Promise<{ success: boolean }> => setData('instructors', instructors);
export const reassignAnddeleteInstructor = (instructorIdToDelete: number, replacementInstructorId: number): Promise<{ success: boolean }> => postAction('reassignAndDeleteInstructor', { instructorIdToDelete, replacementInstructorId });
export const deleteInstructor = (id: number): Promise<{ success: boolean }> => postAction('deleteInstructor', { id });
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

// Función optimizada para cargar múltiples datos en batch
export const getBatchedData = async (keys: string[]): Promise<Record<string, any>> => {
    const promises = keys.map(key => getData(key).then(data => ({ [key]: data })));
    const results = await Promise.all(promises);
    return results.reduce((acc, result) => ({ ...acc, ...result }), {});
};

// Función específica para datos esenciales de la app
export const getEssentialAppData = async () => {
    try {
        const data = await getBatchedData(['products', 'announcements', 'policies', 'footerInfo', 'uiLabels']);

        // Validar que las claves requeridas estén presentes
        const requiredKeys = ['products', 'announcements', 'policies', 'footerInfo', 'uiLabels'];
        requiredKeys.forEach((key) => {
            if (!data[key]) {
                console.warn(`Missing key: ${key} in essential app data. Using default value.`);
                data[key] = getDefaultData(key);
            }
        });

        return data;
    } catch (error) {
        console.error('Error fetching essential app data:', error);
        // Retornar datos por defecto en caso de error
        return {
            products: getDefaultData('products'),
            announcements: getDefaultData('announcements'),
            policies: getDefaultData('policies'),
            footerInfo: getDefaultData('footerInfo'),
            uiLabels: getDefaultData('uiLabels'),
        };
    }
};

// Función específica para datos de scheduling
export const getSchedulingData = async () => {
    return getBatchedData(['instructors', 'availability', 'scheduleOverrides', 'classCapacity', 'capacityMessages']);
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
    
    const customerMap: Map<string, { userInfo: UserInfo; bookings: Booking[] }> = new Map();
    for (const booking of bookings) {
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
    // Eliminado debug
    
    // Get customers from bookings first
            const customersFromBookings = generateCustomersFromBookings(bookings);
    // Eliminado debug
    
    // Get standalone customers from the customers table
    const standaloneCustomers = await getStandaloneCustomers();
    // Eliminado debug
    
    // Merge customers, avoiding duplicates (booking-based customers take priority)
    const customerEmailsFromBookings = new Set(customersFromBookings.map(c => c.email.toLowerCase()));
    const uniqueStandaloneCustomers = standaloneCustomers.filter(c => 
        !customerEmailsFromBookings.has(c.email.toLowerCase())
    );
    
    const allCustomers = [...customersFromBookings, ...uniqueStandaloneCustomers];
    // Eliminado debug
    
    // Get all deliveries
    const allDeliveries = await getDeliveries();
    // Eliminado debug
    
    // Add deliveries to each customer
    const customersWithDeliveries = allCustomers.map(customer => {
        const customerDeliveries = allDeliveries.filter(d => 
            d.customerEmail.toLowerCase() === customer.email.toLowerCase()
        );
        
    // Eliminado debug
        
        return {
            ...customer,
            deliveries: customerDeliveries
        };
    });
    
    console.log('DEBUG getCustomersWithDeliveries - Final customers with deliveries:', customersWithDeliveries);
    console.log('DEBUG getCustomersWithDeliveries - Final count:', customersWithDeliveries.length);
    
    // Check specifically for Daniel Reinoso
    const danielCustomer = customersWithDeliveries.find(c => 
        (c.userInfo?.firstName?.toLowerCase() === 'daniel' && c.userInfo?.lastName?.toLowerCase() === 'reinoso') ||
        c.email?.toLowerCase().includes('daniel') ||
        c.email?.toLowerCase().includes('reinoso')
    );
    console.log('DEBUG getCustomersWithDeliveries - Daniel Reinoso found:', danielCustomer);
    
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
    
    return appData.bookings.filter(b => b.slots.some(s =>
        s.date === dateStr &&
        normalizeTime(s.time) === normalizeTime(slot.time) &&
        s.instructorId === slot.instructorId
    ));
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
        return {
            ...slot,
            paidBookingsCount: bookingsForSlot.filter(b => b.isPaid).length,
            totalBookingsCount: bookingsForSlot.length,
            maxCapacity
        };
    });
};

export const getAllConfiguredTimesForDate = (date: Date, appData: Pick<AppData, 'availability' | 'scheduleOverrides' | 'classCapacity' | 'bookings'>, technique?: Technique): EnrichedAvailableSlot[] => {
    return getAvailableTimesForDate(date, appData, technique);
};

export const checkMonthlyAvailability = (startDate: Date, slot: AvailableSlot, appData: Pick<AppData, 'availability' | 'scheduleOverrides' | 'classCapacity' | 'bookings'>, technique: Technique): boolean => {
    for (let i = 0; i < 4; i++) {
        const checkDate = new Date(startDate);
        checkDate.setDate(startDate.getDate() + (i * 7));
        const daySlots = getAvailableTimesForDate(checkDate, appData, technique);
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

    // FIX: Refactor bookedSlots calculation to be more accurate for all booking types
    const futureBookedSlots = bookings.reduce((count, booking) => {
        const bookingSlotsCount = booking.slots.filter(slot => {
            const slotDate = new Date(slot.date);
            slotDate.setHours(0,0,0,0);
            return slotDate >= today;
        }).length;
        
        if (booking.productType === 'GROUP_CLASS') {
             // For a Group Class, the booked slots is the number of participants.
             return count + (booking.product as GroupClass).minParticipants;
        } else if (booking.productType === 'SINGLE_CLASS' || booking.productType === 'CLASS_PACKAGE' || booking.productType === 'INTRODUCTORY_CLASS') {
            // For other classes, the booked slots are simply the number of slots selected.
            return count + bookingSlotsCount;
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
    const parsedPhotos = d.photos ? (Array.isArray(d.photos) ? d.photos : JSON.parse(d.photos || '[]')) : [];
    
    return {
        id: d.id,
        customerEmail: d.customerEmail || d.customer_email,
        description: d.description,
        scheduledDate: d.scheduledDate || d.scheduled_date,
        status: d.status as DeliveryStatus,
        createdAt: d.createdAt || d.created_at,
        completedAt: d.completedAt || d.completed_at || null,
        deliveredAt: d.deliveredAt || d.delivered_at || null,
        notes: d.notes || null,
        photos: parsedPhotos
    };
};

export const getDeliveries = async (): Promise<Delivery[]> => {
    const rawDeliveries = await fetchData('/api/data?action=deliveries');
    return rawDeliveries ? rawDeliveries.map(parseDelivery) : [];
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

export const markDeliveryAsReady = async (deliveryId: string): Promise<{ success: boolean; delivery?: Delivery; error?: string }> => {
    const result = await postAction('markDeliveryAsReady', { deliveryId });
    if (result.success && result.delivery) {
        return { ...result, delivery: parseDelivery(result.delivery) };
    }
    return result;
};

export const deleteDelivery = async (deliveryId: string): Promise<{ success: boolean }> => {
    return postAction('deleteDelivery', { deliveryId });
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