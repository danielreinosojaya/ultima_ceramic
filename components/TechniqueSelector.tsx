import React from 'react';
import { motion } from 'framer-motion';
import type { Technique, Product } from '../types';
import { KeyIcon } from './icons/KeyIcon';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
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

interface TechniqueCardProps {
  title: string;
  subtitle: string;
  buttonText: string;
  onClick: () => void;
  icon?: React.ReactNode;
  index: number;
}

const TechniqueCard: React.FC<TechniqueCardProps> = ({ title, subtitle, buttonText, onClick, icon, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.15, ease: 'easeOut' }}
    whileHover={{ scale: 1.02 }}
    className="h-full"
  >
    <Card variant="elevated" interactive className="p-4 sm:p-6 md:p-8 flex flex-col items-center text-center h-full">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-accent/20 to-brand-secondary/10 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-2xl font-semibold text-brand-text mb-2">{title}</h3>
      <p className="text-brand-secondary mb-6 flex-grow">{subtitle}</p>
      <Button onClick={onClick} variant="premium" size="md" className="w-full">
        {buttonText}
      </Button>
    </Card>
  </motion.div>
);



export const TechniqueSelector: React.FC<TechniqueSelectorProps> = ({ onSelect, onBack, products }) => {
  // Normalizar precios antes de cualquier uso
  const normalizedProducts = normalizeProductsPrice(products);

  return (
    <div className="px-4 py-6 sm:p-6 md:p-8 bg-transparent max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.button 
          onClick={onBack}
          whileHover={{ x: -4 }}
          className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold text-lg flex items-center gap-1"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Editar Selección
        </motion.button>
        <h2 className="text-3xl sm:text-4xl font-bold text-brand-text mb-2">
          Elige una opción
        </h2>
        <p className="text-brand-secondary mb-10 text-base sm:text-lg">
          ¿En qué te gustaría enfocarte hoy?
        </p>
      </motion.div>

      {/* Technique Cards */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        <TechniqueCard
          title="Torno Alfarero"
          subtitle="Aprende a levantar piezas en el torno, creando tazas, cuencos y jarrones."
          buttonText="Seleccionar Torno"
          onClick={() => onSelect('potters_wheel')}
          index={0}
          icon={<KeyIcon className="w-8 h-8 text-brand-secondary" />}
        />
        <TechniqueCard
          title="Modelado a Mano"
          subtitle="Explora técnicas escultóricas como el pellizco, los churros y las planchas."
          buttonText="Seleccionar Modelado"
          onClick={() => onSelect('molding')}
          index={1}
          icon={<span className="text-3xl">🖌️</span>}
        />
      </div>
    </div>
  );
};
