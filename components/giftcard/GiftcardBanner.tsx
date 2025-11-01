import React from "react";
import { GiftIcon } from "../icons/GiftIcon";

interface GiftcardBannerProps {
  open: boolean;
  onClose: () => void;
  onCTA: () => void;
}

export const GiftcardBanner: React.FC<GiftcardBannerProps> = ({ open, onClose, onCTA }) => {
  if (!open) return null;
  return (
    <div className="mb-8 md:mb-10 animate-fade-in-up">
      {/* Gradient background container */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary/10 via-brand-primary/5 to-transparent border border-brand-primary/20 shadow-subtle hover:shadow-lifted transition-all duration-300">
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-accent/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        {/* Content */}
        <div className="relative px-6 sm:px-8 py-6 sm:py-8 md:py-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8">
            
            {/* Left: Icon + Text */}
            <div className="flex items-start gap-4 md:gap-5 flex-1">
              <div className="flex-shrink-0 p-3 bg-white rounded-full shadow-sm border border-brand-primary/10">
                <GiftIcon className="w-6 h-6 md:w-7 md:h-7 text-brand-primary" />
              </div>
              <div className="pt-1">
                <h3 className="text-lg md:text-xl font-semibold text-brand-text leading-tight mb-1">
                  ¿Buscas un regalo especial?
                </h3>
                <p className="text-sm md:text-base text-brand-secondary leading-relaxed">
                  Regala una Giftcard personalizada. Elige el monto, personaliza el mensaje y sorprende.
                </p>
              </div>
            </div>

            {/* Right: CTA Buttons */}
            <div className="flex gap-3 flex-shrink-0 md:ml-6">
              <button
                onClick={onCTA}
                className="flex-1 md:flex-none px-6 md:px-8 py-3 md:py-2.5 bg-brand-primary text-white font-semibold rounded-lg text-sm md:text-base shadow-subtle hover:shadow-lifted hover:bg-brand-secondary transition-all duration-200 whitespace-nowrap"
              >
                Regalar
              </button>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-2.5 text-brand-secondary hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all duration-200"
                aria-label="Cerrar banner"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
