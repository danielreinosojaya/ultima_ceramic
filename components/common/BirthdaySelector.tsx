import React, { useState, useEffect, useMemo } from 'react';

interface BirthdaySelectorProps {
    value: string; // YYYY-MM-DD format
    onChange: (date: string) => void;
    disabled?: boolean;
    error?: string;
}

const MONTHS = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
];

export const BirthdaySelector: React.FC<BirthdaySelectorProps> = ({
    value,
    onChange,
    disabled = false,
    error
}) => {
    // Parse initial value
    const parseDate = (dateStr: string) => {
        if (!dateStr || dateStr.length !== 10) return { day: '', month: '', year: '' };
        const [year, month, day] = dateStr.split('-');
        return { day: day || '', month: month || '', year: year || '' };
    };

    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    // Sync with external value
    useEffect(() => {
        const parsed = parseDate(value);
        setDay(parsed.day);
        setMonth(parsed.month);
        setYear(parsed.year);
    }, [value]);

    // Generate years (from current year - 100 to current year - 5)
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const result: string[] = [];
        for (let y = currentYear - 5; y >= currentYear - 100; y--) {
            result.push(y.toString());
        }
        return result;
    }, []);

    // Generate days based on selected month and year
    const days = useMemo(() => {
        const result: string[] = [];
        let maxDays = 31;
        
        if (month) {
            const m = parseInt(month);
            if ([4, 6, 9, 11].includes(m)) {
                maxDays = 30;
            } else if (m === 2) {
                const y = parseInt(year) || new Date().getFullYear();
                const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
                maxDays = isLeap ? 29 : 28;
            }
        }
        
        for (let d = 1; d <= maxDays; d++) {
            result.push(d.toString().padStart(2, '0'));
        }
        return result;
    }, [month, year]);

    // Update parent when all fields are filled
    const updateDate = (newDay: string, newMonth: string, newYear: string) => {
        if (newDay && newMonth && newYear && newYear.length === 4) {
            const dateStr = `${newYear}-${newMonth}-${newDay}`;
            onChange(dateStr);
        } else if (!newDay && !newMonth && !newYear) {
            onChange('');
        }
    };

    const handleDayChange = (newDay: string) => {
        setDay(newDay);
        updateDate(newDay, month, year);
    };

    const handleMonthChange = (newMonth: string) => {
        setMonth(newMonth);
        // Adjust day if needed (e.g., if day is 31 and new month has 30 days)
        let adjustedDay = day;
        if (day && newMonth) {
            const m = parseInt(newMonth);
            let maxDays = 31;
            if ([4, 6, 9, 11].includes(m)) {
                maxDays = 30;
            } else if (m === 2) {
                const y = parseInt(year) || new Date().getFullYear();
                const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
                maxDays = isLeap ? 29 : 28;
            }
            if (parseInt(day) > maxDays) {
                adjustedDay = maxDays.toString().padStart(2, '0');
                setDay(adjustedDay);
            }
        }
        updateDate(adjustedDay, newMonth, year);
    };

    const handleYearChange = (newYear: string) => {
        setYear(newYear);
        // Adjust day for February in leap years
        let adjustedDay = day;
        if (day && month === '02' && newYear) {
            const y = parseInt(newYear);
            const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
            const maxDays = isLeap ? 29 : 28;
            if (parseInt(day) > maxDays) {
                adjustedDay = maxDays.toString().padStart(2, '0');
                setDay(adjustedDay);
            }
        }
        updateDate(adjustedDay, month, newYear);
    };

    const selectBaseClass = `
        px-3 py-2.5 border-2 rounded-lg bg-white text-brand-text
        focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
        transition-all appearance-none cursor-pointer
        disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400
    `;

    const selectErrorClass = error ? 'border-red-500' : 'border-brand-border';

    return (
        <div className="w-full">
            <div className="flex gap-2 sm:gap-3">
                {/* Day selector */}
                <div className="flex-1 min-w-0">
                    <label className="block text-xs font-medium text-brand-secondary mb-1">Día</label>
                    <select
                        value={day}
                        onChange={(e) => handleDayChange(e.target.value)}
                        disabled={disabled}
                        className={`${selectBaseClass} ${selectErrorClass} w-full text-center`}
                    >
                        <option value="">--</option>
                        {days.map((d) => (
                            <option key={d} value={d}>{parseInt(d)}</option>
                        ))}
                    </select>
                </div>

                {/* Month selector */}
                <div className="flex-[2] min-w-0">
                    <label className="block text-xs font-medium text-brand-secondary mb-1">Mes</label>
                    <select
                        value={month}
                        onChange={(e) => handleMonthChange(e.target.value)}
                        disabled={disabled}
                        className={`${selectBaseClass} ${selectErrorClass} w-full`}
                    >
                        <option value="">Selecciona</option>
                        {MONTHS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>

                {/* Year selector */}
                <div className="flex-1 min-w-0">
                    <label className="block text-xs font-medium text-brand-secondary mb-1">Año</label>
                    <select
                        value={year}
                        onChange={(e) => handleYearChange(e.target.value)}
                        disabled={disabled}
                        className={`${selectBaseClass} ${selectErrorClass} w-full text-center`}
                    >
                        <option value="">----</option>
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>
            {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
        </div>
    );
};

export default BirthdaySelector;
