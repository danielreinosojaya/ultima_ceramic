
import React from 'react';
import type { Product, OpenStudioSubscription } from '../types.js';
import { ClockIcon } from './icons/ClockIcon.js';
import { SparklesIcon } from './icons/SparklesIcon.js';
import { InfoCircleIcon } from './icons/InfoCircleIcon.js';
import { PaintBrushIcon } from './icons/PaintBrushIcon.js';
import { KeyIcon } from './icons/KeyIcon.js';
import { useLanguage } from '../context/LanguageContext.js';
import { CheckCircleIcon } from './icons/CheckCircleIcon.js';


interface ClassInfoModalProps {
  product: Product;
  onConfirm: () => void;
  onClose: () => void;
}

const InfoDetail: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
    <div className="flex items-start text-left">
        <div className="flex-shrink-0 mr-4 mt-1 text-brand-primary">{icon}</div>
        <div>
            <h4 className="font-bold text-brand-text">{label}</h4>
            <div className="text-brand-secondary">{children}</div>
        </div>
    </div>
);


export const ClassInfoModal: React.FC<ClassInfoModalProps> = ({ product, onConfirm, onClose }) => {
  const { t } = useLanguage();

  const renderProductDetails = () => {
    if (product.type === 'GROUP_EXPERIENCE' || product.type === 'COUPLES_EXPERIENCE') {
        return null; // These experiences don't have this modal view.
    }

    if (product.type === 'OPEN_STUDIO_SUBSCRIPTION') {
      const details = product.details as OpenStudioSubscription['details'];
      return (
        <>
          <InfoDetail icon={<ClockIcon className="w-6 h-6" />} label={t('modal.durationLabel')}>
            <p>{t('modal.daysDuration', { count: details.durationDays })}</p>
          </InfoDetail>
          <InfoDetail icon={<KeyIcon className="w-6 h-6" />} label={t('modal.accessIncludes')}>
            <ul className="list-disc list-inside space-y-1">
                <li>{details.timeLimit}</li>
                <li>{details.materialsLimit}</li>
            </ul>
          </InfoDetail>
          <InfoDetail icon={<InfoCircleIcon className="w-6 h-6" />} label={t('modal.howItWorks')}>
            <ul className="list-disc list-inside space-y-1">
                {details.howItWorks.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </InfoDetail>
          <div className="mt-6 border-t border-brand-border pt-6 text-left">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircleIcon className="w-7 h-7 text-brand-success flex-shrink-0" />
              <h3 className="text-xl font-semibold text-brand-text">{t('modal.activationTitle')}</h3>
            </div>
              <ol className="list-decimal list-inside space-y-2 ml-4 text-brand-secondary">
                  <li>{t('modal.activationStep1')}</li>
                  <li>{t('modal.activationStep2')}</li>
                  <li>{t('modal.activationStep3')}</li>
              </ol>
              <div className="mt-4 bg-amber-100 p-3 rounded-md border border-amber-300">
                <p className="text-sm font-semibold text-amber-800 text-center">
                    {t('modal.activationStartInfo', { duration: details.durationDays })}
                </p>
              </div>
          </div>
        </>
      )
    }
    
    // Default for ClassPackage and IntroductoryClass
    if ('details' in product) {
      return (
        <>
          <InfoDetail icon={<ClockIcon className="w-6 h-6" />} label={t('modal.durationLabel')}>
              <p>{product.details.duration}</p>
          </InfoDetail>
           <InfoDetail icon={<SparklesIcon className="w-6 h-6" />} label={t('modal.activitiesLabel')}>
              <ul className="list-disc list-inside space-y-1">
                  {product.details.activities.map((activity, index) => <li key={index}>{activity}</li>)}
              </ul>
          </InfoDetail>
          <InfoDetail icon={<InfoCircleIcon className="w-6 h-6" />} label={t('modal.generalRecommendationsLabel')}>
              <p>{product.details.generalRecommendations}</p>
          </InfoDetail>
          <InfoDetail icon={<PaintBrushIcon className="w-6 h-6" />} label={t('modal.materialsLabel')}>
              <p>{product.details.materials}</p>
          </InfoDetail>
        </>
      )
    }
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-semibold text-brand-text">{t('modal.title')}: {product.name}</h2>
          <p className="text-brand-secondary mt-2">{t('modal.subtitle')}</p>
        </div>

        <div className="space-y-6">
           {renderProductDetails()}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
            <button
                onClick={onClose}
                className="w-full sm:w-auto bg-brand-surface border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:border-brand-text transition-colors duration-300"
            >
                {t('modal.backButton')}
            </button>
            <button
                onClick={onConfirm}
                className="w-full sm:w-auto bg-brand-primary text-white font-bold py-2 px-8 rounded-lg hover:opacity-90 transition-opacity duration-300"
            >
                {t('modal.confirmButton')}
            </button>
        </div>
      </div>
    </div>
  );
};
