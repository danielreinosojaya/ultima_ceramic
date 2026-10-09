import type { Booking, PaymentDetails, ProductType } from '../../types.js';

/**
 * Reglas del tablero (horario del estudio: America/Guayaquil).
 *
 * Vendido  = precio de reservas creadas en el periodo, salvo expiradas.
 * Cobrado  = pagos cuya fecha cae en el periodo.
 *            Si la reserva está pagada y no tiene pagos guardados, se toma el precio
 *            en la fecha de creación para no perder ese monto.
 * Por cobrar = precio − pagos, solo de reservas del periodo que siguen impagas.
 *
 * Un pago entra una sola vez, por su fecha. No se suma el monto de gift card encima del pago.
 */

export const STUDIO_TZ = 'America/Guayaquil';

export type PeriodKey = 'today' | 'week' | 'month' | 'lastMonth' | 'custom';

export type SaleCategory =
  | 'clase'
  | 'paquete'
  | 'intro'
  | 'grupal'
  | 'parejas'
  | 'experiencia'
  | 'open_studio'
  | 'pintura'
  | 'alquiler'
  | 'curso'
  | 'otro';

export const CATEGORY_ORDER: SaleCategory[] = [
  'clase',
  'paquete',
  'intro',
  'parejas',
  'grupal',
  'experiencia',
  'open_studio',
  'pintura',
  'alquiler',
  'curso',
  'otro',
];

export const CATEGORY_LABEL: Record<SaleCategory, string> = {
  clase: 'Clase suelta',
  paquete: 'Paquete',
  intro: 'Introductoria',
  grupal: 'Grupal',
  parejas: 'Parejas',
  experiencia: 'Experiencia',
  open_studio: 'Open Studio',
  pintura: 'Pintura',
  alquiler: 'Alquiler',
  curso: 'Curso',
  otro: 'Otros',
};

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const GENERIC_PRODUCT_NAMES = new Set([
  '',
  'unknown',
  'unknown product',
  'experiencia grupal personalizada',
  'clase',
]);

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
  shortLabel: string;
}

export interface PeriodWindow {
  ready: boolean;
  current: DateRange;
  previous: DateRange;
}

export interface Movement {
  key: string;
  booking: Booking;
  payment: PaymentDetails | null;
  paymentIndex: number;
  date: Date;
  dayKey: string;
  amount: number;
  methodLabel: string;
  synthetic: boolean;
  dateAssumed: boolean;
  productName: string;
  category: SaleCategory;
}

export interface DayBucket {
  key: string;
  label: string;
  amount: number;
  startKey: string;
  endKey: string;
}

export interface CategoryTotal {
  category: SaleCategory;
  label: string;
  sold: number;
  collected: number;
  count: number;
}

export interface ProductTotal {
  name: string;
  category: SaleCategory;
  sold: number;
  count: number;
}

export interface MethodTotal {
  label: string;
  amount: number;
}

export interface FinanceSnapshot {
  sold: number;
  collected: number;
  pendingOfPeriod: number;
  bookingCount: number;
  averageTicket: number;
  paidOnPeriodSales: number;
  collectedFromPeriodSales: number;
  collectedFromEarlier: number;
  collectedFromLater: number;
  paidOutsidePeriod: number;
  categories: CategoryTotal[];
  topProducts: ProductTotal[];
  methods: MethodTotal[];
  days: DayBucket[];
  movements: Movement[];
}

