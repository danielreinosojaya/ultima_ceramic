import React from 'react';
import type { BookingMode } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface BookingTypeModalProps {
  onSelect: (mode: BookingMode) => void;
  onClose: () => void;
}

const OptionCard: React.FC<{
    title: string;
    description: string;
    onSelect: () => void;
    buttonText: string;
}> = ({ title, description, onSelect, buttonText }) => (
    <div className="bg-brand-background p-6 rounded-lg border-2 border-transparent hover:border-brand-primary transition-all duration-300 flex flex-col">
        <h3 className="text-xl font-bold text-brand-accent">{title}</h3>
        <p className="text-brand-secondary mt-2 flex-grow">{description}</p>
        <button
            onClick={onSelect}
            className="mt-6 bg-brand-primary text-white font-bold py-2 px-6 rounded-lg w-full hover:bg-brand-accent transition-colors duration-300"
        >
            {buttonText}
        </button>
    </div>
);

export const BookingTypeModal: React.FC<BookingTypeModalProps> = ({ onSelect, onClose }) => {
  const { t } = useLanguage();

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-xl shadow-2xl p-8 w-full max-w-3xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif text-brand-accent">{t('bookingTypeModal.title')}</h2>
          <p className="text-brand-secondary mt-2">{t('bookingTypeModal.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
           <OptionCard 
                title={t('bookingTypeModal.monthlyTitle')}
                description={t('bookingTypeModal.monthlyDescription')}
                onSelect={() => onSelect('monthly')}
                buttonText={t('bookingTypeModal.selectButton')}
           />
           <OptionCard 
                title={t('bookingTypeModal.flexibleTitle')}
                description={t('bookingTypeModal.flexibleDescription')}
                onSelect={() => onSelect('flexible')}
                buttonText={t('bookingTypeModal.selectButton')}
           />
        </div>
      </div>
    </div>
  );
};