/** Totales de pago / gift card para una reserva (cliente o admin). */

export function sumPayments(payments: Array<{ amount?: number; method?: string }> | null | undefined): number {
  if (!Array.isArray(payments)) return 0;
  return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

export function sumGiftcardPayments(payments: Array<{ amount?: number; method?: string }> | null | undefined): number {
  if (!Array.isArray(payments)) return 0;
  return payments
    .filter((p) => String(p.method || '').toLowerCase() === 'giftcard')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

export function getBookingPaymentSplit(booking: {
  price?: number;
  paymentDetails?: Array<{ amount?: number; method?: string }>;
  giftcardRedeemedAmount?: number;
  isPaid?: boolean;
}): {
  price: number;
  paid: number;
  pending: number;
  giftcardApplied: number;
  isFullyPaid: boolean;
} {
  const price = Number(booking.price) || 0;
  const paid = sumPayments(booking.paymentDetails);
  const fromColumn = Number(booking.giftcardRedeemedAmount) || 0;
  const giftcardApplied = Math.max(fromColumn, sumGiftcardPayments(booking.paymentDetails));
  const pending = Math.max(0, price - paid);
  return {
    price,
    paid,
    pending,
    giftcardApplied,
    isFullyPaid: Boolean(booking.isPaid) || pending <= 0.009,
  };
}
