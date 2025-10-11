import React from 'react';

export const GiftcardPendingReview: React.FC<{ onFinish: () => void }> = ({ onFinish }) => (
  <div className="w-full max-w-lg mx-auto flex flex-col items-center p-10 bg-white rounded-3xl shadow-2xl border border-brand-border">
    <h2 className="text-2xl font-display font-bold mb-6 text-brand-primary text-center tracking-wide">Pago en revisión</h2>
    <div className="w-full mb-6 flex flex-col gap-2 items-center">
      <span className="text-brand-secondary text-lg text-center">Tu pago está siendo revisado por nuestro equipo.</span>
      <span className="text-brand-secondary text-lg text-center">Recibirás una notificación por email o WhatsApp cuando tu giftcard esté activa y enviada al destinatario.</span>
      <span className="text-brand-primary font-semibold text-center mt-4">Estado: <span className="text-yellow-600">Pendiente de confirmación</span></span>
    </div>
    <button
      className="w-full py-3 rounded-full bg-brand-primary text-white font-bold text-lg shadow-md hover:bg-brand-primary/90 transition-colors"
      onClick={onFinish}
    >
      Finalizar
    </button>
  </div>
);