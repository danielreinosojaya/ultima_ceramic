/** Agenda interna del mezzanine. No participa en cupos ni bloqueos del taller. */

export type MezzanineRentalStatus = 'hold' | 'confirmed' | 'completed' | 'cancelled';
export type MezzaninePaymentStatus = 'pending' | 'partial' | 'paid';

export interface MezzanineRentalInput {
  contactName?: string;
  phone?: string;
  email?: string;
  rentalDate?: string;
  startTime?: string;
  endTime?: string;
  purpose?: string;
  agreedPrice?: number | string | null;
  amountPaid?: number | string | null;
  paymentMethod?: string;
  paymentNotes?: string;
  status?: string;
  internalNotes?: string;
}

export interface NormalizedMezzanineRental {
  contactName: string;
  phone: string;
  email: string;
  rentalDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  agreedPrice: number;
  amountPaid: number;
  paymentStatus: MezzaninePaymentStatus;
  paymentMethod: string;
  paymentNotes: string;
  status: MezzanineRentalStatus;
  internalNotes: string;
}

export interface MezzanineRental extends NormalizedMezzanineRental {
  id: string;
  balanceDue: number;
  createdAt: string;
  updatedAt: string;
}

export interface MezzanineSlot {
  id: string;
  contactName: string;
  rentalDate: string;
  startTime: string;
  endTime: string;
  status: MezzanineRentalStatus | string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const STATUSES: MezzanineRentalStatus[] = ['hold', 'confirmed', 'completed', 'cancelled'];

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

/** true si las ventanas se pisan. Horarios que se tocan (13:00–13:00) no se pisan. */
export function windowsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = timeToMinutes(aStart);
  const ae = timeToMinutes(aEnd);
  const bs = timeToMinutes(bStart);
  const be = timeToMinutes(bEnd);
  if (![as, ae, bs, be].every(Number.isFinite)) return false;
  return as < be && bs < ae;
}

export function balanceDue(agreedPrice: number, amountPaid: number): number {
  return Math.max(0, Math.round((agreedPrice - amountPaid) * 100) / 100);
}

export function derivePaymentStatus(agreedPrice: number, amountPaid: number): MezzaninePaymentStatus {
  const paidCents = Math.round(amountPaid * 100);
  const agreedCents = Math.round(agreedPrice * 100);
  if (paidCents <= 0) return 'pending';
  if (agreedCents <= 0 || paidCents >= agreedCents) return 'paid';
  return 'partial';
}

function roundMoney(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const raw = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.').trim());
  if (!Number.isFinite(raw)) return NaN;
  return Math.round(raw * 100) / 100;
}

function clip(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

export function normalizeMezzanineInput(
  raw: MezzanineRentalInput
): { ok: true; value: NormalizedMezzanineRental } | { ok: false; error: string } {
  const contactName = clip(raw.contactName, 255);
  if (!contactName) return { ok: false, error: 'Escribe el nombre de quien alquila.' };

  const rentalDate = clip(raw.rentalDate, 10);
  if (!DATE_RE.test(rentalDate)) return { ok: false, error: 'Elige una fecha válida.' };

  const startTime = clip(raw.startTime, 5);
  const endTime = clip(raw.endTime, 5);
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return { ok: false, error: 'Revisa la hora de inicio y la hora de fin.' };
  }
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    return { ok: false, error: 'La hora de fin tiene que ser después de la de inicio.' };
  }

  const agreedPrice = roundMoney(raw.agreedPrice);
  const amountPaid = roundMoney(raw.amountPaid);
  if (!Number.isFinite(agreedPrice) || !Number.isFinite(amountPaid)) {
    return { ok: false, error: 'Escribe los montos solo con números.' };
  }
  if (agreedPrice < 0 || amountPaid < 0) {
    return { ok: false, error: 'Los montos no pueden ser negativos.' };
  }
  if (agreedPrice > 999999.99 || amountPaid > 999999.99) {
    return { ok: false, error: 'El monto es demasiado alto.' };
  }

  const email = clip(raw.email, 255);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'El correo no parece válido. Puedes dejarlo vacío.' };
  }

  const requestedStatus = clip(raw.status, 20);
  const status: MezzanineRentalStatus = STATUSES.includes(requestedStatus as MezzanineRentalStatus)
    ? (requestedStatus as MezzanineRentalStatus)
    : 'confirmed';

  return {
    ok: true,
    value: {
      contactName,
      phone: clip(raw.phone, 50),
      email,
      rentalDate,
      startTime,
      endTime,
      purpose: clip(raw.purpose, 500),
      agreedPrice,
      amountPaid,
      paymentStatus: derivePaymentStatus(agreedPrice, amountPaid),
      paymentMethod: clip(raw.paymentMethod, 40),
      paymentNotes: clip(raw.paymentNotes, 2000),
      status,
      internalNotes: clip(raw.internalNotes, 2000),
    },
  };
}

/** Solo compara contra otras reservas del mezzanine. Las canceladas no ocupan el espacio. */
export function findMezzanineOverlap<T extends MezzanineSlot>(
  existing: T[],
  candidate: { rentalDate: string; startTime: string; endTime: string; status?: string },
  ignoreId?: string
): T | null {
  if (candidate.status === 'cancelled') return null;
  return (
    existing.find(
      (row) =>
        row.id !== ignoreId &&
        row.status !== 'cancelled' &&
        row.rentalDate === candidate.rentalDate &&
        windowsOverlap(row.startTime, row.endTime, candidate.startTime, candidate.endTime)
    ) ?? null
  );
}

export function overlapMessage(conflict: MezzanineSlot): string {
  return `Ese horario del mezzanine ya está tomado por ${conflict.contactName} (${conflict.startTime}–${conflict.endTime}). Elige otro horario.`;
}
