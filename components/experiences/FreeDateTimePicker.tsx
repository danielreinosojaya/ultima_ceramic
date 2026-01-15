import React, { useState, useEffect, useCallback, useRef } from 'react';
import { checkSlotAvailability, SlotAvailabilityResult, getAvailability } from '../../services/dataService';
import type { AvailableSlot, DayKey } from '../../types';
import { SocialBadge } from '../SocialBadge';

// Nombres de días para mapear Date.getDay() a DayKey
const DAY_KEYS: DayKey[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface FreeDateTimePickerProps {
  selectedDate?: string | null;
  selectedTime?: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string, availability?: SlotAvailabilityResult) => void;
  technique: string;
  participants: number;
  /** Horarios base por día de la semana (opcional, se carga automáticamente si no se proporciona) */
  availability?: Record<DayKey, AvailableSlot[]>;
}

export const FreeDateTimePicker: React.FC<FreeDateTimePickerProps> = ({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  technique,
  participants,
  availability: propAvailability
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailabilityResult | null>(null);
  const [hourAvailability, setHourAvailability] = useState<Record<string, SlotAvailabilityResult | null>>({});
  const [loadingDayAvailability, setLoadingDayAvailability] = useState(false);
  const hourSectionRef = useRef<HTMLDivElement | null>(null);
  const availabilityRef = useRef<HTMLDivElement | null>(null);
  
  // Estado para availability cargada desde el servidor (si no se proporciona como prop)
  const [loadedAvailability, setLoadedAvailability] = useState<Record<DayKey, AvailableSlot[]> | null>(null);
  
  // Usar availability de prop o la cargada del servidor
  const availability = propAvailability || loadedAvailability;
  
  // Cargar availability desde el servidor si no se proporciona como prop
  useEffect(() => {
    if (!propAvailability) {
      getAvailability().then(setLoadedAvailability).catch(err => {
        console.error('[FreeDateTimePicker] Error loading availability:', err);
      });
    }
  }, [propAvailability]);

  // Parsear fecha ISO a fecha local (evitar problema UTC)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  /**
   * REGLA DE NEGOCIO - TORNO ALFARERO:
   * - Si participants < 3 (ej: 2 personas): SOLO horarios que coincidan con clases normales
   * - Si participants >= 3: Cualquier horario dentro del horario de operación
   * 
   * Esto aplica específicamente para 'potters_wheel'. Otras técnicas pueden tener horarios libres.
   */
  const getAvailableHours = (dateStr: string): string[] => {
    const date = parseLocalDate(dateStr);
    const dayOfWeek = date.getDay();
    const dayKey = DAY_KEYS[dayOfWeek];
    
    // Lunes: cerrado
    if (dayOfWeek === 1) {
      return [];
    }
    
    // REGLA: Para torno (potters_wheel) con menos de 3 personas → solo horarios fijos
    const requiresFixedSchedule = technique === 'potters_wheel' && participants < 3;
    
    if (requiresFixedSchedule && availability) {
      // Filtrar solo los horarios de clases normales para esta técnica
      const fixedSlots = availability[dayKey]?.filter(slot => 
        slot.technique === 'potters_wheel'
      ) || [];
      
      let fixedHours = fixedSlots.map(slot => slot.time).sort();
      
      // AGREGAR HORARIOS ESPECIALES DE INTRODUCCIÓN PARA GRUPOS DE 2 PERSONAS
      // Martes 19:00 y Miércoles 11:00 son clases de introducción de torno
      if (dayOfWeek === 2) { // Tuesday
        fixedHours.push('19:00');
      } else if (dayOfWeek === 3) { // Wednesday
        fixedHours.push('11:00');
      }
      
      fixedHours = [...new Set(fixedHours)].sort(); // Eliminar duplicados y ordenar
      
      console.log(`🔒 [2 personas] Horarios FIJOS para ${dateStr} (${dayKey}):`, fixedHours);
      
      // Si no hay horarios fijos ese día, devolver array vacío
      if (fixedHours.length === 0) {
        console.log(`⚠️ No hay clases de torno programadas para ${dayKey}`);
      }
      
      return fixedHours;
    }
    
    // Para 3+ personas o técnicas sin restricción: generar todos los horarios
    const hours: string[] = [];

    if (dayOfWeek === 6) {
      // Sábado: 9am a 7pm (cierre 9pm) - slots cada 30 min hasta 19:00
      for (let hour = 9; hour <= 19; hour++) {
        for (const min of ['00', '30']) {
          if (hour === 19 && min === '30') break;
          hours.push(`${String(hour).padStart(2, '0')}:${min}`);
        }
      }
    } else if (dayOfWeek === 0) {
      // Domingo: 10am a 4pm (cierre 6pm) - slots cada 30 min hasta 16:00
      for (let hour = 10; hour <= 16; hour++) {
        for (const min of ['00', '30']) {
          if (hour === 16 && min === '30') break;
          hours.push(`${String(hour).padStart(2, '0')}:${min}`);
        }
      }
    } else {
      // Martes a Viernes: 10am a 7pm (cierre 9pm) - slots cada 30 min hasta 19:00
      for (let hour = 10; hour <= 19; hour++) {
        for (const min of ['00', '30']) {
          if (hour === 19 && min === '30') break;
          hours.push(`${String(hour).padStart(2, '0')}:${min}`);
        }
      }
    }
    
    console.log(`🆓 [${participants}+ personas] Horarios LIBRES para ${dateStr} (día ${dayOfWeek}):`, hours.length, 'slots');
    return hours;
  };

  // Validar disponibilidad cuando se selecciona hora
  const validateSlotAvailability = useCallback(async (date: string, time: string) => {
    if (!date || !time || !technique || !participants) return;
    
    setCheckingAvailability(true);
    setSlotAvailability(null);
    
    try {
      const result = await checkSlotAvailability(date, time, technique, participants);
      setSlotAvailability(result);
      return result;
    } catch (error) {
      console.error('Error checking availability:', error);
      return null;
    } finally {
      setCheckingAvailability(false);
    }
  }, [technique, participants]);

  // Reset availability cuando cambia fecha
  useEffect(() => {
    setSlotAvailability(null);
    setHourAvailability({});
  }, [selectedDate]);

  // Prefetch disponibilidad de todas las horas del día seleccionado
  useEffect(() => {
    const fetchDayAvailability = async () => {
      if (!selectedDate || !technique || !participants) return;

      const hours = getAvailableHours(selectedDate);
      setLoadingDayAvailability(true);
      try {
        const results = await Promise.all(
          hours.map(async (hour) => {
            try {
              const res = await checkSlotAvailability(selectedDate, hour, technique, participants);
              return [hour, res as SlotAvailabilityResult | null] as const;
            } catch (error) {
              console.error('Error pre-check availability:', error);
              return [hour, null] as const;
            }
          })
        );
        const map: Record<string, SlotAvailabilityResult | null> = {};
        results.forEach(([h, res]) => {
          map[h] = res;
        });
        setHourAvailability(map);
      } finally {
        setLoadingDayAvailability(false);
      }
    };

    fetchDayAvailability();
  }, [selectedDate, technique, participants]);

  // Auto-scroll al selector de horas cuando se elige fecha
  useEffect(() => {
    if (selectedDate && hourSectionRef.current) {
      hourSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedDate]);

  // Auto-scroll al resultado de disponibilidad cuando se obtiene
  useEffect(() => {
    if (slotAvailability && !checkingAvailability && availabilityRef.current) {
      availabilityRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [slotAvailability, checkingAvailability]);

  // Generar días del mes
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const monthDays = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const isMonday = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.getDay() === 1;
  };

  const isPastDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const handleDayClick = (day: number) => {
    if (isMonday(day) || isPastDate(day)) return;
    
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelectDate(dateStr);
    // Llevar al selector de horas inmediatamente
    requestAnimationFrame(() => {
      if (hourSectionRef.current) {
        hourSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleTimeClick = async (time: string) => {
    if (!selectedDate) return;
    // Si ya tenemos disponibilidad pre-checada, úsala sin nuevo request
    const cached = hourAvailability[time];
    if (cached) {
      setSlotAvailability(cached);
      onSelectTime(time, cached);
      if (availabilityRef.current) {
        availabilityRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // Validar disponibilidad al seleccionar hora
    const availability = await validateSlotAvailability(selectedDate, time);
    onSelectTime(time, availability || undefined);
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Calendario */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => handleMonthChange('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-brand-primary"
          >
            ←
          </button>
          <h3 className="text-xl font-bold text-brand-text capitalize">{monthName}</h3>
          <button
            onClick={() => handleMonthChange('next')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-brand-primary"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-bold text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {monthDays.map((day, index) => {
            if (!day) return <div key={`empty-${index}`}></div>;
            
            const isMonday_ = isMonday(day);
            const isPast = isPastDate(day);
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isDisabled = isMonday_ || isPast;
            
            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                disabled={isDisabled}
                className={`aspect-square rounded-xl font-semibold text-sm transition-all ${
                  isSelected
                    ? 'bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-lg scale-105'
                    : isDisabled
                    ? 'bg-transparent text-gray-300 cursor-not-allowed'
                    : 'bg-gray-50 text-brand-text hover:bg-brand-primary/10 hover:scale-105 border border-transparent hover:border-brand-primary/20'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selector de hora con validación */}
      {selectedDate && (
        <div ref={hourSectionRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-brand-text text-lg">
                Horarios Disponibles
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {parseLocalDate(selectedDate).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })} • Duración: 2 horas
              </p>
            </div>
            {loadingDayAvailability && (
              <div className="flex items-center gap-2 text-brand-primary">
                <div className="animate-spin w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full"></div>
                <span className="text-xs font-medium">Verificando...</span>
              </div>
            )}
          </div>
          
          {/* Mensaje informativo para grupos de 2 personas en torno */}
          {technique === 'potters_wheel' && participants < 3 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-semibold text-amber-900 text-sm">
                    Horarios de clases programadas
                  </p>
                  <p className="text-amber-700 text-xs mt-1">
                    Para grupos de 2 personas, solo están disponibles los horarios de clases ya programadas. 
                    <strong> Si deseas elegir cualquier horario, agrega 1 persona más a tu grupo.</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Mensaje si no hay horarios disponibles */}
          {getAvailableHours(selectedDate).length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
              <span className="text-3xl mb-2 block">📭</span>
              <p className="font-semibold text-gray-700">No hay horarios disponibles este día</p>
              <p className="text-gray-500 text-sm mt-1">
                {technique === 'potters_wheel' && participants < 3 
                  ? 'No hay clases de torno programadas para este día. Prueba otro día o agrega más personas a tu grupo.'
                  : 'Por favor selecciona otro día.'}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {getAvailableHours(selectedDate).map(hour => {
              const isSelected = selectedTime === hour;
              const hourState = hourAvailability[hour];
              const isUnavailable = hourState ? hourState.available === false : false;
              
              return (
                <button
                  key={hour}
                  onClick={() => handleTimeClick(hour)}
                  disabled={checkingAvailability || loadingDayAvailability || isUnavailable}
                  className={`relative p-3.5 rounded-xl border-2 font-bold text-sm transition-all ${
                    isSelected
                      ? 'border-brand-primary bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-lg scale-105'
                      : isUnavailable
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                        : 'border-gray-200 bg-white hover:border-brand-primary hover:bg-brand-primary/5 hover:scale-105'
                  } ${(checkingAvailability || loadingDayAvailability) ? 'opacity-50' : ''}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{hour}</span>
                    {hourState && hourState.capacity && (
                      <SocialBadge 
                        currentCount={hourState.capacity.booked} 
                        maxCapacity={hourState.capacity.max} 
                        variant="compact" 
                      />
                    )}
                  </div>
                  {isUnavailable && hourState && hourState.capacity && hourState.capacity.available === 0 ? null : isUnavailable && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">×</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Indicador de carga */}
      {checkingAvailability && (
        <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-lg">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-blue-700">Verificando disponibilidad...</span>
        </div>
      )}

      {/* Resultado de disponibilidad */}
      {slotAvailability && !checkingAvailability && (
        <div ref={availabilityRef} className={`p-4 rounded-xl border-2 ${
          slotAvailability.available 
            ? 'bg-green-50 border-green-300' 
            : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {slotAvailability.available ? '✅' : '❌'}
            </span>
            <div className="flex-1">
              <p className={`font-bold ${slotAvailability.available ? 'text-green-800' : 'text-red-800'}`}>
                {slotAvailability.available 
                  ? `¡Disponible! ${slotAvailability.capacity.available} cupos libres`
                  : 'No hay cupos suficientes'
                }
              </p>
              <p className={`text-sm ${slotAvailability.available ? 'text-green-700' : 'text-red-700'}`}>
                {slotAvailability.message}
              </p>
              {!slotAvailability.available && (
                <p className="text-sm text-red-600 mt-2 font-medium">
                  Por favor selecciona otro horario o reduce el número de participantes.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
