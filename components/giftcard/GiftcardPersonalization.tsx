import React, { useState } from "react";

interface GiftcardPersonalizationProps {
  amount: number;
  onPersonalize: (data: { recipient: string; message: string; sender: string; theme: string }) => void;
}

const THEMES = [
  { value: "classic", label: "Clásico" },
  { value: "birthday", label: "Cumpleaños" },
  { value: "thankyou", label: "Agradecimiento" },
  { value: "friendship", label: "Amistad" },
];

export const GiftcardPersonalization: React.FC<GiftcardPersonalizationProps> = ({ amount, onPersonalize }) => {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [sender, setSender] = useState("");
  const [theme, setTheme] = useState(THEMES[0].value);
  const [error, setError] = useState("");

  const isValid = recipient.trim() && message.trim() && sender.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError("Completa todos los campos para continuar.");
      return;
    }
    setError("");
    onPersonalize({ recipient, message, sender, theme });
  };

  return (
    <form className="max-w-md mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-lifted flex flex-col items-center border border-brand-border animate-fade-in-up" onSubmit={handleSubmit}>
      <h2 className="text-xl sm:text-2xl font-bold text-brand-text mb-4 text-center">Personaliza tu Giftcard</h2>
      <div className="w-full grid grid-cols-1 gap-4 mb-6">
        <div>
          <label className="block text-brand-secondary mb-2 text-xs sm:text-sm">Para (destinatario)</label>
          <input
            type="text"
            className="w-full px-4 py-3 rounded-lg border text-sm sm:text-base md:text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary border-brand-border"
            placeholder="Nombre del destinatario"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-brand-secondary mb-2 text-xs sm:text-sm">Mensaje personalizado</label>
          <textarea
            className="w-full px-4 py-3 rounded-lg border text-sm sm:text-base md:text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary border-brand-border resize-none"
            placeholder="Escribe tu mensaje especial"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
          />
        </div>
        <div>
          <label className="block text-brand-secondary mb-2 text-xs sm:text-sm">De (remitente)</label>
          <input
            type="text"
            className="w-full px-4 py-3 rounded-lg border text-sm sm:text-base md:text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary border-brand-border"
            placeholder="Tu nombre"
            value={sender}
            onChange={e => setSender(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-xs sm:text-sm mb-4">{error}</p>}
      
      <button
        type="submit"
        className={`bg-brand-primary text-white font-semibold py-3 sm:py-3.5 px-6 sm:px-7 rounded-full shadow hover:bg-brand-accent transition-colors duration-200 text-sm sm:text-base md:text-lg tracking-wide w-full h-12 sm:h-13 ${!isValid ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={!isValid}
      >
        Continuar
      </button>
    </form>
  );
};
