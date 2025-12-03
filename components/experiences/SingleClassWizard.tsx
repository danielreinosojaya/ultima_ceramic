import React, { useState, useEffect } from 'react';
import type { GroupTechnique, TimeSlot, Piece, ExperiencePricing, AppData } from '../../types';
import * as dataService from '../../services/dataService';

export interface SingleClassWizardProps {
  pieces: Piece[];
  availableSlots?: TimeSlot[];
  appData?: AppData;
  onConfirm: (pricing: ExperiencePricing, selectedSlot: TimeSlot | null) => void;
  onBack: () => void;
  isLoading?: boolean;
}

type ClassType = 'individual' | 'group' | null;
type Step = 'class-type' | 'technique' | 'participants' | 'date' | 'confirmation';

export const SingleClassWizard: React.FC<SingleClassWizardProps> = ({
  pieces: initialPieces,
  availableSlots = [],
  appData,
  onConfirm,
  onBack,
  isLoading = false
}) => {
  const [classType, setClassType] = useState<ClassType>(null);
  const [step, setStep] = useState<Step>('class-type');
  const [technique, setTechnique] = useState<GroupTechnique>('hand_modeling');
  const [participants, setParticipants] = useState<number>(1);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [pricing, setPricing] = useState<ExperiencePricing | null>(null);
  const [error, setError] = useState<string>('');
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const TECHNIQUE_INFO = {
    hand_modeling: {
      label: '🤚 Modelado a Mano',
      desc: 'Crea con tus manos usando arcilla',
      price: 45,
      maxParticipants: 14
    },
    potters_wheel: {
      label: '🎡 Torno Alfarero',
      desc: 'Trabaja en la rueda de alfarero',
      price: 55,
      maxParticipants: 8
    },
    painting: {
      label: '🎨 Pintura de Piezas',
      desc: 'Pinta piezas pre-moldeadas',
      price: 0,  // Depende de la pieza
      maxParticipants: 30
    }
  };

  // Validate participants on technique change
  useEffect(() => {
    const maxForTechnique = TECHNIQUE_INFO[technique].maxParticipants;
    if (participants > maxForTechnique) {
      setParticipants(maxForTechnique);
    }
  }, [technique]);

  // Initialize selected date with first available date
  useEffect(() => {
    if (availableSlots.length > 0 && !selectedDate) {
      const uniqueDates = [...new Set(availableSlots.map(s => s.date))].sort();
      if (uniqueDates.length > 0) {
        setSelectedDate(uniqueDates[0]);
      }
    }
  }, [availableSlots, selectedDate]);

  // Calculate pricing when technique or participants change
  useEffect(() => {
    if (step === 'participants' || step === 'confirmation') {
      calculatePricing();
    }
  }, [technique, participants, selectedPiece, step]);

  const calculatePricing = async () => {
    setLoadingPricing(true);
    try {
      let basePricePerPerson = TECHNIQUE_INFO[technique].price;
      
      // Si es pintura, usar el precio de la pieza seleccionada
      if (technique === 'painting' && selectedPiece) {
        const piece = initialPieces.find(p => p.id === selectedPiece);
        if (piece) {
          basePricePerPerson = piece.basePrice;
        }
      }
      
      const total = basePricePerPerson * participants;
      
      setPricing({
        pieces: selectedPiece ? [{
          pieceId: selectedPiece,
          pieceName: initialPieces.find(p => p.id === selectedPiece)?.name || 'Pieza seleccionada',
          basePrice: basePricePerPerson,
          quantity: participants
        }] : [],
        guidedOption: 'none',
        subtotalPieces: total,
        total
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error calculating pricing');
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleClassTypeSelect = (type: ClassType) => {
    setClassType(type);
    if (type === 'individual') {
      setParticipants(1);
    } else {
      setParticipants(2);
    }
    setStep('technique');
    setError('');
  };

  const handleNext = () => {
    if (step === 'technique') {
      setError('');
      setStep('participants');
    } else if (step === 'participants') {
      // Validate painting piece selection if needed
      if (technique === 'painting' && !selectedPiece) {
        setError('Por favor selecciona una pieza para pintar');
        return;
      }
      setError('');
      setStep('date');
    } else if (step === 'date') {
      setError('');
      setStep('confirmation');
    }
  };

  const handleBack = () => {
    if (step === 'class-type') {
      onBack();
    } else if (step === 'technique') {
      setStep('class-type');
      setClassType(null);
    } else {
      const stepsOrder: Step[] = ['class-type', 'technique', 'participants', 'date', 'confirmation'];
      const currentIdx = stepsOrder.indexOf(step);
      if (currentIdx > 0) {
        setStep(stepsOrder[currentIdx - 1]);
      }
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

  const progressSteps: Step[] = ['class-type', 'technique', 'participants', 'date', 'confirmation'];
  const currentStepIndex = progressSteps.indexOf(step);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      {step !== 'class-type' && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Paso {currentStepIndex} de {progressSteps.length - 1}</span>
            <span>{Math.round((currentStepIndex / (progressSteps.length - 1)) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStepIndex / (progressSteps.length - 1)) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Step: Select Class Type */}
      {step === 'class-type' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">¿Qué tipo de clase prefieres?</h3>
            <p className="text-gray-600">Elige si deseas una clase para una persona o para un grupo</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleClassTypeSelect('individual')}
              className="w-full p-6 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="text-2xl font-bold mb-2">👤 Clase Individual</div>
              <p className="text-gray-600">Solo para mí - Experiencia personalizada de 1 persona</p>
            </button>

            <button
              onClick={() => handleClassTypeSelect('group')}
              className="w-full p-6 rounded-lg border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-left"
            >
              <div className="text-2xl font-bold mb-2">👥 Clase Grupal</div>
              <p className="text-gray-600">Con amigos o familia - Elige cuántas personas y la técnica</p>
            </button>
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
        </div>
      )}

      {/* Step: Select Technique */}
      {step === 'technique' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">¿Qué técnica te interesa?</h3>
            <p className="text-gray-600">
              {classType === 'individual' ? 'Elige tu técnica favorita' : 'Todos practicarán la misma técnica'}
            </p>
          </div>

          <div className="space-y-3">
            {(['hand_modeling', 'potters_wheel', 'painting'] as GroupTechnique[]).map((tech) => (
              <button
                key={tech}
                onClick={() => setTechnique(tech)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  technique === tech
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg">{TECHNIQUE_INFO[tech].label}</div>
                    <div className="text-sm text-gray-600">{TECHNIQUE_INFO[tech].desc}</div>
                    <div className="text-xs text-blue-600 mt-1">
                      Máx: {TECHNIQUE_INFO[tech].maxParticipants} {classType === 'individual' ? 'persona' : 'personas'}
                    </div>
                  </div>
                  <div className="text-right">
                    {tech === 'painting' ? (
                      <div className="text-sm text-blue-600 font-bold">Depende<br />de pieza</div>
                    ) : (
                      <div className="text-2xl font-bold text-blue-600">${TECHNIQUE_INFO[tech].price}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
        </div>
      )}

      {/* Step: Number of Participants & Piece Selection */}
      {step === 'participants' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">
              {classType === 'individual' ? 'Confirma 1 Persona' : 'Cantidad de Personas'}
            </h3>
            <p className="text-gray-600">
              {classType === 'individual' 
                ? 'Esta es una experiencia para ti' 
                : `¿Cuántas personas participarán? (Máx: ${TECHNIQUE_INFO[technique].maxParticipants})`
              }
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            {classType === 'individual' ? (
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600 mb-2">1</div>
                <div className="text-gray-600">Persona</div>
              </div>
            ) : (
              <>
                <input
                  type="range"
                  min="2"
                  max={TECHNIQUE_INFO[technique].maxParticipants}
                  value={participants}
                  onChange={(e) => setParticipants(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-center mt-4">
                  <div className="text-5xl font-bold text-blue-600 mb-2">{participants}</div>
                  <div className="text-gray-600">{participants === 1 ? 'persona' : 'personas'}</div>
                </div>
              </>
            )}
          </div>

          {/* Piece Selection for Painting */}
          {technique === 'painting' && (
            <div className="space-y-3">
              <label className="block text-sm font-bold">Elige pieza para pintar:</label>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {initialPieces.filter((p) => p.isActive).map((piece) => (
                  <button
                    key={piece.id}
                    onClick={() => setSelectedPiece(piece.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-left text-sm ${
                      selectedPiece === piece.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {piece.imageUrl && (
                      <img
                        src={piece.imageUrl}
                        alt={piece.name}
                        className="w-full h-20 object-cover rounded mb-1"
                      />
                    )}
                    <div className="font-bold">{piece.name}</div>
                    <div className="text-blue-600 font-bold">${piece.basePrice}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Preview */}
          {pricing && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex justify-between mb-2">
                <span>{TECHNIQUE_INFO[technique].label}</span>
                {technique === 'painting' && selectedPiece ? (
                  <span className="font-bold">${pricing.subtotalPieces / participants} x {participants}</span>
                ) : (
                  <span className="font-bold">${TECHNIQUE_INFO[technique].price} x {participants}</span>
                )}
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-300 text-blue-600">
                <span>Total:</span>
                <span>${pricing.total}</span>
              </div>
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
            <p className="text-gray-600">Disponible de 9 AM a 7 PM en intervalos de 30 minutos</p>
          </div>

          {availableSlots.length > 0 ? (
            <div className="space-y-6">
              {/* Calendar Month Navigation */}
              {(() => {
                const uniqueDates = [...new Set(availableSlots.map(s => s.date))].sort();
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
                    {/* Month Navigation */}
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
                      <div className="text-lg font-bold text-gray-800">
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

                    {/* Calendar Grid for Current Month */}
                    {currentMonthData ? (
                      <div>
                        <div className="grid grid-cols-7 gap-2">
                          {/* Day headers */}
                          {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => (
                            <div key={d} className="text-center text-xs font-bold text-gray-500 py-2">{d}</div>
                          ))}
                          
                          {/* Calendar grid */}
                          {(() => {
                            const dates = currentMonthData.dates;
                            const firstDate = new Date(dates[0]);
                            const firstDay = firstDate.getDay();
                            const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
                            const cells = [];
                            
                            // Empty cells before first day
                            for (let i = 0; i < adjustedFirstDay; i++) {
                              cells.push(<div key={`empty-${i}`} />);
                            }
                            
                            // Date cells
                            dates.forEach(date => {
                              const dayNum = new Date(date).getDate();
                              const isSelected = selectedDate === date;
                              
                              cells.push(
                                <button
                                  key={date}
                                  onClick={() => {
                                    setSelectedDate(date);
                                    setSelectedSlot(null);
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

              {/* Time Grid for Selected Date */}
              {selectedDate && (
                <div>
                  <div className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                    ⏰ {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  
                  {(() => {
                    // Get ONLY the actual available times for this specific date
                    const slotsForDate = availableSlots.filter(s => s.date === selectedDate);
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
                          const slotInfo = appData ? dataService.calculateSlotAvailability(selectedDate, time, appData) : null;
                          const isSelected = selectedSlot?.time === time && selectedSlot?.date === selectedDate;
                          
                          // Determinar si el slot está disponible para cualquier técnica
                          const hasAnyCapacity = slotInfo?.techniques.potters_wheel.isAvailable || 
                                               slotInfo?.techniques.hand_modeling.isAvailable ||
                                               slotInfo?.techniques.painting.isAvailable;
                          
                          return (
                            <div key={time} className="flex flex-col gap-1">
                              <button
                                onClick={() => {
                                  setSelectedSlot({
                                    date: selectedDate,
                                    time: time,
                                    instructorId: 0
                                  });
                                }}
                                disabled={!hasAnyCapacity}
                                className={`p-2 rounded-lg border-2 transition-all text-center font-bold text-xs ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-500 text-white ring-2 ring-blue-300'
                                    : hasAnyCapacity
                                    ? 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-40'
                                }`}
                              >
                                {time}
                              </button>
                              
                              {/* Mostrar cupos disponibles */}
                              {slotInfo && (
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <div className={slotInfo.techniques.potters_wheel.isAvailable ? 'text-green-600' : 'text-red-500'}>
                                    🎡 {slotInfo.techniques.potters_wheel.available}/{slotInfo.techniques.potters_wheel.total}
                                  </div>
                                  <div className={slotInfo.techniques.hand_modeling.isAvailable ? 'text-green-600' : 'text-red-500'}>
                                    🤚 {slotInfo.techniques.hand_modeling.available}/{slotInfo.techniques.hand_modeling.total}
                                  </div>
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
                🕐 {selectedSlot.time} • {new Date(selectedSlot.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
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
            <h3 className="text-2xl font-bold mb-2">Confirma tu Clase</h3>
            <p className="text-gray-600">Revisa los detalles antes de continuar</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <div className="flex justify-between pb-4 border-b">
              <span>Tipo de Clase:</span>
              <span className="font-bold">{classType === 'individual' ? 'Individual' : 'Grupal'}</span>
            </div>
            <div className="flex justify-between pb-4 border-b">
              <span>Técnica:</span>
              <span className="font-bold">{TECHNIQUE_INFO[technique].label}</span>
            </div>
            <div className="flex justify-between pb-4 border-b">
              <span>Cantidad de Personas:</span>
              <span className="font-bold">{participants}</span>
            </div>
            <div className="flex justify-between pb-4 border-b">
              <span>Precio por Persona:</span>
              {technique === 'painting' && selectedPiece ? (
                <span className="font-bold">${pricing.subtotalPieces / participants}</span>
              ) : (
                <span className="font-bold">${TECHNIQUE_INFO[technique].price}</span>
              )}
            </div>
            {selectedPiece && (
              <div className="flex justify-between pb-4 border-b">
                <span>Pieza:</span>
                <span className="font-bold">{initialPieces.find(p => p.id === selectedPiece)?.name}</span>
              </div>
            )}
            <div className="flex justify-between pb-4 border-b">
              <span>Horario:</span>
              <span className="font-bold">{selectedSlot?.date} {selectedSlot?.time}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-4 text-blue-600">
              <span>Total a Pagar:</span>
              <span>${pricing.total}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={handleBack}
          disabled={isLoading}
          className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          ← Atrás
        </button>
        {step !== 'confirmation' ? (
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Procesando...' : 'Confirmar Clase'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SingleClassWizard;
