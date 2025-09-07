import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SpainFlagIcon } from './icons/SpainFlagIcon';
import { UKFlagIcon } from './icons/UKFlagIcon';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center space-x-2">
      <button 
        onClick={() => setLanguage('es')}
        className={`w-8 h-6 rounded-sm overflow-hidden transition-all duration-200 ${language === 'es' ? 'ring-2 ring-brand-accent ring-offset-2' : 'opacity-60 hover:opacity-100'}`}
        aria-label="Cambiar a español"
      >
        <SpainFlagIcon />
      </button>
      <button 
        onClick={() => setLanguage('en')}
        className={`w-8 h-6 rounded-sm overflow-hidden transition-all duration-200 ${language === 'en' ? 'ring-2 ring-brand-accent ring-offset-2' : 'opacity-60 hover:opacity-100'}`}
        aria-label="Switch to English"
      >
        <UKFlagIcon />
      </button>
    </div>
  );
};