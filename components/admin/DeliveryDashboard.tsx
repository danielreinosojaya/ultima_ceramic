import React, { useMemo, useState } from 'react';
import type { Delivery } from '../../types';
import { InformationCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface DeliveryDashboardProps {
    deliveries: Delivery[];
    formatDate: (date: string) => string;
}

interface DeliveryGroup {
    label: string;
    emoji: string;
    color: string;
    bgColor: string;
    tooltip: string;
    deliveries: Delivery[];
    count: number;
    urgency: 'critical' | 'warning' | 'normal' | 'completed';
}

const tooltips: { [key: string]: string } = {
    'En Proceso': 'Piezas que aún no han sido completadas. El cliente está esperando que finalices la pieza.',
    'Lista para Recoger': 'Piezas finalizadas y listas para que el cliente las retire. Tienes 60 días desde esta fecha.',
    'Vencidas': 'Piezas que pasaron su fecha de finalización estimada sin ser completadas.',
    'Entregadas': 'Piezas que ya fueron entregadas al cliente.'
};

export const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({
    deliveries,
    formatDate
}) => {
    const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
        'En Proceso': true,
        'Lista para Recoger': false,
        'Vencidas': false,
        'Entregadas': false
    });

    const toggleGroup = (label: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };
    const groups = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const notStarted: Delivery[] = [];
        const readyForPickup: Delivery[] = [];
        const completed: Delivery[] = [];
        const overdue: Delivery[] = [];

        deliveries.forEach(delivery => {
            const scheduledDate = new Date(delivery.scheduledDate);
            scheduledDate.setHours(0, 0, 0, 0);
            const isOverdue = scheduledDate < today && delivery.status !== 'completed' && delivery.status !== 'ready';

            if (delivery.status === 'completed') {
                completed.push(delivery);
            } else if (delivery.status === 'ready') {
                readyForPickup.push(delivery);
            } else if (isOverdue) {
                overdue.push(delivery);
            } else {
                notStarted.push(delivery);
            }
        });

        const sortByDate = (a: Delivery, b: Delivery) => {
            return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        };

        return [
            {
                label: 'En Proceso',
                emoji: '📋',
                color: 'text-gray-600',
                bgColor: 'bg-gray-50',
                tooltip: tooltips['En Proceso'],
                deliveries: notStarted.sort(sortByDate),
                count: notStarted.length,
                urgency: 'normal' as const
            },
            {
                label: 'Lista para Recoger',
                emoji: '✨',
                color: 'text-purple-600',
                bgColor: 'bg-purple-50',
                tooltip: tooltips['Lista para Recoger'],
                deliveries: readyForPickup.sort(sortByDate),
                count: readyForPickup.length,
                urgency: readyForPickup.some(d => {
                    if (!d.readyAt) return false;
                    const readyDate = new Date(d.readyAt);
                    const expirationDate = new Date(readyDate);
                    expirationDate.setDate(expirationDate.getDate() + 60);
                    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntilExpiration <= 30;
                }) ? 'warning' as const : 'normal' as const
            },
            {
                label: 'Vencidas',
                emoji: '⚠️',
                color: 'text-red-600',
                bgColor: 'bg-red-50',
                tooltip: tooltips['Vencidas'],
                deliveries: overdue.sort(sortByDate),
                count: overdue.length,
                urgency: overdue.length > 0 ? 'critical' as const : 'normal' as const
            },
            {
                label: 'Entregadas',
                emoji: '✅',
                color: 'text-green-600',
                bgColor: 'bg-green-50',
                tooltip: tooltips['Entregadas'],
                deliveries: completed.sort((a, b) => 
                    new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
                ),
                count: completed.length,
                urgency: 'completed' as const
            }
        ] as DeliveryGroup[];
    }, [deliveries]);

    const totalByUrgency = useMemo(() => {
        return {
            critical: groups.filter(g => g.urgency === 'critical').reduce((sum, g) => sum + g.count, 0),
            warning: groups.filter(g => g.urgency === 'warning').reduce((sum, g) => sum + g.count, 0),
            normal: groups.filter(g => g.urgency === 'normal').reduce((sum, g) => sum + g.count, 0)
        };
    }, [groups]);

    // 🎨 Métricas de servicio de pintura
    const paintingMetrics = useMemo(() => {
        const wantsPaintingDeliveries = deliveries.filter(d => d.wantsPainting);
        const pendingPayment = wantsPaintingDeliveries.filter(d => d.paintingStatus === 'pending_payment');
        const paid = wantsPaintingDeliveries.filter(d => d.paintingStatus === 'paid');
        const readyToPaint = wantsPaintingDeliveries.filter(d => d.paintingStatus === 'paid' && d.status === 'ready');
        const scheduled = wantsPaintingDeliveries.filter(d => d.paintingStatus === 'scheduled');
        const completed = wantsPaintingDeliveries.filter(d => d.paintingStatus === 'completed');
        
        const totalRevenue = paid.reduce((sum, d) => sum + (d.paintingPrice || 0), 0) +
                            scheduled.reduce((sum, d) => sum + (d.paintingPrice || 0), 0) +
                            completed.reduce((sum, d) => sum + (d.paintingPrice || 0), 0);

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
            {/* Summary Cards with Tooltips */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {groups.slice(0, 4).map((group, idx) => (
                    <div
                        key={idx}
                        className={`rounded-lg p-3 border-2 group cursor-help relative ${
                            group.urgency === 'critical'
                                ? 'bg-red-50 border-red-300'
                                : group.urgency === 'warning'
                                ? 'bg-amber-50 border-amber-300'
                                : 'bg-white border-gray-200'
                        }`}
                        title={group.tooltip}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-2xl mb-1">{group.emoji}</div>
                                <div className="text-xs font-semibold text-gray-600 mb-1">{group.label}</div>
                                <div className={`text-2xl font-bold ${group.color}`}>{group.count}</div>
                            </div>
                            <InformationCircleIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                    </div>
                ))}
            </div>

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
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white rounded p-2 border border-purple-200">
                            <div className="text-xs text-gray-600">Pendiente Pago</div>
                            <div className="text-lg font-bold text-orange-600">{paintingMetrics.pendingPayment}</div>
                        </div>
                        <div className="bg-white rounded p-2 border border-purple-200">
                            <div className="text-xs text-gray-600">Listos a Pintar</div>
                            <div className="text-lg font-bold text-green-600">{paintingMetrics.readyToPaint}</div>
                        </div>
                        <div className="bg-white rounded p-2 border border-purple-200">
                            <div className="text-xs text-gray-600">Completados</div>
                            <div className="text-lg font-bold text-blue-600">{paintingMetrics.completed}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts */}
            {totalByUrgency.critical > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                    <p className="text-red-800 font-semibold text-sm">
                        🚨 {totalByUrgency.critical} entrega(s) vencida(s) - Requiere atención inmediata
                    </p>
                </div>
            )}

            {totalByUrgency.warning > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded">
                    <p className="text-amber-800 font-semibold text-sm">
                        ⏰ {totalByUrgency.warning} entrega(s) lista(s) próxima(s) a expirar (≤30 días)
                    </p>
                </div>
            )}

            {/* Collapsible Groups */}
            <div className="space-y-2">
                {groups.map((group, idx) => (
                    <div
                        key={idx}
                        className={`border-2 rounded-lg overflow-hidden transition-all ${
                            group.count > 0 ? 'border-gray-300' : 'border-gray-200'
                        } ${group.bgColor}`}
                    >
                        {/* Header */}
                        <button
                            onClick={() => toggleGroup(group.label)}
                            className="w-full px-4 py-2 flex items-center justify-between hover:bg-black/5 transition-colors text-left"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{group.emoji}</span>
                                <div>
                                    <h3 className={`text-xs font-bold ${group.color}`}>
                                        {group.label}
                                    </h3>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full font-bold text-xs text-white ${
                                    group.urgency === 'critical'
                                        ? 'bg-red-600'
                                        : group.urgency === 'warning'
                                        ? 'bg-amber-600'
                                        : group.urgency === 'completed'
                                        ? 'bg-green-600'
                                        : 'bg-gray-600'
                                }`}>
                                    {group.count}
                                </span>
                            </div>
                            {expandedGroups[group.label] ? (
                                <ChevronUpIcon className="w-4 h-4 text-gray-600" />
                            ) : (
                                <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                            )}
                        </button>

                        {/* Content (collapsible) */}
                        {expandedGroups[group.label] && group.count > 0 && (
                            <div className="px-4 py-2 border-t border-gray-300 space-y-1 bg-white/60">
                                {group.deliveries.slice(0, 5).map(delivery => (
                                    <div
                                        key={delivery.id}
                                        className="bg-white rounded p-1.5 text-xs border border-gray-200"
                                    >
                                        <div className="font-semibold text-gray-700 truncate">
                                            {delivery.description || 'Piezas de cerámica'}
                                        </div>
                                        <div className="text-gray-500 text-xs">
                                            {formatDate(delivery.scheduledDate)}
                                        </div>
                                    </div>
                                ))}
                                {group.deliveries.length > 5 && (
                                    <div className="text-xs text-gray-500 font-semibold p-1.5">
                                        +{group.deliveries.length - 5} más...
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Empty state */}
                        {expandedGroups[group.label] && group.count === 0 && (
                            <div className="px-4 py-2 border-t border-gray-300 text-xs text-gray-500 italic">
                                Sin entregas en esta categoría
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
