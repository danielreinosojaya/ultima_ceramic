import React, { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import Papa from 'papaparse';
import type { Booking, PaymentDetails, AdminTab, InvoiceRequest } from '../../types.js';
import * as dataService from '../../services/dataService.js';
import { AcceptPaymentModal } from './AcceptPaymentModal.js';
import { InvoiceReminderModal } from './InvoiceReminderModal.js';
import { DeleteConfirmationModal } from './DeleteConfirmationModal.js';
import { EditPaymentModal } from './EditPaymentModal';
import { useAdminData } from '../../context/AdminDataContext';
import {
  buildSnapshot,
  clientName,
  filterMovements,
  formatDelta,
  formatMoney,
  CATEGORY_LABEL,
  formatStudioDate,
  getPeriodWindow,
  inRange,
  openBalances,
  asDate,
  type DayBucket,
  type PeriodKey,
  type SaleCategory,
} from './financeModel.js';

type FinanceView = 'summary' | 'open';
type OpenScope = 'all' | 'period';
type OpenSort = 'amount' | 'expires' | 'recent';

interface NavigationState {
  tab: AdminTab;
  targetId: string;
}

interface FinancialDashboardProps {
  bookings: Booking[];
  invoiceRequests: InvoiceRequest[];
  onDataChange: () => void;
  setNavigateTo: React.Dispatch<React.SetStateAction<NavigationState | null>>;
}

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'lastMonth', label: 'Mes pasado' },
];

const PAGE_SIZE = 12;

