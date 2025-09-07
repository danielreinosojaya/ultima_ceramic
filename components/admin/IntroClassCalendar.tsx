import React, { useState, useMemo } from 'react';
import type { IntroductoryClass, SessionOverride } from '../../types';
import * as dataService from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';
import { SessionEditorPanel } from './SessionEditorPanel';

interface IntroClassCalendarProps {
  product: IntroductoryClass;
  onOverridesChange: (newOverrides: SessionOverride[]) => void;
}

const formatDateToYYYYMMDD = (d: Date): string => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const IntroClassCalendar: React.FC<IntroClassCalendarProps> = ({ product, onOverridesChange }) => {
  const { t, language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [overrides, setOverrides] = useState<SessionOverride[]>(product.overrides || []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const calendarDays = useMemo(() => {
    const blanks = Array(firstDayOfMonth.getDay()).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  const translatedDayNames = useMemo(() => 
    [0, 1, 2, 3, 4, 5, 6].map(dayIndex => 
      new Date(2024, 0, dayIndex + 7).toLocaleDateString(language, { weekday: 'short' })
    ), [language]);
    
  const handleOverrideSave = (dateStr: string, sessions: { time: string; instructorId: number; capacity: number }[] | null) => {
    const newOverrides = [...overrides.filter(ov => ov.date !== dateStr)];
    if (sessions?.length === 0) { // Special case: empty array means reset to default
        // No need to add anything, filtering it out is enough
    } else {
         newOverrides.push({ date: dateStr, sessions });
    }
    setOverrides(newOverrides);
    onOverridesChange(newOverrides);
  };

  return (
    <div>
        <h3 className="font-bold text-brand-accent mb-2">{t('admin.introClassModal.calendarTitle')}</h3>
        <p className="text-sm text-brand-secondary mb-4">{t('admin.introClassModal.calendarSubtitle')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 rounded-full hover:bg-brand-background disabled:opacity-50">&larr;</button>
                    <h4 className="text-lg font-bold text-brand-text capitalize">{currentDate.toLocaleString(language, { month: 'long', year: 'numeric' })}</h4>
                    <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-brand-background">&rarr;</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-brand-secondary mb-1">
                    {translatedDayNames.map(day => <div key={day} className="font-bold">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                        if (!day) return <div key={`blank-${index}`}></div>;
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        date.setHours(0,0,0,0);
                        const dateStr = formatDateToYYYYMMDD(date);
                        const dayIsSelected = selectedDate && formatDateToYYYYMMDD(selectedDate) === dateStr;
                        const override = overrides.find(ov => ov.date === dateStr);
                        const hasOverride = !!override;
                        const isCancelled = hasOverride && override.sessions === null;

                        const buttonClassName = `w-full aspect-square rounded-md text-sm font-semibold transition-all relative ${
                            dayIsSelected ? 'bg-brand-primary text-white shadow-md ring-2 ring-brand-accent' : 
                            'bg-white hover:bg-brand-primary/10'
                        }`;
                        
                        return (
                            <button key={day} type="button" onClick={() => setSelectedDate(date)} className={buttonClassName}>
                                {day}
                                {hasOverride && <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${isCancelled ? 'bg-red-500' : 'bg-blue-500'}`}></div>}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div>
                {selectedDate && <SessionEditorPanel selectedDate={selectedDate} product={{...product, overrides}} onSave={handleOverrideSave} />}
            </div>
        </div>
    </div>
  );
};
