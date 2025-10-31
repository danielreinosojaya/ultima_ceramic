import React, { useState } from 'react';
import { GiftIcon } from '../icons/GiftIcon';
import * as dataService from '../../services/dataService';

interface GiftcardBalanceCheckerProps {
  onBack: () => void;
}

export const GiftcardBalanceChecker: React.FC<GiftcardBalanceCheckerProps> = ({ onBack }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Ingresa un código válido');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const response = await dataService.checkGiftcardBalance(code);
      
      if (response.success) {
        setResult(response.giftcard);
      } else {
        setError(response.message || 'Giftcard no encontrado');
      }
    } catch (err) {
      setError('Error al consultar el saldo. Intenta nuevamente.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isExpired = result && new Date(result.expiresAt) < new Date();

  return (
    <section className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow-lifted animate-fade-in-up flex flex-col items-center border border-brand-border">
      <GiftIcon className="w-16 h-16 text-brand-primary mb-4" />
      <h1 className="text-3xl font-bold text-brand-text mb-2 text-center">Consultar Saldo</h1>
      <p className="text-brand-secondary text-lg text-center mb-8">
        Ingresa tu código de Giftcard para ver el saldo disponible y fecha de vencimiento.
      </p>

      <form onSubmit={handleCheck} className="w-full max-w-md space-y-4 mb-6">
        <div>
          <label htmlFor="code" className="block text-sm font-semibold text-brand-secondary mb-2">
            Código de Giftcard
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
              setResult(null);
            }}
            placeholder="Ej: GC-ABC123XYZ"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors ${
              error ? 'border-red-500' : 'border-brand-border'
            }`}
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full bg-brand-primary text-white font-semibold py-2.5 px-7 rounded-full shadow hover:bg-brand-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Consultando...' : 'Consultar Saldo'}
        </button>
      </form>

      {result && !isExpired && (
        <div className="w-full max-w-md p-4 bg-green-50 border-2 border-green-400 rounded-lg space-y-3 mb-6">
          <div className="flex items-center gap-2 text-green-700 font-semibold">
            <GiftIcon className="w-5 h-5" />
            Giftcard Válida
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-secondary">Saldo disponible:</span>
              <span className="font-semibold text-brand-text">{formatCurrency(result.balance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-secondary">Beneficiario:</span>
              <span className="font-semibold text-brand-text">{result.beneficiaryName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-secondary">Email:</span>
              <span className="font-semibold text-brand-text text-xs">{result.beneficiaryEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-secondary">Vence:</span>
              <span className="font-semibold text-brand-text">{formatDate(result.expiresAt)}</span>
            </div>
          </div>
        </div>
      )}

      {result && isExpired && (
        <div className="w-full max-w-md p-4 bg-red-50 border-2 border-red-400 rounded-lg mb-6">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
            ⚠️ Giftcard Expirada
          </div>
          <p className="text-sm text-red-600">
            Esta giftcard venció el {formatDate(result.expiresAt)}
          </p>
        </div>
      )}

      <button
        onClick={onBack}
        className="mt-4 border border-brand-primary text-brand-primary font-semibold py-2.5 px-7 rounded-full shadow hover:bg-brand-primary/10 transition-colors"
      >
        Volver
      </button>
    </section>
  );
};
