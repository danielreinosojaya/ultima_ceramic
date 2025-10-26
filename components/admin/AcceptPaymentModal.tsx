import React, { useState } from 'react';
import type { Booking, PaymentDetails } from '../../types';
import * as dataService from '../../services/dataService';
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
    // Idioma fijo español
    const initialTotalPaid = typeof (booking as any).totalPaid === 'number' ? (booking as any).totalPaid : (booking.paymentDetails || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const initialPending = typeof (booking as any).pendingBalance === 'number' ? (booking as any).pendingBalance : Math.max(0, (booking.price || 0) - initialTotalPaid);
    const [amount, setAmount] = useState<number>(initialPending || booking.price || 0);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Transfer'>('Cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [note, setNote] = useState<string>('');
    const [adminName, setAdminName] = useState<string>('');

    if (!isOpen || !booking) return null;

    const handleAddPayment = async () => {
        console.log('[UI] handleAddPayment - Disparando pago para bookingId:', booking.id);
        // Validation: amount must be >0 and <= pending
        const pendingBalance = typeof (booking as any).pendingBalance === 'number' ? (booking as any).pendingBalance : Math.max(0, (booking.price || 0) - initialTotalPaid);
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            alert('El monto debe ser mayor a 0');
            return;
        }
        if (amount > pendingBalance + 0.0001) {
            alert(`El monto no puede ser mayor al saldo pendiente (${pendingBalance.toFixed(2)})`);
            return;
        }

        setIsProcessing(true);
        try {
            const paymentDetails: PaymentDetails = {
                amount: amount,
                method: paymentMethod,
                receivedAt: new Date().toISOString(),
                metadata: {
                    source: 'admin_console',
                    adminName: adminName || undefined,
                    note: note || undefined,
                    previousTotalPaid: initialTotalPaid,
                    pendingBefore: pendingBalance
                }
            } as any;

            const res = await dataService.addPaymentToBooking(booking.id, paymentDetails);
            if (res && res.success) {
                // Ensure cache invalidation and parent refresh
                if (dataService.invalidateBookingsCache) dataService.invalidateBookingsCache();
                onDataChange();
                onClose();
            } else {
                console.error('addPaymentToBooking failed', res);
                alert('Error al agregar el pago.');
            }
        } catch (error) {
            console.error("Failed to add payment:", error);
            alert('Error al agregar el pago.');
        } finally {
            setIsProcessing(false);
        }
    };

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
                <h2 className="text-xl font-bold text-brand-text mb-4">Aceptar pago</h2>
                <div className="space-y-2 mb-4">
                    <p className="text-sm text-brand-secondary">Reserva para <span className="font-semibold">{booking.userInfo.firstName} {booking.userInfo.lastName}</span></p>
                    <p className="text-sm text-brand-secondary">Producto <span className="font-semibold">{booking.product.name}</span></p>
                    <p className="text-sm text-brand-secondary">Precio total <span className="font-bold text-lg">${booking.price.toFixed(2)}</span></p>
                </div>

                <div className="mb-4">
                    <h3 className="text-lg font-bold mb-2">Estado actual</h3>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold p-2 bg-brand-background rounded-md">
                        <div>
                            <span className="block text-brand-secondary">Total pagado</span>
                            <span className="block text-brand-text font-bold">${(initialTotalPaid).toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="block text-brand-secondary">Saldo pendiente</span>
                            <span className="block text-brand-primary font-bold">${(initialPending).toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="block text-brand-secondary">Estado de la reserva</span>
                            <span className={`block font-bold ${booking.isPaid ? 'text-green-600' : 'text-yellow-600'}`}> 
                                {booking.isPaid ? 'Pagado' : 'Pendiente'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="text-lg font-bold mb-2">Desglose de pagos</h3>
                    <div className="text-sm text-brand-secondary mb-2">
                        {booking.giftcardApplied && <div className="mb-1">Giftcard aplicada: <strong>${((booking as any).giftcardRedeemedAmount || 0).toFixed(2)}</strong></div>}
                        {(booking.paymentDetails || []).length === 0 ? (
                            <div>No hay pagos registrados aún.</div>
                        ) : (
                            <ul className="list-disc pl-5 text-brand-text">
                                {(booking.paymentDetails || []).map((p, idx) => (
                                    <li key={idx}>{p.method || 'Manual'} — ${((p.amount || 0)).toFixed(2)} — {new Date(p.receivedAt).toLocaleString()}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold">Agregar pago</h3>
                    <div>
                        <label htmlFor="amount" className="block text-sm font-semibold text-brand-secondary mb-1">Monto recibido</label>
                        <input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary transition-colors"
                        />
                        <p className="text-xs text-brand-secondary mt-1">Saldo pendiente: <strong>${(initialPending).toFixed(2)}</strong></p>
                    </div>
                    <div>
                        <p className="block text-sm font-semibold text-brand-secondary mb-1">Método de pago</p>
                        <div className="flex gap-4">
                            {['Cash', 'Card', 'Transfer'].map(method => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method as any)}
                                    className={
                                        `flex-1 p-3 rounded-lg border-2 flex flex-col items-center transition-colors ${
                                            paymentMethod === method
                                                ? 'border-brand-primary bg-brand-primary/10'
                                                : 'border-gray-200 hover:bg-gray-50'
                                        }`
                                    }
                                >
                                    {getPaymentMethodIcon(method)}
                                    <span className="text-xs font-semibold mt-1">
                                        {method === 'Cash' ? 'Efectivo' : (method === 'Card' ? 'Tarjeta' : 'Transferencia')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="adminName" className="block text-sm font-semibold text-brand-secondary mb-1">Admin (opcional, para trazabilidad)</label>
                        <input id="adminName" type="text" value={adminName} onChange={e => setAdminName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="note" className="block text-sm font-semibold text-brand-secondary mb-1">Nota (opcional)</label>
                        <textarea id="note" value={note} onChange={e => setNote(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold rounded-md border text-brand-secondary hover:bg-gray-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAddPayment}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-primary text-white hover:bg-brand-accent'}`}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Procesando...' : 'Confirmar pago'}
                    </button>
                </div>
            </div>
        </div>
    );
};