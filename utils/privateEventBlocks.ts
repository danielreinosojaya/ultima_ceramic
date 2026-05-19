import { normalizeSlotTimeHHMM } from './formatters';

/** Duración estándar de una clase (minutos). */
export const CLASS_DURATION_MINUTES = 120;

export interface PrivateEventBlock {
  /** YYYY-MM-DD (hora Ecuador) */
  date: string;
  /** HH:MM inicio del evento */
  startTime: string;
  /** HH:MM fin del evento */
  endTime: string;
  label?: string;
}

/**
 * Bloqueos de estudio por eventos privados.
 * Cualquier slot cuya clase (2 h) se solape con la ventana queda no reservable.
 */
export const PRIVATE_EVENT_BLOCKS: PrivateEventBlock[] = [
  {
    date: '2026-05-29',
    startTime: '18:00',
    endTime: '20:00',
    label: 'Evento privado',
  },
];

function timeToMinutes(time: string): number {
  const normalized = normalizeSlotTimeHHMM(time);
  const [h, m] = normalized.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

/** true si [slotStart, slotStart+duration) solapa con algún evento privado del día. */
export function slotOverlapsPrivateEvent(
  dateStr: string,
  slotStartTime: string,
  slotDurationMinutes = CLASS_DURATION_MINUTES
): boolean {
  const slotStart = timeToMinutes(slotStartTime);
  if (Number.isNaN(slotStart)) return false;
  const slotEnd = slotStart + slotDurationMinutes;

  for (const block of PRIVATE_EVENT_BLOCKS) {
    if (block.date !== dateStr) continue;
    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime);
    if (Number.isNaN(blockStart) || Number.isNaN(blockEnd)) continue;
    if (slotStart < blockEnd && slotEnd > blockStart) return true;
  }
  return false;
}

/** Horas de inicio (HH:MM) bloqueadas en un día por eventos privados (clases de 2 h). */
export function getPrivateEventDisabledStartTimes(
  dateStr: string,
  candidateStartTimes: string[]
): string[] {
  return candidateStartTimes.filter((t) => slotOverlapsPrivateEvent(dateStr, t));
}
