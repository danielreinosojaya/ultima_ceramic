import React, { useEffect, useState } from 'react';
import * as dataService from '../../services/dataService';
import { getEcuadorDateYmd } from '../../utils/formatters';
import type {
  PrivateCustomEvent,
  PrivateCustomEventStatus,
} from '../../utils/privateCustomEvent';
import {
  PRIVATE_EVENT_PAYMENT_LABEL,
  PRIVATE_EVENT_STATUS_LABEL,
} from '../../utils/privateCustomEvent';

const TIME_OPTIONS = Array.from({ length: 34 }, (_, i) => {
  const total = 7 * 60 + i * 30;
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

const fieldClass = 'mt-1 w-full border border-brand-border rounded-md px-3 py-2 text-sm bg-white';

const PAYMENT_BADGE = {
  pending: 'bg-rose-100 text-rose-900',
  partial: 'bg-amber-100 text-amber-950',
  paid: 'bg-emerald-100 text-emerald-900',
} as const;

interface Draft {
  id?: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  participants: string;
  contactName: string;
  phone: string;
  email: string;
  agreedPrice: string;
  amountPaid: string;
  paymentMethod: string;
  paymentNotes: string;
  status: PrivateCustomEventStatus;
  internalNotes: string;
}

function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function emptyDraft(date?: string): Draft {
  return {
    title: '',
    eventDate: date || getEcuadorDateYmd(),
    startTime: '10:00',
    endTime: '13:00',
    participants: '',
    contactName: '',
    phone: '',
    email: '',
    agreedPrice: '',
    amountPaid: '',
    paymentMethod: '',
    paymentNotes: '',
    status: 'confirmed',
    internalNotes: '',
  };
}

function draftFromEvent(event: PrivateCustomEvent): Draft {
  return {
    id: event.id,
    title: event.title,
    eventDate: event.eventDate,
    startTime: event.startTime,
    endTime: event.endTime,
    participants: event.participants ? String(event.participants) : '',
    contactName: event.contactName,
    phone: event.phone,
    email: event.email,
    agreedPrice: event.agreedPrice ? String(event.agreedPrice) : '',
    amountPaid: event.amountPaid ? String(event.amountPaid) : '',
    paymentMethod: event.paymentMethod,
    paymentNotes: event.paymentNotes,
    status: event.status,
    internalNotes: event.internalNotes,
  };
}

interface PrivateCustomEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (event: PrivateCustomEvent, meta?: { keepOpen?: boolean }) => void;
  /** Called after hard delete; parent should close and refresh */
  onDeleted?: () => void;
  /** Prefill date when creating */
  initialDate?: string;
  /** Existing event to edit; if omitted, create mode */
  event?: PrivateCustomEvent | null;
}

export const PrivateCustomEventModal: React.FC<PrivateCustomEventModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onDeleted,
  initialDate,
  event = null,
}) => {
  const [draft, setDraft] = useState<Draft>(() =>
    event ? draftFromEvent(event) : emptyDraft(initialDate)
  );
  const [liveEvent, setLiveEvent] = useState<PrivateCustomEvent | null>(event);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paying, setPaying] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(event ? draftFromEvent(event) : emptyDraft(initialDate));
    setLiveEvent(event);
    setFormError('');
    setPaymentAmount('');
    setPaymentMethod('');
    setPaymentNote('');
  }, [isOpen, event, initialDate]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving && !paying && !busyAction) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, paying, busyAction, onClose]);

  if (!isOpen) return null;

  const balance =
    liveEvent != null
      ? liveEvent.balanceDue
      : Math.max(
          0,
          Math.round(
            ((parseFloat(draft.agreedPrice.replace(',', '.')) || 0) -
              (parseFloat(draft.amountPaid.replace(',', '.')) || 0)) *
              100
          ) / 100
        );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const result = await dataService.savePrivateCustomEvent({
      id: draft.id,
      title: draft.title,
      eventDate: draft.eventDate,
      startTime: draft.startTime,
      endTime: draft.endTime,
      participants: draft.participants,
      contactName: draft.contactName,
      phone: draft.phone,
      email: draft.email,
      agreedPrice: draft.agreedPrice,
      // Solo enviar amountPaid en alta; en edición los abonos van por add-payment
      amountPaid: draft.id ? undefined : draft.amountPaid,
      paymentMethod: draft.paymentMethod,
      paymentNotes: draft.paymentNotes,
      status: draft.status,
      internalNotes: draft.internalNotes,
      paymentEntries: liveEvent?.paymentEntries,
    });
    setSaving(false);
    if (!result.success || !result.data) {
      setFormError(result.error || 'No se pudo guardar el evento.');
      return;
    }
    onSaved(result.data);
  };

  const registerPayment = async () => {
    if (!liveEvent?.id) {
      setFormError('Guarda el evento primero para poder registrar abonos.');
      return;
    }
    setPaying(true);
    setFormError('');
    const result = await dataService.addPrivateCustomEventPayment({
      id: liveEvent.id,
      amount: paymentAmount,
      method: paymentMethod || draft.paymentMethod,
      note: paymentNote,
    });
    setPaying(false);
    if (!result.success || !result.data) {
      setFormError(result.error || 'No se pudo registrar el abono.');
      return;
    }
    setLiveEvent(result.data);
    setDraft(draftFromEvent(result.data));
    setPaymentAmount('');
    setPaymentNote('');
    onSaved(result.data, { keepOpen: true });
  };

  const markFullyPaid = async () => {
    if (!liveEvent?.id) return;
    const due = liveEvent.balanceDue;
    if (due <= 0) return;
    setPaying(true);
    setFormError('');
    const result = await dataService.addPrivateCustomEventPayment({
      id: liveEvent.id,
      amount: due,
      method: paymentMethod || draft.paymentMethod || 'Pago total',
      note: 'Saldo liquidado',
    });
    setPaying(false);
    if (!result.success || !result.data) {
      setFormError(result.error || 'No se pudo marcar como pagado.');
      return;
    }
    setLiveEvent(result.data);
    setDraft(draftFromEvent(result.data));
    onSaved(result.data, { keepOpen: true });
  };

  const removePayment = async (paymentId: string) => {
    if (!liveEvent?.id) return;
    const ok = window.confirm('¿Quitar este abono? El saldo se recalcula.');
    if (!ok) return;
    setPaying(true);
    setFormError('');
    const result = await dataService.removePrivateCustomEventPayment({
      id: liveEvent.id,
      paymentId,
    });
    setPaying(false);
    if (!result.success || !result.data) {
      setFormError(result.error || 'No se pudo quitar el abono.');
      return;
    }
    setLiveEvent(result.data);
    setDraft(draftFromEvent(result.data));
    onSaved(result.data, { keepOpen: true });
  };

  const cancelEvent = async () => {
    if (!liveEvent?.id) return;
    const ok = window.confirm(
      `¿Cancelar «${liveEvent.title}»? Puedes reactivarlo después si fue un error.`
    );
    if (!ok) return;
    setBusyAction(true);
    setFormError('');
    const result = await dataService.cancelPrivateCustomEvent(liveEvent.id);
    setBusyAction(false);
    if (!result.success || !result.data) {
      setFormError(result.error || 'No se pudo cancelar el evento.');
      return;
    }
    setLiveEvent(result.data);
    setDraft(draftFromEvent(result.data));
    onSaved(result.data, { keepOpen: true });
  };

  const restoreEvent = async () => {
    if (!liveEvent?.id) return;
    setBusyAction(true);
    setFormError('');
    const result = await dataService.restorePrivateCustomEvent(liveEvent.id);
    setBusyAction(false);
    if (!result.success || !result.data) {
      setFormError(result.error || 'No se pudo reactivar el evento.');
      return;
    }
    setLiveEvent(result.data);
    setDraft(draftFromEvent(result.data));
    onSaved(result.data, { keepOpen: true });
  };

  const deleteEvent = async () => {
    if (!liveEvent?.id) return;
    const ok = window.confirm(
      `¿Eliminar definitivamente «${liveEvent.title}»? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setBusyAction(true);
    setFormError('');
    const result = await dataService.deletePrivateCustomEvent(liveEvent.id);
    setBusyAction(false);
    if (!result.success) {
      setFormError(result.error || 'No se pudo eliminar el evento.');
      return;
    }
    if (onDeleted) onDeleted();
    else onClose();
  };

  const locked = saving || paying || busyAction;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
      onClick={() => {
        if (!locked) onClose();
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5"
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-lg font-serif text-brand-accent">
            {draft.id ? 'Editar evento personalizado' : 'Nuevo evento personalizado'}
          </h3>
          {liveEvent && liveEvent.status !== 'cancelled' && (
            <span
              className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${PAYMENT_BADGE[liveEvent.paymentStatus]}`}
            >
              {PRIVATE_EVENT_PAYMENT_LABEL[liveEvent.paymentStatus]}
            </span>
          )}
        </div>
        <p className="text-xs text-brand-secondary mb-4">
          Solo agenda interna. No ocupa cupos del taller ni aparece en el calendario del cliente.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2 text-sm font-semibold text-brand-text">
            Nombre del evento
            <input
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className={fieldClass}
              placeholder="Ej. Team building Acme, baby shower…"
            />
          </label>

          <label className="block text-sm font-semibold text-brand-text">
            Fecha
            <input
              required
              type="date"
              value={draft.eventDate}
              onChange={(e) => setDraft({ ...draft, eventDate: e.target.value })}
              className={fieldClass}
            />
          </label>

          <label className="block text-sm font-semibold text-brand-text">
            Personas
            <input
              type="number"
              min={0}
              max={999}
              value={draft.participants}
              onChange={(e) => setDraft({ ...draft, participants: e.target.value })}
              className={fieldClass}
              placeholder="0"
            />
          </label>

          <label className="block text-sm font-semibold text-brand-text">
            Hora inicio
            <select
              value={draft.startTime}
              onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
              className={fieldClass}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-brand-text">
            Hora fin
            <select
              value={draft.endTime}
              onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              className={fieldClass}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-brand-text">
            Contacto (opcional)
            <input
              value={draft.contactName}
              onChange={(e) => setDraft({ ...draft, contactName: e.target.value })}
              className={fieldClass}
              placeholder="Nombre"
            />
          </label>

          <label className="block text-sm font-semibold text-brand-text">
            Teléfono
            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className={fieldClass}
            />
          </label>

          <label className="block sm:col-span-2 text-sm font-semibold text-brand-text">
            Correo
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className={fieldClass}
            />
          </label>

          <label className="block text-sm font-semibold text-brand-text">
            Precio acordado ($)
            <input
              value={draft.agreedPrice}
              onChange={(e) => setDraft({ ...draft, agreedPrice: e.target.value })}
              className={fieldClass}
              placeholder="0.00"
              inputMode="decimal"
            />
          </label>

          {!draft.id ? (
            <label className="block text-sm font-semibold text-brand-text">
              Abono inicial ($)
              <input
                value={draft.amountPaid}
                onChange={(e) => setDraft({ ...draft, amountPaid: e.target.value })}
                className={fieldClass}
                placeholder="0.00"
                inputMode="decimal"
              />
            </label>
          ) : (
            <div className="text-sm">
              <div className="font-semibold text-brand-text">Saldo</div>
              <div className="mt-1 text-brand-text">
                Acordado {money(liveEvent?.agreedPrice ?? 0)} · pagado{' '}
                {money(liveEvent?.amountPaid ?? 0)}
              </div>
              <div
                className={`mt-0.5 font-bold ${balance > 0 ? 'text-amber-800' : 'text-emerald-800'}`}
              >
                {balance > 0 ? `Pendiente ${money(balance)}` : 'No debe nada'}
              </div>
            </div>
          )}

          <label className="block text-sm font-semibold text-brand-text">
            Método de pago
            <input
              value={draft.paymentMethod}
              onChange={(e) => setDraft({ ...draft, paymentMethod: e.target.value })}
              className={fieldClass}
              placeholder="Transferencia, efectivo…"
            />
          </label>

          <label className="block text-sm font-semibold text-brand-text">
            Estado
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft({ ...draft, status: e.target.value as PrivateCustomEventStatus })
              }
              className={fieldClass}
            >
              {(Object.keys(PRIVATE_EVENT_STATUS_LABEL) as PrivateCustomEventStatus[]).map(
                (key) => (
                  <option key={key} value={key}>
                    {PRIVATE_EVENT_STATUS_LABEL[key]}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="block sm:col-span-2 text-sm font-semibold text-brand-text">
            Notas de pago
            <textarea
              value={draft.paymentNotes}
              onChange={(e) => setDraft({ ...draft, paymentNotes: e.target.value })}
              className={fieldClass}
              rows={2}
            />
          </label>

          <label className="block sm:col-span-2 text-sm font-semibold text-brand-text">
            Notas internas
            <textarea
              value={draft.internalNotes}
              onChange={(e) => setDraft({ ...draft, internalNotes: e.target.value })}
              className={fieldClass}
              rows={2}
            />
          </label>
        </div>

        {liveEvent && liveEvent.paymentEntries.length > 0 && (
          <div className="mt-4 border-t border-brand-border pt-3">
            <h4 className="text-sm font-bold text-brand-text mb-2">Historial de abonos</h4>
            <ul className="space-y-1.5">
              {liveEvent.paymentEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="text-xs text-brand-secondary flex flex-wrap items-center justify-between gap-2 bg-brand-background rounded-md px-2 py-1.5"
                >
                  <span>
                    {money(entry.amount)}
                    {entry.method ? ` · ${entry.method}` : ''}
                    {entry.note ? ` · ${entry.note}` : ''}
                    {entry.paidAt
                      ? ` · ${new Date(entry.paidAt).toLocaleString('es-EC', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}`
                      : ''}
                  </span>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => void removePayment(entry.id)}
                    className="text-[11px] font-bold text-red-700 underline disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-brand-secondary mt-1">
              Si marcaste pagado por error, quita el abono y el saldo vuelve a pendientes.
            </p>
          </div>
        )}

        {liveEvent && liveEvent.status !== 'cancelled' && (
          <div className="mt-4 border-t border-brand-border pt-3">
            <h4 className="text-sm font-bold text-brand-text mb-2">Registrar abono</h4>
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className={fieldClass}
                placeholder="Monto $"
                inputMode="decimal"
              />
              <input
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={fieldClass}
                placeholder="Método"
              />
              <input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className={fieldClass}
                placeholder="Nota (ej. 30%)"
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                disabled={locked}
                onClick={() => void registerPayment()}
                className="text-xs font-bold px-3 py-1.5 rounded-md bg-teal-700 text-white disabled:opacity-50"
              >
                {paying ? 'Guardando…' : 'Registrar abono'}
              </button>
              {balance > 0 && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void markFullyPaid()}
                  className="text-xs font-bold px-3 py-1.5 rounded-md bg-emerald-700 text-white disabled:opacity-50"
                >
                  Liquidar saldo ({money(balance)})
                </button>
              )}
            </div>
          </div>
        )}

        {liveEvent?.id && (
          <div className="mt-4 border-t border-brand-border pt-3">
            <h4 className="text-sm font-bold text-brand-text mb-2">Gestión del evento</h4>
            <div className="flex flex-wrap gap-2">
              {(liveEvent.status === 'cancelled' || liveEvent.status === 'completed') && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void restoreEvent()}
                  className="text-xs font-bold px-3 py-1.5 rounded-md bg-teal-700 text-white disabled:opacity-50"
                >
                  Reactivar
                </button>
              )}
              {liveEvent.status !== 'cancelled' && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void cancelEvent()}
                  className="text-xs font-bold px-3 py-1.5 rounded-md border border-amber-400 text-amber-900 disabled:opacity-50"
                >
                  Cancelar evento
                </button>
              )}
              <button
                type="button"
                disabled={locked}
                onClick={() => void deleteEvent()}
                className="text-xs font-bold px-3 py-1.5 rounded-md border border-red-400 text-red-700 disabled:opacity-50"
              >
                Eliminar definitivo
              </button>
            </div>
            <p className="text-[11px] text-brand-secondary mt-1">
              Cancelar lo oculta de la agenda activa; reactivar lo vuelve. Eliminar lo borra por
              completo.
            </p>
          </div>
        )}

        {formError && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {formError}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={locked}
            onClick={onClose}
            className="text-sm font-bold px-4 py-2 rounded-md border border-brand-border text-brand-secondary"
          >
            Cerrar
          </button>
          <button
            type="submit"
            disabled={locked}
            className="text-sm font-bold px-4 py-2 rounded-md bg-brand-primary text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : draft.id ? 'Guardar cambios' : 'Crear evento'}
          </button>
        </div>
      </form>
    </div>
  );
};
