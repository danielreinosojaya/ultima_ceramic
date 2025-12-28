import React, { useState, useEffect } from 'react';
import type { Product, IntroductoryClass, EnrichedIntroClassSession, IntroClassSession, AppData } from '../types.js';
import * as dataService from '../services/dataService.js';
// ...existing code...
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
  onAppDataUpdate?: (updates: Partial<AppData>) => void;
}

export const IntroClassSelector: React.FC<IntroClassSelectorProps> = ({ onConfirm, appData, onBack, onAppDataUpdate }) => {
  // Traducción eliminada, usar texto en español directamente
  const [introClasses, setIntroClasses] = useState<IntroductoryClass[]>([]);
  
  useEffect(() => {
    const activeIntroClasses = appData.products
        .filter(p => p.isActive && p.type === 'INTRODUCTORY_CLASS') as IntroductoryClass[];
    setIntroClasses(activeIntroClasses);
  }, [appData.products]);

  // Force load bookings if not available
  useEffect(() => {
    const loadBookingsIfNeeded = async () => {
      if (appData.bookings.length === 0 && onAppDataUpdate) {
        try {
          const bookings = await dataService.getBookings();
          onAppDataUpdate({ bookings });
        } catch (error) {
          console.error('Failed to load bookings for intro class capacity calculation:', error);
        }
      }
    };
    loadBookingsIfNeeded();
  }, [appData.bookings.length, onAppDataUpdate]);


  if (introClasses.length === 0) {
    return (
      <div className="text-center p-4 sm:p-6 bg-brand-surface rounded-xl shadow-subtle max-w-5xl mx-auto">
  <h2 className="text-2xl sm:text-3xl font-semibold text-brand-text mb-2">Clase Introductoria</h2>
  <p className="text-xs sm:text-sm md:text-base text-brand-secondary">Actualmente no hay clases introductorias programadas. ¡Vuelve pronto!</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-brand-surface rounded-xl shadow-none sm:shadow-subtle animate-fade-in-up max-w-5xl mx-auto">
      <div className="text-center mb-8">
  <h2 className="text-2xl sm:text-3xl font-semibold text-brand-text mb-2">Clase Introductoria</h2>
  <p className="text-xs sm:text-sm md:text-base text-brand-secondary">Elige una fecha y hora para tu clase introductoria. Aprende las bases de la cerámica y conoce nuestro taller.</p>
      </div>
      
      <div className="space-y-12">
        {introClasses.map(product => {
            const allSessions = dataService.generateIntroClassSessions(product, { bookings: appData.bookings }, { includeFull: true, generationLimitInDays: 90 });
            
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