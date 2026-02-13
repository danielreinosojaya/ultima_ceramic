import React, { useState } from 'react';
import type { ValidationWarning } from '../../services/adminValidator';

interface ConfirmAdminOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  warnings: ValidationWarning[];
  bookingDetails: {
    customerName: string;
    productName: string;
    date: string;
    time: string;
    participants: number;
  };
  isLoading?: boolean;
}

export const ConfirmAdminOverrideModal: React.FC<ConfirmAdminOverrideModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  warnings,
  bookingDetails,
  isLoading = false
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const hasErrors = warnings.some(w => w.severity === 'error');
  const hasWarnings = warnings.some(w => w.severity === 'warning');

  const handleConfirm = async () => {
    if (hasErrors && !reason.trim()) {
      alert('Debes proporcionar una razón para hacer override de errores críticos.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasonRequired = hasErrors && !reason.trim();

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <span className="text-3xl">⚠️</span>
            Confirmación de Override Admin
          </h2>
          <p className="text-gray-600">
            Estás a punto de crear una reserva que viola {warnings.length} regla(s) del sistema
          </p>
        </div>

        {/* Warnings/Errors List */}
        <div className="space-y-3 mb-6 max-h-48 overflow-y-auto">
          {warnings.map((warning, index) => (
            <div
              key={`${warning.code}-${index}`}
              className={`p-4 rounded-lg border-l-4 ${
                warning.severity === 'error'
                  ? 'bg-red-50 border-red-400'
                  : 'bg-yellow-50 border-yellow-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-1">
                  {warning.severity === 'error' ? '🚫' : '⚠️'}
                </span>
                <div className="flex-1">
                  <div className={`font-bold ${
                    warning.severity === 'error' ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    {warning.rule}
                  </div>
                  <div className={`text-sm ${
                    warning.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {warning.message}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Booking Summary */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-3">📋 Resumen de Reserva:</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Cliente:</span>
              <div className="font-bold text-gray-900">{bookingDetails.customerName}</div>
            </div>
            <div>
              <span className="text-gray-600">Producto:</span>
              <div className="font-bold text-gray-900">{bookingDetails.productName}</div>
            </div>
            <div>
              <span className="text-gray-600">Fecha & Hora:</span>
              <div className="font-bold text-gray-900">{bookingDetails.date} @ {bookingDetails.time}</div>
            </div>
            <div>
              <span className="text-gray-600">Participantes:</span>
              <div className="font-bold text-gray-900">{bookingDetails.participants}</div>
            </div>
          </div>
        </div>

        {/* Reason Input */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2 text-gray-700">
            {hasErrors 
              ? '✏️ Razón (REQUERIDA para overrides de errores críticos)' 
              : '✏️ Razón (opcional)'}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              hasErrors
                ? 'Ejm: Cliente solicitó excepción, evento especial, prueba de sistema...'
                : 'Ejm: Cliente solicitó excepción, prueba de sistema, etc.'
            }
            className={`w-full px-4 py-3 border rounded-lg text-sm ${
              reasonRequired ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            rows={4}
            disabled={isSubmitting}
          />
          {reasonRequired && (
            <p className="text-red-600 text-xs mt-2 font-bold">⚠️ Campo requerido para continuar</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || reasonRequired}
            className={`font-bold py-2 px-6 rounded-lg text-white transition-all ${
              isSubmitting || reasonRequired
                ? 'bg-gray-400 cursor-not-allowed opacity-50'
                : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                Procesando...
              </span>
            ) : (
              `✅ Confirmar Override ${hasErrors ? '(Requiere razón)' : ''}`
            )}
          </button>
        </div>

        {/* Info Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            💡 Este override será registrado en el sistema con fines de auditoría. El cliente no verá estos detalles.
          </p>
        </div>
      </div>
    </div>
  );
};
