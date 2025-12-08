import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserIcon, EnvelopeIcon, CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ForgotCodeModal } from './ForgotCodeModal';

interface ClientLoginProps {
    onSuccess: (booking: any) => void;
    onBack: () => void;
    showBackButton?: boolean;
}

interface Booking {
    id: string;
    bookingCode: string;
    productName?: string;
    productType?: string;
    bookingDate?: string;
}

export const ClientLogin: React.FC<ClientLoginProps> = ({ onSuccess, onBack, showBackButton = true }) => {
    const { login, booking: authBooking, loading: authLoading } = useAuth();
    const [step, setStep] = useState<'email' | 'select'>('email');
    const [email, setEmail] = useState('');
    const [availableBookings, setAvailableBookings] = useState<Booking[]>([]);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [bookingCode, setBookingCode] = useState('');
    const [useLegacyFlow, setUseLegacyFlow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);

    const isLoading = loading || authLoading;

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            setError('Por favor ingresa un email válido');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/auth/list-bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase() })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                setError(data.error || 'No se encontraron reservas');
                setLoading(false);
                return;
            }
            if (data.bookings && data.bookings.length > 0) {
                setAvailableBookings(data.bookings);
                setStep('select');
            } else {
                setError('No se encontraron reservas activas');
                setUseLegacyFlow(true);
                setStep('select');
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Error al buscar tus reservas');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectBooking = async (selectedId: string) => {
        setSelectedBookingId(selectedId);
        setLoading(true);
        setError(null);
        try {
            const selectedBooking = availableBookings.find(b => b.id === selectedId);
            const result = await login(email, selectedBooking?.bookingCode);
            if (result.success && authBooking) {
                onSuccess(authBooking);
            } else {
                setError(result.error || 'Error al acceder');
                setSelectedBookingId(null);
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Error al verificar tu identidad');
            setSelectedBookingId(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingCode) {
            setError('Por favor ingresa tu código');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await login(email, bookingCode);
            if (result.success && authBooking) {
                onSuccess(authBooking);
            } else {
                setError(result.error || 'Código inválido');
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Error al verificar tu identidad');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <UserIcon className="w-12 h-12 text-brand-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-brand-text mb-2">Accede a tu Panel</h1>
                    <p className="text-brand-secondary text-sm">
                        {step === 'email' 
                            ? 'Ingresa tu email para encontrar tus reservas'
                            : availableBookings.length > 0 
                                ? 'Selecciona la reserva que quieres ver'
                                : 'Ingresa tu código de reserva'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {step === 'email' && (
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-brand-text mb-2">
                                <div className="flex items-center gap-2">
                                    <EnvelopeIcon className="w-4 h-4 text-brand-primary" />
                                    Email
                                </div>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-primary text-white py-2 rounded-lg font-semibold hover:bg-brand-primary-dark disabled:bg-gray-300"
                        >
                            {isLoading ? 'Buscando...' : 'Siguiente'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowRecoveryModal(true)}
                            className="w-full text-brand-primary text-sm hover:underline"
                        >
                            ¿Olvidaste tu email o código?
                        </button>
                        {showBackButton && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="w-full text-gray-600 text-sm hover:underline pt-2"
                            >
                                ← Cambiar opción
                            </button>
                        )}
                    </form>
                )}

                {step === 'select' && (
                    <>
                        <button
                            onClick={() => {
                                setStep('email');
                                setAvailableBookings([]);
                                setSelectedBookingId(null);
                                setUseLegacyFlow(false);
                                setError(null);
                            }}
                            className="flex items-center gap-2 text-brand-primary text-sm hover:underline mb-6"
                            disabled={isLoading}
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Cambiar email
                        </button>

                        {availableBookings.length > 0 && !useLegacyFlow && (
                            <div className="space-y-3">
                                <p className="text-sm text-brand-secondary">
                                    Tienes {availableBookings.length} reserva{availableBookings.length !== 1 ? 's' : ''} activa{availableBookings.length !== 1 ? 's' : ''}:
                                </p>
                                {availableBookings.map((booking) => (
                                    <button
                                        key={booking.id}
                                        onClick={() => handleSelectBooking(booking.id)}
                                        disabled={isLoading}
                                        className="w-full p-4 border-2 border-brand-border rounded-lg hover:border-brand-primary hover:bg-blue-50 text-left disabled:opacity-50"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-semibold text-brand-text">{booking.productName || booking.productType || 'Experiencia'}</p>
                                                {booking.bookingDate && (
                                                    <p className="text-sm text-brand-secondary">
                                                        {booking.bookingDate}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-1">Código: {booking.bookingCode}</p>
                                            </div>
                                            {selectedBookingId === booking.id && <CheckIcon className="w-5 h-5 text-brand-primary mt-1" />}
                                        </div>
                                    </button>
                                ))}
                                {availableBookings.length > 1 && (
                                    <button
                                        onClick={() => setUseLegacyFlow(true)}
                                        className="w-full text-brand-primary text-sm hover:underline mt-4"
                                    >
                                        Ingresa el código manualmente
                                    </button>
                                )}
                            </div>
                        )}

                        {useLegacyFlow && (
                            <form onSubmit={handleCodeSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-brand-text mb-2">Código de Reserva</label>
                                    <input
                                        type="text"
                                        value={bookingCode}
                                        onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                                        placeholder="ABC123XYZ"
                                        className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary uppercase"
                                        disabled={isLoading}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-brand-primary text-white py-2 rounded-lg font-semibold hover:bg-brand-primary-dark disabled:bg-gray-300"
                                >
                                    {isLoading ? 'Verificando...' : 'Acceder'}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {showRecoveryModal && (
                    <ForgotCodeModal onClose={() => setShowRecoveryModal(false)} />
                )}
            </div>
        </div>
    );
};
