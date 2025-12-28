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

  // Mobile-first scroll behavior: scroll modal into view
  useEffect(() => {
    if (open) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        const modal = document.querySelector('[data-modal="bank-accounts"]');
        if (modal && window.innerWidth <= 768) { // Mobile only
          modal.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 animate-fade-in px-4">
      <div 
        data-modal="bank-accounts"
        className="bg-brand-surface rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-lg shadow-2xl border border-brand-border relative my-4 sm:my-8 max-h-[90vh] overflow-y-auto mx-4"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-brand-primary bg-brand-background rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow hover:bg-brand-accent hover:text-white transition-all z-10"
          aria-label="Cerrar"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <h3 className="text-lg sm:text-xl font-bold text-brand-text mb-2 text-center pr-8">Cuentas Bancarias</h3>
        <p className="text-xs sm:text-sm text-brand-secondary text-center mb-4 sm:mb-6">Elige la cuenta que prefieras para tu transferencia</p>
        <div className="space-y-3 sm:space-y-4">
          {accounts.map((acc, idx) => (
            <div key={idx} className="bg-brand-background rounded-xl p-3 sm:p-4 shadow hover:shadow-md transition-all border border-brand-border">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-3">
                <span className="font-bold text-brand-primary text-sm sm:text-base mb-1 sm:mb-0">{acc.bankName}</span>
                <button
                  className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded-full shadow hover:bg-brand-accent transition-colors touch-manipulation w-fit"
                  onClick={() => {
                    navigator.clipboard.writeText(acc.accountNumber);
                    // Optional: Show toast notification
                    const button = event.target;
                    const originalText = button.textContent;
                    button.textContent = '¡Copiado!';
                    button.style.backgroundColor = '#22c55e';
                    setTimeout(() => {
                      button.textContent = originalText;
                      button.style.backgroundColor = '';
                    }, 2000);
                  }}
                  title="Copiar número de cuenta"
                >Copiar Nº Cuenta</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <div className="flex flex-col sm:block"><span className="font-semibold text-brand-secondary">Titular:</span> <span className="text-brand-text break-all">{acc.accountHolder}</span></div>
                <div className="flex flex-col sm:block"><span className="font-semibold text-brand-secondary">Número:</span> <span className="text-brand-text font-mono">{acc.accountNumber}</span></div>
                <div className="flex flex-col sm:block"><span className="font-semibold text-brand-secondary">Tipo:</span> <span className="text-brand-text">{acc.accountType}</span></div>
                <div className="flex flex-col sm:block"><span className="font-semibold text-brand-secondary">{uiLabels.taxIdLabel}:</span> <span className="text-brand-text font-mono">{acc.taxId}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
