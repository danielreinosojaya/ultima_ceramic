import React from "react";
import { GiftIcon } from "../icons/GiftIcon";

interface LandingGiftcardProps {
  onStart: () => void;
  onRedeem?: () => void;
}

export const LandingGiftcard: React.FC<LandingGiftcardProps> = ({ onStart, onRedeem }) => (
  <div className="relative w-full">
    {/* Banner flotante para redimir */}
    <div className="absolute left-1/2 -translate-x-1/2 top-0 z-20 w-full max-w-md px-6 pt-6">
      <div className="backdrop-blur-lg bg-white/60 rounded-2xl shadow-xl flex items-center gap-4 px-6 py-4 border border-brand-border animate-fade-in-up">
        <span className="inline-block bg-brand-primary/10 rounded-full p-2">
          {/* Icono QR minimalista */}
          <svg width="32" height="32" fill="none" viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="20" rx="6" fill="#F5F3EA" stroke="#A89C94" strokeWidth="2"/><rect x="10" y="10" width="4" height="4" rx="1" fill="#A89C94"/><rect x="18" y="10" width="4" height="4" rx="1" fill="#A89C94"/><rect x="10" y="18" width="4" height="4" rx="1" fill="#A89C94"/><rect x="18" y="18" width="4" height="4" rx="1" fill="#A89C94"/></svg>
        </span>
        <button
          onClick={onRedeem}
          className="bg-brand-primary/80 text-white font-semibold py-2 px-6 rounded-full shadow hover:bg-brand-primary transition-colors duration-200 text-lg tracking-wide"
          style={{ boxShadow: '0 2px 8px 0 rgba(60, 60, 60, 0.08)' }}
        >
          Redimir Giftcard
        </button>
      </div>
    </div>
    <section className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow-lifted animate-fade-in-up flex flex-col items-center border border-brand-border mt-24">
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
  </div>
);
