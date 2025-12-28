import React, { useState, useEffect } from 'react';
import type { Product, OpenStudioSubscription } from '../types';
// Traducción eliminada, usar texto en español directamente
import { KeyIcon } from './icons/KeyIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface PackageSelectorProps {
  onSelect: (pkg: Product) => void;
  technique: 'potters_wheel' | 'molding' | null;
  products: Product[]; // Recibir productos como prop
}

export const PackageSelector: React.FC<PackageSelectorProps> = ({ onSelect, technique, products }) => {
  // Traducción eliminada, usar texto en español directamente
  const [packages, setPackages] = useState<Product[]>([]);
  const [parejaCard, setParejaCard] = useState<Product | null>(null);

  useEffect(() => {
    if (technique && products.length > 0) {
      let activePackages: Product[] = [];
      if (technique === 'potters_wheel' || technique === 'molding') {
        activePackages = products.filter(p =>
          p.isActive &&
          p.type === 'CLASS_PACKAGE' &&
          p.details.technique === technique
        );
      }
      // Orden robusto por precio normalizado
      const orderPrices = [180, 330, 470];
      const pareja = activePackages.find(pkg => pkg.type === 'COUPLES_EXPERIENCE');
      const ordered: Product[] = [];
      orderPrices.forEach(price => {
        const found = activePackages.find(pkg =>
          pkg.type === 'CLASS_PACKAGE' &&
          Number(parseFloat(pkg.price as any).toFixed(0)) === price
        );
        if (found && !ordered.some(o => o.id === found.id)) {
          ordered.push(found);
        }
      });
      // Agregar los que no están en el orden personalizado al final (excepto pareja)
      activePackages.forEach(pkg => {
        if (!ordered.some(o => o.id === pkg.id) && pkg.type !== 'COUPLES_EXPERIENCE') {
          ordered.push(pkg);
        }
      });
      setPackages(ordered);
      setParejaCard(pareja || null);
    }
  }, [technique, products]);

  return (
    <div className="text-center p-6 bg-brand-surface rounded-xl shadow-subtle max-w-5xl mx-auto">
      <button className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold text-lg" style={{ background: 'none', border: 'none' }}>
        &larr; Editar Selección
      </button>
      <h2 className="text-4xl font-bold text-brand-text mb-2">Elige una Técnica</h2>
      <p className="text-brand-secondary mb-8 text-xl">¿En qué te gustaría enfocarte hoy?</p>
      
      <div className="bg-brand-background/70 border border-brand-border/50 rounded-lg p-6 mb-10 text-left flex items-start gap-4 animate-fade-in">
        <SparklesIcon className="w-8 h-8 text-brand-accent flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-bold text-brand-text text-lg">Más Clases, Más Ahorro</h3>
          <p className="text-sm text-brand-secondary mt-1">Comprometerse con un paquete te ayuda a crear una rutina y ofrece un descuento significativo por clase.</p>
        </div>
      </div>


      <div className="grid md:grid-cols-3 gap-8">
        {packages.map((pkg) => {
          if (pkg.type === 'CLASS_PACKAGE') {
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
                      <span className="font-semibold text-brand-accent">CeramicAlma</span>
                    </div>
                  )}
                </div>
                <div className="p-4 sm:p-5 md:p-6 flex-grow flex flex-col text-left">
                  <h3 className="text-2xl font-semibold text-brand-primary">{pkg.name}</h3>
                   <div className="flex items-baseline gap-2 my-4">
                        <p className="text-4xl font-bold text-brand-text">${pkg.price}</p>
                        <p className="text-brand-secondary font-semibold text-sm">/ {pkg.classes} clases</p>
                   </div>
                  <div className="bg-brand-background/80 p-3 rounded-md text-center mb-4">
                        <p className="font-bold text-brand-text">${pricePerClass.toFixed(2)} <span className="font-normal text-brand-secondary">por clase</span></p>
                  </div>
                  <p className="text-brand-secondary text-sm flex-grow min-h-[3.5rem]">{pkg.description}</p>
                  <button className="mt-4 sm:mt-6 bg-brand-primary text-white font-bold py-3 px-6 rounded-lg w-full hover:opacity-90 transition-opacity duration-300 h-11 sm:h-12">
                    Seleccionar paquete
                  </button>
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
      {/* Bloque parejaCard eliminado: solo se muestran CLASS_PACKAGE */}
    </div>
  );
};