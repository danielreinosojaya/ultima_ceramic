import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Technique } from '../types';

interface TechniqueSelectorProps {
  onSelect: (technique: Technique) => void;
  onBack: () => void;
}

const TechniqueCard: React.FC<{ title: string; subtitle: string; buttonText: string; onClick: () => void; }> = ({ title, subtitle, buttonText, onClick }) => (
    <div className="bg-brand-surface p-8 rounded-xl shadow-subtle hover:shadow-lifted transition-shadow duration-300 flex flex-col items-center text-center h-full">
        <h3 className="text-2xl font-semibold text-brand-text">{title}</h3>
        <p className="text-brand-secondary mt-2 flex-grow mb-6">{subtitle}</p>
        <button
            onClick={onClick}
            className="bg-brand-primary text-white font-bold py-3 px-8 rounded-lg w-full max-w-xs hover:opacity-90 transition-opacity duration-300"
        >
            {buttonText}
        </button>
    </div>
);


export const TechniqueSelector: React.FC<TechniqueSelectorProps> = ({ onSelect, onBack }) => {
  const { t } = useLanguage();

  return (
    <div className="text-center p-6 bg-transparent animate-fade-in-up max-w-4xl mx-auto">
      <button onClick={onBack} className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold">
        &larr; {t('summary.backButton')}
      </button>
      <h2 className="text-3xl font-semibold text-brand-text mb-2">{t('techniques.title')}</h2>
      <p className="text-brand-secondary mb-10">{t('techniques.subtitle')}</p>
      <div className="grid md:grid-cols-2 gap-8">
        <TechniqueCard
            title={t('techniques.pottersWheelTitle')}
            subtitle={t('techniques.pottersWheelSubtitle')}
            buttonText={t('techniques.selectButton')}
            onClick={() => onSelect('potters_wheel')}
        />
        <TechniqueCard
            title={t('techniques.moldingTitle')}
            subtitle={t('techniques.moldingSubtitle')}
            buttonText={t('techniques.selectButton')}
            onClick={() => onSelect('molding')}
        />
      </div>
    </div>
  );
};
