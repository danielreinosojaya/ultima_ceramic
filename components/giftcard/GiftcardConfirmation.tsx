import React from 'react';

type DeliveryMethod = { type: string; data?: any };

export const GiftcardConfirmation: React.FC<{ personalization: any; amount: number; deliveryMethod: DeliveryMethod; onFinish: () => void; onBack?: () => void }> = ({ personalization, amount, deliveryMethod, onFinish, onBack }) => {
  // ...existing code...
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center p-10 bg-white rounded-3xl shadow-2xl border border-brand-border">
      <button
        className="self-start mb-4 px-4 py-2 rounded-full bg-brand-border text-brand-primary font-semibold shadow hover:bg-brand-primary/10 transition-colors"
        onClick={onBack}
      >
        ← Atrás
      </button>
      <h2 className="text-2xl font-display font-bold mb-6 text-brand-primary text-center tracking-wide">¡Giftcard enviada!</h2>
      <div className="w-full mb-6 flex flex-col gap-2 items-center">
        <span className="text-brand-secondary text-lg">Para: <span className="font-bold text-brand-primary">{personalization?.recipient}</span></span>
        <span className="text-brand-secondary text-lg">De: <span className="font-bold text-brand-primary">{personalization?.sender}</span></span>
        {personalization?.message && <span className="text-brand-secondary text-lg">Mensaje: <span className="font-bold text-brand-primary">{personalization.message}</span></span>}
        <span className="text-brand-secondary text-lg">Monto: <span className="font-bold text-brand-primary">${amount}</span></span>
        <span className="text-brand-secondary text-lg">Método de entrega: <span className="font-bold text-brand-primary">
          {deliveryMethod?.type}
          {deliveryMethod?.data?.whatsapp && (
            <span className="ml-2 text-xs text-brand-primary">({deliveryMethod.data.whatsapp})</span>
          )}
          {deliveryMethod?.data?.email && (
            <span className="ml-2 text-xs text-brand-primary">({deliveryMethod.data.email})</span>
          )}
          {deliveryMethod?.data?.date && (
            <span className="ml-2 text-xs text-brand-primary">({deliveryMethod.data.date})</span>
          )}
        </span></span>
      </div>
      <div className="w-full flex flex-col items-center gap-2 mb-4">
        <span className="text-brand-primary font-semibold">Tu giftcard ha sido enviada correctamente.</span>
        <span className="text-brand-secondary text-sm">El destinatario recibirá las instrucciones para redimirla.</span>
      </div>
      <button
        className="w-full py-3 rounded-full bg-brand-primary text-white font-bold text-lg shadow-md hover:bg-brand-primary/90 transition-colors"
        onClick={onFinish}
      >
        Finalizar
      </button>
    </div>
  );
};
