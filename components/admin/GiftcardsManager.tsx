import * as React from 'react';
import type { GiftcardRequest } from '../../services/dataService';
import * as dataService from '../../services/dataService';
import { useAdminData } from '../../context/AdminDataContext';
import { GiftcardManualCreateModal } from './GiftcardManualCreateModal';

// Función para convertir UTC a hora local (Quito UTC-5)
const utcToLocal = (isoString: string | null): Date | null => {
  if (!isoString) return null;
  
  // La fecha viene en UTC desde la BD
  // Necesitamos mostrarla como hora de Quito (UTC-5)
  // Ejemplo: "2025-11-22T03:00:00Z" (UTC) = 2025-11-21 22:00 (Quito)
  
  const utcDate = new Date(isoString);
  
  // Obtener componentes UTC y restarlos 5 horas para Quito
  const quitoDate = new Date(utcDate.getTime() - (5 * 60 * 60 * 1000));
  
  return quitoDate;
};

const GiftcardsManager: React.FC = () => {
  const adminData = useAdminData();
  const [selected, setSelected] = React.useState<GiftcardRequest | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');
  const [proofPreview, setProofPreview] = React.useState<string | null>(null);
  const [showManualCreateModal, setShowManualCreateModal] = React.useState(false);
  // Map of requestId -> giftcard validation info (balance, initialValue, metadata, giftcardId)
  const [requestBalances, setRequestBalances] = React.useState<Record<string, any>>({});
  
  // 🔍 FILTROS
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'pending_send' | 'with_balance' | 'redeemed' | 'scheduled'>('all');
  
  // 📑 PAGINACIÓN
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  
  // 📅 MODAL DE EDICIÓN DE PROGRAMACIÓN
  const [editScheduleModal, setEditScheduleModal] = React.useState<{
    isOpen: boolean;
    requestId?: string;
    currentDate?: string;
    currentTime?: string;
    recipientName?: string;
    isLoading?: boolean;
  }>({ isOpen: false });
  
  // Cache para evitar re-validaciones innecesarias
  const cacheRef = React.useRef<Record<string, { data: any; timestamp: number }>>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  const validationInProgressRef = React.useRef<Set<string>>(new Set());
  const debounceRef = React.useRef<Record<string, NodeJS.Timeout>>({}); // Debounce timers por código

  // Validación on-demand: llamar al validar SOLO cuando se necesita (al abrir modal, etc)
  const validateCodeOnDemand = React.useCallback((code: string, requestId: string) => {
    if (!code) return;

    // Si ya está en caché válido, usar ese
    const cached = cacheRef.current[code];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setRequestBalances(prev => ({ ...prev, [requestId]: cached.data }));
      return;
    }

    // Si ya está validando, skip
    if (validationInProgressRef.current.has(code)) {
      return;
    }

    // Agregar debounce: solo validar si pasaron 500ms desde el último intento
    // Esto previene validaciones múltiples del mismo código en poco tiempo
    if (debounceRef.current[code]) {
      clearTimeout(debounceRef.current[code]);
    }

    debounceRef.current[code] = setTimeout(() => {
      validationInProgressRef.current.add(code);

      (async () => {
        try {
          const info = await dataService.validateGiftcard(code);
          cacheRef.current[code] = { data: info, timestamp: Date.now() };
          setRequestBalances(prev => ({ ...prev, [requestId]: info }));
        } catch (err) {
          console.warn('[GiftcardsManager] error validating:', code, err);
          cacheRef.current[code] = { data: { error: String(err) }, timestamp: Date.now() };
        } finally {
          validationInProgressRef.current.delete(code);
        }
      })();
    }, 300); // Debounce 300ms
  }, []);

  // Cleanup: limpiar timers de debounce cuando el componente se desmonta
  React.useEffect(() => {
    return () => {
      Object.values(debounceRef.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Helper para obtener saldo de un request
  const getBalanceForRequest = (req: GiftcardRequest) => {
    const cached = requestBalances[req.id];
    const issuedGiftcards = adminData.giftcards || [];
    // If cached and has numeric balance, prefer it
    if (cached && typeof cached.balance !== 'undefined' && !cached.error) {
      console.debug('[GiftcardsManager.getBalanceForRequest] using cached balance for request', req.id, 'balance=', cached.balance);
      return Number(cached.balance);
    }

    // Try to find matching issued giftcard in adminData
    const issuedCode = (req as any).metadata?.issuedCode || (req as any).metadata?.issued_code || req.code;
    if (issuedGiftcards && issuedGiftcards.length > 0) {
      const match = issuedGiftcards.find((g: any) => {
        if (!g) return false;
        if (g.giftcardRequestId && String(g.giftcardRequestId) === String(req.id)) return true;
        if (g.code && issuedCode && String(g.code) === String(issuedCode)) return true;
        if (g.metadata && (g.metadata.issuedCode === issuedCode || g.metadata.issued_code === issuedCode)) return true;
        return false;
      });
      if (match && typeof match.balance !== 'undefined') {
        console.debug('[GiftcardsManager.getBalanceForRequest] matched issued giftcard for request', req.id, 'giftcardId=', match.id, 'balance=', match.balance);
        return Number(match.balance);
      }
    }

    // If cached exists but no balance field, maybe validate returned a different shape
    if (cached && typeof cached === 'object' && cached !== null) {
      if (typeof cached.data === 'object' && typeof cached.data.balance !== 'undefined') {
        console.debug('[GiftcardsManager.getBalanceForRequest] using cached.data.balance for request', req.id, 'balance=', cached.data.balance);
        return Number(cached.data.balance);
      }
      console.debug('[GiftcardsManager.getBalanceForRequest] cached entry exists but no balance field for request', req.id, 'cached=', cached);
    }

    return null;
  };
  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="w-full flex justify-between items-center">
        <h2 className="text-2xl font-bold text-brand-primary mb-4">Gestión de Giftcards</h2>
        <button
          onClick={() => setShowManualCreateModal(true)}
          className="px-4 py-2 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors shadow"
        >
          + Crear Giftcard
        </button>
      </div>
      
      <GiftcardManualCreateModal
        isOpen={showManualCreateModal}
        onClose={() => setShowManualCreateModal(false)}
        onSuccess={() => {
          // Refrescar lista de giftcards
          adminData.refreshCritical?.();
        }}
      />
      
      {/* 🔍 FILTROS */}
      <div className="w-full flex gap-2 flex-wrap justify-center mb-4">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            activeFilter === 'all' 
              ? 'bg-brand-primary text-white shadow-md' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📋 Todas ({adminData.giftcardRequests.length})
        </button>
        <button
          onClick={() => setActiveFilter('pending_send')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            activeFilter === 'pending_send' 
              ? 'bg-brand-primary text-white shadow-md' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📋 Por Revisar ({adminData.giftcardRequests.filter(r => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveFilter('scheduled')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            activeFilter === 'scheduled' 
              ? 'bg-brand-primary text-white shadow-md' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📅 Programadas ({adminData.giftcardRequests.filter((r: any) => r.scheduledSendAt && r.status === 'approved').length})
        </button>
        <button
          onClick={() => setActiveFilter('with_balance')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            activeFilter === 'with_balance' 
              ? 'bg-brand-primary text-white shadow-md' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ✉️ Enviadas ({adminData.giftcardRequests.filter(r => r.status === 'approved' && !(r as any).scheduledSendAt).length})
        </button>
        <button
          onClick={() => setActiveFilter('redeemed')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            activeFilter === 'redeemed' 
              ? 'bg-brand-primary text-white shadow-md' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ✅ Redimidas ({adminData.giftcardRequests.filter(r => {
            const bal = getBalanceForRequest(r);
            return bal !== null && bal === 0;
          }).length})
        </button>
      </div>
      
      <p className="text-brand-secondary text-center mb-2">Aquí podrás gestionar todas las solicitudes de giftcard recibidas.</p>
      {adminData.loading ? (
        <div className="w-full text-center text-brand-border italic">Cargando solicitudes...</div>
      ) : adminData.giftcardRequests.length === 0 ? (
        <div className="w-full text-center text-brand-border italic">No hay solicitudes de giftcard registradas.</div>
      ) : (
        <>
          {(() => {
            const pendingScheduled = adminData.giftcardRequests.filter((req: any) => req.scheduledSendAt && req.status === 'approved');
            const [showScheduledModal, setShowScheduledModal] = React.useState(false);
            if (pendingScheduled.length > 0) {
              return (
                <>
                  <div className="mb-4 p-4 bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 border-2 border-brand-primary/30 rounded-lg flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">📅</span>
                      <div>
                        <div className="text-brand-primary font-bold text-lg">
                          {pendingScheduled.length} giftcard{pendingScheduled.length !== 1 ? 's' : ''} pendiente{pendingScheduled.length !== 1 ? 's' : ''} de envío programado
                        </div>
                        <div className="text-sm text-brand-secondary">Próximo envío: {utcToLocal(pendingScheduled[0]?.scheduledSendAt)?.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) || '—'}</div>
                      </div>
                    </div>
                    <button
                      className="px-4 py-2 text-sm bg-brand-primary text-white rounded-full hover:bg-brand-primary/90 transition-colors font-semibold shadow"
                      onClick={() => setShowScheduledModal(true)}
                    >
                      Ver detalles
                    </button>
                  </div>
                  {showScheduledModal && (
                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-brand-border relative max-h-96 overflow-y-auto">
                        <button
                          className="absolute top-3 right-3 text-brand-secondary hover:text-brand-primary text-xl font-bold"
                          onClick={() => setShowScheduledModal(false)}
                          aria-label="Cerrar"
                        >×</button>
                        <h3 className="text-xl font-bold text-brand-primary mb-4">📅 Giftcards programadas para envío</h3>
                        <div className="space-y-3">
                          {pendingScheduled.map((r: any, idx: number) => {
                            const scheduledDateUTC = new Date(r.scheduledSendAt);
                            const scheduledDateLocal = utcToLocal(r.scheduledSendAt);
                            const now = new Date();
                            const isPast = scheduledDateLocal && scheduledDateLocal < now;
                            return (
                              <div key={r.id} className={`p-4 rounded-lg border-2 flex justify-between items-start ${isPast ? 'bg-red-50 border-red-200' : 'bg-brand-primary/5 border-brand-primary/30'}`}>
                                <div className="flex-1">
                                  <div className="font-bold text-brand-primary">{idx + 1}. {r.recipientName}</div>
                                  <div className="text-sm text-brand-secondary">{r.recipientEmail || r.recipientWhatsapp}</div>
                                  <div className="text-sm mt-2">
                                    <span className="font-semibold">Método:</span> {r.sendMethod === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}
                                  </div>
                                  <div className="text-sm">
                                    <span className="font-semibold">Monto:</span> ${r.amount}
                                  </div>
                                  <div className={`text-sm mt-2 font-semibold ${isPast ? 'text-red-700' : 'text-brand-primary'}`}>
                                    ⏰ {scheduledDateLocal?.toLocaleString('es-ES', { 
                                      weekday: 'short',
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                  {isPast && (
                                    <div className="text-xs text-red-600 mt-1">⚠️ Este envío debería haber ocurrido ya</div>
                                  )}
                                </div>
                                <button
                                  className="ml-3 px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 transition-colors whitespace-nowrap"
                                  onClick={async () => {
                                    const confirm = window.confirm(`¿Enviar giftcard ahora a ${r.recipientName}?`);
                                    if (!confirm) return;
                                    setIsProcessing(true);
                                    try {
                                      const res = await dataService.sendGiftcardNow(r.id);
                                      if (res && res.success) {
                                        alert('✅ Giftcard enviada exitosamente');
                                        adminData.refreshCritical();
                                        setShowScheduledModal(false);
                                      } else {
                                        alert('❌ Error: ' + (res?.error || 'error desconocido'));
                                      }
                                    } catch (err) {
                                      alert('Error: ' + (err instanceof Error ? err.message : 'error desconocido'));
                                    } finally {
                                      setIsProcessing(false);
                                    }
                                  }}
                                >
                                  🚀 Enviar
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            }
            return null;
          })()}
          {(() => {
            const filteredRequests = adminData.giftcardRequests.filter(req => {
              if (activeFilter === 'all') return true;
              if (activeFilter === 'pending_send') return req.status === 'pending';
              if (activeFilter === 'scheduled') return !!(req as any).scheduledSendAt && req.status === 'approved';
              if (activeFilter === 'with_balance') {
                return req.status === 'approved' && !(req as any).scheduledSendAt;
              }
              if (activeFilter === 'redeemed') {
                const bal = getBalanceForRequest(req);
                return bal !== null && bal === 0;
              }
              return true;
            });

            if (filteredRequests.length === 0) {
              return (
                <div className="w-full text-center py-8 text-brand-border italic">
                  No hay giftcards en esta categoría
                </div>
              );
            }

            // 📑 CALCULAR PAGINACIÓN
            const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

            // Reset página si es inválida
            React.useEffect(() => {
              if (currentPage > totalPages && totalPages > 0) {
                setCurrentPage(1);
              }
            }, [filteredRequests.length, currentPage, totalPages]);

            return (
              <div className="w-full space-y-4">
          <table className="w-full border rounded-xl overflow-hidden shadow">
          <thead className="bg-brand-background">
            <tr>
              <th className="px-4 py-3 text-left text-brand-secondary font-bold text-sm">Comprador / Destinatario</th>
              <th className="px-4 py-3 text-center text-brand-secondary font-bold text-sm">Monto</th>
              <th className="px-4 py-3 text-center text-brand-secondary font-bold text-sm">Estado</th>
              <th className="px-4 py-3 text-center text-brand-secondary font-bold text-sm">Saldo</th>
              <th className="px-4 py-3 text-center text-brand-secondary font-bold text-sm">Envío</th>
              <th className="px-4 py-3 text-center text-brand-secondary font-bold text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRequests.map(req => {
              // DEBUG
              if ((req as any).scheduledSendAt) {
                console.log('📅 GiftCard con programación:', {
                  id: req.id,
                  recipient: req.recipientName,
                  scheduledSendAt: (req as any).scheduledSendAt,
                  sendMethod: (req as any).sendMethod
                });
              }
              
              const bal = getBalanceForRequest(req);
              const isScheduled = (req as any).scheduledSendAt;
              const scheduledDateUTC = isScheduled ? new Date((req as any).scheduledSendAt) : null;
              const scheduledDateLocal = isScheduled ? utcToLocal((req as any).scheduledSendAt) : null;
              const isPastSchedule = scheduledDateLocal && scheduledDateLocal < new Date();
              
              return (
                <tr 
                  key={req.id} 
                  className={`border-t transition-colors hover:bg-brand-background/30 ${isScheduled && isPastSchedule ? 'bg-red-50' : ''}`}
                  onMouseEnter={() => setVisibleRows(prev => new Set([...prev, String(req.id)]))}
                >
                  {/* Comprador / Destinatario */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-brand-primary text-sm">{req.buyerName}</div>
                      <div className="text-xs text-brand-secondary">{req.buyerEmail}</div>
                      <div className="font-semibold text-brand-primary text-sm mt-1">→ {req.recipientName}</div>
                      <div className="text-xs text-brand-secondary flex items-center gap-1">
                        {req.recipientEmail ? (
                          <>📧 {req.recipientEmail}</>
                        ) : req.recipientWhatsapp ? (
                          <>💬 {req.recipientWhatsapp}</>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* Monto */}
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-lg text-brand-primary">${req.amount}</span>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        req.status === 'approved' ? 'bg-green-100 text-green-700' : 
                        req.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {req.status}
                      </span>
                      {bal !== null && bal <= 0 && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-200 text-red-700">
                          ✓ Redimida
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Saldo */}
                  <td className="px-4 py-3 text-center">
                    {bal === null ? (
                      <span className="text-xs text-gray-500">—</span>
                    ) : (
                      <span className={`font-mono font-bold text-sm ${bal <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${bal.toFixed(2)}
                      </span>
                    )}
                  </td>

                  {/* Envío (Método + Fecha/Hora si está programado) */}
                  <td className="px-4 py-3 text-center">
                    {isScheduled ? (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold">
                          {(req as any).sendMethod === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}
                        </div>
                        <div className={`text-xs font-semibold ${isPastSchedule ? 'text-red-700 bg-red-100' : 'text-brand-primary bg-brand-primary/10'} px-2 py-1 rounded`}>
                          📅 {scheduledDateLocal!.toLocaleString('es-ES', { 
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {isPastSchedule && (
                          <div className="text-xs text-red-600 font-semibold">⚠️ Vencida</div>
                        )}
                        <button
                          className="mt-1 px-2 py-1 rounded text-xs bg-orange-500 text-white hover:bg-orange-600 transition-colors font-semibold"
                          onClick={() => {
                            setEditScheduleModal({
                              isOpen: true,
                              requestId: req.id,
                              currentDate: scheduledDateLocal?.toISOString().split('T')[0] || '',
                              currentTime: `${String(scheduledDateLocal?.getHours()).padStart(2, '0')}:${String(scheduledDateLocal?.getMinutes()).padStart(2, '0')}`,
                              recipientName: req.recipientName
                            });
                          }}
                        >
                          ✏️ Editar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-xs text-gray-500 block">—</span>
                        <button
                          className="px-2 py-1 rounded text-xs bg-blue-500 text-white hover:bg-blue-600 transition-colors font-semibold"
                          onClick={() => {
                            setEditScheduleModal({
                              isOpen: true,
                              requestId: req.id,
                              currentDate: new Date().toISOString().split('T')[0],
                              currentTime: '14:00',
                              recipientName: req.recipientName
                            });
                          }}
                        >
                          📅 Programar
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {isScheduled && (
                        <button
                          className="px-2 py-1 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 transition-colors"
                          onClick={async () => {
                            const confirm = window.confirm(`¿Enviar giftcard ahora a ${req.recipientName}?`);
                            if (!confirm) return;
                            setIsProcessing(true);
                            try {
                              const res = await dataService.sendGiftcardNow(req.id);
                              if (res && res.success) {
                                alert('✅ Giftcard enviada exitosamente');
                                adminData.refreshCritical();
                              } else {
                                alert('❌ Error: ' + (res?.error || 'error desconocido'));
                              }
                            } catch (err) {
                              alert('Error: ' + (err instanceof Error ? err.message : 'error desconocido'));
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                          disabled={isProcessing}
                          title="Enviar giftcard programada ahora"
                        >
                          🚀 Enviar
                        </button>
                      )}
                      <button
                        className="px-2 py-1 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 transition-colors"
                        onClick={() => {
                          setSelected(req);
                          const code = (req as any).metadata?.issuedCode || (req as any).metadata?.issued_code || req.code;
                          if (code) {
                            validateCodeOnDemand(code, req.id);
                          }
                        }}
                        title="Ver detalles completos"
                      >
                        📋 Info
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 📑 CONTROLES DE PAGINACIÓN */}
        <div className="w-full flex items-center justify-between py-4 px-4 bg-brand-background rounded-xl">
          <div className="text-sm text-brand-secondary font-semibold">
            Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredRequests.length)} de {filteredRequests.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg bg-white border border-brand-border text-brand-primary font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
                    currentPage === page
                      ? 'bg-brand-primary text-white'
                      : 'bg-white border border-brand-border text-brand-secondary hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-lg bg-white border border-brand-border text-brand-primary font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
              </div>
            );
          })()}
        </>
      )}
      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-brand-border overflow-hidden">
            {/* Encabezado Fijo */}
            <div className="flex-shrink-0 border-b border-brand-border p-5 bg-gradient-to-r from-brand-primary/5 to-brand-background">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-brand-primary mb-3">📋 Detalles Giftcard</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="font-semibold">Comprador:</span> <span className="font-semibold text-brand-primary">{selected.buyerName}</span></div>
                    <div><span className="font-semibold">Destinatario:</span> <span className="font-semibold text-brand-primary">{selected.recipientName}</span></div>
                    <div><span className="font-semibold">Monto:</span> <span className="font-bold text-green-600">${selected.amount}</span></div>
                    <div><span className="font-semibold">Estado:</span> <span className={`px-2 py-0.5 rounded text-xs font-semibold ${selected.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : selected.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selected.status}</span></div>
                  </div>
                </div>
                <button
                  className="text-brand-secondary hover:text-brand-primary text-2xl font-bold flex-shrink-0"
                  onClick={() => setSelected(null)}
                  aria-label="Cerrar"
                >×</button>
              </div>
            </div>

            {/* Contenido Scrolleable */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {/* Contacto */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-bold text-gray-600 mb-2 uppercase">Contacto</div>
                <div className="space-y-1 text-xs">
                  <div><span className="font-semibold">Email Comprador:</span> {selected.buyerEmail}</div>
                  <div><span className="font-semibold">Destinatario:</span> {selected.recipientEmail || selected.recipientWhatsapp || 'N/A'}</div>
                  {(selected as any).metadata?.issuedCode && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-semibold">Código Emitido:</span>
                      <span className="font-mono bg-white px-2 py-1 rounded border text-brand-primary font-bold">{(selected as any).metadata.issuedCode}</span>
                      <button
                        className="px-2 py-1 text-xs bg-brand-primary text-white rounded hover:bg-brand-primary/90"
                        onClick={() => {
                          navigator.clipboard?.writeText((selected as any).metadata.issuedCode);
                          alert('✅ Copiado');
                        }}
                      >📋</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Envío Programado */}
              {((selected as any).scheduledSendAt || (selected as any).sendMethod) && (
                <div className="bg-brand-primary/5 rounded-lg p-3 border border-brand-primary/30">
                  <div className="text-xs font-bold text-brand-primary mb-2 uppercase">📅 Envío Programado</div>
                  <div className="space-y-2 text-xs">
                    <div><span className="font-semibold">Método:</span> {(selected as any).sendMethod === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}</div>
                    {(selected as any).scheduledSendAt && (
                      <>
                        <div>
                          <div className="font-semibold">Programado:</div>
                          <div className="font-mono bg-white px-2 py-1.5 rounded border border-brand-primary/30 text-brand-primary font-bold mt-1">
                            {utcToLocal((selected as any).scheduledSendAt)?.toLocaleString('es-ES', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {new Date((selected as any).scheduledSendAt) < new Date() && (
                          <div className="text-xs bg-red-100 text-red-700 p-1.5 rounded">⚠️ Debería haber sido enviada</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Estado Emails */}
              {selected.metadata?.emailDelivery && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-xs font-bold text-blue-900 mb-2 uppercase">✉️ Estado Emails</div>
                  <div className="space-y-1 text-xs">
                    <div><span className="font-semibold">Comprador:</span> {selected.metadata.emailDelivery.buyer?.sent ? '✅ Enviado' : '❌ No'}</div>
                    <div><span className="font-semibold">Destinatario:</span> {selected.metadata.emailDelivery.recipient?.sent ? '✅ Enviado' : '❌ No'}</div>
                  </div>
                </div>
              )}

              {/* Saldo */}
              {requestBalances[selected.id] && !requestBalances[selected.id].error && (
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-900 mb-2 uppercase">💰 Saldo</div>
                  <div className="space-y-1 text-xs">
                    <div><span className="font-semibold">Actual:</span> <span className="font-mono font-bold">${Number(requestBalances[selected.id].balance).toFixed(2)}</span></div>
                    {requestBalances[selected.id].initialValue !== undefined && (
                      <div><span className="font-semibold">Inicial:</span> <span className="font-mono font-bold">${Number(requestBalances[selected.id].initialValue).toFixed(2)}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Nota */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Nota (Opcional)</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full p-2 border border-brand-border rounded text-xs resize-none"
                  rows={2}
                  placeholder="Nota visible en historial..."
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Botones Fijos */}
            <div className="flex-shrink-0 border-t border-brand-border p-4 bg-gray-50 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {selected.status === 'pending' ? (
                  <button
                    className="col-span-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                    onClick={async () => {
                      const adminUser = window.prompt('Usuario admin:', 'admin') || 'admin';
                      setIsProcessing(true);
                      try {
                        const res = await dataService.approveGiftcardRequest(selected.id, adminUser, noteText || undefined);
                        if (res && res.success) {
                          adminData.refreshCritical();
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
                  >✅ Revisar & Aprobar</button>
                ) : (
                  <button className="col-span-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled" disabled>✓ Aprobado</button>
                )}
                
                {selected.status === 'approved' && (
                  <button
                    className="px-3 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
                    onClick={async () => {
                      const confirm = window.confirm('¿Enviar ahora?');
                      if (!confirm) return;
                      setIsProcessing(true);
                      try {
                        const res = await dataService.sendGiftcardNow(selected.id);
                        if (res && res.success) {
                          alert('✅ Enviada');
                          adminData.refreshCritical();
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
                  >🚀 Enviar</button>
                )}

                <button
                  className="px-3 py-2 rounded-lg border-2 border-red-600 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
                  onClick={async () => {
                    const confirmReject = window.confirm('¿Rechazar?');
                    if (!confirmReject) return;
                    const adminUser = window.prompt('Usuario admin:', 'admin') || 'admin';
                    setIsProcessing(true);
                    try {
                      const res = await dataService.rejectGiftcardRequest(selected.id, adminUser, noteText || undefined);
                      if (res && res.success) {
                        adminData.refreshCritical();
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
                >❌ Rechazar</button>

                <button
                  className="px-3 py-2 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-800 disabled:opacity-50 transition-colors"
                  onClick={async () => {
                    const confirmDelete = window.confirm('¿Confirma que desea ELIMINAR esta solicitud?');
                    if (!confirmDelete) return;
                    const adminUser = window.prompt('Usuario admin:', 'admin') || 'admin';
                    setIsProcessing(true);
                    try {
                      const res = await dataService.deleteGiftcardRequest(selected.id, adminUser, noteText || undefined);
                      if (res && res.success) {
                        alert('✅ Eliminada');
                        adminData.refreshCritical();
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
                >🗑️ Eliminar</button>

                <button
                  className="px-3 py-2 rounded-lg border-2 border-brand-border text-brand-secondary text-sm font-semibold hover:bg-brand-background disabled:opacity-50 transition-colors"
                  onClick={() => setSelected(null)}
                  disabled={isProcessing}
                >Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* 📅 MODAL DE EDICIÓN DE PROGRAMACIÓN */}
      {editScheduleModal.isOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-brand-border relative">
            <button
              className="absolute top-3 right-3 text-brand-secondary hover:text-brand-primary text-xl font-bold"
              onClick={() => setEditScheduleModal({ isOpen: false })}
              aria-label="Cerrar"
            >×</button>
            <h3 className="text-xl font-bold text-brand-primary mb-4">
              {editScheduleModal.currentDate && editScheduleModal.currentTime ? '✏️ Editar Programación' : '📅 Programar Envío'}
            </h3>
            <p className="text-sm text-brand-secondary mb-4">Destinatario: <span className="font-semibold">{editScheduleModal.recipientName}</span></p>

            <div className="space-y-4">
              {/* Fecha */}
              <div>
                <label className="block text-sm font-semibold text-brand-secondary mb-2">Fecha</label>
                <input
                  type="date"
                  value={editScheduleModal.currentDate || ''}
                  onChange={(e) => {
                    setEditScheduleModal(prev => ({
                      ...prev,
                      currentDate: e.target.value
                    }));
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Hora */}
              <div>
                <label className="block text-sm font-semibold text-brand-secondary mb-2">Hora</label>
                <input
                  type="time"
                  value={editScheduleModal.currentTime || ''}
                  onChange={(e) => {
                    setEditScheduleModal(prev => ({
                      ...prev,
                      currentTime: e.target.value
                    }));
                  }}
                  className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-2 mt-6">
                <button
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                  onClick={() => setEditScheduleModal({ isOpen: false })}
                  disabled={editScheduleModal.isLoading}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
                  onClick={async () => {
                    if (!editScheduleModal.requestId || !editScheduleModal.currentDate || !editScheduleModal.currentTime) {
                      alert('Por favor completa fecha y hora');
                      return;
                    }

                    setEditScheduleModal(prev => ({ ...prev, isLoading: true }));
                    try {
                      // Construir fecha UTC
                      const [hours, minutes] = editScheduleModal.currentTime.split(':').map(Number);
                      const date = new Date(editScheduleModal.currentDate);
                      date.setUTCHours(hours + 5, minutes, 0, 0); // Convertir a UTC (UTC-5)
                      const utcDateTime = date.toISOString();

                      const res = await dataService.updateGiftcardSchedule(
                        editScheduleModal.requestId,
                        utcDateTime
                      );

                      if (res && res.success) {
                        alert('✅ Programación actualizada exitosamente');
                        adminData.refreshCritical();
                        setEditScheduleModal({ isOpen: false });
                      } else {
                        alert('❌ Error: ' + (res?.error || 'error desconocido'));
                      }
                    } catch (err) {
                      alert('Error: ' + (err instanceof Error ? err.message : 'error desconocido'));
                    } finally {
                      setEditScheduleModal(prev => ({ ...prev, isLoading: false }));
                    }
                  }}
                  disabled={editScheduleModal.isLoading}
                >
                  {editScheduleModal.isLoading ? '⏳ Guardando...' : '💾 Guardar'}
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
