import React, { useState } from 'react';
import * as dataService from '../services/dataService';
import { UserIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

interface ClientLoginProps {
    onSuccess: (booking: any) => void;
    onBack: () => void;
}

/**
 * ClientLogin
 * 
 * Component for clients to identify themselves and access their bookings.
 * They enter their email and booking code (from confirmation email).
 */
export const ClientLogin: React.FC<ClientLoginProps> = ({ onSuccess, onBack }) => {
    const [email, setEmail] = useState('');
    const [bookingCode, setBookingCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email || !bookingCode) {
            setError('Por favor completa todos los campos');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Call backend to verify email + booking code
            const result = await dataService.getClientBooking(email, bookingCode);
            
            if (result.success && result.booking) {
                // Store in localStorage for this session
                localStorage.setItem('clientEmail', email);
                localStorage.setItem('clientBookingCode', bookingCode);
                localStorage.setItem('lastBookingId', result.booking.id);
                
                onSuccess(result.booking);
            } else {
                setError(result.message || 'Email o código de reserva inválido');
            }
        } catch (err) {
            console.error('Error fetching booking:', err);
            setError('Error al verificar tu identidad. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <UserIcon className="w-12 h-12 text-brand-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-brand-text mb-2">Accede a tu Panel</h1>
                    <p className="text-brand-secondary text-sm">
                        Ingresa tu email y código de reserva para ver tus clases
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Field */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-text mb-2">
                            <div className="flex items-center gap-2 mb-2">
                                <EnvelopeIcon className="w-4 h-4 text-brand-primary" />
                                Email
                            </div>
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={loading}
                        />
                    </div>

                    {/* Booking Code Field */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-text mb-2">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-brand-primary font-bold">#</span>
                                Código de Reserva
                            </div>
                        </label>
                        <input
                            type="text"
                            value={bookingCode}
                            onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                            placeholder="CERAMIC-ABC123"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono text-center tracking-widest"
                            disabled={loading}
                        />
                        <p className="text-xs text-brand-secondary mt-2">
                            Lo encontrarás en el email de confirmación que recibiste
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Help Text */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs text-brand-secondary">
                            <strong>¿No encuentras tu código?</strong> Revisa el email de confirmación en spam o contacta con nosotros.
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onBack}
                            disabled={loading}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Atrás
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? 'Verificando...' : 'Acceder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
