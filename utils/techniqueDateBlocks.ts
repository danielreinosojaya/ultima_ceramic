/**
 * Bloqueos temporales por técnica + fecha (todo el día).
 * Mensaje genérico a propósito: no exponer la causa al cliente.
 */

export interface TechniqueDateBlock {
  /** YYYY-MM-DD (Ecuador) */
  date: string;
  technique: string;
  /** Mensaje genérico mostrado al cliente */
  message: string;
}

const GENERIC_UNAVAILABLE = 'No disponible';

/** Técnicas alias: hand_modeling ↔ molding */
const TECH_ALIASES: Record<string, string[]> = {
  hand_modeling: ['hand_modeling', 'molding'],
  molding: ['molding', 'hand_modeling'],
  potters_wheel: ['potters_wheel'],
  painting: ['painting'],
};

/**
 * Torno alfarero cerrado: 29–31 oct 2026.
 * (1 nov es cierre total del local → ver studioClosedDates.ts)
 */
export const TECHNIQUE_DATE_BLOCKS: TechniqueDateBlock[] = [
  { date: '2026-10-29', technique: 'potters_wheel', message: GENERIC_UNAVAILABLE },
  { date: '2026-10-30', technique: 'potters_wheel', message: GENERIC_UNAVAILABLE },
  { date: '2026-10-31', technique: 'potters_wheel', message: GENERIC_UNAVAILABLE },
];

function techniquesMatch(requested: string, blocked: string): boolean {
  const aliases = TECH_ALIASES[requested] || [requested];
  return aliases.includes(blocked) || requested === blocked;
}

/** Bloqueo activo para técnica+fecha, o null si no aplica. */
export function getTechniqueDateBlock(
  dateStr: string,
  technique: string
): TechniqueDateBlock | null {
  if (!dateStr || !technique) return null;
  for (const block of TECHNIQUE_DATE_BLOCKS) {
    if (block.date !== dateStr) continue;
    if (techniquesMatch(technique, block.technique)) return block;
  }
  return null;
}

export function isTechniqueBlockedOnDate(dateStr: string, technique: string): boolean {
  return getTechniqueDateBlock(dateStr, technique) !== null;
}
