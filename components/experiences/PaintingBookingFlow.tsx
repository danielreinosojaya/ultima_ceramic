import React, { useEffect, useState } from 'react';
import type { SlotAvailabilityResult } from '../../services/dataService';
import { FreeDateTimePicker } from './FreeDateTimePicker';
import * as dataService from '../../services/dataService';

interface PaintingBookingFlowProps {
  deliveryId: string | null;
  onBack: () => void;
  isLoading?: boolean;
}

export const PaintingBookingFlow: React.FC<PaintingBookingFlowProps> = ({
  deliveryId,
  onBack,
  isLoading = false
}) => {
  const [participants, setParticipants] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedAvailability, setSelectedAvailability] = useState<SlotAvailabilityResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    setSelectedTime(null);
    setSelectedAvailability(null);
  }, [participants, selectedDate]);

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) {
      setError('Por favor selecciona un horario disponible');
      return;
    }
    if (selectedAvailability && selectedAvailability.available === false) {
      setError('Ese horario ya no tiene cupos. Por favor selecciona otro.');
      return;
    }
    if (!deliveryId) {
      setError('Link inválido o incompleto. Por favor revisa tu correo y vuelve a intentar.');
      return;
    }

    setError('');
    setShowConfirmModal(true);
  };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime || !deliveryId) return;

    setIsSubmitting(true);
    setError('');
    try {
      const result = await dataService.schedulePaintingBooking({
        deliveryId,
        date: selectedDate,
        time: selectedTime,
        participants
      });

      if (!result?.success) {
        setError(result?.error || 'No se pudo agendar la reserva. Inténtalo nuevamente.');
        setShowConfirmModal(false);
        return;
      }

      setShowConfirmModal(false);
      setSuccessMessage('✅ Reserva de pintura confirmada. Te enviamos un correo con los detalles.');
    } catch (err) {
      console.error('[PaintingBookingFlow] Error scheduling:', err);
      setError('No se pudo agendar la reserva. Inténtalo nuevamente.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-brand-text">🎨 Reserva tu clase de Pintado a Mano</h2>
        <p className="text-brand-secondary mt-1">Selecciona participantes y horario disponible.</p>
      </div>

      {!deliveryId && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 font-semibold">
            Este link no contiene el identificador de tu entrega. Revisa el correo y vuelve a ingresar desde allí.
          </p>
        </div>
      )}

      <div className="grid gap-6">
        <div className="bg-white border border-brand-border rounded-xl p-4">
          <h3 className="font-semibold text-brand-text mb-3">Participantes</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="number"
              min={1}
              max={22}
              step={1}
              value={participants}
              onChange={(e) => {
                const next = Math.max(1, Math.min(22, parseInt(e.target.value || '1', 10)));
                setParticipants(Number.isNaN(next) ? 1 : next);
              }}
              className="appearance-none w-full sm:w-32 px-3 py-2 rounded-lg border border-brand-border text-brand-text font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
              aria-label="Número de participantes"
            />
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

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-green-800 font-semibold">{successMessage}</p>
            <button
              type="button"
              onClick={onBack}
              className="mt-3 px-4 py-2 rounded-lg border border-brand-border text-brand-text hover:bg-brand-background"
            >
              Volver al inicio
            </button>
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
          {!successMessage && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-60"
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>

      {showConfirmModal && selectedDate && selectedTime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-brand-text mb-2">Confirmar reserva de pintura</h3>
            <p className="text-sm text-brand-secondary mb-4">
              Esta reserva ya está pagada. Solo confirmaremos tu horario.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-brand-text space-y-1">
              <div><strong>Fecha:</strong> {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div><strong>Hora:</strong> {selectedTime}</div>
              <div><strong>Participantes:</strong> {participants}</div>
            </div>
            {error && (
              <div className="mt-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3">
                <p className="text-red-800 font-semibold">{error}</p>
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-brand-border text-brand-text hover:bg-brand-background"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSchedule}
                className="flex-1 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-60"
                disabled={isSubmitting}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
