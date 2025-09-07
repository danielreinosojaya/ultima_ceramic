import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import * as dataService from '../services/dataService';
import { UITexts } from '../types';

type Language = 'es' | 'en';

interface Translations {
  es: any;
  en: any;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, options?: Record<string, string | number>) => any;
  isTranslationsReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Helper to merge default and stored texts deeply
const mergeTexts = (defaults: any, stored: any): any => {
    const output = { ...defaults };
    if (!stored || typeof stored !== 'object') return output;
    for (const key in stored) {
        if (Object.prototype.hasOwnProperty.call(stored, key)) {
            if (typeof stored[key] === 'object' && stored[key] !== null && !Array.isArray(stored[key]) && output[key]) {
                output[key] = mergeTexts(output[key] || {}, stored[key]);
            } else {
                output[key] = stored[key];
            }
        }
    }
    return output;
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('es');
  const [translations, setTranslations] = useState<Translations | null>(null);

  const fetchTranslations = useCallback(async () => {
    try {
      const [esDefaults, enDefaults, storedEs, storedEn] = await Promise.all([
        fetch('../locales/es.json').then(res => res.json()),
        fetch('../locales/en.json').then(res => res.json()),
        dataService.getUITexts('es'),
        dataService.getUITexts('en')
      ]);
      
      setTranslations({ 
          es: mergeTexts(esDefaults, storedEs),
          en: mergeTexts(enDefaults, storedEn)
      });

    } catch (error) {
      console.error('Failed to load translation files:', error);
      // Fallback to local files if API fails
      try {
        const [esDefaults, enDefaults] = await Promise.all([
            fetch('./locales/es.json').then(res => res.json()),
            fetch('./locales/en.json').then(res => res.json())
        ]);
        setTranslations({ es: esDefaults, en: enDefaults });
      } catch (fallbackError) {
        console.error('Failed to load fallback translation files:', fallbackError);
      }
    }
  }, []);

  useEffect(() => {
    fetchTranslations();

    // The API layer now handles data persistence, but we might want to refresh
    // UI text if it's changed in another tab's admin panel.
    const handleStorageChange = () => {
        // A simple way to trigger a refresh without inspecting the event details.
        fetchTranslations();
    };
    
    // Using a custom event because localStorage events might not fire reliably
    // for API-driven changes in the same tab.
    window.addEventListener('ui-text-changed', handleStorageChange);
    return () => window.removeEventListener('ui-text-changed', handleStorageChange);

  }, [fetchTranslations]);

  const t = useCallback((key: string, options?: Record<string, string | number>) => {
    if (!translations) {
      return ''; // Return empty string while loading to prevent flashing keys
    }
    
    let text = key.split('.').reduce((obj, k) => obj && obj[k], translations[language]);

    if (text === undefined) {
      console.warn(`Translation key not found: ${key} in language '${language}'`);
      text = key.split('.').reduce((obj, k) => obj && obj[k], translations['en']); // Fallback to english
      if (text === undefined) {
        return key; // Return the key itself if not found anywhere
      }
    }

    if (options && typeof text === 'string') {
      Object.entries(options).forEach(([k, value]) => {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(value));
      });
    }

    return text;
  }, [language, translations]);

  const value = {
    language,
    setLanguage,
    t,
    isTranslationsReady: translations !== null
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
