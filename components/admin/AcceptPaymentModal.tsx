import React, { useState } from 'react';
import type { Booking, PaymentDetails } from '../../types';
import * as dataService from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';
import { CurrencyDollarIcon } from '../icons/CurrencyDollarIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { BankIcon } from '../icons/BankIcon';

interface AcceptPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking;
    onDataChange: () => void;
}

export const AcceptPaymentModal: React.FC<AcceptPaymentModalProps> = ({ isOpen, onClose, booking, onDataChange }) => {
    const { t, language } = useLanguage();
    const [amount, setAmount] = useState(booking.price);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Transfer'>('Cash');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAddPayment = async () => {
        setIsProcessing(true);
        try {
            const paymentDetails: PaymentDetails = {
                amount: amount,
                method: paymentMethod,
                receivedAt: new Date().toISOString(),
            };
            await dataService.addPaymentToBooking(booking.id, paymentDetails);
            onDataChange(); // The core fix is here. This prop must be a function.
            onClose();
        } catch (error) {
            console.error("Failed to add payment:", error);
            alert(t('admin.acceptPaymentModal.errorText'));
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen || !booking) return null;

    const getPaymentMethodIcon = (method: string) => {
        switch(method) {
            case 'Cash':
                return <CurrencyDollarIcon className="w-5 h-5" />;
            case 'Card':
                return <CreditCardIcon className="w-5 h-5" />;
            case 'Transfer':
                return <BankIcon className="w-5 h-5" />;
            default:
                return null;
        }
    };

    const totalPaid = (booking.paymentDetails || []).reduce((sum, p) => sum + p.amount, 0);
    const pendingBalance = booking.price - totalPaid;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-brand-text mb-4">{t('admin.acceptPaymentModal.title')}</h2>
                <div className="space-y-2 mb-4">
                    <p className="text-sm text-brand-secondary">{t('admin.acceptPaymentModal.bookingFor')} <span className="font-semibold">{booking.userInfo.firstName} {booking.userInfo.lastName}</span></p>
                    <p className="text-sm text-brand-secondary">{t('admin.acceptPaymentModal.product')} <span className="font-semibold">{booking.product.name}</span></p>
                    <p className="text-sm text-brand-secondary">{t('admin.acceptPaymentModal.totalPrice')} <span className="font-bold text-lg">${booking.price.toFixed(2)}</span></p>
                </div>

                <div className="mb-4">
                    <h3 className="text-lg font-bold mb-2">{t('admin.acceptPaymentModal.currentStatus')}</h3>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold p-2 bg-brand-background rounded-md">
                        <div>
                            <span className="block text-brand-secondary">{t('admin.acceptPaymentModal.totalPaid')}</span>
                            <span className="block text-brand-text font-bold">${totalPaid.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="block text-brand-secondary">{t('admin.acceptPaymentModal.pendingBalance')}</span>
                            <span className="block text-brand-primary font-bold">${pendingBalance.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="block text-brand-secondary">{t('admin.acceptPaymentModal.bookingStatus')}</span>
                            <span className={`block font-bold ${booking.isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                                {booking.isPaid ? t('admin.acceptPaymentModal.paid') : t('admin.acceptPaymentModal.unpaid')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold">{t('admin.acceptPaymentModal.addPayment')}</h3>
                    <div>
                        <label htmlFor="amount" className="block text-sm font-semibold text-brand-secondary mb-1">{t('admin.acceptPaymentModal.amountReceived')}</label>
                        <input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary transition-colors"
                        />
                    </div>
                    <div>
                        <p className="block text-sm font-semibold text-brand-secondary mb-1">{t('admin.acceptPaymentModal.paymentMethod')}</p>
                        <div className="flex gap-4">
                            {['Cash', 'Card', 'Transfer'].map(method => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method as any)}
                                    className={`flex-1 p-3 rounded-lg border-2 flex flex-col items-center transition-colors ${paymentMethod === method ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {getPaymentMethodIcon(method)}
                                    <span className="text-xs font-semibold mt-1">{method}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold rounded-md border text-brand-secondary hover:bg-gray-100 transition-colors"
                    >
                        {t('admin.acceptPaymentModal.cancel')}
                    </button>
                    <button
                        onClick={handleAddPayment}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-primary text-white hover:bg-brand-accent'}`}
                        disabled={isProcessing}
                    >
                        {isProcessing ? t('admin.acceptPaymentModal.processing') : t('admin.acceptPaymentModal.confirmPayment')}
                    </button>
                </div>
            </div>
        </div>
    );
};