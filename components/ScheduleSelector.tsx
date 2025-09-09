import React, { useState, useMemo, useEffect } from 'react';
import type { ClassPackage, TimeSlot, EnrichedAvailableSlot, BookingMode, AppData } from '../types';
import * as dataService from '../services/dataService';
import { useLanguage } from '../context/LanguageContext';
import { BookingSidebar } from './BookingSidebar';
import { CapacityIndicator } from './CapacityIndicator';
import { InstructorTag } from './InstructorTag';

const formatDateToYYYYMMDD = (d: Date): string => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseYYYYMMDDToDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

const getWeekStartDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday, making Monday the start
    return new Date(d.setDate(diff));
};


interface ScheduleSelectorProps {
  pkg: ClassPackage;
  onConfirm: (slots: TimeSlot[]) => void;
  initialSlots: TimeSlot[];
  onBack: () => void;
  bookingMode: BookingMode;
  appData: AppData;
}

export const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({ pkg, onConfirm, initialSlots, onBack, bookingMode, appData }) => {
  const { t, language } = useLanguage();
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>(initialSlots);
  const [currentDate, setCurrentDate] = useState(getWeekStartDate(new Date()));

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const firstSelectionDate = useMemo(() => {
    if (selectedSlots.length === 0 || bookingMode === 'monthly') return null;
    const sortedSlots = [...selectedSlots].sort((a, b) => a.date.localeCompare(b.date));
    return parseYYYYMMDDToDate(sortedSlots[0].date);
  }, [selectedSlots, bookingMode]);

  const bookingWindowEndDate = useMemo(() => {
    if (!firstSelectionDate) return null;
    const endDate = new Date(firstSelectionDate);
    endDate.setDate(endDate.getDate() + 30);
    return endDate;
  }, [firstSelectionDate]);

  const { weekDates, scheduleData } = useMemo(() => {
      const startOfWeek = new Date(currentDate);
      const dates: Date[] = [];
      for (let i = 0; i < 7; i++) {
          const date = new Date(startOfWeek);
          date.setDate(date.getDate() + i);
          dates.push(date);
      }
      
      const data: Record<string, EnrichedAvailableSlot[]> = {};
      dates.forEach(date => {
          const dateStr = formatDateToYYYYMMDD(date);
          data[dateStr] = dataService.getAllConfiguredTimesForDate(date, appData, pkg.details.technique)
            .sort((a, b) => a.time.localeCompare(b.time));
      });

      return { weekDates: dates, scheduleData: data };
  }, [currentDate, appData, pkg.details.technique]);
  
  const handleSlotSelect = (date: Date, slot: EnrichedAvailableSlot) => {
    const dateStr = formatDateToYYYYMMDD(date);
    const isCurrentlySelected = selectedSlots.some(s => s.date === dateStr && s.time === slot.time);

    if (bookingMode === 'monthly') {
      if (dataService.checkMonthlyAvailability(date, slot, appData, pkg.details.technique)) {
        const newSlots: TimeSlot[] = [];
        for (let i = 0; i < 4; i++) {
            const classDate = new Date(date);
            classDate.setDate(classDate.getDate() + (i * 7));
            newSlots.push({
                date: formatDateToYYYYMMDD(classDate),
                time: slot.time,
                instructorId: slot.instructorId,
            });
        }
        setSelectedSlots(newSlots);
      } else {
        alert(t('schedule.monthlyNotAvailableError', { default: 'This slot is not available for 4 consecutive weeks. Please choose another.'}));
      }
    } else { // Flexible mode
      if (isCurrentlySelected) {
        setSelectedSlots(prev => prev.filter(s => !(s.date === dateStr && s.time === slot.time)));
      } else if (selectedSlots.length < pkg.classes) {
        const newSlot: TimeSlot = { date: dateStr, time: slot.time, instructorId: slot.instructorId };
        setSelectedSlots(prev => [...prev, newSlot].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
      }
    }
  };

  const handleNextWeek = () => setCurrentDate(prev => { const next = new Date(prev); next.setDate(next.getDate() + 7); return next; });
  const handlePrevWeek = () => setCurrentDate(prev => { const prevDate = new Date(prev); prevDate.setDate(prevDate.getDate() - 7); return prevDate; });

  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  return (
    <div className="bg-brand-surface p-4 sm:p-6 rounded-xl shadow-subtle animate-fade-in-up">
        <button onClick={onBack} className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold">
            &larr; {t('schedule.backButton')}
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <p className="text-brand-secondary mb-2">
                  {bookingMode === 'monthly' ? t('schedule.monthlySubtitle') : t('schedule.subtitle')} <span className="font-bold text-brand-text">{pkg.name}</span>.
                </p>
                {bookingMode === 'flexible' && firstSelectionDate && bookingWindowEndDate && (
                    <div className="text-xs text-center font-semibold bg-amber-100 text-amber-800 p-2 rounded-md mb-4 animate-fade-in-fast">
                      {t('schedule.bookingWindowMessage')} {bookingWindowEndDate.toLocaleDateString(language, { month: 'long', day: 'numeric' })}.
                    </div>
                )}
                 <div className="flex justify-between items-center mb-4">
                    <button onClick={handlePrevWeek} disabled={currentDate <= today} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50">&lt;</button>
                    <div className="font-semibold text-brand-text text-center">
                        {weekStart.toLocaleDateString(language, { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <button onClick={handleNextWeek} className="p-2 rounded-full hover:bg-gray-100">&gt;</button>
                </div>
                <div className="grid grid-cols-7 gap-2 border-t border-b border-gray-200 py-2">
                  {weekDates.map(date => (
                    <div key={date.toISOString()} className="text-center font-bold text-gray-500 uppercase">
                      <div className="text-xs">{date.toLocaleDateString(language, { weekday: 'short' })}</div>
                      <div className="text-lg">{date.getDate()}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2 mt-2 min-h-[400px]">
                  {weekDates.map(date => {
                    const dateStr = formatDateToYYYYMMDD(date);
                    const slots = scheduleData[dateStr] || [];
                    const isPast = date < today;

                    return (
                      <div key={dateStr} className="flex flex-col gap-2 p-1 bg-brand-background/70 rounded-md">
                        {isPast ? (
                           <div className="flex-grow flex items-center justify-center">
                               <span className="text-xs text-gray-300">-</span>
                           </div>
                        ) : slots.length > 0 ? (
                           slots.map(slot => {
                                const isSelected = selectedSlots.some(s => s.date === dateStr && s.time === slot.time);
                                const isFull = slot.paidBookingsCount >= slot.maxCapacity;
                                const isOutsideBookingWindow = bookingMode === 'flexible' && firstSelectionDate && bookingWindowEndDate && (date < firstSelectionDate || date > bookingWindowEndDate);
                                const isMonthlyStartInvalid = bookingMode === 'monthly' && !dataService.checkMonthlyAvailability(date, slot, appData, pkg.details.technique);
                                const isDisabled = isFull || (!isSelected && isOutsideBookingWindow) || isMonthlyStartInvalid;

                                return (
                                  <button
                                    key={slot.time}
                                    onClick={() => handleSlotSelect(date, slot)}
                                    disabled={isDisabled}
                                    className={`relative p-2 rounded-md text-left transition-all duration-200 border w-full flex flex-col gap-1.5 ${
                                      isSelected ? 'bg-brand-primary/10 ring-2 ring-brand-primary border-transparent' : 
                                      isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70' :
                                      'bg-white hover:border-brand-primary hover:shadow-sm'
                                    }`}
                                  >
                                    <span className="font-semibold text-sm text-brand-text">{slot.time}</span>
                                    <InstructorTag instructorId={slot.instructorId} instructors={appData.instructors} />
                                    <CapacityIndicator count={slot.totalBookingsCount} max={slot.maxCapacity} capacityMessages={appData.capacityMessages} />
                                    {isFull && <div className="absolute top-1 right-1 text-[8px] font-bold bg-red-500 text-white px-1 rounded-sm">LLENO</div>}
                                  </button>
                                )
                            })
                        ) : (
                          <div className="flex-grow flex items-center justify-center">
                               <span className="text-xs text-gray-300">-</span>
                           </div>
                        )}
                      </div>
                    )
                  })}
                </div>
            </div>
            <div className="lg:col-span-1">
                 <BookingSidebar 
                    product={pkg} 
                    selectedSlots={selectedSlots}
                    onRemoveSlot={(slotToRemove) => setSelectedSlots(prev => prev.filter(s => s !== slotToRemove))}
                    onConfirm={() => onConfirm(selectedSlots)}
                    bookingMode={bookingMode}
                />
            </div>
        </div>
    </div>
  );
};
