import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { 
  CustomExperienceType, 
  CustomExperienceWizardState,
  GroupTechnique,
  CeramicOnlyConfig,
  CelebrationConfig,
  CustomExperienceTimeSlot,
  CustomExperiencePricing,
  MenuItem,
  MenuSelection,
  ChildPieceSelection,
  Piece,
  UserInfo,
  CustomExperienceBooking
} from '../../types';
import { SPACE_HOURLY_PRICING, CUSTOM_EXPERIENCE_TECHNIQUES as TECHNIQUES, TECHNIQUE_PRICES } from '../../types';
import { InfoCircleIcon } from '../icons/InfoCircleIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { FreeDateTimePicker } from './FreeDateTimePicker';
import type { AvailableSlotResult, SlotAvailabilityResult } from '../../services/dataService';
import { UserInfoModal } from '../UserInfoModal';
import { parseLocalDate } from '../../utils/formatters';

interface CustomExperienceWizardProps {
  pieces: Piece[];
  onConfirm: (booking: CustomExperienceBooking) => void;
  onBack: () => void;
  onGoToIndividualClasses?: () => void;
  onGoToPackages?: () => void;
  isLoading?: boolean;
  onShowPolicies: () => void;
}

// ============ SUB-COMPONENTS ============

/**
 * Progress Indicator - Clase mundial con animaciones
 */
