import React, { useState } from 'react';

const deliveryOptions = [
  {
    id: 'email',
    label: 'Email',
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 32 32">
        <rect x="4" y="8" width="24" height="16" rx="4" fill="#F5F3EA" stroke="#A89C94" strokeWidth="2" />
        <path d="M4 8l12 10L28 8" stroke="#A89C94" strokeWidth="2" fill="none" />
      </svg>
    ),
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="#E3F5EA" stroke="#A89C94" strokeWidth="2" />
        <path d="M10 13c1 3 4 6 7 7l2-2c.5-.5 1.5-.5 2 0l2 2c.5.5.5 1.5 0 2l-2 2c-3 1-7-2-10-5s-6-7-5-10l2-2c.5-.5 1.5-.5 2 0l2 2c.5.5.5 1.5 0 2l-2 2z" stroke="#A89C94" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    id: 'schedule',
    label: 'Programar fecha',
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 32 32">
        <rect x="6" y="8" width="20" height="18" rx="4" fill="#F5E3E3" stroke="#A89C94" strokeWidth="2" />
        <rect x="10" y="14" width="12" height="8" rx="2" fill="#F5F3EA" stroke="#A89C94" strokeWidth="1.5" />
        <circle cx="16" cy="18" r="2" fill="#A89C94" />
      </svg>
    ),
  },
];

export const GiftcardDeliveryOptions: React.FC<{ onSelect: (id: string, data?: any) => void; onBack?: () => void }> = ({ onSelect, onBack }) => {
  const [selected, setSelected] = useState<string>('email');
  const [inputData, setInputData] = useState<any>({});

  return (
    <div className="w-full flex flex-col items-center">
      <button
        className="self-start mb-4 px-4 py-2 rounded-full bg-brand-border text-brand-primary font-semibold shadow hover:bg-brand-primary/10 transition-colors"
        onClick={() => { if (typeof onBack === 'function') onBack(); }}
        disabled={!onBack}
      >
        ← Atrás
      </button>
      <h2 className="text-lg font-bold mb-6 text-brand-primary">¿Cómo quieres entregar la giftcard?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8 w-full max-w-xl mx-auto justify-items-center">
        {deliveryOptions.map(opt => {
          const isDisabled = opt.id === 'whatsapp' || opt.id === 'schedule';
          return (
            <div key={opt.id} className="relative w-full max-w-xs">
              <button
                type="button"
                className={`flex flex-col items-center gap-2 px-8 py-8 rounded-2xl border-2 transition-all duration-150 focus:outline-none shadow-sm w-full ${
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed border-brand-border bg-brand-border/20'
                    : selected === opt.id
                    ? 'border-brand-primary bg-brand-primary/10 scale-105'
                    : 'border-brand-border bg-white hover:border-brand-primary'
                }`}
                onClick={() => {
                  if (!isDisabled) {
                    setSelected(opt.id);
                  }
                }}
                disabled={isDisabled}
                aria-label={opt.label}
              >
                <span className="mb-1">{React.cloneElement(opt.icon, { width: 40, height: 40 })}</span>
                <span className="text-base font-semibold text-brand-secondary text-center whitespace-normal leading-tight">{opt.label}</span>
              </button>
              {isDisabled && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-brand-secondary text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap">
                  Muy pronto
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Formulario dinámico según método de entrega */}
      <div className="w-full max-w-md mx-auto mb-6">
        {selected === 'email' && (
          <input
            type="email"
            className="w-full px-4 py-2 rounded-lg border border-brand-border mb-2 text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="Correo electrónico del destinatario"
            value={inputData.email || ''}
            onChange={e => setInputData({ ...inputData, email: e.target.value })}
            required
          />
        )}
      </div>
      <button
        className="w-full max-w-md py-3 rounded-full bg-brand-primary text-white font-bold text-lg shadow-md hover:bg-brand-primary/90 transition-colors"
        onClick={() => onSelect(selected, inputData)}
      >
        Continuar
      </button>
    </div>
  );
};
