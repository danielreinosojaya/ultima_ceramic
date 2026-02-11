import React, { useState, useEffect, useRef } from 'react';
import type { Piece, SelectedPiece, ExperiencePricing, TimeSlot, GroupTechnique } from '../../types';
import type { AvailableSlotResult } from '../../services/dataService';
import * as dataService from '../../services/dataService';
import { DateTimeSelector } from './DateTimeSelector';

export interface PieceExperienceWizardProps {
  pieces: Piece[];
  availableSlots?: TimeSlot[];
  onConfirm: (pricing: ExperiencePricing) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const PieceExperienceWizard: React.FC<PieceExperienceWizardProps> = ({
  pieces: initialPieces,
  availableSlots = [],
  onConfirm,
  onBack,
  isLoading = false
}) => {
  const wizardRef = useRef<HTMLDivElement>(null);
  const participantsSection = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [technique, setTechnique] = useState<GroupTechnique>('hand_modeling');
  const [participants, setParticipants] = useState<number>(2);
  const [participantsInput, setParticipantsInput] = useState<string>('2');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<AvailableSlotResult | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [pricing, setPricing] = useState<ExperiencePricing | null>(null);
  const [error, setError] = useState<string>('');
  const [loadingPricing, setLoadingPricing] = useState(false);

  const TECHNIQUE_INFO = {
    hand_modeling: {
      label: 'Modelado a Mano',
      desc: 'Crea una pieza con tus manos',
      price: 45,
      maxCapacity: 22
    },
    potters_wheel: {
      label: 'Torno Alfarero',
      desc: 'Técnica tradicional que requiere coordinación y precisión',
      price: 55,
      maxCapacity: 8
    },
    painting: {
      label: 'Pintura de Piezas',
      desc: 'Pinta piezas pre-moldeadas',
      price: 0,  // Depende de la pieza
      maxCapacity: 22
    }
  };

  // Auto-scroll to top cuando cambia el step
  useEffect(() => {
    if (wizardRef.current) {
      setTimeout(() => {
        wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [step]);

  // Calculate pricing when technique or participants change
  useEffect(() => {
    if (step === 2) {
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

  const handleNext = () => {
    if (step === 1) {
      // Validate technique selection
      setError('');
      setStep(2);
    } else if (step === 2) {
      // Validación: mínimo 2 personas para experiencias grupales
      if (participants < 2) {
        setError('❌ Las experiencias personalizadas requieren mínimo 2 personas');
        return;
      }
      // Validate painting piece selection if needed
      if (technique === 'painting' && !selectedPiece) {
        setError('Por favor selecciona una pieza para pintar');
        return;
      }
      setError('');
      setStep(3);
    } else if (step === 3) {
      setError('');
      setStep(4);
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
    if (!pricing) {
      setError('Error calculando precio');
      return;
    }
    try {
      onConfirm(pricing, technique);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar');
    }
  };

  return (
    <div ref={wizardRef} className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Paso {step} de 4</span>
          <span>{Math.round((step / 4) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Step 1: Select Technique */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">¿Qué técnica te interesa?</h3>
            <p className="text-gray-600">Elige una clase suelta de tu técnica preferida</p>
          </div>

          <div className="space-y-3">
            {(['hand_modeling', 'potters_wheel', 'painting'] as GroupTechnique[]).map((tech) => (
              <button
                key={tech}
                onClick={() => {
                  setTechnique(tech);
                  setTimeout(() => setStep(2), 300);
                }}
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

      {/* Step 2: Number of Participants & Piece Selection */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Clase Individual</h3>
            <p className="text-gray-600">Esta es una experiencia para 1 persona</p>
          </div>

          <div className="space-y-4">
            {/* Advertencia: Mínimo 2 personas */}
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">👥</span>
                <div>
                  <p className="font-semibold text-blue-900">Experiencia Personalizada para Grupos</p>
                  <p className="text-sm text-blue-700 mt-1">
                    ⚠️ <strong>Mínimo 2 personas</strong> - Esta experiencia es para grupos. Si vienes solo, elige una clase individual.
                  </p>
                </div>
              </div>
            </div>
            {/* Technique Selection (within Step 2) */}
            <div>
              <label className="block text-sm font-bold mb-3">Elige tu técnica:</label>
              <div className="space-y-3">
                {(['hand_modeling', 'potters_wheel', 'painting'] as GroupTechnique[]).map((tech) => (
                  <button
                    key={tech}
                    onClick={() => {
                      setTechnique(tech);
                      // Auto-scroll a la sección de participantes
                      setTimeout(() => {
                        participantsSection.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 100);
                    }}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      technique === tech
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-lg">{TECHNIQUE_INFO[tech].label}</div>
                        <div className="text-sm text-gray-600">{TECHNIQUE_INFO[tech].desc}</div>
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
            </div>

            {technique === 'painting' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Precio: Desde $18 por la pieza básica; en el taller puedes elegir otras piezas y pagar solo la diferencia.
              </div>
            )}
          </div>

          {/* Participants Section */}
          <div ref={participantsSection} className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <label className="block text-sm font-semibold text-brand-text mb-3">
              Número de Participantes
            </label>
            <div className="flex items-center justify-center gap-4">
              <input
                type="text"
                inputMode="numeric"
                value={participantsInput}
                onChange={(e) => {
                  const inputVal = e.target.value;
                  
                  // Permitir vacío temporalmente
                  if (inputVal === '') {
                    setParticipantsInput('');
                    return;
                  }
                  
                  // Solo aceptar números
                  if (!/^\d+$/.test(inputVal)) {
                    return;
                  }
                  
                  const val = parseInt(inputVal);
                  
                  // Mínimo 2 personas para experiencias grupales
                  if (val < 2) {
                    setParticipantsInput('2');
                    setParticipants(2);
                    return;
                  }
                  
                  // Máximo según técnica
                  const maxCap = TECHNIQUE_INFO[technique].maxCapacity;
                  
                  // Actualizar input visualmente
                  setParticipantsInput(inputVal);
                  
                  // Actualizar estado solo si es válido
                  if (val >= 2 && val <= maxCap) {
                    setParticipants(val);
                  }
                }}
                onBlur={(e) => {
                  const inputVal = e.target.value;
                  const maxCap = TECHNIQUE_INFO[technique].maxCapacity;
                  
                  // Si está vacío, inválido o excede máximo, restaurar al último válido
                  if (inputVal === '' || parseInt(inputVal) < 1 || parseInt(inputVal) > maxCap) {
                    setParticipantsInput(participants.toString());
                  } else {
                    // Asegurar que el valor mostrado coincida con el estado
                    setParticipantsInput(participants.toString());
                  }
                }}
                className={`w-20 px-4 py-3 border-2 rounded-lg text-center text-3xl font-bold transition-all ${
                  participantsInput && parseInt(participantsInput) > TECHNIQUE_INFO[technique].maxCapacity
                    ? 'border-red-500 bg-red-50 text-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-brand-border focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                }`}
              />
              <div className="text-gray-600 font-medium">persona{participants !== 1 ? 's' : ''}</div>
            </div>
            
            {/* Mensaje de error si excede máximo */}
            {participantsInput && parseInt(participantsInput) > TECHNIQUE_INFO[technique].maxCapacity && (
              <div className="mt-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-bold">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-red-900">Capacidad Excedida</p>
                    <p className="text-xs text-red-700">
                      {TECHNIQUE_INFO[technique].label} permite máximo {TECHNIQUE_INFO[technique].maxCapacity} participantes.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Mensaje informativo normal */}
            {(!participantsInput || parseInt(participantsInput) <= TECHNIQUE_INFO[technique].maxCapacity) && (
              <p className="text-xs text-blue-600 mt-3">Máximo {TECHNIQUE_INFO[technique].maxCapacity} participantes</p>
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
                    onClick={() => {
                      setSelectedPiece(piece.id);
                      setTimeout(() => setStep(3), 300);
                    }}
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

      {/* Step 3: Date & Time Selection */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">📅 Elige tu Horario</h3>
            <p className="text-gray-600">Selecciona el día y hora que prefieras</p>
          </div>

          <DateTimeSelector
            technique={technique}
            participants={participants}
            selectedSlot={selectedTimeSlot ? { date: selectedTimeSlot.date, time: selectedTimeSlot.time } : null}
            onSelectSlot={(slot) => setSelectedTimeSlot(slot)}
          />
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && pricing && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Confirma tu Clase Suelta</h3>
            <p className="text-gray-600">Revisa los detalles antes de continuar</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
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
        {step < 4 ? (
          <button
            onClick={handleNext}
            disabled={isLoading || (() => {
              // Validar participantes en Step 2
              if (step === 2) {
                const maxCap = TECHNIQUE_INFO[technique].maxCapacity;
                return participants > maxCap || participants < 1;
              }
              return false;
            })()}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

export default PieceExperienceWizard;
