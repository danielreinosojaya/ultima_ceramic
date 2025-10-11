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
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-md px-4 animate-fade-in-up">
      <div className="bg-white/95 border border-brand-border shadow-lg rounded-xl flex items-center gap-3 px-5 py-3">
        <GiftIcon className="w-7 h-7 text-brand-primary flex-shrink-0" />
        <div className="flex-1">
          <span className="text-brand-text font-semibold">¿Buscas un regalo especial?</span>
          <span className="block text-brand-secondary text-sm">Regala una Giftcard personalizada de cerámica.</span>
        </div>
        <button
          onClick={onCTA}
          className="bg-brand-primary text-white font-semibold px-4 py-1.5 rounded-full text-sm shadow hover:bg-brand-accent transition-colors"
        >
          Regalar
        </button>
        <button
          onClick={onClose}
          className="ml-2 text-brand-secondary text-lg hover:text-brand-primary transition-colors"
          aria-label="Cerrar banner"
        >
          ×
        </button>
      </div>
    </div>
  );
};
