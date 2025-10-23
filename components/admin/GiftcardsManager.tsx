import * as React from 'react';
import type { GiftcardRequest } from '../../services/dataService';
import * as dataService from '../../services/dataService';
import { useAdminData } from '../../context/AdminDataContext';

const GiftcardsManager: React.FC = () => {
  const adminData = useAdminData();
  const [selected, setSelected] = React.useState<GiftcardRequest | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');
  const [proofPreview, setProofPreview] = React.useState<string | null>(null);
  return (
    <div className="w-full flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-brand-primary mb-4">Gestión de Giftcards</h2>
      <p className="text-brand-secondary text-center mb-2">Aquí podrás gestionar todas las solicitudes de giftcard recibidas.</p>
      {adminData.loading ? (
        <div className="w-full text-center text-brand-border italic">Cargando solicitudes...</div>
      ) : adminData.giftcardRequests.length === 0 ? (
        <div className="w-full text-center text-brand-border italic">No hay solicitudes de giftcard registradas.</div>
      ) : (
        <table className="w-full max-w-3xl mx-auto border rounded-xl overflow-hidden shadow">
          <thead className="bg-brand-background">
            <tr>
              <th className="px-4 py-2 text-left text-brand-secondary">Comprador</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Destinatario</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Monto</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Código</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Estado</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Fecha</th>
              <th className="px-4 py-2 text-left text-brand-secondary"></th>
            </tr>
          </thead>
          <tbody>
            {adminData.giftcardRequests.map(req => (
              <tr key={req.id} className="border-t">
                <td className="px-4 py-2">{req.buyerName} <br /><span className="text-xs text-brand-secondary">{req.buyerEmail}</span></td>
                <td className="px-4 py-2">{req.recipientName} <br /><span className="text-xs text-brand-secondary">{req.recipientEmail || req.recipientWhatsapp}</span></td>
                <td className="px-4 py-2 font-bold text-brand-primary">${req.amount}</td>
                <td className="px-4 py-2 font-mono text-xs">{req.code}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{req.status}</span>
                </td>
                <td className="px-4 py-2 text-xs text-brand-secondary">{new Date(req.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <button
                    className="px-3 py-1 rounded-full bg-brand-primary text-white text-xs font-semibold shadow hover:bg-brand-primary/90 transition-colors"
                    onClick={() => setSelected(req)}
                  >Ver detalles</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              <div><span className="font-semibold">Estado:</span> <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selected.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : selected.status === 'approved' ? 'bg-green-100 text-green-700' : selected.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{selected.status}</span></div>
              <div><span className="font-semibold">Fecha:</span> {new Date(selected.createdAt).toLocaleString()}</div>
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
