import React, { useCallback, useEffect, useState } from 'react';
import type { AppData, Booking, TimeSlot, RescheduleSlotInfo, PaymentDetails } from '../../types';
import * as dataService from '../../services/dataService';
import { invalidateBookingsCache } from '../../services/dataService';
import { RescheduleModal } from './RescheduleModal';

const EMPTY_SLOT: TimeSlot = { date: '1970-01-01', time: '00:00', instructorId: 0 };

function formatMethodLabel(m: string | undefined): string {
  const s = String(m || '');
  if (s === 'Cash' || s === 'Efectivo') return 'Efectivo';
  if (s === 'Card' || s === 'Tarjeta') return 'Tarjeta';
  if (s === 'Giftcard') return 'Giftcard';
  if (s === 'Transfer' || s === 'Transferencia') return 'Transferencia';
  return s || '—';
}

function sumPayments(b: Booking): number {
  const arr = b.paymentDetails;
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((acc, p) => acc + (typeof p?.amount === 'number' ? p.amount : 0), 0);
}

interface PreBookingQuickManageModalProps {
  booking: Booking | null;
  appData: AppData | null;
  isOpen: boolean;
  onClose: () => void;
  /** Tras cualquier mutación exitosa */
  onApplied: () => void | Promise<void>;
  onRefreshAdmin?: () => void;
  /** Actualiza la reserva abierta en el padre (lista + modal al día) */
  onBookingReplaced?: (b: Booking) => void;
}

