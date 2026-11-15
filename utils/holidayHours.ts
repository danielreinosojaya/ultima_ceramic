/**
 * Horarios de Navidad y fin de año (21 dic 2026 – 4 ene 2027).
 * Solo memoria. Si el interruptor está apagado, o la fecha no está en la tabla,
 * el resto de la app sigue con la regla de siempre.
 */

export let HOLIDAY_HOURS_ACTIVE = true;

export function setHolidayHoursActive(next: boolean): void {
    HOLIDAY_HOURS_ACTIVE = next;
}

export const HOLIDAY_CLOSED_MESSAGE =
    'Este día el local estará cerrado. Te recomendamos reservar en otros días con disponibilidad.';

export const HOLIDAY_NOTICE_UNTIL = '2027-01-04';

const CLASS_MINUTES = 120;
const OPEN_10 = 10 * 60;
const CLOSE_17 = 17 * 60;
const CLOSE_20 = 20 * 60;

/** Inicios en punto, cada 2 horas, para quien reserva una sola plaza. */
const STANDARD_STARTS = [10, 12, 14, 16, 18].map((hour) => hour * 60);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type HolidayWindow =
    | { kind: 'closed' }
    | {
          kind: 'open';
          openMinutes: number;
          closeMinutes: number;
          /** Agrega 10:00, 12:00, 14:00, 16:00 y 18:00 si caben en la ventana. */
          injectStandardHours: boolean;
      };

function openDay(closeMinutes: number, injectStandardHours: boolean): HolidayWindow {
    return {
        kind: 'open',
        openMinutes: OPEN_10,
        closeMinutes,
        injectStandardHours,
    };
}

const CLOSED: HolidayWindow = { kind: 'closed' };

export const HOLIDAY_WINDOWS: Record<string, HolidayWindow> = {
    '2026-12-21': openDay(CLOSE_20, true),
    '2026-12-23': openDay(CLOSE_17, false),
    '2026-12-24': CLOSED,
    '2026-12-25': CLOSED,
    '2026-12-26': openDay(CLOSE_20, false),
    '2026-12-27': openDay(CLOSE_20, true),
    '2026-12-28': openDay(CLOSE_20, true),
    '2026-12-29': openDay(CLOSE_20, false),
    '2026-12-30': CLOSED,
    '2026-12-31': CLOSED,
    '2027-01-01': CLOSED,
    '2027-01-02': CLOSED,
    '2027-01-03': CLOSED,
    '2027-01-04': CLOSED,
};

export function getHolidayWindow(dateStr: string): HolidayWindow | null {
    try {
        if (!HOLIDAY_HOURS_ACTIVE) return null;
        if (typeof dateStr !== 'string' || !DATE_RE.test(dateStr)) return null;
        return HOLIDAY_WINDOWS[dateStr] ?? null;
    } catch {
        return null;
    }
}

export function isHolidayListed(dateStr: string): boolean {
    return getHolidayWindow(dateStr) !== null;
}

export function isHolidayOpenDate(dateStr: string): boolean {
    return getHolidayWindow(dateStr)?.kind === 'open';
}

export function isHolidayClosedDate(dateStr: string): boolean {
    return getHolidayWindow(dateStr)?.kind === 'closed';
}

export function getHolidayLastStartMinutes(dateStr: string): number | null {
    const holiday = getHolidayWindow(dateStr);
    if (!holiday || holiday.kind !== 'open') return null;
    return holiday.closeMinutes - CLASS_MINUTES;
}

function formatMinutes(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseMinutes(time: string): number {
    if (typeof time !== 'string') return NaN;
    const match = time.trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return NaN;
    const hours = Number(match[1]);
    const mins = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(mins)) return NaN;
    return hours * 60 + mins;
}

/**
 * En un día que no es de la tabla, devuelve el mismo arreglo.
 * En un día de la tabla, recorta lo que no cabe y, si aplica, agrega los inicios en punto.
 */
export function adjustFixedTimesForHoliday(dateStr: string, times: string[]): string[] {
    const holiday = getHolidayWindow(dateStr);
    if (!holiday) return times;
    if (holiday.kind === 'closed') return [];

    const last = holiday.closeMinutes - CLASS_MINUTES;
    const kept: string[] = [];
    const source = Array.isArray(times) ? times : [];

    for (const time of source) {
        const minutes = parseMinutes(time);
        if (!Number.isFinite(minutes)) continue;
        if (minutes < holiday.openMinutes || minutes > last) continue;
        const label = formatMinutes(minutes);
        if (!kept.includes(label)) kept.push(label);
    }

    if (holiday.injectStandardHours) {
        for (const minutes of STANDARD_STARTS) {
            if (minutes < holiday.openMinutes || minutes > last) continue;
            const label = formatMinutes(minutes);
            if (!kept.includes(label)) kept.push(label);
        }
    }

    kept.sort();
    return kept;
}
