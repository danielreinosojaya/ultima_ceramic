import React, { useState, useEffect } from 'react';
import type { TimeSlot, ExperiencePricing, AppData } from '../../types';
import * as dataService from '../../services/dataService';
import { SocialBadge } from '../SocialBadge';

export interface RumcomBookingProps {
  appData?: AppData | null;
  availableSlots?: TimeSlot[];
  onConfirm: (pricing: ExperiencePricing, selectedSlot: TimeSlot | null, technique: 'hand_modeling') => void;
  onBack: () => void;
  isLoading?: boolean;
}

const EVENT_DATE = '2026-04-30';
const EVENT_TIME = '17:00';
const EVENT_PRICE = 45;
const EVENT_TECHNIQUE = 'hand_modeling' as const;
const EVENT_TECHNIQUE_LABEL = 'Pintura de piezas';
const EVENT_MAX_CAPACITY = 20;

/**
 * RumcomBooking - Exclusive landing + booking for "Spill the Tea x Rum-Com Club"
 * Locked to: hand_modeling, April 30 2026, 17:00, $45/person
 * Steps: Landing → Confirm → UserInfoModal (handled by App.tsx)
 */
export const RumcomBooking: React.FC<RumcomBookingProps> = ({
  appData,
  availableSlots = [],
  onConfirm,
  onBack,
  isLoading = false,
}) => {
  const [step, setStep] = useState<'landing' | 'confirm'>('landing');
  const [slotAvailability, setSlotAvailability] = useState<{
    available: number;
    total: number;
    canBook: boolean;
    message?: string;
  } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [error, setError] = useState('');

  // Check real-time availability for the fixed slot
  useEffect(() => {
    const checkAvailability = async () => {
      setCheckingAvailability(true);
      try {
        const result = await dataService.checkSlotAvailability(
          EVENT_DATE,
          EVENT_TIME,
          EVENT_TECHNIQUE,
          1,
          { skipTechRestriction: true }
        );
        // Calculate booked count against EVENT_MAX_CAPACITY (20 fixed for this event)
        const dbMax = result.capacity?.max ?? EVENT_MAX_CAPACITY;
        const dbBooked = dbMax - (result.capacity?.available ?? 0);
        const eventAvailable = Math.max(0, EVENT_MAX_CAPACITY - dbBooked);
        setSlotAvailability({
          available: eventAvailable,
          total: EVENT_MAX_CAPACITY,
          canBook: result.available && eventAvailable > 0,
          message: result.message,
        });
      } catch (err) {
        console.error('[RumcomBooking] Error checking availability:', err);
        setSlotAvailability({
          available: 0,
          total: EVENT_MAX_CAPACITY,
          canBook: false,
          message: 'Error verificando disponibilidad',
        });
      } finally {
        setCheckingAvailability(false);
      }
    };
    checkAvailability();
  }, []);

  const handleReserve = () => {
    if (!slotAvailability?.canBook) {
      setError('Lo sentimos, no hay cupos disponibles para este evento.');
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = () => {
    const pricing: ExperiencePricing = {
      pieces: [],
      guidedOption: 'none',
      subtotalPieces: EVENT_PRICE,
      total: EVENT_PRICE,
    };

    const slot: TimeSlot = {
      date: EVENT_DATE,
      time: EVENT_TIME,
      instructorId: 0,
    };

    onConfirm(pricing, slot, EVENT_TECHNIQUE);
  };

  return (
    <div className="min-h-screen bg-[#FAF5EE]">
      {/* Hero Section */}
      <div className="relative overflow-hidden" style={{ minHeight: '340px', background: '#1a1209' }}>
        <img
          src="/images/events/spill-the-tea.jpg"
          alt="Spill the Tea x Rum-Com Club"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(15,8,2,0.95) 0%, rgba(15,8,2,0.4) 50%, transparent 100%)' }}
        />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-10 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'rgba(250,245,238,0.15)', color: '#FAF5EE', backdropFilter: 'blur(8px)' }}
        >
          ← Volver
        </button>

        <div className="relative z-10 p-6 pt-16 flex flex-col justify-end" style={{ minHeight: '340px' }}>
          <span
            className="self-start text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-3"
            style={{ background: '#C4704E', color: '#FAF5EE' }}
          >
            Evento Exclusivo
          </span>
          <h1 className="text-3xl font-bold mb-2 leading-tight" style={{ color: '#FAF5EE' }}>
            Spill the Tea x<br />Rum-Com Club
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(250,245,238,0.7)' }}>
            Una tarde de conversaciones, cerámica y buena vibra junto al Rum-Com Club.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Step: Landing */}
        {step === 'landing' && (
          <>
            {/* Event Details Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-bold text-[#3D2410]">Detalles del Evento</h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FAF5EE] rounded-xl p-3">
                  <p className="text-xs text-[#A08060] font-medium">Fecha</p>
                  <p className="text-sm font-bold text-[#3D2410]">Jueves, 30 Abril 2026</p>
                </div>
                <div className="bg-[#FAF5EE] rounded-xl p-3">
                  <p className="text-xs text-[#A08060] font-medium">Hora</p>
                  <p className="text-sm font-bold text-[#3D2410]">5:00 PM</p>
                </div>
                <div className="bg-[#FAF5EE] rounded-xl p-3">
                  <p className="text-xs text-[#A08060] font-medium">Duración</p>
                  <p className="text-sm font-bold text-[#3D2410]">2 horas</p>
                </div>
                <div className="bg-[#FAF5EE] rounded-xl p-3">
                  <p className="text-xs text-[#A08060] font-medium">Técnica</p>
                  <p className="text-sm font-bold text-[#3D2410]">{EVENT_TECHNIQUE_LABEL}</p>
                </div>
              </div>

              <div className="bg-[#FAF5EE] rounded-xl p-3">
                <p className="text-xs text-[#A08060] font-medium">Precio</p>
                <p className="text-2xl font-bold text-[#C4704E]">${EVENT_PRICE} <span className="text-sm font-normal text-[#A08060]">por persona</span></p>
              </div>

              {/* Availability */}
              <div className="bg-[#FAF5EE] rounded-xl p-3">
                <p className="text-xs text-[#A08060] font-medium mb-1">Disponibilidad</p>
                {checkingAvailability ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#C4704E] animate-pulse" />
                    <span className="text-sm text-[#7A5C45]">Verificando cupos...</span>
                  </div>
                ) : slotAvailability ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-[#3D2410]">
                        {slotAvailability.canBook
                          ? `${slotAvailability.available} cupos disponibles`
                          : 'Sin cupos disponibles'}
                      </span>
                      <SocialBadge
                        currentCount={slotAvailability.total - slotAvailability.available}
                        maxCapacity={slotAvailability.total}
                        variant="compact"
                      />
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-gray-200">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${((slotAvailability.total - slotAvailability.available) / slotAvailability.total) * 100}%`,
                          background: slotAvailability.available <= 3 ? '#C4704E' : '#6B8C6B',
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* What to expect */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-[#3D2410] mb-3">¿Qué incluye este spill the tea?</h2>
              <ul className="space-y-2 text-sm text-[#7A5C45]">
                <li className="flex items-start gap-2">
                  <span className="text-[#C4704E] mt-0.5">🫖</span>
                  <span>Estación de té por <strong>@seitea.ec</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C4704E] mt-0.5">🍓</span>
                  <span>Piqueos de <strong>@santoverde.ec</strong> y dulces de <strong>@milmundos.ec</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C4704E] mt-0.5">🕯️</span>
                  <span>Tu velita personal de <strong>@velasamaru.ec</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C4704E] mt-0.5">🌸</span>
                  <span>Decoración por <strong>@violetagye</strong> y <strong>@blancrentals</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C4704E] mt-0.5">☕️</span>
                  <span><strong>@coffeebreak</strong> — coffee cart con 5 variaciones de café y matcha!</span>
                </li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleReserve}
              disabled={isLoading || checkingAvailability || !slotAvailability?.canBook}
              className="w-full py-4 rounded-xl text-base font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#C4704E', color: '#FAF5EE' }}
            >
              {checkingAvailability
                ? 'Verificando disponibilidad...'
                : !slotAvailability?.canBook
                ? 'Sin cupos disponibles'
                : 'Reservar mi lugar — $45'}
            </button>
          </>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-xl font-bold text-[#3D2410]">✓ Confirma tu Reserva</h2>
              <p className="text-sm text-[#7A5C45]">Revisa los detalles antes de continuar</p>

              <div className="space-y-3">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-[#7A5C45]">Evento</span>
                  <span className="text-sm font-bold text-[#3D2410]">Spill the Tea x Rum-Com Club</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-[#7A5C45]">Técnica</span>
                  <span className="text-sm font-bold text-[#3D2410]">{EVENT_TECHNIQUE_LABEL}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-[#7A5C45]">Fecha y hora</span>
                  <span className="text-sm font-bold text-[#3D2410]">30 Abril 2026 · 5:00 PM</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-[#7A5C45]">Duración</span>
                  <span className="text-sm font-bold text-[#3D2410]">2 horas</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-[#7A5C45]">Personas</span>
                  <span className="text-sm font-bold text-[#3D2410]">1</span>
                </div>
                <div className="flex justify-between pt-4">
                  <span className="text-base font-bold text-[#3D2410]">Total a Pagar</span>
                  <span className="text-2xl font-bold text-[#C4704E]">${EVENT_PRICE}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('landing')}
                className="px-5 py-3 rounded-xl border border-gray-300 text-sm font-medium text-[#7A5C45] hover:bg-gray-50 transition-colors"
              >
                ← Atrás
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl text-base font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                style={{ background: '#C4704E', color: '#FAF5EE' }}
              >
                {isLoading ? 'Procesando...' : 'Confirmar y Continuar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RumcomBooking;
