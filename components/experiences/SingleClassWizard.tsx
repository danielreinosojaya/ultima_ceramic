import React, { useState, useEffect } from 'react';
import type { GroupTechnique, TimeSlot, Piece, ExperiencePricing, AppData } from '../../types';
import * as dataService from '../../services/dataService';
import { SocialBadge } from '../SocialBadge';

export interface SingleClassWizardProps {
  pieces: Piece[];
  availableSlots?: TimeSlot[];
  appData?: AppData;
  initialTechnique?: GroupTechnique;
  onConfirm: (pricing: ExperiencePricing, selectedSlot: TimeSlot | null) => void;
  onBack: () => void;
  isLoading?: boolean;
}

type Step = 'technique' | 'date' | 'confirmation';

/**
 * SingleClassWizard - Flujo para reservar UNA SOLA CLASE
 * No permite grupos - es para 1 persona únicamente
 * Pasos: Técnica → Fecha/Hora → Confirmación
 * 
 * IMPORTANTE: Las piezas se eligen en el taller, no en la reserva.
 * Para pintura, se muestra costo mínimo de $25.
 */
export const SingleClassWizard: React.FC<SingleClassWizardProps> = ({
  pieces: initialPieces,
  availableSlots = [],
  appData,
  initialTechnique,
  onConfirm,
  onBack,
  isLoading = false
}) => {
  const participants = 1; // SIEMPRE 1 persona para Clase Suelta
  const [step, setStep] = useState<Step>('technique');
  const [technique, setTechnique] = useState<GroupTechnique>(initialTechnique || 'hand_modeling');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [pricing, setPricing] = useState<ExperiencePricing | null>(null);
  const [error, setError] = useState<string>('');
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [slotAvailabilityCache, setSlotAvailabilityCache] = useState<Record<string, any>>({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    if (initialTechnique) {
      setTechnique(initialTechnique);
    }
  }, [initialTechnique]);

  const TECHNIQUE_INFO = {
    hand_modeling: {
      label: '🤚 Modelado a Mano',
      desc: 'Crea con tus manos usando arcilla',
      price: 45
    },
    potters_wheel: {
      label: '🎡 Torno Alfarero',
      desc: 'Trabaja en la rueda de alfarero',
      price: 55
    },
    painting: {
      label: '🎨 Pintura de Piezas',
      desc: 'Pinta piezas pre-moldeadas. La pieza se elige en el taller.',
      price: 25  // Precio mínimo - las piezas se eligen en el taller
    }
  };

  // Initialize selected date with first available date
  useEffect(() => {
    if (availableSlots.length > 0 && !selectedDate) {
      const uniqueDates = [...new Set(availableSlots.map(s => s.date))].sort();
      if (uniqueDates.length > 0) {
        setSelectedDate(uniqueDates[0]);
      }
    }
  }, [availableSlots, selectedDate]);

  // Verificar disponibilidad dinámicamente cuando fecha o técnica cambian
  useEffect(() => {
    const verifySlotAvailability = async () => {
      if (!selectedDate) return;
      
      setCheckingAvailability(true);
      const slotsForDate = availableSlots.filter(s => s.date === selectedDate);
      const allTimes = [...new Set(slotsForDate.map(s => s.time))].sort();
      const cacheKey = `${selectedDate}-${technique}`;
      
      // Verificar cada horario para esta fecha
      const newCache: Record<string, any> = {};
      
      for (const time of allTimes) {
        const slotKey = `${selectedDate}-${time}`;
        try {
          const result = await dataService.checkSlotAvailability(selectedDate, time, technique, participants);
          newCache[slotKey] = {
            available: result.capacity?.available ?? 0,
            total: result.capacity?.max ?? 22,
            canBook: result.available,
            message: result.message
          };
        } catch (err) {
          console.warn(`Error checking ${slotKey}:`, err);
          newCache[slotKey] = {
            available: 0,
            total: 22,
            canBook: false,
            message: 'Error verificando disponibilidad'
          };
        }
      }
      
      setSlotAvailabilityCache(newCache);
      setCheckingAvailability(false);
    };
    
    verifySlotAvailability();
  }, [selectedDate, technique]);

  // Calculate pricing when technique changes
  useEffect(() => {
    calculatePricing();
  }, [technique]);

  const calculatePricing = async () => {
    setLoadingPricing(true);
    try {
      const basePricePerPerson = TECHNIQUE_INFO[technique].price;
      const total = basePricePerPerson * participants;
      
      setPricing({
        pieces: [],
        guidedOption: 'none',
        subtotalPieces: total,
        total
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error calculando precio');
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleNext = () => {
    if (step === 'technique') {
      setError('');
      setStep('date');
    } else if (step === 'date') {
      setError('');
      setStep('confirmation');
    }
  };

  const handleBack = () => {
    const stepOrder: Step[] = ['technique', 'date', 'confirmation'];
    const currentIdx = stepOrder.indexOf(step);
    
    // Si es el primer paso, regresar al welcome
    if (currentIdx === 0) {
      onBack();
    } else if (currentIdx > 0) {
      setStep(stepOrder[currentIdx - 1]);
    }
  };

  const handleConfirm = async () => {
    if (!pricing) {
      setError('Error calculando precio');
      return;
    }
    if (!selectedSlot) {
      setError('Por favor selecciona un horario');
      return;
    }
    try {
      onConfirm(pricing, selectedSlot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar');
    }
  };

  // Pasos: Técnica → Fecha → Confirmación (3 pasos)
  const validSteps: Step[] = ['technique', 'date', 'confirmation'];
  const currentStepIndex = validSteps.indexOf(step);
  const progressPercent = (currentStepIndex / (validSteps.length - 1)) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      {step !== 'technique' && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Paso {currentStepIndex + 1} de {validSteps.length}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-brand-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Step: Select Technique */}
      {step === 'technique' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">¿Qué técnica te interesa?</h3>
            <p className="text-gray-600">Elige la técnica que quieres practicar en tu clase</p>
            <p className="mt-2 text-sm font-semibold text-brand-primary">Solo 1 persona por reserva</p>
          </div>

          <div className="space-y-3">
            {(['hand_modeling', 'potters_wheel', 'painting'] as GroupTechnique[]).map((tech) => (
              <button
                key={tech}
                onClick={() => setTechnique(tech)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  technique === tech
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg">{TECHNIQUE_INFO[tech].label}</div>
                    <div className="text-sm text-gray-600">{TECHNIQUE_INFO[tech].desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-brand-primary">${TECHNIQUE_INFO[tech].price}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {technique === 'painting' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold mb-2">💡 Costo de la Pieza</p>
              <p>El precio mostrado ($25) es el costo mínimo de la pieza. En el taller podrás elegir entre diferentes piezas con sus respectivos precios.</p>
            </div>
          )}

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
        </div>
      )}



      {/* Step: Date & Time Selection */}
      {step === 'date' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">🕐 Elige tu Horario</h3>
            <p className="text-gray-600">Selecciona la fecha y hora de tu clase</p>
          </div>

          {availableSlots.length > 0 ? (
            <div className="space-y-6">
              {/* Calendar Month Navigation */}
              {(() => {
                const uniqueDates = [...new Set(availableSlots.map(s => s.date))].sort();
                const allMonths: { key: string; dates: string[]; date: Date }[] = [];
                
                // Helper para parsear fechas en zona horaria local, no UTC
                const parseLocalDate = (dateStr: string): Date => {
                  const [year, month, day] = dateStr.split('-').map(Number);
                  return new Date(year, month - 1, day);
                };
                
                const groupedByMonth: Record<string, string[]> = {};
                uniqueDates.forEach(date => {
                  const d = parseLocalDate(date);
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
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-5">
                      <button
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCurrentMonth(newDate);
                        }}
                        disabled={!canGoPrev}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-brand-primary disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ←
                      </button>
                      <h3 className="text-xl font-bold text-brand-text capitalize">
                        {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCurrentMonth(newDate);
                        }}
                        disabled={!canGoNext}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-brand-primary disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        →
                      </button>
                    </div>

                    {/* Calendar Grid for Current Month */}
                    {currentMonthData ? (
                      <div>
                        <div className="grid grid-cols-7 gap-1.5 mb-3">
                          {/* Day headers */}
                          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                            <div key={d} className="text-center text-xs font-bold text-gray-500 py-1">{d}</div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1.5">
                          {/* Calendar grid */}
                          {(() => {
                            const parseLocalDate = (dateStr: string): Date => {
                              const [year, month, day] = dateStr.split('-').map(Number);
                              return new Date(year, month - 1, day);
                            };
                            
                            const dates = currentMonthData.dates;
                            // Calculate firstDay based on the 1st of the month, NOT the first available date
                            const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                            const firstDay = firstDayOfMonth.getDay();
                            const availableDatesSet = new Set(dates);
                            const cells = [];
                            
                            // Empty cells before first day of month
                            for (let i = 0; i < firstDay; i++) {
                              cells.push(<div key={`empty-${i}`} />);
                            }
                            
                            // All days in month grid
                            const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                            for (let day = 1; day <= daysInMonth; day++) {
                              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const isAvailable = availableDatesSet.has(dateStr);
                              const isSelected = selectedDate === dateStr;
                              
                              cells.push(
                                <button
                                  key={day}
                                  onClick={() => {
                                    if (isAvailable) {
                                      setSelectedDate(dateStr);
                                      setSelectedSlot(null);
                                    }
                                  }}
                                  disabled={!isAvailable}
                                  className={`aspect-square rounded-xl font-semibold text-sm transition-all ${
                                    isSelected && isAvailable
                                      ? 'bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-lg scale-105'
                                      : !isAvailable
                                      ? 'bg-transparent text-gray-300 cursor-not-allowed'
                                      : 'bg-gray-50 text-brand-text hover:bg-brand-primary/10 hover:scale-105 border border-transparent hover:border-brand-primary/20'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            }
                            
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

              {/* Time Grid for Selected Date */}
              {selectedDate && (
                <div>
                  <div className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                    ⏰ {(() => {
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                    })()}
                  </div>
                  
                  {(() => {
                    const slotsForDate = availableSlots.filter(s => s.date === selectedDate);
                    const allTimes = [...new Set(slotsForDate.map(s => s.time))].sort();

                    if (allTimes.length === 0) {
                      return (
                        <div className="text-center py-6 bg-gray-50 rounded-lg">
                          <p className="text-gray-600">No hay horarios disponibles para este día</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                        {allTimes.map(time => {
                          const slotKey = `${selectedDate}-${time}`;
                          const slotInfo = slotAvailabilityCache[slotKey];
                          const isSelected = selectedSlot?.time === time && selectedSlot?.date === selectedDate;
                          
                          // Usar valores del cache de verificación dinámica
                          const available = slotInfo?.available ?? 22;
                          const total = slotInfo?.total ?? 22;
                          const canBook = slotInfo?.canBook ?? (available > 0);
                          
                          return (
                            <button
                              key={time}
                              onClick={() => {
                                if (canBook) {
                                  setSelectedSlot({
                                    date: selectedDate,
                                    time: time,
                                    instructorId: 0
                                  });
                                }
                              }}
                              disabled={!canBook}
                              title={canBook ? 'Disponible' : 'Sin cupos'}
                              className={`relative p-3.5 rounded-xl border-2 font-bold text-sm transition-all ${
                                isSelected
                                  ? 'border-brand-primary bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-lg scale-105'
                                  : canBook
                                  ? 'border-gray-200 bg-white text-gray-700 hover:border-brand-primary hover:bg-brand-primary/5 hover:scale-105'
                                  : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span>{time}</span>
                                {canBook && (
                                  <SocialBadge 
                                    currentCount={total - available}
                                    maxCapacity={total}
                                    variant="compact"
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-gray-600">No hay horarios disponibles</p>
            </div>
          )}

          {/* Selected Time Display */}
          {selectedSlot && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-400">
              <div className="text-xs font-bold text-green-700 uppercase">✓ Horario Confirmado</div>
              <div className="text-xl font-bold text-gray-800 mt-2">
                🕐 {selectedSlot.time} • {(() => {
                  const [year, month, day] = selectedSlot.date.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                })()}
              </div>
              <div className="text-xs text-gray-600 mt-1">Duración: 2 horas</div>
            </div>
          )}

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border-l-4 border-red-500">{error}</div>}
        </div>
      )}

      {/* Step: Confirmation */}
      {step === 'confirmation' && pricing && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">✓ Confirma tu Clase Suelta</h3>
            <p className="text-gray-600">Revisa los detalles de tu reserva</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <div className="flex justify-between pb-4 border-b">
              <span className="text-gray-600">Técnica:</span>
              <span className="font-bold">{TECHNIQUE_INFO[technique].label}</span>
            </div>

            <div className="flex justify-between pb-4 border-b">
              <span className="text-gray-600">Cantidad de Personas:</span>
              <span className="font-bold">1 (Clase Suelta)</span>
            </div>

            <div className="flex justify-between pb-4 border-b">
              <span className="text-gray-600">Precio:</span>
              <span className="font-bold">${TECHNIQUE_INFO[technique].price}</span>
            </div>

            {technique === 'painting' && (
              <div className="flex justify-between pb-4 border-b text-sm text-amber-700 bg-amber-50 p-3 rounded">
                <span>Nota:</span>
                <span className="text-right">La pieza final se elige en el taller</span>
              </div>
            )}

            <div className="flex justify-between pb-4 border-b">
              <span className="text-gray-600">Horario:</span>
              <span className="font-bold">{selectedSlot?.time} • {new Date(selectedSlot?.date || '').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>

            <div className="flex justify-between text-lg font-bold pt-4 text-blue-600">
              <span>Total a Pagar:</span>
              <span className="text-2xl">${pricing.total}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={handleBack}
          disabled={isLoading}
          className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors"
        >
          ← Atrás
        </button>
        {step !== 'confirmation' ? (
          <button
            onClick={handleNext}
            disabled={isLoading || (step === 'date' && !selectedSlot)}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={isLoading || !selectedSlot}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
          >
            {isLoading ? 'Procesando...' : 'Confirmar Clase'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SingleClassWizard;
