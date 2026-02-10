import React, { useState, useMemo, useCallback } from 'react';
import * as dataService from '../../services/dataService';
// Eliminado useLanguage, la app ahora es monolingüe en español
import type { AvailableSlot, Instructor, ScheduleOverrides, DayKey, ClassCapacity, Technique, FreeDateTimeOverrides } from '../../types';
import { DAY_NAMES } from '@/constants';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { InstructorManager } from './InstructorManager';

const formatDateToYYYYMMDD = (d: Date): string => d.toISOString().split('T')[0];

interface ScheduleSettingsManagerProps {
    availability: Record<DayKey, AvailableSlot[]>;
    overrides: ScheduleOverrides;
    freeDateTimeOverrides: FreeDateTimeOverrides;
    instructors: Instructor[];
    classCapacity: ClassCapacity;
    onDataChange: () => void;
}

export const ScheduleSettingsManager: React.FC<ScheduleSettingsManagerProps> = ({ availability, overrides, freeDateTimeOverrides, instructors, classCapacity, onDataChange }) => {
    // Monolingüe español, textos hardcodeados
    const language = 'es-ES';
    
    const [newSlot, setNewSlot] = useState<{ day: DayKey, time: string, instructorId: number, technique: Technique }>({ day: 'Monday', time: '', instructorId: instructors[0]?.id || 0, technique: 'potters_wheel' });
    const [selectedExceptionDate, setSelectedExceptionDate] = useState<Date | null>(null);
    const [newExceptionSlot, setNewExceptionSlot] = useState<{ time: string, instructorId: number, technique: Technique }>({ time: '', instructorId: instructors[0]?.id || 0, technique: 'potters_wheel' });
    const [defaultCapacity, setDefaultCapacity] = useState<ClassCapacity>(classCapacity);
    const [isCapacitySaved, setIsCapacitySaved] = useState(false);
    const [selectedBlockedDate, setSelectedBlockedDate] = useState<Date | null>(null);
    const [newBlockedTime, setNewBlockedTime] = useState('');
    
    const handleAddSlot = async (day: DayKey) => {
        if (!newSlot.time || !newSlot.instructorId) {
            alert('Please select a time and instructor.');
            return;
        }
        const updatedAvailability = { ...availability };
        updatedAvailability[day].push({ time: newSlot.time, instructorId: newSlot.instructorId, technique: newSlot.technique });
        updatedAvailability[day].sort((a, b) => a.time.localeCompare(b.time));
        await dataService.updateAvailability(updatedAvailability);
        onDataChange();
    };

    const handleRemoveSlot = async (day: DayKey, slotToRemove: AvailableSlot) => {
        const updatedAvailability = { ...availability };
        updatedAvailability[day] = updatedAvailability[day].filter(s => s.time !== slotToRemove.time || s.instructorId !== slotToRemove.instructorId || s.technique !== slotToRemove.technique);
        await dataService.updateAvailability(updatedAvailability);
        onDataChange();
    };

    const handleAddExceptionSlot = async () => {
        if (!selectedExceptionDate || !newExceptionSlot.time || !newExceptionSlot.instructorId) return;
        const dateStr = formatDateToYYYYMMDD(selectedExceptionDate);
        const updatedOverrides = { ...overrides };
        if (!updatedOverrides[dateStr] || !updatedOverrides[dateStr].slots) {
            const dayKey = DAY_NAMES[selectedExceptionDate.getDay()];
            updatedOverrides[dateStr] = { slots: [...availability[dayKey]] };
        }
        updatedOverrides[dateStr].slots!.push({ time: newExceptionSlot.time, instructorId: newExceptionSlot.instructorId, technique: newExceptionSlot.technique });
        updatedOverrides[dateStr].slots!.sort((a, b) => a.time.localeCompare(b.time));
        await dataService.updateScheduleOverrides(updatedOverrides);
        onDataChange();
    };

    const handleRemoveExceptionSlot = async (slotToRemove: AvailableSlot) => {
        if (!selectedExceptionDate) return;
        const dateStr = formatDateToYYYYMMDD(selectedExceptionDate);
        const updatedOverrides = { ...overrides };
        if (!updatedOverrides[dateStr] || !updatedOverrides[dateStr].slots) return;
        updatedOverrides[dateStr].slots = updatedOverrides[dateStr].slots!.filter(s => s.time !== slotToRemove.time || s.instructorId !== slotToRemove.instructorId || s.technique !== slotToRemove.technique);
        await dataService.updateScheduleOverrides(updatedOverrides);
        onDataChange();
    };
    
    const handleResetExceptionDay = async () => {
        if (!selectedExceptionDate) return;
        const dateStr = formatDateToYYYYMMDD(selectedExceptionDate);
        const updatedOverrides = { ...overrides };
        delete updatedOverrides[dateStr];
        await dataService.updateScheduleOverrides(updatedOverrides);
        onDataChange();
    };

    const handleCapacityOverrideChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedExceptionDate) return;
        const dateStr = formatDateToYYYYMMDD(selectedExceptionDate);
        const newCapacity = e.target.value;
        const updatedOverrides = { ...overrides };

        if (!updatedOverrides[dateStr]) {
            const dayKey = DAY_NAMES[selectedExceptionDate.getDay()];
            updatedOverrides[dateStr] = { slots: [...availability[dayKey]] };
        }

        if (newCapacity === '' || isNaN(parseInt(newCapacity))) {
            delete updatedOverrides[dateStr].capacity;
        } else {
            updatedOverrides[dateStr].capacity = parseInt(newCapacity, 10);
        }

        await dataService.updateScheduleOverrides(updatedOverrides);
        onDataChange();
    };

    const handleSaveDefaultCapacity = async () => {
        await dataService.updateClassCapacity(defaultCapacity);
        setIsCapacitySaved(true);
        setTimeout(() => setIsCapacitySaved(false), 3000);
        onDataChange();
    };

    const handleAddBlockedTime = async () => {
        if (!selectedBlockedDate || !newBlockedTime) return;
        const dateStr = formatDateToYYYYMMDD(selectedBlockedDate);
        const updatedOverrides: FreeDateTimeOverrides = { ...freeDateTimeOverrides };
        const existing = updatedOverrides[dateStr]?.disabledTimes || [];
        if (!existing.includes(newBlockedTime)) {
            updatedOverrides[dateStr] = { disabledTimes: [...existing, newBlockedTime].sort() };
            await dataService.updateFreeDateTimeOverrides(updatedOverrides);
            onDataChange();
        }
        setNewBlockedTime('');
    };

    const handleRemoveBlockedTime = async (time: string) => {
        if (!selectedBlockedDate) return;
        const dateStr = formatDateToYYYYMMDD(selectedBlockedDate);
        const updatedOverrides: FreeDateTimeOverrides = { ...freeDateTimeOverrides };
        const nextTimes = (updatedOverrides[dateStr]?.disabledTimes || []).filter(t => t !== time);
        if (nextTimes.length === 0) {
            delete updatedOverrides[dateStr];
        } else {
            updatedOverrides[dateStr] = { disabledTimes: nextTimes };
        }
        await dataService.updateFreeDateTimeOverrides(updatedOverrides);
        onDataChange();
    };

    const handleClearBlockedDay = async () => {
        if (!selectedBlockedDate) return;
        const dateStr = formatDateToYYYYMMDD(selectedBlockedDate);
        const updatedOverrides: FreeDateTimeOverrides = { ...freeDateTimeOverrides };
        delete updatedOverrides[dateStr];
        await dataService.updateFreeDateTimeOverrides(updatedOverrides);
        onDataChange();
    };
    
    const exceptionDaySlots = useMemo(() => {
        if (!selectedExceptionDate) return [];
        const dateStr = formatDateToYYYYMMDD(selectedExceptionDate);
        if (overrides[dateStr] && overrides[dateStr].slots) {
            return overrides[dateStr].slots;
        }
        const dayKey = DAY_NAMES[selectedExceptionDate.getDay()];
        return availability[dayKey];
    }, [selectedExceptionDate, overrides, availability]);

    const exceptionDayCapacity = useMemo(() => {
        if (!selectedExceptionDate) return undefined;
        const dateStr = formatDateToYYYYMMDD(selectedExceptionDate);
        return overrides[dateStr]?.capacity;
    }, [selectedExceptionDate, overrides]);

    const blockedTimesForDate = useMemo(() => {
        if (!selectedBlockedDate) return [];
        const dateStr = formatDateToYYYYMMDD(selectedBlockedDate);
        return freeDateTimeOverrides?.[dateStr]?.disabledTimes || [];
    }, [selectedBlockedDate, freeDateTimeOverrides]);

    return (
        <div className="space-y-8">
            <InstructorManager onInstructorsUpdate={onDataChange} instructors={instructors} />

            <div>
                <h2 className="text-xl font-serif text-brand-text mb-2">Capacidad por defecto</h2>
                <p className="text-brand-secondary text-sm mb-4">Configura la capacidad máxima para cada tipo de clase.</p>
                 <div className="bg-brand-background p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="potters_wheel-capacity" className="block text-sm font-bold text-brand-secondary mb-1">
                                Torno de alfarero
                            </label>
                            <input
                                id="potters_wheel-capacity"
                                type="number"
                                value={defaultCapacity.potters_wheel || ''}
                                onChange={(e) => setDefaultCapacity(c => ({...c, potters_wheel: parseInt(e.target.value, 10) || 0 }))}
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label htmlFor="molding-capacity" className="block text-sm font-bold text-brand-secondary mb-1">
                                Modelado manual
                            </label>
                            <input
                                id="molding-capacity"
                                type="number"
                                value={defaultCapacity.molding || ''}
                                onChange={(e) => setDefaultCapacity(c => ({...c, molding: parseInt(e.target.value, 10) || 0 }))}
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label htmlFor="introductory_class-capacity" className="block text-sm font-bold text-brand-secondary mb-1">
                                Clase Introductoria
                            </label>
                            <input
                                id="introductory_class-capacity"
                                type="number"
                                value={defaultCapacity.introductory_class || ''}
                                onChange={(e) => setDefaultCapacity(c => ({...c, introductory_class: parseInt(e.target.value, 10) || 0 }))}
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-4 mt-4">
                        <button onClick={handleSaveDefaultCapacity} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">
                            Guardar capacidad
                        </button>
                        {isCapacitySaved && (
                            <p className="text-sm font-semibold text-brand-success animate-fade-in">
                                ¡Capacidad guardada!
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-serif text-brand-text mb-2">Configuración de horarios</h2>
                <p className="text-brand-secondary text-sm mb-4">Administra los horarios disponibles para cada día.</p>
                <div className="space-y-4">
                    {DAY_NAMES.map(day => (
                        <div key={day} className="bg-brand-background p-3 rounded-lg">
                            <h4 className="font-bold text-brand-text mb-2">{day}</h4>
                            <div className="space-y-2">
                                {availability[day]?.map(slot => (
                                    <div key={`${slot.time}-${slot.instructorId}-${slot.technique}`} className="flex items-center justify-between bg-white p-2 rounded-md text-sm">
                                        <span>{slot.time} - {instructors.find(i => i.id === slot.instructorId)?.name || 'N/A'} ({slot.technique === 'potters_wheel' ? 'Torno' : 'Modelado'})</span>
                                        <button onClick={() => handleRemoveSlot(day, slot)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                {availability[day]?.length === 0 && <p className="text-xs text-brand-secondary text-center">No hay horarios disponibles.</p>}
                            </div>
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                                <input type="time" onChange={e => setNewSlot({...newSlot, time: e.target.value})} className="p-1 border rounded-md text-sm"/>
                                <select onChange={e => setNewSlot({...newSlot, instructorId: parseInt(e.target.value)})} className="p-1 border rounded-md text-sm bg-white">
                                    {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                                <select onChange={e => setNewSlot({...newSlot, technique: e.target.value as Technique})} className="p-1 border rounded-md text-sm bg-white">
                                    <option value="potters_wheel">Torno</option>
                                    <option value="molding">Modelado</option>
                                </select>
                                <button onClick={() => handleAddSlot(day)} className="p-2 bg-brand-primary text-white rounded-md"><PlusIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                 <h2 className="text-xl font-serif text-brand-text mb-2">Excepciones de horario</h2>
                 <p className="text-brand-secondary text-sm mb-4">Configura excepciones para días específicos.</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                         <label htmlFor="exception-date" className="block text-sm font-bold text-brand-secondary mb-1">Selecciona una fecha</label>
                         <input
                            id="exception-date"
                            type="date"
                            onChange={e => setSelectedExceptionDate(e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    {selectedExceptionDate && (
                        <div className="bg-brand-background p-3 rounded-lg animate-fade-in-fast">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-brand-text">Editando para {selectedExceptionDate.toLocaleDateString(language)}</h4>
                                <button onClick={handleResetExceptionDay} className="text-xs font-semibold text-brand-accent hover:underline">Restablecer a horario por defecto</button>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Capacidad máxima para este día</label>
                                <input
                                    type="number"
                                    value={exceptionDayCapacity ?? ''}
                                    onChange={handleCapacityOverrideChange}
                                    placeholder="Ej: 10"
                                    className="w-full p-2 border rounded-lg text-sm mb-3"
                                />
                            </div>
                             <div className="space-y-2">
                                {exceptionDaySlots.map(slot => (
                                    <div key={`${slot.time}-${slot.instructorId}-${slot.technique}`} className="flex items-center justify-between bg-white p-2 rounded-md text-sm">
                                        <span>{slot.time} - {instructors.find(i => i.id === slot.instructorId)?.name || 'N/A'} ({slot.technique === 'potters_wheel' ? 'Torno' : 'Modelado'})</span>
                                        <button onClick={() => handleRemoveExceptionSlot(slot)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                             </div>
                             <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                                <input type="time" onChange={e => setNewExceptionSlot({...newExceptionSlot, time: e.target.value})} className="p-1 border rounded-md text-sm"/>
                                <select onChange={e => setNewExceptionSlot({...newExceptionSlot, instructorId: parseInt(e.target.value)})} className="p-1 border rounded-md text-sm bg-white">
                                    {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                                <select onChange={e => setNewExceptionSlot({...newExceptionSlot, technique: e.target.value as Technique})} className="p-1 border rounded-md text-sm bg-white">
                                    <option value="potters_wheel">Torno</option>
                                    <option value="molding">Modelado</option>
                                </select>
                                <button onClick={handleAddExceptionSlot} className="p-2 bg-brand-primary text-white rounded-md"><PlusIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    )}
                 </div>
            </div>

            <div>
                <h2 className="text-xl font-serif text-brand-text mb-2">Bloqueos FreeDateTimePicker</h2>
                <p className="text-brand-secondary text-sm mb-4">Deshabilita horarios por eventos o disponibilidad especial.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="blocked-date" className="block text-sm font-bold text-brand-secondary mb-1">Selecciona una fecha</label>
                        <input
                            id="blocked-date"
                            type="date"
                            onChange={e => setSelectedBlockedDate(e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    {selectedBlockedDate && (
                        <div className="bg-brand-background p-3 rounded-lg animate-fade-in-fast">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-brand-text">Bloqueos para {selectedBlockedDate.toLocaleDateString(language)}</h4>
                                <button onClick={handleClearBlockedDay} className="text-xs font-semibold text-brand-accent hover:underline">Limpiar bloqueos</button>
                            </div>
                            <div className="space-y-2">
                                {blockedTimesForDate.map(time => (
                                    <div key={time} className="flex items-center justify-between bg-white p-2 rounded-md text-sm">
                                        <span>{time}</span>
                                        <button onClick={() => handleRemoveBlockedTime(time)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                {blockedTimesForDate.length === 0 && (
                                    <p className="text-xs text-brand-secondary text-center">No hay horarios bloqueados.</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                                <input type="time" value={newBlockedTime} onChange={e => setNewBlockedTime(e.target.value)} className="p-1 border rounded-md text-sm" />
                                <button onClick={handleAddBlockedTime} className="p-2 bg-brand-primary text-white rounded-md"><PlusIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};