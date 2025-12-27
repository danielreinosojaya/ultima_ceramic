import React, { useState } from 'react';
import { XMarkIcon, EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline';

interface ForgotCodeModalProps {
    onClose: () => void;
}

type Step = 'email' | 'verify' | 'success';

/**
 * ForgotCodeModal
 * 
 * Password recovery flow:
 * 1. Email input → Request 6-digit code
 * 2. Verify code → Get booking code
 * 3. Success → Show booking code
 */
export const ForgotCodeModal: React.FC<ForgotCodeModalProps> = ({ onClose }) => {
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [bookingCode, setBookingCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Step 1: Request recovery code
     */
    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            setError('Por favor ingresa tu email');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/request-recovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setError(data.error || 'Error al enviar código');
                return;
            }

            // Move to verification step
            setStep('verify');

        } catch (err) {
            console.error('Recovery request error:', err);
            setError('Error de conexión. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Step 2: Verify recovery code
     */
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!recoveryCode || recoveryCode.length !== 6) {
            setError('El código debe tener 6 dígitos');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/verify-recovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, recoveryCode })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setError(data.error || 'Código inválido');
                return;
            }

            // Store booking code and move to success step
            setBookingCode(data.bookingCode);
            setStep('success');

        } catch (err) {
            console.error('Recovery verify error:', err);
            setError('Error de conexión. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold text-brand-text">
                        Recuperar Código
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Step 1: Email Input */}
                    {step === 'email' && (
                        <form onSubmit={handleRequestCode} className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                                <EnvelopeIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
                                <p className="text-sm text-brand-secondary">
                                    Ingresa tu email y te enviaremos un código de recuperación
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-brand-text mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
                            >
                                {loading ? 'Enviando...' : 'Enviar código'}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Verify Code */}
                    {step === 'verify' && (
                        <form onSubmit={handleVerifyCode} className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                                <KeyIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
                                <p className="text-sm text-brand-secondary">
                                    Te enviamos un código de 6 dígitos a <strong>{email}</strong>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-brand-text mb-2">
                                    Código de Recuperación
                                </label>
                                <input
                                    type="text"
                                    value={recoveryCode}
                                    onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="123456"
                                    maxLength={6}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono text-center text-2xl tracking-widest"
                                    disabled={loading}
                                    autoFocus
                                />
                                <p className="text-xs text-brand-secondary mt-2">
                                    El código expira en 15 minutos
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('email');
                                        setRecoveryCode('');
                                        setError(null);
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                                >
                                    Atrás
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || recoveryCode.length !== 6}
                                    className="flex-1 px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
                                >
                                    {loading ? 'Verificando...' : 'Verificar'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: Success */}
                    {step === 'success' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center mb-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <KeyIcon className="w-8 h-8 text-green-600" />
                                </div>
                            </div>

                            <div className="text-center">
                                <h3 className="text-lg font-bold text-brand-text mb-2">
                                    ¡Código recuperado!
                                </h3>
                                <p className="text-brand-secondary text-sm mb-4">
                                    Tu código de reserva es:
                                </p>
                            </div>

                            <div className="bg-gradient-to-r from-brand-primary to-brand-accent p-6 rounded-lg">
                                <p className="text-center font-mono text-3xl font-bold text-white tracking-widest">
                                    {bookingCode}
                                </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-xs text-brand-secondary">
                                    <strong>Tip:</strong> Guarda este código para acceder a tu panel en el futuro
                                </p>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:opacity-90"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
