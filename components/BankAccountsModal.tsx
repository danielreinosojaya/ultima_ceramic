import React, { useEffect, useState } from 'react';
import { getUILabels } from '../services/dataService';
import { UILabels } from '../types';

export const BankAccountsModal = ({ open, onClose, accounts }) => {
  // Debug: log para validar datos recibidos
  console.log('BankAccountsModal accounts:', accounts);
  const [uiLabels, setUiLabels] = useState<UILabels>({ taxIdLabel: 'RUC' });

  useEffect(() => {
    const fetchUILabels = async () => {
      try {
        const labels = await getUILabels();
        setUiLabels(labels);
      } catch (error) {
        console.log('No se encontraron labels personalizados, usando defaults');
        setUiLabels({ taxIdLabel: 'RUC' });
      }
    };
    fetchUILabels();
  }, []);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-brand-surface rounded-2xl p-8 w-full max-w-md aspect-[4/3] shadow-2xl border border-brand-border relative flex flex-col justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-primary bg-brand-background rounded-full p-2 shadow hover:bg-brand-accent transition-colors"
          aria-label="Cerrar"
        >✕</button>
        <h3 className="text-xl font-bold text-brand-text mb-2 text-center">Cuentas Bancarias</h3>
        <p className="text-sm text-brand-secondary text-center mb-6">Elige la cuenta que prefieras para tu transferencia</p>
        <ul className="space-y-4">
          {accounts.map((acc, idx) => (
            <li key={idx} className="bg-brand-background rounded-xl p-4 shadow hover:scale-105 transition-transform border border-brand-border flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-brand-primary text-base">{acc.bankName}</span>
                <button
                  className="text-xs bg-brand-primary text-white px-3 py-1 rounded-full shadow hover:bg-brand-accent transition-colors"
                  onClick={() => navigator.clipboard.writeText(acc.accountNumber)}
                  title="Copiar número de cuenta"
                >Copiar Nº Cuenta</button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-semibold text-brand-secondary">Titular:</span> <span className="text-brand-text">{acc.accountHolder}</span></div>
                <div><span className="font-semibold text-brand-secondary">Número:</span> <span className="text-brand-text">{acc.accountNumber}</span></div>
                <div><span className="font-semibold text-brand-secondary">Tipo:</span> <span className="text-brand-text">{acc.accountType}</span></div>
                <div><span className="font-semibold text-brand-secondary">{uiLabels.taxIdLabel}:</span> <span className="text-brand-text">{acc.taxId}</span></div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
