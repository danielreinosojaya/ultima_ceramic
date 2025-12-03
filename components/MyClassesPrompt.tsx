import React, { useEffect, useState } from 'react';
import { XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface MyClassesPromptProps {
    onViewClasses: () => void;
    onDismiss: () => void;
}

/**
 * MyClassesPrompt
 * 
 * Shows a prompt when the app loads if there's a saved booking in localStorage.
 * Encourages the client to view their classes and reschedule options.
 */
export const MyClassesPrompt: React.FC<MyClassesPromptProps> = ({ onViewClasses, onDismiss }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full shadow-xl overflow-hidden animate-in fade-in duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-brand-primary to-brand-accent p-6 relative">
                    <button
                        onClick={onDismiss}
                        className="absolute top-4 right-4 hover:opacity-75 transition-opacity"
                    >
                        <XMarkIcon className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <CalendarIcon className="w-6 h-6 text-white" />
                        <h2 className="text-xl font-bold text-white">¡Tienes Clases!</h2>
                    </div>
                    <p className="text-white/90 text-sm">Gestiona tus reservas y reagenda cuando sea necesario</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-brand-text">
                        Hemos encontrado que tienes clases programadas. ¿Deseas verlas o necesitas reagendar alguna?
                    </p>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-brand-secondary">
                            <strong>Recuerda:</strong> Puedes reagendar tus clases con al menos 72 horas de anticipación.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => {
                                // Mark as dismissed for this session
                                sessionStorage.setItem('myClassesPromptDismissed', 'true');
                                onDismiss();
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                        >
                            Más tarde
                        </button>
                        <button
                            onClick={onViewClasses}
                            className="flex-1 px-4 py-2 bg-brand-accent text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Ver mis Clases
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
