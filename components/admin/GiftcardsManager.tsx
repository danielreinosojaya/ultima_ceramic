import * as React from 'react';
import type { GiftcardRequest } from '../../services/dataService';
import * as dataService from '../../services/dataService';
import { useAdminData } from '../../context/AdminDataContext';
import { GiftcardManualCreateModal } from './GiftcardManualCreateModal';
import { getEcuadorToday, formatDateToYYYYMMDD } from '../../utils/formatters';
import { formatEcuadorDateTime, ecuadorLocalToUtcIso, utcIsoToEcuadorParts } from '../../utils/giftcardTimezone';

const EXPIRING_SOON_DAYS = 30;
const EXPIRING_URGENT_DAYS = 7;

type ExpirationStatus = 'none' | 'pending' | 'active' | 'soon' | 'urgent' | 'expired';
type ActiveFilter = 'all' | 'pending_send' | 'with_balance' | 'redeemed' | 'scheduled' | 'expiring_soon' | 'expired';

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function getRedeemCode(req: GiftcardRequest): string | null {
  return req.metadata?.issuedCode || req.metadata?.issued_code || null;
}

function findIssuedGiftcard(req: GiftcardRequest, giftcards: any[]): any | null {
  const issuedCode = getRedeemCode(req);
  if (!giftcards?.length) return null;
  return giftcards.find((g: any) => {
    if (!g) return false;
    if (g.giftcardRequestId && String(g.giftcardRequestId) === String(req.id)) return true;
    if (issuedCode && g.code === issuedCode) return true;
    return false;
  }) || null;
}

function getExpirationInfo(req: GiftcardRequest, giftcards: any[]): {
  expiresAt: string | null;
  daysLeft: number | null;
  status: ExpirationStatus;
} {
  if (req.status === 'pending' || req.status === 'rejected') {
    return { expiresAt: null, daysLeft: null, status: req.status === 'pending' ? 'pending' : 'none' };
  }
  const gc = findIssuedGiftcard(req, giftcards);
  const expiresAt = gc?.expiresAt || null;
  if (!expiresAt) return { expiresAt: null, daysLeft: null, status: 'none' };
  const exp = new Date(expiresAt);
  const daysLeft = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { expiresAt, daysLeft, status: 'expired' };
  if (daysLeft <= EXPIRING_URGENT_DAYS) return { expiresAt, daysLeft, status: 'urgent' };
  if (daysLeft <= EXPIRING_SOON_DAYS) return { expiresAt, daysLeft, status: 'soon' };
  return { expiresAt, daysLeft, status: 'active' };
}

