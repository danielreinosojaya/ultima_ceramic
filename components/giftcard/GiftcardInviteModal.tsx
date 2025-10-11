import React from "react";
import { GiftIcon } from "../icons/GiftIcon";

interface GiftcardInviteModalProps {
  open: boolean;
  onClose: () => void;
  onCTA: () => void;
}

export const GiftcardInviteModal: React.FC<GiftcardInviteModalProps> = ({ open, onClose, onCTA }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background: 'rgba(60, 60, 60, 0.25)', backdropFilter: 'blur(2px)'}}>
      <div className="bg-white/95 rounded-xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center border border-brand-border animate-fade-in-up" style={{boxShadow: '0 8px 32px 0 rgba(60,60,60,0.18)'}}>
        <GiftIcon className="w-14 h-14 text-brand-primary mb-3 animate-bounce-slow" />
        <h2 className="text-2xl font-bold text-brand-text mb-2 text-center">Regala momentos inolvidables</h2>
        <p className="text-brand-secondary text-center mb-6 text-lg">
          Sorprende a alguien especial con una Giftcard personalizada de cerámica. Elige el monto, personaliza el mensaje y haz que su día sea único.
        </p>
        <button
          onClick={onCTA}
          className="bg-brand-primary text-white font-semibold py-2.5 px-7 rounded-full shadow hover:bg-brand-accent transition-colors duration-200 text-lg tracking-wide mb-2"
        >
          Regalar Giftcard
        </button>
        <button
          onClick={onClose}
          className="text-brand-secondary text-sm mt-2 hover:underline"
        >
          No, gracias
        </button>
      </div>
    </div>
  );
};
