import React from 'react';
// Traducción eliminada, usar texto en español directamente
import type { Technique, Product } from '../types';
import { KeyIcon } from './icons/KeyIcon';
import { DEFAULT_PRODUCTS } from '../constants';


interface TechniqueSelectorProps {
  onSelect: (technique: Technique | 'open_studio') => void;
  onBack: () => void;
  products: Product[];
}

const TechniqueCard: React.FC<{ title: string; subtitle: string; buttonText: string; onClick: () => void; }> = ({ title, subtitle, buttonText, onClick }) => (
    <div className="bg-brand-surface p-8 rounded-xl shadow-subtle hover:shadow-lifted transition-shadow duration-300 flex flex-col items-center text-center h-full">
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
  // Obtener el producto Open Studio desde los productos recibidos por props
  const openStudioProduct = [...products, ...DEFAULT_PRODUCTS].find((p: Product) => p.type === 'OPEN_STUDIO_SUBSCRIPTION');

  return (
    <div className="text-center p-6 bg-transparent animate-fade-in-up max-w-5xl mx-auto">
      <button onClick={onBack} className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold text-lg" style={{ background: 'none', border: 'none' }}>
        &larr; Editar Selección
      </button>
      <h2 className="text-4xl font-bold text-brand-text mb-2">Elige una opción</h2>
      <p className="text-brand-secondary mb-10 text-xl">¿En qué te gustaría enfocarte hoy?</p>
      <div className="grid md:grid-cols-2 gap-8 mb-12">
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
      {/* Separador visual y copy explicativo para membresía */}
      <div className="my-10 flex flex-col items-center">
        <div className="w-full flex items-center justify-center mb-4">
          <hr className="flex-grow border-t border-brand-border mx-4" />
          <span className="text-brand-accent font-serif text-lg px-2">¿Buscas acceso libre?</span>
          <hr className="flex-grow border-t border-brand-border mx-4" />
        </div>
        <div className="mb-6 text-brand-secondary text-base font-medium">Elige nuestra membresía Open Studio y accede al taller sin límites.</div>
        {openStudioProduct && (
          <div
            className="mx-auto md:w-3/4 lg:w-2/3 bg-rigid-texture border border-brand-border rounded-xl shadow-subtle hover:shadow-lifted transition-all duration-300 cursor-pointer transform hover:-translate-y-1 flex flex-col items-center text-center"
            onClick={() => onSelect('open_studio')}
          >
            <div className="p-12 flex flex-col items-center text-center h-full">
                <p className="text-brand-accent uppercase tracking-widest text-xs font-semibold mb-6">Membresía</p>
                <KeyIcon className="w-8 h-8 text-brand-accent mb-4" />
                <h3 className="text-4xl font-semibold text-brand-text mt-2">{openStudioProduct.name}</h3>
                <p className="text-brand-secondary mt-4 max-w-xl mx-auto flex-grow">{openStudioProduct.description}</p>
                <div className="my-8">
                    <p className="text-4xl font-bold text-brand-text">${openStudioProduct.price}</p>
                    <p className="text-base font-normal text-brand-secondary mt-1">por mes</p>
                </div>
                <button className="bg-transparent border border-brand-accent text-brand-accent font-bold py-3 px-12 rounded-lg hover:bg-brand-accent hover:text-white transition-colors duration-300 w-full max-w-xs mx-auto">
                  Seleccionar membresía
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
