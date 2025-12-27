import React, { useState } from 'react';
import type { CourseSchedule, CourseEnrollment, UserInfo } from '../../types';

interface CourseRegistrationFormProps {
    selectedSchedule: CourseSchedule;
    onSubmit: (enrollment: Partial<CourseEnrollment>) => void;
    onBack: () => void;
}

export function CourseRegistrationForm({ selectedSchedule, onSubmit, onBack }: CourseRegistrationFormProps) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        experience: 'beginner' as 'beginner' | 'intermediate',
        specialConsiderations: '',
        termsAccepted: false,
        policyAccepted: false
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Nombre requerido';
        }
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Apellido requerido';
        }
        if (!formData.email.trim()) {
            newErrors.email = 'Email requerido';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email inválido';
        }
        if (!formData.phone.trim()) {
            newErrors.phone = 'Teléfono requerido';
        }
        if (!formData.termsAccepted) {
            newErrors.termsAccepted = 'Debes aceptar los términos';
        }
        if (!formData.policyAccepted) {
            newErrors.policyAccepted = 'Debes aceptar la política de cancelación';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        const studentInfo: any = {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim(),
            phoneNumber: formData.phone.trim(),
            experience: formData.experience,
            specialConsiderations: formData.specialConsiderations.trim() || undefined
        };

        const enrollment: Partial<CourseEnrollment> = {
            studentEmail: formData.email.trim(),
            studentInfo,
            courseScheduleId: selectedSchedule.id,
            enrollmentDate: new Date().toISOString(),
            status: 'pending_payment',
            paymentStatus: 'pending',
            amountPaid: 0,
            sessions: selectedSchedule.sessions.map(session => ({
                sessionId: session.id,
                attended: false
            }))
        };

        onSubmit(enrollment);
    };

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
            'Monday': 'Lun',
            'Tuesday': 'Mar',
            'Wednesday': 'Mié',
            'Thursday': 'Jue',
            'Friday': 'Vie',
            'Saturday': 'Sáb',
            'Sunday': 'Dom'
        };
        return map[day] || day;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={onBack}
                        className="flex items-center text-gray-600 hover:text-indigo-700 mb-4 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Cambiar Horario
                    </button>
                    <h1 className="text-4xl font-bold font-serif text-gray-900 mb-2">Inscripción</h1>
                    <p className="text-gray-600">Completa tus datos para reservar tu lugar en el curso</p>
                </div>

                {/* Schedule Summary */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white mb-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-bold mb-2">{selectedSchedule.name}</h3>
                            <div className="space-y-1 text-indigo-100">
                                <p className="flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {selectedSchedule.days.map(getDayName).join(', ')} • {selectedSchedule.startTime} - {selectedSchedule.endTime}
                                </p>
                                <p className="flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Inicia: {formatDate(selectedSchedule.startDate)}
                                </p>
                                <p className="flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    {selectedSchedule.currentEnrollments}/{selectedSchedule.capacity} lugares ocupados
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold">$150</p>
                            <p className="text-indigo-200 text-sm">Pago total</p>
                        </div>
                    </div>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nombre *
                            </label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className={`w-full px-4 py-3 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                                placeholder="Tu nombre"
                            />
                            {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Apellido *
                            </label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className={`w-full px-4 py-3 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                                placeholder="Tu apellido"
                            />
                            {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full px-4 py-3 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                            placeholder="tu@email.com"
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Teléfono *
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className={`w-full px-4 py-3 border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                            placeholder="0999999999"
                        />
                        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nivel de Experiencia
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, experience: 'beginner' })}
                                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                                    formData.experience === 'beginner'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-300 hover:border-indigo-300'
                                }`}
                            >
                                <div className="font-medium">Principiante</div>
                                <div className="text-sm text-gray-600">Nunca he usado el torno</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, experience: 'intermediate' })}
                                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                                    formData.experience === 'intermediate'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-300 hover:border-indigo-300'
                                }`}
                            >
                                <div className="font-medium">Con Experiencia</div>
                                <div className="text-sm text-gray-600">He practicado antes</div>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Consideraciones Especiales (Opcional)
                        </label>
                        <textarea
                            value={formData.specialConsiderations}
                            onChange={(e) => setFormData({ ...formData, specialConsiderations: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            rows={3}
                            placeholder="Alergias, limitaciones físicas, objetivos específicos..."
                        />
                    </div>

                    <div className="border-t border-gray-200 pt-6 space-y-4">
                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={formData.termsAccepted}
                                onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                                className="mt-1 mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor="terms" className="text-sm text-gray-700">
                                Acepto los <a href="#" className="text-indigo-600 hover:underline">términos y condiciones</a> del curso. Entiendo que el curso requiere asistencia a todas las sesiones programadas.
                            </label>
                        </div>
                        {errors.termsAccepted && <p className="text-red-500 text-sm">{errors.termsAccepted}</p>}

                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                id="policy"
                                checked={formData.policyAccepted}
                                onChange={(e) => setFormData({ ...formData, policyAccepted: e.target.checked })}
                                className="mt-1 mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor="policy" className="text-sm text-gray-700">
                                Acepto la <a href="#" className="text-indigo-600 hover:underline">política de cancelación</a>. Las cancelaciones con más de 72 horas de anticipación reciben reembolso completo.
                            </label>
                        </div>
                        {errors.policyAccepted && <p className="text-red-500 text-sm">{errors.policyAccepted}</p>}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg hover:shadow-xl"
                    >
                        Continuar al Pago →
                    </button>
                </form>
            </div>
        </div>
    );
}
