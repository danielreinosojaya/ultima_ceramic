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
    <div 
        className="group bg-brand-surface rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-1"
        onClick={onClick}
    >
        <div className="p-8 sm:p-10 flex flex-col h-full min-h-[280px] sm:min-h-[320px]">
            <div className="flex-1 flex flex-col items-center text-center">
                <h3 className="text-xl sm:text-2xl font-bold text-brand-text mb-4 group-hover:text-brand-primary transition-colors">
                    {title}
                </h3>
                <p className="text-sm sm:text-base text-brand-secondary leading-relaxed mb-6">
                    {subtitle}
                </p>
            </div>
            <button className="bg-brand-primary text-white font-bold py-3.5 px-8 rounded-xl w-full hover:bg-brand-secondary transition-all duration-300 text-base shadow-sm group-hover:shadow-md">
                {buttonText}
            </button>
        </div>
    </div>
);

const ExperienceCard: React.FC<{
    title: string;
    subtitle: string;
    buttonText: string;
    onClick: () => void;
}> = ({ title, subtitle, buttonText, onClick }) => (
     <div 
        className="group bg-brand-surface rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1"
        onClick={onClick}
      >
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-bold text-brand-text mb-2 group-hover:text-brand-accent transition-colors">
                    {title}
                </h3>
                <p className="text-sm sm:text-base text-brand-secondary leading-relaxed">
                    {subtitle}
                </p>
            </div>
            <button className="bg-brand-accent text-white font-bold py-3.5 px-8 rounded-xl hover:bg-brand-accent/90 transition-all duration-300 flex-shrink-0 whitespace-nowrap text-base shadow-sm group-hover:shadow-md min-w-[200px] sm:min-w-[180px]">
                {buttonText}
            </button>
        </div>
      </div>
);


export const WelcomeSelector: React.FC<WelcomeSelectorProps> = ({ onSelect }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-brand-text mb-3 tracking-tight">
          Bienvenido a Ceramicalma
        </h2>
        <p className="text-base sm:text-lg text-brand-secondary font-light">
          ¿Es tu primera vez con nosotros?
        </p>
      </div>
      
      {/* Top 3 Choice Cards - Perfect Square Aspect */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-10 sm:mb-14">
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

      {/* Experience Cards - Wide Horizontal */}
      <div className="space-y-5 sm:space-y-6">
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