import React, { useState, useEffect, useMemo } from 'react';
import type { Booking, PaymentDetails } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import * as dataService from '../../services/dataService';
import { TrashIcon } from '../icons/TrashIcon';
import { CurrencyDollarIcon } from '../icons/CurrencyDollarIcon';

interface AcceptPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onDataChange: () => void;
}

export const AcceptPaymentModal: React.FC<AcceptPaymentModalProps> = ({ isOpen, onClose, booking, onDataChange }) => {
  const { t, language } = useLanguage();
  const [amount, setAmount] = useState<number | string>('');
  const [method, setMethod] = useState<PaymentDetails['method']>('Cash');
  const [isShortfall, setIsShortfall] = useState(false);

  useEffect(() => {
    const totalPaid = (booking.paymentDetails || []).reduce((sum, p) => sum + p.amount, 0);
    const remaining = booking.price - totalPaid;
    setAmount(remaining > 0 ? remaining : '');
    setMethod('Cash');
    setIsShortfall(false);
  }, [booking, isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    
    const numericValue = parseFloat(value);
    const totalPaid = (booking.paymentDetails || []).reduce((sum, p) => sum + p.amount, 0);
    const newTotal = totalPaid + (isNaN(numericValue) ? 0 : numericValue);
    
    if (newTotal < booking.price) {
        setIsShortfall(true);
    } else {
        setIsShortfall(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(finalAmount) || finalAmount <= 0) return;
    
    const newPayment: PaymentDetails = {
      amount: finalAmount,
      method,
      receivedAt: new Date().toISOString()
    };
    
    // CORRECCIÓN: Llamar al servicio de datos para agregar el pago
    await dataService.addPaymentToBooking(booking.id, newPayment);
    onDataChange();
    onClose();
  };
  
  const handleDeletePayment = async (index: number) => {
      // CORRECCIÓN: Eliminar el uso de window.confirm y alert
      await dataService.deletePaymentFromBooking(booking.id, index);
      onDataChange();
  };
  
  const totalPaid = useMemo(() => {
      return (booking.paymentDetails || []).reduce((sum, p) => sum + p.amount, 0);
  }, [booking]);

  const remainingBalance = useMemo(() => {
      return Math.max(0, booking.price - totalPaid);
  }, [booking, totalPaid]);
  
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-serif text-brand-accent mb-2 text-center">{t('admin.acceptPaymentModal.title')}</h2>
        <p className="text-brand-secondary mb-6 text-center">
            {t('admin.acceptPaymentModal.subtitle', { name: `${booking.userInfo.firstName} ${booking.userInfo.lastName}`, productName: booking.product.name })}
        </p>
        
        <div className="bg-brand-background p-4 rounded-lg mb-4">
            <div className="flex justify-between font-bold text-lg mb-2">
                <span>Total Reserva</span>
                <span>${booking.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-md text-green-700">
                <span>Total Pagado</span>
                <span>${totalPaid.toFixed(2)}</span>
            </div>
            <div className="border-t border-brand-border mt-2 pt-2 flex justify-between font-bold text-lg">
                <span className="text-red-600">Saldo Pendiente</span>
                <span className="text-red-600">${remainingBalance.toFixed(2)}</span>
            </div>
        </div>
        
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-brand-secondary">Historial de Pagos</h3>
            <ul className="space-y-2">
                {(booking.paymentDetails || []).length > 0 ? (
                    (booking.paymentDetails || []).map((payment, index) => (
                        <li key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded-lg text-sm">
                            <div>
                                <span className="font-semibold">${payment.amount.toFixed(2)}</span>
                                <span className="text-xs text-gray-500 ml-2">({t(`admin.acceptPaymentModal.method${payment.method}`)})</span>
                            </div>
                            <button onClick={() => handleDeletePayment(index)} className="p-1 text-red-500 hover:text-red-700">
                                <TrashIcon className="w-4 h-4"/>
                            </button>
                        </li>
                    ))
                ) : (
                    <li className="text-sm text-brand-secondary text-center">No se han registrado pagos.</li>
                )}
            </ul>
        </div>
        
        <form onSubmit={handleAddPayment} className="space-y-4 mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-bold text-brand-secondary">Añadir Nuevo Pago</h3>
            <div>
                <label htmlFor="amount" className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.acceptPaymentModal.amountLabel')}</label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">$</span>
                    <input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={handleAmountChange}
                        className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary ${isShortfall ? 'border-red-500' : 'border-gray-300'}`}
                        required
                    />
                </div>
                 {isShortfall && (
                    <p className="text-red-600 text-xs mt-1 animate-fade-in-fast">
                        {t('admin.acceptPaymentModal.shortfallWarning', { price: `$${booking.price.toFixed(2)}`})}
                    </p>
                )}
            </div>
            <div>
                <label htmlFor="method" className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.acceptPaymentModal.methodLabel')}</label>
                <select
                    id="method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentDetails['method'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                    <option value="Cash">{t('admin.acceptPaymentModal.methodCash')}</option>
                    <option value="Card">{t('admin.acceptPaymentModal.methodCard')}</option>
                    <option value="Transfer">{t('admin.acceptPaymentModal.methodTransfer')}</option>
                </select>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                    type="button"
                    onClick={onClose}
                    className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100"
                >
                    {t('admin.productManager.cancelButton')}
                </button>
                <button
                    type="submit"
                    className="bg-brand-success text-white font-bold py-2 px-6 rounded-lg hover:opacity-90"
                >
                    {t('admin.acceptPaymentModal.confirmButton')}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};
