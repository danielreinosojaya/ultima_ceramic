import React, { useState, useEffect } from 'react';
import type { Delivery } from '../../types';

interface EditDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (deliveryId: string, updates: Partial<Delivery>) => Promise<void>;
    delivery: Delivery;
}

export const EditDeliveryModal: React.FC<EditDeliveryModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    delivery 
}) => {
    const [description, setDescription] = useState(delivery.description);
    const [scheduledDate, setScheduledDate] = useState(delivery.scheduledDate.split('T')[0]);
    const [notes, setNotes] = useState(delivery.notes || '');
    const [photos, setPhotos] = useState<string[]>(delivery.photos || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Update form when delivery changes
    useEffect(() => {
        if (delivery) {
            setDescription(delivery.description);
            setScheduledDate(delivery.scheduledDate.split('T')[0]);
            setNotes(delivery.notes || '');
            setPhotos(delivery.photos || []);
        }
    }, [delivery]);

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        
        if (!description.trim()) {
            newErrors.description = 'La descripción es obligatoria';
        }
        
        if (!scheduledDate) {
            newErrors.scheduledDate = 'La fecha de entrega es obligatoria';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file: File) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) {
                        setPhotos(prev => [...prev, event.target!.result as string]);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave(delivery.id, {
                description: description.trim(),
                scheduledDate,
                notes: notes.trim() || null,
                photos: photos.length > 0 ? photos : null
            });
            
            setErrors({});
            onClose();
        } catch (error) {
            console.error('Error updating delivery:', error);
            setErrors({ submit: 'Error al actualizar la entrega. Intenta nuevamente.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setErrors({});
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={handleClose}>
            <div 
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md animate-fade-in-up max-h-[90vh] overflow-y-auto" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-brand-text">Editar Recogida</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        delivery.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {delivery.status === 'completed' ? 'Completada' : 'Pendiente'}
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-brand-text mb-1">
                            Descripción *
                        </label>
                        <input
                            id="description"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: 2 bowls de cerámica"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                                errors.description ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={isSubmitting}
                        />
                        {errors.description && (
                            <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="scheduledDate" className="block text-sm font-semibold text-brand-text mb-1">
                            Fecha de recogida *
                        </label>
                        <input
                            id="scheduledDate"
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                                errors.scheduledDate ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={isSubmitting}
                        />
                        {errors.scheduledDate && (
                            <p className="text-red-500 text-xs mt-1">{errors.scheduledDate}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="notes" className="block text-sm font-semibold text-brand-text mb-1">
                            Notas adicionales
                        </label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Información adicional sobre la recogida..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label htmlFor="photos" className="block text-sm font-semibold text-brand-text mb-1">
                            Fotos ({photos.length})
                        </label>
                        <input
                            id="photos"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-gray-500 mt-1">Añade más fotos o elimina las existentes</p>
                        
                        {photos.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {photos.map((photo, index) => (
                                    <div key={index} className="relative group">
                                        <img 
                                            src={photo} 
                                            alt={`Foto ${index + 1}`}
                                            className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index)}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                            disabled={isSubmitting}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {delivery.completedAt && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-green-800 text-sm">
                                <strong>Completada:</strong> {new Date(delivery.completedAt).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                            {delivery.deliveredAt && (
                                <p className="text-green-800 text-sm mt-1">
                                    <strong>Entregada:</strong> {new Date(delivery.deliveredAt).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            )}
                        </div>
                    )}

                    {errors.submit && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-600 text-sm">{errors.submit}</p>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
