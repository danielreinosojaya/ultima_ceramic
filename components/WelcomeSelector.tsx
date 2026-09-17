import React from 'react';
import { FEATURE_FLAGS } from '../featureFlags';

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
  const secondaryOptions = [
    {
      title: 'Paquetes de Clases',
      subtitle: 'Continua tu practica con paquetes de varias clases.',
      buttonText: 'Ver Paquetes',
      onClick: () => onSelect('returning'),
      disabled: false,
    },
    {
      title: 'Open Studio',
      subtitle: 'Accede al taller para trabajar en tus proyectos personales.',
      buttonText: 'Ir a Open Studio',
      onClick: () => onSelect('open_studio'),
      disabled: false,
    },
    {
      title: 'Curso de Torno',
      subtitle: '6 horas de instruccion - Grupos reducidos - Certificado incluido',
      buttonText: FEATURE_FLAGS.CURSO_TORNO ? 'Ver Curso' : 'Proximamente',
      onClick: () => onSelect('wheel_course'),
      disabled: !FEATURE_FLAGS.CURSO_TORNO,
    },
  ];

  return (
    <div className="text-center px-4 py-6 sm:p-6 md:p-8 bg-transparent animate-fade-in-up max-w-6xl mx-auto w-full">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-brand-text mb-8 sm:mb-10">
        Bienvenido a Ceramicalma
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-10">
        <ChoiceCard
          title="Actividad"
          subtitle="Cerámica, canvas, charm bar, tote, cepillo y más. Para ti o un grupo."
          buttonText={FEATURE_FLAGS.CLASES_SUELTAS ? 'Ver actividades' : 'Proximamente'}
          onClick={() => onSelect('single_class_wizard')}
          disabled={!FEATURE_FLAGS.CLASES_SUELTAS}
        />
        <ChoiceCard
          title="Evento"
          subtitle="Cumpleaños o el evento que quieras armar."
          buttonText={FEATURE_FLAGS.EXPERIENCIA_PERSONALIZADA ? 'Armar evento' : 'Proximamente'}
          onClick={() => onSelect('custom_experience')}
          disabled={!FEATURE_FLAGS.EXPERIENCIA_PERSONALIZADA}
        />
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-4">
        También puedes
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {secondaryOptions.map((option) => (
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

      <div id="events-scroll-trigger" className="h-4 w-full" aria-hidden="true" />
    </div>
  );
};
