import React from 'react';
import type { Technique } from '../types';

interface CouplesTechniqueSelectorProps {
  onSelect: (technique: Technique) => void;
  onBack: () => void;
}

interface TechniqueCard {
  technique: Technique;
  icon: string;
  title: string;
  subtitle: string;
  description: React.ReactNode;
  highlights: string[];
}

const TECHNIQUE_OPTIONS: TechniqueCard[] = [
  {
    technique: 'potters_wheel',
    icon: '🎯',
    title: 'TORNO ALFARERO',
    subtitle: 'Técnica de torneado',
    description: (
      <div className="space-y-2">
        <p className="text-sm text-brand-secondary">
          El torneado es una técnica tradicional que requiere coordinación y precisión. Trabajar en la rueda alfarera permite crear formas simétricas y explorar los principios fundamentales de la cerámica.
        </p>
      </div>
    ),
    highlights: [
      'Técnica fundamental en cerámica',
      'Requiere coordinación y control',
      'Produces formas simétricas',
      'Experiencia desafiante y enriquecedora',
    ],
  },
  {
    technique: 'molding',
    icon: '✋',
    title: 'MODELADO A MANO',
    subtitle: 'Técnica de modelado libre',
    description: (
      <div className="space-y-2">
        <p className="text-sm text-brand-secondary">
          El modelado a mano es una aproximación más intuitiva a la cerámica. Permite expresar creatividad sin las restricciones técnicas del torneado, enfocándose en forma, volumen y textura.
        </p>
      </div>
    ),
    highlights: [
      'Enfoque creativo y expresivo',
      'Mayor libertad formal',
      'Énfasis en textura y composición',
      'Accesible para todos los niveles',
    ],
  },
];

export const CouplesTechniqueSelector: React.FC<CouplesTechniqueSelectorProps> = ({
  onSelect,
  onBack,
}) => {
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-brand-surface rounded-xl shadow-subtle animate-fade-in-up max-w-4xl mx-auto w-full">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-sm font-semibold text-brand-secondary hover:text-brand-text mb-4 sm:mb-6 transition-colors flex items-center gap-1"
      >
        ← Volver
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-text mb-3">¿Qué técnica prefieres?</h2>
        <p className="text-sm sm:text-base md:text-lg text-brand-secondary">
          Ambas opciones incluyen todo lo anterior. La diferencia está en el proceso creativo.
        </p>
      </div>

      {/* Technique Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
        {TECHNIQUE_OPTIONS.map((option) => (
          <div
            key={option.technique}
            className="bg-brand-background border-2 border-brand-border rounded-xl p-4 sm:p-6 hover:border-brand-primary transition-all duration-300 hover:shadow-lifted"
          >
            {/* Icon & Title */}
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-brand-primary mb-1">{option.title}</h3>
              <p className="text-sm text-brand-secondary italic">{option.subtitle}</p>
            </div>

            {/* Description */}
            <div className="mb-6">{option.description}</div>

            {/* Highlights */}
            <div className="space-y-2 mb-8">
              {option.highlights.map((highlight, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-brand-accent mt-1 flex-shrink-0">•</span>
                  <p className="text-sm text-brand-text">{highlight}</p>
                </div>
              ))}
            </div>

            {/* Button */}
            <button
              onClick={() => onSelect(option.technique)}
              className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity duration-300"
            >
              Seleccionar {option.title === 'TORNO ALFARERO' ? 'Torno' : 'Modelado'}
            </button>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-bold">Nota:</span> Ambas técnicas son válidas para una experiencia significativa. 
          Elige según tus preferencias: el torneado ofrece desafío técnico, mientras que el modelado permite mayor libertad expresiva.
        </p>
      </div>
    </div>
  );
};
