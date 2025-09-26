import React, { useState } from 'react';
// Replace UI library imports with basic HTML elements
import { PaymentDetails } from '../../types';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentDetails;
  paymentIndex: number;
  bookingId: string;
  onSave: (updated: Partial<PaymentDetails>) => void;
}

const paymentMethods = [
  { value: 'Cash', label: 'Efectivo' },
  { value: 'Transfer', label: 'Transferencia' },
  { value: 'Card', label: 'Tarjeta' },
];

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({ isOpen, onClose, payment, onSave }) => {
  const [amount, setAmount] = useState(payment?.amount || 0);
  const [method, setMethod] = useState(payment?.method || 'Cash');
  const [receivedAt, setReceivedAt] = useState(payment?.receivedAt || '');

  const handleSave = () => {
    onSave({ amount, method, receivedAt });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
        <h2 className="text-lg font-bold mb-4">Editar pago</h2>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm">Monto</span>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="mt-1 block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            <span className="text-sm">Método</span>
            <select value={method} onChange={e => setMethod(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1">
              {paymentMethods.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm">Fecha</span>
            <input type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
          </label>
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded">Guardar</button>
          <button onClick={onClose} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">Cancelar</button>
        </div>
      </div>
    </div>
  );
};
