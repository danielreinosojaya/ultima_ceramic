import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserIcon, EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface CreateSessionFormProps {
    onSuccess: () => void;
    onBack: () => void;
}

/**
 * CreateSessionForm
 * 
 * Allows NEW clients to create a session
 * (doesn't require existing booking code)
 * 
 * Steps:
 * 1. Enter email + name
 * 2. Verify session created
 * 3. Redirect to booking creation
 */
export const CreateSessionForm: React.FC<CreateSessionFormProps> = ({ onSuccess, onBack }) => {
    const { loading: authLoading } = useAuth();
    
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const isLoading = loading || authLoading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!email || !fullName) {
            setError('Por favor completa todos los campos');
            return;
        }

        if (!email.includes('@')) {
            setError('Email inválido');
            return;
        }

        if (fullName.trim().length < 2) {
            setError('Nombre debe tener al menos 2 caracteres');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth?action=create-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    email: email.toLowerCase(), 
                    firstName: fullName.trim() 
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setError(data.error || 'Error al crear sesión');
                setLoading(false);
                return;
            }

            // Success!
            setSuccess(true);
            
            // Auto-redirect after 2 seconds
            setTimeout(() => {
                onSuccess();
            }, 2000);

        } catch (err) {
            console.error('Error creating session:', err);
            setError('Error de conexión. Por favor intenta de nuevo.');
            setLoading(false);
        }
    };

    // Success state
    if (success) {
        return (
            <div className="max-w-md mx-auto p-6">
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-brand-text mb-2">¡Bienvenido!</h2>
                    <p className="text-brand-secondary mb-6">
                        Tu sesión ha sido creada exitosamente
                    </p>
                    <p className="text-sm text-gray-600">
                        Redirigiendo... en unos momentos podrás crear tu primera reserva
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <UserIcon className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-brand-text mb-2">Crea Tu Sesión</h1>
                    <p className="text-brand-secondary text-sm">
                        Completa tus datos para comenzar a reservar clases
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Error message */}
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Email Field */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-text mb-2">
                            <div className="flex items-center gap-2">
                                <EnvelopeIcon className="w-4 h-4 text-green-600" />
                                Email
                            </div>
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            disabled={isLoading}
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Úsalo para acceder a tu sesión después
                        </p>
                    </div>

                    {/* Name Field */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-text mb-2">
                            <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-green-600" />
                                Nombre Completo
                            </div>
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Juan García"
                            className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Como aparecerá en tus reservas
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-xs text-green-800">
                            <strong>✓ Privado y seguro:</strong> Tus datos se almacenan encriptados. Solo tú accedes a tu sesión.
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onBack}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Cambiar opción
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300"
                        >
                            {isLoading ? 'Creando...' : 'Crear Sesión'}
                        </button>
                    </div>
                </form>

                {/* Terms */}
                <p className="text-xs text-gray-500 text-center mt-6">
                    Al crear tu sesión, aceptas nuestros{' '}
                    <a href="#" className="text-brand-primary hover:underline">términos de servicio</a>
                </p>
            </div>
        </div>
    );
};
