import React from 'react';
import { FEATURE_FLAGS } from '../featureFlags.ts';

interface WelcomeSelectorProps {
  onSelect: (userType: 'new' | 'returning' | 'group_experience' | 'couples_experience' | 'team_building' | 'open_studio' | 'group_class_wizard' | 'single_class_wizard' | 'wheel_course' | 'custom_experience') => void;
}

// Mobile-first Card optimizada para iPhone
const ChoiceCard: React.FC<{
    title: string;
    subtitle: string;
    buttonText: string;
    onClick: () => void;
}> = ({ title, subtitle, buttonText, onClick }) => (
    <div className="bg-brand-surface p-5 sm:p-6 md:p-8 rounded-2xl shadow-subtle hover:shadow-lifted transition-all duration-300 flex flex-col items-center text-center h-full active:scale-[0.98]">
        <h3 className="text-xl sm:text-2xl font-semibold text-brand-text mb-2 sm:mb-4">{title}</h3>
        <p className="text-sm sm:text-base text-brand-secondary mb-4 sm:mb-6 md:mb-8 flex-grow leading-relaxed">{subtitle}</p>
        <button
            onClick={onClick}
            className="bg-brand-primary text-white font-semibold py-3 sm:py-3.5 px-6 sm:px-8 rounded-xl w-full hover:opacity-90 active:opacity-80 transition-all duration-200 text-sm sm:text-base touch-manipulation"
        >
            {buttonText}
        </button>
    </div>
);

// Experience Card optimizada para mobile con mejor touch feedback
const ExperienceCard: React.FC<{
    title: string;
    subtitle: string;
    buttonText: string;
    onClick: () => void;
    isComingSoon?: boolean;
}> = ({ title, subtitle, buttonText, onClick, isComingSoon }) => (
     <div 
        className={`bg-brand-surface p-5 sm:p-6 md:p-8 rounded-2xl shadow-subtle flex flex-col gap-4 sm:gap-5 md:flex-row md:items-center md:gap-6 ${
          isComingSoon 
            ? 'opacity-50 border border-gray-200' 
            : 'active:scale-[0.99] hover:shadow-lifted transition-all duration-300'
        }`}
        onClick={() => !isComingSoon && onClick()}
      >
        <div className="flex-grow text-center md:text-left">
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-brand-text mb-1.5 sm:mb-2">{title}</h3>
            <p className={`text-sm sm:text-base leading-relaxed ${isComingSoon ? 'text-gray-400' : 'text-brand-secondary'}`}>{subtitle}</p>
        </div>
        <button 
            disabled={isComingSoon}
            className={`font-semibold py-3 sm:py-3.5 px-6 sm:px-8 rounded-xl w-full md:w-auto flex-shrink-0 text-sm sm:text-base transition-all duration-200 touch-manipulation ${
              isComingSoon 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-brand-accent text-white hover:opacity-90 active:opacity-80'
            }`}
        >
            {isComingSoon ? 'Próximamente' : buttonText}
        </button>
      </div>
);


