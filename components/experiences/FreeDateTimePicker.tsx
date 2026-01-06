import React, { useState, useEffect, useCallback, useRef } from 'react';
import { checkSlotAvailability, SlotAvailabilityResult } from '../../services/dataService';

interface FreeDateTimePickerProps {
  selectedDate?: string | null;
  selectedTime?: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string, availability?: SlotAvailabilityResult) => void;
  technique: string;
  participants: number;
}

export const FreeDateTimePicker: React.FC<FreeDateTimePickerProps> = ({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  technique,
  participants
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailabilityResult | null>(null);
  const hourSectionRef = useRef<HTMLDivElement | null>(null);
  const availabilityRef = useRef<HTMLDivElement | null>(null);

  // Parsear fecha ISO a fecha local (evitar problema UTC)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Generar horas disponibles según el día de la semana - TODAS las horas
  const getAvailableHours = (dateStr: string): string[] => {
    const date = parseLocalDate(dateStr);
    const dayOfWeek = date.getDay();
    const hours: string[] = [];

    if (dayOfWeek === 6) {
      // Sábado: 9am a 7pm - TODAS LAS HORAS cada 30 min
      for (let hour = 9; hour <= 19; hour++) {
        for (let min of ['00', '30']) {
          if (hour === 19 && min === '30') break; // Última hora: 19:00
          hours.push(`${String(hour).padStart(2, '0')}:${min}`);
        }
      }
    } else if (dayOfWeek === 0) {
      // Domingo: 10am a 6pm - TODAS LAS HORAS cada 30 min
      for (let hour = 10; hour <= 18; hour++) {
        for (let min of ['00', '30']) {
          if (hour === 18 && min === '30') break; // Última hora: 18:00
          hours.push(`${String(hour).padStart(2, '0')}:${min}`);
        }
      }
    } else {
      // Otros días (excepto lunes): 10am a 7pm - TODAS LAS HORAS cada 30 min
      for (let hour = 10; hour <= 19; hour++) {
        for (let min of ['00', '30']) {
          if (hour === 19 && min === '30') break; // Última hora: 19:00
          hours.push(`${String(hour).padStart(2, '0')}:${min}`);
        }
      }
    }
    
    console.log(`🕐 Horas generadas para ${dateStr} (día ${dayOfWeek}):`, hours.length, 'slots', hours);
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
  }, [selectedDate]);

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
    
    // Validar disponibilidad al seleccionar hora
    const availability = await validateSlotAvailability(selectedDate, time);
    onSelectTime(time, availability || undefined);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-xl">📅</span>
          <div>
            <p className="font-semibold text-blue-900">Elige tu Fecha y Hora</p>
            <p className="text-sm text-blue-700">
              Selecciona libremente tu día preferido (cerrado lunes) y horario. El sistema validará la disponibilidad.
            </p>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white border-2 border-brand-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => handleMonthChange('prev')}
            className="p-2 rounded-lg hover:bg-brand-background transition-colors"
          >
            ←
          </button>
          <h3 className="text-lg font-bold text-brand-text capitalize">{monthName}</h3>
          <button
            onClick={() => handleMonthChange('next')}
            className="p-2 rounded-lg hover:bg-brand-background transition-colors"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
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
                className={`aspect-square rounded-lg font-semibold transition-all ${
                  isSelected
                    ? 'bg-brand-primary text-white ring-2 ring-brand-primary'
                    : isDisabled
                    ? 'bg-transparent text-gray-300 cursor-not-allowed'
                    : 'bg-brand-background text-brand-text hover:bg-brand-primary/10 ring-1 ring-brand-border'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-brand-border">
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>Lunes (cerrado)</span>
          </div>
          <p className="text-xs text-gray-600 space-y-1">
            <div>💡 Cada 30 minutos | Duración: 2 horas</div>
            <div>📅 Sábados: 9:00 AM - 7:00 PM</div>
            <div>📅 Domingos: 10:00 AM - 6:00 PM</div>
            <div>📅 Otros días: 10:00 AM - 7:00 PM</div>
          </p>
        </div>
      </div>

      {/* Selector de hora con validación */}
      {selectedDate && (
        <div ref={hourSectionRef} className="space-y-3">
          <h4 className="font-bold text-brand-text">
            Selecciona la Hora - {parseLocalDate(selectedDate).toLocaleDateString('es-ES', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </h4>
          
          <div className="text-sm text-gray-600 mb-3">
            Selecciona la hora de inicio (las clases duran 2 horas)
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {getAvailableHours(selectedDate).map(hour => {
              const isSelected = selectedTime === hour;
              
              return (
                <button
                  key={hour}
                  onClick={() => handleTimeClick(hour)}
                  disabled={checkingAvailability}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-brand-border bg-white hover:border-brand-primary hover:bg-brand-primary/5'
                  } ${checkingAvailability ? 'opacity-50' : ''}`}
                >
                  <div className="font-bold">{hour}</div>
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
                  ? `¡Disponible! ${slotAvailability.capacity.available}/${slotAvailability.capacity.max} cupos libres`
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