export const PreBookingQuickManageModal: React.FC<PreBookingQuickManageModalProps> = ({
  booking,
  appData,
  isOpen,
  onClose,
  onApplied,
  onRefreshAdmin,
  onBookingReplaced,
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
  const [payNotes, setPayNotes] = useState('');
  /** null = nuevo pago; objeto = editar fila */
  const [editPayRef, setEditPayRef] = useState<{ id?: string; index: number } | null>(null);
  const [deletingRef, setDeletingRef] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  /** Lista global `getBookings` no trae payment_details (payload liviano); aquí cargamos el detalle. */
  const [resolvedBooking, setResolvedBooking] = useState<Booking | null>(null);
  const [paymentsDetailStatus, setPaymentsDetailStatus] = useState<'idle' | 'loading' | 'ready'>('idle');

  const resetPayForm = useCallback(() => {
    setPayAmount('');
    setPayMethod('Transferencia');
    setPayReceivedAt('');
    setPayNotes('');
    setEditPayRef(null);
  }, []);

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
    resetPayForm();
    // Solo al cambiar reserva o abrir; si el padre refresca la misma id (p. ej. pagos), no resetear el formulario
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, booking?.id, resetPayForm]);

  useEffect(() => {
    if (!isOpen) setMessage(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !booking?.id) {
      setResolvedBooking(null);
      setPaymentsDetailStatus('idle');
      return;
    }
    let cancelled = false;
    setPaymentsDetailStatus('loading');
    (async () => {
      try {
        const full = await dataService.getBookingById(booking.id);
        if (cancelled) return;
        setResolvedBooking(full);
        onBookingReplaced?.(full);
      } catch {
        if (cancelled) return;
        setResolvedBooking(null);
      } finally {
        if (!cancelled) setPaymentsDetailStatus('ready');
      }
    })();
    return () => {
      cancelled = true;
    };
    // Solo al abrir / cambiar reserva; onBookingReplaced puede cambiar identidad en el padre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, booking?.id]);

  if (!isOpen || !booking) return null;

  const currentBooking = resolvedBooking ?? booking;

  const slotForReschedule: TimeSlot = currentBooking.slots?.[0] ? { ...currentBooking.slots[0] } : { ...EMPTY_SLOT };
  const hasRealSlot = !!(currentBooking.slots && currentBooking.slots.length > 0);
  const attendeeName = `${currentBooking.userInfo?.firstName || ''} ${currentBooking.userInfo?.lastName || ''}`.trim() || 'Cliente';
  const rescheduleSlotInfo: RescheduleSlotInfo = {
    bookingId: booking.id,
    slot: slotForReschedule,
    attendeeName,
  };

  const payments = Array.isArray(currentBooking.paymentDetails) ? currentBooking.paymentDetails : [];
  const paidSum = sumPayments(currentBooking);
  const priceNum = typeof currentBooking.price === 'number' ? currentBooking.price : parseFloat(String(currentBooking.price)) || 0;
  const balance = Math.round((priceNum - paidSum) * 100) / 100;

  const showToast = (type: 'ok' | 'err', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const syncBookingFromServer = async () => {
    if (!booking?.id) return;
    try {
      const fresh = await dataService.getBookingById(booking.id);
      setResolvedBooking(fresh);
      onBookingReplaced?.(fresh);
    } catch {
      /* padre refrescará con loadBookings */
    }
  };

  const afterMutation = async () => {
    invalidateBookingsCache();
    onRefreshAdmin?.();
    await syncBookingFromServer();
    await onApplied();
  };

  const startEditPayment = (p: PaymentDetails, index: number) => {
    setEditPayRef({ id: p.id, index });
    setPayAmount(String(p.amount ?? ''));
    const m = String(p.method || '');
    if (m === 'Cash' || m === 'Efectivo') setPayMethod('Efectivo');
    else if (m === 'Card' || m === 'Tarjeta') setPayMethod('Tarjeta');
    else if (m === 'Giftcard') setPayMethod('Giftcard');
    else setPayMethod('Transferencia');
    if (p.receivedAt) {
      try {
        setPayReceivedAt(new Date(p.receivedAt).toISOString().slice(0, 16));
      } catch {
        setPayReceivedAt('');
      }
    } else setPayReceivedAt('');
    setPayNotes((p as any).notes || '');
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
        ...currentBooking.userInfo,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        countryCode: countryCode.trim() || currentBooking.userInfo?.countryCode || '+593',
      };
      const res = await dataService.updateBooking({
        ...currentBooking,
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
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('err', 'Monto inválido');
      return;
    }
    const receivedAt = payReceivedAt.trim()
      ? new Date(payReceivedAt).toISOString()
      : new Date().toISOString();

    setSavingPay(true);
    try {
      const payList = Array.isArray(currentBooking.paymentDetails) ? currentBooking.paymentDetails : [];
      if (editPayRef !== null && payList[editPayRef.index]) {
        const updatedDetails: Record<string, unknown> = {
          amount,
          method: payMethod,
          receivedAt,
        };
        if (payNotes.trim()) updatedDetails.notes = payNotes.trim();
        const p = payList[editPayRef.index];
        const idOrIdx = p.id ?? editPayRef.index;
        const res = await dataService.updatePaymentDetails(booking.id, idOrIdx, updatedDetails as Partial<PaymentDetails>);
        if (res.success) {
          showToast('ok', 'Pago actualizado');
          resetPayForm();
          await afterMutation();
        } else showToast('err', 'No se pudo actualizar el pago');
      } else {
        const res = await dataService.addPaymentToBooking(booking.id, {
          amount,
          method: payMethod,
          receivedAt,
          notes: payNotes.trim() || 'Registrado desde Pre-Reservas — Gestionar',
        } as unknown as PaymentDetails);
        if (res.success) {
          showToast('ok', 'Pago agregado');
          resetPayForm();
          await afterMutation();
        } else showToast('err', 'No se pudo registrar el pago');
      }
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Error al guardar pago');
    } finally {
      setSavingPay(false);
    }
  };

  const handleDeletePayment = async (p: PaymentDetails, index: number) => {
    const key = p.id || `i-${index}`;
    if (!window.confirm(`¿Eliminar este pago de $${Number(p.amount).toFixed(2)} (${formatMethodLabel(p.method)})?`)) return;
    setDeletingRef(key);
    try {
      const idOrIdx = p.id ?? index;
      const res = await dataService.deletePaymentFromBooking(booking.id, idOrIdx, 'Eliminado desde Pre-Reservas');
      if (res.success) {
        showToast('ok', 'Pago eliminado');
        resetPayForm();
        await afterMutation();
      } else showToast('err', 'No se pudo eliminar');
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setDeletingRef(null);
    }
  };

  const handleMarkUnpaid = async () => {
    if (!window.confirm('¿Marcar esta reserva como NO pagada? Se borrarán todos los pagos y volverá a estado activo.')) return;
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
        }}
        slotInfo={rescheduleSlotInfo}
        appData={appData}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[55] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-brand-border px-5 py-4 flex justify-between items-start gap-2 z-10">
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
            {currentBooking.isPaid && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                El sistema marca “pagada” cuando la suma de pagos ≥ precio. Ajusta montos o el precio para que cuadre.
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

          <section className="border-t border-brand-border pt-4">
            <h4 className="text-sm font-bold text-brand-text mb-2 flex items-center gap-2">
              <span>💳</span> Pagos registrados
            </h4>
            <p className="text-[11px] text-brand-secondary mb-2">
              La tabla de pre-reservas no trae el detalle de pagos por velocidad; se carga al abrir este panel.
            </p>

            {paymentsDetailStatus === 'loading' ? (
              <p className="text-sm text-brand-secondary animate-pulse mb-4">Cargando movimientos de pago…</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                  <span className="px-2 py-1 rounded-md bg-slate-100 font-semibold text-slate-800">
                    {payments.length} movimiento{payments.length !== 1 ? 's' : ''}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700">
                    Abonado: <strong>${paidSum.toFixed(2)}</strong> · Precio: <strong>${priceNum.toFixed(2)}</strong>
                  </span>
                  {balance > 0.009 && (
                    <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-900 font-semibold">Falta ${balance.toFixed(2)}</span>
                  )}
                  {balance <= 0.009 && paidSum > 0 && (
                    <span className="px-2 py-1 rounded-md bg-green-100 text-green-800 font-semibold">Cubierto</span>
                  )}
                </div>

                {payments.length === 0 ? (
                  <p className="text-sm text-brand-secondary mb-3">Sin pagos registrados en base de datos.</p>
                ) : (
                  <div className="overflow-x-auto border border-brand-border rounded-lg mb-4">
                    <table className="w-full text-xs">
                      <thead className="bg-brand-surface">
                        <tr>
                          <th className="text-left px-2 py-2 font-bold">Monto</th>
                          <th className="text-left px-2 py-2 font-bold">Método</th>
                          <th className="text-left px-2 py-2 font-bold">Recibido</th>
                          <th className="text-right px-2 py-2 font-bold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p, index) => {
                          const rowKey = p.id || `i-${index}`;
                          const busy = deletingRef === rowKey;
                          return (
                            <tr key={rowKey} className="border-t border-brand-border">
                              <td className="px-2 py-2 font-semibold">${Number(p.amount).toFixed(2)}</td>
                              <td className="px-2 py-2">{formatMethodLabel(p.method)}</td>
                              <td className="px-2 py-2 text-brand-secondary whitespace-nowrap">
                                {p.receivedAt
                                  ? new Date(p.receivedAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })
                                  : '—'}
                              </td>
                              <td className="px-2 py-2 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  className="text-indigo-600 font-semibold hover:underline mr-2"
                                  onClick={() => startEditPayment(p, index)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="text-red-600 font-semibold hover:underline disabled:opacity-40"
                                  onClick={() => handleDeletePayment(p, index)}
                                >
                                  {busy ? '…' : 'Quitar'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            <div className="rounded-lg border border-dashed border-brand-border p-3 bg-brand-surface/40">
              <p className="text-xs font-bold text-brand-text mb-2">
                {editPayRef !== null ? `Editar pago #${editPayRef.index + 1}` : 'Agregar pago'}
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
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-brand-secondary mb-1">Nota (opcional)</label>
                  <input className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Ej. abono 50%" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  disabled={savingPay || paymentsDetailStatus === 'loading'}
                  onClick={handleSavePayment}
                  className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {savingPay ? 'Guardando…' : editPayRef !== null ? 'Guardar cambios' : 'Registrar pago'}
                </button>
                {editPayRef !== null && (
                  <button type="button" className="px-4 py-2 rounded-lg border border-brand-border text-sm font-semibold" onClick={resetPayForm}>
                    Cancelar edición
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="border-t border-brand-border pt-4">
            <h4 className="text-sm font-bold text-red-800 mb-2">Zona sensible</h4>
            <button
              type="button"
              disabled={unpayLoading || !currentBooking.isPaid}
              onClick={handleMarkUnpaid}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-40"
              title={!currentBooking.isPaid ? 'Solo aplica si la reserva figura como pagada' : ''}
            >
              {unpayLoading ? 'Procesando…' : 'Marcar como no pagada (borra todos los pagos)'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