const ProgressIndicator: React.FC<{ currentStep: number; totalSteps: number; stepTitles: string[] }> = ({
  currentStep,
  totalSteps,
  stepTitles,
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {stepTitles.map((title, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-primary text-white scale-110 shadow-lg'
                      : isCompleted
                      ? 'bg-brand-success text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted ? '✓' : stepNum}
                </div>
                <p
                  className={`mt-2 text-xs text-center font-medium transition-colors duration-300 hidden sm:block ${
                    isActive ? 'text-brand-primary' : isCompleted ? 'text-brand-success' : 'text-gray-400'
                  }`}
                >
                  {title}
                </p>
              </div>
              {idx < totalSteps - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 rounded-full transition-all duration-500 ${
                    isCompleted ? 'bg-brand-success' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Tooltip Component - Info contextual con posicionamiento inteligente y responsive
 */
const Tooltip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<'above' | 'below'>('above');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    if (!show) {
      // Detectar posición disponible
      setTimeout(() => {
        if (tooltipRef.current && buttonRef.current) {
          const buttonRect = buttonRef.current.getBoundingClientRect();
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const spaceAbove = buttonRect.top;
          const spaceBelow = window.innerHeight - buttonRect.bottom;

          // Mobile: preferir debajo, Desktop: preferir arriba
          const isMobile = window.innerWidth < 768;
          if (isMobile) {
            setPosition(spaceBelow > 150 ? 'below' : 'above');
          } else {
            setPosition(spaceAbove > 150 ? 'above' : 'below');
          }
        }
      }, 0);
    }
    setShow(!show);
  };

  return (
    <div className="relative inline-block ml-2">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={handleToggle}
        className="text-brand-primary hover:text-brand-accent transition-colors flex-shrink-0"
      >
        <InfoCircleIcon className="w-5 h-5" />
      </button>
      {show && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 max-w-[90vw] sm:max-w-sm p-3 bg-brand-text text-white text-xs rounded-lg shadow-2xl animate-fade-in-fast ${
            position === 'above' ? '-top-2 -translate-y-full' : 'top-full mt-2'
          } left-1/2 -translate-x-1/2`}
          onClick={() => setShow(false)}
        >
          {/* Puntero dinámico */}
          <div
            className={`absolute w-2 h-2 bg-brand-text transform rotate-45 left-1/2 -translate-x-1/2 ${
              position === 'above' ? '-bottom-1' : '-top-1'
            }`}
          ></div>
          {text}
        </div>
      )}
    </div>
  );
};

/**
 * Main Wizard Component
 */
export const CustomExperienceWizard: React.FC<CustomExperienceWizardProps> = ({
  pieces,
  onConfirm,
  onBack,
  onGoToIndividualClasses,
  onGoToPackages,
  isLoading = false,
  onShowPolicies,
}) => {
  // ============ REFS ============
  const participantsRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);

  // ============ STATE ============
  const [state, setState] = useState<CustomExperienceWizardState>({
    experienceType: null,
    technique: null,
    config: null,
    menuItems: [],
    selectedTimeSlot: null,
    pricing: null,
    currentStep: 1,
    isLoading: false,
    error: null,
  });

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [participantsInput, setParticipantsInput] = useState<string>('2');
  
  // Nuevo estado para fecha/hora con validación de disponibilidad
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailabilityResult | null>(null);

  // Steps configuration
  const STEP_TITLES = ['Tipo', 'Configurar', 'Fecha', 'Datos', 'Confirmar'];

  // ============ AUTO SCROLL EFFECT ============
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [state.currentStep]);

  // ============ STEP 1: Tipo de Actividad ============
  const renderStepActivityType = () => {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-text mb-3">
            ¿Qué tipo de experiencia buscas?
          </h2>
          <p className="text-brand-secondary text-sm sm:text-base">
            Elige entre una actividad de cerámica o una celebración completa
          </p>
        </div>

        {/* Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Solo Cerámica */}
          <button
            onClick={() => {
              setState((prev) => ({ 
                ...prev, 
                experienceType: 'ceramic_only',
                config: { participants: 2 } // Inicializar con mínimo 2 personas
              }));
              handleNext();
            }}
            className="group bg-white border-2 border-brand-border rounded-2xl p-6 sm:p-8 hover:border-brand-primary hover:shadow-lifted transition-all duration-300 text-left active:scale-[0.98]"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="text-5xl">🎨</div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-brand-text mb-2">
                  Solo Cerámica
                </h3>
                <p className="text-sm text-brand-secondary">
                  Actividad de cerámica pura. Todos eligen la misma técnica.
                </p>
              </div>
            </div>

            <div className="space-y-2 mt-4 border-t border-brand-border pt-4">
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <CheckCircleIcon className="w-4 h-4 text-brand-success" />
                <span>Torno, Modelado o Pintado</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <CheckCircleIcon className="w-4 h-4 text-brand-success" />
                <span>Hasta 22 personas</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <span className="inline-block bg-brand-primary text-white px-6 py-3 rounded-xl font-semibold group-hover:bg-brand-accent transition-colors">
                Elegir →
              </span>
            </div>
          </button>

          {/* Celebración */}
          <button
            onClick={() => {
              setState((prev) => ({ 
                ...prev, 
                experienceType: 'celebration',
                config: { activeParticipants: 2, guests: 0, hours: 2, hasChildren: false, childrenCount: 0 } as CelebrationConfig
              }));
              handleNext();
            }}
            className="group bg-white border-2 border-brand-border rounded-2xl p-6 sm:p-8 hover:border-brand-primary hover:shadow-lifted transition-all duration-300 text-left active:scale-[0.98]"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="text-5xl">🎉</div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-brand-text mb-2">
                  Celebración
                </h3>
                <p className="text-sm text-brand-secondary">
                  Evento completo con cerámica, invitados, decoración y alquiler de espacio.
                </p>
              </div>
            </div>

            <div className="space-y-2 mt-4 border-t border-brand-border pt-4">
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <CheckCircleIcon className="w-4 h-4 text-brand-success" />
                <span>Todo lo de "Solo Cerámica"</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <CheckCircleIcon className="w-4 h-4 text-brand-success" />
                <span>Invitados sin actividad</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <CheckCircleIcon className="w-4 h-4 text-brand-success" />
                <span>Traer decoración, comida y torta</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <CheckCircleIcon className="w-4 h-4 text-brand-success" />
                <span>Actividad especial para niños</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <CheckCircleIcon className="w-4 h-4 text-brand-success" />
                <span>Alquiler del espacio por hora: $75/h (L-J) o $100/h (V-D) + IVA</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <span className="inline-block bg-brand-primary text-white px-6 py-3 rounded-xl font-semibold group-hover:bg-brand-accent transition-colors">
                Elegir →
              </span>
            </div>
          </button>
        </div>

      </div>
    );
  };

  // ============ STEP 2: Configuración ============
  const renderStepConfiguration = () => {
    if (!state.experienceType) return null;

    const isCelebration = state.experienceType === 'celebration';

    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2">
            Configura tu Experiencia
          </h2>
          <p className="text-brand-secondary text-sm">
            {isCelebration
              ? 'Define participantes, invitados y opciones del evento'
              : 'Elige la técnica y número de participantes'}
          </p>
        </div>

        {/* Selección de Técnica */}
        <div>
          <label className="block text-sm font-semibold text-brand-text mb-3">
            Técnica de Cerámica
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TECHNIQUES.map((tech) => {
              const isSelected = state.technique === tech.id;
              return (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => {
                    setState((prev) => ({ ...prev, technique: tech.id }));
                    // Auto-scroll a participantes después de seleccionar técnica
                    setTimeout(() => {
                      participantsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 150);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                      : 'border-brand-border hover:border-brand-primary/50'
                  }`}
                >
                  <div className="text-3xl mb-2">{tech.icon}</div>
                  <h4 className="font-bold text-brand-text mb-1">{tech.name}</h4>
                  <p className="text-xs text-brand-secondary mb-2">{tech.description}</p>
                  <p className="text-xs font-semibold text-brand-primary">
                    Máx. {tech.maxCapacity} personas
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Número de Participantes */}
        <div ref={participantsRef}>
          <label className="block text-sm font-semibold text-brand-text mb-3">
            {isCelebration ? 'Participantes Activos (harán cerámica)' : 'Número de Participantes'}
          </label>
          
          {/* Nota para experiencias no-celebración */}
          {!isCelebration && (
            <div className="relative overflow-hidden rounded-2xl border border-brand-primary/10 bg-gradient-to-br from-brand-primary/[0.06] via-white to-brand-accent/[0.05] p-4 sm:p-5 mb-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-primary/[0.06]" />
              <div className="relative space-y-3.5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-primary/70 mb-1.5">
                    Experiencia grupal
                  </p>
                  <p className="text-sm text-brand-text leading-relaxed">
                    Mínimo <span className="font-semibold text-brand-primary">2 personas</span>.
                    Todos hacen la misma técnica, y la reserva queda a nombre de quien completa el formulario.
                  </p>
                </div>

                {(onGoToIndividualClasses || onGoToPackages) && (
                  <div className="pt-1 border-t border-brand-primary/10">
                    <p className="text-xs text-brand-secondary mb-2.5">
                      ¿Llegaste aquí por equivocación?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {onGoToIndividualClasses && (
                        <button
                          type="button"
                          onClick={onGoToIndividualClasses}
                          className="group inline-flex items-center gap-1.5 rounded-full border border-brand-border/80 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-brand-text shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-brand-primary/40 hover:bg-white hover:text-brand-primary hover:shadow-md"
                        >
                          Clase individual
                          <span className="translate-x-0 text-brand-primary/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-primary" aria-hidden>
                            →
                          </span>
                        </button>
                      )}
                      {onGoToPackages && (
                        <button
                          type="button"
                          onClick={onGoToPackages}
                          className="group inline-flex items-center gap-1.5 rounded-full border border-brand-border/80 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-brand-text shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-brand-primary/40 hover:bg-white hover:text-brand-primary hover:shadow-md"
                        >
                          Paquete de clases
                          <span className="translate-x-0 text-brand-primary/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-primary" aria-hidden>
                            →
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <input
            type="text"
            inputMode="numeric"
            value={participantsInput}
            onChange={(e) => {
              const inputVal = e.target.value;
              
              // Permitir vacío temporalmente mientras escribe
              if (inputVal === '') {
                setParticipantsInput('');
                return;
              }
              
              // Solo dígitos; no forzar mínimo aquí (si no, no se puede escribir 11, 12, etc.)
              if (!/^\d+$/.test(inputVal)) {
                return;
              }
              
              const val = parseInt(inputVal, 10);
              const maxCap = state.technique ? TECHNIQUES.find((t) => t.id === state.technique)?.maxCapacity || 22 : 22;
              const minParticipants = isCelebration ? 1 : 2;
              
              setParticipantsInput(inputVal);
              
              // Actualizar estado solo cuando el número ya es válido completo
              if (val >= minParticipants && val <= maxCap) {
                setState((prev) => ({
                  ...prev,
                  config: isCelebration
                    ? { ...(prev.config as CelebrationConfig), activeParticipants: val }
                    : { participants: val },
                }));
              }
            }}
            onBlur={(e) => {
              const inputVal = e.target.value;
              const maxCap = state.technique ? TECHNIQUES.find((t) => t.id === state.technique)?.maxCapacity || 22 : 22;
              const minParticipants = isCelebration ? 1 : 2;
              const parsed = parseInt(inputVal, 10);
              
              let next = minParticipants;
              if (inputVal !== '' && Number.isFinite(parsed)) {
                next = Math.min(maxCap, Math.max(minParticipants, parsed));
              } else if (state.config) {
                next = isCelebration
                  ? (state.config as CelebrationConfig).activeParticipants || minParticipants
                  : (state.config as CeramicOnlyConfig).participants || minParticipants;
                next = Math.min(maxCap, Math.max(minParticipants, next));
              }
              
              setParticipantsInput(String(next));
              setState((prev) => ({
                ...prev,
                config: isCelebration
                  ? { ...(prev.config as CelebrationConfig), activeParticipants: next }
                  : { participants: next },
              }));
            }}
            className={`w-full sm:w-32 px-4 py-3 border-2 rounded-lg text-center text-2xl font-bold transition-all ${
              state.technique && participantsInput && parseInt(participantsInput) > (TECHNIQUES.find((t) => t.id === state.technique)?.maxCapacity || 22)
                ? 'border-red-500 bg-red-50 text-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : participantsInput && parseInt(participantsInput, 10) > 0 && parseInt(participantsInput, 10) < (isCelebration ? 1 : 2)
                ? 'border-amber-400 bg-amber-50 text-amber-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                : 'border-brand-border focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20'
            }`}
          />
          
          {/* Aviso suave mientras escribe un valor bajo el mínimo (aún no enviado) */}
          {!isCelebration && participantsInput !== '' && parseInt(participantsInput, 10) === 1 && (
            <p className="text-xs text-amber-700 mt-2">
              Mínimo 2 personas. Sigue escribiendo (ej. 11) o deja el campo para ajustar.
            </p>
          )}
          
          {/* Mensaje de error si excede máximo */}
          {state.technique && participantsInput && parseInt(participantsInput) > (TECHNIQUES.find((t) => t.id === state.technique)?.maxCapacity || 22) && (
            <div className="mt-2 bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-bold">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-red-900">Capacidad Excedida</p>
                  <p className="text-xs text-red-700">
                    {TECHNIQUES.find((t) => t.id === state.technique)?.name} permite máximo {TECHNIQUES.find((t) => t.id === state.technique)?.maxCapacity} participantes.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Mensaje informativo normal */}
          {(!participantsInput || parseInt(participantsInput) <= (state.technique ? TECHNIQUES.find((t) => t.id === state.technique)?.maxCapacity || 22 : 22)) && (
            <p className="text-xs text-brand-secondary mt-2">
              {state.technique && `Máximo ${TECHNIQUES.find((t) => t.id === state.technique)?.maxCapacity} para ${TECHNIQUES.find((t) => t.id === state.technique)?.name}`}
            </p>
          )}
          
          {/* Precio en tiempo real - Solo Cerámica */}
          {!isCelebration && state.technique && state.technique !== 'painting' && state.config && (
            <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-800 font-medium">Precio por persona</p>
                  <p className="text-xs text-green-700">Incluye IVA</p>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  ${state.technique === 'potters_wheel' ? TECHNIQUE_PRICES.potters_wheel : TECHNIQUE_PRICES.hand_modeling}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-green-300 flex items-center justify-between">
                <p className="text-sm font-semibold text-green-900">Total</p>
                <p className="text-3xl font-bold text-green-600">
                  ${(state.technique === 'potters_wheel' ? TECHNIQUE_PRICES.potters_wheel : TECHNIQUE_PRICES.hand_modeling) * (state.config as CeramicOnlyConfig).participants}
                </p>
              </div>
            </div>
          )}
          
          {/* Aviso para Pintado */}
          {!isCelebration && state.technique === 'painting' && (
            <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-900 font-medium mb-1">💡 Precio por Pieza</p>
              <p className="text-xs text-blue-700">
                Cada participante elegirá su pieza. El precio mínimo es de $25 por persona (incluye IVA). Hay piezas de mayor valor y se paga solo la diferencia en el taller. La reserva se confirma con el pago del 100% del mínimo por persona.
              </p>
              <div className="mt-3 pt-3 border-t border-blue-300">
                <p className="text-sm font-semibold text-blue-900 mb-1">Pago mínimo de reserva</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${TECHNIQUE_PRICES.painting * (state.config as CeramicOnlyConfig).participants}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  ({(state.config as CeramicOnlyConfig).participants} personas × $18 c/u)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Opciones de Celebración */}
        {isCelebration && (
          <div className="space-y-6 border-t border-brand-border pt-6">
            <h3 className="text-lg font-bold text-brand-text">Opciones de Celebración</h3>

            {/* Invitados */}
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-2 flex items-center">
                Invitados (no hacen cerámica)
                <Tooltip text="Personas que solo acompañan y disfrutan el evento sin participar en la actividad de cerámica." />
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={(state.config as CelebrationConfig)?.guests || 0}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  const num = val === '' ? 0 : parseInt(val);
                  setState((prev) => ({
                    ...prev,
                    config: { ...(prev.config as CelebrationConfig), guests: num },
                  }));
                }}
                className="w-full sm:w-32 px-4 py-2 border-2 border-brand-border rounded-lg text-center font-semibold focus:border-brand-primary transition-all"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(state.config as CelebrationConfig)?.bringDecoration || false}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      config: { ...(prev.config as CelebrationConfig), bringDecoration: e.target.checked },
                    }))
                  }
                  className="w-5 h-5 text-brand-primary border-brand-border rounded focus:ring-brand-primary"
                />
                <span className="text-sm font-medium text-brand-text group-hover:text-brand-primary transition-colors">
                  Traer decoración propia
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(state.config as CelebrationConfig)?.bringCake || false}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      config: { ...(prev.config as CelebrationConfig), bringCake: e.target.checked },
                    }))
                  }
                  className="w-5 h-5 text-brand-primary border-brand-border rounded focus:ring-brand-primary"
                />
                <span className="text-sm font-medium text-brand-text group-hover:text-brand-primary transition-colors">
                  Traer torta propia
                </span>
              </label>
            </div>

            {/* Info: Pueden traer comida y bebidas */}
            <div className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-4">
              <p className="text-sm text-green-900 font-medium">
                🎉 <strong>¡Buenas noticias!</strong> Puedes traer tu propia comida, bebidas, torta, decoración y menaje. 
                El espacio incluye mesas, sillas, A/C y WiFi.
              </p>
            </div>
            
            {/* Horas de Espacio (SOLO Celebración) */}
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-3 flex items-center">
                ¿Cuántas horas necesitas el espacio?
                <Tooltip text="El espacio se alquila por horas. Incluye mesas, sillas, A/C y WiFi. Traes tu menaje, decoración y comida." />
              </label>
              <select
                value={(state.config as CelebrationConfig)?.hours || 2}
                onChange={(e) => {
                  const hours = parseInt(e.target.value);
                  setState((prev) => ({
                    ...prev,
                    config: { ...(prev.config as CelebrationConfig), hours },
                  }));
                }}
                className="w-full sm:w-48 px-4 py-3 border-2 border-brand-border rounded-lg font-semibold focus:border-brand-primary transition-all text-lg"
              >
                <option value="2">2 horas</option>
                <option value="3">3 horas</option>
                <option value="4">4 horas</option>
                <option value="5">5 horas</option>
              </select>
            </div>
            
            {/* Nota sobre comida - Sin MenuSelector */}
            <div className="border-t border-brand-border pt-6">
              <h3 className="text-lg font-bold text-brand-text mb-3">🍽️ Comida y Bebidas</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>Puedes traer todo lo que necesites:</strong>
                </p>
                <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                  <li>Comida y snacks de tu preferencia</li>
                  <li>Bebidas (alcohólicas y no alcohólicas)</li>
                  <li>Torta de cumpleaños o postre</li>
                  <li>Decoración temática</li>
                  <li>Menaje (platos, vasos, cubiertos, manteles)</li>
                </ul>
                <p className="text-xs text-blue-700 mt-3 italic">
                  El espacio incluye mesas, sillas, A/C y WiFi para tu comodidad.
                </p>
              </div>
            </div>
            
            {/* Actividad para niños - Ahora independiente */}
            <div className="border-t border-brand-border pt-6">
              <h3 className="text-lg font-bold text-brand-text mb-3">👶 Actividad para Niños (Opcional)</h3>
              <p className="text-sm text-brand-secondary mb-4">
                ¿Habrá niños que quieran pintar piezas de cerámica? Precio: <strong>$18 por niño</strong> (incluye IVA).
              </p>
              
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-medium text-brand-text">¿Cuántos niños pintarán?</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={(state.config as CelebrationConfig)?.childrenCount === 0 ? '' : (state.config as CelebrationConfig)?.childrenCount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); // Solo números
                    const count = val === '' ? 0 : Math.max(0, Math.min(20, parseInt(val, 10)));
                    setState((prev) => ({
                      ...prev,
                      config: { ...(prev.config as CelebrationConfig), childrenCount: count },
                    }));
                  }}
                  onFocus={(e) => {
                    // Seleccionar todo el texto al enfocar para facilitar edición
                    e.target.select();
                  }}
                  placeholder="0"
                  className="w-20 px-3 py-2 border-2 border-brand-border rounded-lg text-center font-semibold focus:border-brand-primary transition-all"
                />
              </div>
              
              {(state.config as CelebrationConfig)?.childrenCount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-800">
                      {(state.config as CelebrationConfig).childrenCount} niño(s) × $18
                    </span>
                    <span className="text-xl font-bold text-green-600">
                      ${(state.config as CelebrationConfig).childrenCount * 18}
                    </span>
                  </div>
                  <p className="text-xs text-green-700 mt-2">
                    La pieza se elige en el taller. Si escogen una pieza de mayor valor, pagan solo la diferencia.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error display */}
        {state.error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
            <p className="text-sm text-red-900">{state.error}</p>
          </div>
        )}
      </div>
    );
  };

  // ============ STEP 3: Fecha y Hora ============
  const renderStepDateTime = () => {
    const isCelebration = state.experienceType === 'celebration';
    const activeParticipants = isCelebration 
      ? (state.config as CelebrationConfig)?.activeParticipants || 1
      : (state.config as CeramicOnlyConfig)?.participants || 1;
    
    // Obtener información de la técnica seleccionada
    const selectedTechnique = TECHNIQUES.find(t => t.id === state.technique);
    
    // Textos explicativos por técnica
    const techniqueExplanations: Record<string, string> = {
      'potters_wheel': 'Torno Alfarero: Técnica tradicional que requiere coordinación y precisión. Mientras el plato da vueltas, tú usas las manos para dar forma a piezas redondas y simétricas (como tazas o cuencos)',
      'hand_modeling': 'Modelado a Mano: Crea formas libres usando solo tus manos. Técnicas como pellizco, churros y planchas te permiten explorar tu creatividad sin restricciones, ideal para esculturas y piezas únicas.',
      'painting': 'Pintado a Mano: Pinta piezas de cerámica ya moldeadas con colores vibrantes. Perfecto para expresar tu creatividad visual en superficies preparadas sin necesidad de modelar.'
    };
    
    return (
      <div className="space-y-5 animate-fade-in-up">
        {/* Botón Atrás superior */}
        <button
          onClick={handlePrevious}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg border border-gray-300 text-brand-text font-semibold hover:bg-gray-50 hover:border-brand-primary disabled:opacity-50 transition-all inline-flex items-center gap-2 shadow-sm"
        >
          ← Atrás
        </button>
        
        {/* Explicación de la técnica seleccionada */}
        {state.technique && (
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 border border-blue-100 rounded-2xl p-4 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed font-medium">
              {techniqueExplanations[state.technique] || selectedTechnique?.description}
            </p>
          </div>
        )}
        
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2">
            📅 Selecciona Fecha y Hora
          </h2>
          <p className="text-gray-500 text-sm">
            Elige el horario con disponibilidad para tu grupo
          </p>
        </div>

        {/* FreeDateTimePicker con validación en tiempo real */}
        {state.technique && (
          <FreeDateTimePicker
            technique={state.technique}
            participants={activeParticipants}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setSelectedTime(null);
              setSlotAvailability(null);
            }}
            onSelectTime={(time, availability) => {
              setSelectedTime(time);
              if (availability) {
                setSlotAvailability(availability);
              }
            }}
          />
        )}

        {/* Resumen visual */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-bold text-brand-text text-lg mb-5 flex items-center gap-2">
            <span className="text-xl">📝</span> Resumen de tu Experiencia
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Tipo:</span>
              <span className="font-bold text-brand-text">
                {isCelebration ? '🎉 Celebración' : '🎨 Solo Cerámica'}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Técnica:</span>
              <span className="font-bold text-brand-text">
                {TECHNIQUES.find((t) => t.id === state.technique)?.icon} {TECHNIQUES.find((t) => t.id === state.technique)?.name}
              </span>
            </div>
            {isCelebration ? (
              <>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">Participantes activos:</span>
                  <span className="font-bold text-brand-text">
                    {(state.config as CelebrationConfig)?.activeParticipants || 0}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">Invitados:</span>
                  <span className="font-bold text-brand-text">
                    {(state.config as CelebrationConfig)?.guests || 0}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">Horas de espacio:</span>
                  <span className="font-bold text-brand-text">
                    {(state.config as CelebrationConfig)?.hours || 0}h
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Participantes:</span>
                <span className="font-bold text-brand-text">
                  {(state.config as CeramicOnlyConfig)?.participants || 0}
                </span>
              </div>
            )}
            {selectedDate && selectedTime && slotAvailability && (
              <>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">Fecha:</span>
                  <span className={`font-bold ${slotAvailability.available ? 'text-green-600' : 'text-red-600'}`}>
                    {parseLocalDate(selectedDate).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">Hora:</span>
                  <span className={`font-bold ${slotAvailability.available ? 'text-green-600' : 'text-red-600'}`}>{selectedTime}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">Disponibilidad:</span>
                  <span className={`font-bold ${slotAvailability.available ? 'text-green-600' : 'text-red-600'}`}>
                    {slotAvailability.capacity.available} cupos disponibles
                  </span>
                </div>
                {!slotAvailability.available && (
                  <div className="py-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl px-4 mt-2 border border-red-100">
                    <span className="text-red-700 text-sm font-bold">
                      ⚠️ No hay cupos suficientes para {slotAvailability.requestedParticipants} participantes
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Resumen de Costos - Mostrar SOLO después de seleccionar fecha/hora */}
        {selectedDate && selectedTime && slotAvailability && slotAvailability.available && isCelebration && state.config && (
          <div className="mt-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-brand-primary rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-brand-text mb-4 flex items-center gap-2">
              <span>💰</span> Total a Pagar
            </h3>
            
            {/* Determinar si es weekday o weekend */}
            {(() => {
              const dayOfWeek = parseLocalDate(selectedDate).getDay();
              const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Vie, Sáb, Dom
              const spaceRate = isWeekend ? 100 : 75;
              const config = state.config as CelebrationConfig;
              
              const spaceSubtotal = config.hours * spaceRate;
              const spaceVat = spaceSubtotal * 0.15;
              const spaceTotalWithVat = spaceSubtotal + spaceVat;
              
              const techniquePrice = state.technique === 'potters_wheel' ? TECHNIQUE_PRICES.potters_wheel :
                                    state.technique === 'hand_modeling' ? TECHNIQUE_PRICES.hand_modeling :
                                    TECHNIQUE_PRICES.painting;
              const techniqueTotal = config.activeParticipants * techniquePrice;
              
              const childrenTotal = (config.childrenCount || 0) * 18;
              
              const grandTotal = spaceTotalWithVat + techniqueTotal + childrenTotal;
              
              return (
                <>
                  {/* Espacio */}
                  <div className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                    <p className="text-sm font-semibold text-gray-700 mb-2">🏠 Alquiler del Espacio</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>{config.hours}h × ${spaceRate}/h {isWeekend ? '(fin de semana)' : '(entre semana)'}</span>
                        <span className="font-semibold">${spaceSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>IVA (15%)</span>
                        <span className="font-semibold">${spaceVat.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-brand-text font-bold pt-1 border-t border-gray-200">
                        <span>Subtotal Espacio</span>
                        <span>${spaceTotalWithVat.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Técnica */}
                  <div className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                    <p className="text-sm font-semibold text-gray-700 mb-2">🎯 Actividad de Cerámica</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>{config.activeParticipants} personas × ${techniquePrice}</span>
                        <span className="font-semibold">${techniqueTotal.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500 italic">Ya incluye IVA</p>
                    </div>
                  </div>
                  
                  {/* Niños */}
                  {config.childrenCount > 0 && (
                    <div className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                      <p className="text-sm font-semibold text-gray-700 mb-2">👶 Actividad para Niños</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>{config.childrenCount} niño(s) × $18</span>
                          <span className="font-semibold">${childrenTotal.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-gray-500 italic">Ya incluye IVA</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Total Final */}
                  <div className="bg-gradient-to-r from-brand-primary to-brand-accent rounded-xl p-4 text-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm opacity-90">Total a Pagar</p>
                        <p className="text-xs opacity-75 mt-1">Reserva con 100% del monto</p>
                      </div>
                      <p className="text-3xl font-bold">${grandTotal.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-600 mt-3 text-center">
                    ℹ️ Este es el monto total que necesitas pagar para confirmar tu reserva
                  </p>
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  // ============ STEP 4: Datos del Usuario ============
  const renderStepUserData = () => {
    const isCelebration = state.experienceType === 'celebration';
    
    // Calcular pricing total
    const calculateTotalPricing = () => {
      let total = 0;
      
      if (isCelebration && state.config) {
        const config = state.config as CelebrationConfig;
        // Espacio + IVA (asumimos weekend para estimate)
        total += config.hours * 100 * 1.15;
        // Técnica
        if (state.technique) {
          const techPrice = state.technique === 'potters_wheel' ? TECHNIQUE_PRICES.potters_wheel :
                           state.technique === 'hand_modeling' ? TECHNIQUE_PRICES.hand_modeling :
                           TECHNIQUE_PRICES.painting;
          total += config.activeParticipants * techPrice;
        }
        // Actividad niños (simplificado: $18 por niño)
        if (config.hasChildren && config.childrenCount > 0) {
          total += config.childrenCount * 18;
        }
      } else if (state.config && state.technique) {
        // Solo Cerámica
        const config = state.config as CeramicOnlyConfig;
        if (state.technique === 'painting') {
          total = config.participants * TECHNIQUE_PRICES.painting; // Mínimo
        } else {
          const techPrice = state.technique === 'potters_wheel' ? TECHNIQUE_PRICES.potters_wheel : TECHNIQUE_PRICES.hand_modeling;
          total = config.participants * techPrice;
        }
      }
      
      return total.toFixed(2);
    };
    
    const handleUserInfoSubmit = (data: { userInfo: UserInfo; needsInvoice: boolean; invoiceData?: any; acceptedNoRefund?: boolean }) => {
      setUserInfo(data.userInfo);
      // Avanzar a confirmación
      setState(prev => ({ ...prev, currentStep: 5 }));
    };
    
    // Retornar null porque el modal se renderiza fuera del contenedor
    return null;
  };

  // ============ NAVIGATION HANDLERS ============
  const handleNext = () => {
    const isCelebration = state.experienceType === 'celebration';
    
    // Validation logic
    if (state.currentStep === 2) {
      if (!state.technique) {
        setState((prev) => ({ ...prev, error: 'Por favor selecciona una técnica' }));
        return;
      }
      if (!state.config) {
        setState((prev) => ({ ...prev, error: 'Por favor configura los participantes' }));
        return;
      }
      
      // Validación específica para celebración
      if (isCelebration) {
        const config = state.config as CelebrationConfig;
        if (!config.activeParticipants || config.activeParticipants < 1) {
          setState((prev) => ({ ...prev, error: 'Debe haber al menos 1 participante activo' }));
          return;
        }
        if (!config.hours || config.hours < 2) {
          setState((prev) => ({ ...prev, error: 'El mínimo de horas es 2' }));
          return;
        }
      } else {
        // Solo cerámica
        const config = state.config as CeramicOnlyConfig;
        if (!config.participants || config.participants < 1) {
          setState((prev) => ({ ...prev, error: 'Debe haber al menos 1 participante' }));
          return;
        }
      }
    }

    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 4) as any,
      error: null,
    }));
  };

  const handlePrevious = () => {
    if (state.currentStep === 1) {
      onBack();
    } else {
      setState((prev) => ({
        ...prev,
        currentStep: Math.max(prev.currentStep - 1, 1) as any,
        error: null,
      }));
    }
  };

  // Auto-scroll a top cuando cambia el step
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [state.currentStep]);

  // ============ RENDER ============
  
  // Calcular pricing total para Step 4
  const calculateTotalPricing = () => {
    const isCelebration = state.experienceType === 'celebration';
    let total = 0;
    
    if (isCelebration && state.config) {
      const config = state.config as CelebrationConfig;
      total += config.hours * 100 * 1.15;
      if (state.technique) {
        const techPrice = state.technique === 'potters_wheel' ? TECHNIQUE_PRICES.potters_wheel :
                         state.technique === 'hand_modeling' ? TECHNIQUE_PRICES.hand_modeling :
                         TECHNIQUE_PRICES.painting;
        total += config.activeParticipants * techPrice;
      }
      // Actividad niños (simplificado: $18 por niño)
      if (config.hasChildren && config.childrenCount > 0) {
        total += config.childrenCount * 18;
      }
    } else if (state.config && state.technique) {
      const config = state.config as CeramicOnlyConfig;
      if (state.technique === 'painting') {
        total = config.participants * TECHNIQUE_PRICES.painting;
      } else {
        const techPrice = state.technique === 'potters_wheel' ? TECHNIQUE_PRICES.potters_wheel : TECHNIQUE_PRICES.hand_modeling;
        total = config.participants * techPrice;
      }
    }
    
    return total.toFixed(2);
  };
  
  const handleUserInfoSubmit = async (data: { userInfo: UserInfo; needsInvoice: boolean; invoiceData?: any; acceptedNoRefund?: boolean }) => {
    setUserInfo(data.userInfo);
    
    // Crear booking inmediatamente cuando completa Step 4 (ANTES de ir a Step 5)
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const bookingPayload = {
        experienceType: state.experienceType,
        technique: state.technique,
        date: selectedDate,
        time: selectedTime,
        participants: state.experienceType === 'celebration' 
          ? (state.config as CelebrationConfig)?.activeParticipants || 0
          : (state.config as CeramicOnlyConfig)?.participants || 0,
        config: state.config,
        userInfo: data.userInfo,
        invoiceData: data.needsInvoice ? data.invoiceData : undefined,
        needsInvoice: data.needsInvoice,
        totalPrice: parseFloat(calculateTotalPricing()),
        menuSelections: state.menuSelections,
        childrenPieces: state.experienceType === 'celebration' 
          ? (state.config as CelebrationConfig)?.childrenPieces || []
          : undefined
      };

      const response = await fetch('/api/data?action=createCustomExperienceBooking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear la pre-reserva');
      }

      // Ir DIRECTAMENTE a ConfirmationPage, sin Step 5 redundante
      setState(prev => ({ 
        ...prev, 
        isLoading: false
      }));
      
      // Notificar al padre para navegar a ConfirmationPage
      onConfirm(result.booking);

    } catch (error) {
      console.error('Error creating custom experience booking:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error al crear la pre-reserva. Intenta de nuevo.'
      }));
      throw error;
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8">
      {/* Progress Indicator */}
      <ProgressIndicator currentStep={state.currentStep} totalSteps={4} stepTitles={STEP_TITLES} />

      {/* Step Content - Solo mostrar contenedor si NO es Step 4 */}
      {state.currentStep !== 4 && (
        <div className="bg-brand-surface rounded-2xl shadow-subtle p-6 sm:p-8 mb-6">
          {state.currentStep === 1 && renderStepActivityType()}
          {state.currentStep === 2 && renderStepConfiguration()}
          {state.currentStep === 3 && renderStepDateTime()}
        </div>
      )}
      
      {/* UserInfoModal - Renderizado como overlay completo en Step 4 */}
      {state.currentStep === 4 && (
        <UserInfoModal
          onClose={handlePrevious}
          onSubmit={handleUserInfoSubmit}
          onShowPolicies={onShowPolicies}
          slots={[]}
        />
      )}

      {/* Navigation Buttons - Ocultar en Step 4 porque el modal tiene sus propios botones */}
      {state.currentStep > 1 && state.currentStep !== 4 && (
        <div className="flex gap-4">
          <button
            onClick={handlePrevious}
            disabled={isLoading}
            className="px-6 py-3 rounded-xl border-2 border-brand-border text-brand-text font-semibold hover:bg-brand-background disabled:opacity-50 transition-all"
          >
            ← Atrás
          </button>
          {state.currentStep < 5 && (
            <button
              onClick={handleNext}
              disabled={isLoading || (() => {
                // Validar participantes en Step 2
                if (state.currentStep === 2 && state.technique) {
                  const maxCap = TECHNIQUES.find((t) => t.id === state.technique)?.maxCapacity || 22;
                  const currentParticipants = state.config
                    ? state.experienceType === 'celebration'
                      ? (state.config as CelebrationConfig).activeParticipants || 0
                      : (state.config as CeramicOnlyConfig).participants || 0
                    : 0;
                  return currentParticipants > maxCap || currentParticipants < 1;
                }
                // Validar fecha/hora y disponibilidad en Step 3
                if (state.currentStep === 3) {
                  // Debe tener fecha, hora y disponibilidad confirmada
                  if (!selectedDate || !selectedTime || !slotAvailability) return true;
                  // No permitir si no hay disponibilidad
                  if (!slotAvailability.available) return true;
                }
                return false;
              })()}
              className="flex-1 px-6 py-3 bg-brand-primary text-white rounded-xl font-semibold hover:bg-brand-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              Siguiente →
            </button>
          )}
        </div>
      )}
    </div>
  );
};
