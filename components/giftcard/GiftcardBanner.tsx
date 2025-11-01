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
    <div className="w-full bg-brand-background/50 backdrop-blur-sm border-b border-brand-border/30 px-3 sm:px-4 py-3 sm:py-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md border border-brand-border/50 flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 hover:shadow-lg transition-shadow">
          <GiftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary flex-shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 min-w-0">
            <span className="text-brand-text font-semibold text-sm sm:text-base block">¿Buscas un regalo especial?</span>
            <span className="block text-brand-secondary text-xs sm:text-sm">Regala una Giftcard personalizada.</span>
          </div>
          <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
            <button
              onClick={onCTA}
              className="flex-1 sm:flex-none bg-brand-primary text-white font-semibold px-4 py-2 rounded-lg text-xs sm:text-sm shadow-sm hover:bg-brand-secondary transition-colors whitespace-nowrap"
            >
              Regalar
            </button>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-brand-secondary hover:text-brand-primary transition-colors p-1 -m-1"
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
  );
};
