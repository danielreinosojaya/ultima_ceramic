import React, { useState, useEffect, useCallback } from 'react';
import { 
    HeartIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    ClockIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    EyeIcon,
    PhotoIcon,
    UserGroupIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import type { ValentineRegistration, ValentineRegistrationStatus, ValentineWorkshopType } from '../../types';
import { VALENTINE_WORKSHOPS } from '../../types';

interface ValentineAdminPanelProps {
    onClose?: () => void;
}

const STATUS_LABELS: Record<ValentineRegistrationStatus, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pendiente', color: 'text-yellow-700', bg: 'bg-yellow-100' },
    confirmed: { label: 'Confirmado', color: 'text-green-700', bg: 'bg-green-100' },
    cancelled: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100' },
    attended: { label: 'Asistió', color: 'text-blue-700', bg: 'bg-blue-100' }
};

const WORKSHOP_LABELS: Record<ValentineWorkshopType, string> = {
    florero_arreglo_floral: 'Florero + Arreglo Floral',
    modelado_san_valentin: 'Modelado a Mano',
    torno_san_valentin: 'Torno Alfarero'
};

const WORKSHOP_TIMES: Record<ValentineWorkshopType, string> = {
    florero_arreglo_floral: '10h00 - 12h00',
    modelado_san_valentin: '14h00 - 16h00',
    torno_san_valentin: '17h00 - 19h00'
};

