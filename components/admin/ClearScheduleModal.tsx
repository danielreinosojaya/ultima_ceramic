import React, { useState, useMemo } from 'react';
import type { Booking } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import * as dataService from '../../services/dataService';

interface ClearScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    allBookings: Booking[];
    onConfirm: () => void;
}

type FilterPeriod = 'today' | 'week' | 'month' | 'custom';

const getDatesForPeriod = (period: FilterPeriod, customRange: { start: string, end: string }): { startDate: Date, endDate: Date } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    let startDate = new Date(today);

    switch (period) {
        case 'today':
            break;
        case 'week':
            const first = today.getDate() - today.getDay();
            startDate = new Date(today.setDate(first));
            endDate = new Date(today.setDate(first + 6));
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'custom':
            startDate = customRange.start ? new Date(customRange.start + 'T00:00:00') : new Date(0);
            endDate = customRange.end ? new Date(customRange.end + 'T23:59:59') : new Date();
            break;
    }
    return { startDate, endDate };
};

export const ClearScheduleModal: React.FC<ClearScheduleModalProps> = ({ isOpen, onClose, allBookings, onConfirm }) => {
    const language = 'es-ES';
    const [period, setPeriod] = useState<FilterPeriod>('week');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [confirmationText, setConfirmationText] = useState('');
    
    const { startDate, endDate } = useMemo(() => getDatesForPeriod(period, customRange), [period, customRange]);

    const affectedSlotsCount = useMemo(() => {
        return allBookings.reduce((count, booking) => {
            return count + booking.slots.filter(slot => {
                const slotDate = new Date(slot.date + 'T00:00:00');
                return slotDate >= startDate && slotDate <= endDate;
            }).length;
        }, 0);
    }, [startDate, endDate, allBookings]);

    const handleConfirm = () => {
        dataService.deleteBookingsInDateRange(startDate, endDate);
        onConfirm();
    };

    const FilterButton: React.FC<{ filter: FilterPeriod, children: React.ReactNode }> = ({ filter, children }) => (
        <button
            onClick={() => setPeriod(filter)}
            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors w-full ${period === filter ? 'bg-red-500 text-white' : 'bg-brand-background hover:bg-red-100'}`}
        >
            {children}
        </button>
    );
    
    if (!isOpen) return null;
    
    const isConfirmationMatching = confirmationText === 'ELIMINAR';

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-lg animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-serif text-red-600 mb-2 text-center">Eliminar reservas</h2>
                <p className="text-brand-secondary mb-6 text-center">Esta acción eliminará todas las reservas en el periodo seleccionado. Esta acción no se puede deshacer.</p>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <FilterButton filter="today">Hoy</FilterButton>
                    <FilterButton filter="week">Esta semana</FilterButton>
                    <FilterButton filter="month">Este mes</FilterButton>
                </div>
                
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-brand-surface px-2 text-brand-secondary">Rango personalizado</span></div>
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="date" 
                        value={customRange.start} 
                        onChange={e => {setCustomRange(c => ({...c, start: e.target.value})); setPeriod('custom');}} 
                        className="text-sm p-2 border border-gray-300 rounded-md w-full focus:ring-brand-primary focus:border-brand-primary"
                    />
                    <span className="text-sm text-brand-secondary">to</span>
                    <input 
                        type="date" 
                        value={customRange.end} 
                        onChange={e => {setCustomRange(c => ({...c, end: e.target.value})); setPeriod('custom');}} 
                        className="text-sm p-2 border border-gray-300 rounded-md w-full focus:ring-brand-primary focus:border-brand-primary"
                    />
                </div>

                <div className="mt-6 bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-r-lg">
                    <p className="font-bold">
                        {affectedSlotsCount > 0 
                            ? `Se eliminarán ${affectedSlotsCount} reservas entre ${startDate.toLocaleDateString(language)} y ${endDate.toLocaleDateString(language)}.`
                            : 'No hay reservas en el periodo seleccionado.'
                        }
                    </p>
                </div>

                {affectedSlotsCount > 0 && (
                    <div className="mt-4">
                        <label htmlFor="confirmation-text" className="block text-sm font-bold text-brand-secondary mb-1">
                            {'Escribe ELIMINAR para confirmar'}
                        </label>
                        <input
                            id="confirmation-text"
                            type="text"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            placeholder="ELIMINAR"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        />
                    </div>
                )}
                
                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">
                        Cancelar
                    </button>
                    <button 
                        type="button" 
                        onClick={handleConfirm}
                        disabled={!isConfirmationMatching || affectedSlotsCount === 0}
                        className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Eliminar reservas
                    </button>
                </div>
            </div>
        </div>
    );
};