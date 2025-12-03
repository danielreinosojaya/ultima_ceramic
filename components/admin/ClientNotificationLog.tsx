

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ClientNotification, ClientNotificationType } from '../../types';
import * as dataService from '../../services/dataService';
// ...existing code...
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { formatDate } from '../../utils/formatters';

const NOTIFICATION_TYPE_OPTIONS: ClientNotificationType[] = ['PRE_BOOKING_CONFIRMATION', 'PAYMENT_RECEIPT', 'CLASS_REMINDER'];
const ITEMS_PER_PAGE = 15;

export const ClientNotificationLog: React.FC = () => {
    // Traducción eliminada, usar texto en español directamente
    const [notifications, setNotifications] = useState<ClientNotification[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<ClientNotificationType | 'all'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const loadNotifications = useCallback(async () => {
        setIsLoading(true);
        await dataService.triggerScheduledNotifications();
        const fetchedNotifications = await dataService.getClientNotifications();
        setNotifications(fetchedNotifications);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType]);
    
    const handleDelete = async (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar esta notificación?')) {
            try {
                await dataService.deleteClientNotification(id);
                setNotifications(prev => prev.filter(n => n.id !== id));
            } catch (error) {
                console.error('Failed to delete notification:', error);
                alert('Error al eliminar la notificación.');
            }
        }
    };

    const formatDate = (dateInput: string | null | undefined): string => {
        if (!dateInput) return '---';
        const date = new Date(dateInput);
        if (isNaN(date.getTime()) || date.getTime() === 0) {
            return '---';
        }
    return date.toLocaleString('es-EC', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            const searchTermLower = searchTerm.toLowerCase();
            const clientNameLower = (n.clientName || '').toLowerCase();
            const clientEmailLower = (n.clientEmail || '').toLowerCase();
            const matchesSearch = clientNameLower.includes(searchTermLower) || clientEmailLower.includes(searchTermLower);
            const matchesType = filterType === 'all' || n.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [notifications, searchTerm, filterType]);

    const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
    const paginatedNotifications = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredNotifications.slice(startIndex, endIndex);
    }, [filteredNotifications, currentPage]);

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-serif text-brand-text mb-2 flex items-center gap-3">
                        <PaperAirplaneIcon className="w-6 h-6 text-brand-accent" />
                        Historial de Notificaciones
                    </h2>
                    <p className="text-brand-secondary">Registro de todas las notificaciones enviadas a los clientes.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex items-center gap-4 flex-wrap">
                <input
                    type="text"
                    placeholder="Buscar por cliente, tipo o estado"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-primary focus:border-brand-primary"
                />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-brand-primary focus:border-brand-primary"
                >
                    <option value="all">Todos los tipos</option>
                    {NOTIFICATION_TYPE_OPTIONS.map(type => (
                        <option key={type} value={type}>
                            {String(type) === 'booking' ? 'Reserva' : String(type) === 'inquiry' ? 'Consulta' : 'Otro'}
                        </option>
                    ))}
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-brand-background">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-brand-secondary uppercase tracking-wider">Estado</th>
                             <th className="px-6 py-3 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                             <tr>
                                <td colSpan={5} className="text-center py-10 text-brand-secondary">
                                    Cargando...
                                </td>
                            </tr>
                        ) : paginatedNotifications.length > 0 ? paginatedNotifications.map((n) => (
                            <tr key={n.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                    {formatDate(n.createdAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-bold text-brand-text">{n.clientName || 'Sin nombre'}</div>
                                    <div className="text-sm text-brand-secondary">{n.clientEmail || 'Sin email'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                    {n.type === 'PRE_BOOKING_CONFIRMATION' ? 'Reserva' : n.type === 'PAYMENT_RECEIPT' ? 'Recibo' : n.type === 'CLASS_REMINDER' ? 'Recordatorio' : 'Otro'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${n.status === 'Sent' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {n.status === 'Sent' ? 'Enviada' : n.status === 'Failed' ? 'Fallida' : 'Pendiente'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleDelete(n.id)}
                                        className="p-1 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50"
                                        title="Eliminar notificación"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-brand-secondary">
                                    No hay notificaciones.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
             {totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center text-sm">
                    <button onClick={handlePrevPage} disabled={currentPage === 1} className="font-semibold text-brand-primary disabled:text-gray-400 disabled:cursor-not-allowed">
                        &larr; Anterior
                    </button>
                    <span className="text-brand-secondary font-semibold">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button onClick={handleNextPage} disabled={currentPage >= totalPages} className="font-semibold text-brand-primary disabled:text-gray-400 disabled:cursor-not-allowed">
                        Siguiente &rarr;
                    </button>
                </div>
            )}
        </div>
    );
};