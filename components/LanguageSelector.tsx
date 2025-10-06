

import React from 'react';
// import { useLanguage } from '../context/LanguageContext.js';

// Componente deshabilitado - la aplicación ahora es monolingüe en español
export const LanguageSelector: React.FC = () => {
  // const { language, setLanguage } = useLanguage();

  // Retorna null para ocultar el selector de idioma ya que la app es monolingüe
  return null;
  
  /*
  return (
    <div className="flex items-center p-1 bg-brand-background rounded-full border border-brand-border">
      <button 
        onClick={() => setLanguage('es')}
        className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-300 ${language === 'es' ? 'bg-brand-secondary text-white shadow-sm' : 'text-brand-secondary hover:bg-brand-border/50'}`}
        aria-label="Cambiar a español"
      >
        ES
      </button>
      <button 
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-300 ${language === 'en' ? 'bg-brand-secondary text-white shadow-sm' : 'text-brand-secondary hover:bg-brand-border/50'}`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
  */
};