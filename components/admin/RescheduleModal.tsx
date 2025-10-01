
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

export const RescheduleModal: React.FC<RescheduleModalProps> = ({ isOpen, onClose, onSave, slotInfo, appData }) => {
    const language = 'es-ES';
    
    const [currentDate, setCurrentDate] = useState(new Date(slotInfo.slot.date + 'T00:00:00'));
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<EnrichedAvailableSlot | null>(null);
    
    useEffect(() => {
        // Reset state when modal is reopened for a new slot
        setCurrentDate(new Date(slotInfo.slot.date + 'T00:00:00'));
        setSelectedDate(null);
        setSelectedTime(null);
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
        // FIX: Pass appData to getAvailableTimesForDate
        if (date < today || dataService.getAvailableTimesForDate(date, appData).length === 0) return;
        setSelectedDate(date);
        setSelectedTime(null);
    };

    const handleSubmit = () => {
        if (selectedDate && selectedTime) {
            onSave({
                date: formatDateToYYYYMMDD(selectedDate),
                time: selectedTime.time,
                instructorId: selectedTime.instructorId,
            });
        }
    };
    
    if (!isOpen) return null;

    // FIX: Pass appData to getAvailableTimesForDate
    const availableTimes = selectedDate ? dataService.getAvailableTimesForDate(selectedDate, appData) : [];
    const formattedCurrentSlotDate = new Date(slotInfo.slot.date + 'T00:00:00').toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' });
    const translatedDayNames = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(dayIndex => new Date(2024, 0, dayIndex + 7).toLocaleDateString(language, { weekday: 'short' })), [language]);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-serif text-brand-accent mb-2 text-center">Reagendar para {slotInfo.attendeeName}</h2>
                <div className="text-center bg-brand-background p-2 rounded-md mb-4">
                    <p className="text-sm font-bold text-brand-secondary">Clase actual:</p>
                    <p className="text-md font-semibold text-brand-text">{formattedCurrentSlotDate} @ {slotInfo.slot.time}</p>
                </div>

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
                                // FIX: Pass appData to getAvailableTimesForDate
                                const isUnavailable = dataService.getAvailableTimesForDate(date, appData).length === 0;
                                const dateStr = formatDateToYYYYMMDD(date);
                                const dayIsSelected = selectedDate && formatDateToYYYYMMDD(selectedDate) === dateStr;
                                const isDisabled = isPast || isUnavailable;

                                return <button key={day} onClick={() => handleDayClick(day)} disabled={isDisabled} className={`w-full aspect-square rounded-full text-sm font-semibold transition-all ${isDisabled ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'hover:bg-brand-primary/20'} ${dayIsSelected ? 'bg-brand-primary text-white shadow-md ring-2 ring-brand-accent' : 'bg-white'}`}>{day}</button>
                            })}
                        </div>
                    </div>
                    {/* Horarios */}
                    <div className="bg-brand-background p-3 rounded-lg">
                       {selectedDate ? (
                         <>
                            <h4 className="font-bold text-center mb-2">{selectedDate.toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 -mr-2">
                               {availableTimes.length > 0 ? availableTimes.map(slot => (
                                   <button
                                       key={slot.time}
                                       onClick={() => setSelectedTime(slot)}
                                       className={`w-full flex items-center justify-between p-2 rounded-lg text-md font-semibold transition-all ${selectedTime?.time === slot.time ? 'bg-brand-accent text-white' : 'bg-white hover:bg-brand-primary/20'}`}
                                   >
                                       <span className="font-semibold text-brand-text text-sm">{slot.time}</span>
                                       <div className="flex items-center gap-2">
                                            <InstructorTag instructorId={slot.instructorId} instructors={appData.instructors} />
                                            <CapacityIndicator count={slot.paidBookingsCount} max={slot.maxCapacity} capacityMessages={appData.capacityMessages} />
                                       </div>
                                   </button>
                               )) : <p className="text-center text-brand-secondary text-sm p-4">No hay clases disponibles.</p>}
                           </div>
                         </>
                       ) : (
                         <div className="flex items-center justify-center h-full">
                            <p className="text-brand-secondary text-center">Selecciona un día para ver los horarios disponibles.</p>
                         </div>
                       )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button type="button" onClick={onClose} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={!selectedDate || !selectedTime} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent disabled:bg-gray-400">
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};