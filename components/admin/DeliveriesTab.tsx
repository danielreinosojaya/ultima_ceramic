import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Delivery, Customer } from '../../types';
import { DeliveryDashboard } from './DeliveryDashboard';
import { DeliveryListWithFilters } from './DeliveryListWithFilters';
import { NewLegacyCustomerDeliveryModal } from './NewLegacyCustomerDeliveryModal';
import { LegacyPaintingRegistrationModal } from './LegacyPaintingRegistrationModal';
import * as dataService from '../../services/dataService';
import { formatDate } from '../../utils/formatters';
import { useAdminData } from '../../context/AdminDataContext';

interface DeliveriesTabProps {
    customers: Customer[];
    onDataChange: () => void;
}

export const DeliveriesTab: React.FC<DeliveriesTabProps> = ({ customers, onDataChange }) => {
    const adminData = useAdminData();
    const [loading, setLoading] = useState(false);
    const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
    const [editModal, setEditModal] = useState(false);
    const [legacyModalOpen, setLegacyModalOpen] = useState(false);
    const [legacyPaintingModalOpen, setLegacyPaintingModalOpen] = useState(false);
    const [allStandaloneDeliveries, setAllStandaloneDeliveries] = useState<Delivery[]>([]);

    // Load standalone deliveries on component mount and when data changes
    useEffect(() => {
        const loadStandaloneDeliveries = async () => {
            try {
                const deliveries = await dataService.getDeliveries();
                setAllStandaloneDeliveries(deliveries);
                console.log('[DeliveriesTab] Loaded standalone deliveries:', deliveries.length);
            } catch (error) {
                console.error('[DeliveriesTab] Error loading standalone deliveries:', error);
            }
        };
        loadStandaloneDeliveries();
    }, [onDataChange]);

    // Combine all deliveries from all customers AND standalone deliveries
    const allDeliveries = useMemo((): (Delivery & { customerEmail: string; customerName: string })[] => {
        const combined: Map<string, Delivery & { customerEmail: string; customerName: string }> = new Map();
        
        // Add deliveries from customers
        customers.forEach(customer => {
            if (customer.deliveries && Array.isArray(customer.deliveries)) {
                customer.deliveries.forEach(delivery => {
                    combined.set(delivery.id, {
                        ...delivery,
                        customerEmail: customer.email || customer.userInfo?.email || '',
                        customerName: `${customer.userInfo?.firstName || ''} ${customer.userInfo?.lastName || ''}`.trim()
                    });
                });
            }
        });

        // Add standalone deliveries that aren't already included
        allStandaloneDeliveries.forEach(delivery => {
            if (!combined.has(delivery.id)) {
                const customerEmail = (delivery.customerEmail || '').trim().toLowerCase();
                // Try to find customer by email for name enrichment
                const customer = customers.find(c => 
                    ((c.email || '').trim().toLowerCase() === customerEmail) ||
                    ((c.userInfo?.email || '').trim().toLowerCase() === customerEmail)
                );
                
                combined.set(delivery.id, {
                    ...delivery,
                    customerEmail: customerEmail,
                    customerName: customer 
                        ? `${customer.userInfo?.firstName || ''} ${customer.userInfo?.lastName || ''}`.trim()
                        : ''
                });
            }
        });

        // Return as array, sorted by scheduled_date DESC (most recent first)
        return Array.from(combined.values()).sort((a, b) => {
            const dateA = new Date(a.scheduledDate).getTime();
            const dateB = new Date(b.scheduledDate).getTime();
            return dateB - dateA;
        });
    }, [customers, allStandaloneDeliveries]);

    // Handle mark as ready
    const handleMarkReady = useCallback(async (deliveryId: string) => {
        setLoading(true);
        try {
            const result = await dataService.markDeliveryAsReady(deliveryId);
            if (result.success) {
                if (result.delivery) {
                    adminData.optimisticUpsertDelivery(result.delivery);
                } else {
                    adminData.refreshCritical();
                }
                onDataChange?.();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error marking delivery as ready:', error);
            alert('Error al marcar como lista');
        } finally {
            setLoading(false);
        }
    }, [onDataChange, adminData]);

    // Handle complete delivery
    const handleComplete = useCallback(async (deliveryId: string) => {
        setLoading(true);
        try {
            const result = await dataService.markDeliveryAsCompleted(deliveryId);
            if (result.success) {
                if (result.delivery) {
                    adminData.optimisticUpsertDelivery(result.delivery);
                } else {
                    adminData.refreshCritical();
                }
                onDataChange?.();
            } else {
                alert('Error al completar entrega');
            }
        } catch (error) {
            console.error('Error completing delivery:', error);
            alert('Error al completar entrega');
        } finally {
            setLoading(false);
        }
    }, [onDataChange, adminData]);

    // Handle delete delivery
    const handleDelete = useCallback(async (delivery: Delivery) => {
        if (!window.confirm(`¿Eliminar entrega "${delivery.description || 'Sin descripción'}"?`)) {
            return;
        }

        setLoading(true);
        try {
            const result = await dataService.deleteDelivery(delivery.id);
            if (result.success) {
                adminData.optimisticRemoveDelivery(delivery.id);
                onDataChange?.();
            } else {
                alert('Error al eliminar entrega');
            }
        } catch (error) {
            console.error('Error deleting delivery:', error);
            alert('Error al eliminar entrega');
        } finally {
            setLoading(false);
        }
    }, [onDataChange, adminData]);

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
                // ⚡ Usar hasPhotos o photos.length según disponibilidad
                delivery.photos && delivery.photos.length > 0 ? delivery.photos.length : (delivery.hasPhotos ? '📷' : 0)
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h1 className="text-3xl font-bold text-brand-text">📦 Entregas</h1>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setLegacyModalOpen(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                    >
                        ➕ Cliente sin reserva
                    </button>
                    <button
                        onClick={() => setLegacyPaintingModalOpen(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                    >
                        🎨 Registrar pintura (legacy)
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors font-semibold flex items-center gap-2"
                    >
                        📥 Exportar CSV
                    </button>
                </div>
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
                onDataChange={onDataChange}
            />

            <NewLegacyCustomerDeliveryModal
                isOpen={legacyModalOpen}
                onClose={() => setLegacyModalOpen(false)}
                onSave={async ({ userInfo, deliveryData, customerName }) => {
                    setLoading(true);
                    try {
                        const customerResult = await dataService.ensureStandaloneCustomer(userInfo);
                        if (!customerResult.success) {
                            throw new Error(customerResult.error || 'No se pudo crear el cliente');
                        }

                        const deliveryResult = await dataService.createDelivery({
                            ...deliveryData,
                            customerEmail: userInfo.email,
                            customerName
                        } as any);

                        if (!deliveryResult.success) {
                            throw new Error(deliveryResult.error || 'No se pudo crear la entrega');
                        }

                        if (deliveryResult.delivery) {
                            adminData.optimisticUpsertDelivery(deliveryResult.delivery);
                        } else {
                            adminData.refreshCritical();
                        }
                        setLegacyModalOpen(false);
                    } finally {
                        setLoading(false);
                    }
                }}
            />

            <LegacyPaintingRegistrationModal
                isOpen={legacyPaintingModalOpen}
                onClose={() => setLegacyPaintingModalOpen(false)}
                deliveries={allDeliveries}
                onSaved={(delivery) => {
                    adminData.optimisticUpsertDelivery(delivery);
                }}
                onFallbackRefresh={() => {
                    adminData.refreshCritical();
                }}
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
