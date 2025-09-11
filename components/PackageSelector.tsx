import React, { useState, useEffect } from 'react';
import type { Product, OpenStudioSubscription } from '../types';
import { useLanguage } from '../context/LanguageContext';
import * as dataService from '../services/dataService';
import { KeyIcon } from './icons/KeyIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface PackageSelectorProps {
  onSelect: (pkg: Product) => void;
  technique: 'potters_wheel' | 'molding' | null;
}

export const PackageSelector: React.FC<PackageSelectorProps> = ({ onSelect, technique }) => {
  const { t } = useLanguage();
  const [packages, setPackages] = useState<Product[]>([]);

  useEffect(() => {
    const fetchPackages = async () => {
      const allProducts = await dataService.getProducts();
      const activePackages = allProducts.filter(p => 
        p.isActive && (
            p.type === 'OPEN_STUDIO_SUBSCRIPTION' || 
            (p.type === 'CLASS_PACKAGE' && p.details.technique === technique)
        )
      );
      setPackages(activePackages);
    };

    if (technique) {
        fetchPackages();
    }
  }, [technique]);

  return (
    <div className="text-center p-6 bg-brand-surface rounded-xl shadow-subtle max-w-5xl mx-auto">
      <h2 className="text-3xl font-semibold text-brand-text mb-2">{t('packages.title')}</h2>
      <p className="text-brand-secondary mb-8">{t('packages.subtitle')}</p>
      
      <div className="bg-brand-background/70 border border-brand-border/50 rounded-lg p-6 mb-10 text-left flex items-start gap-4 animate-fade-in">
        <SparklesIcon className="w-8 h-8 text-brand-accent flex-shrink-0 mt-1" />
        <div>
            <h3 className="font-bold text-brand-text text-lg">{t('packages.savingsCardTitle')}</h3>
            <p className="text-sm text-brand-secondary mt-1">{t('packages.savingsCardSubtitle')}</p>
        </div>
      </div>


      <div className="grid md:grid-cols-3 gap-8">
        {packages.map((pkg) => {
          if (pkg.type === 'OPEN_STUDIO_SUBSCRIPTION') {
            const openStudioPkg = pkg as OpenStudioSubscription;
            return (
              <div
                key={openStudioPkg.id}
                className="md:col-span-3 bg-rigid-texture border border-brand-border rounded-xl shadow-subtle hover:shadow-lifted transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                onClick={() => onSelect(openStudioPkg)}
              >
                <div className="p-12 flex flex-col items-center text-center h-full">
                    <p className="text-brand-accent uppercase tracking-widest text-xs font-semibold mb-6">{t('packages.membershipLabel')}</p>
                    <KeyIcon className="w-8 h-8 text-brand-accent mb-4" />
                    <h3 className="text-4xl font-semibold text-brand-text mt-2">{openStudioPkg.name}</h3>
                    <p className="text-brand-secondary mt-4 max-w-xl mx-auto flex-grow">{openStudioPkg.description}</p>
                    
                    <div className="my-8">
                        <p className="text-4xl font-bold text-brand-text">${openStudioPkg.price}</p>
                        <p className="text-base font-normal text-brand-secondary mt-1">{t('packages.perMonth')}</p>
                    </div>
                
                    <button className="bg-transparent border border-brand-accent text-brand-accent font-bold py-3 px-12 rounded-lg hover:bg-brand-accent hover:text-white transition-colors duration-300 w-full max-w-xs mx-auto">
                      {t('packages.selectSubscriptionButton')}
                    </button>
                </div>
              </div>
            );
          } else if (pkg.type === 'CLASS_PACKAGE') {
            const pricePerClass = pkg.price / pkg.classes;
            return (
              <div 
                key={pkg.id} 
                className="bg-brand-surface rounded-xl overflow-hidden shadow-subtle hover:shadow-lifted transition-shadow duration-300 cursor-pointer flex flex-col transform hover:-translate-y-1"
                onClick={() => onSelect(pkg)}
              >
                <div className="aspect-[4/3] w-full bg-brand-background overflow-hidden group">
                  {pkg.imageUrl ? (
                    <img 
                      src={pkg.imageUrl} 
                      alt={pkg.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-semibold text-brand-accent">{t('header.title')}</span>
                    </div>
                  )}
                </div>
                <div className="p-6 flex-grow flex flex-col text-left">
                  <h3 className="text-2xl font-semibold text-brand-primary">{pkg.name}</h3>
                   <div className="flex items-baseline gap-2 my-4">
                        <p className="text-4xl font-bold text-brand-text">${pkg.price}</p>
                        <p className="text-brand-secondary font-semibold text-sm">/ {pkg.classes} {t('packages.classes')}</p>
                   </div>
                   
                  <div className="bg-brand-background/80 p-3 rounded-md text-center mb-4">
                        <p className="font-bold text-brand-text">${pricePerClass.toFixed(2)} <span className="font-normal text-brand-secondary">{t('packages.pricePerClass')}</span></p>
                  </div>
                                    
                  <p className="text-brand-secondary text-sm flex-grow min-h-[3.5rem]">{pkg.description}</p>
                  <button className="mt-6 bg-brand-primary text-white font-bold py-3 px-6 rounded-lg w-full hover:opacity-90 transition-opacity duration-300">
                    {t('packages.selectButton')}
                  </button>
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};