export const ValentineAdminPanel: React.FC<ValentineAdminPanelProps> = ({ onClose }) => {
    const [registrations, setRegistrations] = useState<ValentineRegistration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<ValentineRegistrationStatus | 'all'>('all');
    const [filterWorkshop, setFilterWorkshop] = useState<ValentineWorkshopType | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegistration, setSelectedRegistration] = useState<ValentineRegistration | null>(null);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [stats, setStats] = useState<any>(null);

    const fetchRegistrations = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.append('action', 'list');
            if (filterStatus !== 'all') params.append('status', filterStatus);
            if (filterWorkshop !== 'all') params.append('workshop', filterWorkshop);

            const response = await fetch(`/api/valentine?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                setRegistrations(result.data || []);
            } else {
                setError(result.error || 'Error al cargar inscripciones');
            }
        } catch (err) {
            console.error('Error fetching registrations:', err);
            setError('Error de conexión');
        } finally {
            setIsLoading(false);
        }
    }, [filterStatus, filterWorkshop]);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/valentine?action=stats');
            const result = await response.json();
            if (result.success) {
                setStats(result.data);
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    useEffect(() => {
        fetchRegistrations();
        fetchStats();
    }, [fetchRegistrations]);

    const updateStatus = async (id: string, newStatus: ValentineRegistrationStatus, adminNotes?: string) => {
        setIsUpdating(id);
        try {
            const response = await fetch('/api/valentine?action=updateStatus', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    status: newStatus,
                    adminNotes,
                    adminUser: 'admin' // En producción, obtener del contexto de auth
                })
            });

            const result = await response.json();
            if (result.success) {
                // Actualizar lista local
                setRegistrations(prev => 
                    prev.map(r => r.id === id ? result.data : r)
                );
                if (selectedRegistration?.id === id) {
                    setSelectedRegistration(result.data);
                }
                fetchStats(); // Actualizar estadísticas
            } else {
                alert('Error: ' + (result.error || 'No se pudo actualizar'));
            }
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Error de conexión al actualizar');
        } finally {
            setIsUpdating(null);
        }
    };

    const deleteRegistration = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta inscripción? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const response = await fetch(`/api/valentine?action=delete&id=${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (result.success) {
                setRegistrations(prev => prev.filter(r => r.id !== id));
                if (selectedRegistration?.id === id) {
                    setSelectedRegistration(null);
                }
                fetchStats();
            } else {
                alert('Error: ' + (result.error || 'No se pudo eliminar'));
            }
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Error de conexión');
        }
    };

    // Filtrar por búsqueda
    const filteredRegistrations = registrations.filter(r => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            r.fullName.toLowerCase().includes(term) ||
            r.email.toLowerCase().includes(term) ||
            r.phone.includes(term) ||
            r.id.toLowerCase().includes(term)
        );
    });

    // Agrupar por taller para vista organizada
    const groupedByWorkshop = VALENTINE_WORKSHOPS.reduce((acc, workshop) => {
        acc[workshop.type] = filteredRegistrations.filter(r => r.workshop === workshop.type);
        return acc;
    }, {} as Record<ValentineWorkshopType, ValentineRegistration[]>);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('es-EC', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <HeartSolid className="w-8 h-8" />
                            <div>
                                <h1 className="text-2xl font-bold">San Valentín 2026</h1>
                                <p className="text-rose-100 text-sm">Gestión de Inscripciones</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchRegistrations}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                        >
                            <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="max-w-7xl mx-auto px-4 -mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-rose-500">
                            <p className="text-gray-500 text-sm">Total Inscripciones</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.totals?.totalRegistrations || 0}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-yellow-500">
                            <p className="text-gray-500 text-sm">Pendientes</p>
                            <p className="text-3xl font-bold text-yellow-600">{stats.totals?.pendingCount || 0}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
                            <p className="text-gray-500 text-sm">Confirmados</p>
                            <p className="text-3xl font-bold text-green-600">{stats.totals?.confirmedCount || 0}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
                            <p className="text-gray-500 text-sm">Total Participantes</p>
                            <p className="text-3xl font-bold text-blue-600">{stats.totals?.totalParticipants || 0}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="bg-white rounded-xl shadow p-4 flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, email, teléfono o código..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <FunnelIcon className="w-5 h-5 text-gray-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="pending">Pendientes</option>
                            <option value="confirmed">Confirmados</option>
                            <option value="cancelled">Cancelados</option>
                            <option value="attended">Asistieron</option>
                        </select>
                    </div>

                    {/* Workshop Filter */}
                    <select
                        value={filterWorkshop}
                        onChange={(e) => setFilterWorkshop(e.target.value as any)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500"
                    >
                        <option value="all">Todos los talleres</option>
                        {VALENTINE_WORKSHOPS.map(w => (
                            <option key={w.type} value={w.type}>{w.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 pb-8">
                {isLoading ? (
                    <div className="text-center py-12">
                        <ArrowPathIcon className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-3" />
                        <p className="text-gray-500">Cargando inscripciones...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-3" />
                        <p className="text-red-700">{error}</p>
                        <button
                            onClick={fetchRegistrations}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            Reintentar
                        </button>
                    </div>
                ) : filteredRegistrations.length === 0 ? (
                    <div className="bg-white rounded-xl shadow p-12 text-center">
                        <HeartIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No hay inscripciones todavía</p>
                        <p className="text-gray-400 text-sm mt-1">Las inscripciones aparecerán aquí cuando los clientes se registren</p>
                    </div>
                ) : (
                    /* Vista agrupada por taller */
                    <div className="space-y-8">
                        {VALENTINE_WORKSHOPS.map(workshop => {
                            const workshopRegs = groupedByWorkshop[workshop.type];
                            if (workshopRegs.length === 0 && filterWorkshop !== 'all' && filterWorkshop !== workshop.type) {
                                return null;
                            }

                            return (
                                <div key={workshop.type} className="bg-white rounded-xl shadow-lg overflow-hidden">
                                    {/* Workshop Header */}
                                    <div className="bg-gradient-to-r from-rose-100 to-pink-100 p-4 border-b border-rose-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-rose-500 text-white p-2 rounded-lg">
                                                    <ClockIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-800">{WORKSHOP_LABELS[workshop.type]}</h3>
                                                    <p className="text-sm text-gray-600">{WORKSHOP_TIMES[workshop.type]}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <UserGroupIcon className="w-5 h-5 text-rose-600" />
                                                <span className="font-bold text-rose-600">
                                                    {workshopRegs.reduce((sum, r) => sum + r.participants, 0)} participantes
                                                </span>
                                                <span className="text-gray-400">
                                                    ({workshopRegs.length} inscripciones)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Registrations Table */}
                                    {workshopRegs.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b">
                                                    <tr>
                                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Código</th>
                                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nombre</th>
                                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Contacto</th>
                                                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Personas</th>
                                                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Estado</th>
                                                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Comprobante</th>
                                                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {workshopRegs.map(reg => (
                                                        <tr key={reg.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3">
                                                                <span className="font-mono text-sm text-rose-600">{reg.id}</span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div>
                                                                    <p className="font-medium text-gray-800">{reg.fullName}</p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {formatDate(reg.createdAt)}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <p className="text-sm text-gray-600">{reg.email}</p>
                                                                <p className="text-sm text-gray-500">{reg.phone}</p>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                                                                    reg.participants === 2 ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                    {reg.participants === 2 ? '👥 Pareja' : '👤 Individual'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[reg.status].bg} ${STATUS_LABELS[reg.status].color}`}>
                                                                    {STATUS_LABELS[reg.status].label}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    onClick={() => setSelectedRegistration(reg)}
                                                                    className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                    title="Ver comprobante"
                                                                >
                                                                    <PhotoIcon className="w-5 h-5" />
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {reg.status === 'pending' && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => updateStatus(reg.id, 'confirmed')}
                                                                                disabled={isUpdating === reg.id}
                                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                                                                title="Confirmar pago"
                                                                            >
                                                                                <CheckCircleIcon className="w-5 h-5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => updateStatus(reg.id, 'cancelled')}
                                                                                disabled={isUpdating === reg.id}
                                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                                                title="Cancelar"
                                                                            >
                                                                                <XCircleIcon className="w-5 h-5" />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {reg.status === 'confirmed' && (
                                                                        <button
                                                                            onClick={() => updateStatus(reg.id, 'attended')}
                                                                            disabled={isUpdating === reg.id}
                                                                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
                                                                            title="Marcar asistencia"
                                                                        >
                                                                            ✓ Asistió
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => setSelectedRegistration(reg)}
                                                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                                        title="Ver detalles"
                                                                    >
                                                                        <EyeIcon className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center text-gray-500">
                                            No hay inscripciones para este taller
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedRegistration && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white p-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold">{selectedRegistration.fullName}</h2>
                                    <p className="text-rose-100">{selectedRegistration.id}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedRegistration(null)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Info Grid */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="font-medium">{selectedRegistration.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Teléfono</p>
                                    <p className="font-medium">{selectedRegistration.phone}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Fecha de Nacimiento</p>
                                    <p className="font-medium">{selectedRegistration.birthDate}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Participantes</p>
                                    <p className="font-medium">
                                        {selectedRegistration.participants === 2 ? 'Pareja (2 personas)' : 'Individual'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Taller</p>
                                    <p className="font-medium">{WORKSHOP_LABELS[selectedRegistration.workshop]}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Horario</p>
                                    <p className="font-medium">{WORKSHOP_TIMES[selectedRegistration.workshop]}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Estado</p>
                                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${STATUS_LABELS[selectedRegistration.status].bg} ${STATUS_LABELS[selectedRegistration.status].color}`}>
                                        {STATUS_LABELS[selectedRegistration.status].label}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Registrado</p>
                                    <p className="font-medium">{formatDate(selectedRegistration.createdAt)}</p>
                                </div>
                            </div>

                            {/* Payment Proof */}
                            <div>
                                <p className="text-sm text-gray-500 mb-2">Comprobante de Pago</p>
                                <div className="border rounded-xl overflow-hidden bg-gray-50">
                                    {selectedRegistration.paymentProofUrl.startsWith('data:image') ? (
                                        <img 
                                            src={selectedRegistration.paymentProofUrl} 
                                            alt="Comprobante" 
                                            className="max-w-full max-h-96 mx-auto"
                                        />
                                    ) : selectedRegistration.paymentProofUrl.includes('pdf') ? (
                                        <div className="p-8 text-center">
                                            <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-600">Archivo PDF</p>
                                            <a 
                                                href={selectedRegistration.paymentProofUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-rose-600 hover:underline"
                                            >
                                                Ver PDF
                                            </a>
                                        </div>
                                    ) : (
                                        <img 
                                            src={selectedRegistration.paymentProofUrl} 
                                            alt="Comprobante" 
                                            className="max-w-full max-h-96 mx-auto"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Admin Notes */}
                            {selectedRegistration.adminNotes && (
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Notas del Admin</p>
                                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedRegistration.adminNotes}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-3 pt-4 border-t">
                                {selectedRegistration.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                updateStatus(selectedRegistration.id, 'confirmed');
                                                setSelectedRegistration(null);
                                            }}
                                            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircleIcon className="w-5 h-5" />
                                            Confirmar Pago
                                        </button>
                                        <button
                                            onClick={() => {
                                                const notes = prompt('Razón de cancelación (opcional):');
                                                updateStatus(selectedRegistration.id, 'cancelled', notes || undefined);
                                                setSelectedRegistration(null);
                                            }}
                                            className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <XCircleIcon className="w-5 h-5" />
                                            Cancelar
                                        </button>
                                    </>
                                )}
                                {selectedRegistration.status === 'confirmed' && (
                                    <button
                                        onClick={() => {
                                            updateStatus(selectedRegistration.id, 'attended');
                                            setSelectedRegistration(null);
                                        }}
                                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        ✓ Marcar Asistencia
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteRegistration(selectedRegistration.id)}
                                    className="py-2 px-4 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                                >
                                    Eliminar
                                </button>
                                <button
                                    onClick={() => setSelectedRegistration(null)}
                                    className="py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
