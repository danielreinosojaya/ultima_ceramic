/**
 * Días con el local cerrado (feriado / cierre total).
 * Bloquea todas las actividades y horarios.
 */

export interface StudioClosedDate {
  /** YYYY-MM-DD (Ecuador) */
  date: string;
  /** Mensaje amable para quien intente reservar */
  message: string;
}

const HOLIDAY_MESSAGE =
  'Este día el local estará cerrado. Te recomendamos reservar en otros días con disponibilidad.';

export const STUDIO_CLOSED_DATES: StudioClosedDate[] = [
  {
    date: '2026-11-01',
    message: HOLIDAY_MESSAGE,
  },
];

export function getStudioClosedDate(dateStr: string): StudioClosedDate | null {
  if (!dateStr) return null;
  return STUDIO_CLOSED_DATES.find((d) => d.date === dateStr) || null;
}

export function isStudioClosedOnDate(dateStr: string): boolean {
  return getStudioClosedDate(dateStr) !== null;
}

export function getStudioClosedMessage(dateStr: string): string {
  return getStudioClosedDate(dateStr)?.message || HOLIDAY_MESSAGE;
}
