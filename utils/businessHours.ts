import { parseLocalDate, normalizeSlotTimeHHMM } from './formatters';

/** Cierre del estudio: mar–sáb 20:00, dom 17:00. Clases duran 2 h → último inicio mar–sáb 18:00, dom 15:00. */
export const LAST_CLASS_START_MINUTES_TUE_SAT = 18 * 60;
export const LAST_CLASS_START_MINUTES_SUNDAY = 15 * 60;

export function getMaxClassStartMinutes(dayOfWeek: number): number | null {
    if (dayOfWeek === 1) return null; // Lunes cerrado
    if (dayOfWeek === 0) return LAST_CLASS_START_MINUTES_SUNDAY;
    if (dayOfWeek >= 2 && dayOfWeek <= 6) return LAST_CLASS_START_MINUTES_TUE_SAT;
    return null;
}

export function timeToMinutesHHMM(time: string): number {
    const normalized = normalizeSlotTimeHHMM(time);
    const [h, m] = normalized.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
    return h * 60 + m;
}

/** true si el inicio de clase respeta el cierre del estudio (2 h de duración). */
export function isClassStartWithinBusinessHours(dateStr: string, time: string): boolean {
    const dayOfWeek = parseLocalDate(dateStr).getDay();
    const maxStart = getMaxClassStartMinutes(dayOfWeek);
    if (maxStart === null) return false;
    const startMinutes = timeToMinutesHHMM(time);
    if (Number.isNaN(startMinutes)) return false;
    return startMinutes <= maxStart;
}

export function getBusinessHoursRejectionMessage(dateStr: string): string {
    const dayOfWeek = parseLocalDate(dateStr).getDay();
    if (dayOfWeek === 1) return 'El estudio está cerrado los lunes';
    if (dayOfWeek === 0) return 'Domingo: último inicio permitido 15:00 (cierre 17:00)';
    return 'Martes a sábado: último inicio permitido 18:00 (cierre 20:00)';
}
