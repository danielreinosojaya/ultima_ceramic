import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface WelcomeInfoModalProps {
  onClose: () => void;
}

export const WelcomeInfoModal: React.FC<WelcomeInfoModalProps> = ({ onClose }) => {
  const { t } = useLanguage();

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-xl shadow-2xl p-8 w-full max-w-md animate-fade-in-up text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold text-brand-primary mb-4">{t('welcomeModal.title')}</h2>
        <div className="text-brand-secondary space-y-4 mb-8">
            <p>{t('welcomeModal.line1')}</p>
            <p>{t('welcomeModal.line2')}</p>
            <p>{t('welcomeModal.line3')}</p>
        </div>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="bg-brand-primary text-white font-bold py-2 px-8 rounded-lg hover:bg-brand-accent transition-colors"
          >
            {t('welcomeModal.buttonText')}
          </button>
        </div>
      </div>
    </div>
  );
};