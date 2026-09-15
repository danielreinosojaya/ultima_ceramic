import type { AvailableSlot, DayKey, ScheduleOverrides } from '../types';
import { getEcuadorDateYmd, isEcuadorSlotInPast } from './formatters';

const DAY_KEYS: DayKey[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseLocalYmd(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDaysYmd(startYmd: string, days: number): string {
  const d = parseLocalYmd(startYmd);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calendarTechniqueKey(technique: string): 'potters_wheel' | 'molding' | null {
  if (technique === 'potters_wheel') return 'potters_wheel';
  if (technique === 'hand_modeling') return 'molding';
  return null;
}

/** 1 persona en torno o modelado: solo horarios fijos (o slots abiertos por 3+). */
export function usesFixedIndividualSchedule(technique: string, participants: number): boolean {
  return participants === 1 && (technique === 'potters_wheel' || technique === 'hand_modeling');
}

export function getFixedTimesForDate(
  dateStr: string,
  technique: string,
  availability: Record<string, AvailableSlot[]> | null | undefined,
  scheduleOverrides: ScheduleOverrides = {}
): string[] {
  const techniqueKey = calendarTechniqueKey(technique);
  if (!techniqueKey) return [];

  const override = scheduleOverrides?.[dateStr];
  if (override?.slots === null) return [];

  const date = parseLocalYmd(dateStr);
  const dayKey = DAY_KEYS[date.getDay()];
  const baseSlots = override?.slots ?? availability?.[dayKey] ?? [];

  const aliases: Record<string, string[]> = {
    molding: ['molding', 'hand_modeling'],
    potters_wheel: ['potters_wheel'],
  };
  const valid = aliases[techniqueKey];

  const times = (baseSlots || [])
    .filter((slot) => {
      const st = slot.technique as string | undefined;
      if (!st) return true;
      return valid.includes(st);
    })
    .map((slot) => slot.time);

  if (techniqueKey === 'potters_wheel' && dayKey === 'Wednesday') {
    times.push('11:00');
  }

  return [...new Set(times)].sort();
}

export function enumerateFixedScheduleDays(
  technique: string,
  availability: Record<string, AvailableSlot[]> | null | undefined,
  scheduleOverrides: ScheduleOverrides = {},
  daysAhead = 90
): { date: string; times: string[] }[] {
  const start = getEcuadorDateYmd();
  const result: { date: string; times: string[] }[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const date = addDaysYmd(start, i);
    if (scheduleOverrides?.[date]?.disableRules) continue;
    const times = getFixedTimesForDate(date, technique, availability, scheduleOverrides).filter(
      (time) => !isEcuadorSlotInPast(date, time)
    );
    if (times.length > 0) result.push({ date, times });
  }

  return result;
}
