import React, { useState } from 'react';

interface CreateScheduleModalProps {
    onClose: () => void;
    onSubmit: (scheduleData: any) => void;
}

export function CreateScheduleModal({ onClose, onSubmit }: CreateScheduleModalProps) {
    const [formData, setFormData] = useState({
        format: '3x2' as '3x2' | '2x3',
        name: '',
        days: [] as string[],
        startTime: '19:00',
        endTime: '21:00',
        startDate: '',
        capacity: 6
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const dayOptions = [
        { value: 'Monday', label: 'Lunes' },
        { value: 'Tuesday', label: 'Martes' },
        { value: 'Wednesday', label: 'Miércoles' },
        { value: 'Thursday', label: 'Jueves' },
        { value: 'Friday', label: 'Viernes' },
        { value: 'Saturday', label: 'Sábado' },
        { value: 'Sunday', label: 'Domingo' }
    ];

    const handleDayToggle = (day: string) => {
        setFormData(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es requerido';
        }
        if (formData.days.length === 0) {
            newErrors.days = 'Selecciona al menos un día';
        }
        if (!formData.startDate) {
            newErrors.startDate = 'La fecha de inicio es requerida';
        }
        
        // Validar formato
        if (formData.format === '3x2' && formData.days.length !== 3) {
            newErrors.days = 'El formato 3x2 requiere exactamente 3 días';
        }
        if (formData.format === '2x3' && formData.days.length !== 2) {
            newErrors.days = 'El formato 2x3 requiere exactamente 2 días';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Crear Nuevo Horario</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Formato */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Formato del Curso
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, format: '3x2', days: [] })}
                                className={`p-4 border-2 rounded-lg transition-all ${
                                    formData.format === '3x2'
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-300 hover:border-indigo-300'
                                }`}
                            >
                                <div className="font-bold text-lg">3 × 2 horas</div>
                                <div className="text-sm text-gray-600">3 días, 2 horas cada día</div>
                                <div className="text-xs text-gray-500 mt-1">Total: 6 horas</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, format: '2x3', days: [] })}
                                className={`p-4 border-2 rounded-lg transition-all ${
                                    formData.format === '2x3'
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-300 hover:border-indigo-300'
                                }`}
                            >
                                <div className="font-bold text-lg">2 × 3 horas</div>
                                <div className="text-sm text-gray-600">2 días, 3 horas cada día</div>
                                <div className="text-xs text-gray-500 mt-1">Total: 6 horas</div>
                            </button>
                        </div>
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre del Horario
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`w-full px-4 py-2 border rounded-lg ${
                                errors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Ej: Noches, Mañanas, Fines de Semana..."
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    {/* Días */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Días de la Semana {formData.format === '3x2' ? '(Selecciona 3)' : '(Selecciona 2)'}
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {dayOptions.map(day => (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => handleDayToggle(day.value)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                        formData.days.includes(day.value)
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                        {errors.days && <p className="text-red-500 text-sm mt-1">{errors.days}</p>}
                    </div>

                    {/* Horario */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hora de Inicio
                            </label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hora de Fin
                            </label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Fecha de Inicio */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fecha de Inicio del Primer Ciclo
                        </label>
                        <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className={`w-full px-4 py-2 border rounded-lg ${
                                errors.startDate ? 'border-red-500' : 'border-gray-300'
                            }`}
                            min={new Date().toISOString().split('T')[0]}
                        />
                        {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
                    </div>

                    {/* Capacidad */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Capacidad Máxima
                        </label>
                        <input
                            type="number"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            min={1}
                            max={10}
                        />
                        <p className="text-sm text-gray-500 mt-1">Número máximo de estudiantes por ciclo</p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Crear Horario
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
