import React, { useState } from 'react';
import { registerPhysicalGiftcard } from '../../services/dataService';

interface GiftcardManualCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    adminUser?: string;
}

const MIN_AMOUNT = 10;
const MAX_AMOUNT = 500;
const EXPIRATION_MONTHS = 3;

function normalizeCodeInput(raw: string): string {
    const trimmed = raw.trim().toUpperCase().replace(/\s+/g, '');
    if (!trimmed) return '';
    if (trimmed.startsWith('GC-')) return trimmed;
    if (trimmed.startsWith('GC')) return `GC-${trimmed.slice(2).replace(/^-/, '')}`;
    return `GC-${trimmed}`;
}

function implicitExpirationLabel(from: Date = new Date()): string {
    const expires = new Date(from);
    expires.setMonth(expires.getMonth() + EXPIRATION_MONTHS);
    return expires.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const GiftcardManualCreateModal: React.FC<GiftcardManualCreateModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    adminUser = 'admin'
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [amountInput, setAmountInput] = useState('50');

    const implicitExpiresAt = implicitExpirationLabel();

    const parsedAmount = Number(amountInput.replace(/[^0-9.]/g, ''));

    const resetForm = () => {
        setName('');
        setCode('');
        setAmountInput('50');
        setError(null);
        setSuccess(false);
    };

    const handleClose = () => {
        if (loading) return;
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const trimmedName = name.trim();
            const normalizedCode = normalizeCodeInput(code);

            if (!trimmedName) throw new Error('El nombre es requerido');
            if (!normalizedCode || normalizedCode === 'GC-') throw new Error('El código es requerido');
            if (!amountInput.trim()) throw new Error('El valor es requerido');
            if (!Number.isFinite(parsedAmount) || parsedAmount < MIN_AMOUNT || parsedAmount > MAX_AMOUNT) {
                throw new Error(`El valor debe estar entre $${MIN_AMOUNT} y $${MAX_AMOUNT}`);
            }

            const result = await registerPhysicalGiftcard(trimmedName, normalizedCode, parsedAmount, adminUser);

            if (result.success) {
                setSuccess(true);
                const expiresLabel = result.giftcard?.expiresAt
                    ? new Date(result.giftcard.expiresAt).toLocaleDateString('es-EC', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                      })
                    : null;

                window.alert(
                    `Giftcard física registrada\n\nNombre: ${trimmedName}\nCódigo: ${result.giftcard?.code || normalizedCode}\nValor: $${parsedAmount}\nVence: ${expiresLabel || implicitExpiresAt}`
                );

                resetForm();
                onSuccess?.();
                onClose();
            } else {
                setError(result.error || 'Error desconocido');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-bold text-brand-primary">Registrar giftcard física</h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                        disabled={loading}
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </div>

                <p className="text-sm text-brand-secondary mb-5">
                    Nombre, código impreso en la tarjeta y valor. El vencimiento se asigna solo (3 meses desde hoy).
                </p>

                {success && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                        Giftcard registrada correctamente
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-brand-primary mb-1">
                            Nombre *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: María López"
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-brand-primary mb-1">
                            Código de la tarjeta *
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="Ej: GC-ABC123"
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono tracking-wide"
                            disabled={loading}
                        />
                        {code.trim() && (
                            <p className="text-xs text-gray-500 mt-1">
                                Se registrará como: <span className="font-mono">{normalizeCodeInput(code)}</span>
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-brand-primary mb-1">
                            Valor ($) *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                                type="number"
                                min={MIN_AMOUNT}
                                max={MAX_AMOUNT}
                                step={1}
                                value={amountInput}
                                onChange={(e) => setAmountInput(e.target.value)}
                                placeholder="Ej: 100"
                                className="w-full pl-7 pr-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                disabled={loading}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Entre ${MIN_AMOUNT} y ${MAX_AMOUNT}</p>
                    </div>

                    <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-600">
                        <span className="font-medium text-gray-700">Vencimiento:</span>{' '}
                        {implicitExpiresAt}
                        <span className="text-xs text-gray-500 ml-1">(automático, 3 meses)</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 rounded-lg border border-brand-border text-brand-primary font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Registrando…' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
