import React, { useState } from 'react';
import type { ExperienceConfirmation } from '../../types';

export interface ExperienceConfirmationPanelProps {
  confirmations: ExperienceConfirmation[];
  onConfirm: (id: string, reason?: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

export const ExperienceConfirmationPanel: React.FC<ExperienceConfirmationPanelProps> = ({
  confirmations,
  onConfirm,
  onReject,
  isLoading = false
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleConfirm = async (id: string) => {
    try {
      setError('');
      await onConfirm(id);
      setSuccess('Experiencia confirmada');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar');
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      setError('Por favor proporciona una razón para rechazar');
      return;
    }
    try {
      setError('');
      await onReject(id, rejectionReason);
      setSuccess('Experiencia rechazada');
      setSelectedId(null);
      setRejectionReason('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rechazar');
    }
  };

  const pending = confirmations.filter((c) => c.status === 'pending');
  const confirmed = confirmations.filter((c) => c.status === 'confirmed');
  const rejected = confirmations.filter((c) => c.status === 'rejected');

  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[status as keyof typeof colors] || ''}`}>
        {status === 'pending' ? 'Pendiente' : status === 'confirmed' ? 'Confirmada' : 'Rechazada'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded">{success}</div>}

      {/* Pending Confirmations - Priority */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3 text-yellow-700">Pendientes de Confirmación ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map((conf) => (
              <div key={conf.id} className="p-4 border-2 border-yellow-200 rounded-lg bg-yellow-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold">{(conf as any).userInfo?.firstName || 'Cliente'}</div>
                    <div className="text-sm text-gray-600">{(conf as any).bookingCode}</div>
                    {(conf as any).piecesSelected && (
                      <div className="text-sm text-gray-500 mt-1">
                        Piezas: {((conf as any).piecesSelected || []).length}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={conf.status} />
                </div>

                {conf.expiresAt && (
                  <div className="text-xs text-red-600 mb-2">
                    Expira: {new Date(conf.expiresAt).toLocaleString()}
                  </div>
                )}

                {selectedId === conf.id ? (
                  <div className="space-y-3 mb-3">
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 border rounded text-sm"
                      placeholder="Razón del rechazo (opcional pero recomendado)"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedId(null);
                          setRejectionReason('');
                        }}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleReject(conf.id)}
                        disabled={isLoading}
                        className="flex-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirm(conf.id)}
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-bold"
                  >
                    ✓ Confirmar
                  </button>
                  <button
                    onClick={() => setSelectedId(conf.id)}
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 text-sm"
                  >
                    ✕ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Experiences */}
      {confirmed.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3 text-green-700">Confirmadas ({confirmed.length})</h3>
          <div className="space-y-2">
            {confirmed.map((conf) => (
              <div key={conf.id} className="p-3 border border-green-200 rounded-lg bg-green-50 text-sm">
                <div className="flex justify-between">
                  <div>
                    <div className="font-bold">{(conf as any).userInfo?.firstName || 'Cliente'}</div>
                    <div className="text-gray-600">{(conf as any).bookingCode}</div>
                  </div>
                  <div>
                    <StatusBadge status={conf.status} />
                  </div>
                </div>
                {conf.confirmationReason && <div className="text-xs text-gray-600 mt-1">{conf.confirmationReason}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Experiences */}
      {rejected.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3 text-red-700">Rechazadas ({rejected.length})</h3>
          <div className="space-y-2">
            {rejected.map((conf) => (
              <div key={conf.id} className="p-3 border border-red-200 rounded-lg bg-red-50 text-sm">
                <div className="flex justify-between">
                  <div>
                    <div className="font-bold">{(conf as any).userInfo?.firstName || 'Cliente'}</div>
                    <div className="text-gray-600">{(conf as any).bookingCode}</div>
                  </div>
                  <div>
                    <StatusBadge status={conf.status} />
                  </div>
                </div>
                {conf.rejectionReason && <div className="text-xs text-red-700 mt-1">{conf.rejectionReason}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmations.length === 0 && (
        <div className="text-center py-8 text-gray-600">No hay confirmaciones de experiencias pendientes</div>
      )}
    </div>
  );
};

export default ExperienceConfirmationPanel;
