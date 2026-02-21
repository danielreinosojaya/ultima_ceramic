import React, { useMemo, useState, useEffect } from 'react';
import type { Customer, Delivery } from '../../types';
import * as dataService from '../../services/dataService';

interface DeliveryMetricsProps {
    customers: Customer[];
}

interface DeliveryStats {
    total: number;
    pending: number;
    ready: number;
    completed: number;
    delivered: number;
    overdue: number;
    uniqueCustomers: number;
}

export const DeliveryMetrics: React.FC<DeliveryMetricsProps> = ({ customers }) => {
    const [stats, setStats] = useState<DeliveryStats | null>(null);
    const [loading, setLoading] = useState(true);

    // ⚡ NUEVO: Cargar conteos globales desde el backend (sin límite)
    useEffect(() => {
        const loadStats = async () => {
            try {
                const globalStats = await dataService.getDeliveryStats();
                if (globalStats) {
                    setStats(globalStats);
                }
            } catch (error) {
                console.error('Error loading delivery stats:', error);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    // Fallback a cálculos locales si no se cargan los stats globales
    const metrics = useMemo(() => {
        if (stats) {
            // Usar stats globales (números reales sin limite)
            return {
                totalDeliveries: stats.total,
                pendingDeliveries: stats.pending,
                readyDeliveries: stats.ready,
                completedDeliveries: stats.completed,
                deliveredDeliveries: stats.delivered,
                overdueDeliveries: stats.overdue,
                customersWithDeliveries: stats.uniqueCustomers,
                customersWithPending: 0, // No disponible en stats global (cálculo local no es exacto con limit)
                customersWithOverdue: 0  // No disponible en stats global
            };
        }

        // Fallback: calcular sobre datos locales (limitados)
        const allDeliveries = customers.flatMap(c => c.deliveries || []);
        const today = new Date();
        
        const totalDeliveries = allDeliveries.length;
        const pendingDeliveries = allDeliveries.filter(d => d.status === 'pending').length;
        const readyDeliveries = allDeliveries.filter(d => d.status === 'ready').length;
        const completedDeliveries = allDeliveries.filter(d => d.status === 'completed').length;
        const deliveredDeliveries = allDeliveries.filter(d => d.status === 'delivered').length;
        const overdueDeliveries = allDeliveries.filter(d => {
            const scheduledDate = new Date(d.scheduledDate);
            return d.status === 'pending' && scheduledDate < today;
        }).length;
        
        const customersWithDeliveries = customers.filter(c => (c.deliveries?.length || 0) > 0).length;
        const customersWithPending = customers.filter(c => 
            (c.deliveries || []).some(d => d.status === 'pending')
        ).length;
        const customersWithOverdue = customers.filter(c => 
            (c.deliveries || []).some(d => {
                const scheduledDate = new Date(d.scheduledDate);
                return d.status === 'pending' && scheduledDate < today;
            })
        ).length;

        return {
            totalDeliveries,
            pendingDeliveries,
            readyDeliveries,
            completedDeliveries,
            deliveredDeliveries,
            overdueDeliveries,
            customersWithDeliveries,
            customersWithPending,
            customersWithOverdue
        };
    }, [customers, stats]);

    if (metrics.totalDeliveries === 0) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-bold text-blue-900 mb-2">📦 Entregas</h3>
                <p className="text-blue-700 text-sm">No hay entregas programadas actualmente.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-brand-text mb-4 flex items-center gap-2">
                <span className="text-2xl">📦</span>
                Resumen de Entregas
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-brand-primary">{metrics.totalDeliveries}</div>
                    <div className="text-sm text-brand-secondary">Total entregas</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{metrics.pendingDeliveries}</div>
                    <div className="text-sm text-brand-secondary">Pendientes</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{metrics.completedDeliveries}</div>
                    <div className="text-sm text-brand-secondary">Completadas</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{metrics.overdueDeliveries}</div>
                    <div className="text-sm text-brand-secondary">Vencidas</div>
                </div>
            </div>

            <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-brand-secondary">Clientes con entregas:</span>
                        <span className="font-semibold text-brand-text">{metrics.customersWithDeliveries}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-brand-secondary">Con entregas pendientes:</span>
                        <span className="font-semibold text-yellow-600">{metrics.customersWithPending}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-brand-secondary">Con entregas vencidas:</span>
                        <span className="font-semibold text-red-600">{metrics.customersWithOverdue}</span>
                    </div>
                </div>
            </div>

            {metrics.overdueDeliveries > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-red-600 font-bold">⚠️</span>
                        <span className="text-red-800 font-semibold">
                            Hay {metrics.overdueDeliveries} entrega{metrics.overdueDeliveries > 1 ? 's' : ''} vencida{metrics.overdueDeliveries > 1 ? 's' : ''} que requieren atención
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};