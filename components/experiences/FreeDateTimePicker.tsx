import React, { useState } from 'react';

interface FreeDateTimePickerProps {
  selectedDate?: string | null;
  selectedTime?: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
}

export const FreeDateTimePicker: React.FC<FreeDateTimePickerProps> = ({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Generar horas disponibles de 10am a 7pm cada 30 minutos (clases duran 2h)
  const AVAILABLE_HOURS = [
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

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

  // Verificar si un día es lunes
  const isMonday = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.getDay() === 1; // 1 = Lunes
  };

  // Verificar si es fecha pasada
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
              Selecciona libremente tu día preferido (cerrado lunes) y horario de 10am a 9pm
            </p>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white border-2 border-brand-border rounded-xl p-4">
        {/* Header del mes */}
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

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Días del mes */}
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

        {/* Leyenda */}
        <div className="mt-4 pt-4 border-t border-brand-border">
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>Lunes (cerrado)</span>
          </div>
          <p className="text-xs text-gray-600">
            💡 Horarios disponibles cada 30 minutos | Duración: 2 horas | Última clase: 7:00 PM
          </p>
        </div>
      </div>

      {/* Selector de hora */}
      {selectedDate && (
        <div className="space-y-3">
          <h4 className="font-bold text-brand-text">
            Selecciona la Hora - {new Date(selectedDate).toLocaleDateString('es-ES', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </h4>
          
          <div className="text-sm text-gray-600 mb-3">
            Selecciona la hora de inicio (las clases duran 2 horas)
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {AVAILABLE_HOURS.map(hour => {
              const isSelected = selectedTime === hour;
              
              return (
                <button
                  key={hour}
                  onClick={() => onSelectTime(hour)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-brand-border bg-white hover:border-brand-primary hover:bg-brand-primary/5'
                  }`}
                >
                  <div className="font-bold">{hour}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
