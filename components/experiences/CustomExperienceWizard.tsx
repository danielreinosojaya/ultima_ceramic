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
import { MenuSelector } from './MenuSelector';
import { FreeDateTimePicker } from './FreeDateTimePicker';
import type { AvailableSlotResult, SlotAvailabilityResult } from '../../services/dataService';
import { ChildPieceSelector } from './ChildPieceSelector';
import { UserInfoModal } from '../UserInfoModal';

interface CustomExperienceWizardProps {
  pieces: Piece[];
  onConfirm: (booking: CustomExperienceBooking) => void;
  onBack: () => void;
  isLoading?: boolean;
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
  isLoading = false,
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
  const [menuTotal, setMenuTotal] = useState(0);
  const [showChildPieceSelector, setShowChildPieceSelector] = useState(false);
  const [participantsInput, setParticipantsInput] = useState<string>('1');
  
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
                config: { participants: 1 } // Inicializar config
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
                  Actividad de cerámica pura. Todos los participantes eligen su técnica.
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
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <CheckCircleIcon className="w-4 h-4 text-brand-success" />
                <span>Espacio privado con todos los servicios</span>
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
                config: { 
                  activeParticipants: 1, 
                  guests: 0, 
                  hours: 2,
                  bringDecoration: false, 
                  bringCake: false, 
                  hasChildren: false, 
                  menuSelections: [] 
                } as CelebrationConfig
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
                  Evento completo con cerámica, invitados, decoración y menú personalizado.
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
                <span>Traer decoración y torta</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <CheckCircleIcon className="w-4 h-4 text-brand-success" />
                <span>Menú de alimentos y bebidas</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <CheckCircleIcon className="w-4 h-4 text-brand-success" />
                <span>Actividad especial para niños</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <span className="inline-block bg-brand-primary text-white px-6 py-3 rounded-xl font-semibold group-hover:bg-brand-accent transition-colors">
                Elegir →
              </span>
            </div>
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4 mt-8">
          <div className="flex gap-3">
            <InfoCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">Espacio Incluido</p>
              <p className="text-sm text-blue-800">
                Todas las experiencias incluyen: A/C, WiFi, mesas, sillas, menaje y servicio. El espacio se renta por hora.
              </p>
            </div>
          </div>
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
          <label className="block text-sm font-semibold text-brand-text mb-3 flex items-center">
            Técnica de Cerámica
            <Tooltip text="Todos los participantes harán la misma técnica. Elige según el nivel de experiencia y preferencias del grupo." />
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
              const maxCap = state.technique ? TECHNIQUES.find((t) => t.id === state.technique)?.maxCapacity || 22 : 22;
              
              // Actualizar input visualmente
              setParticipantsInput(inputVal);
              
