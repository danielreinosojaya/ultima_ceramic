import React from 'react';
import type { Delivery } from '../../types';
import { getPaintingFlowStep } from '../../utils/deliveryPaintingAdminGuide';

interface DeliveryTimelineProps {
    delivery: Delivery;
    formatDate: (date: string) => string;
}

export const DeliveryTimeline: React.FC<DeliveryTimelineProps> = ({
    delivery,
    formatDate
}) => {
    // Calculate durations
    const createdDate = new Date(delivery.createdAt);
    const readyDate = delivery.readyAt ? new Date(delivery.readyAt) : null;
    const completedDate = delivery.completedAt ? new Date(delivery.completedAt) : null;
    const scheduledDate = new Date(delivery.scheduledDate);

    const daysBetween = (from: Date, to: Date): number => {
        const diffTime = Math.abs(to.getTime() - from.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const daysFromCreatedToReady = readyDate ? daysBetween(createdDate, readyDate) : null;
    const daysFromReadyToCompleted = readyDate && completedDate ? daysBetween(readyDate, completedDate) : null;
    const daysFromCreatedToCompleted = completedDate ? daysBetween(createdDate, completedDate) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = scheduledDate < today && delivery.status !== 'completed' && delivery.status !== 'ready';

    // FLUJO CON SERVICIO DE PINTURA (5 pasos)
    if (delivery.wantsPainting) {
        const totalSteps = 5;
        const currentStep = getPaintingFlowStep(delivery);
        const ps = delivery.paintingStatus;
        const step3Active =
            ps === 'paid' || ps === 'deferred' || ps === 'scheduled' || ps === 'completed';
        
        return (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-300 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-purple-900">🎨 FLUJO CON SERVICIO DE PINTURA</span>
                    <div className="ml-auto flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm border border-purple-300">
                        <span className="text-xs font-semibold text-purple-600">Paso</span>
                        <span className="text-sm font-bold text-purple-700">{currentStep}/{totalSteps}</span>
                    </div>
                </div>
                <div className="text-[11px] text-purple-700 italic mb-4 bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200">
                    Cliente solicitó pintar su pieza en sesión privada de 2hrs · Precio: ${delivery.paintingPrice || 20}
                </div>

                <div className="relative space-y-1">
                    {/* Línea vertical */}
                    <div className="absolute left-[15px] top-8 bottom-8 w-0.5 bg-purple-200"></div>
                    
                    {/* PASO 1: Entrega Creada */}
                    <div className="relative flex gap-4 bg-white rounded-lg p-3 border-2 border-blue-500 shadow-sm">
                        <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-md z-10">✓</div>
                            <div className="w-1 h-16 bg-gradient-to-b from-blue-500 to-purple-500 mt-2 rounded-full"></div>
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-blue-900">📦 1. Entrega Creada</div>
                            <div className="text-xs text-gray-700 mt-1">📅 {formatDate(delivery.createdAt)}</div>
                        </div>
                    </div>

                    {/* PASO 2: Pieza Lista para Pintar */}
                    <div className={`relative flex gap-4 rounded-lg p-3 border-2 shadow-sm ${delivery.readyAt ? 'bg-white border-purple-500' : 'bg-gray-50 border-gray-300 opacity-70'}`}>
                        <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md z-10 ${delivery.readyAt ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white scale-110' : 'bg-gray-300 text-gray-600'}`}>
                                {delivery.readyAt ? '✓' : '2'}
                            </div>
                            {currentStep > 2 && <div className="w-1 h-16 bg-gradient-to-b from-purple-500 to-pink-500 mt-2 rounded-full"></div>}
                        </div>
                        <div className="flex-1">
                            <div className={`font-bold ${delivery.readyAt ? 'text-purple-900' : 'text-gray-500'}`}>
                                ✨ 2. Pieza Lista para Pintar
                            </div>
                            {delivery.readyAt ? (
                                <div className="text-xs text-purple-700 mt-1 font-medium">
                                    ✅ Lista desde {formatDate(delivery.readyAt)} · Cliente puede agendar sesión
                                </div>
                            ) : (
                                <div className="mt-2 flex items-start gap-2">
                                    <span className="text-lg">👉</span>
                                    <div className="text-xs text-orange-700 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-300">
                                        PENDIENTE: Terminar pieza y marcar como "Lista"
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PASO 3: Cliente Pinta su Pieza */}
                    <div className={`relative flex gap-4 rounded-lg p-3 border-2 shadow-sm ${delivery.paintingStatus === 'completed' ? 'bg-white border-pink-500' : step3Active ? 'bg-white border-pink-400' : 'bg-gray-50 border-gray-300 opacity-70'}`}>
                        <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md z-10 ${
                                delivery.paintingStatus === 'completed' ? 'bg-gradient-to-br from-pink-500 to-pink-600 text-white scale-110' :
                                step3Active ? 'bg-gradient-to-br from-pink-400 to-pink-500 text-white' :
                                'bg-gray-300 text-gray-600'
                            }`}>
                                {delivery.paintingStatus === 'completed' ? '✓' : step3Active ? '⏳' : '3'}
                            </div>
                            {currentStep > 3 && <div className="w-1 h-16 bg-gradient-to-b from-pink-500 to-orange-500 mt-2 rounded-full"></div>}
                        </div>
                        <div className="flex-1">
                            <div className={`font-bold ${delivery.paintingStatus === 'completed' ? 'text-pink-900' : step3Active ? 'text-pink-800' : 'text-gray-500'}`}>
                                🎨 3. Cliente Pinta su Pieza
                            </div>
                            {delivery.paintingStatus === 'pending_payment' && (
                                <div className="mt-2 space-y-1">
                                    <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-300 inline-block">
                                        💰 Cobro pendiente (${delivery.paintingPrice || 20})
                                    </div>
                                    <div className="text-xs text-orange-700 font-bold">
                                        👉 Admin: «Acordar cobro después» o «Registrar cobro» — luego agendar
                                    </div>

                                </div>
                            )}
                            
                            {delivery.paintingStatus === 'deferred' && !delivery.paintingBookingDate && (
                                <div className="mt-2 space-y-1">
                                    <div className="text-xs bg-sky-100 text-sky-900 px-2 py-1 rounded border border-sky-300 inline-block">
                                        📋 Cobro acordado para después (${delivery.paintingPrice || 20})
                                    </div>
                                    <div className="mt-1 flex items-start gap-2">
                                        <span className="text-lg">👉</span>
                                        <div className="text-xs text-orange-700 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-300">
                                            SIGUIENTE: Agendar sesión de pintura
                                        </div>
                                    </div>
                                </div>
                            )}

                            {delivery.paintingStatus === 'paid' && !delivery.paintingBookingDate && (
                                <div className="mt-2 space-y-1">
                                    <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded border border-green-300 inline-block">
                                        ✅ Pago recibido
                                    </div>
                                    <div className="mt-1 flex items-start gap-2">
                                        <span className="text-lg">👉</span>
                                        <div className="text-xs text-orange-700 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-300">
                                            SIGUIENTE: Agendar sesión de pintura con cliente
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 leading-snug mt-1">
                                        <strong>Sin cita en sistema pero ya pintó:</strong> no agendes una fecha ficticia. En la tarjeta de entregas, botón{' '}
                                        <span className="whitespace-nowrap">&quot;Ya pintó (sin cita en sistema)&quot;</span> para cerrar el paso 3 y seguir al horneado / aviso de retiro.
                                    </div>
                                </div>
                            )}
                            {delivery.paintingStatus === 'scheduled' && delivery.paintingBookingDate && (
                                <div className="mt-2 space-y-1">
                                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-300 inline-block">
                                        📅 Sesión agendada: {formatDate(delivery.paintingBookingDate)}
                                    </div>
                                    <div className="mt-1 flex items-start gap-2">
                                        <span className="text-lg">👉</span>
                                        <div className="text-xs text-orange-700 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-300">
                                            SIGUIENTE: Cliente debe venir a pintar · Después marcar como "Completada"
                                        </div>
                                    </div>
                                </div>
                            )}
                            {delivery.paintingStatus === 'completed' && (
                                <div className="text-xs text-pink-700 mt-1 font-semibold">
                                    ✅ Cliente terminó de pintar · Pieza pasa a horneado final
                                </div>
                            )}
                            {!delivery.paintingStatus && (
                                <div className="text-xs text-gray-500 mt-1 italic">Disponible después de marcar pieza como "Lista"</div>
                            )}
                        </div>
                    </div>

                    {/* PASO 4: Pieza Horneada y Lista para Retirar */}
                    <div className={`relative flex gap-4 rounded-lg p-3 border-2 shadow-sm ${delivery.paintingPickupNotifiedAt ? 'bg-white border-green-500' : 'bg-gray-50 border-gray-300 opacity-70'}`}>
                        <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md z-10 ${delivery.paintingPickupNotifiedAt ? 'bg-gradient-to-br from-green-500 to-green-600 text-white scale-110' : 'bg-gray-300 text-gray-600'}`}>
                                {delivery.paintingPickupNotifiedAt ? '✓' : '4'}
                            </div>
                            {currentStep > 4 && <div className="w-1 h-16 bg-gradient-to-b from-green-500 to-blue-500 mt-2 rounded-full"></div>}
                        </div>
                        <div className="flex-1">
                            <div className={`font-bold ${delivery.paintingPickupNotifiedAt ? 'text-green-900' : 'text-gray-500'}`}>
                                🔥 4. Horneado Final Completo
                            </div>
                            {delivery.paintingPickupNotifiedAt ? (
                                <div className="text-xs text-green-700 mt-1 font-medium space-y-1">
                                    <div className="flex items-center gap-1">
                                        <span>✅</span>
                                        <span>Cliente notificado {formatDate(delivery.paintingPickupNotifiedAt)}</span>
                                    </div>
                                    <div className="bg-green-50 px-2 py-1 rounded border border-green-200 inline-block">
                                        📧 Email enviado: "Tu pieza pintada está lista para recoger"
                                    </div>
                                </div>
                            ) : delivery.paintingStatus === 'completed' ? (
                                <div className="mt-2 space-y-2">
                                    <div className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-300 inline-flex items-center gap-1">
                                        <span>⏳</span>
                                        <span className="font-semibold">Pieza en horno (horneado final)</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg">👉</span>
                                        <div className="text-xs text-green-700 font-bold bg-green-50 px-3 py-2 rounded border-2 border-green-300 animate-pulse">
                                            <div className="font-bold mb-1">ACCIÓN REQUERIDA:</div>
                                            <div>1. Espera que pieza salga del horno</div>
                                            <div>2. Click botón verde "🔥 Horneado Completo → Avisar Cliente"</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-gray-500 mt-1 italic">Disponible después de completar sesión de pintura</div>
                            )}
                        </div>
                    </div>

                    {/* PASO 5: Cliente Retira Pieza */}
                    <div className={`relative flex gap-4 rounded-lg p-3 border-2 shadow-sm ${delivery.status === 'completed' ? 'bg-white border-green-500' : 'bg-gray-50 border-gray-300 opacity-70'}`}>
                        <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md z-10 ${delivery.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white scale-110' : 'bg-gray-300 text-gray-600'}`}>
                                {delivery.status === 'completed' ? '✓' : '5'}
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className={`font-bold ${delivery.status === 'completed' ? 'text-green-900' : 'text-gray-500'}`}>
                                ✅ 5. Cliente Retiró Pieza Pintada
                            </div>
                            {delivery.status === 'completed' && delivery.completedAt ? (
                                <>
                                    <div className="text-xs text-green-700 mt-1 font-medium">📅 {formatDate(delivery.completedAt)}</div>
                                    {daysFromCreatedToCompleted !== null && (
                                        <div className="text-xs text-green-600 mt-1 bg-green-50 px-2 py-1 rounded border border-green-200 inline-block">
                                            📊 Ciclo completo: {daysFromCreatedToCompleted} día(s)
                                        </div>
                                    )}
                                </>
                            ) : delivery.paintingPickupNotifiedAt ? (
                                <div className="text-xs text-gray-600 mt-1 italic">Esperando que cliente venga a retirar</div>
                            ) : (
                                <div className="text-xs text-gray-500 mt-1 italic">Disponible después de notificar retiro</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Resumen */}
                <div className="mt-4 pt-3 border-t-2 border-purple-200 text-xs bg-purple-50 rounded-lg p-3">
                    <div className="font-bold text-purple-900 mb-2">📋 Resumen del Proceso</div>
                    <div className="space-y-1 text-purple-800">
                        <div>• Fecha programada entrega pieza: <strong>{formatDate(delivery.scheduledDate)}</strong></div>
                        {delivery.paintingBookingDate && (
                            <div>• Sesión de pintura agendada: <strong>{formatDate(delivery.paintingBookingDate)}</strong></div>
                        )}
                        <div>• Estado actual: <strong className="text-purple-900">Paso {currentStep} de {totalSteps}</strong></div>
                    </div>
                </div>
            </div>
        );
    }

    // FLUJO NORMAL SIN PINTURA (3 pasos)
    const currentStep = delivery.completedAt ? 3 : delivery.readyAt ? 2 : 1;

    return (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-5 border-2 border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
                <span className="text-lg font-bold text-gray-800">📍 Seguimiento del Proceso</span>
                <div className="ml-auto flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
                    <span className="text-xs font-semibold text-gray-600">Paso</span>
                    <span className="text-sm font-bold text-blue-600">{currentStep}/3</span>
                </div>
            </div>

            {/* Timeline visualization con mejor jerarquía visual */}
            <div className="relative space-y-1">
                {/* Línea vertical continua de fondo */}
                <div className="absolute left-[15px] top-8 bottom-8 w-0.5 bg-gray-300"></div>
                
                {/* Step 1: Created */}
                <div className="relative flex gap-4 bg-white rounded-lg p-3 border-2 border-blue-500 shadow-sm">
                    <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-md z-10">
                            ✓
                        </div>
                        {currentStep > 1 && (
                            <div className="w-1 h-16 bg-gradient-to-b from-blue-500 to-purple-500 mt-2 rounded-full"></div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-blue-900 flex items-center gap-2">
                            <span>📦 Entrega Creada</span>
                            {delivery.createdByClient && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                    CLIENTE
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-700 mt-1 font-medium">
                            📅 {formatDate(delivery.createdAt)}
                        </div>
                        {delivery.createdByClient && (
                            <div className="text-xs text-blue-600 mt-1 font-semibold flex items-center gap-1">
                                <span>👤</span>
                                <span>Cliente subió fotos vía QR</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 2: Ready for Pickup */}
                <div className={`relative flex gap-4 rounded-lg p-3 border-2 shadow-sm transition-all ${
                    delivery.readyAt
                        ? 'bg-white border-purple-500'
                        : 'bg-gray-50 border-gray-300 opacity-75'
                }`}>
                    <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md z-10 transition-all ${
                            delivery.readyAt
                                ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white scale-110'
                                : 'bg-gray-300 text-gray-600'
                        }`}>
                            {delivery.readyAt ? '✓' : '2'}
                        </div>
                        {currentStep > 2 && (
                            <div className="w-1 h-16 bg-gradient-to-b from-purple-500 to-green-500 mt-2 rounded-full"></div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={`font-bold flex items-center gap-2 ${
                            delivery.readyAt ? 'text-purple-900' : 'text-gray-500'
                        }`}>
                            {delivery.readyAt ? '✨ Lista para Recoger' : '⏳ Pendiente: Marcar como Lista'}
                        </div>
                        {delivery.readyAt ? (
                            <>
                                <div className="text-xs text-gray-700 mt-1 font-medium">
                                    📅 {formatDate(delivery.readyAt)}
                                </div>
                                {daysFromCreatedToReady !== null && (
                                    <div className="text-xs text-purple-600 mt-1 font-semibold flex items-center gap-1">
                                        <span>⏱️</span>
                                        <span>Procesado en {daysFromCreatedToReady} día(s)</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="mt-2 flex items-start gap-2">
                                <span className="text-xl">👉</span>
                                <div className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-300">
                                    ACCIÓN REQUERIDA: Marcar delivery como lista
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 3: Completed */}
                <div className={`relative flex gap-4 rounded-lg p-3 border-2 shadow-sm transition-all ${
                    delivery.completedAt
                        ? 'bg-white border-green-500'
                        : 'bg-gray-50 border-gray-300 opacity-75'
                }`}>
                    <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md z-10 transition-all ${
                            delivery.completedAt
                                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white scale-110'
                                : 'bg-gray-300 text-gray-600'
                        }`}>
                            {delivery.completedAt ? '✓' : '3'}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={`font-bold flex items-center gap-2 ${
                            delivery.completedAt ? 'text-green-900' : 'text-gray-500'
                        }`}>
                            {delivery.completedAt ? '✅ Entregada al Cliente' : '⏳ Pendiente: Marcar como Completada'}
                        </div>
                        {delivery.completedAt ? (
                            <>
                                <div className="text-xs text-gray-700 mt-1 font-medium">
                                    📅 {formatDate(delivery.completedAt)}
                                </div>
                                <div className="text-xs text-green-600 mt-2 space-y-1 font-semibold">
                                    {daysFromReadyToCompleted !== null && (
                                        <div className="flex items-center gap-1">
                                            <span>⏱️</span>
                                            <span>Retirado {daysFromReadyToCompleted} día(s) después de notificación</span>
                                        </div>
                                    )}
                                    {daysFromCreatedToCompleted !== null && (
                                        <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded border border-green-200">
                                            <span>📊</span>
                                            <span>Ciclo completo: {daysFromCreatedToCompleted} día(s)</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : delivery.readyAt ? (
                            <div className="mt-2 flex items-start gap-2">
                                <span className="text-xl">👉</span>
                                <div className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-300">
                                    ACCIÓN REQUERIDA: Cliente debe retirar pieza
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-500 mt-1 italic">
                                Disponible después de marcar como "Lista"
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Additional info - Resumen */}
            <div className="mt-5 pt-4 border-t-2 border-gray-200 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white rounded-lg p-2 border border-gray-200">
                    <div className="text-gray-600 font-semibold mb-1">📆 Fecha Programada</div>
                    <div className={`font-bold ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                        {formatDate(delivery.scheduledDate)}
                        {isOverdue && (
                            <div className="mt-1 text-red-600 animate-pulse flex items-center gap-1">
                                <span>⚠️</span>
                                <span>VENCIDA</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-gray-200">
                    <div className="text-gray-600 font-semibold mb-1">📊 Estado Actual</div>
                    <div className="font-bold">
                        {delivery.status === 'pending' && <span className="text-orange-600">📋 En Proceso</span>}
                        {delivery.status === 'ready' && <span className="text-purple-600">✨ Lista</span>}
                        {delivery.status === 'completed' && <span className="text-green-600">✅ Entregada</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};
