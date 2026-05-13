import React, { useState, useEffect } from 'react';
import * as dataService from '../../services/dataService';

interface EmailLog {
    id: string;
    clientEmail: string;
    type: string;
    channel: string;
    status: string;
    bookingCode?: string | null;
    createdAt: string;
}

interface EmailNotificationsPanelProps {
    deliveryId: string;
    customerEmail: string;
    compact?: boolean; // Si true, muestra versión compacta
}

// Mapeo de tipos de email a etiquetas legibles
const EMAIL_TYPE_LABELS: Record<string, string> = {
    'delivery_ready': '📧 Pieza Lista para Retirar',
    'delivery_ready_painting': '🎨 Pieza Lista para Pintar',
    'delivery_completed': '✅ Entrega Completada',
    'painted_piece_ready_pickup': '🎁 Pieza Pintada Lista',
    'painting_booking_scheduled': '📅 Pintura Agendada',
    'painting_booking_rescheduled': '📅 Pintura reagendada / corregida'
};

// Mapeo de status a indicadores visuales
const STATUS_INDICATORS: Record<string, { icon: string; color: string; label: string }> = {
    'sent': { icon: '✓', color: 'text-green-600', label: 'Enviado' },
    'failed': { icon: '✗', color: 'text-red-600', label: 'Fallido' },
    'pending': { icon: '⏳', color: 'text-yellow-600', label: 'Pendiente' }
};

export const EmailNotificationsPanel: React.FC<EmailNotificationsPanelProps> = ({
    deliveryId,
    customerEmail,
    compact = false
}) => {
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadEmailLogs();
    }, [deliveryId]);

    const loadEmailLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const emailLogs = await dataService.getDeliveryEmailLogs(deliveryId);
            setLogs(emailLogs);
        } catch (err) {
            console.error('[EmailNotificationsPanel] Error loading logs:', err);
            setError('Error al cargar historial de notificaciones');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string): string => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                <span>Cargando notificaciones...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-xs text-red-600 py-2">
                {error}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-xs text-gray-500 italic py-2">
                Sin notificaciones enviadas aún
            </div>
        );
    }

    // Versión compacta: solo mostrar resumen
    if (compact) {
        const latestLog = logs[0];
        const statusInfo = STATUS_INDICATORS[latestLog.status] || STATUS_INDICATORS['pending'];
        const typeLabel = EMAIL_TYPE_LABELS[latestLog.type] || latestLog.type;

        return (
            <div className="flex items-center gap-2 text-xs">
                <span className={`font-bold ${statusInfo.color}`}>{statusInfo.icon}</span>
                <span className="text-gray-700">{typeLabel}</span>
                <span className="text-gray-500">• {formatDate(latestLog.createdAt)}</span>
                {logs.length > 1 && (
                    <span className="ml-auto text-blue-600 font-semibold">
                        +{logs.length - 1} más
                    </span>
                )}
            </div>
        );
    }

    // Versión completa: lista de todos los emails
    return (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 space-y-2">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-blue-800">📧 Historial de Notificaciones</span>
                <span className="text-xs text-blue-600">({logs.length})</span>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {logs.map((log, idx) => {
                    const statusInfo = STATUS_INDICATORS[log.status] || STATUS_INDICATORS['pending'];
                    const typeLabel = EMAIL_TYPE_LABELS[log.type] || log.type;
                    
                    return (
                        <div 
                            key={log.id || idx}
                            className="bg-white rounded-md p-2 border border-blue-100 text-xs"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`font-bold ${statusInfo.color}`}>
                                            {statusInfo.icon}
                                        </span>
                                        <span className="font-semibold text-gray-800 truncate">
                                            {typeLabel}
                                        </span>
                                    </div>
                                    <div className="text-gray-600">
                                        {formatDate(log.createdAt)}
                                    </div>
                                    {log.status === 'failed' && (
                                        <div className="mt-1 text-red-600 font-medium">
                                            ⚠️ No se pudo enviar
                                        </div>
                                    )}
                                </div>
                                <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                    log.status === 'sent' ? 'bg-green-100 text-green-700' : 
                                    log.status === 'failed' ? 'bg-red-100 text-red-700' : 
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {statusInfo.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {logs.length > 0 && (
                <button
                    onClick={loadEmailLogs}
                    className="w-full mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold py-1 hover:bg-blue-50 rounded transition-colors"
                >
                    🔄 Actualizar
                </button>
            )}
        </div>
    );
};

export default EmailNotificationsPanel;
