import React from 'react';
import { HeartIcon, CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/solid';

interface ValentineSuccessProps {
    registrationId: string;
    onDone: () => void;
}

export const ValentineSuccess: React.FC<ValentineSuccessProps> = ({ registrationId, onDone }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-rose-100 py-8 px-4 flex items-center justify-center">
            <div className="max-w-lg w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-rose-100">
                    {/* Icono de éxito */}
                    <div className="mb-6">
                        <div className="mx-auto w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircleIcon className="w-12 h-12 text-white" />
                        </div>
                    </div>

                    {/* Título */}
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
                        ¡Inscripción Recibida! 🎉
                    </h1>

                    {/* Código de inscripción */}
                    <div className="bg-rose-50 rounded-xl p-4 mb-6 border border-rose-200">
                        <p className="text-sm text-gray-600 mb-1">Tu código de inscripción:</p>
                        <p className="text-2xl font-bold text-rose-600 tracking-wide">{registrationId}</p>
                    </div>

                    {/* Mensaje */}
                    <div className="text-left bg-gray-50 rounded-xl p-5 mb-6">
                        <div className="flex items-start gap-3 mb-4">
                            <EnvelopeIcon className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-gray-700 font-medium">Revisa tu correo electrónico</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Te enviamos un email de confirmación con los detalles de tu inscripción.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <HeartIcon className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-gray-700 font-medium">Próximo paso</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Estamos revisando tu comprobante de pago. Te notificaremos por email cuando esté confirmado.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Recordatorio */}
                    <div className="bg-gradient-to-r from-rose-100 to-pink-100 rounded-xl p-4 mb-6 border border-rose-200">
                        <p className="text-rose-700 font-medium text-sm">
                            💕 Te esperamos el 14 de febrero
                        </p>
                        <p className="text-rose-600 text-xs mt-1">
                            ¡Tendremos sorpresas y sorteos increíbles!
                        </p>
                    </div>

                    {/* Botón */}
                    <button
                        onClick={onDone}
                        className="w-full py-3 px-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg hover:from-rose-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                    >
                        <HeartIcon className="w-5 h-5" />
                        Volver al Inicio
                    </button>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-gray-500 text-sm">
                    <p>¿Preguntas? Contáctanos</p>
                    <p className="mt-1">📧 cmassuh@ceramicalma.com · 📱 +593 98 581 3327</p>
                </div>
            </div>
        </div>
    );
};
