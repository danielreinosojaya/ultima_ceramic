import React from "react";
import { GiftIcon } from "../icons/GiftIcon";

interface LandingGiftcardProps {
  onStart: () => void;
  onCheckBalance: () => void;
}

export const LandingGiftcard: React.FC<LandingGiftcardProps> = ({ onStart, onCheckBalance }) => (
  <section className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8 bg-white rounded-xl shadow-lifted animate-fade-in-up flex flex-col items-center border border-brand-border mx-4">
  <GiftIcon className="w-20 h-20 text-brand-primary mb-4" />
    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-text mb-2 text-center">Regala experiencias únicas</h1>
    <p className="text-brand-secondary text-xs sm:text-sm md:text-lg text-center mb-8">
      Sorprende a alguien especial con una Giftcard personalizada. Elige el monto y agrega tu mensaje personal.
    </p>
    <div className="flex gap-4 flex-col sm:flex-row w-full sm:w-auto">
      <button
        onClick={onStart}
        className="bg-brand-primary text-white font-semibold py-3 sm:py-3.5 px-6 sm:px-7 rounded-full shadow hover:bg-brand-accent transition-colors duration-200 text-sm sm:text-base md:text-lg tracking-wide flex-1 sm:flex-none h-12 sm:h-13"
        style={{ boxShadow: '0 2px 8px 0 rgba(60, 60, 60, 0.08)' }}
      >
        Crear Giftcard
      </button>
      <button
        onClick={onCheckBalance}
        className="border border-brand-primary text-brand-primary font-semibold py-2.5 px-7 rounded-full shadow hover:bg-brand-primary/10 transition-colors duration-200 text-lg tracking-wide flex-1 sm:flex-none"
        style={{ boxShadow: '0 2px 8px 0 rgba(60, 60, 60, 0.08)' }}
      >
        Consultar Saldo
      </button>
    </div>
  </section>
);
