import React, { useEffect, useMemo, useState } from 'react';
import type { InvoiceRequest, NavigationState, UserInfo } from '../../types';
import * as dataService from '../../services/dataService';
import { useAdminData } from '../../context/AdminDataContext';

type FilterType = 'Pending' | 'Processed' | 'all';
type SortType = 'recent' | 'oldest';

interface InvoiceManagerProps {
  navigateToId?: string;
  invoiceRequests: InvoiceRequest[];
  onDataChange: () => void;
  setNavigateTo: React.Dispatch<React.SetStateAction<NavigationState | null>>;
}

const PAGE_SIZE = 8;
const STUDIO_TZ = 'America/Guayaquil';

const money = (value?: number) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatWhen = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: STUDIO_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const clientName = (user?: UserInfo) => {
  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  return name || 'Sin nombre';
};

const whatsAppHref = (user?: UserInfo) => {
  const rawPhone = user?.phone?.replace(/\D/g, '') || '';
  if (!rawPhone) return '';
  const country = (user?.countryCode || '+593').replace(/\D/g, '') || '593';
  return `https://wa.me/${country}${rawPhone}`;
};

const copyBlock = (request: InvoiceRequest) => {
  const lines = [
    `Razón social: ${request.companyName || ''}`,
    `RUC / cédula: ${request.taxId || ''}`,
    `Dirección: ${request.address || ''}`,
    `Email: ${request.email || request.userInfo?.email || ''}`,
    `Reserva: ${request.bookingCode || ''}`,
    `Concepto: ${request.productName || 'Clase'}`,
    `Monto: ${money(request.price)}`,
    `Cliente: ${clientName(request.userInfo)}`,
  ];
  return lines.join('\n');
};

