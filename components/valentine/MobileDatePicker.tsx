import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface MobileDatePickerProps {
    value: string; // YYYY-MM-DD format
    onChange: (date: string) => void;
    label: string;
    required?: boolean;
    minDate?: string;
    maxDate?: string;
}

export const MobileDatePicker: React.FC<MobileDatePickerProps> = ({
    value,
    onChange,
    label,
    required = false,
    minDate,
    maxDate
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(
        value ? new Date(value + 'T00:00:00') : null
    );
    const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('day');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (value) {
            const date = new Date(value + 'T00:00:00');
            setSelectedDate(date);
            setCurrentMonth(date);
        }
    }, [value]);

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const formatDate = (date: Date): string => {
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} de ${month}, ${year}`;
    };

    const getDaysInMonth = (date: Date): (Date | null)[] => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];
        
        // Días vacíos al inicio
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        
        // Días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        const formatted = date.toISOString().split('T')[0];
        onChange(formatted);
        setIsOpen(false);
    };

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = new Date(currentMonth.getFullYear(), monthIndex, 1);
        setCurrentMonth(newDate);
        setViewMode('day');
    };

    const handleYearSelect = (year: number) => {
        const newDate = new Date(year, currentMonth.getMonth(), 1);
        setCurrentMonth(newDate);
        setViewMode('month');
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentMonth(newDate);
    };

    const changeYear = (delta: number) => {
        const newDate = new Date(currentMonth);
        newDate.setFullYear(newDate.getFullYear() + delta);
        setCurrentMonth(newDate);
    };

    const getYearRange = (): number[] => {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 80; // 80 años atrás
        const endYear = currentYear - 10; // Hasta hace 10 años
        const years: number[] = [];
        for (let year = endYear; year >= startYear; year--) {
            years.push(year);
        }
        return years;
    };

    const isDateDisabled = (date: Date): boolean => {
        if (minDate) {
            const min = new Date(minDate + 'T00:00:00');
            if (date < min) return true;
        }
        if (maxDate) {
            const max = new Date(maxDate + 'T00:00:00');
            if (date > max) return true;
        }
        return false;
    };

    const isToday = (date: Date): boolean => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date: Date): boolean => {
        if (!selectedDate) return false;
        return date.toDateString() === selectedDate.toDateString();
    };

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            
            {/* Input trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors bg-white text-left flex items-center justify-between group hover:border-gray-400"
            >
                <span className={selectedDate ? 'text-gray-900' : 'text-gray-400'}>
                    {selectedDate ? formatDate(selectedDate) : 'Selecciona tu fecha de nacimiento'}
                </span>
                <CalendarIcon className="w-5 h-5 text-gray-400 group-hover:text-rose-500 transition-colors" />
            </button>

            {/* Picker Modal */}
            {isOpen && (
                <>
                    {/* Overlay */}
                    <div 
                        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Picker Container */}
                    <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden animate-slide-up md:absolute md:inset-x-auto md:left-0 md:right-0 md:bottom-auto md:top-full md:mt-2 md:rounded-2xl md:max-h-[500px]">
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-4 flex items-center justify-between shadow-lg">
                            <div className="flex-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (viewMode === 'day') setViewMode('month');
                                        else if (viewMode === 'month') setViewMode('year');
                                    }}
                                    className="text-left hover:opacity-80 transition-opacity"
                                >
                                    <p className="text-sm font-medium opacity-90">
                                        {viewMode === 'day' && months[currentMonth.getMonth()]}
                                        {viewMode === 'month' && currentMonth.getFullYear()}
                                        {viewMode === 'year' && 'Selecciona año'}
                                    </p>
                                    <p className="text-xl font-bold">
                                        {viewMode === 'day' && currentMonth.getFullYear()}
                                        {viewMode === 'month' && 'Selecciona mes'}
                                        {viewMode === 'year' && `${getYearRange()[getYearRange().length - 1]} - ${getYearRange()[0]}`}
                                    </p>
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="ml-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                            >
                                <span className="text-2xl leading-none">×</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto max-h-[calc(80vh-80px)] md:max-h-[calc(500px-80px)]">
                            {/* Day View */}
                            {viewMode === 'day' && (
                                <div className="p-4">
                                    {/* Month Navigation */}
                                    <div className="flex items-center justify-between mb-4">
                                        <button
                                            type="button"
                                            onClick={() => changeMonth(-1)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('month')}
                                            className="px-4 py-2 font-medium text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => changeMonth(1)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                                        </button>
                                    </div>

                                    {/* Days of Week */}
                                    <div className="grid grid-cols-7 gap-2 mb-2">
                                        {daysOfWeek.map(day => (
                                            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="grid grid-cols-7 gap-2">
                                        {getDaysInMonth(currentMonth).map((date, index) => {
                                            if (!date) {
                                                return <div key={`empty-${index}`} />;
                                            }

                                            const disabled = isDateDisabled(date);
                                            const selected = isSelected(date);
                                            const today = isToday(date);

                                            return (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => !disabled && handleDateSelect(date)}
                                                    disabled={disabled}
                                                    className={`
                                                        aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                                                        ${disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-rose-50 cursor-pointer'}
                                                        ${selected ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-md scale-105' : 'text-gray-700'}
                                                        ${today && !selected ? 'ring-2 ring-rose-500 ring-offset-1' : ''}
                                                    `}
                                                >
                                                    {date.getDate()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Month View */}
                            {viewMode === 'month' && (
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <button
                                            type="button"
                                            onClick={() => changeYear(-1)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('year')}
                                            className="px-4 py-2 font-medium text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            {currentMonth.getFullYear()}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => changeYear(1)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {months.map((month, index) => (
                                            <button
                                                key={month}
                                                type="button"
                                                onClick={() => handleMonthSelect(index)}
                                                className={`
                                                    py-3 px-4 rounded-lg font-medium transition-all
                                                    ${currentMonth.getMonth() === index 
                                                        ? 'bg-rose-500 text-white shadow-md' 
                                                        : 'hover:bg-gray-100 text-gray-700'
                                                    }
                                                `}
                                            >
                                                {month}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Year View */}
                            {viewMode === 'year' && (
                                <div className="p-6">
                                    <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                                        {getYearRange().map(year => (
                                            <button
                                                key={year}
                                                type="button"
                                                onClick={() => handleYearSelect(year)}
                                                className={`
                                                    py-3 px-4 rounded-lg font-medium transition-all
                                                    ${currentMonth.getFullYear() === year 
                                                        ? 'bg-rose-500 text-white shadow-md' 
                                                        : 'hover:bg-gray-100 text-gray-700'
                                                    }
                                                `}
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer con acciones rápidas */}
                        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-3 flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date();
                                    handleDateSelect(new Date(today.getFullYear() - 25, today.getMonth(), today.getDate()));
                                }}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                25 años atrás
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date();
                                    handleDateSelect(new Date(today.getFullYear() - 30, today.getMonth(), today.getDate()));
                                }}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                30 años atrás
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
