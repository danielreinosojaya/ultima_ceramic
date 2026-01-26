import React, { useState } from "react";
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface GiftcardAmountSelectorProps {
  min?: number;
  max?: number;
  onSelect: (amount: number) => void;
}

interface Product {
  name: string;
  price: number;
  emoji: string;
}

// Catálogo de productos de ÚLTIMA CERAMIC
const PRODUCTS: Product[] = [
  { name: "Clase de Modelado a Mano", price: 45, emoji: "🤚" },
  { name: "Clase de Torno", price: 55, emoji: "🎡" },
  { name: "Paquete 4 Clases", price: 180, emoji: "📦" },
  { name: "Paquete 8 Clases", price: 330, emoji: "📦" },
  { name: "Paquete 12 Clases", price: 470, emoji: "📦" },
];

const SUGGESTED_AMOUNTS = [45, 55, 180, 330];

export const GiftcardAmountSelector: React.FC<GiftcardAmountSelectorProps> = ({ min = 10, max = 500, onSelect }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showPriceGuide, setShowPriceGuide] = useState(false);

  // Función que genera recomendaciones basadas en el monto
  const getRecommendation = (amount: number): string => {
    const exactMatches = PRODUCTS.filter(p => Math.abs(p.price - amount) < 5);
    const canAfford = PRODUCTS.filter(p => p.price <= amount && !exactMatches.includes(p));
    const contributions = PRODUCTS.filter(p => p.price > amount && amount >= p.price * 0.3);
    
    if (exactMatches.length > 0) {
      return `${exactMatches[0].emoji} Perfecto para: ${exactMatches[0].name}`;
    } else if (canAfford.length > 0) {
      const best = canAfford.sort((a, b) => b.price - a.price)[0];
      return `✓ Puede elegir: ${best.name} ($${best.price})`;
    } else if (contributions.length > 0) {
      return `💡 Puede contribuir a: ${contributions[0].name}`;
    } else {
      return `💰 Disponible para experiencias grupales`;
    }
  };

  // Badges para botones de monto sugerido
  const getBadgeText = (amount: number): string => {
    const badges: Record<number, string> = {
      45: "🤚 Clase Modelado",
      55: "🎡 Clase Torno",
      180: "📦 Paquete 4",
      330: "📦 Paquete 8",
    };
    return badges[amount] || "";
  };

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
    <section className="w-full max-w-3xl mx-auto p-6 sm:p-8 bg-white rounded-xl shadow-lifted border border-brand-border animate-fade-in-up">
      <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2 text-center">¿Cuánto quieres regalar?</h2>
      <p className="text-sm text-brand-secondary mb-6 text-center">💡 Elige según la experiencia que quieres regalar</p>
      
      {/* Botones de monto sugerido con badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 w-full max-w-2xl mx-auto">
        {SUGGESTED_AMOUNTS.map(a => {
          const badge = getBadgeText(a);
          return (
            <button
              key={a}
              type="button"
              className={`flex flex-col items-center justify-center p-4 rounded-xl font-semibold border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                selected === a 
                  ? 'bg-brand-primary text-white border-brand-primary shadow-lg scale-105' 
                  : 'bg-white text-brand-primary border-brand-border hover:bg-brand-primary/10 hover:border-brand-primary/50'
              }`}
              onClick={() => handleSelect(a)}
            >
              <span className="text-2xl font-bold mb-1">${a}</span>
              {badge && (
                <span className="text-xs leading-tight text-center opacity-90">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Monto personalizado */}
      <div className="w-full max-w-md mx-auto mb-4">
        <label htmlFor="customAmount" className="block text-brand-secondary mb-2 text-sm font-semibold">
          💰 Valor personalizado
        </label>
        <input
          id="customAmount"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={`w-full px-4 py-3 rounded-lg border-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors ${
            custom ? (!error ? 'border-brand-primary' : 'border-red-400') : 'border-brand-border'
          }`}
          placeholder={`Mínimo $${min}, máximo $${max}`}
          value={custom}
          onChange={handleCustomChange}
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        
        {/* Recomendación dinámica para monto custom */}
        {custom && !error && Number(custom) >= min && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium">
              {getRecommendation(Number(custom))}
            </p>
          </div>
        )}
      </div>

      {/* Botón para ver guía completa */}
      <button
        type="button"
        onClick={() => setShowPriceGuide(true)}
        className="text-sm text-brand-primary hover:text-brand-accent font-semibold mb-6 flex items-center gap-2 transition-colors"
      >
        <InformationCircleIcon className="h-5 w-5" />
        Ver guía completa de precios
      </button>

      {/* Botón continuar */}
      <button
        type="button"
        className={`bg-brand-primary text-white font-semibold py-3 px-8 rounded-full shadow-lg hover:bg-brand-accent transition-all duration-200 text-base tracking-wide w-full max-w-md ${
          !isValid ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
        }`}
        disabled={!isValid}
        onClick={() => amount && onSelect(amount)}
      >
        Continuar con ${amount || 0}
      </button>

      {/* Modal de guía de precios */}
      {showPriceGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPriceGuide(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-brand-primary">📚 Guía de Precios</h3>
              <button
                onClick={() => setShowPriceGuide(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-brand-secondary mb-6">
              Estos son nuestros productos y experiencias disponibles:
            </p>
            <div className="space-y-3">
              {PRODUCTS.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{product.emoji}</span>
                    <span className="text-sm font-medium text-brand-text">{product.name}</span>
                  </div>
                  <span className="text-lg font-bold text-brand-primary">${product.price}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-900">
                <strong>💡 Tip:</strong> Las giftcards tienen <strong>3 meses de validez</strong> desde su emisión.
              </p>
            </div>
            <button
              onClick={() => setShowPriceGuide(false)}
              className="w-full mt-4 bg-brand-primary text-white font-semibold py-3 rounded-full hover:bg-brand-accent transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
