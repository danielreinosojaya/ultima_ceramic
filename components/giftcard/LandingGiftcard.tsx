import React from "react";
import { GiftIcon } from "../icons/GiftIcon";

interface LandingGiftcardProps {
  onStart: () => void;
}

export const LandingGiftcard: React.FC<LandingGiftcardProps> = ({ onStart }) => (
  <section className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow-lifted animate-fade-in-up flex flex-col items-center border border-brand-border">
  <GiftIcon className="w-20 h-20 text-brand-primary mb-4" />
    <h1 className="text-3xl font-bold text-brand-text mb-2 text-center">Regala experiencias únicas</h1>
    <p className="text-brand-secondary text-lg text-center mb-8">
      Sorprende a alguien especial con una Giftcard personalizada. Elige el monto, el diseño y agrega tu mensaje personal.
    </p>
    <button
      onClick={onStart}
      className="bg-brand-primary text-white font-semibold py-2.5 px-7 rounded-full shadow hover:bg-brand-accent transition-colors duration-200 text-lg tracking-wide"
      style={{ boxShadow: '0 2px 8px 0 rgba(60, 60, 60, 0.08)' }}
    >
      Crear Giftcard
    </button>
  </section>
);
