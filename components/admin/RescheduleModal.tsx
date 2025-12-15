
import React, { useState, useMemo, useEffect } from 'react';
import type { TimeSlot, RescheduleSlotInfo, EnrichedAvailableSlot, AppData } from '../../types';
import * as dataService from '../../services/dataService';
import { InstructorTag } from '../InstructorTag';
import { CapacityIndicator } from '../CapacityIndicator';

const formatDateToYYYYMMDD = (d: Date): string => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface RescheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newSlot: TimeSlot) => void;
    slotInfo: RescheduleSlotInfo;
    appData: AppData;
}

interface ValidationWarning {
    requiresApproval: boolean;
    hoursUntilClass: number;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({ isOpen, onClose, onSave, slotInfo, appData }) => {
    const language = 'es-ES';
    
    const [currentDate, setCurrentDate] = useState(new Date(slotInfo.slot.date + 'T00:00:00'));
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedHour, setSelectedHour] = useState<string | null>(null);
    const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
    const [validationWarning, setValidationWarning] = useState<ValidationWarning | null>(null);
    const [adminApproved, setAdminApproved] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        // Reset state when modal is reopened for a new slot
        setCurrentDate(new Date(slotInfo.slot.date + 'T00:00:00'));
        setSelectedDate(null);
        setSelectedHour(null);
        setSelectedInstructor(null);
        setValidationWarning(null);
        setAdminApproved(false);
    }, [slotInfo, isOpen]);

    const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const calendarDays = useMemo(() => {
        const blanks = Array(firstDayOfMonth.getDay()).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        return [...blanks, ...days];
    }, [currentDate.getFullYear(), currentDate.getMonth()]);

    const handleDayClick = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        date.setHours(0, 0, 0, 0);
        if (date < today) return;
        setSelectedDate(date);
        setSelectedHour(null);
        setSelectedInstructor(null);
    };

    const handleSubmit = async () => {
        if (!selectedDate || !selectedHour || !selectedInstructor) return;

        const newSlot: TimeSlot = {
            date: formatDateToYYYYMMDD(selectedDate),
            time: selectedHour,
            instructorId: parseInt(selectedInstructor),
        };

        // Validar 72 horas ANTES de intentar guardar
        const now = new Date();
        const oldSlotDate = new Date(slotInfo.slot.date + 'T00:00:00');
        const hoursDifference = (oldSlotDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursDifference < 72 && !adminApproved) {
            // Mostrar warning y pedir aprobación
            setValidationWarning({
                requiresApproval: true,
                hoursUntilClass: hoursDifference
            });
            return;
        }

        // Si llegamos aquí, proceder con reagendamiento
        setIsSubmitting(true);
        try {
            const result = await dataService.rescheduleBookingSlot(
                slotInfo.bookingId,
                slotInfo.slot,
                newSlot,
                adminApproved // Pasar flag si fue aprobado por admin
            );

            if (result.success) {
                onSave(newSlot);
                onClose();
            } else {
                // Si aún hay error, mostrar
                alert((result as any).error || 'Error al reagendar');
            }
        } catch (error) {
            alert('Error al reagendar: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;

    const formattedCurrentSlotDate = new Date(slotInfo.slot.date + 'T00:00:00').toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' });
    const translatedDayNames = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(dayIndex => new Date(2024, 0, dayIndex + 7).toLocaleDateString(language, { weekday: 'short' })), [language]);

    // Modal de confirmación si requiere aprobación admin
    if (validationWarning?.requiresApproval && !adminApproved) {
        return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full mb-4">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0H8m4 0h4m9 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-serif text-brand-accent mb-2 text-center">Aprobación Requerida</h2>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-yellow-800">
                            <strong>La clase está a {Math.ceil(validationWarning.hoursUntilClass)} horas.</strong> Normalmente se requieren 72 horas de anticipación para reagendar.
                        </p>
                        <p className="text-sm text-yellow-700 mt-2">
                            ¿Deseas reagendar por excepción como admin?
                        </p>
                    </div>
                    <div className="space-y-2 mb-4">
                        <div className="bg-brand-background p-2 rounded-md">
                            <p className="text-xs font-bold text-brand-secondary">Cliente: {slotInfo.attendeeName}</p>
                            <p className="text-sm text-brand-text">{formattedCurrentSlotDate} @ {slotInfo.slot.time}</p>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button 
                            type="button" 
                            onClick={() => {
                                setValidationWarning(null);
                                setAdminApproved(false);
                            }} 
                            className="flex-1 bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setAdminApproved(true)} 
                            className="flex-1 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent"
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-serif text-brand-accent mb-2 text-center">Reagendar para {slotInfo.attendeeName}</h2>
                <div className="text-center bg-brand-background p-2 rounded-md mb-4">
                    <p className="text-sm font-bold text-brand-secondary">Clase actual:</p>
                    <p className="text-md font-semibold text-brand-text">{formattedCurrentSlotDate} @ {slotInfo.slot.time}</p>
                </div>

                {adminApproved && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-800">
                            ✓ <strong>Excepción admin aprobada</strong> - Reagendamiento permitido fuera del límite de 72 horas.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Calendario */}
                    <div>
                        <h3 className="font-bold text-brand-text mb-2 text-center">Selecciona nueva fecha</h3>
                        <div className="flex items-center justify-between mb-2">
                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} disabled={currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()} className="p-2 rounded-full hover:bg-brand-background disabled:opacity-50">&larr;</button>
                            <h4 className="text-lg font-bold text-brand-text capitalize">{currentDate.toLocaleString(language, { month: 'long', year: 'numeric' })}</h4>
                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-brand-background">&rarr;</button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs text-brand-secondary mb-1">
                            {translatedDayNames.map(day => <div key={day} className="font-bold">{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, index) => {
                                if (!day) return <div key={`blank-${index}`}></div>;
                                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day); date.setHours(0,0,0,0);
                                const isPast = date < today;
                                const dateStr = formatDateToYYYYMMDD(date);
                                const dayIsSelected = selectedDate && formatDateToYYYYMMDD(selectedDate) === dateStr;
                                const isDisabled = isPast;

                                return <button key={day} onClick={() => handleDayClick(day)} disabled={isDisabled} className={`w-full aspect-square rounded-full text-sm font-semibold transition-all ${isDisabled ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'hover:bg-brand-primary/20'} ${dayIsSelected ? 'bg-brand-primary text-white shadow-md ring-2 ring-brand-accent' : 'bg-white'}`}>{day}</button>
                            })}
                        </div>
                    </div>
                                        {/* Horarios flexibles */}
                                        <div className="bg-brand-background p-3 rounded-lg">
                                             {selectedDate ? (
                                                 <>
                                                        <h4 className="font-bold text-center mb-2">{selectedDate.toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                                                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 -mr-2">
                                                                <label className="block text-sm font-bold mb-1 text-brand-text">Hora</label>
                                                                <input type="time" className="w-full p-2 rounded-lg border" value={selectedHour || ''} onChange={e => setSelectedHour(e.target.value)} />
                                                                <label className="block text-sm font-bold mt-3 mb-1 text-brand-text">Instructor</label>
                                                                <select className="w-full p-2 rounded-lg border" value={selectedInstructor || ''} onChange={e => setSelectedInstructor(e.target.value)}>
                                                                        <option value="">Selecciona instructor</option>
                                                                        {appData.instructors.map(inst => (
                                                                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                                                                        ))}
                                                                </select>
                                                        </div>
                                                 </>
                                             ) : (
                                                 <div className="flex items-center justify-center h-full">
                                                        <p className="text-brand-secondary text-center">Selecciona un día para elegir hora e instructor.</p>
                                                 </div>
                                             )}
                                        </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button type="button" onClick={onClose} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={!selectedDate || !selectedHour || !selectedInstructor || isSubmitting} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent disabled:bg-gray-400">
                        {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
};