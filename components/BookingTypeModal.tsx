import React from 'react';
import type { BookingMode } from '../types';
import { getClassPackageValidityLabel } from '../utils/classPackageValidity';

interface BookingTypeModalProps {
  onSelect: (mode: BookingMode) => void;
  onClose: () => void;
  /** Número de clases del paquete (para textos de validez) */
  packageClasses?: number;
}

const OptionCard: React.FC<{
    title: string;
    description: string;
    onSelect: () => void;
    buttonText: string;
}> = ({ title, description, onSelect, buttonText }) => (
    <div className="bg-brand-background p-6 rounded-lg border-2 border-transparent hover:border-brand-primary transition-all duration-300 flex flex-col">
        <h3 className="text-xl font-bold text-brand-accent">{title}</h3>
        <p className="text-brand-secondary mt-2 flex-grow">{description}</p>
        <button
            onClick={onSelect}
            className="mt-6 bg-brand-primary text-white font-bold py-2 px-6 rounded-lg w-full hover:bg-brand-accent transition-colors duration-300"
        >
            {buttonText}
        </button>
    </div>
);

export const BookingTypeModal: React.FC<BookingTypeModalProps> = ({ onSelect, onClose, packageClasses = 4 }) => {
  const classes = packageClasses || 4;
  const validityLabel = getClassPackageValidityLabel(classes);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 w-full max-w-3xl animate-fade-in-up mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-accent mb-2">¿Cómo quieres agendar tus clases?</h2>
          <p className="text-brand-secondary text-sm sm:text-base md:text-xl">
            Paquete de {classes} clases · plazo máximo: <strong>{validityLabel}</strong> desde tu primera clase.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          <OptionCard 
            title="Horario Fijo"
            description={`Asiste el mismo día y a la misma hora durante 4 semanas seguidas (ideal para el paquete de 4). Perfecto para crear una rutina.`}
            onSelect={() => onSelect('monthly')}
            buttonText="Seleccionar"
          />
          <OptionCard 
            title="Horario Flexible"
            description={`Elige tus ${classes} fechas y horas dentro de un máximo de ${validityLabel} desde la primera clase. Más holgura para organizar tu agenda.`}
            onSelect={() => onSelect('flexible')}
            buttonText="Seleccionar"
          />
        </div>
      </div>
    </div>
  );
};
