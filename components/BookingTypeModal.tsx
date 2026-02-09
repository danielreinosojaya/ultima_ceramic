import React from 'react';
import type { BookingMode } from '../types';
// ...existing code...

interface BookingTypeModalProps {
  onSelect: (mode: BookingMode) => void;
  onClose: () => void;
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

export const BookingTypeModal: React.FC<BookingTypeModalProps> = ({ onSelect, onClose }) => {
  // Traducción eliminada, usar texto en español directamente

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
          <p className="text-brand-secondary text-sm sm:text-base md:text-xl">Elige la opción que mejor se adapte a tu horario.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          <OptionCard 
            title="Horario Fijo Mensual"
            description="Asiste a clase el mismo día y a la misma hora durante 4 semanas seguidas. Perfecto para crear una rutina."
            onSelect={() => onSelect('monthly')}
            buttonText="Seleccionar"
          />
          <OptionCard 
            title="Horario Flexible"
            description="Elige 4 fechas y horas de clase disponibles en un período de 30 días. Flexibilidad total."
            onSelect={() => onSelect('flexible')}
            buttonText="Seleccionar"
          />
        </div>
      </div>
    </div>
  );
};