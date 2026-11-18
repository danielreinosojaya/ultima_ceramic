/**
 * Occupancy for public slot badges vs capacity.
 * - exactBooked: people whose class STARTS at this time (social badge)
 * - overlappingBooked: people whose 2h class overlaps this window (canBook)
 */

export function hasHalfOpenOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function summarizeSlotOccupancy(
  entries: Array<{ startMinutes: number; participants: number }>,
  slotStartMinutes: number,
  durationMinutes: number = 120
): { exactBooked: number; overlappingBooked: number } {
  const slotEnd = slotStartMinutes + durationMinutes;
  let exactBooked = 0;
  let overlappingBooked = 0;

  for (const entry of entries) {
    if (!Number.isFinite(entry.startMinutes) || entry.participants <= 0) continue;
    const end = entry.startMinutes + durationMinutes;
    if (hasHalfOpenOverlap(slotStartMinutes, slotEnd, entry.startMinutes, end)) {
      overlappingBooked += entry.participants;
    }
    if (entry.startMinutes === slotStartMinutes) {
      exactBooked += entry.participants;
    }
  }

  return { exactBooked, overlappingBooked };
}
