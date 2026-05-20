import type { ExperienceTypeOverrides } from '../types';
import { normalizeSlotTimeHHMM } from './formatters.js';

const TECH_ALIASES: Record<string, string[]> = {
  hand_modeling: ['hand_modeling', 'molding'],
  molding: ['molding', 'hand_modeling'],
  potters_wheel: ['potters_wheel'],
  painting: ['painting'],
};

function normalizeTimeForCompare(time: string): string {
  return normalizeSlotTimeHHMM(time);
}

/** Lista blanca activa para técnica+fecha (solo si allowedTimes tiene al menos un horario). */
export function getTechniqueRestrictionForDate(
  overrides: ExperienceTypeOverrides | undefined | null,
  dateStr: string,
  technique: string
): { allowedTimes: string[]; reason?: string } | null {
  if (!overrides?.[dateStr]) return null;

  const keysToCheck = TECH_ALIASES[technique] || [technique];
  for (const techKey of keysToCheck) {
    const entry = overrides[dateStr][techKey];
    const raw = entry?.allowedTimes;
    if (!raw || raw.length === 0) continue;

    return {
      allowedTimes: raw.map(normalizeTimeForCompare),
      reason: entry.reason,
    };
  }
  return null;
}

/** true si hay restricción activa y el horario NO está en la lista blanca. */
export function isSlotBlockedByExperienceTypeOverride(
  overrides: ExperienceTypeOverrides | undefined | null,
  dateStr: string,
  technique: string,
  time: string
): boolean {
  const restriction = getTechniqueRestrictionForDate(overrides, dateStr, technique);
  if (!restriction) return false;
  return !restriction.allowedTimes.includes(normalizeTimeForCompare(time));
}

/** Entradas inválidas: allowedTimes vacío bloqueaba todo el día por error. */
export function findInvalidExperienceTypeOverrideEntries(
  overrides: ExperienceTypeOverrides | undefined | null
): Array<{ date: string; technique: string; issue: string }> {
  const issues: Array<{ date: string; technique: string; issue: string }> = [];
  if (!overrides) return issues;

  for (const [date, techniques] of Object.entries(overrides)) {
    if (!techniques || typeof techniques !== 'object') continue;
    for (const [technique, entry] of Object.entries(techniques)) {
      if (!entry?.allowedTimes) continue;
      if (entry.allowedTimes.length === 0) {
        issues.push({
          date,
          technique,
          issue: 'allowedTimes vacío (antes bloqueaba todos los horarios; debe eliminarse)',
        });
      }
    }
  }
  return issues;
}

/** Quita entradas con allowedTimes vacío o ausente. */
export function sanitizeExperienceTypeOverrides(
  overrides: ExperienceTypeOverrides
): ExperienceTypeOverrides {
  const cleaned: ExperienceTypeOverrides = {};

  for (const [date, techniques] of Object.entries(overrides)) {
    if (!techniques || typeof techniques !== 'object') continue;
    const day: ExperienceTypeOverrides[string] = {};

    for (const [technique, entry] of Object.entries(techniques)) {
      if (entry?.allowedTimes && entry.allowedTimes.length > 0) {
        day[technique] = {
          allowedTimes: [...entry.allowedTimes].sort(),
          ...(entry.reason ? { reason: entry.reason } : {}),
        };
      }
    }

    if (Object.keys(day).length > 0) {
      cleaned[date] = day;
    }
  }

  return cleaned;
}
