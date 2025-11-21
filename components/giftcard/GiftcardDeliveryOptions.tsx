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
];

export const GiftcardDeliveryOptions: React.FC<{ onSelect: (id: string, data?: any) => void; onBack?: () => void }> = ({ onSelect, onBack }) => {
  const [selected, setSelected] = useState<string>('email');
  const [inputData, setInputData] = useState<any>({ scheduled: false });

  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMinTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 w-full max-w-xl mx-auto justify-items-center">
        {deliveryOptions.map(opt => {
          return (
            <div key={opt.id} className="relative w-full max-w-xs">
              <button
                type="button"
                className={`flex flex-col items-center gap-2 px-8 py-8 rounded-2xl border-2 transition-all duration-150 focus:outline-none shadow-sm w-full ${
                  selected === opt.id
                    ? 'border-brand-primary bg-brand-primary/10 scale-105'
                    : 'border-brand-border bg-white hover:border-brand-primary'
                }`}
                onClick={() => {
                  setSelected(opt.id);
                  setInputData({ scheduled: false });
                }}
                aria-label={opt.label}
              >
                <span className="mb-1">{React.cloneElement(opt.icon, { width: 40, height: 40 })}</span>
                <span className="text-base font-semibold text-brand-secondary text-center whitespace-normal leading-tight">{opt.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Formulario dinámico según método de entrega */}
      <div className="w-full max-w-md mx-auto mb-6 space-y-4">
        {/* Dato del destinatario (email o teléfono) */}
        {selected === 'email' && (
          <input
            type="email"
            className="w-full px-4 py-2 rounded-lg border border-brand-border text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="Correo electrónico del destinatario"
            value={inputData.email || ''}
            onChange={e => setInputData({ ...inputData, email: e.target.value })}
            required
          />
        )}
        {selected === 'whatsapp' && (
          <input
            type="tel"
            className="w-full px-4 py-2 rounded-lg border border-brand-border text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="+593 98 123 4567"
            value={inputData.phone || ''}
            onChange={e => setInputData({ ...inputData, phone: e.target.value })}
            required
          />
        )}

        {/* Checkbox para programar */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={inputData.scheduled || false}
            onChange={e => setInputData({ ...inputData, scheduled: e.target.checked })}
            className="w-5 h-5 accent-brand-primary"
          />
          <span className="text-brand-secondary font-semibold">Programar envío</span>
        </label>

        {/* Fecha y hora si está programado */}
        {inputData.scheduled && (
          <div className="space-y-3 p-4 bg-brand-primary/5 rounded-lg border border-brand-primary/20">
            <div>
              <label className="block text-sm font-semibold text-brand-secondary mb-2">Fecha de envío</label>
              <input
                type="date"
                className="w-full px-4 py-2 rounded-lg border border-brand-border text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                value={inputData.sendDate || getTomorrow()}
                onChange={e => setInputData({ ...inputData, sendDate: e.target.value })}
                min={getTomorrow()}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-secondary mb-2">Hora de envío</label>
              <input
                type="time"
                className="w-full px-4 py-2 rounded-lg border border-brand-border text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                value={inputData.sendTime || '09:00'}
                onChange={e => setInputData({ ...inputData, sendTime: e.target.value })}
                required
              />
            </div>
          </div>
        )}
      </div>

      <button
        className="w-full max-w-md py-3 rounded-full bg-brand-primary text-white font-bold text-lg shadow-md hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => onSelect(selected, inputData)}
        disabled={
          !inputData.email && !inputData.phone ||
          inputData.scheduled && (!inputData.sendDate || !inputData.sendTime)
        }
      >
        Continuar
      </button>
    </div>
  );
};
