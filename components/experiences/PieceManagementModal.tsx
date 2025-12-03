import React, { useState } from 'react';
import type { Piece } from '../../types';

export interface PieceManagementModalProps {
  pieces: Piece[];
  onAddPiece: (piece: Omit<Piece, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdatePiece: (id: string, updates: Partial<Piece>) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export const PieceManagementModal: React.FC<PieceManagementModalProps> = ({
  pieces,
  onAddPiece,
  onUpdatePiece,
  onClose,
  isLoading = false
}) => {
  const [tab, setTab] = useState<'list' | 'add' | 'edit'>('list');
  const [editingPiece, setEditingPiece] = useState<Piece | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    basePrice: 0,
    estimatedHours: 0,
    imageUrl: '',
    sortOrder: 0
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleAddNew = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      basePrice: 0,
      estimatedHours: 0,
      imageUrl: '',
      sortOrder: pieces.length
    });
    setEditingPiece(null);
    setTab('add');
    setError('');
  };

  const handleEditPiece = (piece: Piece) => {
    setFormData({
      name: piece.name,
      description: piece.description || '',
      category: piece.category || '',
      basePrice: piece.basePrice,
      estimatedHours: piece.estimatedHours || 0,
      imageUrl: piece.imageUrl || '',
      sortOrder: piece.sortOrder
    });
    setEditingPiece(piece);
    setTab('edit');
    setError('');
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.basePrice <= 0) {
      setError('Nombre y precio son requeridos');
      return;
    }

    try {
      if (editingPiece) {
        await onUpdatePiece(editingPiece.id, formData);
        setSuccess('Pieza actualizada exitosamente');
      } else {
        await onAddPiece({
          ...formData,
          isActive: true
        } as any);
        setSuccess('Pieza creada exitosamente');
      }
      setError('');
      setTimeout(() => {
        setTab('list');
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la pieza');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Gestionar Piezas</h2>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 p-4 border-b bg-gray-50">
          <button
            onClick={() => setTab('list')}
            className={`px-4 py-2 rounded ${
              tab === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Listado
          </button>
          <button
            onClick={handleAddNew}
            className={`px-4 py-2 rounded ${
              tab === 'add' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            + Nueva Pieza
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">{error}</div>}
          {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4">{success}</div>}

          {/* List Tab */}
          {tab === 'list' && (
            <div className="space-y-3">
              {pieces.length > 0 ? (
                pieces.map((piece) => (
                  <div key={piece.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold">{piece.name}</h3>
                        {piece.description && <p className="text-sm text-gray-600">{piece.description}</p>}
                        <div className="flex gap-4 mt-2 text-sm">
                          {piece.category && <span className="text-gray-500">{piece.category}</span>}
                          <span className="font-bold text-blue-600">${piece.basePrice}</span>
                          {piece.estimatedHours && <span className="text-gray-500">~{piece.estimatedHours}h</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEditPiece(piece)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 text-center py-8">No hay piezas. Crea la primera.</p>
              )}
            </div>
          )}

          {/* Add/Edit Tab */}
          {(tab === 'add' || tab === 'edit') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: Taza Personalizada"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Describe la pieza"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Ej: Tazas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Precio Base *</label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Horas Estimadas</label>
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="0"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Orden de Visualización</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">URL de Imagen</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setTab('list')}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Guardando...' : tab === 'edit' ? 'Actualizar' : 'Crear Pieza'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PieceManagementModal;
