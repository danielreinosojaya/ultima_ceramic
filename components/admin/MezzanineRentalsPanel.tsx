import React, { useEffect, useMemo, useState } from 'react';
import * as dataService from '../../services/dataService';
import { formatDateToYYYYMMDD, getEcuadorDateYmd, parseLocalDate } from '../../utils/formatters';
import type { MezzanineRental, MezzanineRentalStatus } from '../../utils/mezzanineRental';

type FilterId = 'upcoming' | 'unpaid' | 'done' | 'cancelled' | 'all';
type EditorStatus = MezzanineRentalStatus;

interface Draft {
  id?: string;
  contactName: string;
  phone: string;
  email: string;
  rentalDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  agreedPrice: string;
  amountPaid: string;
  paymentMethod: string;
  paymentNotes: string;
  status: EditorStatus;
  internalNotes: string;
}

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'upcoming', label: 'Próximos' },
  { id: 'unpaid', label: 'Por cobrar' },
  { id: 'done', label: 'Realizados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'all', label: 'Todos' },
];

const STATUS_LABEL: Record<MezzanineRentalStatus, string> = {
  hold: 'Apartado',
  confirmed: 'Confirmado',
  completed: 'Realizado',
  cancelled: 'Cancelado',
};

const STATUS_BADGE: Record<MezzanineRentalStatus, string> = {
  hold: 'bg-amber-100 text-amber-950',
  confirmed: 'bg-emerald-100 text-emerald-900',
  completed: 'bg-slate-200 text-slate-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PAYMENT_LABEL = {
  pending: 'Por cobrar',
  partial: 'Abono',
  paid: 'Pagado',
} as const;