function expirationBadge(status: ExpirationStatus, daysLeft: number | null) {
  switch (status) {
    case 'expired':
      return { label: 'Vencida', className: 'bg-red-100 text-red-800' };
    case 'urgent':
      return { label: daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft}d`, className: 'bg-orange-100 text-orange-800' };
    case 'soon':
      return { label: `Vence en ${daysLeft}d`, className: 'bg-amber-100 text-amber-800' };
    case 'active':
      return { label: daysLeft !== null ? `${daysLeft}d restantes` : 'Vigente', className: 'bg-emerald-50 text-emerald-700' };
    case 'pending':
      return { label: 'Sin emitir', className: 'bg-gray-100 text-gray-600' };
    default:
      return null;
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Por revisar',
    approved: 'Aprobada',
    delivered: 'Entregada',
    rejected: 'Rechazada',
    deleted: 'Archivada',
  };
  return map[status] || status;
}

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text);
}

const CodeChip: React.FC<{
  variant: 'gif' | 'gc';
  code: string;
  compact?: boolean;
}> = ({ variant, code, compact }) => {
  const isGif = variant === 'gif';
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 ${
        isGif ? 'border-slate-200 bg-slate-50' : 'border-emerald-200 bg-emerald-50'
      } ${compact ? 'text-xs' : 'text-sm'}`}
    >
      <span
        className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          isGif ? 'bg-slate-200 text-slate-700' : 'bg-emerald-200 text-emerald-800'
        }`}
        title={isGif ? 'Referencia de transferencia bancaria (comprador)' : 'Código para canjear en reserva (destinatario)'}
      >
        {isGif ? 'GIF' : 'GC'}
      </span>
      <code className="font-mono font-semibold text-brand-primary truncate">{code}</code>
      <button
        type="button"
        className="shrink-0 text-brand-secondary hover:text-brand-primary"
        title="Copiar"
        onClick={(e) => {
          e.stopPropagation();
          copyToClipboard(code);
        }}
      >
        📋
      </button>
    </div>
  );
};

const GiftcardsManager: React.FC = () => {
  const adminData = useAdminData();
  const [selected, setSelected] = React.useState<GiftcardRequest | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');
  const [showManualCreateModal, setShowManualCreateModal] = React.useState(false);
  const [requestBalances, setRequestBalances] = React.useState<Record<string, any>>({});

  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const [editScheduleModal, setEditScheduleModal] = React.useState<{
    isOpen: boolean;
    requestId?: string;
    currentDate?: string;
    currentTime?: string;
    recipientName?: string;
    isLoading?: boolean;
  }>({ isOpen: false });

  const [showScheduledModal, setShowScheduledModal] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const cacheRef = React.useRef<Record<string, { data: any; timestamp: number }>>({});
  const CACHE_DURATION = 5 * 60 * 1000;
  const validationInProgressRef = React.useRef<Set<string>>(new Set());
  const debounceRef = React.useRef<Record<string, NodeJS.Timeout>>({});

  const issuedGiftcards = adminData.giftcards || [];

  const getBalanceForRequest = React.useCallback((req: GiftcardRequest) => {
    const cached = requestBalances[req.id];
    if (cached && typeof cached.balance !== 'undefined' && !cached.error) {
      return Number(cached.balance);
    }
    const issuedCode = getRedeemCode(req);
    if (issuedGiftcards.length > 0) {
      const match = findIssuedGiftcard(req, issuedGiftcards);
      if (match && typeof match.balance !== 'undefined') {
        return Number(match.balance);
      }
    }
    if (cached && typeof cached === 'object' && cached !== null) {
      if (typeof cached.data === 'object' && typeof cached.data.balance !== 'undefined') {
        return Number(cached.data.balance);
      }
    }
    return null;
  }, [requestBalances, issuedGiftcards]);

  const validateCodeOnDemand = React.useCallback((code: string, requestId: string) => {
    if (!code) return;
    const cached = cacheRef.current[code];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setRequestBalances(prev => ({ ...prev, [requestId]: cached.data }));
      return;
    }
    if (validationInProgressRef.current.has(code)) return;
    if (debounceRef.current[code]) clearTimeout(debounceRef.current[code]);

    debounceRef.current[code] = setTimeout(() => {
      validationInProgressRef.current.add(code);
      (async () => {
        try {
          const info = await dataService.validateGiftcard(code);
          cacheRef.current[code] = { data: info, timestamp: Date.now() };
          setRequestBalances(prev => ({ ...prev, [requestId]: info }));
        } catch (err) {
          cacheRef.current[code] = { data: { error: String(err) }, timestamp: Date.now() };
        } finally {
          validationInProgressRef.current.delete(code);
        }
      })();
    }, 300);
  }, []);

  React.useEffect(() => {
    return () => {
      Object.values(debounceRef.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  const expirationCounts = React.useMemo(() => {
    let expiringSoon = 0;
    let expired = 0;
    adminData.giftcardRequests.forEach(req => {
      const info = getExpirationInfo(req, issuedGiftcards);
      const bal = getBalanceForRequest(req);
      if (info.status === 'expired' && bal !== null && bal > 0) expired += 1;
      if ((info.status === 'soon' || info.status === 'urgent') && bal !== null && bal > 0) expiringSoon += 1;
    });
    return { expiringSoon, expired };
  }, [adminData.giftcardRequests, issuedGiftcards, getBalanceForRequest]);

  const filteredRequests = React.useMemo(() => {
    const list = adminData.giftcardRequests.filter(req => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'pending_send') return req.status === 'pending';
      if (activeFilter === 'scheduled') return !!(req as any).scheduledSendAt && req.status === 'approved';
      if (activeFilter === 'with_balance') return req.status === 'approved' && !(req as any).scheduledSendAt;
      if (activeFilter === 'redeemed') {
        const bal = getBalanceForRequest(req);
        return bal !== null && bal === 0;
      }
      if (activeFilter === 'expiring_soon') {
        const info = getExpirationInfo(req, issuedGiftcards);
        const bal = getBalanceForRequest(req);
        return (info.status === 'soon' || info.status === 'urgent') && bal !== null && bal > 0;
      }
      if (activeFilter === 'expired') {
        const info = getExpirationInfo(req, issuedGiftcards);
        const bal = getBalanceForRequest(req);
        return info.status === 'expired' && bal !== null && bal > 0;
      }
      return true;
    });

    if (activeFilter === 'expiring_soon' || activeFilter === 'expired') {
      return [...list].sort((a, b) => {
        const ea = getExpirationInfo(a, issuedGiftcards).expiresAt;
        const eb = getExpirationInfo(b, issuedGiftcards).expiresAt;
        if (!ea && !eb) return 0;
        if (!ea) return 1;
        if (!eb) return -1;
        return new Date(ea).getTime() - new Date(eb).getTime();
      });
    }
    return list;
  }, [activeFilter, adminData.giftcardRequests, requestBalances, issuedGiftcards, getBalanceForRequest]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [filteredRequests.length, currentPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  const openDetail = (req: GiftcardRequest) => {
    setSelected(req);
    const redeemCode = getRedeemCode(req);
    const codeToValidate = redeemCode || req.code;
    if (codeToValidate) validateCodeOnDemand(codeToValidate, req.id);
  };

  const filterBtn = (id: ActiveFilter, label: string, count: number) => (
    <button
      key={id}
      onClick={() => setActiveFilter(id)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        activeFilter === id
          ? 'bg-brand-primary text-white shadow-sm'
          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label} <span className="opacity-75">({count})</span>
    </button>
  );

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Encabezado */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-primary">Giftcards</h2>
          <p className="text-sm text-brand-secondary mt-1">Solicitudes, códigos y vencimientos</p>
        </div>
        <button
          onClick={() => setShowManualCreateModal(true)}
          className="px-4 py-2 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors shadow"
        >
          + Registrar física
        </button>
      </div>

      <GiftcardManualCreateModal
        isOpen={showManualCreateModal}
        onClose={() => setShowManualCreateModal(false)}
        onSuccess={() => adminData.refreshCritical?.()}
      />

      {/* Guía GIF vs GC */}
      <div className="grid sm:grid-cols-2 gap-3 p-4 bg-white border border-brand-border rounded-xl text-sm">
        <div className="flex gap-3 items-start">
          <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold bg-slate-200 text-slate-700">GIF</span>
          <div>
            <div className="font-semibold text-brand-text">Referencia de pago</div>
            <div className="text-brand-secondary text-xs mt-0.5">
              Lo genera el comprador al solicitar. Va en la transferencia bancaria. <strong>No se puede canjear.</strong>
            </div>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold bg-emerald-200 text-emerald-800">GC</span>
          <div>
            <div className="font-semibold text-brand-text">Código de canje</div>
            <div className="text-brand-secondary text-xs mt-0.5">
              Se emite al aprobar. Lo usa el destinatario en reservas o para consultar saldo. Vence a los 3 meses.
            </div>
          </div>
        </div>
      </div>

      {/* Alertas de vencimiento */}
      {(expirationCounts.expiringSoon > 0 || expirationCounts.expired > 0) && (
        <div className="flex flex-wrap gap-3">
          {expirationCounts.expiringSoon > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('expiring_soon')}
              className="flex-1 min-w-[200px] p-3 rounded-xl border border-amber-200 bg-amber-50 text-left hover:bg-amber-100 transition-colors"
            >
              <div className="text-amber-900 font-semibold">{expirationCounts.expiringSoon} por vencer</div>
              <div className="text-xs text-amber-700">En los próximos {EXPIRING_SOON_DAYS} días, con saldo</div>
            </button>
          )}
          {expirationCounts.expired > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('expired')}
              className="flex-1 min-w-[200px] p-3 rounded-xl border border-red-200 bg-red-50 text-left hover:bg-red-100 transition-colors"
            >
              <div className="text-red-900 font-semibold">{expirationCounts.expired} vencidas con saldo</div>
              <div className="text-xs text-red-700">Aún tienen balance sin usar</div>
            </button>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {filterBtn('all', 'Todas', adminData.giftcardRequests.length)}
        {filterBtn('pending_send', 'Por revisar', adminData.giftcardRequests.filter(r => r.status === 'pending').length)}
        {filterBtn('scheduled', 'Programadas', adminData.giftcardRequests.filter((r: any) => r.scheduledSendAt && r.status === 'approved').length)}
        {filterBtn('with_balance', 'Activas', adminData.giftcardRequests.filter(r => r.status === 'approved' && !(r as any).scheduledSendAt).length)}
        {filterBtn('expiring_soon', 'Por vencer', expirationCounts.expiringSoon)}
        {filterBtn('expired', 'Vencidas', expirationCounts.expired)}
        {filterBtn('redeemed', 'Redimidas', adminData.giftcardRequests.filter(r => {
          const bal = getBalanceForRequest(r);
          return bal !== null && bal === 0;
        }).length)}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-sm font-semibold text-red-800">{selectedIds.size} seleccionada(s)</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 text-sm rounded-lg border border-red-300 text-red-700 hover:bg-red-100"
              onClick={() => setSelectedIds(new Set())}
            >
              Deseleccionar
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm rounded-lg bg-red-800 text-white font-semibold hover:bg-red-900"
              onClick={async () => {
                const typed = window.prompt(
                  `ELIMINAR PERMANENTEMENTE ${selectedIds.size} solicitud(es).\nEscribe ELIMINAR para confirmar:`
                );
                if (typed !== 'ELIMINAR') return;
                const adminUser = window.prompt('Usuario admin:', 'admin') || 'admin';
                setIsProcessing(true);
                try {
                  const res = await dataService.bulkHardDeleteGiftcardRequests(
                    Array.from(selectedIds),
                    adminUser,
                    'bulk cleanup from admin'
                  );
                  if (res?.success) {
                    alert(`✅ ${res.count ?? selectedIds.size} solicitud(es) eliminada(s) permanentemente`);
                    setSelectedIds(new Set());
                    adminData.refreshCritical?.();
                  } else {
                    alert('❌ ' + (res?.error || 'Error al eliminar'));
                  }
                } catch (err) {
                  alert('Error: ' + (err instanceof Error ? err.message : 'error'));
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing}
            >
              Eliminar permanentemente
            </button>
          </div>
        </div>
      )}

      {adminData.loading ? (
        <div className="text-center text-brand-border italic py-8">Cargando solicitudes...</div>
      ) : adminData.giftcardRequests.length === 0 ? (
        <div className="text-center text-brand-border italic py-8">No hay solicitudes registradas.</div>
      ) : (
        <>
          {(() => {
            const pendingScheduled = adminData.giftcardRequests.filter((req: any) => req.scheduledSendAt && req.status === 'approved');
            if (pendingScheduled.length === 0) return null;
            return (
              <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-brand-primary">
                    {pendingScheduled.length} envío{pendingScheduled.length !== 1 ? 's' : ''} programado{pendingScheduled.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-brand-secondary">
                    Próximo: {formatEcuadorDateTime(pendingScheduled[0]?.scheduledSendAt)} (Ecuador)
                  </div>
                </div>
                <button
                  className="px-4 py-2 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 font-medium"
                  onClick={() => setShowScheduledModal(true)}
                >
                  Ver programadas
                </button>
              </div>
            );
          })()}

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-brand-secondary italic">Nada en este filtro</div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-brand-border shadow-sm">
                <table className="w-full min-w-[880px]">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          aria-label="Seleccionar página"
                          checked={paginatedRequests.length > 0 && paginatedRequests.every(r => selectedIds.has(r.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => new Set([...prev, ...paginatedRequests.map(r => r.id)]));
                            } else {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                paginatedRequests.forEach(r => next.delete(r.id));
                                return next;
                              });
                            }
                          }}
                        />
                      </th>
                      <th className="px-3 py-3">Personas</th>
                      <th className="px-3 py-3 w-20">Monto</th>
                      <th className="px-3 py-3">Códigos</th>
                      <th className="px-3 py-3">Fechas</th>
                      <th className="px-3 py-3 w-28">Estado</th>
                      <th className="px-3 py-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedRequests.map(req => {
                      const bal = getBalanceForRequest(req);
                      const redeemCode = getRedeemCode(req);
                      const expInfo = getExpirationInfo(req, issuedGiftcards);
                      const expBadge = expirationBadge(expInfo.status, expInfo.daysLeft);
                      const issuedGc = findIssuedGiftcard(req, issuedGiftcards);
                      const isScheduled = !!(req as any).scheduledSendAt;
                      const rowTint =
                        expInfo.status === 'expired' && bal !== null && bal > 0
                          ? 'bg-red-50/60'
                          : (expInfo.status === 'urgent' || expInfo.status === 'soon') && bal !== null && bal > 0
                            ? 'bg-amber-50/40'
                            : '';

                      return (
                        <tr key={req.id} className={`hover:bg-gray-50/80 transition-colors ${rowTint}`}>
                          <td className="px-3 py-3 align-top">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(req.id)}
                              onChange={(e) => {
                                setSelectedIds(prev => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(req.id);
                                  else next.delete(req.id);
                                  return next;
                                });
                              }}
                            />
                          </td>

                          <td className="px-3 py-3 align-top">
                            <div className="font-medium text-sm text-brand-text">{req.recipientName}</div>
                            <div className="text-xs text-brand-secondary">{req.buyerName} · {req.buyerEmail}</div>
                          </td>

                          <td className="px-3 py-3 align-top">
                            <span className="font-bold text-brand-primary">${req.amount}</span>
                          </td>

                          <td className="px-3 py-3 align-top">
                            <div className="space-y-1.5 max-w-[220px]">
                              {req.code && (
                                <CodeChip variant="gif" code={req.code} compact />
                              )}
                              {redeemCode ? (
                                <CodeChip variant="gc" code={redeemCode} compact />
                              ) : req.status === 'approved' || req.status === 'delivered' ? (
                                <span className="text-xs text-amber-600 italic">GC pendiente de sync</span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">GC al aprobar</span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3 align-top text-sm">
                            <div className="space-y-1">
                              <div>
                                <span className="text-[10px] uppercase text-gray-400 font-semibold">Compra </span>
                                <span className="text-brand-text">{formatShortDate(req.createdAt)}</span>
                              </div>
                              {issuedGc?.createdAt && (
                                <div>
                                  <span className="text-[10px] uppercase text-gray-400 font-semibold">Emisión </span>
                                  <span className="text-brand-text">{formatShortDate(issuedGc.createdAt)}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-[10px] uppercase text-gray-400 font-semibold">Vence </span>
                                <span className={
                                  expInfo.status === 'expired' ? 'text-red-700 font-semibold' :
                                  expInfo.status === 'urgent' || expInfo.status === 'soon' ? 'text-amber-700 font-semibold' :
                                  'text-brand-text'
                                }>
                                  {expInfo.expiresAt ? formatShortDate(expInfo.expiresAt) : '—'}
                                </span>
                              </div>
                              {expBadge && (
                                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${expBadge.className}`}>
                                  {expBadge.label}
                                </span>
                              )}
                              {isScheduled && (
                                <div className="text-xs text-brand-primary pt-0.5">
                                  Envío: {formatEcuadorDateTime((req as any).scheduledSendAt)}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3 align-top">
                            <div className="space-y-1">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                req.status === 'approved' ? 'bg-green-100 text-green-800' :
                                req.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                                req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {statusLabel(req.status)}
                              </span>
                              {bal !== null && (
                                <div className={`text-sm font-mono font-bold ${bal <= 0 ? 'text-gray-400' : 'text-emerald-700'}`}>
                                  ${bal.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3 align-top">
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90"
                              onClick={() => openDetail(req)}
                            >
                              Detalle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-1">
                <div className="text-sm text-brand-secondary">
                  {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredRequests.length)} de {filteredRequests.length}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40"
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        currentPage === page ? 'bg-brand-primary text-white' : 'border hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-brand-border overflow-hidden">
            <div className="flex-shrink-0 border-b p-5">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-bold text-brand-primary">{selected.recipientName}</h3>
                  <p className="text-sm text-brand-secondary">{selected.buyerName} · ${selected.amount}</p>
                </div>
                <button className="text-2xl text-brand-secondary hover:text-brand-primary" onClick={() => setSelected(null)} aria-label="Cerrar">×</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Códigos destacados */}
              <div className="rounded-xl border-2 border-brand-border p-4 space-y-3 bg-gray-50">
                <div className="text-xs font-bold uppercase text-gray-500">Códigos</div>
                {selected.code && (
                  <div>
                    <div className="text-xs text-brand-secondary mb-1">Referencia de transferencia (comprador paga con este)</div>
                    <CodeChip variant="gif" code={selected.code} />
                  </div>
                )}
                {getRedeemCode(selected) ? (
                  <div>
                    <div className="text-xs text-brand-secondary mb-1">Código de canje (destinatario usa en reservas)</div>
                    <CodeChip variant="gc" code={getRedeemCode(selected)!} />
                  </div>
                ) : (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-2">
                    El código GC se genera al aprobar la solicitud.
                  </p>
                )}
              </div>

              {/* Timeline de fechas */}
              <div className="rounded-xl border p-4 space-y-2">
                <div className="text-xs font-bold uppercase text-gray-500">Fechas</div>
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-[10px] uppercase text-gray-400 font-semibold">Solicitud</div>
                    <div className="font-semibold mt-1">{formatShortDate(selected.createdAt)}</div>
                  </div>
                  {(() => {
                    const gc = findIssuedGiftcard(selected, issuedGiftcards);
                    const exp = getExpirationInfo(selected, issuedGiftcards);
                    const badge = expirationBadge(exp.status, exp.daysLeft);
                    return (
                      <>
                        <div className="bg-white rounded-lg p-3 border">
                          <div className="text-[10px] uppercase text-gray-400 font-semibold">Emisión</div>
                          <div className="font-semibold mt-1">{gc?.createdAt ? formatShortDate(gc.createdAt) : '—'}</div>
                        </div>
                        <div className={`rounded-lg p-3 border ${
                          exp.status === 'expired' ? 'bg-red-50 border-red-200' :
                          exp.status === 'urgent' || exp.status === 'soon' ? 'bg-amber-50 border-amber-200' :
                          'bg-white'
                        }`}>
                          <div className="text-[10px] uppercase text-gray-400 font-semibold">Vencimiento</div>
                          <div className="font-semibold mt-1">{exp.expiresAt ? formatShortDate(exp.expiresAt) : '—'}</div>
                          {badge && (
                            <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.className}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Contacto */}
              <div className="text-sm space-y-1">
                <div><span className="text-gray-500">Comprador:</span> {selected.buyerEmail}</div>
                <div><span className="text-gray-500">Destinatario:</span> {selected.recipientEmail || selected.recipientWhatsapp || '—'}</div>
              </div>

              {/* Envío programado */}
              {((selected as any).scheduledSendAt || (selected as any).sendMethod) && (
                <div className="rounded-lg p-3 border border-brand-primary/20 bg-brand-primary/5 text-sm">
                  <div className="font-semibold text-brand-primary mb-1">Envío programado</div>
                  <div>{(selected as any).sendMethod === 'whatsapp' ? 'WhatsApp' : 'Email'}</div>
                  {(selected as any).scheduledSendAt && (
                    <div className="font-mono text-xs mt-1">{formatEcuadorDateTime((selected as any).scheduledSendAt)}</div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs rounded-lg border border-brand-primary text-brand-primary hover:bg-brand-primary/10"
                      onClick={() => {
                        setEditScheduleModal({
                          isOpen: true,
                          requestId: selected.id,
                          currentDate: utcIsoToEcuadorParts((selected as any).scheduledSendAt)?.date || formatDateToYYYYMMDD(getEcuadorToday()),
                          currentTime: utcIsoToEcuadorParts((selected as any).scheduledSendAt)?.time || '14:00',
                          recipientName: selected.recipientName,
                        });
                      }}
                    >
                      Editar programación
                    </button>
                    {selected.status === 'approved' && (
                      <button
                        type="button"
                        className="px-3 py-1.5 text-xs rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90"
                        onClick={async () => {
                          if (!window.confirm(`¿Enviar ahora a ${selected.recipientName}?`)) return;
                          setIsProcessing(true);
                          try {
                            const res = await dataService.sendGiftcardNow(selected.id);
                            if (res?.success) {
                              alert('✅ Enviada');
                              adminData.refreshCritical?.();
                              setSelected(null);
                            } else {
                              alert('❌ ' + (res?.error || 'Error'));
                            }
                          } catch (err) {
                            alert('Error: ' + (err instanceof Error ? err.message : 'error'));
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                      >
                        Enviar ahora
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selected.status === 'approved' && !(selected as any).scheduledSendAt && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-sm rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90"
                    onClick={async () => {
                      if (!window.confirm('¿Enviar ahora al destinatario?')) return;
                      setIsProcessing(true);
                      try {
                        const res = await dataService.sendGiftcardNow(selected.id);
                        if (res?.success) {
                          alert('✅ Enviada');
                          adminData.refreshCritical?.();
                          setSelected(null);
                        } else {
                          alert('❌ ' + (res?.error || 'Error'));
                        }
                      } catch (err) {
                        alert('Error: ' + (err instanceof Error ? err.message : 'error'));
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                  >
                    Enviar ahora al destinatario
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-sm rounded-lg border border-brand-primary text-brand-primary hover:bg-brand-primary/10"
                    onClick={() => {
                      setEditScheduleModal({
                        isOpen: true,
                        requestId: selected.id,
                        currentDate: formatDateToYYYYMMDD(getEcuadorToday()),
                        currentTime: '14:00',
                        recipientName: selected.recipientName,
                      });
                    }}
                  >
                    Programar envío
                  </button>
                </div>
              )}

              {selected.metadata?.emailDelivery && (
                <div className="text-sm">
                  <span className="text-gray-500">Emails:</span>{' '}
                  comprador {selected.metadata.emailDelivery.buyer?.sent ? '✓' : '✗'} ·
                  destinatario {selected.metadata.emailDelivery.recipient?.sent ? '✓' : '✗'}
                </div>
              )}

              {requestBalances[selected.id] && !requestBalances[selected.id].error && (
                <div className="rounded-lg p-3 bg-emerald-50 border border-emerald-200 text-sm">
                  <span className="font-semibold">Saldo:</span>{' '}
                  <span className="font-mono font-bold">${Number(requestBalances[selected.id].balance).toFixed(2)}</span>
                  {requestBalances[selected.id].initialValue !== undefined && (
                    <span className="text-brand-secondary"> / ${Number(requestBalances[selected.id].initialValue).toFixed(2)} inicial</span>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Nota interna</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full p-2 border rounded text-sm resize-none"
                  rows={2}
                  placeholder="Opcional..."
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div className="flex-shrink-0 border-t p-4 bg-gray-50 grid grid-cols-2 gap-2">
              {selected.status === 'pending' ? (
                <button
                  className="col-span-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                  onClick={async () => {
                    const adminUser = window.prompt('Usuario admin:', 'admin') || 'admin';
                    setIsProcessing(true);
                    try {
                      const res = await dataService.approveGiftcardRequest(selected.id, adminUser, noteText || undefined);
                      if (res?.success) {
                        adminData.refreshCritical?.();
                        setSelected(null);
                        setNoteText('');
                      } else {
                        alert('❌ ' + (res?.error || 'Error'));
                      }
                    } catch (err) {
                      alert('Error: ' + (err instanceof Error ? err.message : 'error'));
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  disabled={isProcessing}
                >
                  Revisar y aprobar
                </button>
              ) : (
                <button className="col-span-2 px-3 py-2 rounded-lg bg-gray-200 text-gray-600 text-sm font-semibold" disabled>
                  Ya aprobada
                </button>
              )}

              <button
                className="px-3 py-2 rounded-lg border-2 border-red-600 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                onClick={async () => {
                  if (!window.confirm('¿Rechazar?')) return;
                  const adminUser = window.prompt('Usuario admin:', 'admin') || 'admin';
                  setIsProcessing(true);
                  try {
                    const res = await dataService.rejectGiftcardRequest(selected.id, adminUser, noteText || undefined);
                    if (res?.success) {
                      adminData.refreshCritical?.();
                      setSelected(null);
                    } else {
                      alert('❌ ' + (res?.error || 'Error'));
                    }
                  } catch (err) {
                    alert('Error: ' + (err instanceof Error ? err.message : 'error'));
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
              >
                Rechazar
              </button>

              <button
                className="px-3 py-2 rounded-lg border border-red-400 text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                onClick={async () => {
                  if (!window.confirm('¿Archivar?')) return;
                  const adminUser = window.prompt('Usuario admin:', 'admin') || 'admin';
                  setIsProcessing(true);
                  try {
                    const res = await dataService.deleteGiftcardRequest(selected.id, adminUser, noteText || undefined);
                    if (res?.success) {
                      alert('✅ Archivada');
                      adminData.refreshCritical?.();
                      setSelected(null);
                    } else {
                      alert('❌ ' + (res?.error || 'Error'));
                    }
                  } catch (err) {
                    alert('Error: ' + (err instanceof Error ? err.message : 'error'));
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
              >
                Archivar
              </button>

              <button
                className="px-3 py-2 rounded-lg bg-red-900 text-white text-sm font-semibold hover:bg-red-950 disabled:opacity-50"
                onClick={async () => {
                  const typed = window.prompt('ELIMINACIÓN PERMANENTE.\nEscribe ELIMINAR para confirmar:');
                  if (typed !== 'ELIMINAR') return;
                  const adminUser = window.prompt('Usuario admin:', 'admin') || 'admin';
                  setIsProcessing(true);
                  try {
                    const res = await dataService.hardDeleteGiftcardRequest(selected.id, adminUser, noteText || undefined);
                    if (res?.success) {
                      alert('✅ Eliminada');
                      adminData.refreshCritical?.();
                      setSelected(null);
                    } else {
                      alert('❌ ' + (res?.error || 'Error'));
                    }
                  } catch (err) {
                    alert('Error: ' + (err instanceof Error ? err.message : 'error'));
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
              >
                Borrar definitivo
              </button>

              <button
                className="px-3 py-2 rounded-lg border text-sm font-semibold hover:bg-white disabled:opacity-50"
                onClick={() => setSelected(null)}
                disabled={isProcessing}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal programación */}
      {editScheduleModal.isOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-brand-border relative">
            <button
              className="absolute top-3 right-3 text-brand-secondary hover:text-brand-primary text-xl font-bold"
              onClick={() => setEditScheduleModal({ isOpen: false })}
              aria-label="Cerrar"
            >×</button>
            <h3 className="text-xl font-bold text-brand-primary mb-4">
              {editScheduleModal.currentDate && editScheduleModal.currentTime ? 'Editar programación' : 'Programar envío'}
            </h3>
            <p className="text-sm text-brand-secondary mb-4">Destinatario: <span className="font-semibold">{editScheduleModal.recipientName}</span></p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brand-secondary mb-2">Fecha (Ecuador)</label>
                <input
                  type="date"
                  value={editScheduleModal.currentDate || ''}
                  onChange={(e) => setEditScheduleModal(prev => ({ ...prev, currentDate: e.target.value }))}
                  min={formatDateToYYYYMMDD(getEcuadorToday())}
                  className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-secondary mb-2">Hora (Ecuador)</label>
                <input
                  type="time"
                  value={editScheduleModal.currentTime || ''}
                  onChange={(e) => setEditScheduleModal(prev => ({ ...prev, currentTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
                  onClick={() => setEditScheduleModal({ isOpen: false })}
                  disabled={editScheduleModal.isLoading}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50"
                  onClick={async () => {
                    if (!editScheduleModal.requestId || !editScheduleModal.currentDate || !editScheduleModal.currentTime) {
                      alert('Completa fecha y hora');
                      return;
                    }
                    setEditScheduleModal(prev => ({ ...prev, isLoading: true }));
                    try {
                      const utcDateTime = ecuadorLocalToUtcIso(editScheduleModal.currentDate, editScheduleModal.currentTime);
                      const res = await dataService.updateGiftcardSchedule(editScheduleModal.requestId, utcDateTime);
                      if (res?.success) {
                        alert('✅ Programación actualizada');
                        adminData.refreshCritical?.();
                        setEditScheduleModal({ isOpen: false });
                      } else {
                        alert('❌ ' + (res?.error || 'Error'));
                      }
                    } catch (err) {
                      alert('Error: ' + (err instanceof Error ? err.message : 'error'));
                    } finally {
                      setEditScheduleModal(prev => ({ ...prev, isLoading: false }));
                    }
                  }}
                  disabled={editScheduleModal.isLoading}
                >
                  {editScheduleModal.isLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftcardsManager;
