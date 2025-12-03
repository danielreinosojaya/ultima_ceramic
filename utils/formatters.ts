// Formatea hora local de Ecuador desde timestamp UTC (ISO string)
// El backend ahora guarda en UTC puro, convertir a America/Guayaquil al mostrar
export function formatLocalTimeFromUTC(isoString: string | undefined | null): string {
    if (!isoString) return '-';
    
    try {
        // ✅ FIX: Validar que sea ISO string antes de crear Date
        // Rechazar strings como "2025-12-03" que son solo fechas sin hora
        if (typeof isoString !== 'string') return '-';
        
        // ✅ Requerir que sea ISO completo con T y timezone (o al menos con T)
        if (!isoString.includes('T')) {
          // Si es solo fecha YYYY-MM-DD sin hora, no es válido para formatLocalTimeFromUTC
          // Esta función es para timestamps ISO, no para fechas solas
          return '-';
        }
        
        const date = new Date(isoString);
        
        if (isNaN(date.getTime())) {
            return '-';
        }
        
        // ✅ DEFINITIVO: Usar toLocaleTimeString con timezone de Ecuador
        // Esto convierte automáticamente UTC → America/Guayaquil
        const options: Intl.DateTimeFormatOptions = {
            timeZone: 'America/Guayaquil',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        
        return date.toLocaleTimeString('es-EC', options);
    } catch {
        return '-';
    }
}

// Calcula horas trabajadas en progreso (entrada sin salida)
export function calculateHoursInProgress(timeInIso: string): string {
    if (!timeInIso) return '-';
    try {
        // ✅ CRÍTICO: Convertir AMBOS a UTC para comparación correcta
        const timeIn = new Date(timeInIso);  // Ya está en UTC (backend guarda ISO)
        const nowUtc = new Date();           // getTime() siempre retorna UTC
        
        // ✅ Ambas son timestamps UTC en milisegundos
        const diffMs = nowUtc.getTime() - timeIn.getTime();
        
        // ✅ Si diffMs es negativo, significa bug de sync (no debería ocurrir)
        const hours = Math.max(0, diffMs / 3600000);
        return hours.toFixed(2);
    } catch {
        return '-';
    }
}

// Calcula horas en progreso con formato legible (ej: "2h 30m")
export function calculateHoursInProgressReadable(timeInIso: string): string {
    if (!timeInIso) return '-';
    try {
        // ✅ CRÍTICO: Convertir AMBOS a UTC para comparación correcta
        const timeIn = new Date(timeInIso);  // Ya está en UTC
        const nowUtc = new Date();           // getTime() siempre retorna UTC
        
        // ✅ Ambas son timestamps UTC en milisegundos
        const diffMs = nowUtc.getTime() - timeIn.getTime();
        
        if (diffMs < 0) return '-';
        
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours === 0) {
            return `${minutes}m`;
        } else if (minutes === 0) {
            return `${hours}h`;
        } else {
            return `${hours}h ${minutes}m`;
        }
    } catch {
        return '-';
    }
}

// Calcula horas en progreso con formato decimal y estado
export function calculateHoursInProgressWithStatus(timeInIso: string): { hours: number; formatted: string; status: string } {
    if (!timeInIso) return { hours: 0, formatted: '-', status: 'error' };
    try {
        // ✅ CRÍTICO: Convertir AMBOS a UTC para comparación correcta
        const timeIn = new Date(timeInIso);  // Ya está en UTC
        const nowUtc = new Date();           // getTime() siempre retorna UTC
        
        // ✅ Ambas son timestamps UTC en milisegundos
        const diffMs = nowUtc.getTime() - timeIn.getTime();
        
        if (diffMs < 0) return { hours: 0, formatted: '-', status: 'error' };
        
        const hours = diffMs / 3600000;
        const formatted = hours.toFixed(2);
        
        return {
            hours: Math.max(0, hours),
            formatted,
            status: 'in_progress'
        };
    } catch {
        return { hours: 0, formatted: '-', status: 'error' };
    }
}
export function formatDate(date: string | Date): string {
    if (!date) return '';
    // Si es string tipo YYYY-MM-DD, formatear manualmente sin crear Date (evita desfase)
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [yyyy, mm, dd] = date.split('-');
        return `${dd} ${getMonthName(mm)} ${yyyy}`;
    }
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Fecha Inválida';
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });

function getMonthName(mm: string): string {
    const months = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
    const idx = parseInt(mm, 10) - 1;
    return months[idx] || mm;
}
}

export function formatCurrency(amount: number): string {
    return amount?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function formatPrice(price: any): string {
    // Safely parse and format price values
    let numericPrice: number;
    
    if (typeof price === 'number') {
        numericPrice = isNaN(price) ? 0 : price;
    } else if (typeof price === 'string') {
        numericPrice = parseFloat(price);
        if (isNaN(numericPrice)) {
            numericPrice = 0;
        }
    } else {
        numericPrice = 0;
    }
    
    return numericPrice.toFixed(2);
}

export function normalizeHour(time: string): string {
    // Normaliza hora tipo "9:00" a "09:00:00" y "14:30" a "14:30:00"
    if (!time) return '00:00:00';
    const [h, m] = time.split(':');
    return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}:00`;
}

/**
 * Generate a unique payment ID (UUID v4 simplified)
 * Format: 8-4-4-4-12 hexadecimal characters
 */
export function generatePaymentId(): string {
    // Simple UUID v4 generator (client-side compatible)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Generate a unique giftcard code
 * Format: 8 uppercase alphanumeric characters (no ambiguous: 0, O, 1, I, L)
 * Example: "A7K2M9X5"
 */
export function generateGiftcardCode(): string {
    // Caracteres válidos: excluir 0, O, 1, I, L para evitar confusiones
    const chars = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