const PAYMENT_BADGE = {
  pending: 'bg-rose-100 text-rose-900',
  partial: 'bg-amber-100 text-amber-950',
  paid: 'bg-emerald-100 text-emerald-900',
} as const;

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const TIME_OPTIONS = Array.from({ length: 34 }, (_, i) => {
  const total = 7 * 60 + i * 30;
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

const fieldClass = 'mt-1 w-full border border-brand-border rounded-md px-3 py-2 text-sm bg-white';

function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function dueOf(rental: MezzanineRental): number {
  if (Number.isFinite(rental.balanceDue)) return rental.balanceDue;
  return Math.max(0, Math.round((rental.agreedPrice - rental.amountPaid) * 100) / 100);
}

function formatDayHeading(ymd: string): string {
  return parseLocalDate(ymd).toLocaleDateString('es-EC', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function buildMonthCells(year: number, month: number): { ymd: string; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startPad);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((startPad + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return { ymd: formatDateToYYYYMMDD(date), inMonth: date.getMonth() === month };
  });
}

function emptyDraft(date: string): Draft {
  return {
    contactName: '',
    phone: '',
    email: '',
    rentalDate: date,
    startTime: '10:00',
    endTime: '13:00',
    purpose: '',
    agreedPrice: '',
    amountPaid: '',
    paymentMethod: '',
    paymentNotes: '',
    status: 'confirmed',
    internalNotes: '',
  };
}

function draftFromRental(rental: MezzanineRental): Draft {
  return {
    id: rental.id,
    contactName: rental.contactName,
    phone: rental.phone,
    email: rental.email,
    rentalDate: rental.rentalDate,
    startTime: rental.startTime,
    endTime: rental.endTime,
    purpose: rental.purpose,
    agreedPrice: rental.agreedPrice ? String(rental.agreedPrice) : '',
    amountPaid: rental.amountPaid ? String(rental.amountPaid) : '',
    paymentMethod: rental.paymentMethod,
    paymentNotes: rental.paymentNotes,
    status: rental.status,
    internalNotes: rental.internalNotes,
  };
}

export const MezzanineRentalsPanel: React.FC = () => {
  const today = getEcuadorDateYmd();
  const [rentals, setRentals] = useState<MezzanineRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<FilterId>('upcoming');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = parseLocalDate(getEcuadorDateYmd());
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setRentals(await dataService.listMezzanineRentals());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la agenda del mezzanine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!draft) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setDraft(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft, saving]);

  const occupiedDates = useMemo(() => {
    const dates = new Set<string>();
    for (const rental of rentals) {
      if (rental.status !== 'cancelled') dates.add(rental.rentalDate);
    }
    return dates;
  }, [rentals]);

  const stats = useMemo(() => {
    const active = rentals.filter((rental) => rental.status !== 'cancelled');
    const monthKey = today.slice(0, 7);
    return {
      upcoming: active.filter((rental) => rental.status !== 'completed' && rental.rentalDate >= today).length,
      thisMonth: active.filter((rental) => rental.rentalDate.startsWith(monthKey)).length,
      due: active.reduce((sum, rental) => sum + dueOf(rental), 0),
    };
  }, [rentals, today]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = rentals.filter((rental) => {
      if (selectedDate && rental.rentalDate !== selectedDate) return false;
      if (query) {
        const haystack = [rental.contactName, rental.phone, rental.email, rental.purpose, rental.internalNotes]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filter === 'all') return true;
      if (filter === 'cancelled') return rental.status === 'cancelled';
      if (filter === 'done') return rental.status === 'completed';
      if (filter === 'unpaid') return rental.status !== 'cancelled' && rental.paymentStatus !== 'paid';
      return rental.status !== 'cancelled' && rental.status !== 'completed' && rental.rentalDate >= today;
    });

    return rows.sort((a, b) => {
      if (selectedDate) return a.startTime.localeCompare(b.startTime);
      const aFuture = a.rentalDate >= today;
      const bFuture = b.rentalDate >= today;
      if (aFuture !== bFuture) return aFuture ? -1 : 1;
      if (aFuture) return a.rentalDate.localeCompare(b.rentalDate) || a.startTime.localeCompare(b.startTime);
      return b.rentalDate.localeCompare(a.rentalDate) || a.startTime.localeCompare(b.startTime);
    });
  }, [rentals, filter, search, selectedDate, today]);

  const groups = useMemo(() => {
    const map = new Map<string, MezzanineRental[]>();
    for (const rental of visible) {
      const list = map.get(rental.rentalDate) ?? [];
      list.push(rental);
      map.set(rental.rentalDate, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  const monthCells = useMemo(
    () => buildMonthCells(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  const openCreate = (date?: string) => {
    setFormError('');
    setDraft(emptyDraft(date || selectedDate || today));
  };

  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setFormError('');
    const result = await dataService.saveMezzanineRental({
      id: draft.id,
      contactName: draft.contactName,
      phone: draft.phone,
      email: draft.email,
      rentalDate: draft.rentalDate,
      startTime: draft.startTime,
      endTime: draft.endTime,
      purpose: draft.purpose,
      agreedPrice: draft.agreedPrice,
      amountPaid: draft.amountPaid,
      paymentMethod: draft.paymentMethod,
      paymentNotes: draft.paymentNotes,
      status: draft.status,
      internalNotes: draft.internalNotes,
    });
    setSaving(false);
    if (!result.success) {
      setFormError(result.error || 'No se pudo guardar la reserva.');
      return;
    }
    setDraft(null);
    await load();
  };

  const markPaid = async (rental: MezzanineRental) => {
    if (rental.agreedPrice <= 0) {
      setFormError('');
      setDraft(draftFromRental(rental));
      setFormError('Escribe el precio acordado para poder marcarlo como pagado.');
      return;
    }
    setBusyId(rental.id);
    const result = await dataService.saveMezzanineRental({
      ...rental,
      amountPaid: rental.agreedPrice,
    });
    setBusyId(null);
    if (!result.success) {
      window.alert(result.error || 'No se pudo registrar el pago.');
      return;
    }
    await load();
  };

  const cancelRental = async (rental: MezzanineRental) => {
    const ok = window.confirm(
      `¿Cancelar la reserva de ${rental.contactName}? El horario queda libre en el mezzanine.`
    );
    if (!ok) return;
    setBusyId(rental.id);
    const result = await dataService.cancelMezzanineRental(rental.id);
    setBusyId(null);
    if (!result.success) {
      window.alert(result.error || 'No se pudo cancelar la reserva.');
      return;
    }
    await load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-serif text-brand-accent">Mezzanine</h2>
          <p className="text-sm text-brand-secondary mt-1 max-w-2xl">
            Agenda interna del espacio de arriba. El cliente no reserva por la web: aquí solo queda el control del equipo.
            Estas reservas no ocupan cupos ni bloquean las clases del taller.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="bg-brand-primary text-white font-bold px-4 py-2 rounded-md text-sm"
        >
          Nueva reserva
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg border border-brand-border bg-brand-background px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-wide text-brand-secondary">Próximos</div>
          <div className="text-2xl font-bold text-brand-text">{stats.upcoming}</div>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-background px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-wide text-brand-secondary">Por cobrar</div>
          <div className="text-2xl font-bold text-brand-text">{money(stats.due)}</div>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-background px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-wide text-brand-secondary">Este mes</div>
          <div className="text-2xl font-bold text-brand-text">{stats.thisMonth}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        <section className="border border-brand-border rounded-lg p-3 h-fit">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              className="px-2 py-1 text-sm font-bold text-brand-secondary"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <div className="text-sm font-bold capitalize text-brand-text">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </div>
            <button
              type="button"
              className="px-2 py-1 text-sm font-bold text-brand-secondary"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-brand-secondary mb-1">
            {WEEKDAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell) => {
              const selected = selectedDate === cell.ymd;
              const isToday = cell.ymd === today;
              const occupied = occupiedDates.has(cell.ymd);
              return (
                <button
                  key={cell.ymd}
                  type="button"
                  onClick={() => {
                    setSelectedDate(cell.ymd);
                    setFilter('all');
                    if (!cell.inMonth) {
                      const picked = parseLocalDate(cell.ymd);
                      setCursor(new Date(picked.getFullYear(), picked.getMonth(), 1));
                    }
                  }}
                  className={`h-9 rounded-md text-xs font-semibold flex flex-col items-center justify-center ${
                    selected
                      ? 'bg-brand-primary text-white'
                      : cell.inMonth
                        ? 'text-brand-text hover:bg-brand-background'
                        : 'text-brand-secondary/50 hover:bg-brand-background'
                  } ${isToday && !selected ? 'ring-1 ring-brand-accent' : ''}`}
                >
                  {parseLocalDate(cell.ymd).getDate()}
                  {occupied && (
                    <span className={`w-1 h-1 rounded-full ${selected ? 'bg-white' : 'bg-brand-accent'}`} />
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="mt-3 w-full text-xs font-bold text-brand-secondary underline"
            onClick={() => {
              const now = parseLocalDate(today);
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelectedDate(today);
              setFilter('all');
            }}
          >
            Ir a hoy
          </button>
        </section>

        <section>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  filter === item.id ? 'bg-brand-primary text-white' : 'bg-brand-background text-brand-secondary'
                }`}
              >
                {item.label}
              </button>
            ))}
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nombre o teléfono"
              className="ml-auto border border-brand-border rounded-md px-3 py-1.5 text-sm min-w-[180px]"
            />
          </div>

          {selectedDate && (
            <div className="flex items-center justify-between gap-2 mb-3 text-sm">
              <span className="font-semibold capitalize text-brand-text">{formatDayHeading(selectedDate)}</span>
              <button
                type="button"
                className="text-xs font-bold text-brand-secondary underline"
                onClick={() => {
                  setSelectedDate(null);
                  setFilter('upcoming');
                }}
              >
                Ver toda la agenda
              </button>
            </div>
          )}

          {loading && <p className="text-sm text-brand-secondary">Cargando agenda…</p>}
          {loadError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{loadError}</p>
          )}

          {!loading && !loadError && groups.length === 0 && (
            <div className="border border-dashed border-brand-border rounded-lg px-4 py-8 text-center">
              <p className="text-sm text-brand-secondary">
                {search
                  ? 'No hay reservas con ese nombre o teléfono.'
                  : 'Todavía no hay reservas en esta vista. Cuando acuerdes un alquiler, regístralo aquí.'}
              </p>
              <button
                type="button"
                onClick={() => openCreate(selectedDate || undefined)}
                className="mt-3 text-sm font-bold text-brand-accent underline"
              >
                Registrar reserva
              </button>
            </div>
          )}

          <div className="space-y-4">
            {groups.map(([date, items]) => (
              <div key={date}>
                {!selectedDate && (
                  <h3 className="text-sm font-bold capitalize text-brand-secondary mb-2">{formatDayHeading(date)}</h3>
                )}
                <ul className="space-y-2">
                  {items.map((rental) => {
                    const due = dueOf(rental);
                    const busy = busyId === rental.id;
                    return (
                      <li key={rental.id} className="border border-brand-border rounded-lg px-4 py-3 bg-white">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-brand-text">{rental.contactName}</div>
                            <div className="text-sm text-brand-secondary">
                              {rental.startTime}–{rental.endTime}
                              {rental.phone ? ` · ${rental.phone}` : ''}
                              {rental.email ? ` · ${rental.email}` : ''}
                            </div>
                            {rental.purpose && <div className="text-sm text-brand-text mt-1">{rental.purpose}</div>}
                            {rental.internalNotes && (
                              <div className="text-xs text-brand-secondary mt-1">Nota: {rental.internalNotes}</div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_BADGE[rental.status]}`}>
                              {STATUS_LABEL[rental.status]}
                            </span>
                            {rental.status !== 'cancelled' && (
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${PAYMENT_BADGE[rental.paymentStatus]}`}>
                                {PAYMENT_LABEL[rental.paymentStatus]}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="text-brand-text">
                            <span className="font-semibold">{money(rental.agreedPrice)}</span>
                            <span className="text-brand-secondary">
                              {' '}· pagado {money(rental.amountPaid)}
                              {due > 0 && rental.status !== 'cancelled' ? ` · falta ${money(due)}` : ''}
                            </span>
                            {rental.paymentNotes && (
                              <div className="text-xs text-brand-secondary">{rental.paymentNotes}</div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setFormError('');
                                setDraft(draftFromRental(rental));
                              }}
                              className="text-xs font-bold px-2 py-1 rounded border border-brand-border"
                            >
                              Editar
                            </button>
                            {rental.status !== 'cancelled' && rental.paymentStatus !== 'paid' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void markPaid(rental)}
                                className="text-xs font-bold px-2 py-1 rounded bg-emerald-700 text-white"
                              >
                                Marcar pagado
                              </button>
                            )}
                            {rental.status !== 'cancelled' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void cancelRental(rental)}
                                className="text-xs font-bold px-2 py-1 rounded text-red-700"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      {draft && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
          onClick={() => {
            if (!saving) setDraft(null);
          }}
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={saveDraft}
            className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5"
          >
            <h3 className="text-lg font-serif text-brand-accent mb-1">
              {draft.id ? 'Editar reserva' : 'Nueva reserva del mezzanine'}
            </h3>
            <p className="text-xs text-brand-secondary mb-4">
              Un día por reserva. Si ocupa varios días, crea una por cada día. El taller de abajo sigue disponible.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block sm:col-span-2 text-sm font-semibold text-brand-text">
                Quién alquila
                <input
                  required
                  value={draft.contactName}
                  onChange={(event) => setDraft({ ...draft, contactName: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Teléfono
                <input
                  value={draft.phone}
                  onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Correo
                <input
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                  className={fieldClass}
                  placeholder="Opcional"
                />
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Fecha
                <input
                  type="date"
                  required
                  value={draft.rentalDate}
                  onChange={(event) => setDraft({ ...draft, rentalDate: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Estado
                <select
                  value={draft.status}
                  onChange={(event) => setDraft({ ...draft, status: event.target.value as EditorStatus })}
                  className={fieldClass}
                >
                  <option value="hold">Apartado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="completed">Realizado</option>
                  {draft.status === 'cancelled' && <option value="cancelled">Cancelado</option>}
                </select>
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Empieza
                <select
                  value={draft.startTime}
                  onChange={(event) => {
                    const startTime = event.target.value;
                    const endTime = draft.endTime > startTime
                      ? draft.endTime
                      : TIME_OPTIONS.find((time) => time > startTime) || draft.endTime;
                    setDraft({ ...draft, startTime, endTime });
                  }}
                  className={fieldClass}
                >
                  {TIME_OPTIONS.slice(0, -1).map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Termina
                <select
                  value={draft.endTime}
                  onChange={(event) => setDraft({ ...draft, endTime: event.target.value })}
                  className={fieldClass}
                >
                  {TIME_OPTIONS.filter((time) => time > draft.startTime).map((time) => (
                    <option key={`end-${time}`} value={time}>{time}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Precio acordado
                <input
                  inputMode="decimal"
                  value={draft.agreedPrice}
                  onChange={(event) => setDraft({ ...draft, agreedPrice: event.target.value })}
                  className={fieldClass}
                  placeholder="0.00"
                />
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Ya pagado
                <input
                  inputMode="decimal"
                  value={draft.amountPaid}
                  onChange={(event) => setDraft({ ...draft, amountPaid: event.target.value })}
                  className={fieldClass}
                  placeholder="0.00"
                />
              </label>
              <label className="block sm:col-span-2 text-sm font-semibold text-brand-text">
                Cómo pagó
                <select
                  value={draft.paymentMethod}
                  onChange={(event) => setDraft({ ...draft, paymentMethod: event.target.value })}
                  className={fieldClass}
                >
                  <option value="">Sin registrar</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
              <label className="block sm:col-span-2 text-sm font-semibold text-brand-text">
                Nota de pago
                <input
                  value={draft.paymentNotes}
                  onChange={(event) => setDraft({ ...draft, paymentNotes: event.target.value })}
                  className={fieldClass}
                  placeholder="Abono, saldo pendiente, referencia…"
                />
              </label>
              <label className="block sm:col-span-2 text-sm font-semibold text-brand-text">
                Para qué lo usa
                <input
                  value={draft.purpose}
                  onChange={(event) => setDraft({ ...draft, purpose: event.target.value })}
                  className={fieldClass}
                  placeholder="Opcional"
                />
              </label>
              <label className="block sm:col-span-2 text-sm font-semibold text-brand-text">
                Notas internas
                <textarea
                  value={draft.internalNotes}
                  onChange={(event) => setDraft({ ...draft, internalNotes: event.target.value })}
                  className={fieldClass}
                  rows={3}
                />
              </label>
            </div>

            {formError && (
              <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{formError}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDraft(null)}
                className="px-4 py-2 text-sm font-bold text-brand-secondary"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-brand-primary text-white font-bold px-4 py-2 rounded-md text-sm disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar reserva'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
