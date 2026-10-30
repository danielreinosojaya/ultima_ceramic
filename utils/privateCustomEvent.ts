/** Eventos personalizados internos. Solo agenda admin: no cupos ni calendario público. */

export type PrivateCustomEventStatus = 'confirmed' | 'completed' | 'cancelled';
export type PrivateCustomPaymentStatus = 'pending' | 'partial' | 'paid';

export interface PrivateCustomPaymentEntry {
  id: string;
  amount: number;
  paidAt: string;
  method: string;
  note: string;
}

export interface PrivateCustomEventInput {
  title?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  participants?: number | string | null;
  contactName?: string;
  phone?: string;
  email?: string;
  agreedPrice?: number | string | null;
  amountPaid?: number | string | null;
  paymentMethod?: string;
  paymentNotes?: string;
  paymentEntries?: PrivateCustomPaymentEntry[] | null;
  status?: string;
  internalNotes?: string;
}

export interface NormalizedPrivateCustomEvent {
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  participants: number;
  contactName: string;
  phone: string;
  email: string;
  agreedPrice: number;
  amountPaid: number;
  paymentStatus: PrivateCustomPaymentStatus;
  paymentMethod: string;
  paymentNotes: string;
  paymentEntries: PrivateCustomPaymentEntry[];
  status: PrivateCustomEventStatus;
  internalNotes: string;
}

export interface PrivateCustomEvent extends NormalizedPrivateCustomEvent {
  id: string;
  balanceDue: number;
  createdAt: string;
  updatedAt: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const STATUSES: PrivateCustomEventStatus[] = ['confirmed', 'completed', 'cancelled'];

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

export function balanceDue(agreedPrice: number, amountPaid: number): number {
  return Math.max(0, Math.round((agreedPrice - amountPaid) * 100) / 100);
}

export function derivePaymentStatus(agreedPrice: number, amountPaid: number): PrivateCustomPaymentStatus {
  const paidCents = Math.round(amountPaid * 100);
  const agreedCents = Math.round(agreedPrice * 100);
  if (paidCents <= 0) return 'pending';
  if (agreedCents <= 0 || paidCents >= agreedCents) return 'paid';
  return 'partial';
}

export function sumPaymentEntries(entries: PrivateCustomPaymentEntry[]): number {
  return Math.round(entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0) * 100) / 100;
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

function parseParticipants(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : parseInt(String(value).trim(), 10);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.min(999, Math.floor(n));
}

export function normalizePaymentEntries(raw: unknown): PrivateCustomPaymentEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PrivateCustomPaymentEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const amount = roundMoney(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    out.push({
      id: clip(row.id, 64) || `pay-${out.length + 1}`,
      amount,
      paidAt: clip(row.paidAt, 40) || new Date().toISOString(),
      method: clip(row.method, 40),
      note: clip(row.note, 500),
    });
  }
  return out;
}

export function normalizePrivateCustomEventInput(
  raw: PrivateCustomEventInput
): { ok: true; value: NormalizedPrivateCustomEvent } | { ok: false; error: string } {
  const title = clip(raw.title, 255);
  if (!title) return { ok: false, error: 'Escribe el nombre del evento.' };

  const eventDate = clip(raw.eventDate, 10);
  if (!DATE_RE.test(eventDate)) return { ok: false, error: 'Elige una fecha válida.' };

  const startTime = clip(raw.startTime, 5);
  const endTime = clip(raw.endTime, 5);
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return { ok: false, error: 'Revisa la hora de inicio y la hora de fin.' };
  }
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    return { ok: false, error: 'La hora de fin tiene que ser después de la de inicio.' };
  }

  const participants = parseParticipants(raw.participants);
  if (!Number.isFinite(participants)) {
    return { ok: false, error: 'La cantidad de personas debe ser un número entero.' };
  }

  const agreedPrice = roundMoney(raw.agreedPrice);
  if (!Number.isFinite(agreedPrice)) {
    return { ok: false, error: 'Escribe el precio acordado solo con números.' };
  }
  if (agreedPrice < 0) return { ok: false, error: 'El precio no puede ser negativo.' };
  if (agreedPrice > 999999.99) return { ok: false, error: 'El monto es demasiado alto.' };

  const paymentEntries = normalizePaymentEntries(raw.paymentEntries);
  let amountPaid = paymentEntries.length > 0 ? sumPaymentEntries(paymentEntries) : roundMoney(raw.amountPaid);
  if (!Number.isFinite(amountPaid)) {
    return { ok: false, error: 'Escribe los montos solo con números.' };
  }
  if (amountPaid < 0) return { ok: false, error: 'Los montos no pueden ser negativos.' };
  if (amountPaid > 999999.99) return { ok: false, error: 'El monto es demasiado alto.' };

  const email = clip(raw.email, 255);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'El correo no parece válido. Puedes dejarlo vacío.' };
  }

  const requestedStatus = clip(raw.status, 20);
  const status: PrivateCustomEventStatus = STATUSES.includes(requestedStatus as PrivateCustomEventStatus)
    ? (requestedStatus as PrivateCustomEventStatus)
    : 'confirmed';

  return {
    ok: true,
    value: {
      title,
      eventDate,
      startTime,
      endTime,
      participants,
      contactName: clip(raw.contactName, 255),
      phone: clip(raw.phone, 50),
      email,
      agreedPrice,
      amountPaid,
      paymentStatus: derivePaymentStatus(agreedPrice, amountPaid),
      paymentMethod: clip(raw.paymentMethod, 40),
      paymentNotes: clip(raw.paymentNotes, 2000),
      paymentEntries,
      status,
      internalNotes: clip(raw.internalNotes, 2000),
    },
  };
}

export function normalizePaymentAmount(value: unknown): number {
  return roundMoney(value);
}

export const PRIVATE_EVENT_PAYMENT_LABEL = {
  pending: 'Pendiente',
  partial: 'Abono',
  paid: 'Pagado',
} as const;

export const PRIVATE_EVENT_STATUS_LABEL = {
  confirmed: 'Confirmado',
  completed: 'Realizado',
  cancelled: 'Cancelado',
} as const;
