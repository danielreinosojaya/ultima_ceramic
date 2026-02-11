import React from 'react';
import { motion } from 'framer-motion';
import { FEATURE_FLAGS } from '../featureFlags.ts';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface WelcomeSelectorProps {
  onSelect: (userType: 'new' | 'returning' | 'group_experience' | 'couples_experience' | 'team_building' | 'open_studio' | 'group_class_wizard' | 'single_class_wizard' | 'wheel_course' | 'custom_experience') => void;
}

interface ChoiceCardProps {
  title: string;
  subtitle: string;
  buttonText: string;
  onClick: () => void;
  disabled?: boolean;
  index: number;
}

const ChoiceCard: React.FC<ChoiceCardProps> = ({ title, subtitle, buttonText, onClick, disabled, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
    whileHover={!disabled ? { scale: 1.02 } : {}}
  >
    <Card 
      variant="elevated"
      onClick={!disabled ? onClick : undefined}
      interactive={!disabled}
      className={`p-5 sm:p-6 md:p-8 flex flex-col items-center text-center h-full ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <h3 className="text-xl sm:text-2xl font-semibold text-brand-text mb-2 sm:mb-4">{title}</h3>
      <p className="text-sm sm:text-base text-brand-secondary mb-4 sm:mb-6 md:mb-8 flex-grow leading-relaxed">{subtitle}</p>
      <Button
        onClick={onClick}
        disabled={disabled}
        variant="premium"
        size="md"
        className="w-full"
      >
        {buttonText}
      </Button>
    </Card>
  </motion.div>
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
      subtitle: 'Una sola clase para 1 persona. Prueba cualquier técnica sin compromiso.',
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
    <div className="text-center px-4 py-6 sm:p-6 md:p-8 bg-transparent max-w-6xl mx-auto w-full">
      {/* Header with animation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-brand-text mb-1.5 sm:mb-2">
          Bienvenido a Ceramicalma
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-brand-secondary mb-6 sm:mb-8">
          Elige la experiencia que mejor se adapta a lo que buscas.
        </p>
      </motion.div>

      {/* Social proof */}
      <motion.div 
        className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex -space-x-2">
          <motion.div 
            className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 border-2 border-white"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
          />
          <motion.div 
            className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-400 border-2 border-white"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
          />
          <motion.div 
            className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-pink-400 border-2 border-white"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div 
            className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 border-2 border-white"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          />
        </div>
        <motion.span 
          className="font-medium"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          +247 personas celebraron este mes
        </motion.span>
      </motion.div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {options.map((option, index) => (
          <ChoiceCard
            key={option.title}
            title={option.title}
            subtitle={option.subtitle}
            buttonText={option.buttonText}
            onClick={option.onClick}
            disabled={option.disabled}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};