export const InvoiceManager: React.FC<InvoiceManagerProps> = ({
  navigateToId,
  invoiceRequests: seeded = [],
  setNavigateTo,
}) => {
  const adminData = useAdminData();
  const [invoiceRequests, setInvoiceRequests] = useState<InvoiceRequest[]>(seeded);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<FilterType>('Pending');
  const [sort, setSort] = useState<SortType>('oldest');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ id: string; request: InvoiceRequest } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const secondaryStamp = adminData.lastUpdated.secondary;
  const rowsRef = React.useRef(invoiceRequests);
  rowsRef.current = invoiceRequests;

  useEffect(() => {
    let cancelled = false;
    if (rowsRef.current.length === 0) setLoading(true);
    setLoadError(null);
    dataService.getInvoiceRequests()
      .then((data) => {
        if (cancelled) return;
        setInvoiceRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (rowsRef.current.length === 0) {
          setLoadError('No se pudieron cargar las solicitudes.');
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, secondaryStamp]);

  const patchRow = (id: string, patch: Partial<InvoiceRequest>) => {
    setInvoiceRequests((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    adminData.optimisticPatchInvoiceRequest(id, patch);
  };

  const pending = invoiceRequests.filter((request) => request.status === 'Pending');
  const processed = invoiceRequests.filter((request) => request.status === 'Processed');
  const now = new Date();
  const thisMonth = pending.concat(processed).filter((request) => {
    const date = new Date(request.requestedAt);
    if (Number.isNaN(date.getTime())) return false;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: STUDIO_TZ,
      year: 'numeric',
      month: '2-digit',
    }).format(date);
    const current = new Intl.DateTimeFormat('en-CA', {
      timeZone: STUDIO_TZ,
      year: 'numeric',
      month: '2-digit',
    }).format(now);
    return parts === current;
  }).length;

  useEffect(() => {
    if (!navigateToId) return;
    const request = invoiceRequests.find((item) => item.id === navigateToId);
    if (!request) return;
    setFilter(request.status === 'Processed' ? 'Processed' : 'Pending');
    setQuery('');
    setPage(1);
    setHighlightedId(navigateToId);
    const timer = window.setTimeout(() => {
      document.getElementById(`invoice-request-${navigateToId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    const clear = window.setTimeout(() => setHighlightedId(null), 2500);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clear);
    };
  }, [navigateToId, invoiceRequests]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = invoiceRequests.filter((request) => {
      if (filter !== 'all' && request.status !== filter) return false;
      if (!needle) return true;
      const haystack = [
        request.companyName,
        request.taxId,
        request.email,
        request.address,
        request.bookingCode,
        request.productName,
        clientName(request.userInfo),
        request.userInfo?.email,
        request.userInfo?.phone,
      ].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
    rows.sort((a, b) => {
      const at = new Date(a.requestedAt).getTime() || 0;
      const bt = new Date(b.requestedAt).getTime() || 0;
      return sort === 'oldest' ? at - bt : bt - at;
    });
    return rows;
  }, [invoiceRequests, filter, query, sort]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const copyRequest = async (request: InvoiceRequest) => {
    const text = copyBlock(request);
    const markCopied = () => {
      setCopiedId(request.id);
      window.setTimeout(() => setCopiedId((current) => (current === request.id ? null : current)), 2000);
    };
    try {
      await navigator.clipboard.writeText(text);
      markCopied();
      return;
    } catch {
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        if (ok) {
          markCopied();
          return;
        }
      } catch {
        // The button stays available so the person can try again.
      }
      setFeedback({ type: 'error', text: 'No se pudo copiar. Selecciona el texto a mano.' });
    }
  };

  const markReady = async (request: InvoiceRequest) => {
    setBusyId(request.id);
    patchRow(request.id, {
      status: 'Processed',
      processedAt: new Date().toISOString(),
    });
    setUndo({ id: request.id, request });
    try {
      await dataService.markInvoiceAsProcessed(request.id);
    } catch {
      patchRow(request.id, {
        status: 'Pending',
        processedAt: undefined,
      });
      setUndo(null);
      setFeedback({ type: 'error', text: 'No se pudo marcar. Inténtalo de nuevo.' });
    } finally {
      setBusyId(null);
    }
  };

  const reopen = async (request: InvoiceRequest) => {
    setBusyId(request.id);
    patchRow(request.id, {
      status: 'Pending',
      processedAt: undefined,
    });
    try {
      await dataService.reopenInvoiceRequest(request.id);
      setUndo((current) => (current?.id === request.id ? null : current));
      setFeedback({ type: 'success', text: 'Volvió a por emitir.' });
    } catch {
      patchRow(request.id, {
        status: 'Processed',
        processedAt: request.processedAt,
      });
      setFeedback({ type: 'error', text: 'No se pudo deshacer.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5">
        <div>
          <h2 className="text-2xl font-serif text-brand-text">Facturación</h2>
          <p className="text-sm text-brand-secondary mt-1 max-w-2xl">
            La factura se hace fuera de aquí. Copia los datos, emítela en tu sistema y pulsa <span className="font-semibold text-brand-text">Ya la emití</span>.
          </p>
        </div>
      </div>

      {!loading && !loadError && (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <button type="button" onClick={() => { setFilter('Pending'); setPage(1); }} className={`text-left bg-white border rounded-xl p-4 ${filter === 'Pending' ? 'border-brand-text' : 'border-brand-border'}`}>
          <p className="text-sm font-semibold text-brand-secondary">Por emitir</p>
          <p className="text-3xl font-bold text-brand-text mt-1 tabular-nums">{pending.length}</p>
          <p className="text-xs text-brand-secondary mt-1">Todavía no se marcaron como listas</p>
        </button>
        <div className="bg-white border border-brand-border rounded-xl p-4">
          <p className="text-sm font-semibold text-brand-secondary">Pedidas este mes</p>
          <p className="text-3xl font-bold text-brand-text mt-1 tabular-nums">{thisMonth}</p>
          <p className="text-xs text-brand-secondary mt-1">Nuevas solicitudes del mes</p>
        </div>
        <button type="button" onClick={() => { setFilter('Processed'); setPage(1); }} className={`text-left bg-white border rounded-xl p-4 ${filter === 'Processed' ? 'border-brand-text' : 'border-brand-border'}`}>
          <p className="text-sm font-semibold text-brand-secondary">Listas</p>
          <p className="text-3xl font-bold text-brand-text mt-1 tabular-nums">{processed.length}</p>
          <p className="text-xs text-brand-secondary mt-1">Ya se emitieron fuera de aquí</p>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button type="button" onClick={() => { setFilter('all'); setPage(1); }} className={chipClass(filter === 'all')} aria-pressed={filter === 'all'}>Todas</button>
          <input
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Buscar nombre, RUC o reserva"
            aria-label="Buscar solicitudes"
            className="text-sm px-3 py-1.5 border border-brand-border rounded-lg w-full sm:w-64"
          />
          <select
            value={sort}
            onChange={(event) => { setSort(event.target.value as SortType); setPage(1); }}
            aria-label="Orden"
            className="text-sm p-1.5 border border-brand-border rounded-lg text-brand-text"
          >
            <option value="oldest">Primero las antiguas</option>
            <option value="recent">Primero las nuevas</option>
          </select>
      </div>
      </>
      )}

      {undo && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-brand-background border border-brand-border rounded-xl px-4 py-3">
          <p className="text-sm text-brand-text">{undo.request.companyName} quedó marcada como lista.</p>
          <button type="button" onClick={() => reopen(undo.request)} disabled={busyId === undo.id} className="text-sm font-semibold text-brand-text underline disabled:opacity-40">
            Deshacer
          </button>
        </div>
      )}

      {loading && invoiceRequests.length === 0 ? (
        <p className="text-sm text-brand-secondary py-8">Cargando solicitudes…</p>
      ) : loadError && invoiceRequests.length === 0 ? (
        <div className="bg-white border border-brand-border rounded-xl p-8 text-center">
          <p className="text-brand-text font-semibold">{loadError}</p>
          <button type="button" onClick={() => setReloadKey((current) => current + 1)} className="mt-3 text-sm font-semibold text-brand-text underline">
            Reintentar
          </button>
        </div>
      ) : paged.length === 0 ? (
        <div className="bg-white border border-brand-border rounded-xl p-8 text-center">
          <p className="text-brand-text font-semibold">
            {query ? 'Nada coincide con la búsqueda' : filter === 'Pending' ? 'No hay facturas por emitir' : 'No hay solicitudes en esta vista'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-brand-secondary">
            {visible.length} {filter === 'Pending' ? 'por emitir' : filter === 'Processed' ? (visible.length === 1 ? 'lista' : 'listas') : (visible.length === 1 ? 'solicitud' : 'solicitudes')}
            {sort === 'oldest' ? ' · la más antigua primero' : ' · la más nueva primero'}
          </p>
          {paged.map((request) => {
            const wa = whatsAppHref(request.userInfo);
            const ready = request.status === 'Processed';
            return (
              <article
                key={request.id}
                id={`invoice-request-${request.id}`}
                className={`bg-white border rounded-xl p-4 ${highlightedId === request.id ? 'border-brand-text' : 'border-brand-border'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-brand-text truncate">{request.companyName}</h3>
                    <p className="text-sm text-brand-secondary mt-0.5">
                      {request.productName || 'Clase'}
                      {request.bookingCode ? <span className="whitespace-nowrap"> · {request.bookingCode}</span> : null}
                    </p>
                    <p className="text-xs text-brand-secondary mt-1">
                      Pedida el {formatWhen(request.requestedAt) || '—'}
                      {ready && request.processedAt ? ` · Lista el ${formatWhen(request.processedAt)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-brand-text tabular-nums">{money(request.price)}</p>
                    <p className={`text-xs font-semibold mt-1 ${ready ? 'text-green-700' : 'text-amber-800'}`}>
                      {ready ? 'Lista' : 'Por emitir'}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                  <Field label="RUC / cédula" value={request.taxId} />
                  <Field label="Correo de la factura" value={request.email || request.userInfo?.email || '—'} />
                  <Field label="Dirección" value={request.address} />
                  <Field label="Cliente" value={`${clientName(request.userInfo)}${request.userInfo?.phone ? ` · ${request.userInfo.countryCode || ''} ${request.userInfo.phone}` : ''}`} />
                </dl>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button type="button" onClick={() => copyRequest(request)} className="text-sm font-semibold bg-brand-text text-white px-3 py-1.5 rounded-full">
                    {copiedId === request.id ? 'Copiado' : 'Copiar para facturar'}
                  </button>
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer" className="text-sm font-semibold bg-white border border-brand-border text-brand-text px-3 py-1.5 rounded-full">
                      WhatsApp
                    </a>
                  )}
                  {request.userInfo?.email && (
                    <button
                      type="button"
                      onClick={() => setNavigateTo({ tab: 'customers', targetId: request.userInfo!.email })}
                      className="text-sm font-semibold bg-white border border-brand-border text-brand-text px-3 py-1.5 rounded-full"
                    >
                      Cliente
                    </button>
                  )}
                  {ready ? (
                    <button type="button" onClick={() => reopen(request)} disabled={busyId === request.id} className="text-sm font-semibold text-brand-secondary px-3 py-1.5 disabled:opacity-40">
                      Volver a por emitir
                    </button>
                  ) : (
                    <button type="button" onClick={() => markReady(request)} disabled={busyId === request.id} className="text-sm font-semibold bg-green-700 text-white px-3 py-1.5 rounded-full disabled:opacity-40">
                      Ya la emití
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {visible.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1} className="text-sm font-semibold text-brand-text disabled:opacity-40">Anterior</button>
          <span className="text-sm text-brand-secondary">{safePage} de {pages}</span>
          <button type="button" onClick={() => setPage(Math.min(pages, safePage + 1))} disabled={safePage === pages} className="text-sm font-semibold text-brand-text disabled:opacity-40">Siguiente</button>
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

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">{label}</dt>
    <dd className="text-brand-text mt-0.5 break-words">{value || '—'}</dd>
  </div>
);

function chipClass(active: boolean): string {
  return `px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${active ? 'bg-brand-text text-white' : 'bg-white text-brand-text border border-brand-border hover:bg-brand-background'}`;
}
