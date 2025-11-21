import React, { useState } from 'react';
import type { Delivery } from '../../types';
import { DeliveryDashboard } from './DeliveryDashboard';
import { DeliveryListWithFilters } from './DeliveryListWithFilters';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface DeliveryPanelProps {
    deliveries: Delivery[];
    onEdit: (delivery: Delivery) => void;
    onDelete: (delivery: Delivery) => void;
    onComplete: (deliveryId: string) => void;
    onMarkReady: (deliveryId: string) => void;
    formatDate: (date: string) => string;
}

export const DeliveryPanel: React.FC<DeliveryPanelProps> = ({
    deliveries,
    onEdit,
    onDelete,
    onComplete,
    onMarkReady,
    formatDate
}) => {
    const [showDashboard, setShowDashboard] = useState(true);

    // Calculate total pending actions
    const totalPendingActions = deliveries.filter(d => 
        (d.status === 'pending' && !d.readyAt) ||
        (d.status === 'ready' && !d.completedAt)
    ).length;

    return (
        <div className="space-y-6">
            {/* Header with Dashboard Toggle */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-brand-text flex items-center gap-3">
                    <span>📦 Gestión de Entregas</span>
                    {totalPendingActions > 0 && (
                        <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm font-bold">
                            ⚠️ {totalPendingActions} acción(es) pendiente(s)
                        </span>
                    )}
                </h2>
                <button
                    onClick={() => setShowDashboard(!showDashboard)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors font-semibold text-sm"
                >
                    {showDashboard ? (
                        <>
                            <ChevronUpIcon className="w-4 h-4" />
                            Ocultar Dashboard
                        </>
                    ) : (
                        <>
                            <ChevronDownIcon className="w-4 h-4" />
                            Mostrar Dashboard
                        </>
                    )}
                </button>
            </div>

            {/* Dashboard - Overview */}
            {showDashboard && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-bold text-brand-text mb-4">📊 Vista General - Sin Entrar en Clientes</h3>
                    <DeliveryDashboard deliveries={deliveries} formatDate={formatDate} />
                </div>
            )}

            {/* Detailed List with Filters */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-brand-text mb-4">📋 Listado Detallado</h3>
                <DeliveryListWithFilters
                    deliveries={deliveries}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onComplete={onComplete}
                    onMarkReady={onMarkReady}
                    formatDate={formatDate}
                />
            </div>
        </div>
    );
};
