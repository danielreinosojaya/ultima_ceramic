


import React, { useState, useEffect } from 'react';
import type { Product, OpenStudioSubscription, ClassPackage } from '../types';
import { useLanguage } from '../context/LanguageContext';
import * as dataService from '../services/dataService';
import { KeyIcon } from './icons/KeyIcon';

interface PackageSelectorProps {
  onSelect: (pkg: Product) => void;
}

export const PackageSelector: React.FC<PackageSelectorProps> = ({ onSelect }) => {
  const { t } = useLanguage();
  const [packages, setPackages] = useState<Product[]>([]);

  useEffect(() => {
    const fetchPackages = async () => {
      const allProducts = await dataService.getProducts();
      const activePackages = allProducts.filter(p => p.isActive && (p.type === 'CLASS_PACKAGE' || p.type === 'OPEN_STUDIO_SUBSCRIPTION'));
      setPackages(activePackages);
    };
    fetchPackages();
  }, []);

  return (
    <div className="text-center p-6 bg-brand-surface rounded-xl shadow-subtle">
      <h2 className="text-3xl font-semibold text-brand-text mb-2">{t('packages.title')}</h2>
      <p className="text-brand-secondary mb-8">{t('packages.subtitle')}</p>
      <div className="grid md:grid-cols-3 gap-8">
        {packages.map((pkg) => {
          if (pkg.type === 'OPEN_STUDIO_SUBSCRIPTION') {
            const openStudioPkg = pkg as OpenStudioSubscription;
            return (
              <div
                key={openStudioPkg.id}
                className="bg-brand-premium-dark bg-brushed-clay rounded-xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col shadow-subtle hover:shadow-lifted transform hover:-translate-y-1 group"
                onClick={() => onSelect(openStudioPkg)}
              >
                <div className="relative p-6 flex-grow flex flex-col text-left text-brand-premium-light">
                  <div className="mb-4">
                    <span className="bg-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                      {t('admin.productManager.openStudioSubscription')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <KeyIcon className="w-6 h-6 text-brand-primary flex-shrink-0"/>
                    <h3 className="text-3xl font-semibold">{openStudioPkg.name}</h3>
                  </div>
                  <p className="text-brand-premium-light/80 mt-2 text-sm flex-grow">{openStudioPkg.description}</p>
                  
                  <div className="mt-auto pt-6 border-t border-brand-premium-light/20">
                    <div className="text-left mb-4">
                        <p className="text-4xl font-bold">${openStudioPkg.price}</p>
                        <p className="text-sm font-normal text-brand-premium-light/70 -mt-1">{t('packages.perMonth')}</p>
                    </div>
                    <button className="w-full bg-brand-premium-light text-brand-premium-dark font-bold py-3 px-5 rounded-lg hover:bg-brand-surface transition-colors duration-300">
                      {t('packages.selectSubscriptionButton')}
                    </button>
                  </div>
                </div>
              </div>
            );
          // FIX: Use 'else if' to narrow the type of 'pkg' to 'ClassPackage', making properties like 'price' and 'classes' type-safe.
          } else if (pkg.type === 'CLASS_PACKAGE') {
            return (
              <div 
                key={pkg.id} 
                className="bg-brand-surface rounded-xl overflow-hidden shadow-subtle hover:shadow-lifted transition-all duration-300 cursor-pointer flex flex-col transform hover:-translate-y-1"
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
                  <p className="text-4xl font-bold text-brand-text my-4">${pkg.price}</p>
                  
                  <p className="text-brand-secondary font-semibold">{pkg.classes} {t('packages.classes')}</p>
                  
                  <p className="text-brand-secondary mt-2 text-sm flex-grow min-h-[3.5rem]">{pkg.description}</p>
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