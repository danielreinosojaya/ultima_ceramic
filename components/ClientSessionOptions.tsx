import React, { useState } from 'react';
import { EnvelopeIcon, PlusIcon } from '@heroicons/react/24/outline';

interface ClientSessionOptionsProps {
    onLogin: () => void;        // Usuario existing: ingresa credenciales
    onCreateNew: () => void;    // Usuario nuevo: crea sesión
}

/**
 * ClientSessionOptions
 * 
 * First screen shown when no session exists.
 * Lets user choose between:
 * 1. Acceder (existing session) → ClientLogin
 * 2. Crear Nueva (new session) → CreateSessionForm
 */
export const ClientSessionOptions: React.FC<ClientSessionOptionsProps> = ({ onLogin, onCreateNew }) => {
    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-brand-text mb-3">Tu Portal de Clases</h1>
                    <p className="text-brand-secondary text-lg">
                        ¿Eres nuevo o ya tienes una reserva?
                    </p>
                </div>

                {/* Two Option Cards */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Option 1: Login to Existing Session */}
                    <button
                        onClick={onLogin}
                        className="p-8 border-2 border-brand-border rounded-lg hover:border-brand-primary hover:shadow-lg transition-all text-left group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition">
                                <EnvelopeIcon className="w-6 h-6 text-brand-primary" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-brand-text mb-2">
                                    Acceder
                                </h2>
                                <p className="text-brand-secondary text-sm mb-4">
                                    Ya tengo una reserva y quiero acceder a mi panel
                                </p>
                                <div className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded inline-block">
                                    Necesitarás: Email + Código de Reserva
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Option 2: Create New Session */}
                    <button
                        onClick={onCreateNew}
                        className="p-8 border-2 border-brand-border rounded-lg hover:border-brand-primary hover:shadow-lg transition-all text-left group bg-gradient-to-br from-green-50 to-transparent"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition">
                                <PlusIcon className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-brand-text mb-2">
                                    Crear Nueva
                                </h2>
                                <p className="text-brand-secondary text-sm mb-4">
                                    Es mi primera vez y quiero crear una reserva
                                </p>
                                <div className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded inline-block">
                                    Necesitarás: Email + Nombre
                                </div>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Info Banner */}
                <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                        <strong>ℹ️ Nota:</strong> Ambas opciones requieren verificación. Una vez creada tu sesión, podrás ver, modificar y crear reservas.
                    </p>
                </div>
            </div>
        </div>
    );
};
