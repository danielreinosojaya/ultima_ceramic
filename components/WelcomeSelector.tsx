import React from 'react';
// ...existing code...

interface WelcomeSelectorProps {
  onSelect: (userType: 'new' | 'returning' | 'group_experience' | 'couples_experience' | 'team_building' | 'open_studio') => void;
}

const ChoiceCard: React.FC<{
    title: string;
    subtitle: string;
    buttonText: string;
    onClick: () => void;
}> = ({ title, subtitle, buttonText, onClick }) => (
    <div className="bg-brand-surface p-5 sm:p-7 rounded-xl shadow-subtle hover:shadow-lifted transition-all duration-300 flex flex-col h-full">
        <div className="text-center flex-1 flex flex-col">
            <h3 className="text-lg sm:text-xl font-semibold text-brand-text mb-2">{title}</h3>
            <p className="text-xs sm:text-sm text-brand-secondary flex-1 mb-4">{subtitle}</p>
        </div>
        <button
            onClick={onClick}
            className="bg-brand-primary text-white font-semibold py-2 px-5 rounded-lg w-full hover:opacity-90 transition-opacity text-sm sm:text-base"
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
        className="bg-brand-surface p-5 sm:p-6 rounded-xl shadow-subtle hover:shadow-lifted transition-all duration-300 flex flex-col sm:flex-row items-center gap-4 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-semibold text-brand-text mb-1">{title}</h3>
            <p className="text-xs sm:text-sm text-brand-secondary">{subtitle}</p>
        </div>
        <button className="bg-brand-accent text-white font-semibold py-2 px-5 rounded-lg w-full sm:w-auto hover:opacity-90 transition-opacity flex-shrink-0 text-sm sm:text-base">
            {buttonText}
        </button>
      </div>
);


export const WelcomeSelector: React.FC<WelcomeSelectorProps> = ({ onSelect }) => {
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-10 animate-fade-in-up">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-text mb-1">Bienvenido a Ceramicalma</h2>
        <p className="text-sm sm:text-base text-brand-secondary">¿Es tu primera vez con nosotros?</p>
      </div>
      
      {/* Top 3 Choice Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-8">
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

      {/* Experience Cards */}
      <div className="space-y-3 sm:space-y-4">
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