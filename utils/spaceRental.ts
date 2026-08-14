/**
 * Alquiler de espacio / evento privado exclusivo.
 * Bloquea TODO el taller (todas las técnicas) durante la ventana real de horas.
 */

import { normalizeSlotTimeHHMM } from './formatters.js';

export const DEFAULT_CLASS_DURATION_MINUTES = 120;

export type SpaceRentalHours = 2 | 3 | 4 | 5;

export type DayOccupancyKind = 'class' | 'rental' | 'course' | 'private_block' | 'proposed';

export interface DayOccupancyItem {
  id: string;
  label: string;
  subtitle?: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  kind: DayOccupancyKind;
  overlapsProposed?: boolean;
}

export function timeToMinutes(time: string): number {
  const normalized = normalizeSlotTimeHHMM(time);
  const [h, m] = normalized.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

export function minutesToHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addHoursToTime(startTime: string, hours: number): string {
  const start = timeToMinutes(startTime);
  if (Number.isNaN(start)) return startTime;
  return minutesToHHMM(start + Math.round(hours * 60));
}

export function windowsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** ¿Esta reserva ocupa el estudio en exclusivo (alquiler / celebración con espacio)? */
export function isExclusiveSpaceRentalBooking(booking: any): boolean {
  if (!booking) return false;
  const productType = booking.productType || booking.product_type;
  if (productType === 'SPACE_RENTAL') return true;

  const product = booking.product || {};
  if (product.type === 'SPACE_RENTAL' || product.isExclusiveSpaceRental === true) return true;

  const meta = booking.groupClassMetadata || booking.group_metadata || {};
  if (meta.isExclusiveSpaceRental === true) return true;

  const experienceType =
    product.experienceType || meta.experienceType || product?.config?.experienceType;
  if (experienceType === 'celebration') return true;

  return false;
}

/** Duración de ocupación en minutos (alquiler usa horas reales; resto 2h). */
export function getBookingOccupancyMinutes(booking: any): number {
  const product = booking?.product || {};
  const meta = booking?.groupClassMetadata || booking?.group_metadata || {};
  const config = product.config || meta.config || {};

  const hoursRaw =
    product.rentalHours ??
    config.hours ??
    meta.rentalHours ??
    null;

  const hours = Number(hoursRaw);
  if (Number.isFinite(hours) && hours > 0) {
    return Math.round(hours * 60);
  }
  return DEFAULT_CLASS_DURATION_MINUTES;
}

export function getBookingWindow(booking: any, slot: { date: string; time: string }) {
  const start = timeToMinutes(slot.time);
  const end = start + getBookingOccupancyMinutes(booking);
  return { start, end, date: slot.date };
}

function bookingDisplayLabel(booking: any): string {
  if (isExclusiveSpaceRentalBooking(booking)) {
    const hours =
      booking.product?.rentalHours ||
      booking.groupClassMetadata?.rentalHours ||
      booking.group_metadata?.rentalHours;
    return hours ? `Alquiler privado (${hours}h)` : 'Alquiler / celebración privada';
  }
  const productName = booking.product?.name;
  if (productName && productName !== 'Unknown Product') return productName;
  if (booking.technique === 'potters_wheel') return 'Torno Alfarero';
  if (booking.technique === 'hand_modeling' || booking.technique === 'molding') return 'Modelado a Mano';
  if (booking.technique === 'painting') return 'Pintura';
  const who = `${booking.userInfo?.firstName || ''} ${booking.userInfo?.lastName || ''}`.trim();
  return who || 'Reserva';
}

/** Agenda del día a partir de bookings (para overview admin). */
export function buildDayOccupancyFromBookings(
  dateStr: string,
  bookings: any[],
  proposed?: { startTime: string; hours: number } | null
): DayOccupancyItem[] {
  const items: DayOccupancyItem[] = [];
  const proposedStart = proposed?.startTime ? timeToMinutes(proposed.startTime) : NaN;
  const proposedEnd =
    proposed && !Number.isNaN(proposedStart)
      ? proposedStart + Math.round(proposed.hours * 60)
      : NaN;

  for (const booking of bookings) {
    if (!booking?.slots || !Array.isArray(booking.slots)) continue;
    const status = booking.status || 'active';
    if (status === 'expired') continue;

    for (const s of booking.slots) {
      if (s.date !== dateStr) continue;
      const startMinutes = timeToMinutes(s.time);
      if (Number.isNaN(startMinutes)) continue;
      const endMinutes = startMinutes + getBookingOccupancyMinutes(booking);
      const startTime = minutesToHHMM(startMinutes);
      const endTime = minutesToHHMM(endMinutes);
      const overlapsProposed =
        !Number.isNaN(proposedStart) &&
        windowsOverlap(proposedStart, proposedEnd, startMinutes, endMinutes);
      const who = `${booking.userInfo?.firstName || ''} ${booking.userInfo?.lastName || ''}`.trim();

      items.push({
        id: `${booking.id || booking.bookingCode || 'b'}-${startTime}`,
        label: bookingDisplayLabel(booking),
        subtitle: who || undefined,
        startTime,
        endTime,
        startMinutes,
        endMinutes,
        kind: isExclusiveSpaceRentalBooking(booking) ? 'rental' : 'class',
        overlapsProposed,
      });
    }
  }

  items.sort((a, b) => a.startMinutes - b.startMinutes);
  return items;
}

export function getConflictsForProposedWindow(
  items: DayOccupancyItem[],
  startTime: string,
  hours: number
): DayOccupancyItem[] {
  const start = timeToMinutes(startTime);
  if (Number.isNaN(start)) return [];
  const end = start + Math.round(hours * 60);
  return items.filter(
    (item) =>
      item.kind !== 'proposed' && windowsOverlap(start, end, item.startMinutes, item.endMinutes)
  );
}

/** true si [slotStart, slotStart+duration) solapa con un alquiler exclusivo del día. */
export function slotOverlapsExclusiveSpaceRental(
  dateStr: string,
  slotStartTime: string,
  bookings: any[],
  slotDurationMinutes = DEFAULT_CLASS_DURATION_MINUTES
): { overlaps: boolean; label?: string } {
  const slotStart = timeToMinutes(slotStartTime);
  if (Number.isNaN(slotStart)) return { overlaps: false };
  const slotEnd = slotStart + slotDurationMinutes;

  for (const booking of bookings) {
    if (!isExclusiveSpaceRentalBooking(booking)) continue;
    if (!booking.slots || !Array.isArray(booking.slots)) continue;

    for (const s of booking.slots) {
      if (s.date !== dateStr) continue;
      const blockStart = timeToMinutes(s.time);
      if (Number.isNaN(blockStart)) continue;
      const blockEnd = blockStart + getBookingOccupancyMinutes(booking);
      if (slotStart < blockEnd && slotEnd > blockStart) {
        const name =
          booking.product?.name ||
          booking.userInfo?.firstName ||
          'Alquiler de espacio';
        return { overlaps: true, label: name };
      }
    }
  }
  return { overlaps: false };
}

export function formatSpaceRentalLabel(hours: number, startTime: string): string {
  const end = addHoursToTime(startTime, hours);
  return `${startTime} – ${end} (${hours} h)`;
}
