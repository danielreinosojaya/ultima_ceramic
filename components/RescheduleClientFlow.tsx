import React, { useState, useEffect } from 'react';
import type { Booking, AppData } from '../types';
import * as dataService from '../services/dataService';
import { formatDate } from '../utils/formatters';
import { XMarkIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface RescheduleClientFlowProps {
    booking: Booking;
    appData: AppData | null;
    onClose?: () => void;
    onRescheduleComplete?: () => void;
}

interface RescheduleStep {
    step: 'info' | 'select_date' | 'select_time' | 'confirm' | 'success';
}

/**
 * RescheduleClientFlow
 * 
 * Modal flow for clients to reschedule their classes.
 * - Shows grace period and reschedule allowance
 * - Allows selecting new date and time
 * - Confirms with server
 * - Shows success/error messages
 */
export const RescheduleClientFlow: React.FC<RescheduleClientFlowProps> = ({
    booking,
    appData,
    onClose,
    onRescheduleComplete
}) => {
    const [currentStep, setCurrentStep] = useState<RescheduleStep['step']>('select_date');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reschedulingInfo, setReschedulingInfo] = useState<any>(null);

    // Load rescheduling eligibility info
    useEffect(() => {
        const loadReschedulingInfo = async () => {
            if (!booking.id || !booking.slots || booking.slots.length === 0) {
                // Skip eligibility check and go straight to date selection
                setReschedulingInfo({ eligible: true, reason: null, allowedReschedules: 1 });
                return;
            }
            try {
                // Check if booking is eligible for rescheduling
                // (Has 72h before slot date, hasn't exceeded allowance)
                const slot = booking.slots[0];
                const slotDate = new Date(slot.date);
                const now = new Date();
                const hoursUntil = (slotDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                
                const eligible = hoursUntil >= 72;
                setReschedulingInfo({
                    eligible: true, // For client flow, always allow (backend will validate)
                    reason: !eligible ? 'Debe quedar al menos 72 horas antes de la clase para reagendar' : null,
                    allowedReschedules: 1 // Simplify for now
                });
            } catch (err) {
                console.error('Error checking reschedule eligibility:', err);
                setReschedulingInfo({ eligible: true, reason: null, allowedReschedules: 1 });
            }
        };
        loadReschedulingInfo();
    }, [booking.id, booking.slots]);

    const handleRescheduleConfirm = async () => {
        if (!booking.slots || booking.slots.length === 0 || !selectedDate || !selectedTime) {
            setError('Por favor selecciona una nueva fecha y hora');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const oldSlot = booking.slots[0]; // First scheduled slot
            const newSlot = {
                date: selectedDate,
                time: selectedTime,
                instructorId: oldSlot.instructorId || 0,
                technique: oldSlot.technique
            };

            const result = await dataService.rescheduleBookingSlot(
                booking.id,
                oldSlot,
                newSlot
            );

            if (result.success) {
                setCurrentStep('success');
                if (onRescheduleComplete) {
                    setTimeout(() => onRescheduleComplete(), 2000);
                }
            } else {
                setError(result.message || 'Error al reagendar la clase');
            }
        } catch (err) {
            console.error('Error rescheduling:', err);
            setError('Error al procesar el reagendamiento');
        } finally {
            setLoading(false);
        }
    };

    const getAvailableDates = (): string[] => {
        if (!appData || !appData.availability) return [];
        
        // Get dates from next 30 days
        const dates: string[] = [];
        const today = new Date();
        for (let i = 1; i <= 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    };

    const getAvailableTimes = (): string[] => {
        // Standard class times
        return ['09:00 AM', '10:30 AM', '02:00 PM', '03:30 PM', '05:00 PM', '06:30 PM'];
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-96 overflow-y-auto shadow-lg">
                {/* Header */}
                <div className="sticky top-0 bg-brand-primary text-white p-6 flex items-center justify-between border-b border-gray-200">
                    <h2 className="text-xl font-bold">
                        {currentStep === 'success' ? '✓ Reagendamiento Confirmado' : 'Reagendar Clase'}
                    </h2>
                    {onClose && currentStep !== 'success' && (
                        <button
                            onClick={onClose}
                            className="hover:opacity-80 transition-opacity"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Info Step */}
                    {currentStep === 'info' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-semibold text-brand-text mb-2">Información de Reagendamiento</h3>
                                {reschedulingInfo ? (
                                    <ul className="text-sm text-brand-secondary space-y-1">
                                        <li>✓ Período de gracia: <strong>72 horas</strong></li>
                                        <li>✓ Reagendamientos disponibles: <strong>{reschedulingInfo.allowedReschedules || 1}</strong></li>
                                        <li>✓ Clase original: <strong>{booking.slots?.[0] ? formatDate(booking.slots[0].date) : 'N/A'}</strong></li>
                                    </ul>
                                ) : (
                                    <p className="text-sm text-brand-secondary">Cargando información...</p>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            {reschedulingInfo?.eligible && (
                                <button
                                    onClick={() => setCurrentStep('select_date')}
                                    className="w-full bg-brand-accent text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Continuar
                                </button>
                            )}

                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="w-full bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    )}

                    {/* Select Date Step */}
                    {currentStep === 'select_date' && (
                        <div className="space-y-4">
                            <label className="block text-sm font-semibold text-brand-text">
                                Selecciona una nueva fecha
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {getAvailableDates().slice(0, 9).map((date) => (
                                    <button
                                        key={date}
                                        onClick={() => {
                                            setSelectedDate(date);
                                            setCurrentStep('select_time');
                                        }}
                                        className={`p-2 rounded-lg text-center text-sm font-medium transition-colors ${
                                            selectedDate === date
                                                ? 'bg-brand-primary text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <CalendarIcon className="w-3 h-3" />
                                        </div>
                                        {new Date(date).toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: 'short'
                                        })}
                                    </button>
                                ))}
                            </div>

                            {selectedDate && (
                                <button
                                    onClick={() => setCurrentStep('select_time')}
                                    className="w-full bg-brand-accent text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Siguiente →
                                </button>
                            )}

                            <button
                                onClick={() => setCurrentStep('info')}
                                className="w-full bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                ← Atrás
                            </button>
                        </div>
                    )}

                    {/* Select Time Step */}
                    {currentStep === 'select_time' && (
                        <div className="space-y-4">
                            <label className="block text-sm font-semibold text-brand-text">
                                Selecciona una hora para el {new Date(selectedDate || '').toLocaleDateString('es-ES')}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {getAvailableTimes().map((time) => (
                                    <button
                                        key={time}
                                        onClick={() => {
                                            setSelectedTime(time);
                                            setCurrentStep('confirm');
                                        }}
                                        className={`p-3 rounded-lg text-center font-medium transition-colors flex items-center justify-center gap-2 ${
                                            selectedTime === time
                                                ? 'bg-brand-primary text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        <ClockIcon className="w-4 h-4" />
                                        {time}
                                    </button>
                                ))}
                            </div>

                            {selectedTime && (
                                <button
                                    onClick={() => setCurrentStep('confirm')}
                                    className="w-full bg-brand-accent text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Siguiente →
                                </button>
                            )}

                            <button
                                onClick={() => setCurrentStep('select_date')}
                                className="w-full bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                ← Atrás
                            </button>
                        </div>
                    )}

                    {/* Confirm Step */}
                    {currentStep === 'confirm' && (
                        <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h3 className="font-semibold text-brand-text mb-3">Confirma tu reagendamiento</h3>
                                <div className="space-y-2 text-sm text-brand-secondary">
                                    <p>
                                        <strong>Clase:</strong> {booking.product?.name}
                                    </p>
                                    <p>
                                        <strong>Nueva fecha:</strong> {selectedDate ? formatDate(selectedDate) : 'N/A'}
                                    </p>
                                    <p>
                                        <strong>Nueva hora:</strong> {selectedTime}
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleRescheduleConfirm}
                                disabled={loading}
                                className="w-full bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Procesando...' : 'Confirmar Reagendamiento'}
                            </button>

                            <button
                                onClick={() => setCurrentStep('select_time')}
                                disabled={loading}
                                className="w-full bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                                ← Atrás
                            </button>
                        </div>
                    )}

                    {/* Success Step */}
                    {currentStep === 'success' && (
                        <div className="space-y-4 text-center py-4">
                            <div className="text-5xl mb-4">✓</div>
                            <h3 className="text-xl font-bold text-green-600">¡Reagendamiento Exitoso!</h3>
                            <p className="text-brand-secondary">
                                Tu clase ha sido reprogramada para el {selectedDate ? formatDate(selectedDate) : 'N/A'} a las {selectedTime}
                            </p>
                            <p className="text-sm text-brand-secondary">
                                Se ha enviado una confirmación a tu email
                            </p>
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="w-full bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Cerrar
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
