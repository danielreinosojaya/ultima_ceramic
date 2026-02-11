import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BookingMode } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface BookingTypeModalProps {
  onSelect: (mode: BookingMode) => void;
  onClose: () => void;
}

interface OptionCardProps {
    title: string;
    description: string;
    onSelect: () => void;
    buttonText: string;
    index: number;
}

const OptionCard: React.FC<OptionCardProps> = ({ title, description, onSelect, buttonText, index }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.15 }}
      whileHover={{ scale: 1.02, y: -5 }}
    >
      <Card variant="elevated" interactive>
        <div className="flex flex-col h-full">
          <h3 className="text-xl font-bold text-brand-accent mb-2">{title}</h3>
          <p className="text-brand-secondary mt-2 flex-grow leading-relaxed">{description}</p>
          <motion.div
            className="mt-6"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button variant="premium" onClick={onSelect} className="w-full">
              {buttonText}
            </Button>
          </motion.div>
        </div>
      </Card>
    </motion.div>
);

export const BookingTypeModal: React.FC<BookingTypeModalProps> = ({ onSelect, onClose }) => {
  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <motion.div
          className="bg-white rounded-2xl shadow-premium w-full max-w-3xl"
          onClick={(e) => e.stopPropagation()}
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Header */}
          <motion.div
            className="bg-gradient-to-r from-brand-primary to-brand-accent text-white p-8 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
              ¿Cómo quieres agendar tus clases?
            </h2>
            <p className="text-white/80 text-sm sm:text-base md:text-lg">
              Elige la opción que mejor se adapte a tu horario.
            </p>
          </motion.div>

          {/* Content Grid */}
          <motion.div
            className="p-6 sm:p-8 md:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              <OptionCard
                index={0}
                title="Horario Fijo Mensual"
                description="Asiste a clase el mismo día y a la misma hora durante 4 semanas seguidas. Perfecto para crear una rutina."
                onSelect={() => onSelect('monthly')}
                buttonText="Seleccionar"
              />
              <OptionCard
                index={1}
                title="Horario Flexible"
                description="Elige 4 fechas y horas de clase disponibles en un período de 30 días. Flexibilidad total."
                onSelect={() => onSelect('flexible')}
                buttonText="Seleccionar"
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};