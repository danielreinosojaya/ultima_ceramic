import React from 'react';
// Traducción eliminada, usar texto en español directamente
import type { Technique, Product } from '../types';
import { KeyIcon } from './icons/KeyIcon';
import { DEFAULT_PRODUCTS } from '../constants';

// Normalizador de price para productos recibidos por props
const normalizeProductsPrice = (products: Product[]): Product[] =>
  products.map(p => {
    if ('price' in p) {
      return {
        ...p,
        price: typeof (p as any).price === 'number' ? (p as any).price : parseFloat((p as any).price) || 0
      };
    }
    return p;
  });


interface TechniqueSelectorProps {
  onSelect: (technique: Technique | 'open_studio') => void;
  onBack: () => void;
  products: Product[];
}

const TechniqueCard: React.FC<{ title: string; subtitle: string; buttonText: string; onClick: () => void; }> = ({ title, subtitle, buttonText, onClick }) => (
    <div className="bg-brand-surface p-4 sm:p-6 md:p-8 rounded-xl shadow-subtle hover:shadow-lifted transition-shadow duration-300 flex flex-col items-center text-center h-full">
        <h3 className="text-2xl font-semibold text-brand-text">{title}</h3>
        <p className="text-brand-secondary mt-2 flex-grow mb-6">{subtitle}</p>
        <button
            onClick={onClick}
            className="bg-brand-primary text-white font-bold py-3 px-8 rounded-lg w-full max-w-xs hover:opacity-90 transition-opacity duration-300"
        >
            {buttonText}
        </button>
    </div>
);



export const TechniqueSelector: React.FC<TechniqueSelectorProps> = ({ onSelect, onBack, products }) => {
  // Normalizar precios antes de cualquier uso
  const normalizedProducts = normalizeProductsPrice(products);
  // No mostrar Open Studio en TechniqueSelector

  return (
    <div className="text-center p-6 bg-transparent animate-fade-in-up max-w-5xl mx-auto">
      <button onClick={onBack} className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold text-lg" style={{ background: 'none', border: 'none' }}>
        &larr; Editar Selección
      </button>
      <h2 className="text-4xl font-bold text-brand-text mb-2">Elige una opción</h2>
      <p className="text-brand-secondary mb-10 text-xl">¿En qué te gustaría enfocarte hoy?</p>
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
        <TechniqueCard
            title="Torno Alfarero"
            subtitle="Aprende a levantar piezas en el torno, creando tazas, cuencos y jarrones."
            buttonText="Seleccionar"
            onClick={() => onSelect('potters_wheel')}
        />
        <TechniqueCard
            title="Modelado a Mano"
            subtitle="Explora técnicas escultóricas como el pellizco, los churros y las planchas."
            buttonText="Seleccionar"
            onClick={() => onSelect('molding')}
        />
      </div>
      {/* Separador visual y copy explicativo para membresía ELIMINADO: Open Studio solo en Welcome Page */}
    </div>
  );
};
