import React, { useState, useEffect } from 'react';
import * as dataService from '../../services/dataService';

interface DateTimeSelectorProps {
  technique: string;              // 'potters_wheel' | 'hand_modeling' | 'painting'
  participants: number;           // Cantidad de participantes
  onSelectSlot: (slot: dataService.AvailableSlotResult) => void;
  selectedSlot?: { date: string; time: string } | null;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  technique,
  participants,
  onSelectSlot,
  selectedSlot
}) => {
  const [availableSlots, setAvailableSlots] = useState<dataService.AvailableSlotResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Cargar slots disponibles
  useEffect(() => {
    const loadSlots = async () => {
      setLoading(true);
      setError('');
      
      try {
        const slots = await dataService.getAvailableSlotsForExperience({
          technique,
          participants,
          startDate: new Date().toISOString().split('T')[0],
          daysAhead: 90
        });
        
        setAvailableSlots(slots);
        
        // Auto-seleccionar primera fecha disponible
        if (slots.length > 0 && !selectedDate) {
          setSelectedDate(slots[0].date);
        }
      } catch (err) {
        console.error('Error loading available slots:', err);
        setError('Error al cargar horarios disponibles');
      } finally {
        setLoading(false);
      }
    };

    if (technique && participants > 0) {
      loadSlots();
    }
  }, [technique, participants]);

  // Obtener fechas únicas disponibles
  const availableDates = [...new Set(availableSlots.map(s => s.date))].sort();
  
  // Obtener horarios para la fecha seleccionada
  const timesForSelectedDate = availableSlots.filter(s => s.date === selectedDate);

  // Generar días del mes actual para el calendario
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    
    // Espacios vacíos antes del primer día
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const monthDays = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  // Verificar si una fecha tiene disponibilidad
  const isDateAvailable = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return availableDates.includes(dateStr);
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
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (isDateAvailable(day)) {
      setSelectedDate(dateStr);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
        <p className="text-red-800 font-semibold">{error}</p>
      </div>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg p-6 text-center">
        <p className="text-yellow-800 font-semibold mb-2">⚠️ No hay horarios disponibles</p>
        <p className="text-sm text-yellow-700">
          Para la técnica seleccionada y {participants} participante{participants !== 1 ? 's' : ''}, 
          no hay espacios disponibles en los próximos 90 días.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-xl">📅</span>
          <div>
            <p className="font-semibold text-blue-900">Selecciona tu Horario</p>
            <p className="text-sm text-blue-700">
              Mostrando solo horarios con espacio para {participants} participante{participants !== 1 ? 's' : ''}
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
            
            const isAvailable = isDateAvailable(day);
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            
            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                disabled={!isAvailable}
                className={`aspect-square rounded-lg font-semibold transition-all ${
                  isSelected
                    ? 'bg-brand-primary text-white ring-2 ring-brand-primary'
                    : isAvailable
                    ? 'bg-green-50 text-green-700 hover:bg-green-100 ring-1 ring-green-200'
                    : 'bg-transparent text-gray-300 cursor-not-allowed'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horarios disponibles */}
      {selectedDate && timesForSelectedDate.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold text-brand-text">
            Horarios Disponibles - {new Date(selectedDate).toLocaleDateString('es-ES', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </h4>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {timesForSelectedDate.map(slot => {
              const isSelected = selectedSlot?.date === slot.date && selectedSlot?.time === slot.time;
              
              return (
                <button
                  key={`${slot.date}-${slot.time}`}
                  onClick={() => onSelectSlot(slot)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-brand-border bg-white hover:border-brand-primary hover:bg-brand-primary/5'
                  }`}
                >
                  <div className="font-bold text-lg">{slot.time}</div>
                  <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-brand-secondary'}`}>
                    {slot.instructor}
                  </div>
                  <div className={`text-xs mt-1 font-semibold ${
                    isSelected ? 'text-white' : 'text-green-600'
                  }`}>
                    ✓ {slot.available}/{slot.total} disponibles
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