export interface OpenBookingRow {
  booking: Booking;
  pending: number;
  paid: number;
  price: number;
  productName: string;
  category: SaleCategory;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function formatMoney(value: number): string {
  const n = roundMoney(value);
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-$${abs}` : `$${abs}`;
}

export function guayaquilYmd(date: Date): { y: number; m: number; d: number } {
  const key = new Intl.DateTimeFormat('en-CA', {
    timeZone: STUDIO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

export function dayKeyFromParts(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function dayKey(date: Date): string {
  const { y, m, d } = guayaquilYmd(date);
  return dayKeyFromParts(y, m, d);
}

function weekday(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addCalendarDays(y: number, m: number, d: number, days: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1 };
}

export function rangeFromParts(start: { y: number; m: number; d: number }, end: { y: number; m: number; d: number }): { start: Date; end: Date } {
  return {
    start: new Date(`${dayKeyFromParts(start.y, start.m, start.d)}T00:00:00.000-05:00`),
    end: new Date(`${dayKeyFromParts(end.y, end.m, end.d)}T23:59:59.999-05:00`),
  };
}

function formatPartsLabel(start: { y: number; m: number; d: number }, end: { y: number; m: number; d: number }, style: 'long' | 'short'): string {
  const months = style === 'long' ? MONTHS_LONG : MONTHS_SHORT;
  const sameDay = start.y === end.y && start.m === end.m && start.d === end.d;
  if (sameDay) {
    return style === 'long' ? `${start.d} de ${months[start.m - 1]}` : `${start.d} ${months[start.m - 1]}`;
  }
  if (start.y === end.y && start.m === end.m) {
    return style === 'long'
      ? `${start.d}–${end.d} de ${months[start.m - 1]}`
      : `${start.d}–${end.d} ${months[start.m - 1]}`;
  }
  if (style === 'long') {
    return `${start.d} de ${months[start.m - 1]} – ${end.d} de ${months[end.m - 1]}`;
  }
  return `${start.d} ${months[start.m - 1]} – ${end.d} ${months[end.m - 1]}`;
}

function makeRange(start: { y: number; m: number; d: number }, end: { y: number; m: number; d: number }): DateRange {
  const bounds = rangeFromParts(start, end);
  return {
    ...bounds,
    label: formatPartsLabel(start, end, 'long'),
    shortLabel: formatPartsLabel(start, end, 'short'),
  };
}

function emptyRange(): DateRange {
  const instant = new Date('1970-01-01T00:00:00.000-05:00');
  return { start: instant, end: instant, label: 'elige las fechas', shortLabel: 'fechas' };
}

export function getPeriodWindow(period: PeriodKey, custom: { start: string; end: string }, now: Date = new Date()): PeriodWindow {
  const today = guayaquilYmd(now);

  if (period === 'custom') {
    if (!custom.start || !custom.end) {
      return { ready: false, current: emptyRange(), previous: emptyRange() };
    }
    const [sy, sm, sd] = custom.start.split('-').map(Number);
    const [ey, em, ed] = custom.end.split('-').map(Number);
    if (!sy || !sm || !sd || !ey || !em || !ed) {
      return { ready: false, current: emptyRange(), previous: emptyRange() };
    }
    let start = { y: sy, m: sm, d: sd };
    let end = { y: ey, m: em, d: ed };
    if (rangeFromParts(start, start).start.getTime() > rangeFromParts(end, end).start.getTime()) {
      const swap = start;
      start = end;
      end = swap;
    }
    const span = Math.round((rangeFromParts(end, end).start.getTime() - rangeFromParts(start, start).start.getTime()) / 86400000);
    const prevEnd = addCalendarDays(start.y, start.m, start.d, -1);
    const prevStart = addCalendarDays(prevEnd.y, prevEnd.m, prevEnd.d, -span);
    return { ready: true, current: makeRange(start, end), previous: makeRange(prevStart, prevEnd) };
  }

  if (period === 'today') {
    const prev = addCalendarDays(today.y, today.m, today.d, -1);
    return { ready: true, current: makeRange(today, today), previous: makeRange(prev, prev) };
  }

  if (period === 'week') {
    const offset = weekday(today.y, today.m, today.d);
    const mondayOffset = offset === 0 ? 6 : offset - 1;
    const start = addCalendarDays(today.y, today.m, today.d, -mondayOffset);
    const prevEnd = addCalendarDays(today.y, today.m, today.d, -7);
    const prevStart = addCalendarDays(start.y, start.m, start.d, -7);
    return { ready: true, current: makeRange(start, today), previous: makeRange(prevStart, prevEnd) };
  }

  if (period === 'lastMonth') {
    const prev = shiftMonth(today.y, today.m, -1);
    const before = shiftMonth(today.y, today.m, -2);
    const start = { y: prev.y, m: prev.m, d: 1 };
    const end = { y: prev.y, m: prev.m, d: lastDayOfMonth(prev.y, prev.m) };
    const prevStart = { y: before.y, m: before.m, d: 1 };
    const prevEnd = { y: before.y, m: before.m, d: lastDayOfMonth(before.y, before.m) };
    return { ready: true, current: makeRange(start, end), previous: makeRange(prevStart, prevEnd) };
  }

  const start = { y: today.y, m: today.m, d: 1 };
  const previousMonth = shiftMonth(today.y, today.m, -1);
  const prevDay = Math.min(today.d, lastDayOfMonth(previousMonth.y, previousMonth.m));
  const prevStart = { y: previousMonth.y, m: previousMonth.m, d: 1 };
  const prevEnd = { y: previousMonth.y, m: previousMonth.m, d: prevDay };
  return { ready: true, current: makeRange(start, today), previous: makeRange(prevStart, prevEnd) };
}

export function asDate(value: Date | string | undefined | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function inRange(date: Date, range: { start: Date; end: Date }): boolean {
  const time = date.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export function isCountableBooking(booking: Booking): boolean {
  return booking.status !== 'expired';
}

export function bookingPrice(booking: Booking): number {
  const raw = booking.price as unknown;
  if (typeof raw === 'number' && Number.isFinite(raw)) return roundMoney(raw);
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) return roundMoney(parsed);
  }
  const product = booking.product as { price?: number; pricePerPerson?: number } | undefined;
  const perPerson = Number(product?.pricePerPerson);
  if (Number.isFinite(perPerson) && perPerson > 0) {
    const people = booking.participants && booking.participants > 0 ? booking.participants : 1;
    return roundMoney(perPerson * people);
  }
  const productPrice = Number(product?.price);
  if (Number.isFinite(productPrice) && productPrice > 0) return roundMoney(productPrice);
  return 0;
}

export function paymentAmount(payment: PaymentDetails): number {
  const raw = payment?.amount as unknown;
  const amount = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  return Number.isFinite(amount) ? roundMoney(amount) : 0;
}

export function sumPayments(booking: Booking): number {
  return roundMoney((booking.paymentDetails || []).reduce((sum, payment) => sum + paymentAmount(payment), 0));
}

export function isPaintingUpsell(booking: Booking): boolean {
  const product = booking.product as { kind?: string } | undefined;
  return product?.kind === 'painting_upsell'
    || (booking.productType === 'CUSTOM_GROUP_EXPERIENCE'
      && booking.technique === 'painting'
      && booking.productId === 'painting_service');
}

const TECHNIQUE_NAMES: Record<string, string> = {
  potters_wheel: 'Torno',
  hand_modeling: 'Modelado a mano',
  painting: 'Pintura',
  molding: 'Moldeado',
};

function techniqueName(technique?: string | null): string | null {
  if (!technique) return null;
  return TECHNIQUE_NAMES[technique] || null;
}

function productTypeOf(booking: Booking): ProductType | string | undefined {
  return booking.productType || booking.product?.type;
}

export function saleCategory(booking: Booking): SaleCategory {
  if (isPaintingUpsell(booking)) return 'pintura';
  switch (productTypeOf(booking)) {
    case 'SINGLE_CLASS':
      return 'clase';
    case 'CLASS_PACKAGE':
      return 'paquete';
    case 'INTRODUCTORY_CLASS':
      return 'intro';
    case 'GROUP_CLASS':
    case 'GROUP_EXPERIENCE':
    case 'CUSTOM_GROUP_EXPERIENCE':
      return 'grupal';
    case 'COUPLES_EXPERIENCE':
      return 'parejas';
    case 'CUSTOM_EXPERIENCE':
      return 'experiencia';
    case 'OPEN_STUDIO_SUBSCRIPTION':
      return 'open_studio';
    case 'SPACE_RENTAL':
      return 'alquiler';
    case 'WHEEL_COURSE':
      return 'curso';
    default:
      return 'otro';
  }
}

function usableProductName(booking: Booking): string | null {
  const name = booking.product?.name?.trim();
  if (!name || GENERIC_PRODUCT_NAMES.has(name.toLowerCase())) return null;
  return name;
}

export function saleName(booking: Booking): string {
  if (isPaintingUpsell(booking)) return 'Pintura de pieza';

  const assignments = booking.groupClassMetadata?.techniqueAssignments;
  if (assignments && assignments.length > 0) {
    const unique = [...new Set(assignments.map((item) => item.technique))];
    if (unique.length === 1) return techniqueName(unique[0]) || 'Grupal';
    return 'Grupal mixto';
  }

  const type = productTypeOf(booking);
  const genericGroup = type === 'CUSTOM_GROUP_EXPERIENCE' || booking.product?.name === 'Experiencia Grupal Personalizada';
  if (genericGroup && booking.technique) {
    return techniqueName(booking.technique) || CATEGORY_LABEL.grupal;
  }

  const productName = usableProductName(booking);
  if (productName) return productName;

  const fromTechnique = techniqueName(booking.technique);
  if (fromTechnique) return fromTechnique;

  return CATEGORY_LABEL[saleCategory(booking)];
}

export function methodLabel(method?: string | null): string {
  const value = (method || '').trim().toLowerCase();
  if (value === 'cash' || value === 'efectivo') return 'Efectivo';
  if (value === 'card' || value === 'tarjeta' || value === 'credit' || value === 'debit') return 'Tarjeta';
  if (value === 'transfer' || value === 'transferencia' || value === 'bank') return 'Transferencia';
  if (value === 'giftcard' || value === 'gift card' || value === 'gift-card') return 'Gift card';
  if (value === 'manual') return 'Manual';
  if (value === 'registrado') return 'Sin detalle';
  return method?.trim() || 'Otro';
}

export function clientName(booking: Booking): string {
  const first = booking.userInfo?.firstName?.trim() || '';
  const last = booking.userInfo?.lastName?.trim() || '';
  return `${first} ${last}`.trim() || 'Sin nombre';
}

function eachDay(range: { start: Date; end: Date }): string[] {
  const start = guayaquilYmd(range.start);
  const endKey = dayKey(range.end);
  const keys: string[] = [];
  let cursor = start;
  for (let guard = 0; guard < 800; guard += 1) {
    const key = dayKeyFromParts(cursor.y, cursor.m, cursor.d);
    keys.push(key);
    if (key >= endKey) break;
    cursor = addCalendarDays(cursor.y, cursor.m, cursor.d, 1);
  }
  return keys;
}

function shortDayLabel(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

function buildDayBuckets(range: { start: Date; end: Date }, amountByDay: Map<string, number>): DayBucket[] {
  const keys = eachDay(range);
  if (keys.length <= 42) {
    return keys.map((key) => ({
      key,
      label: shortDayLabel(key),
      amount: roundMoney(amountByDay.get(key) || 0),
      startKey: key,
      endKey: key,
    }));
  }

  const buckets: DayBucket[] = [];
  let index = 0;
  while (index < keys.length) {
    const slice = keys.slice(index, index + 7);
    const amount = slice.reduce((sum, key) => sum + (amountByDay.get(key) || 0), 0);
    buckets.push({
      key: `week:${slice[0]}`,
      label: slice.length === 1 ? shortDayLabel(slice[0]) : `${shortDayLabel(slice[0])} – ${shortDayLabel(slice[slice.length - 1])}`,
      amount: roundMoney(amount),
      startKey: slice[0],
      endKey: slice[slice.length - 1],
    });
    index += 7;
  }
  return buckets;
}

function matchesCategory(booking: Booking, category: SaleCategory | 'all'): boolean {
  return category === 'all' || saleCategory(booking) === category;
}

export function movementsFor(booking: Booking, range: { start: Date; end: Date }): Movement[] {
  const category = saleCategory(booking);
  const productName = saleName(booking);
  const createdAt = asDate(booking.createdAt);
  const rows: Movement[] = [];
  const payments = booking.paymentDetails || [];

  payments.forEach((payment, paymentIndex) => {
    const amount = paymentAmount(payment);
    if (amount <= 0) return;
    const explicit = asDate(payment.receivedAt);
    const date = explicit || createdAt;
    if (!date || !inRange(date, range)) return;
    rows.push({
      key: `${booking.id}:${payment.id || paymentIndex}`,
      booking,
      payment,
      paymentIndex,
      date,
      dayKey: dayKey(date),
      amount,
      methodLabel: methodLabel(payment.method),
      synthetic: false,
      dateAssumed: !explicit,
      productName,
      category,
    });
  });

  if (rows.length === 0 && booking.isPaid && payments.length === 0 && bookingPrice(booking) > 0 && createdAt && inRange(createdAt, range)) {
    rows.push({
      key: `${booking.id}:synthetic`,
      booking,
      payment: null,
      paymentIndex: -1,
      date: createdAt,
      dayKey: dayKey(createdAt),
      amount: bookingPrice(booking),
      methodLabel: 'Sin detalle',
      synthetic: true,
      dateAssumed: true,
      productName,
      category,
    });
  }

  return rows;
}

function addCategory(map: Map<SaleCategory, CategoryTotal>, category: SaleCategory): CategoryTotal {
  let row = map.get(category);
  if (!row) {
    row = { category, label: CATEGORY_LABEL[category], sold: 0, collected: 0, count: 0 };
    map.set(category, row);
  }
  return row;
}

export function buildSnapshot(bookings: Booking[], range: { start: Date; end: Date }, category: SaleCategory | 'all' = 'all'): FinanceSnapshot {
  const categories = new Map<SaleCategory, CategoryTotal>();
  const products = new Map<string, ProductTotal>();
  const methods = new Map<string, number>();
  const amountByDay = new Map<string, number>();
  const movements: Movement[] = [];

  let sold = 0;
  let bookingCount = 0;
  let pendingOfPeriod = 0;
  let paidOnPeriodSales = 0;
  let collectedFromPeriodSales = 0;
  let collectedFromEarlier = 0;
  let collectedFromLater = 0;

  const periodBookingIds = new Set<string>();

  bookings.forEach((booking) => {
    if (!isCountableBooking(booking) || !matchesCategory(booking, category)) return;
    const createdAt = asDate(booking.createdAt);
    const price = bookingPrice(booking);
    const cat = saleCategory(booking);
    const name = saleName(booking);

    if (createdAt && inRange(createdAt, range)) {
      periodBookingIds.add(booking.id);
      sold = roundMoney(sold + price);
      bookingCount += 1;
      const pending = booking.isPaid ? 0 : Math.max(0, roundMoney(price - sumPayments(booking)));
      pendingOfPeriod = roundMoney(pendingOfPeriod + pending);
      const paid = booking.isPaid && sumPayments(booking) <= 0 ? price : sumPayments(booking);
      paidOnPeriodSales = roundMoney(paidOnPeriodSales + paid);

      const categoryRow = addCategory(categories, cat);
      categoryRow.sold = roundMoney(categoryRow.sold + price);
      categoryRow.count += 1;

      const product = products.get(name) || { name, category: cat, sold: 0, count: 0 };
      product.sold = roundMoney(product.sold + price);
      product.count += 1;
      products.set(name, product);
    }

    movementsFor(booking, range).forEach((movement) => {
      movements.push(movement);
      const categoryRow = addCategory(categories, movement.category);
      categoryRow.collected = roundMoney(categoryRow.collected + movement.amount);
      methods.set(movement.methodLabel, roundMoney((methods.get(movement.methodLabel) || 0) + movement.amount));
      amountByDay.set(movement.dayKey, roundMoney((amountByDay.get(movement.dayKey) || 0) + movement.amount));
      if (periodBookingIds.has(booking.id) || (createdAt && inRange(createdAt, range))) {
        collectedFromPeriodSales = roundMoney(collectedFromPeriodSales + movement.amount);
      } else if (createdAt && createdAt.getTime() < range.start.getTime()) {
        collectedFromEarlier = roundMoney(collectedFromEarlier + movement.amount);
      } else if (createdAt && createdAt.getTime() > range.end.getTime()) {
        collectedFromLater = roundMoney(collectedFromLater + movement.amount);
      }
    });
  });

  movements.sort((a, b) => b.date.getTime() - a.date.getTime());

  const collected = roundMoney(movements.reduce((sum, movement) => sum + movement.amount, 0));
  const categoryRows = CATEGORY_ORDER
    .map((key) => categories.get(key))
    .filter((row): row is CategoryTotal => !!row && (row.sold > 0 || row.collected > 0));

  const topProducts = [...products.values()].sort((a, b) => b.sold - a.sold || b.count - a.count).slice(0, 6);
  const methodRows = [...methods.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    sold,
    collected,
    pendingOfPeriod,
    bookingCount,
    averageTicket: bookingCount > 0 ? roundMoney(sold / bookingCount) : 0,
    paidOnPeriodSales,
    collectedFromPeriodSales,
    collectedFromEarlier,
    collectedFromLater,
    paidOutsidePeriod: Math.max(0, roundMoney(paidOnPeriodSales - collectedFromPeriodSales)),
    categories: categoryRows,
    topProducts,
    methods: methodRows,
    days: buildDayBuckets(range, amountByDay),
    movements,
  };
}

export function openBalances(bookings: Booking[]): OpenBookingRow[] {
  return bookings
    .filter((booking) => isCountableBooking(booking) && !booking.isPaid)
    .map((booking) => {
      const price = bookingPrice(booking);
      const paid = sumPayments(booking);
      const pending = Math.max(0, roundMoney(price - paid));
      return {
        booking,
        pending,
        paid,
        price,
        productName: saleName(booking),
        category: saleCategory(booking),
      };
    })
    .filter((row) => row.pending > 0.009);
}

export function filterMovements(movements: Movement[], options: { query: string; day: DayBucket | null; product: string | null }): Movement[] {
  const query = options.query.trim().toLowerCase();
  return movements.filter((movement) => {
    if (options.product && movement.productName !== options.product) return false;
    if (options.day && (movement.dayKey < options.day.startKey || movement.dayKey > options.day.endKey)) return false;
    if (!query) return true;
    const booking = movement.booking;
    const haystack = [
      clientName(booking),
      booking.userInfo?.email,
      booking.bookingCode,
      movement.productName,
      movement.methodLabel,
      CATEGORY_LABEL[movement.category],
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

export function formatStudioDate(date: Date): string {
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: STUDIO_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDelta(current: number, previous: number, previousLabel: string): { text: string; tone: 'up' | 'down' | 'flat' } {
  if (previous <= 0 && current <= 0) {
    return { text: `${previousLabel} · ${formatMoney(0)}`, tone: 'flat' };
  }
  if (previous <= 0) {
    return { text: `${previousLabel} no tuvo movimiento`, tone: 'flat' };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct > 0 ? '+' : '';
  const change = pct === 0 ? 'igual' : `${sign}${pct}%`;
  return { text: `${change} · ${previousLabel} fue ${formatMoney(previous)}`, tone: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

export function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}
