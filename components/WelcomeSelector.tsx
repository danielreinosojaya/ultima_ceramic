import React from 'react';

interface WelcomeSelectorProps {
  onSelect: (userType: 'new' | 'returning' | 'group_experience' | 'couples_experience' | 'team_building' | 'open_studio') => void;
}

const ChoiceCard: React.FC<{
    title: string;
    subtitle: string;
    buttonText: string;
    onClick: () => void;
}> = ({ title, subtitle, buttonText, onClick }) => (
    <div className="bg-brand-surface p-4 sm:p-6 md:p-8 rounded-xl shadow-subtle hover:shadow-lifted transition-shadow duration-300 flex flex-col items-center text-center h-full">
        <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-brand-text mb-3 sm:mb-4 break-words">{title}</h3>
        <p className="text-sm sm:text-base text-brand-secondary mb-4 sm:mb-8 flex-grow line-clamp-4">{subtitle}</p>
        <button
            onClick={onClick}
            className="bg-brand-primary text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-lg w-full max-w-xs hover:opacity-90 transition-opacity duration-300 text-sm sm:text-base"
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
}> = ({ title, subtitle, buttonText, onClick }) => (
    <div 
        className="bg-brand-surface p-4 sm:p-6 md:p-8 rounded-xl shadow-subtle hover:shadow-lifted transition-shadow duration-300 flex flex-col md:flex-row items-stretch md:items-center text-center md:text-left gap-4 md:gap-6 cursor-pointer"
        onClick={onClick}
    >
        <div className="flex-grow min-w-0">
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-brand-text mb-1 md:mb-2 break-words">{title}</h3>
            <p className="text-xs sm:text-sm md:text-base text-brand-secondary line-clamp-3">{subtitle}</p>
        </div>
        <button className="bg-brand-accent text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-lg w-full md:w-auto hover:opacity-90 transition-opacity duration-300 flex-shrink-0 text-sm sm:text-base mt-3 md:mt-0">
            {buttonText}
        </button>
    </div>
);

export const WelcomeSelector: React.FC<WelcomeSelectorProps> = ({ onSelect }) => {
  return (
    <div className="text-center p-4 sm:p-6 bg-transparent animate-fade-in-up max-w-6xl mx-auto w-full">
      <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-text mb-2">Bienvenido a Ceramicalma</h2>
      <p className="text-sm sm:text-base md:text-lg text-brand-secondary mb-8 sm:mb-10">¿Es tu primera vez con nosotros?</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-8 md:mb-10">
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
      
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <ExperienceCard 
          title="Experiencias para Parejas"
          subtitle="Una cita creativa y diferente. Moldeen una pieza juntos en el torno o creen piezas individuales, con la guía de un instructor."
          buttonText="Planifica tu Cita"
          onClick={() => onSelect('couples_experience')}
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
