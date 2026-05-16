import React from 'react';
import type { Delivery } from '../../types';
import {
    DeliveryPaintingFlowTimeline,
    type DeliveryPaintingFlowActions,
} from './DeliveryPaintingFlowTimeline';

interface DeliveryTimelineProps {
    delivery: Delivery;
    formatDate: (date: string) => string;
    paintingActions?: DeliveryPaintingFlowActions;
}

export const DeliveryTimeline: React.FC<DeliveryTimelineProps> = ({
    delivery,
    formatDate,
    paintingActions,
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

    // FLUJO CON SERVICIO DE PINTURA (5 pasos) — acciones en cada tarjeta del paso
    if (delivery.wantsPainting) {
        return (
            <DeliveryPaintingFlowTimeline
                delivery={delivery}
                formatDate={formatDate}
                actions={paintingActions}
            />
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
