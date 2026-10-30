import React, { useEffect, useMemo, useState } from 'react';
import * as dataService from '../../services/dataService';
import { formatDateToYYYYMMDD, getEcuadorDateYmd, parseLocalDate } from '../../utils/formatters';
import type { PrivateCustomEvent } from '../../utils/privateCustomEvent';
import {
  PRIVATE_EVENT_PAYMENT_LABEL,
  PRIVATE_EVENT_STATUS_LABEL,
} from '../../utils/privateCustomEvent';
import { PrivateCustomEventModal } from './PrivateCustomEventModal';

type FilterId = 'upcoming' | 'unpaid' | 'paid' | 'cancelled' | 'all';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'upcoming', label: 'Próximos' },
  { id: 'unpaid', label: 'Por cobrar' },
  { id: 'paid', label: 'Pagados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'all', label: 'Todos' },
];

const STATUS_BADGE: Record<PrivateCustomEvent['status'], string> = {
  confirmed: 'bg-emerald-100 text-emerald-900',
  completed: 'bg-slate-200 text-slate-800',
  cancelled: 'bg-red-100 text-red-800',
};

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

function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function dueOf(event: PrivateCustomEvent): number {
  if (Number.isFinite(event.balanceDue)) return event.balanceDue;
  return Math.max(0, Math.round((event.agreedPrice - event.amountPaid) * 100) / 100);
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

export const PrivateCustomEventsPanel: React.FC = () => {
  const today = getEcuadorDateYmd();
  const [events, setEvents] = useState<PrivateCustomEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<FilterId>('upcoming');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = parseLocalDate(getEcuadorDateYmd());
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PrivateCustomEvent | null>(null);
  const [createDate, setCreateDate] = useState<string | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setEvents(await dataService.listPrivateCustomEvents());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'No se pudo cargar los eventos personalizados.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const occupiedDates = useMemo(() => {
    const dates = new Set<string>();
    for (const event of events) {
      if (event.status !== 'cancelled') dates.add(event.eventDate);
    }
    return dates;
  }, [events]);

  const stats = useMemo(() => {
    const active = events.filter((event) => event.status !== 'cancelled');
    const monthKey = today.slice(0, 7);
    return {
      upcoming: active.filter(
        (event) => event.status !== 'completed' && event.eventDate >= today
      ).length,
      thisMonth: active.filter((event) => event.eventDate.startsWith(monthKey)).length,
      due: active.reduce((sum, event) => sum + dueOf(event), 0),
    };
  }, [events, today]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = events.filter((event) => {
      if (selectedDate && event.eventDate !== selectedDate) return false;
      if (query) {
        const haystack = [
          event.title,
          event.contactName,
          event.phone,
          event.email,
          event.internalNotes,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filter === 'all') return true;
      if (filter === 'cancelled') return event.status === 'cancelled';
      if (filter === 'paid') return event.status !== 'cancelled' && event.paymentStatus === 'paid';
      if (filter === 'unpaid') return event.status !== 'cancelled' && event.paymentStatus !== 'paid';
      return (
        event.status !== 'cancelled' &&
        event.status !== 'completed' &&
        event.eventDate >= today
      );
    });

    return rows.sort((a, b) => {
      if (selectedDate) return a.startTime.localeCompare(b.startTime);
      const aFuture = a.eventDate >= today;
      const bFuture = b.eventDate >= today;
      if (aFuture !== bFuture) return aFuture ? -1 : 1;
      if (aFuture) {
        return a.eventDate.localeCompare(b.eventDate) || a.startTime.localeCompare(b.startTime);
      }
      return b.eventDate.localeCompare(a.eventDate) || a.startTime.localeCompare(b.startTime);
    });
  }, [events, filter, search, selectedDate, today]);

  const groups = useMemo(() => {
    const map = new Map<string, PrivateCustomEvent[]>();
    for (const event of visible) {
      const list = map.get(event.eventDate) ?? [];
      list.push(event);
      map.set(event.eventDate, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  const monthCells = useMemo(
    () => buildMonthCells(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  const openCreate = (date?: string) => {
    setEditing(null);
    setCreateDate(date || selectedDate || today);
    setModalOpen(true);
  };

  const openEdit = (event: PrivateCustomEvent) => {
    setEditing(event);
    setCreateDate(undefined);
    setModalOpen(true);
  };

  const cancelEvent = async (event: PrivateCustomEvent) => {
    const ok = window.confirm(
      `¿Cancelar el evento «${event.title}»? Seguirá visible como cancelado en el historial.`
    );
    if (!ok) return;
    setBusyId(event.id);
    const result = await dataService.cancelPrivateCustomEvent(event.id);
    setBusyId(null);
    if (!result.success) {
      window.alert(result.error || 'No se pudo cancelar el evento.');
      return;
    }
    await load();
  };

  const markPaid = async (event: PrivateCustomEvent) => {
    if (event.agreedPrice <= 0) {
      openEdit(event);
      return;
    }
    const due = dueOf(event);
    if (due <= 0) return;
    setBusyId(event.id);
    const result = await dataService.addPrivateCustomEventPayment({
      id: event.id,
      amount: due,
      method: event.paymentMethod || 'Pago total',
      note: 'Saldo liquidado',
    });
    setBusyId(null);
    if (!result.success) {
      window.alert(result.error || 'No se pudo registrar el pago.');
      return;
    }
    await load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-serif text-brand-accent">Eventos personalizados</h2>
          <p className="text-sm text-brand-secondary mt-1 max-w-2xl">
            Motor interno para grupos privados fuera del catálogo. Aparecen en la agenda del
            calendario con color teal. No ocupan cupos ni bloquean las clases del taller.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="bg-teal-700 text-white font-bold px-4 py-2 rounded-md text-sm hover:bg-teal-800"
        >
          Nuevo evento
        </button>
      </div>

      <div className="mb-4 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900">
        Solo visual en la agenda admin. El cliente no ve estos eventos al reservar online.
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg border border-brand-border bg-brand-background px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-wide text-brand-secondary">
            Próximos
          </div>
          <div className="text-2xl font-bold text-brand-text">{stats.upcoming}</div>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-background px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-wide text-brand-secondary">
            Por cobrar
          </div>
          <div className="text-2xl font-bold text-brand-text">{money(stats.due)}</div>
        </div>
        <div className="rounded-lg border border-brand-border bg-brand-background px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-wide text-brand-secondary">
            Este mes
          </div>
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
                      ? 'bg-teal-700 text-white'
                      : cell.inMonth
                        ? 'text-brand-text hover:bg-brand-background'
                        : 'text-brand-secondary/50 hover:bg-brand-background'
                  } ${isToday && !selected ? 'ring-1 ring-teal-600' : ''}`}
                >
                  {parseLocalDate(cell.ymd).getDate()}
                  {occupied && (
                    <span
                      className={`w-1 h-1 rounded-full ${selected ? 'bg-white' : 'bg-teal-600'}`}
                    />
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
                  filter === item.id
                    ? 'bg-teal-700 text-white'
                    : 'bg-brand-background text-brand-secondary'
                }`}
              >
                {item.label}
              </button>
            ))}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento o contacto"
              className="ml-auto border border-brand-border rounded-md px-3 py-1.5 text-sm min-w-[180px]"
            />
          </div>

          {selectedDate && (
            <div className="flex items-center justify-between gap-2 mb-3 text-sm">
              <span className="font-semibold capitalize text-brand-text">
                {formatDayHeading(selectedDate)}
              </span>
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

          {loading && <p className="text-sm text-brand-secondary">Cargando eventos…</p>}
          {loadError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {loadError}
            </p>
          )}

          {!loading && !loadError && groups.length === 0 && (
            <div className="border border-dashed border-brand-border rounded-lg px-4 py-8 text-center">
              <p className="text-sm text-brand-secondary">
                {search
                  ? 'No hay eventos con ese nombre o contacto.'
                  : 'Todavía no hay eventos en esta vista. Crea uno para grupos privados a medida.'}
              </p>
              <button
                type="button"
                onClick={() => openCreate(selectedDate || undefined)}
                className="mt-3 text-sm font-bold text-teal-800 underline"
              >
                Crear evento personalizado
              </button>
            </div>
          )}

          <div className="space-y-4">
            {groups.map(([date, items]) => (
              <div key={date}>
                {!selectedDate && (
                  <h3 className="text-sm font-bold capitalize text-brand-secondary mb-2">
                    {formatDayHeading(date)}
                  </h3>
                )}
                <ul className="space-y-2">
                  {items.map((event) => {
                    const due = dueOf(event);
                    const busy = busyId === event.id;
                    return (
                      <li
                        key={event.id}
                        className="border border-teal-200 rounded-lg px-4 py-3 bg-teal-50/40"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase bg-teal-200 text-teal-900 px-1.5 py-0.5 rounded">
                                Evento personalizado
                              </span>
                              <span className="font-bold text-brand-text">{event.title}</span>
                            </div>
                            <div className="text-sm text-brand-secondary mt-0.5">
                              {event.startTime}–{event.endTime}
                              {event.participants > 0 ? ` · ${event.participants} pers.` : ''}
                              {event.contactName ? ` · ${event.contactName}` : ''}
                              {event.phone ? ` · ${event.phone}` : ''}
                            </div>
                            {event.internalNotes && (
                              <div className="text-xs text-brand-secondary mt-1">
                                Nota: {event.internalNotes}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end">
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_BADGE[event.status]}`}
                            >
                              {PRIVATE_EVENT_STATUS_LABEL[event.status]}
                            </span>
                            {event.status !== 'cancelled' && (
                              <span
                                className={`text-xs font-bold px-2 py-1 rounded-full ${PAYMENT_BADGE[event.paymentStatus]}`}
                              >
                                {PRIVATE_EVENT_PAYMENT_LABEL[event.paymentStatus]}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="text-brand-text">
                            <span className="font-semibold">{money(event.agreedPrice)}</span>
                            <span className="text-brand-secondary">
                              {' '}
                              · pagado {money(event.amountPaid)}
                              {due > 0 && event.status !== 'cancelled'
                                ? ` · falta ${money(due)}`
                                : event.paymentStatus === 'paid'
                                  ? ' · no debe nada'
                                  : ''}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openEdit(event)}
                              className="text-xs font-bold px-2 py-1 rounded border border-brand-border"
                            >
                              Editar
                            </button>
                            {event.status !== 'cancelled' && event.paymentStatus !== 'paid' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void markPaid(event)}
                                className="text-xs font-bold px-2 py-1 rounded bg-emerald-700 text-white"
                              >
                                Marcar pagado
                              </button>
                            )}
                            {event.status !== 'cancelled' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void cancelEvent(event)}
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

      <PrivateCustomEventModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        initialDate={createDate}
        event={editing}
        onSaved={async (saved, meta) => {
          await load();
          if (meta?.keepOpen) {
            setEditing(saved);
            return;
          }
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
};
