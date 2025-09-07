import React, { useState, useEffect } from 'react';
import type { Booking, PaymentDetails } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AcceptPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: Omit<PaymentDetails, 'receivedAt'>) => void;
  booking: Booking;
}

export const AcceptPaymentModal: React.FC<AcceptPaymentModalProps> = ({ isOpen, onClose, onConfirm, booking }) => {
  const { t } = useLanguage();
  const [amount, setAmount] = useState<number | string>(booking.price);
  const [method, setMethod] = useState<PaymentDetails['method']>('Cash');
  const [isShortfall, setIsShortfall] = useState(false);

  useEffect(() => {
    setAmount(booking.price);
    setMethod('Cash');
    setIsShortfall(false);
  }, [booking]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue < booking.price) {
        setIsShortfall(true);
    } else {
        setIsShortfall(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(finalAmount)) return;
    onConfirm({ amount: finalAmount, method });
  };
  
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-right text-sm font-semibold text-brand-secondary">
              {t('admin.acceptPaymentModal.packagePriceLabel', { price: booking.price.toFixed(2) })}
            </div>
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