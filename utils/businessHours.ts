import { parseLocalDate, normalizeSlotTimeHHMM } from './formatters.js';

/** Cierre del estudio: mar–sáb 20:00, dom 17:00. Clases duran 2 h → último inicio mar–sáb 18:00, dom 15:00. */
export const LAST_CLASS_START_MINUTES_TUE_SAT = 18 * 60;
export const LAST_CLASS_START_MINUTES_SUNDAY = 15 * 60;

/**
 * Excepciones de un solo día: último inicio permitido (minutos desde medianoche).
 * Ej. 2026-08-05: alquiler hasta 18:30 → reabrir tarde con inicio 18:30 (clase ~hasta 20:30).
 */
export const LAST_CLASS_START_BY_DATE: Record<string, number> = {
  '2026-08-05': 18 * 60 + 30,
};

export function getMaxClassStartMinutes(dayOfWeek: number): number | null {
    if (dayOfWeek === 1) return null; // Lunes cerrado
    if (dayOfWeek === 0) return LAST_CLASS_START_MINUTES_SUNDAY;
    if (dayOfWeek >= 2 && dayOfWeek <= 6) return LAST_CLASS_START_MINUTES_TUE_SAT;
    return null;
}

export function getMaxClassStartMinutesForDate(dateStr: string): number | null {
    if (Object.prototype.hasOwnProperty.call(LAST_CLASS_START_BY_DATE, dateStr)) {
        return LAST_CLASS_START_BY_DATE[dateStr];
    }
    return getMaxClassStartMinutes(parseLocalDate(dateStr).getDay());
}

export function timeToMinutesHHMM(time: string): number {
    const normalized = normalizeSlotTimeHHMM(time);
    const [h, m] = normalized.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
    return h * 60 + m;
}

function formatMinutesAsHHMM(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Inicios cada 30 min desde openHour hasta el último permitido ese día (inclusive). */
export function getBusinessStartTimesForDate(dateStr: string, openHour = 10): string[] {
    const maxStart = getMaxClassStartMinutesForDate(dateStr);
    if (maxStart === null) return [];
    const hours: string[] = [];
    for (let minutes = openHour * 60; minutes <= maxStart; minutes += 30) {
        hours.push(formatMinutesAsHHMM(minutes));
    }
    return hours;
}

/** true si el inicio de clase respeta el cierre del estudio (2 h de duración). */
export function isClassStartWithinBusinessHours(dateStr: string, time: string): boolean {
    const maxStart = getMaxClassStartMinutesForDate(dateStr);
    if (maxStart === null) return false;
    const startMinutes = timeToMinutesHHMM(time);
    if (Number.isNaN(startMinutes)) return false;
    return startMinutes <= maxStart;
}

export function getBusinessHoursRejectionMessage(dateStr: string): string {
    if (Object.prototype.hasOwnProperty.call(LAST_CLASS_START_BY_DATE, dateStr)) {
        return `Ese día el último inicio permitido es ${formatMinutesAsHHMM(LAST_CLASS_START_BY_DATE[dateStr])}`;
    }
    const dayOfWeek = parseLocalDate(dateStr).getDay();
    if (dayOfWeek === 1) return 'El estudio está cerrado los lunes';
    if (dayOfWeek === 0) return 'Domingo: último inicio permitido 15:00 (cierre 17:00)';
    return 'Martes a sábado: último inicio permitido 18:00 (cierre 20:00)';
}
