import React, { useEffect, useMemo, useState } from 'react';
import type { ExperiencePricing, Piece, TimeSlot } from '../../types';
import { DateTimeSelector } from './DateTimeSelector';
import type { AvailableSlotResult } from '../../services/dataService';

interface PaintingBookingFlowProps {
  pieces: Piece[];
  onConfirm: (pricing: ExperiencePricing, selectedSlot: TimeSlot) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const PaintingBookingFlow: React.FC<PaintingBookingFlowProps> = ({
  pieces,
  onConfirm,
  onBack,
  isLoading = false
}) => {
  const [participants, setParticipants] = useState<number>(1);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlotResult | null>(null);
  const [error, setError] = useState<string>('');

  const activePieces = useMemo(() => pieces.filter(piece => piece.isActive), [pieces]);
  const selectedPiece = useMemo(
    () => activePieces.find(piece => piece.id === selectedPieceId) || null,
    [activePieces, selectedPieceId]
  );

  useEffect(() => {
    setSelectedSlot(null);
  }, [participants]);

  const pricing = useMemo<ExperiencePricing | null>(() => {
    if (!selectedPiece) return null;
    const subtotal = selectedPiece.basePrice * participants;
    return {
      pieces: [
        {
          pieceId: selectedPiece.id,
          pieceName: selectedPiece.name,
          basePrice: selectedPiece.basePrice,
          quantity: participants
        }
      ],
      guidedOption: 'none',
      subtotalPieces: subtotal,
      total: subtotal
    };
  }, [participants, selectedPiece]);

  const handleConfirm = () => {
    if (!selectedPiece) {
      setError('Por favor selecciona una pieza para pintar');
      return;
    }
    if (!selectedSlot) {
      setError('Por favor selecciona un horario disponible');
      return;
    }
    if (!pricing) {
      setError('Error al calcular el precio');
      return;
    }

    setError('');
    onConfirm(pricing, {
      date: selectedSlot.date,
      time: selectedSlot.time,
      instructorId: selectedSlot.instructorId
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-brand-text">🎨 Reserva tu clase de Pintado a Mano</h2>
        <p className="text-brand-secondary mt-1">Selecciona participantes, pieza y horario disponible.</p>
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
              onClick={() => setParticipants(prev => Math.min(30, prev + 1))}
              className="w-10 h-10 rounded-lg border border-brand-border text-lg font-bold text-brand-text hover:bg-brand-background"
              aria-label="Aumentar participantes"
            >
              +
            </button>
            <span className="text-sm text-brand-secondary">Máximo 30 personas</span>
          </div>
        </div>

        <div className="bg-white border border-brand-border rounded-xl p-4">
          <h3 className="font-semibold text-brand-text mb-3">Elige tu pieza</h3>
          {activePieces.length === 0 ? (
            <p className="text-sm text-brand-secondary">No hay piezas activas para pintar.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {activePieces.map(piece => (
                <button
                  key={piece.id}
                  type="button"
                  onClick={() => setSelectedPieceId(piece.id)}
                  className={`border-2 rounded-lg p-3 text-left transition-all ${
                    selectedPieceId === piece.id
                      ? 'border-brand-primary bg-blue-50'
                      : 'border-brand-border hover:border-brand-primary/60'
                  }`}
                >
                  {piece.imageUrl && (
                    <img
                      src={piece.imageUrl}
                      alt={piece.name}
                      className="w-full h-20 object-cover rounded-md mb-2"
                    />
                  )}
                  <div className="font-semibold text-brand-text">{piece.name}</div>
                  <div className="text-sm text-brand-primary font-bold">${piece.basePrice}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-brand-border rounded-xl p-4">
          <DateTimeSelector
            technique="painting"
            participants={participants}
            selectedSlot={selectedSlot ? { date: selectedSlot.date, time: selectedSlot.time } : null}
            onSelectSlot={(slot) => {
              setSelectedSlot(slot);
              setError('');
            }}
          />
        </div>

        {pricing && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex justify-between text-sm text-brand-secondary">
              <span>{selectedPiece?.name}</span>
              <span>${selectedPiece?.basePrice} x {participants}</span>
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
