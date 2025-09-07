import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { ClassPackage, TimeSlot, EnrichedAvailableSlot, BookingMode, AppData } from '../types';
import * as dataService from '../services/dataService';
import { useLanguage } from '../context/LanguageContext';
import { BookingSidebar } from './BookingSidebar';
import { CapacityIndicator } from './CapacityIndicator';
import { InstructorTag } from './InstructorTag';

interface ScheduleSelectorProps {
  pkg: ClassPackage;
  onConfirm: (slots: TimeSlot[]) => void;
  initialSlots: TimeSlot[];
  onBack: () => void;
  bookingMode: BookingMode;
  appData: AppData;
}

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

export const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({ pkg, onConfirm, initialSlots, onBack, bookingMode, appData }) => {
  const { t, language } = useLanguage();
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>(initialSlots);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const timeSlotsRef = useRef<HTMLDivElement>(null);

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
  
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    if (selectedDate && timeSlotsRef.current && window.innerWidth < 768) { // md breakpoint for Tailwind
      timeSlotsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedDate]);

  const handleFlexibleSlotSelect = (slot: EnrichedAvailableSlot) => {
    if (!selectedDate) return;
    const dateStr = formatDateToYYYYMMDD(selectedDate);
    
    const isSlotCurrentlySelected = selectedSlots.some(s => s.date === dateStr && s.time === slot.time);

    if (isSlotCurrentlySelected) {
      setSelectedSlots(prev => prev.filter(s => !(s.date === dateStr && s.time === slot.time)));
    } else if (selectedSlots.length < pkg.classes) {
      const newSlot: TimeSlot = { date: dateStr, time: slot.time, instructorId: slot.instructorId };
      setSelectedSlots(prev => [...prev, newSlot].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
      setSelectedDate(null);
    }
  };

  const handleMonthlySlotSelect = (slot: EnrichedAvailableSlot) => {
    if (!selectedDate) return;
    
    const newSlots: TimeSlot[] = [];
    for (let i = 0; i < 4; i++) {
        const classDate = new Date(selectedDate);
        classDate.setDate(classDate.getDate() + (i * 7));
        newSlots.push({
            date: formatDateToYYYYMMDD(classDate),
            time: slot.time,
            instructorId: slot.instructorId,
        });
    }
    setSelectedSlots(newSlots);
    setSelectedDate(null);
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    date.setHours(0,0,0,0);
    if(date < today) return;
    
    const availableTimesOnDay = dataService.getAvailableTimesForDate(date, appData);
    if (bookingMode === 'monthly') {
        if (!availableTimesOnDay.some(slot => dataService.checkMonthlyAvailability(date, slot, appData))) return;
    } else if (dataService.getAllConfiguredTimesForDate(date, appData).length === 0) {
        return;
    }

    setSelectedDate(date);
  };

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const calendarDays = useMemo(() => {
    const blanks = Array(firstDayOfMonth.getDay()).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, [currentDate.getFullYear(), currentDate.getMonth()]);
  
  const translatedDayNames = useMemo(() => 
      [0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
        const date = new Date(2024, 0, dayIndex + 7); // A week that starts on Sunday
        return date.toLocaleDateString(language, { weekday: 'short' });
      }), 
  [language]);

  const timesForDay = useMemo(() => {
      if (!selectedDate) return [];
      if (bookingMode === 'flexible') {
          return dataService.getAllConfiguredTimesForDate(selectedDate, appData);
      }
      // For monthly mode, only show slots that can actually start a 4-week booking.
      const availableTimes = dataService.getAvailableTimesForDate(selectedDate, appData);
      return availableTimes.filter(slot => dataService.checkMonthlyAvailability(selectedDate, slot, appData));
  }, [selectedDate, bookingMode, appData]);
  
  return (
    <div className="bg-brand-surface p-6 sm:p-8 rounded-xl shadow-subtle animate-fade-in-up">
        <button onClick={onBack} className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold">
            &larr; {t('schedule.backButton')}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <p className="text-brand-secondary mb-6">
                  {bookingMode === 'monthly' ? t('schedule.monthlySubtitle') : t('schedule.subtitle')} <span className="font-bold text-brand-text">{pkg.name}</span>.
                </p>
                
                <div>
                    {!selectedDate ? (
                        // CALENDAR VIEW
                        <div className="animate-fade-in-fast">
                            <div className="flex items-center justify-between mb-4">
                                <button 
                                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                                    disabled={currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()}
                                    className="p-2 rounded-full hover:bg-brand-background disabled:opacity-50 disabled:cursor-not-allowed"
                                >&larr;</button>
                                <h3 className="text-xl font-bold text-brand-text capitalize">
                                    {currentDate.toLocaleString(language, { month: 'long', year: 'numeric' })}
                                </h3>
                                <button 
                                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                                    className="p-2 rounded-full hover:bg-brand-background"
                                >&rarr;</button>
                            </div>
                            <div className="grid grid-cols-7 gap-2 text-center text-sm text-brand-secondary">
                                {translatedDayNames.map(day => <div key={day} className="font-bold">{day}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-2 mt-2">
                                {calendarDays.map((day, index) => {
                                    if (!day) return <div key={`blank-${index}`}></div>;
                                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                    date.setHours(0,0,0,0);
                                    
                                    const dateStr = formatDateToYYYYMMDD(date);
                                    const isPast = date < today;
                                    
                                    let isUnavailable = dataService.getAvailableTimesForDate(date, appData).length === 0;
                                    if (bookingMode === 'monthly' && !isPast) {
                                        const availableSlotsOnDay = dataService.getAvailableTimesForDate(date, appData);
                                        isUnavailable = !availableSlotsOnDay.some(slot => dataService.checkMonthlyAvailability(date, slot, appData));
                                    } else if (bookingMode === 'flexible' && !isPast) {
                                        isUnavailable = dataService.getAllConfiguredTimesForDate(date, appData).length === 0;
                                    }
                                    
                                    const dayIsBooked = selectedSlots.some(s => s.date === dateStr);
                                    const isOutsideBookingWindow = !!firstSelectionDate && !!bookingWindowEndDate && (date < firstSelectionDate || date > bookingWindowEndDate);
                                    
                                    const isDisabled = isPast || (isUnavailable && !dayIsBooked) || (bookingMode === 'flexible' && !dayIsBooked && isOutsideBookingWindow);

                                    let dayClasses = 'w-full aspect-square rounded-md flex items-center justify-center text-md font-semibold transition-all duration-200 relative';
                                    if (isDisabled) {
                                        dayClasses += ' text-brand-border cursor-not-allowed bg-white';
                                    } else if (dayIsBooked) {
                                        dayClasses += ' bg-brand-primary text-white';
                                    } else {
                                        dayClasses += ' bg-brand-background text-brand-text hover:bg-brand-border';
                                    }

                                    return (
                                        <button key={day} onClick={() => handleDayClick(day)} disabled={isDisabled} className={dayClasses}>
                                            {day}
                                            {dayIsBooked && bookingMode === 'monthly' && <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full ring-2 ring-brand-primary"></div>}
                                            {!isPast && !isUnavailable && <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brand-primary rounded-full opacity-50"></div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        // TIME PICKER VIEW
                        <div ref={timeSlotsRef} className="animate-fade-in-fast">
                            <button onClick={() => setSelectedDate(null)} className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold">
                                &larr; {t('schedule.backToCalendar')}
                            </button>
                            <h4 className="font-bold text-center text-brand-text mb-4">
                                {t('schedule.timeSlotTitle', { date: selectedDate.toLocaleDateString(language, { weekday: 'long', day: 'numeric' }) })}
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                {timesForDay.length > 0 ? (
                                    timesForDay.map(slot => {
                                        const isSelected = selectedSlots.some(s => s.date === formatDateToYYYYMMDD(selectedDate) && s.time === slot.time);
                                        const isFull = slot.paidBookingsCount >= slot.maxCapacity;
                                        const handleSelect = bookingMode === 'monthly' ? handleMonthlySlotSelect : handleFlexibleSlotSelect;
                                        
                                        return (
                                            <button 
                                                key={slot.time}
                                                onClick={() => handleSelect(slot)}
                                                disabled={isFull}
                                                className={`relative p-2 rounded-md transition-colors duration-200 font-semibold flex flex-col items-center justify-center gap-2 overflow-hidden ${
                                                    isSelected ? 'bg-brand-primary/10 ring-2 ring-offset-1 ring-brand-primary' : 
                                                    isFull ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70' :
                                                    'bg-white border border-brand-border hover:border-brand-primary'
                                                }`}
                                            >
                                                {isFull && (
                                                    <div className="absolute -top-1 -right-7 bg-red-600 text-white text-[10px] font-bold px-6 py-0.5 transform rotate-45">
                                                        {t('app.soldOut')}
                                                    </div>
                                                )}
                                                <span className="text-brand-text">{slot.time}</span>
                                                <div className="flex items-center gap-2">
                                                    <InstructorTag instructorId={slot.instructorId} instructors={appData.instructors} />
                                                    <CapacityIndicator count={slot.totalBookingsCount} max={slot.maxCapacity} capacityMessages={appData.capacityMessages} />
                                                </div>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <p className="col-span-full text-center text-brand-secondary py-4">{t('schedule.modal.noClasses')}</p>
                                )}
                            </div>
                        </div>
                    )}
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