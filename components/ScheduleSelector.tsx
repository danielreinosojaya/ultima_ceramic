import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { ClassPackage, TimeSlot, EnrichedAvailableSlot, BookingMode, AppData } from '../types.js';
import * as dataService from '../services/dataService.js';
// Eliminado useLanguage, la app ahora es monolingüe en español
import { BookingSidebar } from './BookingSidebar.js';
import ScheduleDetailPanel from './ScheduleDetailPanel';
import { CapacityIndicator } from './CapacityIndicator.js';
import { SocialBadge } from './SocialBadge.js';
import { InstructorTag } from './InstructorTag.js';
import { DAY_NAMES } from '../constants.js';

const formatDateToYYYYMMDD = (d: Date): string => d.toISOString().split('T')[0];

const parseYYYYMMDDToDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

const getWeekStartDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday is start
    return new Date(d.setDate(diff));
};

interface ScheduleSelectorProps {
  pkg: ClassPackage;
  onConfirm: (slots: TimeSlot[]) => void;
  initialSlots: TimeSlot[];
  onBack: () => void;
  bookingMode: BookingMode;
  appData: AppData;
  onAppDataUpdate?: (updates: Partial<AppData>) => void;
}

export const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({ pkg, onConfirm, initialSlots, onBack, bookingMode, appData, onAppDataUpdate }) => {
  // Eliminado useLanguage, la app ahora es monolingüe en español
  const language = 'es-ES';
  // Inicializar sin slots seleccionados por defecto
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  // Inicializar la vista en la semana del día actual
  const [currentDate, setCurrentDate] = useState(getWeekStartDate(new Date()));

  // Force load bookings if not available
  useEffect(() => {
    const loadBookingsIfNeeded = async () => {
      if (appData.bookings.length === 0 && onAppDataUpdate) {
        try {
          const bookings = await dataService.getBookings();
          onAppDataUpdate({ bookings });
        } catch (error) {
          console.error('Failed to load bookings for capacity calculation:', error);
        }
      }
    };
    loadBookingsIfNeeded();
  }, [appData.bookings.length, onAppDataUpdate]);

  // Refs for mobile day carousel
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Always normalize dates for comparison
  const normalizeDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setMilliseconds(0);
    return d;
  };
  const today = useMemo(() => normalizeDate(new Date()), []);

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
        if (!data[dateStr]) { // Verifica si los datos ya están en caché
          data[dateStr] = dataService.getAllConfiguredTimesForDate(date, appData, pkg.details.technique)
            .sort((a, b) => a.time.localeCompare(b.time));
        }
      });

      return { weekDates: dates, scheduleData: data };
  }, [currentDate, appData, pkg.details.technique]);
  
  const handleSlotSelect = (date: Date, slot: EnrichedAvailableSlot) => {
    const dateStr = formatDateToYYYYMMDD(date);
    const isCurrentlySelected = selectedSlots.some(s => s.date === dateStr && s.time === slot.time);

    if (bookingMode === 'monthly') {
      // Check all 4 weeks for availability and show specific feedback
      let unavailableWeeks: number[] = [];
      for (let i = 0; i < 4; i++) {
        const classDate = new Date(date);
        classDate.setDate(classDate.getDate() + (i * 7));
        if (!dataService.checkMonthlyAvailability(classDate, slot, appData, pkg.details.technique)) {
          unavailableWeeks.push(i + 1);
        }
      }
      if (unavailableWeeks.length === 0) {
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
        // Use a custom error modal or toast here in production
  alert(`Este horario no está disponible para la(s) semana(s): ${unavailableWeeks.join(', ')}. Por favor elige otro.`);
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

  // State for mobile view
  const todayStr = useMemo(() => formatDateToYYYYMMDD(new Date()), []);
  const todayIndex = useMemo(() => weekDates.findIndex(d => formatDateToYYYYMMDD(d) === todayStr), [weekDates, todayStr]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex !== -1 ? todayIndex : 0);

  // Solo actualizar el índice si no hay selección previa (primer render o cambio de semana sin selección manual)
  useEffect(() => {
    setSelectedDayIndex(prevIndex => {
      // Si el usuario ya seleccionó un día, no sobrescribir
      if (prevIndex !== undefined && prevIndex !== null && prevIndex >= 0 && prevIndex < weekDates.length) {
        return prevIndex;
      }
      const newTodayIndex = weekDates.findIndex(d => formatDateToYYYYMMDD(d) === todayStr);
      return newTodayIndex !== -1 ? newTodayIndex : 0;
    });
  }, [weekDates, todayStr]);

  // Effect to scroll the selected day into view on mobile
  useEffect(() => {
    if (selectedDayIndex >= 0 && selectedDayIndex < dayRefs.current.length && dayRefs.current[selectedDayIndex]) {
        dayRefs.current[selectedDayIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    }
  }, [selectedDayIndex]);

  return (
    <div className="bg-brand-surface p-4 sm:p-6 rounded-xl shadow-subtle animate-fade-in-up">
    <button onClick={onBack} className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold">
      &larr; Atrás
    </button>
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="lg:w-2/3">
                <p className="text-brand-secondary mb-2">
                  {bookingMode === 'monthly' ? 'Selecciona el horario para tus clases mensuales' : 'Selecciona el horario para tus clases'} <span className="font-bold text-brand-text">{pkg.name}</span>.
                </p>
                
                {/* Enhanced Social Proof Tip - More Visible */}
                <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-400 p-4 rounded-lg mb-4 shadow-md animate-fade-in-fast">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div className="flex-1">
                      <p className="font-bold text-blue-900 mb-2 text-base">¿Buscas hacer amigos mientras aprendes?</p>
                      <div className="space-y-1.5 text-sm text-blue-800">
                        <p className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                            <span className="text-xs">🔥</span> Popular
                          </span>
                          <span>Clase con alta demanda</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                            <span className="text-xs">👥</span> 3
                          </span>
                          <span>Ya hay gente registrada - ¡únete!</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 animate-pulse">
                            <span className="text-xs">✨</span> 2 cupos
                          </span>
                          <span>¡Últimos espacios disponibles!</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {bookingMode === 'flexible' && firstSelectionDate && bookingWindowEndDate && (
                    <div className="text-xs text-center font-semibold bg-amber-100 text-amber-800 p-2 rounded-md mb-4 animate-fade-in-fast">
                      {`Puedes seleccionar clases hasta el ${bookingWindowEndDate.toLocaleDateString(language, { month: 'long', day: 'numeric' })}.`}
                    </div>
                )}
                <div className="flex justify-between items-center mb-4">
                    <button onClick={handlePrevWeek} disabled={currentDate <= today} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50">&lt;</button>
                    <div className="font-semibold text-brand-text text-center">
                        {weekStart.toLocaleDateString(language, { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <button onClick={handleNextWeek} className="p-2 rounded-full hover:bg-gray-100">&gt;</button>
                </div>
                
                {/* --- DESKTOP VIEW --- */}
                <div className="hidden lg:block">
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
                            <div className="flex-grow flex items-center justify-center"> <span className="text-xs text-gray-300">-</span> </div>
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
                                      aria-disabled={isDisabled}
                                      aria-label={isFull ? 'Lleno' : 'Horario disponible'}
                                      className={`relative p-2 rounded-md text-left transition-all duration-200 border w-full flex flex-col gap-1.5 ${
                                        isSelected ? 'bg-brand-primary/10 ring-2 ring-brand-primary border-transparent shadow-md' : 
                                        isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70' :
                                        'bg-white hover:border-brand-primary hover:shadow-md hover:bg-brand-primary/5 active:scale-95'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-semibold text-sm text-brand-text">{slot.time}</span>
                                        <SocialBadge currentCount={slot.paidBookingsCount} maxCapacity={slot.maxCapacity} variant="compact" />
                                      </div>
                                      <InstructorTag instructorId={slot.instructorId} instructors={appData.instructors} />
                                      <CapacityIndicator count={slot.paidBookingsCount} max={slot.maxCapacity} capacityMessages={appData.capacityMessages} />
                                      {isFull && <div className="absolute top-1 right-1 text-[8px] font-bold bg-red-500 text-white px-1 rounded-sm">LLENO</div>}
                                    </button>
                                  )
                              })
                          ) : (
                            <div className="flex-grow flex items-center justify-center"> <span className="text-xs text-gray-300">-</span> </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* --- MOBILE VIEW --- */}
                <div className="block lg:hidden">
                  <div
                    ref={scrollContainerRef}
                    className="flex items-center space-x-2 overflow-x-auto pb-2 -mx-3 sm:-mx-4 px-3 sm:px-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                  >
                     {weekDates.map((date, index) => {
                      const dateStr = formatDateToYYYYMMDD(date);
                      const slotsForDay = scheduleData[dateStr] || [];
                      const isPast = date < today;
                      const hasAvailableSlots = !isPast && slotsForDay.length > 0;
                      const hasRegistrations = hasAvailableSlots && slotsForDay.some(s => s.paidBookingsCount > 0);
                      const isSelected = index === selectedDayIndex;

                      return (
                        <button
                          key={date.toISOString()}
                          ref={el => { dayRefs.current[index] = el; }}
                          onClick={() => hasAvailableSlots && setSelectedDayIndex(index)}
                          disabled={!hasAvailableSlots}
                          aria-disabled={!hasAvailableSlots}
                          aria-label={hasAvailableSlots ? 'Día disponible' : 'Día no disponible'}
                          className={`flex-shrink-0 w-16 h-20 rounded-lg flex flex-col items-center justify-center transition-all duration-300 relative border-2 ${
                            isSelected
                              ? 'bg-brand-primary text-white border-brand-primary shadow-lg'
                              : hasAvailableSlots
                              ? hasRegistrations 
                                ? 'bg-blue-50 text-brand-text border-blue-300 hover:bg-blue-100' 
                                : 'bg-white text-brand-text border-transparent hover:bg-gray-100'
                              : 'bg-brand-background text-gray-400 border-transparent opacity-70 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-xs font-bold uppercase">{date.toLocaleDateString(language, { weekday: 'short' })}</span>
                          <span className="text-2xl font-extrabold mt-1">{date.getDate()}</span>
                          {hasAvailableSlots && (
                             <div className={`absolute bottom-2 h-1.5 w-1.5 rounded-full transition-colors ${isSelected ? 'bg-white' : 'bg-brand-primary'}`}></div>
                          )}
                          {hasRegistrations && !isSelected && (
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white pulse-dot"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 space-y-2">
                    {(() => {
                      const selectedDate = weekDates[selectedDayIndex];
                      if (!selectedDate) return null; // Guard against undefined date
                      const dateStr = formatDateToYYYYMMDD(selectedDate);
                      const slotsForDay = scheduleData[dateStr] || [];
                      const isPast = selectedDate < today;

                      if (isPast) return <div className="text-center py-10 text-brand-secondary">-</div>;
                      if (slotsForDay.length === 0) return <div className="text-center py-10 text-brand-secondary">No hay clases disponibles</div>;
                      
                      return slotsForDay.map(slot => {
                        const isSelected = selectedSlots.some(s => s.date === dateStr && s.time === slot.time);
                        const isFull = slot.paidBookingsCount >= slot.maxCapacity;
                        const isOutsideBookingWindow = bookingMode === 'flexible' && firstSelectionDate && bookingWindowEndDate && (selectedDate < firstSelectionDate || selectedDate > bookingWindowEndDate);
                        const isMonthlyStartInvalid = bookingMode === 'monthly' && !dataService.checkMonthlyAvailability(selectedDate, slot, appData, pkg.details.technique);
                        const isDisabled = isFull || (!isSelected && isOutsideBookingWindow) || isMonthlyStartInvalid;
                        return (
                          <button 
                            key={slot.time} 
                            onClick={() => handleSlotSelect(selectedDate, slot)} 
                            disabled={isDisabled}
                            aria-disabled={isDisabled}
                            aria-label={isFull ? 'Lleno' : 'Horario disponible'}
                            className={`relative p-3 rounded-md text-left transition-all duration-200 border w-full flex items-center justify-between gap-4 ${
                              isSelected ? 'bg-brand-primary/10 ring-2 ring-brand-primary border-transparent shadow-md' : 
                              isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70' :
                              slot.paidBookingsCount > 0 ? 'bg-blue-50 border-blue-300 hover:border-brand-primary hover:shadow-md active:scale-[0.98]' :
                              'bg-white hover:border-brand-primary hover:shadow-sm'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-semibold text-md text-brand-text">{slot.time}</span>
                                <SocialBadge currentCount={slot.paidBookingsCount} maxCapacity={slot.maxCapacity} variant="full" />
                              </div>
                              <InstructorTag instructorId={slot.instructorId} instructors={appData.instructors} />
                            </div>
                            <CapacityIndicator count={slot.paidBookingsCount} max={slot.maxCapacity} capacityMessages={appData.capacityMessages} />
                            {isFull && <div className="absolute top-1 right-1 text-[8px] font-bold bg-red-500 text-white px-1 rounded-sm">LLENO</div>}
                            {!isSelected && slot.paidBookingsCount > 0 && !isFull && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white pulse-dot"></div>
                            )}
                          </button>
                        )
                      })
                    })()}
                  </div>
                </div>
            </div>
            <div className="lg:w-1/3 flex flex-col gap-4">
              {/* Panel de detalle del slot seleccionado */}
              <ScheduleDetailPanel slot={(() => {
                if (selectedSlots.length === 0) return null;
                // Tomar el primer slot seleccionado (o el último, según preferencia UX)
                const slotSel = selectedSlots[selectedSlots.length - 1];
                const slotsForDay = scheduleData[slotSel.date] || [];
                return slotsForDay.find(s => s.time === slotSel.time && s.instructorId === slotSel.instructorId) || null;
              })()} />
              <BookingSidebar 
                product={pkg} 
                selectedSlots={selectedSlots}
                onRemoveSlot={(slotToRemove) => setSelectedSlots(prev => prev.filter(s => s.date !== slotToRemove.date || s.time !== slotToRemove.time))}
                onConfirm={() => onConfirm(selectedSlots)}
                bookingMode={bookingMode}
              />
            </div>
        </div>
      </div>
  );
};