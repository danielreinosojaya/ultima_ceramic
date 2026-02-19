import React, { useState, useMemo, useCallback } from 'react';
import * as dataService from '../../services/dataService';
// Eliminado useLanguage, la app ahora es monolingüe en español
import type { AvailableSlot, Instructor, ScheduleOverrides, DayKey, ClassCapacity, Technique, FreeDateTimeOverrides, ExperienceTypeOverrides } from '../../types';
import { DAY_NAMES } from '@/constants';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { InstructorManager } from './InstructorManager';

const formatDateToYYYYMMDD = (d: Date): string => d.toISOString().split('T')[0];

interface ScheduleSettingsManagerProps {
    availability: Record<DayKey, AvailableSlot[]>;
    overrides: ScheduleOverrides;
    freeDateTimeOverrides: FreeDateTimeOverrides;
    experienceTypeOverrides?: ExperienceTypeOverrides;
    instructors: Instructor[];
    classCapacity: ClassCapacity;
    onDataChange: () => void;
}

export const ScheduleSettingsManager: React.FC<ScheduleSettingsManagerProps> = ({ availability, overrides, freeDateTimeOverrides, experienceTypeOverrides = {}, instructors, classCapacity, onDataChange }) => {
    // Monolingüe español, textos hardcodeados
    const language = 'es-ES';
    
    const [newSlot, setNewSlot] = useState<{ day: DayKey, time: string, instructorId: number, technique: Technique }>({ day: 'Monday', time: '', instructorId: instructors[0]?.id || 0, technique: 'potters_wheel' });
    const [selectedExceptionDate, setSelectedExceptionDate] = useState<Date | null>(null);
    const [newExceptionSlot, setNewExceptionSlot] = useState<{ time: string, instructorId: number, technique: Technique }>({ time: '', instructorId: instructors[0]?.id || 0, technique: 'potters_wheel' });
    const [selectedTechniques, setSelectedTechniques] = useState<Set<Technique>>(new Set(['potters_wheel'])); // Multi-select para técnicas
    const [defaultCapacity, setDefaultCapacity] = useState<ClassCapacity>(classCapacity);
    const [isCapacitySaved, setIsCapacitySaved] = useState(false);
    const [selectedBlockedDate, setSelectedBlockedDate] = useState<Date | null>(null);
    const [newBlockedTime, setNewBlockedTime] = useState('');
    
    // Estado para ExperienceTypeOverrides
    const [selectedTechRestrictDate, setSelectedTechRestrictDate] = useState<Date | null>(null);
    const [selectedTechForRestrict, setSelectedTechForRestrict] = useState<Technique>('potters_wheel');
    const [allowedTimes, setAllowedTimes] = useState<string[]>([]);
    const [newAllowedTime, setNewAllowedTime] = useState('');
    const [restrictionReason, setRestrictionReason] = useState('');

    const buildSpecialDaySlots = useCallback((instructorId: number): AvailableSlot[] => {
        const slots: AvailableSlot[] = [];

        for (let hour = 10; hour <= 19; hour++) {
            const minutes = hour === 19 ? ['00'] : ['00', '30'];
            for (const min of minutes) {
                const time = `${String(hour).padStart(2, '0')}:${min}`;
                slots.push({ time, instructorId, technique: 'potters_wheel' });
                slots.push({ time, instructorId, technique: 'molding' });
                slots.push({ time, instructorId, technique: 'painting' });
            }
        }

        return slots;
    }, []);

    const dedupeAndSortSlots = useCallback((slots: AvailableSlot[]): AvailableSlot[] => {
        const uniqueSlots = Array.from(new Map(
            slots.map(slot => [`${slot.time}-${slot.instructorId}-${slot.technique}`, slot])
        ).values());

        return uniqueSlots.sort((a, b) => {
            const byTime = a.time.localeCompare(b.time);
            if (byTime !== 0) return byTime;
            const byTechnique = a.technique.localeCompare(b.technique);
            if (byTechnique !== 0) return byTechnique;
            return a.instructorId - b.instructorId;
        });
    }, []);
    
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
        if (!selectedExceptionDate || !newExceptionSlot.time || !newExceptionSlot.instructorId || selectedTechniques.size === 0) return;
        
        const dateStr = formatDateToYYYYMMDD(selectedExceptionDate);
        const updatedOverrides = { ...overrides };
        
        if (!updatedOverrides[dateStr] || !updatedOverrides[dateStr].slots) {
            const dayKey = DAY_NAMES[selectedExceptionDate.getDay()];
            updatedOverrides[dateStr] = { slots: [...availability[dayKey]] };
        }
        
        // Agregar UN slot para CADA técnica seleccionada
        selectedTechniques.forEach(technique => {
            updatedOverrides[dateStr].slots!.push({ 
                time: newExceptionSlot.time, 
                instructorId: newExceptionSlot.instructorId, 
                technique 
            });
        });
        
        // Eliminar duplicados y ordenar
        const uniqueSlots = Array.from(new Map(
            updatedOverrides[dateStr].slots!.map(s => 
                [`${s.time}-${s.instructorId}-${s.technique}`, s]
            )
        ).values());
        
        updatedOverrides[dateStr].slots = uniqueSlots.sort((a, b) => a.time.localeCompare(b.time));
        
        await dataService.updateScheduleOverrides(updatedOverrides);
        
        // Reset input pero mantener la hora y instructor
        setSelectedTechniques(new Set(['potters_wheel']));
        setNewExceptionSlot({ ...newExceptionSlot, time: '' });
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

    const handleToggleDisableRules = async (enabled: boolean) => {
        if (!selectedExceptionDate) return;

        const dateStr = formatDateToYYYYMMDD(selectedExceptionDate);
        const updatedOverrides = { ...overrides };
        const dayKey = DAY_NAMES[selectedExceptionDate.getDay()];

        if (!updatedOverrides[dateStr]) {
            updatedOverrides[dateStr] = { slots: [...(availability[dayKey] || [])] };
        }

        updatedOverrides[dateStr].disableRules = enabled;

        if (enabled) {
            const defaultInstructorId = newExceptionSlot.instructorId || instructors[0]?.id || 0;
            const currentSlots = updatedOverrides[dateStr].slots ?? [];
            const specialSlots = buildSpecialDaySlots(defaultInstructorId);
            updatedOverrides[dateStr].slots = dedupeAndSortSlots([...currentSlots, ...specialSlots]);
        } else {
            // Al desactivar modo especial, restaurar horarios base del día
            updatedOverrides[dateStr].slots = [...(availability[dayKey] || [])];
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

    // ===== HANDLERS PARA EXPERIENCETYPENOVERRIDES =====
    const handleAddTechRestriction = async () => {
        if (!selectedTechRestrictDate || allowedTimes.length === 0) {
            alert('Selecciona una fecha y al menos un horario permitido');
            return;
        }
        
        const dateStr = formatDateToYYYYMMDD(selectedTechRestrictDate);
        const updatedOverrides: ExperienceTypeOverrides = { ...experienceTypeOverrides };
        
        if (!updatedOverrides[dateStr]) {
            updatedOverrides[dateStr] = {};
        }
        
        updatedOverrides[dateStr][selectedTechForRestrict] = {
            allowedTimes: allowedTimes.sort(),
            reason: restrictionReason || undefined
        };
        
        await dataService.updateExperienceTypeOverrides(updatedOverrides);
        
        // Reset
        setAllowedTimes([]);
        setNewAllowedTime('');
        setRestrictionReason('');
        onDataChange();
    };

    const handleRemoveTechRestriction = async () => {
        if (!selectedTechRestrictDate) return;
        
        const dateStr = formatDateToYYYYMMDD(selectedTechRestrictDate);
        const updatedOverrides: ExperienceTypeOverrides = { ...experienceTypeOverrides };
        
        if (updatedOverrides[dateStr]) {
            delete updatedOverrides[dateStr][selectedTechForRestrict];
            if (Object.keys(updatedOverrides[dateStr]).length === 0) {
                delete updatedOverrides[dateStr];
            }
        }
        
        await dataService.updateExperienceTypeOverrides(updatedOverrides);
        onDataChange();
    };

    const handleAddAllowedTime = () => {
        if (!newAllowedTime || allowedTimes.includes(newAllowedTime)) return;
        setAllowedTimes([...allowedTimes, newAllowedTime].sort());
        setNewAllowedTime('');
    };

    const handleRemoveAllowedTime = (time: string) => {
        setAllowedTimes(allowedTimes.filter(t => t !== time));
    };

    // Cargar horarios permitidos cuando se selecciona fecha/técnica
    const currentTechRestriction = useMemo(() => {
        if (!selectedTechRestrictDate) return null;
        const dateStr = formatDateToYYYYMMDD(selectedTechRestrictDate);
        return experienceTypeOverrides?.[dateStr]?.[selectedTechForRestrict];
    }, [selectedTechRestrictDate, selectedTechForRestrict, experienceTypeOverrides]);

    // Actualizar allowedTimes cuando cambia el override actual
    useMemo(() => {
        if (currentTechRestriction?.allowedTimes) {
            setAllowedTimes(currentTechRestriction.allowedTimes);
            setRestrictionReason(currentTechRestriction.reason || '');
        } else {
            setAllowedTimes([]);
            setRestrictionReason('');
        }
    }, [currentTechRestriction]);
    
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

    const isRulesDisabledForExceptionDay = useMemo(() => {
        if (!selectedExceptionDate) return false;
        const dateStr = formatDateToYYYYMMDD(selectedExceptionDate);
        return overrides[dateStr]?.disableRules === true;
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
                            <div className="mb-3 p-3 rounded-lg border border-amber-300 bg-amber-50">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isRulesDisabledForExceptionDay}
                                        onChange={(e) => handleToggleDisableRules(e.target.checked)}
                                        className="mt-1 w-4 h-4"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-amber-900">Día especial (desactivar reglas)</p>
                                        <p className="text-xs text-amber-800">
                                            Permite cualquier técnica y horario este día en Single Class y Custom Experience.
                                            Al activarlo se agregan horarios de 10:00 a 19:00 (cada 30 min) para Torno, Modelado y Pintura.
                                        </p>
                                    </div>
                                </label>
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
                                        <span>{slot.time} - {instructors.find(i => i.id === slot.instructorId)?.name || 'N/A'} ({slot.technique === 'potters_wheel' ? '🎡 Torno' : slot.technique === 'molding' ? '✋ Modelado' : '🎨 Pintura'})</span>
                                        <button onClick={() => handleRemoveExceptionSlot(slot)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                             </div>
                             <div className="space-y-3 mt-4 pt-3 border-t border-gray-200">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">Agregar nuevo horario</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                                        <input 
                                            type="time" 
                                            value={newExceptionSlot.time}
                                            onChange={e => setNewExceptionSlot({...newExceptionSlot, time: e.target.value})} 
                                            className="p-2 border rounded-md text-sm"
                                            placeholder="Hora"
                                        />
                                        <select 
                                            value={newExceptionSlot.instructorId} 
                                            onChange={e => setNewExceptionSlot({...newExceptionSlot, instructorId: parseInt(e.target.value)})} 
                                            className="p-2 border rounded-md text-sm bg-white"
                                        >
                                            {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">Técnicas disponibles (selecciona todas las que quieras)</label>
                                    <div className="flex gap-4 flex-wrap">
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedTechniques.has('potters_wheel')}
                                                onChange={(e) => {
                                                    const newSet = new Set(selectedTechniques);
                                                    if (e.target.checked) newSet.add('potters_wheel');
                                                    else newSet.delete('potters_wheel');
                                                    setSelectedTechniques(newSet);
                                                }}
                                                className="w-4 h-4 rounded border-gray-300"
                                            />
                                            <span className="text-sm font-medium">🎡 Torno Alfarero</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedTechniques.has('molding')}
                                                onChange={(e) => {
                                                    const newSet = new Set(selectedTechniques);
                                                    if (e.target.checked) newSet.add('molding');
                                                    else newSet.delete('molding');
                                                    setSelectedTechniques(newSet);
                                                }}
                                                className="w-4 h-4 rounded border-gray-300"
                                            />
                                            <span className="text-sm font-medium">✋ Modelado a Mano</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedTechniques.has('painting')}
                                                onChange={(e) => {
                                                    const newSet = new Set(selectedTechniques);
                                                    if (e.target.checked) newSet.add('painting');
                                                    else newSet.delete('painting');
                                                    setSelectedTechniques(newSet);
                                                }}
                                                className="w-4 h-4 rounded border-gray-300"
                                            />
                                            <span className="text-sm font-medium">🎨 Pintura</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handleAddExceptionSlot} 
                                    disabled={!newExceptionSlot.time || selectedTechniques.size === 0}
                                    className="w-full p-2 bg-brand-primary text-white rounded-md font-semibold hover:bg-brand-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    ✓ Agregar horario para {selectedTechniques.size > 0 ? `${selectedTechniques.size} técnica${selectedTechniques.size > 1 ? 's' : ''}` : 'las técnicas seleccionadas'}
                                </button>
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

            {/* RESTRICCIONES POR TÉCNICA - CONTROL GRANULAR */}
            <div>
                <h2 className="text-xl font-serif text-brand-text mb-2">🔒 Restricciones por Técnica</h2>
                <p className="text-brand-secondary text-sm mb-4">Limita qué horarios están disponibles para una técnica específica en un día. Ejemplo: Sábado 21 enero, solo Torno a las 9 AM.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="tech-restrict-date" className="block text-sm font-bold text-brand-secondary mb-1">Fecha</label>
                        <input
                            id="tech-restrict-date"
                            type="date"
                            onChange={e => setSelectedTechRestrictDate(e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    {selectedTechRestrictDate && (
                        <div>
                            <label htmlFor="tech-select" className="block text-sm font-bold text-brand-secondary mb-1">Técnica</label>
                            <select 
                                id="tech-select"
                                value={selectedTechForRestrict}
                                onChange={e => setSelectedTechForRestrict(e.target.value as Technique)}
                                className="w-full p-2 border rounded-lg bg-white"
                            >
                                <option value="potters_wheel">🎡 Torno Alfarero</option>
                                <option value="molding">✋ Modelado a Mano</option>
                                <option value="painting">🎨 Pintura</option>
                                <option value="hand_modeling">✋ Hand Modeling</option>
                            </select>
                        </div>
                    )}
                </div>

                {selectedTechRestrictDate && (
                    <div className="mt-4 p-4 bg-brand-background rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-brand-text">
                                Restricción: {selectedTechForRestrict === 'potters_wheel' ? '🎡 Torno' : selectedTechForRestrict === 'molding' ? '✋ Modelado' : selectedTechForRestrict === 'painting' ? '🎨 Pintura' : 'Técnica'} 
                                <span className="text-sm text-brand-secondary ml-2">({selectedTechRestrictDate.toLocaleDateString(language)})</span>
                            </h4>
                            {allowedTimes.length > 0 && (
                                <button 
                                    onClick={handleRemoveTechRestriction}
                                    className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
                                >
                                    Eliminar restricción
                                </button>
                            )}
                        </div>

                        <div className="mb-3">
                            <label className="block text-xs font-bold text-gray-500 mb-2">Horarios permitidos para esta técnica</label>
                            {allowedTimes.length === 0 ? (
                                <p className="text-xs text-brand-secondary italic">Esta técnica no tiene restricciones (todos los horarios están disponibles)</p>
                            ) : (
                                <div className="space-y-1 mb-3 p-2 bg-white rounded border border-green-200">
                                    {allowedTimes.map(time => (
                                        <div key={time} className="flex items-center justify-between text-sm bg-green-50 p-2 rounded">
                                            <span className="font-semibold text-green-700">✓ {time}</span>
                                            <button 
                                                onClick={() => handleRemoveAllowedTime(time)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 border-t border-gray-200 pt-3">
                            <label className="block text-xs font-bold text-gray-500">Agregar horario permitido</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="time"
                                    value={newAllowedTime}
                                    onChange={e => setNewAllowedTime(e.target.value)}
                                    className="p-2 border rounded-md text-sm flex-1"
                                    placeholder="HH:mm"
                                />
                                <button 
                                    onClick={handleAddAllowedTime}
                                    disabled={!newAllowedTime}
                                    className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                >
                                    <PlusIcon className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 border-t border-gray-200 pt-3 mt-3">
                            <label htmlFor="reason" className="block text-xs font-bold text-gray-500">Motivo (opcional)</label>
                            <input 
                                id="reason"
                                type="text"
                                value={restrictionReason}
                                onChange={e => setRestrictionReason(e.target.value)}
                                placeholder="Ej: Solo clase fija de torno a las 9 AM"
                                className="w-full p-2 border rounded-md text-sm"
                            />
                        </div>

                        <button 
                            onClick={handleAddTechRestriction}
                            disabled={allowedTimes.length === 0}
                            className="w-full mt-3 p-2 bg-brand-primary text-white rounded-md font-semibold hover:bg-brand-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {allowedTimes.length > 0 ? `Guardar restricción (${allowedTimes.length} horario${allowedTimes.length !== 1 ? 's' : ''})` : 'Define al menos un horario permitido'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};