import React, { useState, useMemo } from 'react';
import type { Delivery } from '../../types';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface DeliveryListWithFiltersProps {
    deliveries: Delivery[];
    onEdit: (delivery: Delivery) => void;
    onDelete: (delivery: Delivery) => void;
    onComplete: (deliveryId: string) => void;
    onMarkReady: (deliveryId: string) => void;
    formatDate: (date: string) => string;
}

type FilterStatus = 'all' | 'pending' | 'completed' | 'overdue';

export const DeliveryListWithFilters: React.FC<DeliveryListWithFiltersProps> = ({
    deliveries,
    onEdit,
    onDelete,
    onComplete,
    onMarkReady,
    formatDate
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [showFilters, setShowFilters] = useState(false);

    const filteredDeliveries = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return deliveries.filter(delivery => {
            // Search filter
            const matchesSearch = searchQuery.trim() === '' || 
                delivery.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                delivery.notes?.toLowerCase().includes(searchQuery.toLowerCase());

            // Status filter
            let matchesStatus = true;
            if (filterStatus === 'pending') {
                matchesStatus = delivery.status === 'pending';
            } else if (filterStatus === 'completed') {
                matchesStatus = delivery.status === 'completed';
            } else if (filterStatus === 'overdue') {
                const scheduledDate = new Date(delivery.scheduledDate);
                scheduledDate.setHours(0, 0, 0, 0);
                matchesStatus = delivery.status === 'pending' && scheduledDate < today;
            }

            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            // Sort: overdue first, then by scheduled date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const aDate = new Date(a.scheduledDate);
            const bDate = new Date(b.scheduledDate);
            aDate.setHours(0, 0, 0, 0);
            bDate.setHours(0, 0, 0, 0);
            
            const aOverdue = a.status === 'pending' && aDate < today;
            const bOverdue = b.status === 'pending' && bDate < today;
            
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;
            
            // Both same priority, sort by date (closest first)
            return aDate.getTime() - bDate.getTime();
        });
    }, [deliveries, searchQuery, filterStatus]);

    const statusCounts = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return {
            all: deliveries.length,
            pending: deliveries.filter(d => d.status === 'pending').length,
            completed: deliveries.filter(d => d.status === 'completed').length,
            overdue: deliveries.filter(d => {
                const scheduledDate = new Date(d.scheduledDate);
                scheduledDate.setHours(0, 0, 0, 0);
                return d.status === 'pending' && scheduledDate < today;
            }).length
        };
    }, [deliveries]);

    const getStatusBadge = (delivery: Delivery) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledDate = new Date(delivery.scheduledDate);
        scheduledDate.setHours(0, 0, 0, 0);
        
        const isOverdue = delivery.status === 'pending' && scheduledDate < today;
        
        if (isOverdue) {
            return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Vencida</span>;
        }
        
        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                delivery.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
            }`}>
                {delivery.status === 'completed' ? 'Completada' : 'Pendiente'}
            </span>
        );
    };

    return (
        <div className="space-y-4">
            {/* Search and Filters Header */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Box */}
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por descripción o notas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Filter Toggle Button */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg font-semibold transition-colors ${
                        showFilters || filterStatus !== 'all'
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    <FunnelIcon className="h-5 w-5" />
                    Filtros
                    {filterStatus !== 'all' && (
                        <span className="ml-1 px-2 py-0.5 bg-white text-brand-primary rounded-full text-xs font-bold">
                            1
                        </span>
                    )}
                </button>
            </div>

            {/* Filter Pills */}
            {showFilters && (
                <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            filterStatus === 'all'
                                ? 'bg-brand-primary text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                    >
                        Todas ({statusCounts.all})
                    </button>
                    <button
                        onClick={() => setFilterStatus('pending')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            filterStatus === 'pending'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                    >
                        Pendientes ({statusCounts.pending})
                    </button>
                    <button
                        onClick={() => setFilterStatus('completed')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            filterStatus === 'completed'
                                ? 'bg-green-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                    >
                        Completadas ({statusCounts.completed})
                    </button>
                    {statusCounts.overdue > 0 && (
                        <button
                            onClick={() => setFilterStatus('overdue')}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                filterStatus === 'overdue'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-white text-red-700 hover:bg-red-50 border border-red-300'
                            }`}
                        >
                            ⚠️ Vencidas ({statusCounts.overdue})
                        </button>
                    )}
                </div>
            )}

            {/* Results Count */}
            <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                    Mostrando <strong>{filteredDeliveries.length}</strong> de <strong>{deliveries.length}</strong> entregas
                </span>
                {(searchQuery || filterStatus !== 'all') && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setFilterStatus('all');
                        }}
                        className="text-brand-primary hover:text-brand-secondary font-semibold"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Deliveries List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                {filteredDeliveries.length > 0 ? filteredDeliveries.map((delivery) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const scheduledDate = new Date(delivery.scheduledDate);
                    scheduledDate.setHours(0, 0, 0, 0);
                    const isOverdue = delivery.status === 'pending' && scheduledDate < today;

                    return (
                        <div 
                            key={delivery.id} 
                            className={`p-6 border-b last:border-b-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                                isOverdue ? 'bg-red-50' : ''
                            }`}
                        >
                            <div className="flex-1">
                                <p className="font-bold text-lg text-brand-text mb-1 flex items-center gap-2">
                                    {delivery.description}
                                    {getStatusBadge(delivery)}
                                </p>
                                <p className="text-sm text-brand-secondary mb-1">
                                    📅 Fecha programada: <strong>{formatDate(delivery.scheduledDate)}</strong>
                                </p>
                                {delivery.readyAt && (
                                    (() => {
                                        const readyDate = new Date(delivery.readyAt);
                                        const expirationDate = new Date(readyDate);
                                        expirationDate.setMonth(expirationDate.getMonth() + 3);
                                        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                        const isExpiringSoon = daysUntilExpiration <= 30 && daysUntilExpiration > 0;
                                        const isExpired = daysUntilExpiration <= 0;
                                        
                                        return (
                                            <div className="text-sm mb-1 flex items-center gap-2 flex-wrap">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 text-purple-800 font-semibold text-xs">
                                                    ✨ Lista desde {formatDate(delivery.readyAt)}
                                                </span>
                                                {isExpired ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 font-semibold text-xs">
                                                        ⚠️ Expiró
                                                    </span>
                                                ) : isExpiringSoon ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-semibold text-xs">
                                                        ⏰ Expira en {daysUntilExpiration} días
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                                                        Disponible hasta {formatDate(expirationDate.toISOString())}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()
                                )}
                                {delivery.deliveredAt && (
                                    <p className="text-sm text-green-600 mb-1">
                                        ✅ Entregada: {formatDate(delivery.deliveredAt)}
                                    </p>
                                )}
                                {delivery.notes && (
                                    <p className="text-sm text-brand-secondary mb-1">📝 {delivery.notes}</p>
                                )}
                                {delivery.photos && delivery.photos.length > 0 && (
                                    <div className="flex gap-2 mt-2">
                                        {delivery.photos.slice(0, 3).map((photo, i) => (
                                            <img 
                                                key={i} 
                                                src={photo} 
                                                alt={`Foto ${i + 1}`}
                                                className="h-16 w-16 object-cover rounded-lg border cursor-pointer hover:scale-105 transition-transform"
                                                onClick={() => window.open(photo, '_blank')}
                                            />
                                        ))}
                                        {delivery.photos.length > 3 && (
                                            <div className="h-16 w-16 flex items-center justify-center bg-gray-100 rounded-lg border text-gray-600 text-xs font-semibold">
                                                +{delivery.photos.length - 3}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 shadow transition-colors"
                                    title="Editar entrega"
                                    onClick={() => onEdit(delivery)}
                                >
                                    ✏️
                                </button>
                                <button
                                    className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 shadow transition-colors"
                                    title="Eliminar entrega"
                                    onClick={() => onDelete(delivery)}
                                >
                                    🗑️
                                </button>
                                {delivery.status !== 'completed' && !delivery.readyAt && (
                                    <button
                                        className="px-3 py-2 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-600 shadow flex items-center gap-1 font-semibold text-sm transition-colors"
                                        title="Notificar al cliente que su pieza está lista"
                                        onClick={() => onMarkReady(delivery.id)}
                                    >
                                        ✨ Marcar como Lista
                                    </button>
                                )}
                                {delivery.status !== 'completed' && delivery.readyAt && (
                                    <>
                                        <button
                                            className="px-3 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 shadow flex items-center gap-1 font-semibold text-sm transition-colors"
                                            title="Reenviar email de notificación al cliente"
                                            onClick={() => onMarkReady(delivery.id)}
                                        >
                                            📧 Reenviar
                                        </button>
                                        <button
                                            className="px-3 py-2 rounded-full bg-green-50 hover:bg-green-100 text-green-600 shadow flex items-center gap-1 font-semibold text-sm transition-colors"
                                            title="Completar entrega"
                                            onClick={() => onComplete(delivery.id)}
                                        >
                                            ✓ Completar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="p-8 text-center">
                        <div className="text-gray-400 text-5xl mb-4">📦</div>
                        <p className="text-gray-600 font-semibold">No se encontraron entregas</p>
                        <p className="text-gray-500 text-sm mt-2">
                            {searchQuery || filterStatus !== 'all' 
                                ? 'Intenta ajustar los filtros de búsqueda'
                                : 'No hay recogidas registradas'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
