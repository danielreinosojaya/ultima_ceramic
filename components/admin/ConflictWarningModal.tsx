import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ConflictWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  details: { count: number; time: string } | null;
}

export const ConflictWarningModal: React.FC<ConflictWarningModalProps> = ({ isOpen, onClose, onConfirm, details }) => {
  const { t } = useLanguage();
  if (!isOpen || !details) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-brand-text mb-4">{t('admin.manualBookingModal.conflictTitle')}</h3>
        <p className="text-brand-secondary mb-6">{t('admin.manualBookingModal.conflictMessage', { count: details.count, time: details.time })}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            {t('admin.manualBookingModal.cancelButton')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            {t('admin.manualBookingModal.overbookButton')}
          </button>
        </div>
      </div>
    </div>
  );
};
