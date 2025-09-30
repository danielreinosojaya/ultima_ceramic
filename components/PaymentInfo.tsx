import React, { useState } from 'react';
import { BankAccountsModal } from './BankAccountsModal';

const bankAccounts = [
  {
    bankName: 'Banco Guayaquil',
    accountHolder: 'CERAMIC ALMA SAS',
    accountNumber: '27779140',
    accountType: 'Cuenta Corriente',
    taxId: '0993384350001'
  },
  {
    bankName: 'Banco Pichincha',
    accountHolder: 'CERAMIC ALMA SAS',
    accountNumber: '12345678',
    accountType: 'Cuenta de Ahorros',
    taxId: '0993384350001'
  }
  // ...add more accounts as needed
];

export const PaymentInfo = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-8 animate-fade-in">
      <h3 className="text-xl font-bold text-brand-text text-center mb-4">Próximos Pasos para Activar</h3>
      <div className="bg-brand-background p-6 rounded-lg space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-brand-secondary">Banco:</span>
          <span className="font-semibold text-brand-text">{bankAccounts[0].bankName}</span>
          <button
            onClick={() => setModalOpen(true)}
            className="ml-2 px-3 py-1 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-full font-bold shadow hover:scale-105 transition-transform"
          >
            Ver todas las cuentas
          </button>
        </div>
        <div className="flex justify-between"><span className="text-brand-secondary">Titular de la Cuenta:</span><span className="font-semibold text-brand-text">{bankAccounts[0].accountHolder}</span></div>
        <div className="flex justify-between"><span className="text-brand-secondary">Número de Cuenta:</span><span className="font-semibold text-brand-text">{bankAccounts[0].accountNumber}</span></div>
        <div className="flex justify-between"><span className="text-brand-secondary">Tipo de Cuenta:</span><span className="font-semibold text-brand-text">{bankAccounts[0].accountType}</span></div>
        <div className="flex justify-between"><span className="text-brand-secondary">Ruc:</span><span className="font-semibold text-brand-text">{bankAccounts[0].taxId}</span></div>
      </div>
      <p className="text-center text-sm text-brand-secondary mt-4 italic">Por favor, realiza la transferencia y envíanos el comprobante por WhatsApp, incluyendo tu código de reserva (C-ALMA-6JIN31H6), para activar tu cupo.</p>
      <BankAccountsModal open={modalOpen} onClose={() => setModalOpen(false)} accounts={bankAccounts} />
    </div>
  );
};
