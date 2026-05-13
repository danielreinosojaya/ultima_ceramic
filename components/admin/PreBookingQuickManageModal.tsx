import React, { useEffect, useState } from 'react';
import type { AppData, Booking, TimeSlot, RescheduleSlotInfo } from '../../types';
import * as dataService from '../../services/dataService';
import { invalidateBookingsCache } from '../../services/dataService';
import { RescheduleModal } from './RescheduleModal';

const EMPTY_SLOT: TimeSlot = { date: '1970-01-01', time: '00:00', instructorId: 0 };

interface PreBookingQuickManageModalProps {
  booking: Booking | null;
  appData: AppData | null;
  isOpen: boolean;
  onClose: () => void;
  /** Tras cualquier mutación exitosa */
  onApplied: () => void | Promise<void>;
  onRefreshAdmin?: () => void;
}

export const PreBookingQuickManageModal: React.FC<PreBookingQuickManageModalProps> = ({
  booking,
  appData,
  isOpen,
  onClose,
  onApplied,
  onRefreshAdmin,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [participantsStr, setParticipantsStr] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingPay, setSavingPay] = useState(false);
  const [unpayLoading, setUnpayLoading] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Transferencia');
  const [payReceivedAt, setPayReceivedAt] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!booking || !isOpen) return;
    const u = booking.userInfo;
    setFirstName(u?.firstName || '');
    setLastName(u?.lastName || '');
    setEmail(u?.email || '');
    setPhone(u?.phone || '');
    setCountryCode(u?.countryCode || '');
    setPriceStr(booking.price != null ? String(booking.price) : '');
    setParticipantsStr(booking.participants != null ? String(booking.participants) : '1');
    const p0 = booking.paymentDetails?.[0];
    if (p0) {
      setPayAmount(String(p0.amount ?? ''));
      const m = String(p0.method || '');
      if (m === 'Cash' || m === 'Efectivo') setPayMethod('Efectivo');
      else if (m === 'Card' || m === 'Tarjeta') setPayMethod('Tarjeta');
      else if (m === 'Giftcard') setPayMethod('Giftcard');
      else setPayMethod('Transferencia');
      if (p0.receivedAt) {
        try {
          const d = new Date(p0.receivedAt);
          setPayReceivedAt(d.toISOString().slice(0, 16));
        } catch {
          setPayReceivedAt('');
        }
      } else setPayReceivedAt('');
    } else {
      setPayAmount('');
      setPayMethod('Transferencia');
      setPayReceivedAt('');
    }
    setMessage(null);
  }, [booking, isOpen]);

  if (!isOpen || !booking) return null;

  const slotForReschedule: TimeSlot = booking.slots?.[0] ? { ...booking.slots[0] } : { ...EMPTY_SLOT };
  const hasRealSlot = !!(booking.slots && booking.slots.length > 0);
  const attendeeName = `${booking.userInfo?.firstName || ''} ${booking.userInfo?.lastName || ''}`.trim() || 'Cliente';
  const rescheduleSlotInfo: RescheduleSlotInfo = {
    bookingId: booking.id,
    slot: slotForReschedule,
    attendeeName,
  };

  const showToast = (type: 'ok' | 'err', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const afterMutation = async () => {
    invalidateBookingsCache();
    onRefreshAdmin?.();
    await onApplied();
  };

  const handleSaveBooking = async () => {
    const price = parseFloat(priceStr);
    const participants = parseInt(participantsStr, 10);
    if (isNaN(price) || price < 0) {
      showToast('err', 'Precio inválido');
      return;
    }
    if (isNaN(participants) || participants < 1) {
      showToast('err', 'Participantes debe ser ≥ 1');
      return;
    }
    setSavingEdit(true);
    try {
      const userInfo = {
        ...booking.userInfo,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        countryCode: countryCode.trim() || booking.userInfo?.countryCode || '+593',
      };
      const res = await dataService.updateBooking({
        ...booking,
        userInfo,
        price,
        participants,
      } as Booking);
      if (res.success) {
        showToast('ok', 'Reserva actualizada');
        await afterMutation();
      } else showToast('err', 'No se pudo guardar la reserva');
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSavePayment = async () => {
    const payments = booking.paymentDetails;
    if (!payments?.length) {
      showToast('err', 'No hay pagos registrados para editar');
      return;
    }
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('err', 'Monto de pago inválido');
      return;
    }
    const p0 = payments[0];
    const receivedAt =
      payReceivedAt.trim() ? new Date(payReceivedAt).toISOString() : p0.receivedAt || new Date().toISOString();
    setSavingPay(true);
    try {
      const updatedDetails: Record<string, unknown> = {
        amount,
        method: payMethod,
        receivedAt,
      };
      const idOrIdx = p0.id ?? 0;
      const res = await dataService.updatePaymentDetails(booking.id, idOrIdx, updatedDetails);
      if (res.success) {
        showToast('ok', 'Pago actualizado');
        await afterMutation();
      } else showToast('err', 'No se pudo actualizar el pago');
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Error al guardar pago');
    } finally {
      setSavingPay(false);
    }
  };

  const handleMarkUnpaid = async () => {
    if (!window.confirm('¿Marcar esta reserva como NO pagada? Se borrarán los detalles de pago y volverá a estado activo.')) return;
    setUnpayLoading(true);
    try {
      const res = await dataService.markBookingAsUnpaid(booking.id);
      if (res.success) {
        showToast('ok', 'Reserva marcada como no pagada');
        await afterMutation();
        onClose();
      } else showToast('err', 'No se pudo actualizar');
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Error');
    } finally {
      setUnpayLoading(false);
    }
  };

  if (rescheduleOpen && appData) {
    return (
      <RescheduleModal
        isOpen
        onClose={() => setRescheduleOpen(false)}
        onSave={async () => {
          await afterMutation();
          setRescheduleOpen(false);
          showToast('ok', 'Fecha actualizada');
        }}
        slotInfo={rescheduleSlotInfo}
        appData={appData}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[55] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-brand-border px-5 py-4 flex justify-between items-start gap-2">
          <div>
            <h3 className="text-lg font-bold text-brand-text">Gestionar reserva</h3>
            <p className="text-xs font-mono text-brand-primary font-semibold">{booking.bookingCode}</p>
            <p className="text-sm text-brand-secondary">{attendeeName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-brand-secondary hover:text-brand-text text-xl leading-none px-2">
            ×
          </button>
        </div>

        {message && (
          <div
            className={`mx-5 mt-3 px-3 py-2 rounded-lg text-sm font-medium ${
              message.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="p-5 space-y-6">
          <section>
            <h4 className="text-sm font-bold text-brand-text mb-2 flex items-center gap-2">
              <span>📅</span> Re-agendar
            </h4>
            <p className="text-xs text-brand-secondary mb-2">
              {hasRealSlot
                ? `Fecha actual: ${slotForReschedule.date} · ${slotForReschedule.time}`
                : 'Sin fecha en sistema — al guardar se asignará la primera fecha que elijas.'}
            </p>
            <button
              type="button"
              disabled={!appData}
              onClick={() => setRescheduleOpen(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              Elegir nueva fecha y hora…
            </button>
            {!appData && <p className="text-xs text-amber-700 mt-1">Cargando datos de agenda (instructores)…</p>}
          </section>

          <section className="border-t border-brand-border pt-4">
            <h4 className="text-sm font-bold text-brand-text mb-3 flex items-center gap-2">
              <span>✏️</span> Datos de la reserva
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-brand-secondary mb-1">Nombre</label>
                <input className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-secondary mb-1">Apellido</label>
                <input className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-brand-secondary mb-1">Email</label>
                <input className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-secondary mb-1">Teléfono</label>
                <input className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-secondary mb-1">Código país</label>
                <input className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm" value={countryCode} onChange={e => setCountryCode(e.target.value)} placeholder="+593" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-secondary mb-1">Precio reserva ($)</label>
                <input className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm" type="number" min={0} step="0.01" value={priceStr} onChange={e => setPriceStr(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-secondary mb-1">Participantes</label>
                <input className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm" type="number" min={1} value={participantsStr} onChange={e => setParticipantsStr(e.target.value)} />
              </div>
            </div>
            {booking.isPaid && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                Si cambias el precio de una reserva ya pagada, revisa que el total de pagos registrados siga siendo coherente (puedes ajustar el pago abajo).
              </p>
            )}
            <button
              type="button"
              disabled={savingEdit}
              onClick={handleSaveBooking}
              className="mt-3 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {savingEdit ? 'Guardando…' : 'Guardar datos de reserva'}
            </button>
          </section>

          {booking.isPaid && booking.paymentDetails && booking.paymentDetails.length > 0 && (
            <section className="border-t border-brand-border pt-4">
              <h4 className="text-sm font-bold text-brand-text mb-3 flex items-center gap-2">
                <span>💳</span> Primer pago registrado
              </h4>
              <p className="text-xs text-brand-secondary mb-2">
                Para varios pagos, usa el detalle del cliente o finanzas. Aquí se edita el primer movimiento.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-secondary mb-1">Monto</label>
                  <input className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm" type="number" min={0} step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-secondary mb-1">Método</label>
                  <select className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Giftcard">Giftcard</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-brand-secondary mb-1">Fecha/hora recibido</label>
                  <input
                    className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm"
                    type="datetime-local"
                    value={payReceivedAt}
                    onChange={e => setPayReceivedAt(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={savingPay}
                onClick={handleSavePayment}
                className="mt-3 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
              >
                {savingPay ? 'Guardando…' : 'Guardar cambios de pago'}
              </button>
            </section>
          )}

          <section className="border-t border-brand-border pt-4">
            <h4 className="text-sm font-bold text-red-800 mb-2">Zona sensible</h4>
            <button
              type="button"
              disabled={unpayLoading || !booking.isPaid}
              onClick={handleMarkUnpaid}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-40"
              title={!booking.isPaid ? 'Solo aplica si la reserva está pagada' : ''}
            >
              {unpayLoading ? 'Procesando…' : 'Marcar como no pagada'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
