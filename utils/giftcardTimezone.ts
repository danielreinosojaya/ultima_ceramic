/** Ecuador (America/Guayaquil) — sin horario de verano, siempre UTC-5 */
export const ECUADOR_UTC_OFFSET_HOURS = 5;

/** Convierte fecha + hora de Ecuador a ISO UTC para guardar en BD */
export function ecuadorLocalToUtcIso(dateStr: string, timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hours + ECUADOR_UTC_OFFSET_HOURS, minutes, 0, 0);
  return new Date(utcMs).toISOString();
}

/** Muestra un instante UTC como fecha/hora legible en Ecuador */
export function formatEcuadorDateTime(isoUtc: string | Date | null | undefined): string {
  if (!isoUtc) return '—';
  const d = typeof isoUtc === 'string' ? new Date(isoUtc) : isoUtc;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Para inputs type="date" / type="time" en admin (desde UTC almacenado) */
export function utcIsoToEcuadorParts(isoUtc: string | Date | null | undefined): { date: string; time: string } | null {
  if (!isoUtc) return null;
  const d = typeof isoUtc === 'string' ? new Date(isoUtc) : isoUtc;
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}
