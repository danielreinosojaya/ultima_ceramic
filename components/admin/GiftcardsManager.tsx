import * as React from 'react';
import type { GiftcardRequest } from '../../services/dataService';
import * as dataService from '../../services/dataService';
import { useAdminData } from '../../context/AdminDataContext';
import { GiftcardManualCreateModal } from './GiftcardManualCreateModal';

const GiftcardsManager: React.FC = () => {
  const adminData = useAdminData();
  const [selected, setSelected] = React.useState<GiftcardRequest | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');
  const [proofPreview, setProofPreview] = React.useState<string | null>(null);
  const [showManualCreateModal, setShowManualCreateModal] = React.useState(false);
  // Map of requestId -> giftcard validation info (balance, initialValue, metadata, giftcardId)
  const [requestBalances, setRequestBalances] = React.useState<Record<string, any>>({});
  const [visibleRows, setVisibleRows] = React.useState<Set<string>>(new Set());
  
  // Cache para evitar re-validaciones innecesarias
  const cacheRef = React.useRef<Record<string, { data: any; timestamp: number }>>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  const validationInProgressRef = React.useRef<Set<string>>(new Set());

  // Lazy load: validar código solo cuando es necesario (cuando entra en viewport o se abre modal)
  const validateCodeLazy = React.useCallback((code: string, requestId: string) => {
    // Si ya está en caché, skip
    const cached = cacheRef.current[code];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setRequestBalances(prev => ({ ...prev, [requestId]: cached.data }));
      return;
    }

    // Si ya está validando, skip
    if (validationInProgressRef.current.has(code)) {
      return;
    }

    // Marcar como en progreso
    validationInProgressRef.current.add(code);

    (async () => {
      try {
        const info = await dataService.validateGiftcard(code);
        
        // Guardar en caché
        cacheRef.current[code] = { data: info, timestamp: Date.now() };
        
        // Actualizar estado
        setRequestBalances(prev => ({ ...prev, [requestId]: info }));
      } catch (err) {
        console.warn('[GiftcardsManager] error validating:', code, err);
        cacheRef.current[code] = { data: { error: String(err) }, timestamp: Date.now() };
      } finally {
        validationInProgressRef.current.delete(code);
      }
    })();
  }, []);

  // ✅ CORRECTO: useEffect en top level del componente
  // Validar lazily cuando filas se hacen visibles
  React.useEffect(() => {
    if (!adminData.giftcardRequests) return;
    
    // Validar todas las filas visibles
    for (const req of adminData.giftcardRequests) {
      if (!visibleRows.has(String(req.id))) continue;
      
      const code = (req as any).metadata?.issuedCode || (req as any).metadata?.issued_code || req.code;
      if (!code) continue;
      
      // Si ya está en caché o validando, skip
      const cached = cacheRef.current[code];
      if (cached) continue;
      if (validationInProgressRef.current.has(code)) continue;
      
      // Validar
      validateCodeLazy(code, req.id);
    }
  }, [visibleRows, adminData.giftcardRequests, validateCodeLazy]);

  // REMOVED: No validar en bulk en carga inicial
  // El useEffect anterior se ha removido para evitar 21 requests de una vez
  // Ahora se valida lazy: solo cuando se necesita (Intersection Observer o cuando abre modal)

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
      
      <p className="text-brand-secondary text-center mb-2">Aquí podrás gestionar todas las solicitudes de giftcard recibidas.</p>
      {adminData.loading ? (
        <div className="w-full text-center text-brand-border italic">Cargando solicitudes...</div>
      ) : adminData.giftcardRequests.length === 0 ? (
        <div className="w-full text-center text-brand-border italic">No hay solicitudes de giftcard registradas.</div>
      ) : (
        <>
          {(() => {
            const pendingScheduled = adminData.giftcardRequests.filter((req: any) => req.scheduledSendAt && req.status === 'approved');
            if (pendingScheduled.length > 0) {
              return (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded-lg flex items-center justify-between">
                  <span className="text-blue-700 font-semibold">
                    📅 {pendingScheduled.length} giftcard{pendingScheduled.length !== 1 ? 's' : ''} pendiente{pendingScheduled.length !== 1 ? 's' : ''} de envío programado
                  </span>
                  <button
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700"
                    onClick={() => {
                      const list = pendingScheduled.map((r: any) => `- ${r.recipientName} (${r.recipientEmail || r.recipientWhatsapp}): ${new Date(r.scheduledSendAt).toLocaleString('es-ES')}`).join('\n');
                      alert('Giftcards programadas:\n\n' + list);
                    }}
                  >
                    Ver detalles
                  </button>
                </div>
              );
            }
            return null;
          })()}
          <table className="w-full max-w-3xl mx-auto border rounded-xl overflow-hidden shadow">
          <thead className="bg-brand-background">
            <tr>
              <th className="px-4 py-2 text-left text-brand-secondary">Comprador</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Destinatario</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Monto</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Saldo actual</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Código</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Código emitido</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Estado</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Fecha</th>
              <th className="px-4 py-2 text-left text-brand-secondary"></th>
            </tr>
          </thead>
          <tbody>
            {adminData.giftcardRequests.map(req => (
              <tr 
                key={req.id} 
                className="border-t"
                onMouseEnter={() => setVisibleRows(prev => new Set([...prev, String(req.id)]))}
              >
                <td className="px-4 py-2">{req.buyerName} <br /><span className="text-xs text-brand-secondary">{req.buyerEmail}</span></td>
                <td className="px-4 py-2">{req.recipientName} <br /><span className="text-xs text-brand-secondary">{req.recipientEmail || req.recipientWhatsapp}</span></td>
                <td className="px-4 py-2 font-bold text-brand-primary">${req.amount}</td>
                <td className="px-4 py-2 font-medium text-brand-secondary">
                  {(() => {
                    const code = (req as any).metadata?.issuedCode || (req as any).metadata?.issued_code || req.code;
                    const bal = getBalanceForRequest(req);
                    
                    // ✅ NO HOOKS HERE: Solo renderizar, la validación se hace en useEffect arriba
                    
                    if (bal === null) return <span className="text-xs text-gray-500">—</span>;
                    return <span className={`font-mono text-sm ${bal <= 0 ? 'text-red-600' : 'text-brand-primary'}`}>${bal.toFixed(2)}</span>;
                  })()}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{req.code}</td>
                <td className="px-4 py-2 font-mono text-xs">{(req as any).metadata?.issuedCode || (req as any).metadata?.issued_code || '-'}</td>
                <td className="px-4 py-2 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{req.status}</span>
                  {(() => {
                    const bal = getBalanceForRequest(req);
                    if (bal !== null && bal <= 0) {
                      return (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Redimida</span>
                      );
                    }
                    return null;
                  })()}
                </td>
                <td className="px-4 py-2 text-xs text-brand-secondary">{new Date(req.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <button
                    className="px-3 py-1 rounded-full bg-brand-primary text-white text-xs font-semibold shadow hover:bg-brand-primary/90 transition-colors"
                    onClick={() => {
                      setSelected(req);
                      // Trigger lazy load cuando se abre el modal
                      const code = (req as any).metadata?.issuedCode || (req as any).metadata?.issued_code || req.code;
                      if (code) {
                        validateCodeLazy(code, req.id);
                      }
                    }}
                  >Ver detalles</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}
      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-brand-border relative">
            <button
              className="absolute top-3 right-3 text-brand-secondary hover:text-brand-primary text-xl font-bold"
              onClick={() => setSelected(null)}
              aria-label="Cerrar"
            >×</button>
            <h3 className="text-xl font-bold text-brand-primary mb-2">Detalles de la Giftcard</h3>
            <div className="flex flex-col gap-2 text-brand-secondary text-sm">
              <div><span className="font-semibold">Comprador:</span> {selected.buyerName} ({selected.buyerEmail})</div>
              <div><span className="font-semibold">Destinatario:</span> {selected.recipientName} ({selected.recipientEmail || selected.recipientWhatsapp})</div>
              <div><span className="font-semibold">Monto:</span> <span className="font-bold text-brand-primary">${selected.amount}</span></div>
              <div><span className="font-semibold">Código:</span> <span className="font-mono">{selected.code}</span></div>
              {/* Show validated giftcard balance and redeemed history if available */}
              {requestBalances[selected.id] && !requestBalances[selected.id].error && (
                <>
                  <div><span className="font-semibold">Saldo actual:</span> <span className="font-mono">${Number(requestBalances[selected.id].balance).toFixed(2)}</span></div>
                  {requestBalances[selected.id].initialValue !== undefined && (
                    <div><span className="font-semibold">Valor inicial:</span> <span className="font-mono">${Number(requestBalances[selected.id].initialValue).toFixed(2)}</span></div>
                  )}
                  {((requestBalances[selected.id].metadata && (requestBalances[selected.id].metadata.redeemedHistory || requestBalances[selected.id].metadata.redeemed_history)) ) && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-md border text-xs">
                      <div className="font-semibold mb-1">Historial de redenciones</div>
                      <pre className="whitespace-pre-wrap text-xs text-brand-secondary">{JSON.stringify(requestBalances[selected.id].metadata.redeemedHistory || requestBalances[selected.id].metadata.redeemed_history, null, 2)}</pre>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center gap-3">
                <div><span className="font-semibold">Código emitido:</span> <span className="font-mono">{(selected as any).metadata?.issuedCode || (selected as any).metadata?.issued_code || '-'}</span></div>
                {((selected as any).metadata?.issuedCode || (selected as any).metadata?.issued_code) && (
                  <button
                    className="px-2 py-1 text-xs bg-brand-primary text-white rounded-md"
                    onClick={() => {
                      const code = (selected as any).metadata?.issuedCode || (selected as any).metadata?.issued_code;
                      if (!code) return;
                      navigator.clipboard?.writeText(code);
                      alert('Código emitido copiado al portapapeles: ' + code);
                    }}
                  >Copiar</button>
                )}
              </div>
              <div><span className="font-semibold">Estado:</span> <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selected.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : selected.status === 'approved' ? 'bg-green-100 text-green-700' : selected.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{selected.status}</span></div>
              <div><span className="font-semibold">Fecha:</span> {new Date(selected.createdAt).toLocaleString()}</div>
              {(() => {
                const bal = requestBalances[selected.id] ? (typeof requestBalances[selected.id].balance !== 'undefined' ? Number(requestBalances[selected.id].balance) : null) : (adminData.giftcards || []).find((g: any) => {
                  const issuedCode = (selected as any).metadata?.issuedCode || (selected as any).metadata?.issued_code || selected.code;
                  if (!issuedCode) return false;
                  if (g.giftcardRequestId && String(g.giftcardRequestId) === String(selected.id)) return true;
                  if (g.code && String(g.code) === String(issuedCode)) return true;
                  return false;
                })?.balance;
                if (typeof bal === 'number' && bal <= 0) {
                  return (
                    <div className="mt-2 text-sm text-red-700 font-semibold">Giftcard redimida — Saldo ${Number(bal).toFixed(2)}</div>
                  );
                }
                if (typeof bal === 'number') {
                  return (
                    <div className="mt-2 text-sm text-brand-secondary">Saldo actual: <span className="font-mono">${Number(bal).toFixed(2)}</span></div>
                  );
                }
                return null;
              })()}
            </div>
            {/* Metadata: email delivery and voucher URL for auditability */}
            {selected.metadata && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md border">
                <div className="text-sm font-semibold text-brand-secondary mb-2">Información de entrega</div>
                <div className="text-sm text-brand-secondary">
                  <div>
                    <span className="font-semibold">Buyer email:</span>{' '}
                    {selected.metadata.emailDelivery?.buyer ? (
                      selected.metadata.emailDelivery.buyer.sent ? (
                        <span className="text-green-700">Enviado</span>
                      ) : (
                        <span className="text-red-700">No enviado</span>
                      )
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold">Recipient email:</span>{' '}
                    {selected.metadata.emailDelivery?.recipient ? (
                      selected.metadata.emailDelivery.recipient.sent ? (
                        <span className="text-green-700">Enviado</span>
                      ) : (
                        <span className="text-red-700">No enviado</span>
                      )
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </div>
                  {selected.metadata.voucherUrl && (
                    <div className="mt-2">
                      <a href={selected.metadata.voucherUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-primary underline">Abrir voucher / comprobante</a>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Scheduling Info */}
            {((selected as any).scheduledSendAt || (selected as any).sendMethod) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="text-sm font-semibold text-blue-700 mb-2">📅 Envío programado</div>
                <div className="text-sm text-blue-700">
                  <div>
                    <span className="font-semibold">Método:</span> {(selected as any).sendMethod === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}
                  </div>
                  {(selected as any).scheduledSendAt && (
                    <div>
                      <span className="font-semibold">Programado para:</span> {new Date((selected as any).scheduledSendAt).toLocaleString('es-ES')}
                    </div>
                  )}
                </div>
                <button
                  className="mt-2 w-full px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                  onClick={async () => {
                    if (!selected) return;
                    const confirm = window.confirm('¿Enviar giftcard ahora a ' + (selected.recipientEmail || selected.recipientWhatsapp) + '?');
                    if (!confirm) return;
                    setIsProcessing(true);
                    try {
                      const res = await dataService.sendGiftcardNow(selected.id);
                      if (res && res.success) {
                        alert('✅ Giftcard enviada exitosamente');
                        adminData.refreshCritical();
                        setSelected(null);
                      } else {
                        alert('❌ Error enviando giftcard: ' + (res?.error || 'error desconocido'));
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Error: ' + (err instanceof Error ? err.message : 'error desconocido'));
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  disabled={isProcessing}
                >
                  🚀 Enviar ahora
                </button>
              </div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-semibold text-brand-secondary mb-2">Nota administrativa (opcional)</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                rows={2}
                placeholder="Añadir nota visible en el historial"
                disabled={isProcessing}
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-semibold text-brand-secondary mb-1">Adjuntar comprobante</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  // Simple client-side preview as data URL
                  const reader = new FileReader();
                  reader.onload = () => {
                    setProofPreview(typeof reader.result === 'string' ? reader.result : null);
                  };
                  reader.readAsDataURL(f);
                }}
                disabled={isProcessing}
              />
              {proofPreview && (
                <div className="mt-2">
                  <div className="text-xs text-brand-secondary mb-1">Preview:</div>
                  <img src={proofPreview} alt="proof" className="w-40 h-auto rounded-md border" />
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                className="px-3 py-2 rounded-lg bg-gray-200 text-sm text-gray-700 hover:bg-gray-300"
                onClick={() => setSelected(null)}
                disabled={isProcessing}
              >Cerrar</button>
              <button
                className="px-3 py-2 rounded-lg bg-red-600 text-sm text-white hover:bg-red-700"
                onClick={async () => {
                  if (!selected) return;
                  const confirmReject = window.confirm('¿Confirma que desea rechazar esta solicitud de giftcard?');
                  if (!confirmReject) return;
                  const adminUser = window.prompt('Ingrese su nombre de usuario administrativo para auditar esta acción:', 'admin') || 'admin';
                  setIsProcessing(true);
                  try {
                    const res = await dataService.rejectGiftcardRequest(selected.id, adminUser, noteText || undefined);
                    if (res && res.success) {
                      adminData.refreshCritical();
                      setSelected(null);
                    } else {
                      alert('No se pudo rechazar la solicitud: ' + (res?.error || 'error desconocido'));
                    }
                  } catch (err) {
                    console.error(err);
                    alert('Error rechazando la solicitud');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
              >Rechazar</button>
              <button
                className="px-3 py-2 rounded-lg bg-red-800 text-sm text-white hover:bg-red-900"
                onClick={async () => {
                  if (!selected) return;
                  const confirmDelete = window.confirm('¿Confirma que desea eliminar (marcar como borrada) esta solicitud? Esta acción es reversible solo desde la base de datos.');
                  if (!confirmDelete) return;
                  const adminUser = window.prompt('Ingrese su nombre de usuario administrativo para auditar esta acción:', 'admin') || 'admin';
                  setIsProcessing(true);
                  try {
                    const res = await dataService.deleteGiftcardRequest(selected.id, adminUser, noteText || undefined);
                    if (res && res.success) {
                      adminData.refreshCritical();
                      setSelected(null);
                    } else {
                      alert('No se pudo eliminar la solicitud: ' + (res?.error || 'error desconocido'));
                    }
                  } catch (err) {
                    console.error(err);
                    alert('Error eliminando la solicitud');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
              >Eliminar</button>
              <button
                className="px-3 py-2 rounded-lg border-2 border-red-700 text-sm text-red-700 hover:bg-red-50"
                onClick={async () => {
                  if (!selected) return;
                  const confirmHard = window.prompt('TYPE DELETE to permanently delete this request. This will remove data permanently.');
                  if (confirmHard !== 'DELETE') return;
                  const adminUser = window.prompt('Ingrese su nombre de usuario administrativo para auditar esta acción:', 'admin') || 'admin';
                  setIsProcessing(true);
                  try {
                    const res = await dataService.hardDeleteGiftcardRequest(selected.id, adminUser, noteText || undefined);
                    if (res && res.success) {
                      adminData.refreshCritical();
                      setSelected(null);
                    } else {
                      alert('No se pudo eliminar permanentemente la solicitud: ' + (res?.error || 'error desconocido'));
                    }
                  } catch (err) {
                    console.error(err);
                    alert('Error en la eliminación permanente');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
              >Eliminar permanentemente</button>
              <button
                className="px-3 py-2 rounded-lg bg-green-600 text-sm text-white hover:bg-green-700"
                onClick={async () => {
                  if (!selected) return;
                  const adminUser = window.prompt('Ingrese su nombre de usuario administrativo para auditar esta acción:', 'admin') || 'admin';
                  setIsProcessing(true);
                  try {
                    // If proofPreview exists, attach it first
                    if (proofPreview) {
                      const attachRes = await dataService.attachGiftcardProof(selected.id, proofPreview, adminUser, noteText || undefined);
                      if (!attachRes || !attachRes.success) {
                        alert('No se pudo adjuntar el comprobante: ' + (attachRes?.error || 'error desconocido'));
                        setIsProcessing(false);
                        return;
                      }
                    }
                    const res = await dataService.approveGiftcardRequest(selected.id, adminUser, noteText || undefined);
                    if (res && res.success) {
                      adminData.refreshCritical();
                      setSelected(null);
                      setNoteText('');
                      setProofPreview(null);
                    } else {
                      alert('No se pudo aprobar la solicitud: ' + (res?.error || 'error desconocido'));
                    }
                  } catch (err) {
                    console.error(err);
                    alert('Error aprobando la solicitud');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
              >Aprobar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftcardsManager;
