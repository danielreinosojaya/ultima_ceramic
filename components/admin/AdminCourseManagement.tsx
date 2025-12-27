import React, { useState, useEffect } from 'react';
import * as dataService from '../../services/dataService';
import { CreateScheduleModal } from './CreateScheduleModal';

type TabType = 'schedules' | 'enrollments' | 'sessions';

interface CourseSchedule {
    id: string;
    format: '3x2' | '2x3';
    name: string;
    days: string[];
    startTime: string;
    endTime: string;
    startDate: string;
    capacity: number;
    currentEnrollments: number;
    isActive: boolean;
    sessions: CourseSession[];
}

interface CourseSession {
    id: string;
    sessionNumber: number;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    topic: string;
    instructorId: number | null;
    status: 'upcoming' | 'completed' | 'cancelled';
}

interface CourseEnrollment {
    id: string;
    studentEmail: string;
    studentInfo: {
        firstName: string;
        lastName: string;
        phoneNumber?: string;
    };
    courseScheduleId: string;
    enrollmentDate: string;
    status: 'active' | 'completed' | 'dropped' | 'pending_payment';
    paymentStatus: 'pending' | 'partial' | 'paid';
    amountPaid: number;
    experienceLevel?: string;
    sessions: Array<{ sessionId: string; attended: boolean; notes?: string }>;
}