export const WelcomeSelector: React.FC<WelcomeSelectorProps> = ({ onSelect }) => {
  const [showAllOptions, setShowAllOptions] = React.useState(false);
  
  return (
    <div className="text-center px-4 py-6 sm:p-6 md:p-8 bg-transparent animate-fade-in-up max-w-6xl mx-auto w-full">
      {/* Hero Section - Focused on Custom Experience */}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-brand-text mb-2 sm:mb-3">
        🎨 Experiencia Personalizada
      </h2>
      <p className="text-base sm:text-lg text-brand-secondary mb-4 sm:mb-6">
        Reúne a tu grupo y diseña la clase perfecta
      </p>
      
      {/* Social Proof */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6">
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 border-2 border-white" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-400 border-2 border-white" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-pink-400 border-2 border-white" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 border-2 border-white" />
        </div>
        <span className="font-medium">+247 personas celebraron este mes</span>
      </div>
      
      {/* Main CTA - Custom Experience First */}
      <div className="bg-brand-surface border-2 border-brand-primary p-6 sm:p-8 rounded-2xl shadow-lg mb-8">
        <h3 className="text-2xl sm:text-3xl font-bold mb-3 text-brand-text">Experiencia Personalizada</h3>
        <p className="text-base sm:text-lg mb-4 text-brand-secondary">
          ✨ Tu grupo elige una técnica: torno, modelado o pintura
        </p>
        
        {/* Quick Info */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6 text-sm">
          <span className="bg-brand-background px-3 py-1.5 rounded-full border border-brand-border text-brand-text font-medium">
            💰 Desde $18/persona
          </span>
          <span className="bg-brand-background px-3 py-1.5 rounded-full border border-brand-border text-brand-text font-medium">
            👥 2-22 personas
          </span>
          <span className="bg-brand-background px-3 py-1.5 rounded-full border border-brand-border text-brand-text font-medium">
            ⏱️ 2 horas
          </span>
        </div>
        
        {/* Process Preview */}
        <div className="bg-brand-background rounded-xl p-4 mb-6 text-left border border-brand-border">
          <h4 className="font-semibold mb-3 text-center text-brand-text">📋 Proceso simple en 4 pasos:</h4>
          <div className="space-y-2 text-sm text-brand-secondary">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <span>Cuántas personas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <span>Elige la técnica del grupo (torno, moldeo o pintura)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <span>Selecciona fecha y hora</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              <span>Confirma y paga</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => onSelect('custom_experience')}
          disabled={!FEATURE_FLAGS.EXPERIENCIA_PERSONALIZADA}
          className={`font-bold py-4 px-8 rounded-xl w-full transition-all text-lg shadow-md ${
            FEATURE_FLAGS.EXPERIENCIA_PERSONALIZADA
              ? 'bg-brand-accent text-white hover:opacity-90 active:scale-[0.98]'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {FEATURE_FLAGS.EXPERIENCIA_PERSONALIZADA ? '🎨 Crear Experiencia' : 'Próximamente'}
        </button>
      </div>
      
      {/* Other Options - Collapsed by default on mobile */}
      <button
        onClick={() => setShowAllOptions(!showAllOptions)}
        className="text-brand-primary font-medium mb-4 hover:underline flex items-center gap-2 mx-auto"
      >
        <span>💭 Ver todas las opciones</span>
        <svg 
          className={`w-4 h-4 transition-transform ${showAllOptions ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {showAllOptions && (
        <>
      {/* Main Options - Stack on mobile, grid on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-8 sm:mb-10 md:mb-12">
        <ChoiceCard
          title="Soy Nuevo Aquí"
          subtitle="Comienza tu aventura con nuestra Clase Introductoria, diseñada para principiantes."
          buttonText="¡Quiero Empezar!"
          onClick={() => onSelect('new')}
        />
        <ChoiceCard
          title="Ya Soy Alumno"
          subtitle="Continúa tu práctica seleccionando uno de nuestros paquetes de clases."
          buttonText="Ver Paquetes"
          onClick={() => onSelect('returning')}
        />
        <ChoiceCard
          title="Open Studio"
          subtitle="Accede al taller sin límites con nuestra membresía Open Studio."
          buttonText="Ir a Open Studio"
          onClick={() => onSelect('open_studio')}
        />
      </div>

      {/* Section Divider */}
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <div className="flex-1 h-px bg-brand-border/50"></div>
        <h3 className="text-base sm:text-lg font-semibold text-brand-text px-2">Otras Opciones</h3>
        <div className="flex-1 h-px bg-brand-border/50"></div>
      </div>

      {/* New Experiences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-6 sm:mb-8">
        <ExperienceCard 
          title="Experiencias Grupales"
          subtitle="Ideal para cumpleaños, despedidas, team building o reuniones con amigos."
          buttonText="Planifica Tu Evento"
          onClick={() => onSelect('group_experience')}
        />
        <ExperienceCard 
          title="Clases Sueltas"
          subtitle="Clase individual o grupal. Ideal para probar sin compromiso."
          buttonText="Reservar Clase"
          onClick={() => onSelect('single_class_wizard')}
          isComingSoon={!FEATURE_FLAGS.CLASES_SUELTAS}
        />
      </div>

      {/* Curso de Torno - Featured Card con badges mejorados */}
      <div className="mb-6 sm:mb-8">
        <div 
          className={`bg-brand-surface p-5 sm:p-6 md:p-8 rounded-2xl shadow-subtle relative overflow-hidden ${
            !FEATURE_FLAGS.CURSO_TORNO 
              ? 'opacity-50 border border-gray-200' 
              : 'active:scale-[0.99] hover:shadow-lifted transition-all duration-300'
          }`}
          onClick={() => FEATURE_FLAGS.CURSO_TORNO && onSelect('wheel_course')}
        >
          {/* Badges - Mobile optimized */}
          <div className="flex justify-center md:justify-start gap-2 mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
              <span className="text-[10px]">✨</span> Nuevo
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">
              <span className="text-[10px]">🎓</span> Curso
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-5 md:gap-6">
            <div className="flex-grow text-center md:text-left">
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-brand-text mb-1.5 sm:mb-2">
                Aprende Torno desde Cero
              </h3>
              <p className={`text-sm sm:text-base mb-3 sm:mb-4 leading-relaxed ${!FEATURE_FLAGS.CURSO_TORNO ? 'text-gray-400' : 'text-brand-secondary'}`}>
                6 horas de instrucción • Grupos reducidos • Certificado incluido
              </p>
              
              {/* Info chips - Mobile optimized */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-xs sm:text-sm text-brand-secondary">
                <span className="inline-flex items-center gap-1.5 bg-brand-background/50 px-2.5 py-1 rounded-full">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  2 horarios
                </span>
                <span className="inline-flex items-center gap-1.5 bg-brand-background/50 px-2.5 py-1 rounded-full">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  Máx 6
                </span>
                <span className="inline-flex items-center gap-1.5 bg-brand-background/50 px-2.5 py-1 rounded-full font-medium">
                  $150
                </span>
              </div>
            </div>
            
            <button 
              disabled={!FEATURE_FLAGS.CURSO_TORNO}
              className={`font-semibold py-3 sm:py-3.5 px-6 sm:px-8 rounded-xl w-full md:w-auto flex-shrink-0 text-sm sm:text-base transition-all duration-200 touch-manipulation ${
                !FEATURE_FLAGS.CURSO_TORNO 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-brand-accent text-white hover:opacity-90 active:opacity-80'
              }`}
            >
              {FEATURE_FLAGS.CURSO_TORNO ? 'Ver Detalles →' : 'Próximamente'}
            </button>
          </div>
        </div>
      </div>

      {/* Other Experiences */}
      <div className="space-y-4 sm:space-y-5">
        <ExperienceCard 
          title="Experiencias para Parejas"
          subtitle="Una cita creativa y diferente. Moldeen juntos o creen piezas individuales."
          buttonText="Planifica tu Cita"
          onClick={() => onSelect('couples_experience')}
          isComingSoon={!FEATURE_FLAGS.EXPERIENCIAS_PAREJAS}
        />
        <ExperienceCard 
          title="Team Building Corporativo"
          subtitle="Fortalece a tu equipo con un taller de cerámica creativo y colaborativo."
          buttonText="Planifica tu Evento"
          onClick={() => onSelect('team_building')}
        />
      </div>
      </>
      )}
    </div>
  );
};
