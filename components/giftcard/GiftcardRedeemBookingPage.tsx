import React, { useEffect, useState } from 'react';
import { applyGiftcardToBooking, getBookingByCode, validateGiftcard } from '../../services/dataService';
import type { BookingPublicInfo } from '../../services/dataService';
import { GiftcardApplyToBooking } from './GiftcardApplyToBooking';
import { formatPrice } from '../../utils/formatters';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface GiftcardRedeemBookingPageProps {
  bookingCode?: string | null;
  prefillGiftcardCode?: string | null;
  onDone: () => void;
}

export const GiftcardRedeemBookingPage: React.FC<GiftcardRedeemBookingPageProps> = ({
  bookingCode: initialBookingCode,
  prefillGiftcardCode,
  onDone,
}) => {
  const [bookingInput, setBookingInput] = useState((initialBookingCode || '').toUpperCase());
  const [gcInput, setGcInput] = useState((prefillGiftcardCode || '').toUpperCase());
  const [booking, setBooking] = useState<BookingPublicInfo | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'not_found'>('idle');
  const [gcPreview, setGcPreview] = useState<{ balance: number; code: string } | null>(null);
  const [gcError, setGcError] = useState<string | null>(null);
  const [resultBanner, setResultBanner] = useState<string | null>(null);

  const loadBooking = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setStatus('loading');
    const res = await getBookingByCode(trimmed);
    if (!res.success || !res.booking) {
      setBooking(null);
      setStatus('not_found');
      return;
    }
    setBooking(res.booking);
    setStatus('ready');
  };

  useEffect(() => {
    if (initialBookingCode) {
      loadBooking(initialBookingCode);
    }
  }, [initialBookingCode]);

  useEffect(() => {
    const preview = async () => {
      if (!prefillGiftcardCode) return;
      try {
        const res = await validateGiftcard(prefillGiftcardCode.trim());
        if (typeof res?.balance === 'number') {
          setGcPreview({ balance: Number(res.balance), code: res.code || prefillGiftcardCode });
        }
      } catch {
        /* ignore */
      }
    };
    preview();
  }, [prefillGiftcardCode]);

  const pending = booking
    ? Math.max(0, (booking.pendingBalance ?? booking.price - (booking.paidAmount || 0)))
    : 0;
  const isPaid = Boolean(booking?.isPaid) || pending <= 0.009;

  return (
    <div className="min-h-screen bg-brand-background py-12 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-violet-700 px-6 py-5 text-white">
          <h1 className="text-xl font-bold">Redimir gift card</h1>
          <p className="text-sm text-white/80 mt-0.5">Pago virtual · CeramicAlma</p>
        </div>
        <div className="p-6 space-y-5">
          {gcPreview && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm">
              Gift card <span className="font-mono font-bold">{gcPreview.code}</span> · saldo{' '}
              <strong>{formatPrice(gcPreview.balance)}</strong>
            </div>
          )}

          {!initialBookingCode && (
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-1">Código de tu reserva</label>
              <div className="flex gap-2">
                <input
                  value={bookingInput}
                  onChange={(e) => setBookingInput(e.target.value.toUpperCase())}
                  placeholder="C-ALMA-XXXXXXX"
                  className="flex-1 px-3 py-2 border rounded-lg font-mono uppercase text-sm"
                />
                <button
                  type="button"
                  onClick={() => loadBooking(bookingInput)}
                  className="px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg"
                >
                  Buscar
                </button>
              </div>
            </div>
          )}

          {status === 'loading' && <p className="text-brand-secondary text-center py-6">Buscando tu reserva…</p>}
          {status === 'not_found' && (
            <p className="text-red-700 text-sm">No encontramos esa reserva. Revisa el código del correo.</p>
          )}

          {booking && status === 'ready' && (
            <>
              <div className="bg-brand-background rounded-lg p-4 text-sm space-y-1">
                <p className="text-xs text-brand-secondary uppercase font-semibold">Reserva</p>
                <p className="font-mono font-bold text-brand-primary text-lg">{booking.bookingCode}</p>
                <p className="font-semibold text-brand-text">{booking.productName}</p>
                {booking.firstName && <p className="text-brand-secondary">Hola, {booking.firstName}</p>}
                <div className="pt-2 border-t border-brand-border mt-2 space-y-0.5">
                  <p>Total: <strong>{formatPrice(booking.price)}</strong></p>
                  <p>Pagado / gift card: <strong>{formatPrice(booking.paidAmount || booking.giftcardRedeemedAmount || 0)}</strong></p>
                  <p>
                    {isPaid ? (
                      <span className="text-green-700 font-bold">Pagada</span>
                    ) : (
                      <>
                        Faltante: <strong className="text-amber-800">{formatPrice(pending)}</strong>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {resultBanner && (
                <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-sm text-green-900">{resultBanner}</div>
              )}

              {isPaid ? (
                <div className="text-center py-4">
                  <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="font-bold text-brand-text">Esta reserva ya está pagada.</p>
                </div>
              ) : booking.status === 'expired' ? (
                <p className="text-sm text-red-700">
                  Esta pre-reserva expiró. Contáctanos por WhatsApp para reactivar el cupo y aplicar tu gift card.
                </p>
              ) : (
                <GiftcardApplyToBooking
                  bookingCode={booking.bookingCode}
                  pendingAmount={pending}
                  onApplied={(result) => {
                    setBooking((prev) =>
                      prev
                        ? {
                            ...prev,
                            isPaid: result.isPaid,
                            paidAmount: (prev.paidAmount || 0) + result.appliedAmount,
                            pendingBalance: result.pendingBalance,
                            giftcardRedeemedAmount: (prev.giftcardRedeemedAmount || 0) + result.appliedAmount,
                            status: result.isPaid ? 'confirmed' : prev.status,
                          }
                        : prev
                    );
                    const parts = [`Se aplicaron ${formatPrice(result.appliedAmount)}.`];
                    if (result.isPaid) parts.push('Reserva confirmada.');
                    else parts.push(`Faltante: ${formatPrice(result.pendingBalance)}.`);
                    if (result.giftcardRemaining > 0.009) {
                      parts.push(`Sobrante en la gift card: ${formatPrice(result.giftcardRemaining)}.`);
                    }
                    setResultBanner(parts.join(' '));
                  }}
                />
              )}
            </>
          )}

          {prefillGiftcardCode && !booking && status !== 'loading' && (
            <div className="space-y-2">
              <p className="text-sm text-brand-secondary">
                Si ya tienes una pre-reserva, ingresa su código arriba para aplicar esta gift card.
              </p>
              <div className="flex gap-2">
                <input
                  value={gcInput}
                  onChange={(e) => setGcInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 border rounded-lg font-mono text-sm"
                  placeholder="Código gift card"
                />
                <button
                  type="button"
                  disabled={!booking}
                  onClick={async () => {
                    if (!booking) return;
                    const res = await applyGiftcardToBooking({
                      bookingCode: booking.bookingCode,
                      giftcardCode: gcInput,
                    });
                    if (!res.success) setGcError(res.error || 'No se pudo aplicar');
                  }}
                  className="px-3 py-2 bg-violet-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
                >
                  Aplicar
                </button>
              </div>
              {gcError && <p className="text-sm text-red-600">{gcError}</p>}
            </div>
          )}

          <button
            type="button"
            onClick={onDone}
            className="w-full py-3 bg-brand-primary text-white font-bold rounded-lg hover:opacity-90"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};
