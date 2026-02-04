import React, { useEffect, useMemo, useState } from 'react';
import type { ExperiencePricing, TimeSlot } from '../../types';
import type { SlotAvailabilityResult } from '../../services/dataService';
import { FreeDateTimePicker } from './FreeDateTimePicker';

interface PaintingBookingFlowProps {
  onConfirm: (pricing: ExperiencePricing, selectedSlot: TimeSlot) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const PaintingBookingFlow: React.FC<PaintingBookingFlowProps> = ({
  onConfirm,
  onBack,
  isLoading = false
}) => {
  const [participants, setParticipants] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedAvailability, setSelectedAvailability] = useState<SlotAvailabilityResult | null>(null);
  const [error, setError] = useState<string>('');

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

  useEffect(() => {
    setSelectedTime(null);
    setSelectedAvailability(null);
  }, [participants, selectedDate]);

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) {
      setError('Por favor selecciona un horario disponible');
      return;
    }
    if (!pricing) {
      setError('Error al calcular el precio');
      return;
    }
    if (selectedAvailability && selectedAvailability.available === false) {
      setError('Ese horario ya no tiene cupos. Por favor selecciona otro.');
      return;
    }

    setError('');
    onConfirm(pricing, { date: selectedDate, time: selectedTime, instructorId: 0 });
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
            <p className="text-sm text-brand-secondary">Usa el mismo calendario y validaciones del schedule general.</p>
          </div>

          <FreeDateTimePicker
            technique="painting"
            participants={participants}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setSelectedTime(null);
              setSelectedAvailability(null);
              setError('');
            }}
            onSelectTime={(time, availability) => {
              setSelectedTime(time);
              setSelectedAvailability(availability || null);
              setError('');
            }}
          />
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
