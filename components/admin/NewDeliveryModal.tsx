import React, { useState } from 'react';
import type { Delivery } from '../../types';

interface NewDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (deliveryData: Omit<Delivery, 'id' | 'createdAt'>) => Promise<void>;
    customerEmail: string;
    customerName?: string;
}

export const NewDeliveryModal: React.FC<NewDeliveryModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    customerEmail,
    customerName 
}) => {
    const [description, setDescription] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [notes, setNotes] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        
        // description ahora es opcional - no validar
        
        if (!scheduledDate) {
            newErrors.scheduledDate = 'La fecha de entrega es obligatoria';
        } else {
            const selectedDate = new Date(scheduledDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                newErrors.scheduledDate = 'La fecha no puede ser anterior a hoy';
            }
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
            await onSave({
                customerEmail,
                description: description.trim() || null,
                scheduledDate,
                status: 'pending',
                notes: notes.trim() || null,
                completedAt: null,
                deliveredAt: null,
                photos: photos.length > 0 ? photos : null
            });
            
            // Reset form
            setDescription('');
            setScheduledDate('');
            setNotes('');
            setPhotos([]);
            setErrors({});
            onClose();
        } catch (error) {
            console.error('Error creating delivery:', error);
            setErrors({ submit: 'Error al crear la entrega. Intenta nuevamente.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setDescription('');
            setScheduledDate('');
            setNotes('');
            setPhotos([]);
            setErrors({});
            onClose();
        }
    };

    // Get tomorrow as default date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={handleClose}>
            <div 
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md animate-fade-in-up" 
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-brand-text mb-4">Nueva Recogida</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-brand-text mb-1">
                            Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <input
                            id="description"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: 2 bowls de cerámica (opcional - útil para identificar piezas específicas)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                            disabled={isSubmitting}
                        />
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
                            min={tomorrowStr}
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
                            Fotos de referencia
                        </label>
                        <input
                            id="photos"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-gray-500 mt-1">Puedes subir múltiples fotos (JPG, PNG, WebP)</p>
                        
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
                            {isSubmitting ? 'Guardando...' : 'Crear Recogida'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};