export function AdminCourseManagement() {
    const [activeTab, setActiveTab] = useState<TabType>('schedules');
    const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
    const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSchedule, setSelectedSchedule] = useState<CourseSchedule | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        console.log('[AdminCourseManagement] Iniciando carga de datos...');
        setLoading(true);
        try {
            console.log('[AdminCourseManagement] Cargando schedules...');
            const schedulesData = await dataService.getCourseSchedules();
            console.log('[AdminCourseManagement] Schedules recibidos:', schedulesData);
            setSchedules(schedulesData);
            
            console.log('[AdminCourseManagement] Cargando enrollments...');
            const enrollmentsData = await dataService.getCourseEnrollments();
            console.log('[AdminCourseManagement] Enrollments recibidos:', enrollmentsData);
            setEnrollments(enrollmentsData);
        } catch (error) {
            console.error('[AdminCourseManagement] Error loading course data:', error);
        } finally {
            console.log('[AdminCourseManagement] Carga completada');
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-EC', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    };

    const getDayNames = (days: string[]) => {
        const map: Record<string, string> = {
            'Monday': 'Lun',
            'Tuesday': 'Mar',
            'Wednesday': 'Mié',
            'Thursday': 'Jue',
            'Friday': 'Vie',
            'Saturday': 'Sáb',
            'Sunday': 'Dom'
        };
        return days.map(d => map[d] || d).join(', ');
    };

    const handleToggleScheduleActive = async (scheduleId: string, currentStatus: boolean) => {
        try {
            const result = await dataService.toggleCourseScheduleActive(scheduleId, !currentStatus);
            if (result.success) {
                await loadData();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error toggling schedule:', error);
            alert('Error al cambiar estado del horario');
        }
    };

    const handleUpdatePayment = async (enrollmentId: string) => {
        const amount = prompt('Monto pagado:');
        if (!amount) return;

        try {
            const result = await dataService.updateCoursePaymentStatus(
                enrollmentId, 
                parseFloat(amount),
                'cash'
            );
            if (result.success) {
                alert('Pago actualizado exitosamente');
                loadData();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error updating payment:', error);
            alert('Error actualizando pago');
        }
    };

    const handleCreateSchedule = async (data: any) => {
        console.log('[AdminCourseManagement] Creating schedule:', data);
        try {
            const result = await dataService.createCourseSchedule(data);
            if (result.success) {
                alert('✅ Horario creado exitosamente');
                await loadData();
                setShowCreateModal(false);
            } else {
                alert('❌ Error al crear horario: ' + result.error);
            }
        } catch (error) {
            console.error('Error creating schedule:', error);
            alert('❌ Error al crear horario');
        }
    };

    console.log('[AdminCourseManagement] Render - loading:', loading, 'schedules:', schedules.length, 'enrollments:', enrollments.length, 'activeTab:', activeTab);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Cursos</h1>
                <p className="text-gray-600">Administra horarios, inscripciones y asistencia del curso de torno</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('schedules')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                        activeTab === 'schedules'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Horarios
                </button>
                <button
                    onClick={() => setActiveTab('enrollments')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                        activeTab === 'enrollments'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Inscripciones
                </button>
                <button
                    onClick={() => setActiveTab('sessions')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                        activeTab === 'sessions'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Sesiones
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600">Cargando...</p>
                </div>
            ) : (
                <>
                    {/* SCHEDULES TAB */}
                    {activeTab === 'schedules' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Horarios Disponibles</h2>
                                <button 
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    + Crear Horario
                                </button>
                            </div>

                            <div className="grid gap-4">
                                {schedules.map(schedule => (
                                    <div 
                                        key={schedule.id}
                                        className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-xl font-bold text-gray-900">{schedule.name}</h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                        schedule.isActive 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {schedule.isActive ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                        {schedule.format === '3x2' ? '3 días × 2h' : '2 días × 3h'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <span>📅 {getDayNames(schedule.days)}</span>
                                                    <span>🕐 {schedule.startTime} - {schedule.endTime}</span>
                                                    <span>🗓️ Inicia: {formatDate(schedule.startDate)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {schedule.currentEnrollments}/{schedule.capacity}
                                                </div>
                                                <div className="text-sm text-gray-600">Inscritos</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedSchedule(schedule)}
                                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                            >
                                                Ver Sesiones ({schedule.sessions.length})
                                            </button>
                                            <button
                                                onClick={() => handleToggleScheduleActive(schedule.id, schedule.isActive)}
                                                className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                                                    schedule.isActive
                                                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                }`}
                                            >
                                                {schedule.isActive ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {schedules.length === 0 && (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <p className="text-gray-600">No hay horarios configurados</p>
                                    <button className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                                        Crear Primer Horario
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ENROLLMENTS TAB */}
                    {activeTab === 'enrollments' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Inscripciones</h2>
                                <div className="flex gap-2">
                                    <select className="px-4 py-2 border border-gray-300 rounded-lg">
                                        <option value="">Todos los horarios</option>
                                        {schedules.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <select className="px-4 py-2 border border-gray-300 rounded-lg">
                                        <option value="">Todos los estados</option>
                                        <option value="pending_payment">Pendiente pago</option>
                                        <option value="active">Activo</option>
                                        <option value="completed">Completado</option>
                                        <option value="dropped">Retirado</option>
                                    </select>
                                </div>
                            </div>

                            {enrollments.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <p className="text-gray-600">No hay inscripciones aún</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estudiante</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horario</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {enrollments.map(enrollment => (
                                                <tr key={enrollment.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-medium text-gray-900">
                                                            {enrollment.studentInfo.firstName} {enrollment.studentInfo.lastName}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {enrollment.studentEmail}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {schedules.find(s => s.id === enrollment.courseScheduleId)?.name || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            enrollment.status === 'active' ? 'bg-green-100 text-green-800' :
                                                            enrollment.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-800' :
                                                            enrollment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {enrollment.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <div className="font-medium">${enrollment.amountPaid}</div>
                                                        <div className="text-xs text-gray-500">{enrollment.paymentStatus}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <button
                                                            onClick={() => handleUpdatePayment(enrollment.id)}
                                                            className="text-indigo-600 hover:text-indigo-900"
                                                        >
                                                            Actualizar Pago
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SESSIONS TAB */}
                    {activeTab === 'sessions' && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Gestión de Sesiones</h2>
                            
                            {selectedSchedule ? (
                                <div>
                                    <div className="mb-4 flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedSchedule(null)}
                                            className="text-gray-600 hover:text-gray-900"
                                        >
                                            ← Volver
                                        </button>
                                        <h3 className="text-lg font-semibold">{selectedSchedule.name}</h3>
                                    </div>

                                    <div className="grid gap-3">
                                        {selectedSchedule.sessions.map(session => (
                                            <div key={session.id} className="bg-white rounded-lg border border-gray-200 p-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-bold text-indigo-600">Sesión {session.sessionNumber}</span>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                session.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {session.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-900 font-medium mb-1">{session.topic}</div>
                                                        <div className="text-xs text-gray-600">
                                                            {formatDate(session.scheduledDate)} • {session.startTime} - {session.endTime}
                                                        </div>
                                                    </div>
                                                    <button className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm hover:bg-indigo-200">
                                                        Marcar Asistencia
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <p className="text-gray-600">Selecciona un horario desde la pestaña "Horarios" para ver sus sesiones</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Session Details Modal - TODO */}
            {showCreateModal && (
                <CreateScheduleModal 
                    onClose={() => setShowCreateModal(false)} 
                    onSubmit={handleCreateSchedule} 
                />
            )}        </div>
    );
}