const toneClass = (tone: 'up' | 'down' | 'flat') => {
  if (tone === 'up') return 'text-green-700';
  if (tone === 'down') return 'text-red-700';
  return 'text-brand-secondary';
};

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  bookings: allBookings,
  invoiceRequests,
  onDataChange,
  setNavigateTo,
}) => {
  const adminData = useAdminData();
  const [view, setView] = useState<FinanceView>('summary');
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [showCustom, setShowCustom] = useState(false);
  const [category, setCategory] = useState<SaleCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [focusDayKey, setFocusDayKey] = useState<string | null>(null);
  const [productFocus, setProductFocus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [openScope, setOpenScope] = useState<OpenScope>('all');
  const [openSort, setOpenSort] = useState<OpenSort>('amount');
  const [openQuery, setOpenQuery] = useState('');
  const [openPage, setOpenPage] = useState(1);

  const [bookingToPay, setBookingToPay] = useState<Booking | null>(null);
  const [bookingForReminder, setBookingForReminder] = useState<Booking | null>(null);
  const [isInvoiceReminderOpen, setIsInvoiceReminderOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [bookingToViewDates, setBookingToViewDates] = useState<Booking | null>(null);
  const [paymentToEdit, setPaymentToEdit] = useState<{ payment: PaymentDetails; bookingId: string; index: number } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartClickRef = useRef<(key: string) => void>(() => {});

  const windowRange = useMemo(() => getPeriodWindow(period, customRange), [period, customRange]);

  const categoryOptions = useMemo(() => {
    if (!windowRange.ready) return [];
    return buildSnapshot(allBookings, windowRange.current, 'all').categories.filter((row) => row.sold > 0);
  }, [allBookings, windowRange]);

  const activeCategory: SaleCategory | 'all' = category === 'all' || categoryOptions.some((row) => row.category === category)
    ? category
    : 'all';

  const snapshot = useMemo(() => {
    if (!windowRange.ready) return null;
    return buildSnapshot(allBookings, windowRange.current, activeCategory);
  }, [allBookings, windowRange, activeCategory]);

  const previousTotals = useMemo(() => {
    if (!windowRange.ready) return null;
    return buildSnapshot(allBookings, windowRange.previous, activeCategory);
  }, [allBookings, windowRange, activeCategory]);

  const openRows = useMemo(() => openBalances(allBookings), [allBookings]);
  const openTotal = roundList(openRows.reduce((sum, row) => sum + row.pending, 0));

  const focusDay = snapshot?.days.find((day) => day.key === focusDayKey) || null;

  const visibleMovements = useMemo(() => {
    if (!snapshot) return [];
    return filterMovements(snapshot.movements, { query, day: focusDay, product: productFocus });
  }, [snapshot, query, focusDay, productFocus]);

  const movementTotal = roundList(visibleMovements.reduce((sum, movement) => sum + movement.amount, 0));
  const movementPages = Math.max(1, Math.ceil(visibleMovements.length / PAGE_SIZE));
  const movementPage = Math.min(page, movementPages);
  const pagedMovements = visibleMovements.slice((movementPage - 1) * PAGE_SIZE, movementPage * PAGE_SIZE);

  const visibleOpen = useMemo(() => {
    const q = openQuery.trim().toLowerCase();
    let rows = openRows.filter((row) => {
      if (openScope === 'period') {
        if (!windowRange.ready) return false;
        const created = asDate(row.booking.createdAt);
        if (!created || !inRange(created, windowRange.current)) return false;
      }
      if (!q) return true;
      const haystack = [
        clientName(row.booking),
        row.booking.userInfo?.email,
        row.booking.bookingCode,
        row.productName,
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
    rows = [...rows].sort((a, b) => {
      if (openSort === 'expires') {
        const ae = asDate(a.booking.expiresAt)?.getTime() ?? Number.POSITIVE_INFINITY;
        const be = asDate(b.booking.expiresAt)?.getTime() ?? Number.POSITIVE_INFINITY;
        return ae - be;
      }
      if (openSort === 'recent') {
        return (asDate(b.booking.createdAt)?.getTime() || 0) - (asDate(a.booking.createdAt)?.getTime() || 0);
      }
      return b.pending - a.pending;
    });
    return rows;
  }, [openRows, openQuery, openScope, openSort, windowRange]);

  const openPages = Math.max(1, Math.ceil(visibleOpen.length / PAGE_SIZE));
  const safeOpenPage = Math.min(openPage, openPages);
  const pagedOpen = visibleOpen.slice((safeOpenPage - 1) * PAGE_SIZE, safeOpenPage * PAGE_SIZE);
  const visibleOpenTotal = roundList(visibleOpen.reduce((sum, row) => sum + row.pending, 0));

  chartClickRef.current = (key: string) => {
    setFocusDayKey((current) => (current === key ? null : key));
    setPage(1);
  };

  useEffect(() => {
    if (view !== 'summary' || !snapshot || !chartRef.current || snapshot.collected <= 0) return;
    const existing = Chart.getChart(chartRef.current);
    if (existing) existing.destroy();
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: snapshot.days.map((day) => day.label),
        datasets: [{
          label: 'Cobrado',
          data: snapshot.days.map((day) => day.amount),
          backgroundColor: snapshot.days.map((day) => {
            if (focusDayKey === day.key) return '#4A4540';
            return day.amount > 0 ? '#828E98' : '#E4E2DC';
          }),
          borderRadius: 6,
          maxBarThickness: 28,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 280 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => formatMoney(Number(item.raw) || 0),
            },
          },
        },
        onClick: (_event, elements) => {
          const index = elements[0]?.index;
          if (index === undefined) return;
          const day = snapshot.days[index];
          if (day) chartClickRef.current(day.key);
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#958985', maxRotation: 0, autoSkip: true, font: { size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: '#F4F2F1' },
            ticks: { color: '#958985', font: { size: 11 }, callback: (value) => `$${value}` },
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [view, snapshot, focusDayKey]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const choosePeriod = (next: PeriodKey) => {
    setPeriod(next);
    if (next !== 'custom') setShowCustom(false);
    setFocusDayKey(null);
    setProductFocus(null);
    setPage(1);
  };

  const chooseCategory = (next: SaleCategory | 'all') => {
    setCategory(next);
    setProductFocus(null);
    setFocusDayKey(null);
    setPage(1);
  };

  const exportCsv = () => {
    const rows = visibleMovements.map((movement) => ({
      Fecha: formatStudioDate(movement.date),
      Cliente: clientName(movement.booking),
      Email: movement.booking.userInfo?.email || '',
      Codigo: movement.booking.bookingCode || '',
      Clase: movement.productName,
      Tipo: CATEGORY_LABEL[movement.category],
      Metodo: movement.methodLabel,
      Cobrado: movement.amount.toFixed(2),
    }));
    const csv = Papa.unparse(rows, { quotes: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'finanzas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAcceptPaymentClick = (booking: Booking) => {
    const pendingInvoice = invoiceRequests.find((request) => request.bookingId === booking.id && request.status === 'Pending');
    if (pendingInvoice) {
      setBookingForReminder(booking);
      setIsInvoiceReminderOpen(true);
      return;
    }
    setBookingToPay(booking);
  };

  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return;
    const result = await dataService.deleteBooking(bookingToDelete.id) as { success: boolean; error?: string };
    if (!result?.success) {
      const message = result?.error || 'No se pudo eliminar la reserva';
      setFeedback({ type: 'error', text: message });
      throw new Error(message);
    }
    adminData.optimisticRemoveBooking(bookingToDelete.id);
    setFeedback({ type: 'success', text: 'Reserva eliminada' });
  };

  const handleGoToInvoicing = () => {
    if (!bookingForReminder) return;
    const request = invoiceRequests.find((item) => item.bookingId === bookingForReminder.id);
    if (request) setNavigateTo({ tab: 'invoicing', targetId: request.id });
    setIsInvoiceReminderOpen(false);
    setBookingForReminder(null);
  };

  const notes = snapshot ? buildNotes(snapshot) : [];
  const soldDelta = snapshot && previousTotals ? formatDelta(snapshot.sold, previousTotals.sold, windowRange.previous.shortLabel) : null;
  const collectedDelta = snapshot && previousTotals ? formatDelta(snapshot.collected, previousTotals.collected, windowRange.previous.shortLabel) : null;
  const otherOpen = snapshot ? roundList(Math.max(0, openTotal - snapshot.pendingOfPeriod)) : 0;
  const maxProduct = snapshot?.topProducts[0]?.sold || 1;
  const maxMethod = snapshot?.methods[0]?.amount || 1;

  return (
    <div>
      {bookingToViewDates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-3 right-3 text-brand-secondary text-xl leading-none" onClick={() => setBookingToViewDates(null)} aria-label="Cerrar" type="button">×</button>
            <h3 className="text-lg font-bold mb-4 text-brand-text">Fechas de la reserva</h3>
            {bookingToViewDates.slots?.length ? (
              <ul className="space-y-2">
                {bookingToViewDates.slots.map((slot, index) => (
                  <li key={`${slot.date}-${slot.time}-${index}`} className="text-brand-text">
                    {new Date(`${slot.date}T12:00:00`).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })} · {slot.time}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-brand-secondary">Esta reserva todavía no tiene fechas.</p>
            )}
          </div>
        </div>
      )}
      {bookingToPay && (
        <AcceptPaymentModal isOpen={!!bookingToPay} onClose={() => setBookingToPay(null)} booking={bookingToPay} onDataChange={onDataChange} />
      )}
      {isInvoiceReminderOpen && (
        <InvoiceReminderModal
          isOpen={isInvoiceReminderOpen}
          onClose={() => setIsInvoiceReminderOpen(false)}
          onProceed={() => {
            if (bookingForReminder) setBookingToPay(bookingForReminder);
            setIsInvoiceReminderOpen(false);
            setBookingForReminder(null);
          }}
          onGoToInvoicing={handleGoToInvoicing}
        />
      )}
      {bookingToDelete && (
        <DeleteConfirmationModal
          isOpen={!!bookingToDelete}
          onClose={() => setBookingToDelete(null)}
          onConfirm={handleDeleteBooking}
          title="¿Eliminar reserva?"
          message={`Se eliminará la reserva de ${clientName(bookingToDelete)}. Esta acción no se puede deshacer.`}
        />
      )}
      {paymentToEdit && (
        <EditPaymentModal
          isOpen={!!paymentToEdit}
          payment={paymentToEdit.payment}
          paymentIndex={paymentToEdit.index}
          bookingId={paymentToEdit.bookingId}
          onClose={() => setPaymentToEdit(null)}
          onSave={async (updated) => {
            const identifier = paymentToEdit.payment.id || paymentToEdit.index;
            await dataService.updatePaymentDetails(paymentToEdit.bookingId, identifier, updated);
            adminData.optimisticUpdateBookingPayment(paymentToEdit.bookingId, identifier, updated);
            setPaymentToEdit(null);
          }}
        />
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5">
        <div>
          <h2 className="text-2xl font-serif text-brand-text">Finanzas</h2>
          <p className="text-sm text-brand-secondary mt-1">
            {windowRange.ready ? (
              <>
                <span className="text-brand-text font-semibold">{windowRange.current.label}</span>
                <span> · comparado con {windowRange.previous.label}</span>
              </>
            ) : 'Elige el inicio y el fin del rango'}
          </p>
        </div>
        <div className="inline-flex rounded-full bg-brand-background p-1 self-start" role="tablist" aria-label="Vista">
          <button type="button" onClick={() => setView('summary')} className={viewButtonClass(view === 'summary')} role="tab" aria-selected={view === 'summary'}>Resumen</button>
          <button
            type="button"
            onClick={() => { setView('open'); setOpenScope('all'); }}
            className={viewButtonClass(view === 'open')}
            role="tab"
            aria-selected={view === 'open'}
          >
            Por cobrar{openTotal > 0 ? ` · ${formatMoney(openTotal)}` : ''}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {PERIODS.map((item) => (
          <button key={item.id} type="button" onClick={() => choosePeriod(item.id)} className={chipClass(period === item.id)} aria-pressed={period === item.id}>
            {item.label}
          </button>
        ))}
        <button type="button" onClick={() => setShowCustom((open) => !open)} className={chipClass(period === 'custom' || showCustom)} aria-pressed={period === 'custom'}>
          Fechas
        </button>
      </div>

      {(showCustom || period === 'custom') && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <label className="text-sm text-brand-secondary">
            Desde
            <input
              type="date"
              value={customRange.start}
              onChange={(event) => {
                const start = event.target.value;
                setCustomRange((current) => ({ ...current, start }));
                if (start && customRange.end) {
                  setPeriod('custom');
                  setFocusDayKey(null);
                  setPage(1);
                }
              }}
              className="ml-2 text-sm p-1.5 border border-brand-border rounded-md text-brand-text"
            />
          </label>
          <label className="text-sm text-brand-secondary">
            Hasta
            <input
              type="date"
              value={customRange.end}
              onChange={(event) => {
                const end = event.target.value;
                setCustomRange((current) => ({ ...current, end }));
                if (customRange.start && end) {
                  setPeriod('custom');
                  setFocusDayKey(null);
                  setPage(1);
                }
              }}
              className="ml-2 text-sm p-1.5 border border-brand-border rounded-md text-brand-text"
            />
          </label>
        </div>
      )}

      {view === 'summary' && snapshot && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <Metric
              label="Vendido"
              hint="Reservas creadas en este periodo"
              value={formatMoney(snapshot.sold)}
              detail={snapshot.bookingCount > 0 ? `${snapshot.bookingCount} reservas · ticket ${formatMoney(snapshot.averageTicket)}` : 'Sin reservas creadas'}
              delta={soldDelta?.text}
              tone={soldDelta?.tone}
            />
            <Metric
              label="Cobrado"
              hint="Pagos que entraron en este periodo"
              value={formatMoney(snapshot.collected)}
              delta={collectedDelta?.text}
              tone={collectedDelta?.tone}
            />
            <button
              type="button"
              onClick={() => { setView('open'); setOpenScope('period'); setOpenPage(1); }}
              className="text-left bg-white border border-brand-border rounded-xl p-4 hover:border-brand-primary transition-colors"
            >
              <p className="text-sm font-semibold text-brand-secondary">Por cobrar</p>
              <p className="text-xs text-brand-secondary mt-0.5">Saldo de las reservas de este periodo</p>
              <p className="text-3xl font-bold text-brand-text mt-2 tabular-nums">{formatMoney(snapshot.pendingOfPeriod)}</p>
              <p className="text-xs mt-2 text-brand-secondary">
                {otherOpen > 0 ? `También hay ${formatMoney(otherOpen)} de otras fechas` : 'Nada pendiente de otras fechas'}
              </p>
            </button>
          </div>

          {notes.length > 0 && (
            <div className="mb-4 space-y-1">
              {notes.map((note) => (
                <p key={note} className="text-sm text-brand-secondary">{note}</p>
              ))}
            </div>
          )}

          {categoryOptions.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary mb-2">Vendido por tipo</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button type="button" onClick={() => chooseCategory('all')} className={`${chipClass(activeCategory === 'all')} shrink-0`} aria-pressed={activeCategory === 'all'}>
                  Todas · {formatMoney(categoryOptions.reduce((sum, row) => sum + row.sold, 0))}
                </button>
                {categoryOptions.map((row) => (
                  <button key={row.category} type="button" onClick={() => chooseCategory(row.category)} className={`${chipClass(activeCategory === row.category)} shrink-0`} aria-pressed={activeCategory === row.category}>
                    {row.label} · {formatMoney(row.sold)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {snapshot.sold === 0 && snapshot.collected === 0 ? (
            <div className="bg-white border border-brand-border rounded-xl p-8 text-center">
              <p className="text-brand-text font-semibold">Nada vendido ni cobrado en este periodo</p>
              {openTotal > 0 && (
                <button type="button" onClick={() => setView('open')} className="mt-3 text-sm font-semibold text-brand-primary underline">
                  Hay {formatMoney(openTotal)} por cobrar de otras fechas
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
                <section className="lg:col-span-3 bg-white border border-brand-border rounded-xl p-4">
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-brand-text">Dinero cobrado por día</h3>
                    <p className="text-xs text-brand-secondary">Toca una barra para ver esos cobros</p>
                  </div>
                  {snapshot.collected > 0 ? (
                    <div className="relative h-56">
                      <canvas ref={chartRef} />
                    </div>
                  ) : (
                    <p className="text-sm text-brand-secondary py-10 text-center">
                      Hay ventas en este periodo, pero el dinero entró en otras fechas.
                    </p>
                  )}
                </section>

                <section className="lg:col-span-2 bg-white border border-brand-border rounded-xl p-4">
                  <h3 className="font-semibold text-brand-text mb-3">Más vendidas</h3>
                  {snapshot.topProducts.length === 0 ? (
                    <p className="text-sm text-brand-secondary">Sin ventas en este periodo.</p>
                  ) : (
                    <ul className="space-y-3">
                      {snapshot.topProducts.map((product) => {
                        const active = productFocus === product.name;
                        return (
                          <li key={product.name}>
                            <button
                              type="button"
                              onClick={() => { setProductFocus(active ? null : product.name); setPage(1); }}
                              className={`w-full text-left rounded-lg px-2 py-1.5 ${active ? 'bg-brand-background' : 'hover:bg-brand-background/70'}`}
                              aria-pressed={active}
                            >
                              <div className="flex items-baseline justify-between gap-3">
                                <span className="text-sm font-semibold text-brand-text truncate">{product.name}</span>
                                <span className="text-sm font-bold text-brand-text tabular-nums shrink-0">{formatMoney(product.sold)}</span>
                              </div>
                              <div className="mt-1.5 h-1.5 rounded-full bg-brand-background">
                                <div className="h-1.5 rounded-full bg-brand-primary" style={{ width: `${Math.max(6, (product.sold / maxProduct) * 100)}%` }} />
                              </div>
                              <p className="text-xs text-brand-secondary mt-1">{product.count} {product.count === 1 ? 'reserva' : 'reservas'}</p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {snapshot.methods.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-brand-border">
                      <h3 className="font-semibold text-brand-text mb-3">Cómo se pagó</h3>
                      <ul className="space-y-2.5">
                        {snapshot.methods.map((method) => (
                          <li key={method.label}>
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="text-brand-text">{method.label}</span>
                              <span className="font-semibold tabular-nums text-brand-text">{formatMoney(method.amount)}</span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-brand-background">
                              <div className="h-1.5 rounded-full bg-brand-accent" style={{ width: `${Math.max(6, (method.amount / maxMethod) * 100)}%` }} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              </div>

              <section className="bg-white border border-brand-border rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-brand-text">Cobros</h3>
                    <p className="text-xs text-brand-secondary mt-0.5">{visibleMovements.length} {visibleMovements.length === 1 ? 'pago' : 'pagos'} · {formatMoney(movementTotal)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                      placeholder="Buscar cliente, código o clase"
                      className="text-sm px-3 py-1.5 border border-brand-border rounded-lg w-full sm:w-64"
                      aria-label="Buscar cobros"
                    />
                    <button type="button" onClick={exportCsv} disabled={visibleMovements.length === 0} className="text-sm font-semibold bg-brand-primary text-white px-3 py-1.5 rounded-lg disabled:opacity-40">
                      Exportar
                    </button>
                  </div>
                </div>

                {(focusDay || productFocus) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {focusDay && (
                      <button type="button" onClick={() => setFocusDayKey(null)} className="text-xs font-semibold bg-brand-background text-brand-text px-2.5 py-1 rounded-full">
                        {focusDay.label} ×
                      </button>
                    )}
                    {productFocus && (
                      <button type="button" onClick={() => setProductFocus(null)} className="text-xs font-semibold bg-brand-background text-brand-text px-2.5 py-1 rounded-full">
                        {productFocus} ×
                      </button>
                    )}
                  </div>
                )}

                {pagedMovements.length === 0 ? (
                  <p className="text-sm text-brand-secondary py-8 text-center">No hay cobros con este filtro.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-brand-secondary border-b border-brand-border">
                          <th className="py-2 pr-3 font-semibold">Fecha</th>
                          <th className="py-2 pr-3 font-semibold">Cliente</th>
                          <th className="py-2 pr-3 font-semibold">Clase</th>
                          <th className="py-2 pr-3 font-semibold">Cómo</th>
                          <th className="py-2 pr-3 font-semibold text-right">Cobrado</th>
                          <th className="py-2 font-semibold text-right"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedMovements.map((movement) => (
                          <tr key={movement.key} className="border-b border-brand-background last:border-0">
                            <td className="py-2.5 pr-3 text-sm text-brand-text whitespace-nowrap" title={movement.dateAssumed ? 'El pago no tenía fecha. Se usa la fecha de la reserva.' : undefined}>
                              {formatStudioDate(movement.date)}
                            </td>
                            <td className="py-2.5 pr-3 text-sm">
                              <button type="button" onClick={() => setNavigateTo({ tab: 'customers', targetId: movement.booking.userInfo?.email || '' })} className="font-semibold text-brand-text hover:underline text-left">
                                {clientName(movement.booking)}
                              </button>
                              <div className="text-xs text-brand-secondary">{movement.booking.bookingCode}</div>
                            </td>
                            <td className="py-2.5 pr-3 text-sm text-brand-text">{movement.productName}</td>
                            <td className="py-2.5 pr-3 text-sm text-brand-secondary">{movement.methodLabel}</td>
                            <td className="py-2.5 pr-3 text-sm font-bold text-brand-text text-right tabular-nums whitespace-nowrap">{formatMoney(movement.amount)}</td>
                            <td className="py-2.5 text-right">
                              {movement.payment && (
                                <button type="button" onClick={() => setPaymentToEdit({ payment: movement.payment!, bookingId: movement.booking.id, index: movement.paymentIndex })} className="text-xs font-semibold text-brand-primary hover:underline">
                                  Editar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {visibleMovements.length > PAGE_SIZE && (
                  <Pager page={movementPage} pages={movementPages} onPage={setPage} />
                )}
              </section>
            </>
          )}
        </div>
      )}

      {view === 'summary' && !windowRange.ready && (
        <div className="bg-white border border-brand-border rounded-xl p-8 text-center text-brand-secondary">
          Elige desde y hasta para ver ese rango.
        </div>
      )}

      {view === 'open' && (
        <div className="animate-fade-in">
          <div className="bg-white border border-brand-border rounded-xl p-4 mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-brand-secondary">{openScope === 'period' && windowRange.ready ? `De ${windowRange.current.label}` : 'Todo lo que falta por cobrar'}</p>
              <p className="text-3xl font-bold text-brand-text tabular-nums mt-1">{formatMoney(visibleOpenTotal)}</p>
              <p className="text-xs text-brand-secondary mt-1">{visibleOpen.length} {visibleOpen.length === 1 ? 'reserva' : 'reservas'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setOpenScope('all'); setOpenPage(1); }} className={chipClass(openScope === 'all')} aria-pressed={openScope === 'all'}>Todo lo abierto</button>
              <button type="button" onClick={() => { setOpenScope('period'); setOpenPage(1); }} className={chipClass(openScope === 'period')} aria-pressed={openScope === 'period'}>De este periodo</button>
            </div>
          </div>

          <div className="bg-white border border-brand-border rounded-xl p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <input
                type="search"
                value={openQuery}
                onChange={(event) => { setOpenQuery(event.target.value); setOpenPage(1); }}
                placeholder="Buscar cliente o código"
                className="text-sm px-3 py-1.5 border border-brand-border rounded-lg w-full sm:w-64"
                aria-label="Buscar por cobrar"
              />
              <label className="text-sm text-brand-secondary">
                Orden
                <select
                  value={openSort}
                  onChange={(event) => { setOpenSort(event.target.value as OpenSort); setOpenPage(1); }}
                  className="ml-2 text-sm p-1.5 border border-brand-border rounded-lg text-brand-text"
                >
                  <option value="amount">Mayor saldo</option>
                  <option value="expires">Vence antes</option>
                  <option value="recent">Más recientes</option>
                </select>
              </label>
            </div>

            {openScope === 'period' && !windowRange.ready ? (
              <p className="text-sm text-brand-secondary py-10 text-center">Elige las fechas del periodo para ver ese saldo.</p>
            ) : pagedOpen.length === 0 ? (
              <p className="text-sm text-brand-secondary py-10 text-center">No hay saldos pendientes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-brand-secondary border-b border-brand-border">
                      <th className="py-2 pr-3 font-semibold">Cliente</th>
                      <th className="py-2 pr-3 font-semibold">Clase</th>
                      <th className="py-2 pr-3 font-semibold text-right">Precio</th>
                      <th className="py-2 pr-3 font-semibold text-right">Pagado</th>
                      <th className="py-2 pr-3 font-semibold text-right">Falta</th>
                      <th className="py-2 pr-3 font-semibold">Plazo</th>
                      <th className="py-2 font-semibold text-right"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedOpen.map((row) => {
                      const expires = asDate(row.booking.expiresAt);
                      const remaining = expires ? expires.getTime() - Date.now() : null;
                      return (
                        <tr key={row.booking.id} className="border-b border-brand-background last:border-0">
                          <td className="py-2.5 pr-3 text-sm">
                            <div className="font-semibold text-brand-text">{clientName(row.booking)}</div>
                            <div className="text-xs text-brand-secondary">{row.booking.bookingCode}</div>
                          </td>
                          <td className="py-2.5 pr-3 text-sm text-brand-text">
                            {row.productName}
                            {(!row.booking.slots || row.booking.slots.length === 0) && (
                              <div className="text-xs text-brand-secondary">Sin fechas</div>
                            )}
                          </td>
                          <td className="py-2.5 pr-3 text-sm text-right tabular-nums text-brand-text">{formatMoney(row.price)}</td>
                          <td className="py-2.5 pr-3 text-sm text-right tabular-nums text-brand-secondary">{formatMoney(row.paid)}</td>
                          <td className="py-2.5 pr-3 text-sm text-right tabular-nums font-bold text-brand-text">{formatMoney(row.pending)}</td>
                          <td className="py-2.5 pr-3 text-sm whitespace-nowrap">
                            <Deadline remaining={remaining} />
                          </td>
                          <td className="py-2.5 text-right whitespace-nowrap">
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleAcceptPaymentClick(row.booking)} className="text-xs font-semibold text-green-800 bg-green-50 px-2 py-1 rounded-md">Cobrar</button>
                              <button type="button" onClick={() => setNavigateTo({ tab: 'customers', targetId: row.booking.userInfo?.email || '' })} className="text-xs font-semibold text-brand-text bg-brand-background px-2 py-1 rounded-md">Cliente</button>
                              {!!row.booking.slots?.length && (
                                <button type="button" onClick={() => setBookingToViewDates(row.booking)} className="text-xs font-semibold text-brand-text bg-brand-background px-2 py-1 rounded-md">Fechas</button>
                              )}
                              <button type="button" onClick={() => setBookingToDelete(row.booking)} className="text-xs font-semibold text-red-700 px-2 py-1">Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {visibleOpen.length > PAGE_SIZE && <Pager page={safeOpenPage} pages={openPages} onPage={setOpenPage} />}
          </div>
        </div>
      )}

      {feedback && (
        <div className={`mt-4 p-3 rounded-lg text-sm font-semibold ${feedback.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`} role="status">
          {feedback.text}
        </div>
      )}
    </div>
  );
};

function roundList(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildNotes(snapshot: { collectedFromEarlier: number; collectedFromLater: number; paidOutsidePeriod: number }): string[] {
  const notes: string[] = [];
  if (snapshot.collectedFromEarlier > 0.009) {
    notes.push(`De lo cobrado, ${formatMoney(snapshot.collectedFromEarlier)} es de reservas creadas antes de este periodo.`);
  }
  if (snapshot.collectedFromLater > 0.009) {
    notes.push(`De lo cobrado, ${formatMoney(snapshot.collectedFromLater)} es de reservas creadas después.`);
  }
  if (snapshot.paidOutsidePeriod > 0.009) {
    notes.push(`De lo vendido, ${formatMoney(snapshot.paidOutsidePeriod)} se cobró en otras fechas.`);
  }
  return notes;
}

function chipClass(active: boolean): string {
  return `px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${active ? 'bg-brand-text text-white' : 'bg-white text-brand-text border border-brand-border hover:bg-brand-background'}`;
}

function viewButtonClass(active: boolean): string {
  return `px-3 py-1.5 text-sm font-semibold rounded-full ${active ? 'bg-white text-brand-text shadow-sm' : 'text-brand-secondary'}`;
}

const Metric: React.FC<{ label: string; hint: string; value: string; detail?: string; delta?: string; tone?: 'up' | 'down' | 'flat' }> = ({
  label, hint, value, detail, delta, tone = 'flat',
}) => (
  <div className="bg-white border border-brand-border rounded-xl p-4">
    <p className="text-sm font-semibold text-brand-secondary">{label}</p>
    <p className="text-xs text-brand-secondary mt-0.5">{hint}</p>
    <p className="text-3xl font-bold text-brand-text mt-2 tabular-nums">{value}</p>
    {detail && <p className="text-xs mt-2 text-brand-secondary">{detail}</p>}
    {delta && <p className={`text-xs mt-1 ${toneClass(tone)}`}>{delta}</p>}
  </div>
);

const Deadline: React.FC<{ remaining: number | null }> = ({ remaining }) => {
  if (remaining === null) return <span className="text-brand-secondary">Sin plazo</span>;
  if (remaining <= 0) return <span className="font-semibold text-red-700">Plazo vencido</span>;
  const minutes = Math.floor(remaining / 60000);
  if (minutes < 120) return <span className="font-semibold text-amber-800">Vence en {minutes} min</span>;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return <span className="text-brand-text">Vence en {hours} h</span>;
  const days = Math.floor(hours / 24);
  return <span className="text-brand-secondary">Vence en {days} días</span>;
};

const Pager: React.FC<{ page: number; pages: number; onPage: (page: number) => void }> = ({ page, pages, onPage }) => (
  <div className="flex items-center justify-between mt-4 pt-3 border-t border-brand-border">
    <button type="button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} className="text-sm font-semibold text-brand-text disabled:opacity-40">
      Anterior
    </button>
    <span className="text-sm text-brand-secondary">{page} de {pages}</span>
    <button type="button" onClick={() => onPage(Math.min(pages, page + 1))} disabled={page === pages} className="text-sm font-semibold text-brand-text disabled:opacity-40">
      Siguiente
    </button>
  </div>
);
