import React from 'react';

export const GiftcardRedemption: React.FC<{
  code: string;
  onRedeem: (code: string) => void;
  onBack?: () => void;
}> = ({ code, onRedeem, onBack }) => {
  const [inputCode, setInputCode] = React.useState(code || '');
  const [error, setError] = React.useState('');

  const handleRedeem = () => {
    if (!inputCode.trim()) {
      setError('Por favor ingresa el código de la giftcard.');
      return;
    }
    setError('');
    onRedeem(inputCode.trim());
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center p-10 bg-white rounded-3xl shadow-2xl border border-brand-border">
      <button
        className="self-start mb-4 px-4 py-2 rounded-full bg-brand-border text-brand-primary font-semibold shadow hover:bg-brand-primary/10 transition-colors"
        onClick={onBack}
      >
        ← Atrás
      </button>
      <h2 className="text-2xl font-display font-bold mb-6 text-brand-primary text-center tracking-wide">Redimir Giftcard</h2>
      <div className="w-full mb-6 flex flex-col gap-2 items-center">
        <span className="text-brand-secondary text-lg">Ingresa el código único de tu giftcard para redimirla.</span>
        <input
          type="text"
          className="w-full px-4 py-2 rounded-lg border border-brand-border text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary mt-4 text-center text-lg font-mono"
          placeholder="Ej: GIF-XXXXXX"
          value={inputCode}
          onChange={e => setInputCode(e.target.value)}
        />
        {error && <span className="text-red-500 text-sm mt-2">{error}</span>}
      </div>
      <button
        className="w-full py-3 rounded-full bg-brand-primary text-white font-bold text-lg shadow-md hover:bg-brand-primary/90 transition-colors"
        onClick={handleRedeem}
      >
        Redimir
      </button>
    </div>
  );
};
