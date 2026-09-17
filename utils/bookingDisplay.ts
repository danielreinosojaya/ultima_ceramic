import type { Booking, GroupTechnique } from '../types';

const TECHNIQUE_NAMES: Record<string, string> = {
  potters_wheel: 'Torno Alfarero',
  hand_modeling: 'Modelado a Mano',
  painting: 'Pintura de piezas',
  molding: 'Modelado a Mano',
};

const GENERIC_PRODUCT_NAMES = new Set([
  'clase suelta',
  'clase',
  'unknown',
  'unknown product',
  'experiencia grupal personalizada',
  'experiencia grupal',
  'clase grupal',
]);

const SPECIAL_EVENT_DISPLAY_NAMES: Record<string, string> = {
  rumcom: 'Spill the Tea x Rum-Com Club',
  'desobedecer-al-dolor': 'Desobedecer al Dolor',
  'huella-mascota': 'Una Huella que Queda para Siempre',
};

export const PAINTING_UPSELL_LABEL = 'Upsell - pieza ya hecha';

export function getTechniqueDisplayName(technique?: string | null): string | null {
  if (!technique) return null;
  return TECHNIQUE_NAMES[technique] || technique;
}

export function isGenericProductName(name?: string | null): boolean {
  if (!name) return true;
  const normalized = name.trim().toLowerCase();
  if (!normalized) return true;
  if (GENERIC_PRODUCT_NAMES.has(normalized)) return true;
  return normalized.startsWith('clase suelta');
}

export function isCreativeExperienceBooking(booking: Pick<Booking, 'product'> | any): boolean {
  const details = booking?.product?.details || {};
  return details.bookingSource === 'creative_experiences' || Boolean(details.serviceKind);
}

export function isPaintingUpsell(booking: Booking | any): boolean {
  const product = booking?.product as any;
  return (
    product?.kind === 'painting_upsell' ||
    (booking?.productType === 'CUSTOM_GROUP_EXPERIENCE' &&
      booking?.technique === 'painting' &&
      (booking?.productId === 'painting_service' || product?.id === 'painting_service'))
  );
}

export function getBookingParticipantCount(booking: Booking | any): number {
  if (booking?.productType === 'GROUP_CLASS') {
    const assignments =
      booking.groupClassMetadata?.techniqueAssignments ||
      booking.groupMetadata?.techniqueAssignments;
    if (assignments?.length) return assignments.length;
  }
  const candidates = [
    Number.parseInt(String(booking?.participants ?? ''), 10),
    Number.parseInt(String(booking?.product?.details?.participants ?? ''), 10),
    Number.parseInt(String(booking?.groupClassMetadata?.totalParticipants ?? ''), 10),
    Number.parseInt(String(booking?.groupMetadata?.totalParticipants ?? ''), 10),
  ].filter((n) => Number.isFinite(n) && n >= 1);
  if (candidates.length > 0) return Math.max(...candidates);
  return 1;
}

export function formatParticipantsLabel(count: number): string {
  const n = Math.max(1, count);
  return n === 1 ? '1 persona' : `${n} personas`;
}

export function formatMoneyAmount(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

/** Desglose " $25.00 × 3 personas " cuando hay más de una persona. */
export function formatPriceBreakdown(total: number, participants: number): string | null {
  const pax = Math.max(1, participants);
  if (pax < 2 || !Number.isFinite(total)) return null;
  const unit = Math.round((total / pax) * 100) / 100;
  return `$${formatMoneyAmount(unit)} × ${pax} personas`;
}

export function getBookingDurationLabel(booking: Booking | any): string {
  const details = booking?.product?.details || {};
  if (typeof details.duration === 'string' && details.duration.trim()) return details.duration.trim();
  if (typeof details.durationHours === 'number' && details.durationHours > 0) {
    return `${details.durationHours} h`;
  }
  return '2 horas';
}

export type BookingDisplayAudience = 'customer' | 'admin';

/**
 * Nombre que debe ver el cliente (y el admin en agenda): la actividad concreta,
 * nunca el tipo interno "Clase Suelta".
 */
export function getBookingDisplayName(
  booking: Booking | any,
  audience: BookingDisplayAudience = 'customer'
): string {
  const details = booking?.product?.details || {};
  const bookingSource = details.bookingSource as string | undefined;
  if (bookingSource && SPECIAL_EVENT_DISPLAY_NAMES[bookingSource]) {
    return SPECIAL_EVENT_DISPLAY_NAMES[bookingSource];
  }

  if (audience === 'admin' && isPaintingUpsell(booking)) {
    return PAINTING_UPSELL_LABEL;
  }

  if (booking?.productType === 'SPACE_RENTAL' || booking?.product?.isExclusiveSpaceRental) {
    const hours = booking?.product?.rentalHours || booking?.groupClassMetadata?.rentalHours;
    return hours ? `Alquiler privado (${hours}h)` : 'Alquiler de espacio';
  }

  const productName = typeof booking?.product?.name === 'string' ? booking.product.name.trim() : '';
  if (productName && !isGenericProductName(productName)) {
    return productName;
  }

  const assignments = booking?.groupClassMetadata?.techniqueAssignments;
  if (Array.isArray(assignments) && assignments.length > 0) {
    const unique = [...new Set(assignments.map((a: { technique: GroupTechnique }) => a.technique))];
    if (unique.length === 1) {
      return getTechniqueDisplayName(unique[0] as string) || 'Clase Grupal';
    }
    return 'Clase Grupal (mixto)';
  }

  const techniqueLabel = getTechniqueDisplayName(booking?.technique);
  if (techniqueLabel) return techniqueLabel;

  const detailsTechnique = getTechniqueDisplayName(details.technique || details.capacityTechnique);
  if (detailsTechnique) return detailsTechnique;

  if (productName) return productName;
  return 'Clase';
}
