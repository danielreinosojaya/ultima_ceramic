import React, { useState, useEffect, useCallback } from 'react';
import type { Booking, PaymentDetails } from '../../types';
import * as dataService from '../../services/dataService';

const ADMIN_CODE = 'RUMCOM2026';
const EVENT_DATE = '2026-04-30';
const EVENT_TIME = '17:00';

interface RumcomAdminProps {
  onBack: () => void;
}

/**
 * RumcomAdmin - Mini admin panel for "Spill the Tea x Rum-Com Club" event
 * Filters bookings by: technique=hand_modeling + date=2026-04-30 + bookingSource=rumcom
 * Features: list bookings, register payments, view status
 */
export const RumcomAdmin: React.FC<RumcomAdminProps> = ({ onBack }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ booking: Booking; method: PaymentDetails['method'] } | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeInput.trim() === ADMIN_CODE) {
      setAuthenticated(true);
      setCodeError('');
    } else {
      setCodeError('Código incorrecto');
    }
  };

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const allBookings = await dataService.getBookings();
      // Filter: bookings for the rumcom event
      // Match by: bookingSource=rumcom in product.details, OR technique=hand_modeling on the event date/time
      const rumcomBookings = allBookings.filter((b) => {
        const details = (b.product as any)?.details;
        // Primary: bookingSource tag
        if (details?.bookingSource === 'rumcom') return true;
        // Fallback: hand_modeling + event date match
        const hasEventSlot = b.slots?.some(
          (s) => s.date === EVENT_DATE && s.time === EVENT_TIME
        );
        const isHandModeling =
          details?.technique === 'hand_modeling' || b.technique === 'hand_modeling';
        return hasEventSlot && isHandModeling;
      });
      setBookings(rumcomBookings);
    } catch (err) {
      console.error('[RumcomAdmin] Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchBookings();
    }
  }, [authenticated, fetchBookings]);

  const handleRegisterPayment = async (method: PaymentDetails['method']) => {
    if (!paymentModal) return;
    setProcessingPayment(true);
    try {
      const payment: PaymentDetails = {
        amount: paymentModal.booking.price,
        method,
        receivedAt: new Date().toISOString(),
      };
      const result = await dataService.addPaymentToBooking(paymentModal.booking.id, payment);
      if (result.success && result.booking) {
        // OPCIÓN 3: Update local sin refetch completo
        // Actualizar el booking localmente con la respuesta del servidor
        setBookings(prevBookings =>
          prevBookings.map(b =>
            b.id === paymentModal.booking.id
              ? result.booking! // Usar el booking actualizado del servidor
              : b
          )
        );
        setPaymentModal(null);
      }
    } catch (err) {
      console.error('[RumcomAdmin] Error registering payment:', err);
    } finally {
      setProcessingPayment(false);
    }
  };

  const getPaymentStatus = (booking: Booking): { label: string; color: string } => {
    if (booking.isPaid || (booking.paymentDetails && booking.paymentDetails.length > 0)) {
      return { label: 'Pagado', color: '#6B8C6B' };
    }
    if (booking.status === 'expired') {
      return { label: 'Expirada', color: '#999' };
    }
    return { label: 'Pendiente', color: '#C4704E' };
  };

  // Auth screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#FAF5EE] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 w-full max-w-sm">
          <h1 className="text-xl font-bold text-[#3D2410] mb-1">Rum-Com Admin</h1>
          <p className="text-sm text-[#7A5C45] mb-6">Ingresa el código de acceso</p>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="password"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Código de acceso"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#C4704E] focus:ring-1 focus:ring-[#C4704E]"
              autoFocus
            />
            {codeError && (
              <p className="text-sm text-red-600">{codeError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: '#C4704E', color: '#FAF5EE' }}
            >
              Acceder
            </button>
          </form>

          <button
            onClick={onBack}
            className="mt-4 text-sm text-[#A08060] hover:text-[#7A5C45] transition-colors w-full text-center"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-[#FAF5EE]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#3D2410]">Spill the Tea x Rum-Com</h1>
            <p className="text-xs text-[#A08060]">Jueves 30 Abril · 5:00 PM · Admin</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchBookings}
              disabled={loading}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : '↻ Refrescar'}
            </button>
            <button
              onClick={onBack}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              ← Salir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-[#3D2410]">{bookings.length}</p>
            <p className="text-xs text-[#A08060]">Reservas</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold" style={{ color: '#6B8C6B' }}>
              {bookings.filter((b) => b.isPaid || (b.paymentDetails && b.paymentDetails.length > 0)).length}
            </p>
            <p className="text-xs text-[#A08060]">Pagadas</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold" style={{ color: '#C4704E' }}>
              {bookings.filter((b) => !b.isPaid && (!b.paymentDetails || b.paymentDetails.length === 0)).length}
            </p>
            <p className="text-xs text-[#A08060]">Pendientes</p>
          </div>
        </div>

        {/* Bookings list */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-[#C4704E] border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-sm text-[#7A5C45]">Cargando reservas...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-[#7A5C45]">Aún no hay reservas para este evento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking, idx) => {
              const status = getPaymentStatus(booking);
              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl p-4 border border-gray-100 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-sm text-[#3D2410]">
                        {idx + 1}. {booking.userInfo?.firstName} {booking.userInfo?.lastName}
                      </p>
                      <p className="text-xs text-[#A08060] mt-0.5">{booking.bookingCode}</p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: `${status.color}15`,
                        color: status.color,
                        border: `1px solid ${status.color}30`,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#A08060]">Email: </span>
                      <span className="text-[#3D2410]">{booking.userInfo?.email || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[#A08060]">Teléfono: </span>
                      <span className="text-[#3D2410]">{booking.userInfo?.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[#A08060]">Monto: </span>
                      <span className="font-bold text-[#3D2410]">${booking.price}</span>
                    </div>
                    <div>
                      <span className="text-[#A08060]">Creada: </span>
                      <span className="text-[#3D2410]">
                        {booking.createdAt
                          ? new Date(booking.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                          : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Payment actions */}
                  {status.label === 'Pendiente' && (
                    <button
                      onClick={() => setPaymentModal({ booking, method: 'Transfer' })}
                      className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.01]"
                      style={{ background: 'rgba(107,140,107,0.1)', color: '#6B8C6B', border: '1px solid rgba(107,140,107,0.3)' }}
                    >
                      Registrar Pago
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,8,2,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPaymentModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#3D2410]">Registrar Pago</h3>
            <p className="text-sm text-[#7A5C45]">
              {paymentModal.booking.userInfo?.firstName} {paymentModal.booking.userInfo?.lastName} —{' '}
              <strong>${paymentModal.booking.price}</strong>
            </p>

            <div className="space-y-2">
              {(['Transfer', 'Cash', 'Card'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => handleRegisterPayment(method)}
                  disabled={processingPayment}
                  className="w-full py-3 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  {processingPayment ? '...' : method === 'Transfer' ? '💳 Transferencia' : method === 'Cash' ? '💵 Efectivo' : '💳 Tarjeta'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPaymentModal(null)}
              className="w-full py-2 text-sm text-[#A08060] hover:text-[#7A5C45] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RumcomAdmin;
