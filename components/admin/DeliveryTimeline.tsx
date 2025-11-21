import React from 'react';
import type { Delivery } from '../../types';

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

    return (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 my-4">
            <h4 className="font-semibold text-brand-text mb-4">📍 Seguimiento del Proceso</h4>

            {/* Timeline visualization */}
            <div className="space-y-4">
                {/* Step 1: Created */}
                <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm font-bold">
                            1
                        </div>
                        <div className="w-1 h-12 bg-brand-primary mt-2"></div>
                    </div>
                    <div className="pb-4">
                        <div className="font-semibold text-brand-text">Entrega Creada</div>
                        <div className="text-xs text-gray-600 mt-1">
                            {formatDate(delivery.createdAt)}
                        </div>
                        {delivery.createdByClient && (
                            <div className="text-xs text-blue-600 mt-1 font-semibold">
                                👤 Subida por cliente
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 2: Ready for Pickup */}
                <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            delivery.readyAt
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-300 text-gray-600'
                        }`}>
                            2
                        </div>
                        {delivery.completedAt && (
                            <div className="w-1 h-12 bg-green-500 mt-2"></div>
                        )}
                    </div>
                    <div className="pb-4">
                        <div className={`font-semibold ${
                            delivery.readyAt ? 'text-purple-600' : 'text-gray-500'
                        }`}>
                            {delivery.readyAt ? '✨ Lista para Recoger' : '⏳ Pendiente: Marcar como Lista'}
                        </div>
                        {delivery.readyAt ? (
                            <>
                                <div className="text-xs text-gray-600 mt-1">
                                    {formatDate(delivery.readyAt)}
                                </div>
                                {daysFromCreatedToReady !== null && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        ⏱️ Tiempo desde creación: {daysFromCreatedToReady} día(s)
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-xs text-orange-600 mt-1 font-semibold">
                                📌 Acción pendiente del admin
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 3: Completed */}
                <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            delivery.completedAt
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-300 text-gray-600'
                        }`}>
                            3
                        </div>
                    </div>
                    <div>
                        <div className={`font-semibold ${
                            delivery.completedAt ? 'text-green-600' : 'text-gray-500'
                        }`}>
                            {delivery.completedAt ? '✅ Entregada' : '⏳ Pendiente: Marcar como Completada'}
                        </div>
                        {delivery.completedAt ? (
                            <>
                                <div className="text-xs text-gray-600 mt-1">
                                    {formatDate(delivery.completedAt)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 space-y-1">
                                    {daysFromReadyToCompleted !== null && (
                                        <div>⏱️ Tiempo desde lista: {daysFromReadyToCompleted} día(s)</div>
                                    )}
                                    {daysFromCreatedToCompleted !== null && (
                                        <div>📊 Tiempo total: {daysFromCreatedToCompleted} día(s)</div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-xs text-orange-600 mt-1 font-semibold">
                                📌 Acción pendiente del admin
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Additional info */}
            <div className="mt-6 pt-4 border-t border-gray-300 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Fecha Programada:</span>
                    <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                        {formatDate(delivery.scheduledDate)}
                        {isOverdue && ' ⚠️ VENCIDA'}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Estado Actual:</span>
                    <span className="font-semibold capitalize">
                        {delivery.status === 'pending' && '📋 Sin comenzar'}
                        {delivery.status === 'ready' && '✨ Lista para recoger'}
                        {delivery.status === 'completed' && '✅ Entregada'}
                        {delivery.status === 'overdue' && '⚠️ Vencida'}
                    </span>
                </div>
            </div>
        </div>
    );
};
