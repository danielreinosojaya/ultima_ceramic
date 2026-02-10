import React from 'react';
import { FEATURE_FLAGS } from '../featureFlags.ts';

interface WelcomeSelectorProps {
  onSelect: (userType: 'new' | 'returning' | 'group_experience' | 'couples_experience' | 'team_building' | 'open_studio' | 'group_class_wizard' | 'single_class_wizard' | 'wheel_course' | 'custom_experience') => void;
}

const ChoiceCard: React.FC<{
  title: string;
  subtitle: string;
  buttonText: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ title, subtitle, buttonText, onClick, disabled }) => (
  <div className={`bg-brand-surface p-5 sm:p-6 md:p-8 rounded-2xl shadow-subtle transition-all duration-300 flex flex-col items-center text-center h-full ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lifted active:scale-[0.98]'}`}>
    <h3 className="text-xl sm:text-2xl font-semibold text-brand-text mb-2 sm:mb-4">{title}</h3>
    <p className="text-sm sm:text-base text-brand-secondary mb-4 sm:mb-6 md:mb-8 flex-grow leading-relaxed">{subtitle}</p>
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-semibold py-3 sm:py-3.5 px-6 sm:px-8 rounded-xl w-full transition-all duration-200 text-sm sm:text-base touch-manipulation ${disabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-brand-primary text-white hover:opacity-90 active:opacity-80'}`}
    >
      {buttonText}
    </button>
  </div>
);

export const WelcomeSelector: React.FC<WelcomeSelectorProps> = ({ onSelect }) => {
  const options = [
    {
      title: 'Experiencia Personalizada',
      subtitle: 'Reune a tu grupo y disena la clase perfecta con la tecnica que prefieran.',
      buttonText: FEATURE_FLAGS.EXPERIENCIA_PERSONALIZADA ? 'Crear Experiencia' : 'Proximamente',
      onClick: () => onSelect('custom_experience'),
      disabled: !FEATURE_FLAGS.EXPERIENCIA_PERSONALIZADA
    },
    {
      title: 'Clases Sueltas',
      subtitle: 'Una sola clase para probar cualquier técnica sin compromiso.',
      buttonText: FEATURE_FLAGS.CLASES_SUELTAS ? 'Reservar Clase' : 'Proximamente',
      onClick: () => onSelect('single_class_wizard'),
      disabled: !FEATURE_FLAGS.CLASES_SUELTAS
    },
    {
      title: 'Paquetes de Clases',
      subtitle: 'Continua tu practica con paquetes de varias clases.',
      buttonText: 'Ver Paquetes',
      onClick: () => onSelect('returning')
    },
    {
      title: 'Open Studio',
      subtitle: 'Accede al taller para trabajar en tus proyectos personales.',
      buttonText: 'Ir a Open Studio',
      onClick: () => onSelect('open_studio')
    },
    {
      title: 'Curso de Torno',
      subtitle: '6 horas de instruccion - Grupos reducidos - Certificado incluido',
      buttonText: FEATURE_FLAGS.CURSO_TORNO ? 'Ver Curso' : 'Proximamente',
      onClick: () => onSelect('wheel_course'),
      disabled: !FEATURE_FLAGS.CURSO_TORNO
    }
  ];

  return (
    <div className="text-center px-4 py-6 sm:p-6 md:p-8 bg-transparent animate-fade-in-up max-w-6xl mx-auto w-full">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-brand-text mb-1.5 sm:mb-2">
        Bienvenido a Ceramicalma
      </h2>
      <p className="text-sm sm:text-base md:text-lg text-brand-secondary mb-6 sm:mb-8">
        Elige la experiencia que mejor se adapta a lo que buscas.
      </p>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6">
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 border-2 border-white" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-400 border-2 border-white" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-pink-400 border-2 border-white" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 border-2 border-white" />
        </div>
        <span className="font-medium">+247 personas celebraron este mes</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {options.map(option => (
          <ChoiceCard
            key={option.title}
            title={option.title}
            subtitle={option.subtitle}
            buttonText={option.buttonText}
            onClick={option.onClick}
            disabled={option.disabled}
          />
        ))}
      </div>
    </div>
  );
};
