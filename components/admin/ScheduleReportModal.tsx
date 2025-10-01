import React, { useState } from 'react';
import type { Booking } from '../../types';
// import { useLanguage } from '../../context/LanguageContext';
import { generateScheduleReportPDF } from '../../services/pdfService';

interface ScheduleReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    allBookings: Booking[];
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
            // Week starts on Sunday
            startDate.setDate(today.getDate() - today.getDay());
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
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

export const ScheduleReportModal: React.FC<ScheduleReportModalProps> = ({ isOpen, onClose, allBookings }) => {
    const language = 'es-ES';
    const [period, setPeriod] = useState<FilterPeriod>('week');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    const handleGenerateReport = () => {
        const { startDate, endDate } = getDatesForPeriod(period, customRange);

        const pdfTranslations = {
            reportTitle: 'Reporte de reservas',
            dateRange: 'Rango de fechas',
            generatedOn: 'Generado el',
            time: 'Hora',
            attendee: 'Asistente',
            contact: 'Contacto',
            package: 'Paquete',
            paymentStatus: 'Estado de pago',
            paid: 'Pagado',
            unpaid: 'Pendiente'
        };
        
        generateScheduleReportPDF(allBookings, { start: startDate, end: endDate }, pdfTranslations, language);
        onClose();
    };

    const FilterButton: React.FC<{ filter: FilterPeriod, children: React.ReactNode }> = ({ filter, children }) => (
        <button
            onClick={() => setPeriod(filter)}
            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors w-full ${period === filter ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20'}`}
        >
            {children}
        </button>
    );
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-serif text-brand-accent mb-2 text-center">Reporte de reservas</h2>
                <p className="text-brand-secondary mb-6 text-center">Genera un PDF con el resumen de reservas para el periodo seleccionado.</p>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <FilterButton filter="today">Hoy</FilterButton>
                    <FilterButton filter="week">Esta semana</FilterButton>
                    <FilterButton filter="month">Este mes</FilterButton>
                </div>
                
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-brand-surface px-2 text-brand-secondary">Rango personalizado</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="date" 
                        value={customRange.start} 
                        onChange={e => {setCustomRange(c => ({...c, start: e.target.value})); setPeriod('custom');}} 
                        className="text-sm p-2 border border-gray-300 rounded-md w-full focus:ring-brand-primary focus:border-brand-primary"
                    />
                    <span className="text-sm text-brand-secondary">a</span>
                    <input 
                        type="date" 
                        value={customRange.end} 
                        onChange={e => {setCustomRange(c => ({...c, end: e.target.value})); setPeriod('custom');}} 
                        className="text-sm p-2 border border-gray-300 rounded-md w-full focus:ring-brand-primary focus:border-brand-primary"
                    />
                </div>
                
                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleGenerateReport} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">
                        Generar reporte
                    </button>
                </div>
            </div>
        </div>
    );
};