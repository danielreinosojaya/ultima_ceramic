import React, { useState } from 'react';
import type { Product, ClassPackageDetails } from '../../types';

interface SingleClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; price: number; details: { duration: string }; }, id?: string) => void;
  classToEdit?: Product | null;
}

export const SingleClassModal: React.FC<SingleClassModalProps> = ({ isOpen, onClose, onSave, classToEdit }) => {
  const [name, setName] = useState(classToEdit?.name || '');
  const [description, setDescription] = useState(classToEdit?.description || '');
  const [price, setPrice] = useState(classToEdit?.price ? classToEdit.price.toString() : '');
  
  // Type guard para ClassPackageDetails
  const hasClassPackageDetails = (details: any): details is ClassPackageDetails => {
    return details && 'duration' in details;
  };
  
  const packageDetails = classToEdit?.details && hasClassPackageDetails(classToEdit.details) ? classToEdit.details : null;
  
  const [duration, setDuration] = useState(packageDetails?.duration || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError('El precio debe ser un número mayor a 0.');
      return;
    }
    setLoading(true);
    Promise.resolve(onSave({
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      details: {
        duration: duration.trim()
      },
    }, classToEdit?.id))
      .catch(() => {
        setError('Error al guardar la clase. Intenta nuevamente.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-brand-primary">{classToEdit ? 'Editar Clase Suelta' : 'Nueva Clase Suelta'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Descripción</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Precio</label>
            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Duración</label>
            <input type="text" value={duration} onChange={e => setDuration(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Ej: 2h" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-400">Horas (solo paquetes)</label>
              <input type="number" value={packageDetails?.durationHours || 0} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-400" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-400">Técnica (solo paquetes)</label>
              <input type="text" value={packageDetails?.technique || ''} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-400">Actividades (solo paquetes)</label>
            <input type="text" value={packageDetails?.activities?.join(', ') || ''} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-400" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-400">Recomendaciones (solo paquetes)</label>
            <input type="text" value={packageDetails?.generalRecommendations || ''} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-400" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-400">Materiales (solo paquetes)</label>
            <input type="text" value={packageDetails?.materials || ''} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-400" />
          </div>
          {error && <div className="text-red-500 text-sm font-semibold">{error}</div>}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="bg-white border text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100" disabled={loading}>Cancelar</button>
            <button type="submit" className={`bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent ${loading ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2"><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Guardando...</span>
              ) : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
