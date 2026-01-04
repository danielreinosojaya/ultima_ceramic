import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { Piece } from '../../types/types';

interface ChildPieceSelection {
  childNumber: number;
  pieceId: number | null;
  pieceName: string;
  piecePrice: number;
}

interface ChildPieceSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  pieces: Piece[];
  childrenCount: number;
  onConfirm: (selections: ChildPieceSelection[]) => void;
  existingSelections?: ChildPieceSelection[];
}

const MINIMUM_PIECE_PRICE = 18;

export function ChildPieceSelector({
  isOpen,
  onClose,
  pieces,
  childrenCount,
  onConfirm,
  existingSelections = []
}: ChildPieceSelectorProps) {
  const [selections, setSelections] = useState<ChildPieceSelection[]>([]);

  useEffect(() => {
    if (existingSelections.length > 0) {
      setSelections(existingSelections);
    } else {
      // Inicializar con array vacío para cada niño
      const initialSelections: ChildPieceSelection[] = Array.from({ length: childrenCount }, (_, i) => ({
        childNumber: i + 1,
        pieceId: null,
        pieceName: '',
        piecePrice: 0
      }));
      setSelections(initialSelections);
    }
  }, [childrenCount, existingSelections]);

  const eligiblePieces = pieces.filter(p => p.price >= MINIMUM_PIECE_PRICE);

  const handleSelectPiece = (childIndex: number, piece: Piece) => {
    const newSelections = [...selections];
    newSelections[childIndex] = {
      childNumber: childIndex + 1,
      pieceId: piece.id,
      pieceName: piece.name,
      piecePrice: piece.price
    };
    setSelections(newSelections);
  };

  const handleConfirm = () => {
    // Validar que todos los niños tengan una pieza seleccionada
    const allSelected = selections.every(s => s.pieceId !== null);
    if (!allSelected) {
      alert('Por favor selecciona una pieza para cada niño');
      return;
    }
    onConfirm(selections);
    onClose();
  };

  const totalPriceForChildren = selections.reduce((sum, sel) => sum + sel.piecePrice, 0);
  const allSelected = selections.every(s => s.pieceId !== null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-brand-primary text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Selección de Piezas para Niños</h2>
            <p className="text-sm text-white/80 mt-1">
              Selecciona una pieza para cada niño (mínimo ${MINIMUM_PIECE_PRICE})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Resumen */}
        <div className="bg-brand-accent/10 border-b border-brand-border p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-brand-text/60">Niños en la celebración</p>
              <p className="text-xl font-bold text-brand-primary">{childrenCount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-brand-text/60">Total piezas niños</p>
              <p className="text-xl font-bold text-brand-accent">${totalPriceForChildren.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-280px)] p-6">
          <div className="space-y-6">
            {Array.from({ length: childrenCount }, (_, i) => {
              const selection = selections[i];
              return (
                <div key={i} className="border border-brand-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg text-brand-text">Niño {i + 1}</h3>
                    {selection?.pieceId && (
                      <div className="bg-brand-success/10 text-brand-success px-3 py-1 rounded-full text-sm font-medium">
                        {selection.pieceName} - ${selection.piecePrice}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {eligiblePieces.map(piece => {
                      const isSelected = selection?.pieceId === piece.id;
                      return (
                        <button
                          key={piece.id}
                          onClick={() => handleSelectPiece(i, piece)}
                          className={`relative p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                              : 'border-brand-border hover:border-brand-primary/30 bg-white'
                          }`}
                        >
                          <div className="aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                            <span className="text-3xl">{piece.emoji || '🎨'}</span>
                          </div>
                          <p className="text-xs font-medium text-brand-text text-center">
                            {piece.name}
                          </p>
                          <p className="text-sm font-bold text-brand-accent text-center mt-1">
                            ${piece.price}
                          </p>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-brand-border p-6 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white border border-brand-border text-brand-text rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!allSelected}
              className={`flex-1 px-6 py-3 rounded-lg font-bold transition-colors ${
                allSelected
                  ? 'bg-brand-primary text-white hover:bg-brand-primary/90'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Confirmar Selección (${totalPriceForChildren.toFixed(2)})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
