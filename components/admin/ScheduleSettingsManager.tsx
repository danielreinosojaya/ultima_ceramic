import React, { useState, useMemo, useCallback } from 'react';
import * as dataService from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';
import type { AvailableSlot, Instructor, ScheduleOverrides, DayKey, ClassCapacity } from '../../types';
import { DAY_NAMES } from '@/constants';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { InstructorManager } from './InstructorManager';

const formatDateToYYYYMMDD = (d: Date): string => d.toISOString().split('T')[0];

interface ScheduleSettingsManagerProps {
    availability: Record<DayKey, AvailableSlot[]>;
    overrides: ScheduleOverrides;
    instructors: Instructor[];
    classCapacity: ClassCapacity;
    onDataChange: () => void;
}

export const ScheduleSettingsManager: React.FC<ScheduleSettingsManagerProps> = ({ availability, overrides, instructors, classCapacity, onDataChange }) => {
    const { t, language } = useLanguage();
    
    const [newSlot, setNewSlot] = useState<{ day: DayKey, time: string, instructorId: number }>({ day: 'Monday', time: '', instructorId: instructors[0]?.id || 0 });
    const [selectedExceptionDate, setSelectedExceptionDate] = useState<Date | null>(null);
    const [newExceptionSlot, setNewExceptionSlot] = useState<{ time: string, instructorId: number }>({ time: '', instructorId: instructors[0]?.id || 0 });
    const [defaultCapacity, setDefaultCapacity] = useState<ClassCapacity>(classCapacity);
    const [isCapacitySaved, setIsCapacitySaved] = useState(false);
    
    const handleAddSlot = async (day: DayKey) => {
        if (!newSlot.time || !newSlot.instructorId) {
            alert('Please select a time and instructor.');
            return;
        }
        const updatedAvailability = { ...availability };
        updatedAvailability[day].push({ time: newSlot.time, instructorId: newSlot.instructorId });
        updatedAvailability[day].sort((a, b) => a.time.localeCompare(b.time));
        await dataService.updateAvailability(updatedAvailability);
        onDataChange();
    };

    const handleRemoveSlot = async (day: DayKey, time: string, instructorId: number) => {
        const updatedAvailability = { ...availability };
        updatedAvailability[day] = updatedAvailability[day].filter(s => s.time !== time || s.instructorId !== instructorId);
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
        updatedOverrides[dateStr].slots.push({ time: newExceptionSlot.time, instructorId: newExceptionSlot.instructorId });
        updatedOverrides[dateStr].slots.sort((a, b) => a.time.localeCompare(b.time));
        await dataService.updateScheduleOverrides(updatedOverrides);
        onDataChange();
    };

    const handleRemoveExceptionSlot = async (time: string, instructorId: number) => {
        if (!selectedExceptionDate) return;
        const dateStr = formatDateToYYYYMMDD(selectedExceptionDate);
        const updatedOverrides = { ...overrides };
        if (!updatedOverrides[dateStr]) return;
        updatedOverrides[dateStr].slots = updatedOverrides[dateStr].slots.filter(s => s.time !== time || s.instructorId !== instructorId);
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

    return (
        <div className="space-y-8">
            <InstructorManager onInstructorsUpdate={onDataChange} instructors={instructors} />

            <div>
                <h2 className="text-xl font-serif text-brand-text mb-2">{t('admin.scheduleManager.defaultCapacityTitle')}</h2>
                <p className="text-brand-secondary text-sm mb-4">{t('admin.scheduleManager.defaultCapacitySubtitle')}</p>
                 <div className="bg-brand-background p-4 rounded-lg">
                    <label htmlFor="default-capacity" className="block text-sm font-bold text-brand-secondary mb-1">
                      {t('admin.scheduleManager.defaultCapacityLabel')}
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            id="default-capacity"
                            type="number"
                            value={defaultCapacity.max}
                            onChange={(e) => setDefaultCapacity({ max: parseInt(e.target.value, 10) || 0 })}
                            className="w-full max-w-xs p-2 border rounded-lg"
                        />
                        <button onClick={handleSaveDefaultCapacity} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">
                            {t('admin.scheduleManager.saveCapacityButton')}
                        </button>
                        {isCapacitySaved && (
                            <p className="text-sm font-semibold text-brand-success animate-fade-in">
                                {t('admin.scheduleManager.capacitySavedMessage')}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-serif text-brand-text mb-2">{t('admin.scheduleManager.title')}</h2>
                <p className="text-brand-secondary text-sm mb-4">{t('admin.scheduleManager.subtitle')}</p>
                <div className="space-y-4">
                    {DAY_NAMES.map(day => (
                        <div key={day} className="bg-brand-background p-3 rounded-lg">
                            <h4 className="font-bold text-brand-text mb-2">{day}</h4>
                            <div className="space-y-2">
                                {availability[day]?.map(slot => (
                                    <div key={`${slot.time}-${slot.instructorId}`} className="flex items-center justify-between bg-white p-2 rounded-md text-sm">
                                        <span>{slot.time} - {instructors.find(i => i.id === slot.instructorId)?.name || 'N/A'}</span>
                                        <button onClick={() => handleRemoveSlot(day, slot.time, slot.instructorId)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                {availability[day]?.length === 0 && <p className="text-xs text-brand-secondary text-center">{t('admin.scheduleManager.noSlots')}</p>}
                            </div>
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                                <input type="time" onChange={e => setNewSlot({...newSlot, time: e.target.value})} className="p-1 border rounded-md text-sm"/>
                                <select onChange={e => setNewSlot({...newSlot, instructorId: parseInt(e.target.value)})} className="p-1 border rounded-md text-sm">
                                    {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                                <button onClick={() => handleAddSlot(day)} className="p-2 bg-brand-primary text-white rounded-md"><PlusIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                 <h2 className="text-xl font-serif text-brand-text mb-2">{t('admin.scheduleManager.overridesTitle')}</h2>
                 <p className="text-brand-secondary text-sm mb-4">{t('admin.scheduleManager.overridesSubtitle')}</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                         <label htmlFor="exception-date" className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.scheduleManager.selectDatePrompt')}</label>
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
                                <h4 className="font-bold text-brand-text">{t('admin.scheduleManager.editingFor')} {selectedExceptionDate.toLocaleDateString(language)}</h4>
                                <button onClick={handleResetExceptionDay} className="text-xs font-semibold text-brand-accent hover:underline">{t('admin.scheduleManager.resetToDefaultButton')}</button>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">{t('admin.scheduleManager.capacityOverrideLabel')}</label>
                                <input
                                    type="number"
                                    value={exceptionDayCapacity ?? ''}
                                    onChange={handleCapacityOverrideChange}
                                    placeholder={t('admin.scheduleManager.capacityOverridePlaceholder', { capacity: classCapacity.max })}
                                    className="w-full p-2 border rounded-lg text-sm mb-3"
                                />
                            </div>
                             <div className="space-y-2">
                                {exceptionDaySlots.map(slot => (
                                    <div key={`${slot.time}-${slot.instructorId}`} className="flex items-center justify-between bg-white p-2 rounded-md text-sm">
                                        <span>{slot.time} - {instructors.find(i => i.id === slot.instructorId)?.name || 'N/A'}</span>
                                        <button onClick={() => handleRemoveExceptionSlot(slot.time, slot.instructorId)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                             </div>
                             <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                                <input type="time" onChange={e => setNewExceptionSlot({...newExceptionSlot, time: e.target.value})} className="p-1 border rounded-md text-sm"/>
                                <select onChange={e => setNewExceptionSlot({...newExceptionSlot, instructorId: parseInt(e.target.value)})} className="p-1 border rounded-md text-sm">
                                    {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                                <button onClick={handleAddExceptionSlot} className="p-2 bg-brand-primary text-white rounded-md"><PlusIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};