import React from 'react';
// ...existing code...

interface WelcomeSelectorProps {
  onSelect: (userType: 'new' | 'returning' | 'group_experience' | 'couples_experience' | 'team_building' | 'open_studio' | 'group_class_wizard' | 'single_class_wizard') => void;
}

const ChoiceCard: React.FC<{
    title: string;
    subtitle: string;
    buttonText: string;
    onClick: () => void;
}> = ({ title, subtitle, buttonText, onClick }) => (
    <div className="bg-brand-surface p-8 rounded-xl shadow-subtle hover:shadow-lifted transition-shadow duration-300 flex flex-col items-center text-center h-full">
        <h3 className="text-2xl font-semibold text-brand-text mb-4">{title}</h3>
        <p className="text-brand-secondary mb-8 flex-grow">{subtitle}</p>
        <button
            onClick={onClick}
            className="bg-brand-primary text-white font-bold py-3 px-8 rounded-lg w-full max-w-xs hover:opacity-90 transition-opacity duration-300"
        >
            {buttonText}
        </button>
    </div>
);

const ExperienceCard: React.FC<{
    title: string;
    subtitle: string;
    buttonText: string;
    onClick: () => void;
    isComingSoon?: boolean;
}> = ({ title, subtitle, buttonText, onClick, isComingSoon }) => (
     <div 
        className={`bg-brand-surface p-8 rounded-xl shadow-subtle flex flex-col md:flex-row items-center text-center md:text-left gap-6 ${isComingSoon ? 'cursor-not-allowed opacity-60 border border-gray-300' : 'cursor-pointer hover:shadow-lifted transition-shadow duration-300'}`}
        onClick={() => !isComingSoon && onClick()}
      >
        <div className="flex-grow">
            <h3 className="text-2xl font-semibold text-brand-text mb-2">{title}</h3>
            <p className={`${isComingSoon ? 'text-gray-500' : 'text-brand-secondary'}`}>{subtitle}</p>
        </div>
        <button 
            disabled={isComingSoon}
            className={`font-bold py-3 px-8 rounded-lg w-full md:w-auto flex-shrink-0 ${isComingSoon ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-brand-accent text-white hover:opacity-90 transition-opacity duration-300'}`}
        >
            {isComingSoon ? 'Próximamente' : buttonText}
        </button>
      </div>
);


export const WelcomeSelector: React.FC<WelcomeSelectorProps> = ({ onSelect }) => {
  return (
    <div className="text-center p-4 sm:p-6 bg-transparent animate-fade-in-up max-w-6xl mx-auto w-full">
      <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-text mb-2">Bienvenido a Ceramicalma</h2>
      <p className="text-base sm:text-lg text-brand-secondary mb-8 sm:mb-10">¿Es tu primera vez con nosotros?</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-10">
        <ChoiceCard
          title="Soy Nuevo Aquí"
          subtitle="Comienza tu aventura con nuestra Clase Introductoria, diseñada para principiantes absolutos."
          buttonText="¡Quiero Empezar!"
          onClick={() => onSelect('new')}
        />
        <ChoiceCard
          title="Ya Soy Alumno"
          subtitle="Continúa tu práctica seleccionando uno de nuestros paquetes de clases continuas."
          buttonText="Ver Paquetes"
          onClick={() => onSelect('returning')}
        />
        <ChoiceCard
          title="Open Studio"
          subtitle="Elige nuestra membresía Open Studio y accede al taller sin límites."
          buttonText="Ir a Open Studio"
          onClick={() => onSelect('open_studio')}
        />
      </div>

      {/* NEW EXPERIENCES SECTION */}
      <div className="mb-8 md:mb-10">
        <h3 className="text-xl font-semibold text-brand-text mb-4">Nuevas Experiencias Personalizadas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ExperienceCard 
            title="Experiencia Personalizada"
            subtitle="Reúne a tu grupo y diseña la clase perfecta. Cada persona elige su técnica: torno, modelado o pintura."
            buttonText="Crear Experiencia"
            onClick={() => onSelect('group_class_wizard')}
            isComingSoon={false}
          />
          <ExperienceCard 
            title="Clases Sueltas"
            subtitle="Elige entre Clase Individual (solo para ti) o Grupal (con amigos). Técnicas: Torno (máx 8) • Modelado (máx 14) • Pintura (sin límite)."
            buttonText="Reservar Clase"
            onClick={() => onSelect('single_class_wizard')}
            isComingSoon={false}
          />
        </div>
      </div>

      <div className="space-y-6 md:space-y-8">
        <ExperienceCard 
          title="Experiencias para Parejas"
          subtitle="Una cita creativa y diferente. Moldeen una pieza juntos en el torno o creen piezas individuales, con la guía de un instructor."
          buttonText="Planifica tu Cita"
          onClick={() => onSelect('couples_experience')}
          isComingSoon={false}
        />
        <ExperienceCard 
          title="Experiencias Grupales"
          subtitle="Ideal para cumpleaños, team building o una reunión creativa entre amigos. Contáctanos para crear un evento a tu medida."
          buttonText="Planifica Tu Evento"
          onClick={() => onSelect('group_experience')}
        />
        <ExperienceCard 
          title="Team Building Corporativo"
          subtitle="Fortalece a tu equipo con un taller de cerámica creativo y colaborativo."
          buttonText="Planifica tu Evento"
          onClick={() => onSelect('team_building')}
        />
      </div>
    </div>
  );
};