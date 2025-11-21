import React, { useState, useMemo, useCallback } from 'react';
import type { Delivery, Customer } from '../../types';
import { DeliveryDashboard } from './DeliveryDashboard';
import { DeliveryListWithFilters } from './DeliveryListWithFilters';
import * as dataService from '../../services/dataService';
import { formatDate } from '../../utils/formatters';

interface DeliveriesTabProps {
    customers: Customer[];
    onDataChange: () => void;
}

/**
 * DeliveriesTab - Main module for delivery management
 * Displays all deliveries across all customers without needing to navigate to individual customer views
 */
export const DeliveriesTab: React.FC<DeliveriesTabProps> = ({ customers, onDataChange }) => {
    const [loading, setLoading] = useState(false);
    const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
    const [editModal, setEditModal] = useState(false);

    // Combine all deliveries from all customers
    const allDeliveries = useMemo((): (Delivery & { customerEmail: string; customerName: string })[] => {
        const combined: (Delivery & { customerEmail: string; customerName: string })[] = [];
        
        customers.forEach(customer => {
            if (customer.deliveries && Array.isArray(customer.deliveries)) {
                customer.deliveries.forEach(delivery => {
                    combined.push({
                        ...delivery,
                        customerEmail: customer.email || customer.userInfo?.email || '',
                        customerName: `${customer.userInfo?.firstName || ''} ${customer.userInfo?.lastName || ''}`.trim()
                    });
                });
            }
        });

        return combined;
    }, [customers]);

    // Handle mark as ready
    const handleMarkReady = useCallback(async (deliveryId: string) => {
        setLoading(true);
        try {
            const result = await dataService.markDeliveryAsReady(deliveryId);
            if (result.success) {
                onDataChange();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error marking delivery as ready:', error);
            alert('Error al marcar como lista');
        } finally {
            setLoading(false);
        }
    }, [onDataChange]);

    // Handle complete delivery
    const handleComplete = useCallback(async (deliveryId: string) => {
        setLoading(true);
        try {
            const result = await dataService.markDeliveryAsCompleted(deliveryId);
            if (result.success) {
                onDataChange();
            } else {
                alert('Error al completar entrega');
            }
        } catch (error) {
            console.error('Error completing delivery:', error);
            alert('Error al completar entrega');
        } finally {
            setLoading(false);
        }
    }, [onDataChange]);

    // Handle delete delivery
    const handleDelete = useCallback(async (delivery: Delivery) => {
        if (!window.confirm(`¿Eliminar entrega "${delivery.description || 'Sin descripción'}"?`)) {
            return;
        }

        setLoading(true);
        try {
            const result = await dataService.deleteDelivery(delivery.id);
            if (result.success) {
                onDataChange();
            } else {
                alert('Error al eliminar entrega');
            }
        } catch (error) {
            console.error('Error deleting delivery:', error);
            alert('Error al eliminar entrega');
        } finally {
            setLoading(false);
        }
    }, [onDataChange]);

    // Handle edit (open modal)
    const handleEdit = useCallback((delivery: Delivery) => {
        setEditingDeliveryId(delivery.id);
        setEditModal(true);
    }, []);

    // Handle export to CSV
    const handleExportCSV = useCallback(() => {
        const headers = ['Cliente', 'Email', 'Descripción', 'Notas', 'Estado', 'Fecha Programada', 'Lista Desde', 'Entregada', 'Días Falta', 'Fotos'];
        
        const rows = allDeliveries.map(delivery => {
            const msPerDay = 1000 * 60 * 60 * 24;
            const scheduled = new Date(delivery.scheduledDate);
            scheduled.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const daysUntil = Math.ceil((scheduled.getTime() - today.getTime()) / msPerDay);
            
            const daysUntilExpiration = delivery.readyAt 
                ? (() => {
                    const readyDate = new Date(delivery.readyAt);
                    const expirationDate = new Date(readyDate);
                    expirationDate.setDate(expirationDate.getDate() + 60);
                    return Math.ceil((expirationDate.getTime() - new Date().getTime()) / msPerDay);
                })()
                : null;

            return [
                delivery.customerName,
                delivery.customerEmail,
                delivery.description || '',
                delivery.notes || '',
                delivery.status,
                formatDate(delivery.scheduledDate),
                delivery.readyAt ? formatDate(delivery.readyAt) : 'No lista',
                delivery.completedAt ? formatDate(delivery.completedAt) : delivery.deliveredAt ? formatDate(delivery.deliveredAt) : 'No entregada',
                daysUntilExpiration !== null ? daysUntilExpiration : daysUntil,
                delivery.photos ? delivery.photos.length : 0
            ];
        });

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `entregas_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [allDeliveries]);

    return (
        <div className="space-y-6">
            {/* Header with export button */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-brand-text">📦 Entregas</h1>
                <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors font-semibold flex items-center gap-2"
                >
                    📥 Exportar CSV
                </button>
            </div>

            {/* Dashboard - Summary cards */}
            <DeliveryDashboard deliveries={allDeliveries} formatDate={formatDate} />

            {/* Filterable list */}
            <DeliveryListWithFilters
                deliveries={allDeliveries}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onComplete={handleComplete}
                onMarkReady={handleMarkReady}
                formatDate={formatDate}
            />

            {loading && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
                        <p className="mt-4 text-brand-text font-semibold">Procesando...</p>
                    </div>
                </div>
            )}
        </div>
    );
};
