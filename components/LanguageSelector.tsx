
import { useLanguage } from '../context/LanguageContext.js';



export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

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
};