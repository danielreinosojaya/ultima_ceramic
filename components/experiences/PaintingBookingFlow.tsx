import React, { useEffect, useMemo, useState } from 'react';
import type { ExperiencePricing, TimeSlot } from '../../types';
import * as dataService from '../../services/dataService';

interface PaintingBookingFlowProps {
  availableSlots: TimeSlot[];
  onConfirm: (pricing: ExperiencePricing, selectedSlot: TimeSlot) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const PaintingBookingFlow: React.FC<PaintingBookingFlowProps> = ({
  availableSlots,
  onConfirm,
  onBack,
  isLoading = false
}) => {
  const [participants, setParticipants] = useState<number>(1);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [error, setError] = useState<string>('');
  const [slots, setSlots] = useState<dataService.AvailableSlotResult[]>(availableSlots as any);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  const MIN_PAINTING_PRICE = 18;

  const pricing = useMemo<ExperiencePricing | null>(() => {
    const subtotal = MIN_PAINTING_PRICE * participants;
    return {
      pieces: [],
      guidedOption: 'none',
      subtotalPieces: subtotal,
      total: subtotal
    };
  }, [participants]);

  const hasAnyAvailability = (date: string) => {
    return slots.some(slot => slot.date === date);
  };

  useEffect(() => {
    setSelectedSlot(null);
  }, [participants, selectedDate]);

  useEffect(() => {
    let isActive = true;

    const loadSlots = async () => {
      try {
        setIsLoadingSlots(true);
        const result = await dataService.getAvailableSlotsForExperience({
          technique: 'painting',
          participants,
          daysAhead: 180
        });
        if (isActive) {
          setSlots(result);
        }
      } catch (err) {
        if (isActive) {
          console.error('[PaintingBookingFlow] Error loading slots:', err);
          setSlots([]);
        }
      } finally {
        if (isActive) {
          setIsLoadingSlots(false);
        }
      }
    };

    loadSlots();

    return () => {
      isActive = false;
    };
  }, [participants]);

  useEffect(() => {
    if (!selectedDate && slots.length > 0) {
      const uniqueDates = [...new Set(slots.map(s => s.date))].sort();
      const firstDate = uniqueDates.find(date => hasAnyAvailability(date));
      if (firstDate) setSelectedDate(firstDate);
    }
  }, [slots, selectedDate]);

  const handleConfirm = () => {
    if (!selectedSlot) {
      setError('Por favor selecciona un horario disponible');
      return;
    }
    if (!pricing) {
      setError('Error al calcular el precio');
      return;
    }

    setError('');
    onConfirm(pricing, selectedSlot);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-brand-text">🎨 Reserva tu clase de Pintado a Mano</h2>
        <p className="text-brand-secondary mt-1">Selecciona participantes y horario disponible.</p>
      </div>

      <div className="grid gap-6">
        <div className="bg-white border border-brand-border rounded-xl p-4">
          <h3 className="font-semibold text-brand-text mb-3">Participantes</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setParticipants(prev => Math.max(1, prev - 1))}
              className="w-10 h-10 rounded-lg border border-brand-border text-lg font-bold text-brand-text hover:bg-brand-background"
              aria-label="Disminuir participantes"
            >
              −
            </button>
            <div className="text-lg font-bold text-brand-text min-w-[32px] text-center">{participants}</div>
            <button
              type="button"
              onClick={() => setParticipants(prev => Math.min(22, prev + 1))}
              className="w-10 h-10 rounded-lg border border-brand-border text-lg font-bold text-brand-text hover:bg-brand-background"
              aria-label="Aumentar participantes"
            >
              +
            </button>
            <span className="text-sm text-brand-secondary">Máximo 22 personas</span>
          </div>
        </div>

        <div className="bg-white border border-brand-border rounded-xl p-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-brand-text">Selecciona tu Horario</h3>
            <p className="text-sm text-brand-secondary">Mostrando solo horarios con espacio para {participants} participante{participants !== 1 ? 's' : ''}</p>
          </div>

          {slots.length > 0 ? (
            <div className="space-y-6">
              {(() => {
                const uniqueDates = [...new Set(slots.map(s => s.date))].sort();
                const allMonths: { key: string; dates: string[]; date: Date }[] = [];

                const groupedByMonth: Record<string, string[]> = {};
                uniqueDates.forEach(date => {
                  const d = new Date(date);
                  const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
                  groupedByMonth[monthKey].push(date);
                });

                Object.entries(groupedByMonth).forEach(([monthKey, dates]) => {
                  const [year, month] = monthKey.split('-').map(Number);
                  allMonths.push({
                    key: monthKey,
                    dates,
                    date: new Date(year, month - 1, 1)
                  });
                });

                const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
                const currentMonthData = allMonths.find(m => m.key === currentMonthKey);
                const canGoPrev = currentMonth > new Date();
                const canGoNext = allMonths.some(m => m.date > currentMonth);

                return (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCurrentMonth(newDate);
                        }}
                        disabled={!canGoPrev}
                        className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        ← Anterior
                      </button>
                      <div className="text-lg font-bold text-gray-800 capitalize">
                        {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                      </div>
                      <button
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCurrentMonth(newDate);
                        }}
                        disabled={!canGoNext}
                        className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Siguiente →
                      </button>
                    </div>

                    {currentMonthData ? (
                      <div>
                        <div className="grid grid-cols-7 gap-2">
                          {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => (
                            <div key={d} className="text-center text-xs font-bold text-gray-500 py-2">{d}</div>
                          ))}

                          {(() => {
                            const dates = currentMonthData.dates.filter(date => hasAnyAvailability(date));
                            if (dates.length === 0) {
                              return (
                                <div className="col-span-7 text-center py-6 bg-gray-50 rounded-lg">
                                  <p className="text-gray-600">No hay fechas disponibles este mes</p>
                                </div>
                              );
                            }

                            const firstDate = new Date(dates[0]);
                            const firstDay = firstDate.getDay();
                            const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
                            const cells: React.ReactNode[] = [];

                            for (let i = 0; i < adjustedFirstDay; i++) {
                              cells.push(<div key={`empty-${i}`} />);
                            }

                            dates.forEach(date => {
                              const dayNum = new Date(date).getDate();
                              const isSelected = selectedDate === date;

                              cells.push(
                                <button
                                  key={date}
                                  onClick={() => {
                                    setSelectedDate(date);
                                    setSelectedSlot(null);
                                    setError('');
                                  }}
                                  className={`p-2 rounded-lg border-2 transition-all text-center font-bold text-sm ${
                                    isSelected
                                      ? 'border-blue-500 bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                                  }`}
                                >
                                  {dayNum}
                                </button>
                              );
                            });

                            return cells;
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">No hay fechas disponibles este mes</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedDate && (
                <div>
                  <div className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                    ⏰ {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>

                  {(() => {
                    const slotsForDate = slots.filter(s => s.date === selectedDate);
                    const availableTimes = [...new Set(slotsForDate.map(s => s.time))].sort();

                    if (availableTimes.length === 0) {
                      return (
                        <div className="text-center py-6 bg-gray-50 rounded-lg">
                          <p className="text-gray-600">No hay horarios disponibles para este día</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2 bg-gray-50 rounded-lg">
                        {availableTimes.map(time => {
                          const slotInfo = slotsForDate.find(s => s.time === time) || null;
                          const isSelected = selectedSlot?.time === time && selectedSlot?.date === selectedDate;
                          const hasCapacity = slotInfo ? slotInfo.available >= participants : true;

                          return (
                            <div key={time} className="flex flex-col gap-1">
                              <button
                                onClick={() => {
                                  setSelectedSlot({
                                    date: selectedDate,
                                    time,
                                    instructorId: 0
                                  });
                                  setError('');
                                }}
                                disabled={!hasCapacity}
                                className={`p-2 rounded-lg border-2 transition-all text-center font-bold text-xs ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-500 text-white ring-2 ring-blue-300'
                                    : hasCapacity
                                    ? 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-40'
                                }`}
                              >
                                {time}
                              </button>

                              {slotInfo && (
                                <div className={`text-[11px] text-center ${hasCapacity ? 'text-green-600' : 'text-red-500'}`}>
                                  🎨 {slotInfo.available}/{slotInfo.total}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-gray-600">{isLoadingSlots ? 'Cargando horarios...' : 'No hay horarios disponibles'}</p>
            </div>
          )}
        </div>

        {pricing && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex justify-between text-sm text-brand-secondary">
              <span>Precio mínimo por persona</span>
              <span>${MIN_PAINTING_PRICE} x {participants}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-brand-text mt-2">
              <span>Total</span>
              <span>${pricing.total}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-3 rounded-lg border border-brand-border text-brand-text hover:bg-brand-background"
          >
            ← Atrás
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-6 py-3 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-60"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
};
