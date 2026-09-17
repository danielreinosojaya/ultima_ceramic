import React, { useMemo } from 'react';
import type { Delivery } from '../../types';
import { daysUntilReadyExpiration } from '../../utils/deliveryDateCalculator';

interface DeliveryDashboardProps {
    deliveries: Delivery[];
    formatDate: (date: string) => string;
}

export const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({
    deliveries,
    formatDate
}) => {
    // Calcular totales para alertas críticas
    const urgencyMetrics = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let criticalCount = 0;
        let warningCount = 0;

        deliveries.forEach(delivery => {
            const scheduledDate = new Date(delivery.scheduledDate);
            scheduledDate.setHours(0, 0, 0, 0);
            
            // Critical: vencidas (pasaron scheduled_date sin completarse)
            if (scheduledDate < today && delivery.status !== 'completed' && delivery.status !== 'ready') {
                criticalCount++;
            }
            
            // Warning: listas para recoger próximas a expirar (≤30 días del plazo de 3 meses)
            if (delivery.readyAt && delivery.status !== 'completed') {
                const daysUntilExpiration = daysUntilReadyExpiration(delivery.readyAt);
                if (daysUntilExpiration <= 30) {
                    warningCount++;
                }
            }
        });

        return { criticalCount, warningCount };
    }, [deliveries]);

    // 🎨 Métricas de servicio de pintura
    const paintingMetrics = useMemo(() => {
        const wantsPaintingDeliveries = deliveries.filter(d => d.wantsPainting);
        const pendingPayment = wantsPaintingDeliveries.filter(d => d.paintingStatus === 'pending_payment');
        const paid = wantsPaintingDeliveries.filter(d => d.paintingStatus === 'paid');
        const readyToPaint = wantsPaintingDeliveries.filter(d => d.paintingStatus === 'paid' && d.status === 'ready');
        const scheduled = wantsPaintingDeliveries.filter(d => d.paintingStatus === 'scheduled');
        const completed = wantsPaintingDeliveries.filter(d => d.paintingStatus === 'completed');
        
        const totalRevenue = paid.reduce((sum, d) => sum + (parseFloat(d.paintingPrice as any) || 0), 0) +
                            scheduled.reduce((sum, d) => sum + (parseFloat(d.paintingPrice as any) || 0), 0) +
                            completed.reduce((sum, d) => sum + (parseFloat(d.paintingPrice as any) || 0), 0);

        return {
            total: wantsPaintingDeliveries.length,
            pendingPayment: pendingPayment.length,
            paid: paid.length,
            readyToPaint: readyToPaint.length,
            scheduled: scheduled.length,
            completed: completed.length,
            totalRevenue
        };
    }, [deliveries]);

    return (
        <div className="space-y-4">
            {/* 🎨 Servicio de Pintura Card (si hay upsells) */}
            {paintingMetrics.total > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">🎨</span>
                        <div>
                            <h3 className="text-sm font-bold text-purple-900">Servicio de Pintura (Upsells)</h3>
                            <p className="text-xs text-purple-700">Ingresos adicionales: <strong className="text-brand-primary">${paintingMetrics.totalRevenue.toFixed(2)}</strong></p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-white rounded p-2 border border-purple-200">
                            <div className="text-xs text-gray-600">Pendiente Pago</div>
                            <div className="text-lg font-bold text-orange-600">{paintingMetrics.pendingPayment}</div>
                        </div>
                        <div className="bg-white rounded p-2 border border-purple-200">
                            <div className="text-xs text-gray-600">Pagado (activo)</div>
                            <div className="text-lg font-bold text-emerald-700">{paintingMetrics.paid}</div>
                            {paintingMetrics.readyToPaint > 0 && (
                                <div className="text-[10px] text-gray-500">Listos a pintar: {paintingMetrics.readyToPaint}</div>
                            )}
                        </div>
                        <div className="bg-white rounded p-2 border border-purple-200">
                            <div className="text-xs text-gray-600">Agendados</div>
                            <div className="text-lg font-bold text-blue-700">{paintingMetrics.scheduled}</div>
                        </div>
                        <div className="bg-white rounded p-2 border border-purple-200">
                            <div className="text-xs text-gray-600">Completados</div>
                            <div className="text-lg font-bold text-indigo-700">{paintingMetrics.completed}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts */}
            {urgencyMetrics.criticalCount > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                    <p className="text-red-800 font-semibold text-sm">
                        🚨 {urgencyMetrics.criticalCount} entrega(s) vencida(s) - Requiere atención inmediata
                    </p>
                </div>
            )}

            {urgencyMetrics.warningCount > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded">
                    <p className="text-amber-800 font-semibold text-sm">
                        ⏰ {urgencyMetrics.warningCount} entrega(s) lista(s) próxima(s) a expirar (≤30 días)
                    </p>
                </div>
            )}
        </div>
    );
};

export default DeliveryDashboard;
