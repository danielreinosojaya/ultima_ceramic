import * as React from 'react';
import { useState } from 'react';
interface WelcomeSelectorProps {
  onSelect: (userType: 'new' | 'returning' | 'group_experience' | 'couples_experience' | 'team_building') => void;
}

export const WelcomeSelector: React.FC<WelcomeSelectorProps & { onRedeemGiftcard?: () => void }> = ({ onSelect, onRedeemGiftcard }) => {
  // Banner superior clásico y minimalista para redención
  const [showBanner, setShowBanner] = useState(true);
  const [bannerExpanded, setBannerExpanded] = useState(false);
  const [bannerCode, setBannerCode] = useState("");
  const [bannerError, setBannerError] = useState("");
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const handleBannerExpand = () => {
    setBannerExpanded(true);
  };

  const handleBannerRedeem = async () => {
    if (!bannerCode.trim()) {
      setBannerError("Ingresa el código");
      return;
    }
    setBannerError("");
    setBannerLoading(true);
    setBannerSuccess(null);
    try {
      const res = await fetch("/api/data?action=redeemGiftcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: bannerCode.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setBannerSuccess("¡Giftcard redimida exitosamente!");
        setShowBanner(false);
      } else {
        setBannerError(data.error || "Error al redimir giftcard");
      }
    } catch (err) {
      setBannerError("Error de conexión. Intenta de nuevo.");
    }
    setBannerLoading(false);
  };


  const ChoiceCard: React.FC<{
    title: string;
    subtitle: string;
    buttonText: string;
    onClick: () => void;
  }> = ({ title, subtitle, buttonText, onClick }) => (
    <div className="bg-brand-surface p-8 rounded-xl shadow-subtle hover:shadow-lifted transition-shadow duration-300 flex flex-col items-center text-center h-full">
      <h3 className="text-2xl font-semibold text-brand-text">{title}</h3>
      <p className="text-brand-secondary mt-2 flex-grow mb-6">{subtitle}</p>
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
  }> = ({ title, subtitle, buttonText, onClick }) => (
    <div 
      className="bg-brand-surface p-8 rounded-xl shadow-subtle hover:shadow-lifted transition-shadow duration-300 flex flex-col md:flex-row items-center text-center md:text-left gap-6 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex-grow">
        <h3 className="text-2xl font-semibold text-brand-text">{title}</h3>
        <p className="text-brand-secondary mt-2">{subtitle}</p>
      </div>
      <button className="bg-brand-accent text-white font-bold py-3 px-8 rounded-lg w-full md:w-auto hover:opacity-90 transition-opacity duration-300 flex-shrink-0">
        {buttonText}
      </button>
    </div>
  );

  return (
    <div className="relative text-center p-6 bg-transparent animate-fade-in-up max-w-4xl mx-auto">
      {/* Banner superior world-class, pill compacta y centrada */}
      {showBanner && (
        <div className="w-full flex justify-center items-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 w-full max-w-lg mx-auto bg-[#F8F6F2] border border-brand-border/10 rounded-full px-6 py-2 shadow-sm" style={{fontFamily:'serif', fontWeight:400, fontSize:'1rem', letterSpacing:'0.01em', lineHeight:'1.22', minHeight:'40px'}}>
            <span className="inline-flex items-center justify-center" style={{width:'22px',height:'22px'}}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="10" rx="3" fill="#F5F3EA" stroke="#A89C94" strokeWidth="1"/><rect x="3" y="8" width="18" height="3" rx="1.5" fill="#A89C94"/><rect x="8" y="4" width="4" height="4" rx="2" fill="#A89C94"/><rect x="12" y="4" width="4" height="4" rx="2" fill="#A89C94"/></svg>
            </span>
            <span className="text-brand-secondary text-base font-light tracking-wide whitespace-nowrap flex items-center justify-center" style={{margin:'0 6px'}}>
              ¿Tienes un Giftcard?
            </span>
            {!bannerExpanded && (
              <button
                className="bg-brand-primary text-white rounded-full px-5 py-1.5 font-serif font-medium hover:bg-brand-primary/90 transition-colors text-base flex items-center justify-center"
                onClick={handleBannerExpand}
                aria-label="Redimir Giftcard"
                style={{height:'32px', minWidth:'90px', display:'flex', alignItems:'center', justifyContent:'center'}}
              >Redimir</button>
            )}
            {bannerExpanded && (
              <>
                <input
                  type="text"
                  className="ml-3 px-3 py-1.5 rounded-md border border-brand-border/15 bg-white text-brand-primary font-mono text-base w-32 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all duration-300 flex-shrink"
                  placeholder="GIF-XXXXXX"
                  value={bannerCode}
                  onChange={e => setBannerCode(e.target.value)}
                  autoFocus
                  style={{height:'32px'}}
                  disabled={bannerLoading}
                />
                <button
                  className={`ml-3 bg-brand-primary/80 text-white rounded-full px-5 py-1.5 font-serif font-medium hover:bg-brand-primary transition-colors text-base shadow-sm flex items-center justify-center ${bannerLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  onClick={handleBannerRedeem}
                  aria-label="Redimir"
                  style={{height:'32px', minWidth:'90px', display:'flex', alignItems:'center', justifyContent:'center'}}
                  disabled={bannerLoading}
                >{bannerLoading ? 'Redimiendo...' : 'Redimir'}</button>
                <button
                  className="ml-2 text-brand-secondary bg-white/40 rounded-full p-1 hover:bg-brand-primary/10 transition-colors flex items-center justify-center"
                  aria-label="Cerrar"
                  onClick={() => setShowBanner(false)}
                  style={{height:'32px',width:'32px'}}
                  disabled={bannerLoading}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="#A89C94" strokeWidth="1" strokeLinecap="round"/></svg>
                </button>
              </>
            )}
            {bannerExpanded && bannerError && <div className="text-red-500 text-xs ml-2 animate-fade-in">{bannerError}</div>}
            {bannerSuccess && <div className="text-green-600 text-xs ml-2 animate-fade-in font-semibold">{bannerSuccess}</div>}
          </div>
        </div>
      )}
      <h2 className="text-3xl font-serif font-bold text-brand-text mb-2 mt-24">Bienvenido a Ceramicalma</h2>
      <p className="text-brand-secondary mb-10">¿Es tu primera vez con nosotros?</p>
      <div className="grid md:grid-cols-2 gap-8">
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
      </div>
      <div className="mt-8 space-y-8">
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