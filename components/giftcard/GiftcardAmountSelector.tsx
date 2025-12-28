import React, { useState } from "react";

interface GiftcardAmountSelectorProps {
  min?: number;
  max?: number;
  onSelect: (amount: number) => void;
}

const SUGGESTED_AMOUNTS = [25, 50, 100, 200];

export const GiftcardAmountSelector: React.FC<GiftcardAmountSelectorProps> = ({ min = 10, max = 500, onSelect }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSelect = (amount: number) => {
    setSelected(amount);
    setCustom("");
    setError("");
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setCustom(value);
    setSelected(null);
    const num = Number(value);
    if (!value) {
      setError("");
    } else if (num < min) {
      setError(`El monto mínimo es $${min}`);
    } else if (num > max) {
      setError(`El monto máximo es $${max}`);
    } else {
      setError("");
    }
  };

  const isValid = selected !== null || (custom && !error && Number(custom) >= min && Number(custom) <= max);
  const amount = selected !== null ? selected : custom ? Number(custom) : null;

  return (
    <section className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-lifted flex flex-col items-center border border-brand-border animate-fade-in-up">
      <h2 className="text-2xl font-bold text-brand-text mb-6 text-center">¿Cuánto quieres regalar?</h2>
      <div className="flex gap-3 mb-6 w-full justify-center">
        {SUGGESTED_AMOUNTS.map(a => (
          <button
            key={a}
            type="button"
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-semibold text-sm sm:text-base md:text-lg border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary ${selected === a ? 'bg-brand-primary text-white border-brand-primary shadow' : 'bg-white text-brand-primary border-brand-border hover:bg-brand-primary/10'}`}
            onClick={() => handleSelect(a)}
          >
            ${a}
          </button>
        ))}
      </div>
      <div className="w-full mb-4">
        <label htmlFor="customAmount" className="block text-brand-secondary mb-2 text-xs sm:text-sm">Monto personalizado</label>
        <input
          id="customAmount"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={`w-full px-4 py-3 rounded-lg border text-sm sm:text-base md:text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors ${custom ? (!error ? 'border-brand-primary' : 'border-red-400') : 'border-brand-border'}`}
          placeholder={`Mínimo $${min}, máximo $${max}`}
          value={custom}
          onChange={handleCustomChange}
        />
        {error && <p className="text-red-500 text-xs sm:text-sm mt-2">{error}</p>}
      </div>
      <button
        type="button"
        className={`mt-4 bg-brand-primary text-white font-semibold py-3 sm:py-3.5 px-6 sm:px-7 rounded-full shadow hover:bg-brand-accent transition-colors duration-200 text-sm sm:text-base md:text-lg tracking-wide w-full h-12 sm:h-13 ${!isValid ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={!isValid}
        onClick={() => amount && onSelect(amount)}
      >
        Continuar
      </button>
    </section>
  );
};
