import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Product, OpenStudioSubscription } from '../types';
// Traducción eliminada, usar texto en español directamente
import { KeyIcon } from './icons/KeyIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <motion.div 
      className="text-center p-6 rounded-xl max-w-5xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.button 
        className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold text-lg"
        whileHover={{ x: -5 }}
        style={{ background: 'none', border: 'none' }}
      >
        &larr; Editar Selección
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-text mb-2">Elige una Técnica</h2>
        <p className="text-brand-secondary mb-8 text-sm sm:text-base md:text-xl">¿En qué te gustaría enfocarte hoy?</p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-10"
      >
        <Card variant="glass" className="p-6 text-left flex items-start gap-4 border-2 border-white/30">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <SparklesIcon className="w-8 h-8 text-brand-accent flex-shrink-0 mt-1" />
          </motion.div>
          <div>
            <h3 className="font-bold text-brand-text text-lg">Más Clases, Más Ahorro</h3>
            <p className="text-sm text-brand-secondary mt-1">Comprometerse con un paquete te ayuda a crear una rutina y ofrece un descuento significativo por clase.</p>
          </div>
        </Card>
      </motion.div>

      <motion.div 
        className="grid md:grid-cols-3 gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {packages.map((pkg, index) => {
          if (pkg.type === 'CLASS_PACKAGE') {
            const pricePerClass = pkg.price / pkg.classes;
            return (
              <motion.div
                key={pkg.id}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  variant="elevated"
                  interactive
                  onClick={() => onSelect(pkg)}
                  className="overflow-hidden flex flex-col h-full"
                >
                  {/* Image Section */}
                  <div className="aspect-[4/3] w-full bg-gradient-to-br from-brand-background to-brand-background/80 overflow-hidden group relative">
                    {pkg.imageUrl ? (
                      <motion.img 
                        src={pkg.imageUrl} 
                        alt={pkg.name}
                        className="w-full h-full object-cover"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.3 }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-semibold text-brand-accent text-lg">CeramicAlma</span>
                      </div>
                    )}
                    {index === 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-3 right-3"
                      >
                        <Badge variant="premium">Más Popular</Badge>
                      </motion.div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-4 sm:p-5 md:p-6 flex-grow flex flex-col text-left">
                    <h3 className="text-2xl font-semibold text-brand-primary mb-4">{pkg.name}</h3>
                    
                    {/* Price Section */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <p className="text-4xl font-bold text-brand-text">${pkg.price}</p>
                      <p className="text-brand-secondary font-semibold text-sm">/ {pkg.classes} clases</p>
                    </div>

                    {/* Price Per Class */}
                    <Card variant="glass" className="p-3 text-center mb-4 border border-white/20">
                      <p className="font-bold text-brand-text">${pricePerClass.toFixed(2)} <span className="font-normal text-brand-secondary text-sm">por clase</span></p>
                    </Card>

                    {/* Description */}
                    <p className="text-brand-secondary text-sm flex-grow min-h-[3.5rem] mb-4">{pkg.description}</p>

                    {/* Button */}
                    <Button 
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={() => onSelect(pkg)}
                    >
                      Seleccionar paquete
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          }
          return null;
        })}
      </motion.div>
      {/* Bloque parejaCard eliminado: solo se muestran CLASS_PACKAGE */}
    </motion.div>
  );
};