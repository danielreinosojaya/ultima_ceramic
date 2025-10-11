import React from 'react';
// ...existing code...
export const GiftcardPayment: React.FC<{
  amount: number;
  deliveryMethod: { type: string; data?: any };
  personalization: any;
  onPay: () => void;
  onBack?: () => void;
}> = ({ amount, deliveryMethod, personalization, onPay, onBack }) => {
  // Iconos para método de entrega
  const deliveryIcons: Record<string, React.ReactElement> = {
    email: (
      <svg width="24" height="24" fill="none" viewBox="0 0 32 32"><rect x="4" y="8" width="24" height="16" rx="4" fill="#F5F3EA" stroke="#A89C94" strokeWidth="2" /><path d="M4 8l12 10L28 8" stroke="#A89C94" strokeWidth="2" fill="none" /></svg>
    ),
    whatsapp: (
      <svg width="24" height="24" fill="none" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#E3F5EA" stroke="#A89C94" strokeWidth="2" /><path d="M10 13c1 3 4 6 7 7l2-2c.5-.5 1.5-.5 2 0l2 2c.5.5.5 1.5 0 2l-2 2c-3 1-7-2-10-5s-6-7-5-10l2-2c.5-.5 1.5-.5 2 0l2 2c.5.5.5 1.5 0 2l-2 2z" stroke="#A89C94" strokeWidth="1.5" fill="none" /></svg>
    ),
    print: (
      <svg width="24" height="24" fill="none" viewBox="0 0 32 32"><rect x="8" y="12" width="16" height="12" rx="2" fill="#D6E3F3" stroke="#A89C94" strokeWidth="2" /><rect x="10" y="20" width="12" height="4" rx="1" fill="#F5F3EA" stroke="#A89C94" strokeWidth="1.5" /><rect x="10" y="6" width="12" height="6" rx="1" fill="#F5F3EA" stroke="#A89C94" strokeWidth="1.5" /></svg>
    ),
    schedule: (
      <svg width="24" height="24" fill="none" viewBox="0 0 32 32"><rect x="6" y="8" width="20" height="18" rx="4" fill="#F5E3E3" stroke="#A89C94" strokeWidth="2" /><rect x="10" y="14" width="12" height="8" rx="2" fill="#F5F3EA" stroke="#A89C94" strokeWidth="1.5" /><circle cx="16" cy="18" r="2" fill="#A89C94" /></svg>
    ),
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center p-10 bg-white rounded-3xl shadow-2xl border border-brand-border">
      <button
        className="self-start mb-4 px-4 py-2 rounded-full bg-brand-border text-brand-primary font-semibold shadow hover:bg-brand-primary/10 transition-colors"
        onClick={onBack}
      >
        ← Atrás
      </button>
      <h2 className="text-3xl font-display font-bold mb-6 text-brand-primary text-center tracking-wide">Resumen y pago</h2>
      <div className="w-full mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg text-brand-secondary font-semibold">Monto:</span>
          <span className="font-bold text-2xl text-brand-primary">${amount}</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg text-brand-secondary font-semibold">Método de entrega:</span>
          <span className="flex items-center gap-2 font-bold text-brand-secondary text-lg">
            {deliveryIcons[deliveryMethod?.type]}
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
          </span>
        </div>
        <hr className="my-4 border-brand-border" />
        <div className="bg-brand-background rounded-xl p-4 flex flex-col gap-2">
          <span className="text-brand-secondary text-base">Para: <span className="font-bold text-brand-primary">{personalization?.recipient}</span></span>
          <span className="text-brand-secondary text-base">De: <span className="font-bold text-brand-primary">{personalization?.sender}</span></span>
          {personalization?.message && <span className="text-brand-secondary text-base">Mensaje: <span className="font-bold text-brand-primary">{personalization.message}</span></span>}
        </div>
      </div>
      <button
        className="w-full py-4 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-display font-bold text-xl shadow-lg hover:scale-105 hover:from-brand-secondary hover:to-brand-primary transition-all duration-200"
        onClick={onPay}
      >
        Pagar y enviar giftcard
      </button>
    </div>
  );
};