              // Actualizar estado solo si es válido
              if (val >= 1 && val <= maxCap) {
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
              
              // Si está vacío, inválido o excede máximo, restaurar al último válido
              if (inputVal === '' || parseInt(inputVal) < 1 || parseInt(inputVal) > maxCap) {
                const currentVal = state.config
                  ? isCelebration
                    ? (state.config as CelebrationConfig).activeParticipants || 1
                    : (state.config as CeramicOnlyConfig).participants || 1
                  : 1;
                setParticipantsInput(currentVal.toString());
              } else {
                // Asegurar que el valor mostrado coincida con el estado
                const currentVal = state.config
                  ? isCelebration
                    ? (state.config as CelebrationConfig).activeParticipants || 1
                    : (state.config as CeramicOnlyConfig).participants || 1
                  : 1;
                setParticipantsInput(currentVal.toString());
              }
            }}
            className={`w-full sm:w-32 px-4 py-3 border-2 rounded-lg text-center text-2xl font-bold transition-all ${
              state.technique && participantsInput && parseInt(participantsInput) > (TECHNIQUES.find((t) => t.id === state.technique)?.maxCapacity || 22)
                ? 'border-red-500 bg-red-50 text-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : 'border-brand-border focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20'
            }`}
          />
          
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
                Cada participante elegirá su pieza. El precio mínimo es de $18 por persona (incluye IVA). 
                La reserva se confirma con el pago del 100% del mínimo por persona.
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
                type="number"
                min="0"
                value={(state.config as CelebrationConfig)?.guests || 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setState((prev) => ({
                    ...prev,
                    config: { ...(prev.config as CelebrationConfig), guests: val },
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

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(state.config as CelebrationConfig)?.hasChildren || false}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      config: {
                        ...(prev.config as CelebrationConfig),
                        hasChildren: e.target.checked,
                        childrenCount: e.target.checked ? 1 : 0,
                        childrenPieces: [],
                      },
                    }))
                  }
                  className="w-5 h-5 text-brand-primary border-brand-border rounded focus:ring-brand-primary"
                />
                <span className="text-sm font-medium text-brand-text group-hover:text-brand-primary transition-colors">
                  Incluir actividad para niños (pintado de piezas)
                </span>
              </label>
            </div>

            {/* Info: No bebidas/alimentos de afuera */}
            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4">
              <p className="text-sm text-amber-900 font-medium">
                ⚠️ <strong>Importante:</strong> No se permite traer bebidas ni alimentos de afuera (excepto torta). 
                Tenemos un menú disponible para que puedas ordenar lo que necesites.
              </p>
            </div>
            
            {/* Horas de Espacio (SOLO Celebración) */}
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-3 flex items-center">
                ¿Cuántas horas necesitas el espacio?
                <Tooltip text="El espacio se alquila por horas. Incluye A/C, WiFi, mesas, sillas, menaje y servicio." />
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
              
              {/* Preview de pricing */}
              {state.config && state.technique && (
                <div className="mt-4 bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-purple-900 mb-3">Resumen de Costos</p>
                  
                  {/* Espacio */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-purple-800">
                      <span>Espacio ({(state.config as CelebrationConfig).hours}h × $100*)</span>
                      <span className="font-semibold">${(state.config as CelebrationConfig).hours * 100}</span>
                    </div>
                    <div className="flex justify-between text-purple-700">
                      <span>IVA (15%)</span>
                      <span className="font-semibold">${((state.config as CelebrationConfig).hours * 100 * 0.15).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-purple-900 font-bold pt-2 border-t border-purple-300">
                      <span>Subtotal Espacio</span>
                      <span>${((state.config as CelebrationConfig).hours * 100 * 1.15).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Técnicas */}
                  <div className="mt-3 pt-3 border-t border-purple-300 space-y-2 text-sm">
                    <div className="flex justify-between text-purple-800">
                      <span>
                        Técnica ({(state.config as CelebrationConfig).activeParticipants} personas × 
                        ${state.technique === 'potters_wheel' ? TECHNIQUE_PRICES.potters_wheel : 
                          state.technique === 'hand_modeling' ? TECHNIQUE_PRICES.hand_modeling : TECHNIQUE_PRICES.painting})
                      </span>
                      <span className="font-semibold">
                        ${(state.config as CelebrationConfig).activeParticipants * 
                          (state.technique === 'potters_wheel' ? TECHNIQUE_PRICES.potters_wheel : 
                           state.technique === 'hand_modeling' ? TECHNIQUE_PRICES.hand_modeling : TECHNIQUE_PRICES.painting)}
                      </span>
                    </div>
                    <p className="text-xs text-purple-700">Ya incluye IVA</p>
                  </div>
                  
                  {/* Total Estimado */}
                  <div className="mt-3 pt-3 border-t-2 border-purple-400 flex justify-between">
                    <p className="text-base font-bold text-purple-900">Total Estimado</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${(
                        ((state.config as CelebrationConfig).hours * 100 * 1.15) +
                        ((state.config as CelebrationConfig).activeParticipants * 
                          (state.technique === 'potters_wheel' ? TECHNIQUE_PRICES.potters_wheel : 
                           state.technique === 'hand_modeling' ? TECHNIQUE_PRICES.hand_modeling : TECHNIQUE_PRICES.painting))
                      ).toFixed(2)}
                    </p>
                  </div>
                  
                  <p className="text-xs text-purple-700 mt-3">
                    *Precio mostrado asume fin de semana ($100/h). Precio entre semana es $65/h + IVA.
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    No incluye menú ni piezas para niños (se agregan después).
                  </p>
                </div>
              )}
            </div>
            
            {/* Menu Selector */}
            <div className="border-t border-brand-border pt-6">
              <h3 className="text-lg font-bold text-brand-text mb-3">Selecciona tu Menú</h3>
              <p className="text-sm text-brand-secondary mb-4">
                Elige bebidas, snacks y comidas para tu celebración. No se permite traer alimentos de afuera (excepto torta).
              </p>
              <MenuSelector
                selectedItems={(state.config as CelebrationConfig)?.menuSelections || []}
                onSelectionChange={(items) => {
                  setState((prev) => ({
                    ...prev,
                    config: { ...(prev.config as CelebrationConfig), menuSelections: items },
                  }));
                }}
                onTotalChange={setMenuTotal}
              />
            </div>
            
            {/* Botón para seleccionar piezas para niños */}
            {(state.config as CelebrationConfig)?.hasChildren && (
              <div className="border-t border-brand-border pt-6">
                <h3 className="text-lg font-bold text-brand-text mb-3">Piezas para Niños</h3>
                <p className="text-sm text-brand-secondary mb-4">
                  Los niños pintarán sus propias piezas. Precio mínimo: $18 por niño.
                </p>
                <button
                  type="button"
                  onClick={() => setShowChildPieceSelector(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-brand-secondary text-white rounded-lg font-semibold hover:bg-brand-secondary/90 transition-all"
                >
                  {(state.config as CelebrationConfig)?.childrenPieces?.length > 0
                    ? `✓ Piezas Seleccionadas (${(state.config as CelebrationConfig).childrenPieces.length})`
                    : '🎨 Seleccionar Piezas para Niños'}
                </button>
                
                {(state.config as CelebrationConfig)?.childrenPieces?.length > 0 && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-green-900">
                      Total piezas niños: ${(state.config as CelebrationConfig).childrenPieces.reduce((sum, cp) => sum + cp.piecePrice, 0).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* ChildPieceSelector Modal */}
            {(state.config as CelebrationConfig)?.hasChildren && (
              <ChildPieceSelector
                isOpen={showChildPieceSelector}
                onClose={() => setShowChildPieceSelector(false)}
                pieces={pieces}
                childrenCount={(state.config as CelebrationConfig)?.childrenCount || 1}
                existingSelections={(state.config as CelebrationConfig)?.childrenPieces || []}
                onConfirm={(selections) => {
                  setState((prev) => ({
                    ...prev,
                    config: { ...(prev.config as CelebrationConfig), childrenPieces: selections },
                  }));
                }}
              />
            )}
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
    
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-2">
            📅 Selecciona Fecha y Hora
          </h2>
          <p className="text-brand-secondary text-sm">
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
        <div className="bg-white border-2 border-brand-border rounded-xl p-6 mt-6">
          <h3 className="font-bold text-brand-text mb-4">Resumen de tu Experiencia</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-brand-border">
              <span className="text-brand-secondary">Tipo:</span>
              <span className="font-semibold text-brand-text">
                {isCelebration ? '🎉 Celebración' : '🎨 Solo Cerámica'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-brand-border">
              <span className="text-brand-secondary">Técnica:</span>
              <span className="font-semibold text-brand-text">
                {TECHNIQUES.find((t) => t.id === state.technique)?.icon} {TECHNIQUES.find((t) => t.id === state.technique)?.name}
              </span>
            </div>
            {isCelebration ? (
              <>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-secondary">Participantes activos:</span>
                  <span className="font-semibold text-brand-text">
                    {(state.config as CelebrationConfig)?.activeParticipants || 0}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-secondary">Invitados:</span>
                  <span className="font-semibold text-brand-text">
                    {(state.config as CelebrationConfig)?.guests || 0}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-secondary">Horas de espacio:</span>
                  <span className="font-semibold text-brand-text">
                    {(state.config as CelebrationConfig)?.hours || 0}h
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-2 border-b border-brand-border">
                <span className="text-brand-secondary">Participantes:</span>
                <span className="font-semibold text-brand-text">
                  {(state.config as CeramicOnlyConfig)?.participants || 0}
                </span>
              </div>
            )}
            {selectedDate && selectedTime && slotAvailability && (
              <>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-secondary">Fecha:</span>
                  <span className={`font-semibold ${slotAvailability.available ? 'text-green-700' : 'text-red-600'}`}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-secondary">Hora:</span>
                  <span className={`font-semibold ${slotAvailability.available ? 'text-green-700' : 'text-red-600'}`}>{selectedTime}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-secondary">Disponibilidad:</span>
                  <span className={`font-semibold ${slotAvailability.available ? 'text-green-700' : 'text-red-600'}`}>
                    {slotAvailability.capacity.available}/{slotAvailability.capacity.max} cupos disponibles
                  </span>
                </div>
                {!slotAvailability.available && (
                  <div className="py-2 bg-red-50 rounded-lg px-3 mt-2">
                    <span className="text-red-700 text-sm font-medium">
                      ⚠️ No hay cupos suficientes para {slotAvailability.requestedParticipants} participantes
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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
        // Menú
        total += menuTotal;
        // Piezas para niños
        if (config.childrenPieces) {
          total += config.childrenPieces.reduce((sum, cp) => sum + cp.piecePrice, 0);
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

  // ============ STEP 5: Confirmación ============
  const renderStepConfirmation = () => {
    const isCelebration = state.experienceType === 'celebration';
    const confirmationCode = state.confirmationCode || `EXP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    
    // Calcular total final
    const calculateFinalTotal = () => {
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
        total += menuTotal;
        if (config.childrenPieces) {
          total += config.childrenPieces.reduce((sum, cp) => sum + cp.piecePrice, 0);
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
    
    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Success Icon */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-success rounded-full mb-4 animate-bounce-once">
            <CheckCircleIcon className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-brand-text mb-2">
            ¡Pre-reserva Confirmada!
          </h2>
          <p className="text-brand-secondary text-sm">
            Revisa tu correo para más detalles
          </p>
        </div>

        {/* Confirmation Code */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-xl p-6 text-center shadow-lg">
          <p className="text-sm opacity-90 mb-2">Tu código de pre-reserva</p>
          <p className="text-4xl font-bold tracking-wider mb-1">{confirmationCode}</p>
          <p className="text-xs opacity-80">Guarda este código para referencia futura</p>
        </div>

        {/* Summary Card */}
        <div className="bg-white border-2 border-brand-border rounded-xl p-6">
          <h3 className="font-bold text-brand-text mb-4 flex items-center gap-2">
            <span className="text-2xl">{isCelebration ? '🎉' : '🎨'}</span>
            Resumen de tu Experiencia
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-brand-border">
              <span className="text-brand-secondary">Tipo:</span>
              <span className="font-semibold text-brand-text">
                {isCelebration ? 'Celebración' : 'Solo Cerámica'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-brand-border">
              <span className="text-brand-secondary">Técnica:</span>
              <span className="font-semibold text-brand-text">
                {TECHNIQUES.find(t => t.id === state.technique)?.name}
              </span>
            </div>
            
            {isCelebration && state.config ? (
              <>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-secondary">Participantes activos:</span>
                  <span className="font-semibold text-brand-text">
                    {(state.config as CelebrationConfig).activeParticipants}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-secondary">Invitados:</span>
                  <span className="font-semibold text-brand-text">
                    {(state.config as CelebrationConfig).guests}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-secondary">Horas de espacio:</span>
                  <span className="font-semibold text-brand-text">
                    {(state.config as CelebrationConfig).hours}h
                  </span>
                </div>
                {selectedDate && selectedTime && (
                  <>
                    <div className="flex justify-between py-2 border-b border-brand-border">
                      <span className="text-brand-secondary">📅 Fecha:</span>
                      <span className="font-semibold text-green-700">
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-brand-border">
                      <span className="text-brand-secondary">🕐 Hora:</span>
                      <span className="font-semibold text-green-700">{selectedTime}</span>
                    </div>
                  </>
                )}
                {menuTotal > 0 && (
                  <div className="flex justify-between py-2 border-b border-brand-border">
                    <span className="text-brand-secondary">Menú:</span>
                    <span className="font-semibold text-brand-text">
                      ${menuTotal.toFixed(2)}
                    </span>
                  </div>
                )}
                {(state.config as CelebrationConfig).childrenPieces && (state.config as CelebrationConfig).childrenPieces.length > 0 && (
                  <div className="flex justify-between py-2 border-b border-brand-border">
                    <span className="text-brand-secondary">Piezas para niños:</span>
                    <span className="font-semibold text-brand-text">
                      ${(state.config as CelebrationConfig).childrenPieces.reduce((sum, cp) => sum + cp.piecePrice, 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-secondary">Participantes:</span>
                  <span className="font-semibold text-brand-text">
                    {(state.config as CeramicOnlyConfig)?.participants}
                  </span>
                </div>
                {selectedDate && selectedTime && (
                  <>
                    <div className="flex justify-between py-2 border-b border-brand-border">
                      <span className="text-brand-secondary">📅 Fecha:</span>
                      <span className="font-semibold text-green-700">
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-brand-border">
                      <span className="text-brand-secondary">🕐 Hora:</span>
                      <span className="font-semibold text-green-700">{selectedTime}</span>
                    </div>
                  </>
                )}
              </>
            )}
            
            <div className="flex justify-between py-3 pt-4 border-t-2 border-brand-primary">
              <span className="font-bold text-brand-text text-lg">Total Estimado:</span>
              <span className="font-bold text-brand-accent text-2xl">
                ${calculateFinalTotal()}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        {userInfo && (
          <div className="bg-gray-50 border border-brand-border rounded-xl p-5">
            <h4 className="font-semibold text-brand-text mb-3 text-sm">Datos de Contacto</h4>
            <div className="space-y-2 text-sm">
              <p className="text-brand-secondary">
                <span className="font-medium text-brand-text">{userInfo.firstName} {userInfo.lastName}</span>
              </p>
              <p className="text-brand-secondary">{userInfo.email}</p>
              <p className="text-brand-secondary">{userInfo.phone}</p>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">📋 Próximos Pasos</h4>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Recibirás un email de confirmación con los detalles</li>
            <li>Te contactaremos por WhatsApp en las próximas 24 horas</li>
            <li>Coordinaremos la fecha y hora exacta según tu disponibilidad</li>
            <li>Te enviaremos las instrucciones de pago</li>
          </ol>
        </div>

        {/* Action Button */}
        <div className="text-center pt-4">
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="px-8 py-3 bg-brand-primary text-white rounded-lg font-bold hover:bg-brand-accent transition-all shadow-md hover:shadow-lg"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
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
      currentStep: Math.min(prev.currentStep + 1, 5) as any,
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

  const handleConfirm = async () => {
    if (!userInfo || !selectedDate || !selectedTime || !state.technique) {
      console.error('Missing required info for booking');
      return;
    }

    // Construir objeto CustomExperienceBooking
    const booking: CustomExperienceBooking = {
      experienceType: state.experienceType,
      technique: state.technique,
      date: selectedDate,
      time: selectedTime,
      participants: state.experienceType === 'celebration' 
        ? (state.config as CelebrationConfig)?.activeParticipants || 0
        : (state.config as CeramicOnlyConfig)?.participants || 0,
      config: state.config!,
      userInfo: userInfo,
      totalPrice: parseFloat(calculateTotalPricing()),
      menuSelections: state.menuSelections,
      childrenPieces: state.experienceType === 'celebration' 
        ? (state.config as CelebrationConfig)?.childrenPieces || []
        : undefined
    };

    onConfirm(booking);
  };

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
      total += menuTotal;
      if (config.childrenPieces) {
        total += config.childrenPieces.reduce((sum, cp) => sum + cp.piecePrice, 0);
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
  
  const handleUserInfoSubmit = (data: { userInfo: UserInfo; needsInvoice: boolean; invoiceData?: any; acceptedNoRefund?: boolean }) => {
    setUserInfo(data.userInfo);
    setState(prev => ({ ...prev, currentStep: 5 }));
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8">
      {/* Progress Indicator */}
      <ProgressIndicator currentStep={state.currentStep} totalSteps={5} stepTitles={STEP_TITLES} />

      {/* Step Content - Solo mostrar contenedor si NO es Step 4 */}
      {state.currentStep !== 4 && (
        <div className="bg-brand-surface rounded-2xl shadow-subtle p-6 sm:p-8 mb-6">
          {state.currentStep === 1 && renderStepActivityType()}
          {state.currentStep === 2 && renderStepConfiguration()}
          {state.currentStep === 3 && renderStepDateTime()}
          {state.currentStep === 5 && renderStepConfirmation()}
        </div>
      )}
      
      {/* UserInfoModal - Renderizado como overlay completo en Step 4 */}
      {state.currentStep === 4 && (
        <UserInfoModal
          onClose={handlePrevious}
          onSubmit={handleUserInfoSubmit}
          onShowPolicies={() => {
            window.open('/politicas', '_blank');
          }}
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
          {state.currentStep === 5 && (
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-brand-success text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              {isLoading ? 'Procesando...' : '✓ Confirmar Reserva'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
