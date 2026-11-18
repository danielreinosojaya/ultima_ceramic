/**
 * Bloqueos temporales por técnica + fecha (día completo o ventana horaria).
 * Mensaje genérico a propósito: no exponer la causa al cliente.
 */

import { normalizeSlotTimeHHMM } from './formatters.js';

export interface TechniqueDateBlock {
  /** YYYY-MM-DD (Ecuador) */
  date: string;
  technique: string;
  /** Mensaje genérico mostrado al cliente */
  message: string;
  /**
   * Inicio inclusive de la ventana bloqueada (HH:MM).
   * Sin blockStart/blockEnd = día completo.
   */
  blockStart?: string;
  /**
   * Fin exclusive de la ventana bloqueada (HH:MM).
   * Usar '24:00' para “hasta fin de día”.
   */
  blockEnd?: string;
}

const GENERIC_UNAVAILABLE = 'No disponible';
const DAY_END_MINUTES = 24 * 60;
const DEFAULT_CLASS_MINUTES = 120;

/** Técnicas alias: hand_modeling ↔ molding */
const TECH_ALIASES: Record<string, string[]> = {
  hand_modeling: ['hand_modeling', 'molding'],
  molding: ['molding', 'hand_modeling'],
  potters_wheel: ['potters_wheel'],
  painting: ['painting'],
};

/**
 * Torno alfarero cerrado:
 * - 29–31 oct 2026 (día completo; 1 nov es cierre total → studioClosedDates.ts)
 * - 19 / 25–28 nov 2026 (parciales + días completos; talleres fuera del local)
 */
export const TECHNIQUE_DATE_BLOCKS: TechniqueDateBlock[] = [
  { date: '2026-10-29', technique: 'potters_wheel', message: GENERIC_UNAVAILABLE },
  { date: '2026-10-30', technique: 'potters_wheel', message: GENERIC_UNAVAILABLE },
  { date: '2026-10-31', technique: 'potters_wheel', message: GENERIC_UNAVAILABLE },
  // 19 nov: solo 11–13 y 18–20 (bloque antes de 11:00 + bloque 13:00–18:00)
  {
    date: '2026-11-19',
    technique: 'potters_wheel',
    message: GENERIC_UNAVAILABLE,
    blockStart: '00:00',
    blockEnd: '11:00',
  },
  {
    date: '2026-11-19',
    technique: 'potters_wheel',
    message: GENERIC_UNAVAILABLE,
    blockStart: '13:00',
    blockEnd: '18:00',
  },
  // 25 nov: desde 13:00 hasta fin de día → última clase acaba ≤ 13:00
  {
    date: '2026-11-25',
    technique: 'potters_wheel',
    message: GENERIC_UNAVAILABLE,
    blockStart: '13:00',
    blockEnd: '24:00',
  },
  { date: '2026-11-26', technique: 'potters_wheel', message: GENERIC_UNAVAILABLE },
  { date: '2026-11-27', technique: 'potters_wheel', message: GENERIC_UNAVAILABLE },
  // 28 nov: desde apertura hasta 15:00 → inicios ≥ 15:00
  {
    date: '2026-11-28',
    technique: 'potters_wheel',
    message: GENERIC_UNAVAILABLE,
    blockStart: '00:00',
    blockEnd: '15:00',
  },
];

function techniquesMatch(requested: string, blocked: string): boolean {
  const aliases = TECH_ALIASES[requested] || [requested];
  return aliases.includes(blocked) || requested === blocked;
}

function timeToMinutes(time: string): number {
  const normalized = normalizeSlotTimeHHMM(time);
  if (normalized === '24:00') return DAY_END_MINUTES;
  const [h, m] = normalized.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

/** Ventana bloqueada [start, end) en minutos. */
export function getBlockWindowMinutes(block: TechniqueDateBlock): { start: number; end: number } {
  const hasStart = Boolean(block.blockStart);
  const hasEnd = Boolean(block.blockEnd);
  if (!hasStart && !hasEnd) {
    return { start: 0, end: DAY_END_MINUTES };
  }
  const start = hasStart ? timeToMinutes(block.blockStart!) : 0;
  const end = hasEnd ? timeToMinutes(block.blockEnd!) : DAY_END_MINUTES;
  return {
    start: Number.isFinite(start) ? start : 0,
    end: Number.isFinite(end) ? end : DAY_END_MINUTES,
  };
}

export function isFullDayTechniqueBlock(block: TechniqueDateBlock): boolean {
  const { start, end } = getBlockWindowMinutes(block);
  return start <= 0 && end >= DAY_END_MINUTES;
}

function windowsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function matchingBlocks(dateStr: string, technique: string): TechniqueDateBlock[] {
  if (!dateStr || !technique) return [];
  return TECHNIQUE_DATE_BLOCKS.filter(
    (block) => block.date === dateStr && techniquesMatch(technique, block.technique)
  );
}

/**
 * Bloqueo de día completo para técnica+fecha, o null.
 * No devuelve bloqueos parciales (usar getTechniqueSlotBlock / isTechniqueSlotBlocked).
 */
export function getTechniqueDateBlock(
  dateStr: string,
  technique: string
): TechniqueDateBlock | null {
  for (const block of matchingBlocks(dateStr, technique)) {
    if (isFullDayTechniqueBlock(block)) return block;
  }
  return null;
}

/** true solo si la técnica está bloqueada todo el día. */
export function isTechniqueFullyBlockedOnDate(dateStr: string, technique: string): boolean {
  return getTechniqueDateBlock(dateStr, technique) !== null;
}

/** Alias de isTechniqueFullyBlockedOnDate (UI que vacía el día entero). */
export function isTechniqueBlockedOnDate(dateStr: string, technique: string): boolean {
  return isTechniqueFullyBlockedOnDate(dateStr, technique);
}

/**
 * Bloqueo que aplica a un inicio de clase concreto (día completo o ventana parcial).
 */
export function getTechniqueSlotBlock(
  dateStr: string,
  technique: string,
  time: string,
  durationMinutes: number = DEFAULT_CLASS_MINUTES
): TechniqueDateBlock | null {
  if (!dateStr || !technique || !time) return null;
  const slotStart = timeToMinutes(time);
  if (!Number.isFinite(slotStart)) return null;
  const slotEnd = slotStart + durationMinutes;

  for (const block of matchingBlocks(dateStr, technique)) {
    const { start, end } = getBlockWindowMinutes(block);
    if (windowsOverlap(slotStart, slotEnd, start, end)) return block;
  }
  return null;
}

export function isTechniqueSlotBlocked(
  dateStr: string,
  technique: string,
  time: string,
  durationMinutes: number = DEFAULT_CLASS_MINUTES
): boolean {
  return getTechniqueSlotBlock(dateStr, technique, time, durationMinutes) !== null;
}
