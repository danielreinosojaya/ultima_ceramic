import React, { useState, useEffect } from 'react';
import type { GroupClassConfig, TimeSlot, ParticipantTechniqueAssignment, GroupTechnique, Piece, AppData } from '../../types';
import { GROUP_CLASS_CAPACITY } from '../../types';
import * as dataService from '../../services/dataService';

export interface GroupClassWizardProps {
  config: GroupClassConfig;
  availableSlots: TimeSlot[];
  pieces: Piece[];
  appData?: AppData;
  onConfirm: (totalParticipants: number, assignments: ParticipantTechniqueAssignment[], selectedSlot: TimeSlot) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const GroupClassWizard: React.FC<GroupClassWizardProps> = ({
  config,
  availableSlots,
  pieces,
  appData,
  onConfirm,
  onBack,
  isLoading = false
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [totalParticipants, setTotalParticipants] = useState<number>(2);
  const [participantAssignments, setParticipantAssignments] = useState<ParticipantTechniqueAssignment[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Initialize participant assignments when total changes
  useEffect(() => {
    const newAssignments: ParticipantTechniqueAssignment[] = Array.from(
      { length: totalParticipants },
      (_, idx) => ({
        participantNumber: idx + 1,
        technique: 'hand_modeling'
      })
    );
    setParticipantAssignments(newAssignments);
  }, [totalParticipants]);

  // Initialize selected date with first available date
  useEffect(() => {
    if (availableSlots.length > 0 && !selectedDate) {
      const uniqueDates = [...new Set(availableSlots.map(s => s.date))].sort();
      if (uniqueDates.length > 0) {
        setSelectedDate(uniqueDates[0]);
      }
    }
  }, [availableSlots, selectedDate]);

  const handleUpdateTechnique = (participantNumber: number, technique: GroupTechnique) => {
    setParticipantAssignments(prev =>
      prev.map(a =>
        a.participantNumber === participantNumber
          ? { ...a, technique, selectedPieceId: undefined }
          : a
      )
    );
  };

  const handleUpdatePiece = (participantNumber: number, pieceId: string) => {
    setParticipantAssignments(prev =>
      prev.map(a =>
        a.participantNumber === participantNumber
          ? { ...a, selectedPieceId: pieceId }
          : a
      )
    );
  };

  // Preset distributions
  const applyPreset = (preset: 'balanced' | 'all_modeling' | 'all_wheel' | 'half_wheel') => {
    let newAssignments: ParticipantTechniqueAssignment[] = [];
    
    switch (preset) {
      case 'balanced':
        // Distribuir: 8 torno, 14 modelado, resto pintura
        const wheelCount = Math.min(8, totalParticipants);
        const modelingCount = Math.min(14, totalParticipants - wheelCount);
        const paintingCount = totalParticipants - wheelCount - modelingCount;
        
        newAssignments = Array.from({ length: totalParticipants }, (_, i) => ({
          participantNumber: i + 1,
          technique: i < wheelCount ? 'potters_wheel' : i < wheelCount + modelingCount ? 'hand_modeling' : 'painting'
        }));
        break;
        
      case 'all_modeling':
        newAssignments = participantAssignments.map(a => ({ ...a, technique: 'hand_modeling' as GroupTechnique }));
        break;
        
      case 'all_wheel':
        newAssignments = participantAssignments.map(a => ({ ...a, technique: 'potters_wheel' as GroupTechnique }));
        break;
        
      case 'half_wheel':
        // Mitad torno, mitad modelado
        const halfWheelCount = Math.ceil(totalParticipants / 2);
        newAssignments = Array.from({ length: totalParticipants }, (_, i) => ({
          participantNumber: i + 1,
          technique: i < halfWheelCount ? 'potters_wheel' : 'hand_modeling'
        }));
        break;
    }
    
    setParticipantAssignments(newAssignments);
  };

  const handleNext = () => {
    if (step === 1) {
      // Validación estricta: debe ser mínimo 2 personas para experiencias grupales
      if (totalParticipants < 2) {
        setError('❌ Las experiencias grupales requieren mínimo 2 personas');
        return;
      }
      if (totalParticipants < config.minParticipants || totalParticipants > config.maxParticipants) {
        setError(`El grupo debe tener entre ${config.minParticipants} y ${config.maxParticipants} personas`);
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      // Validate that all painters have selected a piece
      const needsPiece = participantAssignments.filter(a => a.technique === 'painting');
      const missingPiece = needsPiece.some(a => !a.selectedPieceId);
      if (missingPiece) {
        setError('Todas las personas que vayan a pintar deben seleccionar una pieza');
        return;
      }
      
      // Validate technique capacities
      const capacityError = validateCapacities();
      if (capacityError) {
        setError(`Límite excedido: ${capacityError}`);
        return;
      }
      
      setError('');
      setStep(3);
    } else if (step === 3) {
      // Details step - just move forward (no validation needed)
      setError('');
      setStep(4);
    } else if (step === 4) {
      // Slot selection step - validate that a slot is selected
      if (!selectedSlot) {
        setError('Por favor selecciona un horario');
        return;
      }
      setError('');
      setStep(5);
    } else if (step === 5) {
      setError('');
      // Step 5 is confirmation - no "next" button, only "confirm"
    }
  };

  const handleBack = () => {
    if (step === 1) {
      onBack();
    } else {
      setStep((prev) => (prev > 1 ? (prev - 1) as any : 1) as any);
    }
  };

  const handleConfirm = async () => {
    if (!selectedSlot) {
      setError('Por favor selecciona un horario');
      return;
    }
    setLoading(true);
    try {
      onConfirm(totalParticipants, participantAssignments, selectedSlot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar reserva');
    } finally {
      setLoading(false);
    }
  };

  const pricePerPerson = config.pricePerPerson || 15;
  const totalPrice = pricePerPerson * totalParticipants;

  const getTechniqueLabel = (technique: GroupTechnique): string => {
    const labels: Record<GroupTechnique, string> = {
      hand_modeling: '🤚 Modelado a Mano',
      potters_wheel: '🎡 Torno Alfarero',
      painting: '🎨 Pintura de Piezas'
    };
    return labels[technique];
  };

  const validateCapacities = (): string => {
    const techniqueCounts = participantAssignments.reduce((acc, a) => {
      acc[a.technique] = (acc[a.technique] || 0) + 1;
      return acc;
    }, {} as Record<GroupTechnique, number>);

    for (const [technique, count] of Object.entries(techniqueCounts)) {
      const limit = GROUP_CLASS_CAPACITY[technique as GroupTechnique];
      if (count > limit) {
        const techLabel = getTechniqueLabel(technique as GroupTechnique);
        return `${techLabel}: máximo ${limit} personas (tienes ${count})`;
      }
    }
    return '';
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Paso {step} de 5</span>
          <span>{Math.round((step / 5) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Step 1: Total Participants */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">¿Cuántas personas?</h3>
            <p className="text-gray-600">Entre {config.minParticipants} y {config.maxParticipants} personas</p>
          </div>

          {/* Advertencia: Mínimo 2 personas */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">👥</span>
              <div>
                <p className="font-semibold text-blue-900">Experiencia Grupal</p>
                <p className="text-sm text-blue-700 mt-1">
                  ⚠️ <strong>Mínimo 2 personas</strong> - Las experiencias grupales no pueden realizarse con 1 persona. Si vienes solo, elige una experiencia individual.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <input
              type="range"
              min={config.minParticipants}
              max={config.maxParticipants}
              value={totalParticipants}
              onChange={(e) => setTotalParticipants(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-center mt-4">
              <div className="text-5xl font-bold text-blue-600 mb-2">{totalParticipants}</div>
              <div className="text-gray-600">{totalParticipants === 1 ? 'persona' : 'personas'}</div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span>Precio por persona:</span>
              <span className="font-bold">${pricePerPerson}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total (aproximado):</span>
              <span className="text-blue-600">${totalPrice}</span>
            </div>
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-300">{error}</div>}
        </div>
      )}

      {/* Step 2: Assign Techniques & Pieces */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Asigna técnica a cada persona</h3>
            <p className="text-gray-600">Elige un preset o personaliza manualmente</p>
          </div>

          {/* Quick Presets */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-blue-900">⚡ Distribuciones Rápidas:</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => applyPreset('balanced')}
                className="bg-white p-3 rounded-lg border border-blue-300 hover:bg-blue-50 text-sm font-medium text-left transition-colors"
              >
                <div className="font-bold">Balanceado</div>
                <div className="text-xs text-gray-600">8 Torno • 14 Modelado • Pintura</div>
              </button>
              <button
                onClick={() => applyPreset('half_wheel')}
                className="bg-white p-3 rounded-lg border border-blue-300 hover:bg-blue-50 text-sm font-medium text-left transition-colors"
              >
                <div className="font-bold">Mitad & Mitad</div>
                <div className="text-xs text-gray-600">50% Torno • 50% Modelado</div>
              </button>
              <button
                onClick={() => applyPreset('all_modeling')}
                className="bg-white p-3 rounded-lg border border-blue-300 hover:bg-blue-50 text-sm font-medium text-left transition-colors"
              >
                <div className="font-bold">Todo Modelado</div>
                <div className="text-xs text-gray-600">Todos usan las manos</div>
              </button>
              <button
                onClick={() => applyPreset('all_wheel')}
                className="bg-white p-3 rounded-lg border border-blue-300 hover:bg-blue-50 text-sm font-medium text-left transition-colors"
              >
                <div className="font-bold">Todo Torno</div>
                <div className="text-xs text-gray-600">Todos usan la rueda</div>
              </button>
            </div>
          </div>

          {/* Capacity Summary */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-amber-900 mb-2">Cupos utilizados:</h4>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {Object.entries(GROUP_CLASS_CAPACITY).map(([tech, limit]) => {
                const count = participantAssignments.filter(a => a.technique === tech as GroupTechnique).length;
                const isFull = count >= limit && limit !== Infinity;
                const isOver = count > limit && limit !== Infinity;
                
                return (
                  <div key={tech} className={`p-2 rounded ${isOver ? 'bg-red-100 border border-red-300' : isFull ? 'bg-yellow-100 border border-yellow-300' : 'bg-green-100 border border-green-300'}`}>
                    <div className="font-medium text-sm">{getTechniqueLabel(tech as GroupTechnique)}</div>
                    <div className={`text-lg font-bold ${isOver ? 'text-red-700' : isFull ? 'text-yellow-700' : 'text-green-700'}`}>
                      {count}/{limit === Infinity ? '∞' : limit}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen Tabla */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Persona</th>
                    <th className="px-4 py-2 text-left font-semibold">Técnica</th>
                    <th className="px-4 py-2 text-left font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {participantAssignments.map((assignment) => (
                    <tr key={assignment.participantNumber} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">#{assignment.participantNumber}</td>
                      <td className="px-4 py-3">
                        <select
                          value={assignment.technique}
                          onChange={(e) => handleUpdateTechnique(assignment.participantNumber, e.target.value as GroupTechnique)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="hand_modeling">🤚 Modelado a Mano</option>
                          <option value="potters_wheel">🎡 Torno Alfarero</option>
                          <option value="painting">🎨 Pintura de Piezas</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {assignment.technique === 'painting' && (
                          <select
                            value={assignment.selectedPieceId || ''}
                            onChange={(e) => handleUpdatePiece(assignment.participantNumber, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-xs bg-yellow-50"
                          >
                            <option value="">Elige pieza...</option>
                            {pieces.map((piece) => (
                              <option key={piece.id} value={piece.id}>
                                {piece.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
        </div>
      )}

      {/* Step 3: Class Details */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Detalles de la Clase</h3>
            <p className="text-gray-600">Información sobre tu experiencia grupal</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Duración Estimada</label>
              <p className="text-gray-600">{config.estimatedDuration} minutos</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Grupo Confirmado</label>
              <p className="text-gray-600">{totalParticipants} {totalParticipants === 1 ? 'persona' : 'personas'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Resumen de Técnicas</label>
              <div className="space-y-1">
                {Object.entries(
                  participantAssignments.reduce((acc, a) => {
                    acc[a.technique] = (acc[a.technique] || 0) + 1;
                    return acc;
                  }, {} as Record<GroupTechnique, number>)
                ).map(([tech, count]) => (
                  <p key={tech} className="text-gray-600">
                    {getTechniqueLabel(tech as GroupTechnique)}: {count} {count === 1 ? 'persona' : 'personas'}
                  </p>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Precio Total</label>
              <p className="text-2xl font-bold text-blue-600">${totalPrice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Select Slot */}
      {step === 4 && (
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

      {/* Step 5: Confirmation */}
      {step === 5 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Confirma tu Reserva</h3>
            <p className="text-gray-600">Revisa los detalles antes de continuar</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <div className="flex justify-between pb-4 border-b">
              <span>Tipo de Clase:</span>
              <span className="font-bold">Grupal</span>
            </div>
            <div className="flex justify-between pb-4 border-b">
              <span>Cantidad de Personas:</span>
              <span className="font-bold">{totalParticipants}</span>
            </div>
            <div className="pb-4 border-b">
              <span className="block text-sm font-medium mb-2">Asignaciones:</span>
              <div className="space-y-1">
                {participantAssignments.map((a) => (
                  <div key={a.participantNumber} className="text-sm text-gray-600">
                    Persona {a.participantNumber}: {getTechniqueLabel(a.technique)}
                    {a.selectedPieceId && ` - Pieza: ${pieces.find(p => p.id === a.selectedPieceId)?.name}`}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between pb-4 border-b">
              <span>Fecha y Hora:</span>
              <span className="font-bold">{selectedSlot?.date} {selectedSlot?.time}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-4 text-blue-600">
              <span>Total a Pagar:</span>
              <span>${totalPrice}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={handleBack}
          disabled={loading || isLoading}
          className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          ← Atrás
        </button>
        {step < 5 ? (
          <button
            onClick={handleNext}
            disabled={loading || isLoading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={loading || isLoading}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading || isLoading ? 'Procesando...' : 'Confirmar Reserva'}
          </button>
        )}
      </div>
    </div>
  );
};

export default GroupClassWizard;