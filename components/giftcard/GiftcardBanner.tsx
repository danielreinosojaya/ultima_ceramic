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
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-11/12 sm:w-full sm:max-w-md px-0 sm:px-4 animate-fade-in-up">
      <div className="bg-white/95 border border-brand-border shadow-lg rounded-lg sm:rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 sm:px-5 py-3 sm:py-3">
        <GiftIcon className="w-6 sm:w-7 h-6 sm:h-7 text-brand-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-brand-text font-semibold text-sm sm:text-base block">¿Buscas un regalo especial?</span>
          <span className="block text-brand-secondary text-xs sm:text-sm leading-tight">Regala una Giftcard personalizada.</span>
        </div>
        <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
          <button
            onClick={onCTA}
            className="flex-1 sm:flex-none bg-brand-primary text-white font-semibold px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm shadow hover:bg-brand-accent transition-colors whitespace-nowrap"
          >
            Regalar
          </button>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-brand-secondary text-lg hover:text-brand-primary transition-colors font-bold"
            aria-label="Cerrar banner"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};
