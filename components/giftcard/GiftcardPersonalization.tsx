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
  // Opciones de color de fondo
  const bgColors = [
    { id: 'beige', label: 'Beige', color: '#F5F3EA' },
    { id: 'rosa', label: 'Rosa', color: '#F5E3E3' },
    { id: 'azul', label: 'Azul', color: '#D6E3F3' },
    { id: 'gris', label: 'Gris', color: '#E9E6E2' },
    { id: 'verde', label: 'Verde', color: '#E3F5EA' },
  ];
  const [selectedBg, setSelectedBg] = useState(bgColors[0].id);
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

  // Vista previa visual
  // Colores y estilos personalizados
  const bgColor = bgColors.find(b => b.id === selectedBg)?.color || '#F5F3EA';
  const textColor = '#A89C94';
  const borderColor = '#B6B6B6';
  const fontDisplay = 'Luckiest Guy, Cooper Black, Bungee, Arial Black, sans-serif';

  return (
    <form className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lifted flex flex-col items-center border border-brand-border animate-fade-in-up" onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold text-brand-text mb-4 text-center">Personaliza tu Giftcard</h2>
      <div className="w-full grid grid-cols-1 gap-4 mb-4">
        <div>
          <label className="block text-brand-secondary mb-2 text-sm">Para (destinatario)</label>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg border text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary border-brand-border"
            placeholder="Nombre del destinatario"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-brand-secondary mb-2 text-sm">Mensaje personalizado</label>
          <textarea
            className="w-full px-4 py-2 rounded-lg border text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary border-brand-border resize-none"
            placeholder="Escribe tu mensaje especial"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
          />
        </div>
        <div>
          <label className="block text-brand-secondary mb-2 text-sm">De (remitente)</label>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg border text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary border-brand-border"
            placeholder="Tu nombre"
            value={sender}
            onChange={e => setSender(e.target.value)}
          />
        </div>
      </div>
      <div className="w-full mb-4">
      {/* Selector visual de color de fondo */}
      <div className="w-full mb-6">
        <label className="block text-brand-secondary mb-2 text-sm">Elige el color de fondo</label>
        <div className="flex gap-4 justify-center">
          {bgColors.map(bg => (
            <button
              key={bg.id}
              type="button"
              className={`rounded-full border-2 w-10 h-10 transition-all duration-150 focus:outline-none ${selectedBg === bg.id ? 'border-brand-primary shadow-lg scale-110' : 'border-brand-border hover:border-brand-primary'}`}
              onClick={() => setSelectedBg(bg.id)}
              aria-label={bg.label}
              style={{ background: bg.color }}
            />
          ))}
        </div>
      </div>
        {/* Vista previa visual estilo Ceramicalma */}
        <div className="w-full mb-6 flex flex-col items-center">
          <div
            className="w-full flex flex-col items-center justify-center relative"
            style={{
              background: bgColor,
              borderRadius: '18px',
              border: `2px solid ${borderColor}`,
              width: '100%',
              minHeight: '400px',
              aspectRatio: '16/9',
              maxWidth: '600px',
              padding: '56px 40px 56px 40px',
              boxSizing: 'border-box',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {/* Borde ondulado SVG superior */}
            <svg viewBox="0 0 540 16" width="100%" height="16" style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
              <path d="M0,8 Q60,0 120,8 T240,8 T360,8 Q420,16 420,8" fill="none" stroke={borderColor} strokeWidth="2" />
            </svg>
            <div className="pt-4 pb-2 w-full flex flex-col items-center relative z-10">
              <span
                style={{
                  fontFamily: fontDisplay,
                  color: textColor,
                  fontSize: '2.5rem',
                  letterSpacing: '0.04em',
                  textAlign: 'center',
                  fontWeight: 700,
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  lineHeight: 1.1,
                  marginBottom: '1.2rem',
                }}
              >
                REGALO ESPECIAL
              </span>
              <span className="block text-sm" style={{ color: textColor, fontWeight: 500, maxWidth: '100%', textAlign: 'center', wordBreak: 'break-word', marginBottom: '0.5rem', marginTop: '0.5rem' }}>para:</span>
              <span className="block w-full text-center" style={{ color: textColor, borderBottom: `1px dotted ${borderColor}`, fontSize: '1.3rem', minHeight: '1.7em', maxWidth: '100%', wordBreak: 'break-word', overflowWrap: 'break-word', marginBottom: '0.7rem' }}>{recipient || 'Nombre'}</span>
              <span className="block text-sm" style={{ color: textColor, fontWeight: 500, maxWidth: '100%', textAlign: 'center', wordBreak: 'break-word', marginBottom: '0.5rem', marginTop: '0.5rem' }}>de:</span>
              <span className="block w-full text-center" style={{ color: textColor, borderBottom: `1px dotted ${borderColor}`, fontSize: '1.3rem', minHeight: '1.7em', maxWidth: '100%', wordBreak: 'break-word', overflowWrap: 'break-word', marginBottom: '0.7rem' }}>{sender || 'Tu nombre'}</span>
              <span className="block text-center" style={{ color: textColor, fontSize: '1.2rem', fontWeight: 500, maxWidth: '100%', wordBreak: 'break-word', overflowWrap: 'break-word', marginBottom: '0.7rem', marginTop: '0.7rem' }}>{message || 'Tu mensaje especial aquí'}</span>
              <span className="block text-center" style={{ color: textColor, fontSize: '1.3rem', fontWeight: 700, maxWidth: '100%', wordBreak: 'break-word', overflowWrap: 'break-word', marginBottom: '0.7rem', marginTop: '0.7rem' }}>Monto: ${amount}</span>
            </div>
            {/* Logo y pie */}
            <div className="flex items-center justify-between w-full pt-4 relative z-10">
              <span className="text-xs" style={{ color: textColor }}>@ceramicalma.ec</span>
              <span className="mx-2 text-xs" style={{ color: borderColor }}>|</span>
              <span className="flex items-center gap-2 text-xs font-bold" style={{ color: textColor }}>
                {/* Logo SVG minimalista */}
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="14" cy="14" r="13" stroke={textColor} strokeWidth="2" />
                  <path d="M14 7 Q19 14 14 21 Q9 14 14 7 Z" stroke={textColor} strokeWidth="1.5" fill="none" />
                  <circle cx="14" cy="14" r="2" fill={textColor} />
                </svg>
                CERAMICALMA
              </span>
            </div>
            {/* Borde inferior ondulado SVG */}
            <svg viewBox="0 0 540 16" width="100%" height="16" style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 1 }}>
              <path d="M0,8 Q60,16 120,8 T240,8 T360,8 Q420,0 420,8" fill="none" stroke={borderColor} strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>
      {/* Vista previa visual estilo Ceramicalma */}
      {/* ...existing code... (solo un preview) */}
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      <button
        type="submit"
        className={`mt-2 bg-brand-primary text-white font-semibold py-2.5 px-7 rounded-full shadow hover:bg-brand-accent transition-colors duration-200 text-lg tracking-wide w-full ${!isValid ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={!isValid}
      >
        Continuar
      </button>
    </form>
  );
};
