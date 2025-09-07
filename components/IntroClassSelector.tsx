


import React, { useState, useEffect } from 'react';
import type { Product, IntroductoryClass, EnrichedIntroClassSession, IntroClassSession, AppData } from '../types.js';
import * as dataService from '../services/dataService.js';
import { useLanguage } from '../context/LanguageContext.js';
import { InstructorTag } from './InstructorTag.js';
import { CapacityIndicator } from './CapacityIndicator.js';
import { ClockIcon } from './icons/ClockIcon.js';
import { SparklesIcon } from './icons/SparklesIcon.js';
import { InfoCircleIcon } from './icons/InfoCircleIcon.js';
import { PaintBrushIcon } from './icons/PaintBrushIcon.js';
import { IntroClassWizard } from './IntroClassWizard.js';

interface IntroClassSelectorProps {
  onConfirm: (product: Product, session: IntroClassSession) => void;
  appData: AppData;
  onBack: () => void;
}

export const IntroClassSelector: React.FC<IntroClassSelectorProps> = ({ onConfirm, appData, onBack }) => {
  const { t, language } = useLanguage();
  const [introClasses, setIntroClasses] = useState<IntroductoryClass[]>([]);
  
  useEffect(() => {
    const activeIntroClasses = appData.products
        .filter(p => p.isActive && p.type === 'INTRODUCTORY_CLASS') as IntroductoryClass[];
    setIntroClasses(activeIntroClasses);
  }, [appData.products]);


  if (introClasses.length === 0) {
    return (
      <div className="text-center p-6 bg-brand-surface rounded-xl shadow-subtle">
        <h2 className="text-3xl font-semibold text-brand-text mb-2">{t('introClass.title')}</h2>
        <p className="text-brand-secondary">Actualmente no hay clases introductorias programadas. ¡Vuelve pronto!</p>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-6 bg-brand-surface rounded-xl shadow-none sm:shadow-subtle animate-fade-in-up">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-semibold text-brand-text mb-2">{t('introClass.title')}</h2>
        <p className="text-brand-secondary">{t('introClass.subtitle')}</p>
      </div>
      
      <div className="space-y-12">
        {introClasses.map(product => {
            const allSessions = dataService.generateIntroClassSessions(product, { bookings: appData.bookings }, { includeFull: true });
            
            return (
                 <IntroClassWizard 
                    key={product.id}
                    product={product}
                    sessions={allSessions}
                    onConfirm={onConfirm}
                    appData={appData}
                    onBack={onBack}
                />
            );
        })}
      </div>
    </div>
  );
};
