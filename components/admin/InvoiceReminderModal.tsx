import React from 'react';
// import { useLanguage } from '../../context/LanguageContext';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';

interface InvoiceReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onGoToInvoicing: () => void;
}

export const InvoiceReminderModal: React.FC<InvoiceReminderModalProps> = ({ isOpen, onClose, onProceed, onGoToInvoicing }) => {
  // const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
            </div>
            <div className="ml-4 text-left">
                <h3 className="text-lg leading-6 font-bold text-brand-text" id="modal-title">
                    Recordatorio de Facturación
                </h3>
            </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-brand-secondary">
            Hay pagos pendientes de procesar. ¿Deseas proceder sin procesar las facturas o ir al módulo de facturación?
          </p>
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 gap-3 sm:gap-0">
          <button
            type="button"
            onClick={onGoToInvoicing}
            className="w-full sm:w-auto inline-flex justify-center rounded-md border border-brand-secondary bg-white text-base font-medium text-brand-secondary hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary sm:text-sm"
          >
            Ir a Facturación
          </button>
           <button
            type="button"
            onClick={onProceed}
            className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-primary text-base font-medium text-white hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary sm:text-sm"
          >
            Proceder
          </button>
        </div>
      </div>
    </div>
  );
};
