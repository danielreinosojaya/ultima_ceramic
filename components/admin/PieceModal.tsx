import React, { useState, useEffect, useRef } from 'react';

interface PieceModalProps {
  piece: {
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
  } | null;
  onSave: (data: {
    name: string;
    description: string | null;
    category: string | null;
    basePrice: number;
    estimatedHours: number | null;
    imageUrl: string | null;
    isActive: boolean;
    sortOrder: number;
  }) => Promise<void>;
  onClose: () => void;
}

export const PieceModal: React.FC<PieceModalProps> = ({ piece, onSave, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    basePrice: 0,
    estimatedHours: null as number | null,
    imageUrl: '',
    isActive: true,
    sortOrder: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Initialize form with piece data if editing
  useEffect(() => {
    if (piece) {
      setFormData({
        name: piece.name,
        description: piece.description || '',
        category: piece.category || '',
        basePrice: piece.basePrice,
        estimatedHours: piece.estimatedHours,
        imageUrl: piece.imageUrl || '',
        isActive: piece.isActive,
        sortOrder: piece.sortOrder,
      });
      setImagePreview(piece.imageUrl);
    }
  }, [piece]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const inputElement = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: inputElement.checked }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : parseFloat(value),
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen');
      return;
    }

    if (file.size > 500 * 1024) { // 500KB limit for file size
      setError('La imagen no puede ser mayor a 500KB. Por favor redimensiona la imagen.');
      return;
    }

    try {
      setIsUploadingImage(true);
      setError(null);

      // Create a data URL for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        
        // Check if the resulting base64 is too large (should not exceed 1MB as base64)
        if (dataUrl.length > 1024 * 1024) {
          setError('La imagen convertida es demasiado grande. Por favor usa una imagen más pequeña.');
          setIsUploadingImage(false);
          return;
        }
        
        setImagePreview(dataUrl);
        setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error al procesar la imagen');
      console.error('Error handling image file:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('El nombre de la piecita es requerido');
      return;
    }

    if (formData.basePrice <= 0) {
      setError('El precio base debe ser mayor a 0');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        ...formData,
        description: formData.description || null,
        category: formData.category || null,
        imageUrl: formData.imageUrl || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-serif text-brand-accent mb-6">
          {piece ? 'Editar Piecita' : 'Nueva Piecita'}
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-brand-text mb-2">
              Nombre de la Piecita *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Tazón con motivos florales"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-brand-text mb-2">
              Descripción
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detalles sobre la piecita, técnicas, etc."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              rows={3}
            />
          </div>

          {/* Category and Base Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-brand-text mb-2">
                Categoría
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="Ej: Cerámica, Vidrio"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-text mb-2">
                Precio Base ($) *
              </label>
              <input
                type="number"
                name="basePrice"
                value={formData.basePrice || ''}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
          </div>

          {/* Estimated Hours and Sort Order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-brand-text mb-2">
                Horas Estimadas
              </label>
              <input
                type="number"
                name="estimatedHours"
                value={formData.estimatedHours ?? ''}
                onChange={handleChange}
                placeholder="Ej: 2.5"
                step="0.5"
                min="0"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-text mb-2">
                Orden de Visualización
              </label>
              <input
                type="number"
                name="sortOrder"
                value={formData.sortOrder || ''}
                onChange={handleChange}
                placeholder="0"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-bold text-brand-text mb-2">
              Imagen de la Piecita
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-opacity-90 transition-colors disabled:bg-opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingImage ? 'Subiendo...' : 'Seleccionar Archivo'}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                className="hidden"
              />
              <p className="text-xs text-brand-secondary">Máximo 5MB. Soporta JPG, PNG, WebP</p>
            </div>

            {/* Image Preview or URL */}
            {imagePreview && (
              <div className="mt-3">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setFormData(prev => ({ ...prev, imageUrl: '' }));
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                >
                  Eliminar imagen
                </button>
              </div>
            )}

            {/* Fallback: URL Input */}
            <div className="mt-3">
              <label className="block text-xs font-bold text-brand-text mb-1">
                O ingresa una URL:
              </label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="isActive" className="text-sm font-bold text-brand-text">
              Activo (visible en experiencias)
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-opacity-90 transition-colors disabled:bg-opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando...' : 'Guardar Piecita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
