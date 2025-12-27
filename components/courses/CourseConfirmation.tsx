import React from 'react';
import type { CourseEnrollment, CourseSchedule } from '../../types';

interface CourseConfirmationProps {
    enrollment: CourseEnrollment;
    schedule: CourseSchedule;
    onDone: () => void;
}

export function CourseConfirmation({ enrollment, schedule, onDone }: CourseConfirmationProps) {
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-EC', { 
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
        });
    };

    const getDayName = (day: string): string => {
        const map: Record<string, string> = {
            'Monday': 'Lunes',
            'Tuesday': 'Martes',
            'Wednesday': 'Miércoles',
            'Thursday': 'Jueves',
            'Friday': 'Viernes',
            'Saturday': 'Sábado',
            'Sunday': 'Domingo'
        };
        return map[day] || day;
    };

    const generateICalData = (): string => {
        // Placeholder para Phase 2 - generación real de iCal
        return 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Ultima Ceramic//Course//ES\nEND:VCALENDAR';
    };

    const downloadCalendar = () => {
        const icalData = generateICalData();
        const blob = new Blob([icalData], { type: 'text/calendar' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'curso-torno-ultima-ceramic.ics';
        link.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Success Icon & Message */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold font-serif text-gray-900 mb-2">¡Inscripción Confirmada!</h1>
                    <p className="text-lg text-gray-600">
                        Tu lugar en el curso ha sido reservado exitosamente
                    </p>
                </div>

                {/* Enrollment Details */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
                    <div className="border-b border-gray-200 pb-6 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Detalles de tu Curso</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Estudiante:</span>
                                <span className="font-medium text-gray-900">
                                    {enrollment.studentInfo.firstName} {enrollment.studentInfo.lastName}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Email:</span>
                                <span className="font-medium text-gray-900">{enrollment.studentEmail}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Teléfono:</span>
                                <span className="font-medium text-gray-900">{(enrollment.studentInfo as any).phoneNumber || enrollment.studentInfo.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">ID de Inscripción:</span>
                                <span className="font-mono text-sm text-gray-900">{enrollment.id}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">{schedule.name}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <div>
                                    <div className="font-medium text-gray-900">Días</div>
                                    <div className="text-gray-600">{schedule.days.map(getDayName).join(', ')}</div>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <div className="font-medium text-gray-900">Horario</div>
                                    <div className="text-gray-600">{schedule.startTime} - {schedule.endTime}</div>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <div>
                                    <div className="font-medium text-gray-900">Inicio</div>
                                    <div className="text-gray-600">{formatDate(schedule.startDate)}</div>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <div>
                                    <div className="font-medium text-gray-900">Sesiones</div>
                                    <div className="text-gray-600">{schedule.sessions.length} clases</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <svg className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <div className="font-medium text-amber-900 mb-1">Instrucciones de Pago</div>
                                <div className="text-sm text-amber-800">
                                    Por favor, completa el pago de <span className="font-bold">$150</span> mediante transferencia bancaria o efectivo en el estudio.
                                    Recibirás los detalles bancarios por email en los próximos minutos.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={downloadCalendar}
                            className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Descargar Calendario (.ics)
                        </button>

                        <button
                            onClick={() => window.open('https://chat.whatsapp.com/placeholder', '_blank')}
                            className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            Unirse al Grupo de WhatsApp
                        </button>
                    </div>
                </div>

                {/* What to Expect */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Qué Esperar</h3>
                    <div className="space-y-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-indigo-700 font-bold">1</span>
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">Confirmación por Email</div>
                                <div className="text-sm text-gray-600">Recibirás un email con los detalles del curso y los datos bancarios para el pago.</div>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-indigo-700 font-bold">2</span>
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">Acceso al Grupo Privado</div>
                                <div className="text-sm text-gray-600">Únete a nuestro grupo de WhatsApp exclusivo para estudiantes del curso.</div>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-indigo-700 font-bold">3</span>
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">Preparación para la Primera Clase</div>
                                <div className="text-sm text-gray-600">Te enviaremos información sobre qué traer y cómo prepararte para tu primera sesión.</div>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-indigo-700 font-bold">4</span>
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">Recordatorios de Sesiones</div>
                                <div className="text-sm text-gray-600">Recibirás recordatorios 24 horas antes de cada sesión.</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¿Tienes Preguntas?</h3>
                    <p className="text-gray-600 mb-4">Estamos aquí para ayudarte</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href="mailto:info@ultimaceramic.com"
                            className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            info@ultimaceramic.com
                        </a>
                        <a
                            href="tel:+593999999999"
                            className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            +593 99 999 9999
                        </a>
                    </div>
                </div>

                {/* Back to Home */}
                <button
                    onClick={onDone}
                    className="w-full py-4 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                >
                    Volver al Inicio
                </button>
            </div>
        </div>
    );
}
