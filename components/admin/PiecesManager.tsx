import React, { useState, useEffect, useCallback } from 'react';
import * as dataService from '../../services/dataService';
import { PlusIcon } from '../icons/PlusIcon';
import { EditIcon } from '../icons/EditIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { PieceModal } from './PieceModal.js';

interface Piece {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  basePrice: number;
  estimatedHours: number | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface PiecesManagerProps {
  onDataChange: () => void;
}

export const PiecesManager: React.FC<PiecesManagerProps> = ({ onDataChange }) => {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pieceToEdit, setPieceToEdit] = useState<Piece | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pieceToDelete, setPieceToDelete] = useState<Piece | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Load pieces on mount
  useEffect(() => {
    loadPieces();
  }, []);

  const loadPieces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataService.listPieces();
      console.log('[PiecesManager] Loaded pieces from API:', data);
      // Ensure basePrice and estimatedHours are numbers
      const normalizedData = (data || []).map((piece: any) => ({
        ...piece,
        basePrice: typeof piece.basePrice === 'string' ? parseFloat(piece.basePrice) : piece.basePrice,
        estimatedHours: piece.estimatedHours ? (typeof piece.estimatedHours === 'string' ? parseFloat(piece.estimatedHours) : piece.estimatedHours) : null,
      }));
      console.log('[PiecesManager] Normalized data:', normalizedData);
      setPieces(normalizedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando piecitas');
      console.error('Error loading pieces:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenAddModal = () => {
    setPieceToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (piece: Piece) => {
    setPieceToEdit(piece);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (piece: Piece) => {
    setPieceToDelete(piece);
    setIsDeleteModalOpen(true);
  };

  const handleSavePiece = async (pieceData: Omit<Piece, 'id' | 'createdAt'>) => {
    try {
      if (pieceToEdit) {
        // Update existing piece
        await dataService.updatePiece(pieceToEdit.id, {
          name: pieceData.name,
          description: pieceData.description,
          category: pieceData.category,
          basePrice: pieceData.basePrice,
          estimatedHours: pieceData.estimatedHours,
          imageUrl: pieceData.imageUrl,
          sortOrder: pieceData.sortOrder,
        });
      } else {
        // Create new piece
        await dataService.createPiece({
          name: pieceData.name,
          description: pieceData.description,
          category: pieceData.category,
          basePrice: pieceData.basePrice,
          estimatedHours: pieceData.estimatedHours,
          imageUrl: pieceData.imageUrl,
          sortOrder: pieceData.sortOrder,
        });
      }
      setIsModalOpen(false);
      await loadPieces();
      // Don't call onDataChange() - pieces are independent from admin data context
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando piecita');
      console.error('Error saving piece:', err);
    }
  };

  const handleDeletePiece = async () => {
    if (!pieceToDelete) return;
    
    try {
      // Since there's no explicit delete endpoint, we'll deactivate
      await dataService.updatePiece(pieceToDelete.id, { isActive: false });
      setIsDeleteModalOpen(false);
      setPieceToDelete(null);
      await loadPieces();
      // Don't call onDataChange() - pieces are independent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando piecita');
      console.error('Error deleting piece:', err);
    }
  };

  const handleToggleActive = async (piece: Piece) => {
    try {
      await dataService.updatePiece(piece.id, { isActive: !piece.isActive });
      await loadPieces();
      // Don't call onDataChange() - pieces are independent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando estado');
      console.error('Error toggling piece status:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <p className="text-brand-secondary">Cargando piecitas...</p>
      </div>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(pieces.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPieces = pieces.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-brand-accent">Gestión de Piecitas para Pintar</h2>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Agregar Piecita
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {pieces.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-brand-secondary mb-4">No hay piecitas registradas</p>
          <button
            onClick={handleOpenAddModal}
            className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors"
          >
            Crear Primera Piecita
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPieces.map((piece) => (
            <div
              key={piece.id}
              className={`border rounded-lg p-4 transition-all ${
                piece.isActive
                  ? 'border-brand-accent bg-white'
                  : 'border-gray-300 bg-gray-50 opacity-60'
              }`}
            >
              <div className="w-full h-40 rounded mb-3 bg-gradient-to-br from-brand-background to-brand-accent/10 flex items-center justify-center overflow-hidden">
                {piece.imageUrl ? (
                  <img
                    src={piece.imageUrl}
                    alt={piece.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <svg className="w-12 h-12 text-brand-accent/30 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-brand-accent/50">Sin imagen</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-brand-accent">{piece.name}</h3>
                {piece.description && (
                  <p className="text-sm text-brand-secondary">{piece.description}</p>
                )}
                {piece.category && (
                  <p className="text-xs bg-brand-background text-brand-secondary px-2 py-1 rounded w-fit">
                    {piece.category}
                  </p>
                )}
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-brand-secondary">Precio Base</p>
                    <p className="text-lg font-bold text-brand-accent">
                      ${piece.basePrice.toFixed(2)}
                    </p>
                  </div>
                  {piece.estimatedHours && (
                    <p className="text-xs text-brand-secondary">
                      ~{piece.estimatedHours}h
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={piece.isActive}
                    onChange={() => handleToggleActive(piece)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-brand-secondary">
                    {piece.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </label>
                <button
                  onClick={() => handleOpenEditModal(piece)}
                  className="p-2 text-brand-primary hover:bg-brand-background rounded transition-colors"
                  title="Editar"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenDeleteModal(piece)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Eliminar"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {pieces.length > itemsPerPage && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-6 py-4 bg-brand-background rounded-lg">
            <div className="text-sm text-brand-secondary">
              Mostrando {startIndex + 1}-{Math.min(endIndex, pieces.length)} de {pieces.length} piezas
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm font-semibold rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Primera
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm font-semibold rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              
              {/* Smart pagination: show max 7 page buttons */}
              <div className="flex items-center gap-1">
                {(() => {
                  const maxButtons = 7;
                  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
                  
                  // Adjust if we're near the end
                  if (endPage - startPage < maxButtons - 1) {
                    startPage = Math.max(1, endPage - maxButtons + 1);
                  }
                  
                  const pageButtons = [];
                  
                  // First page + ellipsis if needed
                  if (startPage > 1) {
                    pageButtons.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className="px-3 py-1 text-sm font-semibold rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pageButtons.push(
                        <span key="ellipsis-start" className="px-2 text-gray-400">...</span>
                      );
                    }
                  }
                  
                  // Page buttons
                  for (let i = startPage; i <= endPage; i++) {
                    pageButtons.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-1 text-sm font-semibold rounded transition-colors ${
                          currentPage === i
                            ? 'bg-brand-primary text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  
                  // Last page + ellipsis if needed
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pageButtons.push(
                        <span key="ellipsis-end" className="px-2 text-gray-400">...</span>
                      );
                    }
                    pageButtons.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-3 py-1 text-sm font-semibold rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  
                  return pageButtons;
                })()}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm font-semibold rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm font-semibold rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Última →
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {isModalOpen && (
        <PieceModal
          piece={pieceToEdit}
          onSave={handleSavePiece}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isDeleteModalOpen && pieceToDelete && (
        <DeleteConfirmationModal
          isOpen={true}
          title="Eliminar Piecita"
          message={`¿Está seguro de que desea eliminar la piecita "${pieceToDelete.name}"?`}
          onConfirm={handleDeletePiece}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setPieceToDelete(null);
          }}
        />
      )}
    </div>
  );
};
