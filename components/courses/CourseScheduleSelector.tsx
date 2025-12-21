import React, { useState, useEffect } from 'react';
import type { CourseSchedule } from '../../types';
import * as dataService from '../../services/dataService';

interface CourseScheduleSelectorProps {
    onSelectSchedule: (schedule: CourseSchedule) => void;
    onBack: () => void;
}

export const CourseScheduleSelector: React.FC<CourseScheduleSelectorProps> = ({ onSelectSchedule, onBack }) => {
    const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
    const [availableSchedules, setAvailableSchedules] = useState<CourseSchedule[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSchedules = async () => {
            try {
                const schedules = await dataService.getCourseSchedules();
                setAvailableSchedules(schedules);
            } catch (error) {
                console.error('Error loading schedules:', error);
            } finally {
                setLoading(false);
            }
        };
        loadSchedules();
    }, []);

    // Mock data - REMOVIDO, ahora usa datos reales del backend

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    const getDayName = (day: string) => {
        const days: Record<string, string> = {
            'Monday': 'Lun',
            'Tuesday': 'Mar',
            'Wednesday': 'Mié',
            'Thursday': 'Jue',
            'Friday': 'Vie',
            'Saturday': 'Sáb',
            'Sunday': 'Dom'
        };
        return days[day] || day;
    };

    const handleContinue = () => {
        const selected = availableSchedules.find(s => s.id === selectedScheduleId);
        if (selected) {
            onSelectSchedule(selected);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-brand-background py-12 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <button 
                    onClick={onBack}
                    className="mb-6 text-brand-secondary hover:text-brand-text transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver
                </button>

                {/* Title */}
                <div className="mb-8">
                    <h1 className="text-4xl font-serif font-bold text-brand-text mb-3">
                        Elige tu Horario
                    </h1>
                    <p className="text-lg text-brand-secondary">
                        Selecciona el horario que mejor se ajuste a tu rutina
                    </p>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        <p className="mt-4 text-brand-secondary">Cargando horarios disponibles...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && availableSchedules.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl">
                        <p className="text-brand-secondary text-lg">No hay horarios disponibles en este momento.</p>
                        <p className="text-sm text-brand-secondary mt-2">Por favor, contacta al estudio para más información.</p>
                    </div>
                )}

                {/* Schedule Options */}
                {!loading && availableSchedules.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {availableSchedules.map((schedule) => {
                        const isSelected = selectedScheduleId === schedule.id;
                        const spotsLeft = schedule.capacity - schedule.currentEnrollments;
                        const isAlmostFull = spotsLeft <= 2;

                        return (
                            <div
                                key={schedule.id}
                                onClick={() => setSelectedScheduleId(schedule.id)}
                                className={`
                                    bg-white rounded-2xl p-6 cursor-pointer transition-all border-2
                                    ${isSelected 
                                        ? 'border-indigo-600 shadow-xl scale-105' 
                                        : 'border-brand-border hover:border-indigo-300 shadow-md hover:shadow-lg'
                                    }
                                `}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-2xl font-bold text-brand-text mb-1">
                                            {schedule.name}
                                        </h3>
                                        <p className="text-sm text-brand-secondary">
                                            {schedule.format === '3x2' ? '3 días × 2 horas' : '2 días × 3 horas'}
                                        </p>
                                    </div>
                                    <div className={`
                                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                                        ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-brand-border'}
                                    `}>
                                        {isSelected && (
                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                </div>

                                {/* Days and Time */}
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-brand-text font-medium">
                                            {schedule.days.map(getDayName).join(' - ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-brand-text font-medium">
                                            {schedule.startTime} - {schedule.endTime}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        <span className={`font-medium ${isAlmostFull ? 'text-amber-600' : 'text-green-600'}`}>
                                            {spotsLeft} {spotsLeft === 1 ? 'cupo disponible' : 'cupos disponibles'}
                                        </span>
                                    </div>
                                </div>

                                {/* Start Date */}
                                <div className="bg-indigo-50 rounded-xl p-3 mb-4">
                                    <div className="text-xs text-indigo-700 font-semibold mb-1">Próximo inicio</div>
                                    <div className="text-lg font-bold text-indigo-900">
                                        {formatDate(schedule.startDate)}
                                    </div>
                                </div>

                                {/* Sessions Timeline */}
                                <div className="pt-4 border-t border-brand-border">
                                    <div className="text-xs font-semibold text-brand-secondary mb-3">
                                        {schedule.sessions.length} sesiones programadas
                                    </div>
                                    <div className="space-y-2">
                                        {schedule.sessions.slice(0, 3).map((session) => (
                                            <div key={session.id} className="flex items-start gap-2 text-xs">
                                                <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                                                    {session.sessionNumber}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-brand-text font-medium">{session.topic}</div>
                                                    <div className="text-brand-secondary">{formatDate(session.scheduledDate)}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {schedule.sessions.length > 3 && (
                                            <div className="text-xs text-brand-secondary pl-8">
                                                +{schedule.sessions.length - 3} sesiones más
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                )}

                {/* CTA */}
                {!loading && availableSchedules.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-brand-secondary mb-1">Inversión total</div>
                            <div className="text-3xl font-bold text-brand-text">$150</div>
                        </div>
                        <button
                            onClick={handleContinue}
                            disabled={!selectedScheduleId}
                            className={`
                                px-8 py-3 rounded-xl font-bold transition-all
                                ${selectedScheduleId
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl'
                                    : 'bg-brand-border text-brand-secondary cursor-not-allowed'
                                }
                            `}
                        >
                            Continuar con Inscripción →
                        </button>
                    </div>
                </div>
                )}

                {/* Info Notice */}
                {!loading && availableSchedules.length > 0 && (
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-blue-800">
                            <strong>Nota:</strong> Una vez seleccionado el horario, el compromiso es asistir a todas las sesiones. 
                            Si necesitas faltar, puedes coordinar una sesión de reposición.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
