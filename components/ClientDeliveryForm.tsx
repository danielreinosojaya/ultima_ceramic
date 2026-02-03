import React, { useState, useRef, useEffect } from 'react';
import type { UserInfo } from '../types';
import * as dataService from '../services/dataService';
import { PAINTING_SERVICE_PRICE } from '../constants';

interface Step {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    countryCode: string;
    description: string;
    scheduledDate: string;
    photos: string[];
    wantsPainting: boolean | null; // null = no decidió, true = sí, false = no
    paintingConfirmed: boolean; // Confirmación después de advertencia
}

const INITIAL_STEP: Step = {
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    countryCode: '+1',
    description: '',
    scheduledDate: '',
    photos: [],
    wantsPainting: null,
    paintingConfirmed: false
};

export const ClientDeliveryForm: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<'info' | 'photos' | 'painting' | 'confirmation'>('info');
    const [formData, setFormData] = useState<Step>(INITIAL_STEP);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    // Refs para inputs de cámara y galería
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Log component mount for debugging
    useEffect(() => {
        console.log('[ClientDeliveryForm] Component mounted successfully');
        return () => {
            console.log('[ClientDeliveryForm] Component unmounted');
        };
    }, []);

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Comprimir imagen a base64 con límite de tamaño
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Reducir tamaño más agresivo para móviles (máx 800x800)
                    const maxWidth = 800;
                    const maxHeight = 800;
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width *= ratio;
                        height *= ratio;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('No se pudo comprimir la imagen'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    // Convertir a JPEG con mayor compresión (0.6 = 60% de calidad)
                    const compressed = canvas.toDataURL('image/jpeg', 0.6);
                    
                    // Si aún es muy grande (>1MB base64), comprimir más
                    if (compressed.length > 1000000) {
                        const evenMoreCompressed = canvas.toDataURL('image/jpeg', 0.4);
                        resolve(evenMoreCompressed);
                    } else {
                        resolve(compressed);
                    }
                };
                img.onerror = () => reject(new Error('Error al procesar la imagen'));
                img.src = event.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Error al leer la imagen'));
            reader.readAsDataURL(file);
        });
    };

    // Abrir cámara nativa del celular (modo foto)
    const openCameraCapture = () => {
        cameraInputRef.current?.click();
    };

    // Abrir galería para seleccionar fotos
    const openGallery = () => {
        galleryInputRef.current?.click();
    };

    // Procesar fotos capturadas (desde cámara o galería)
    const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file: File) => {
            if (file.type.startsWith('image/')) {
                // Comprimir imagen antes de guardar
                compressImage(file)
                    .then((compressedDataUrl) => {
                        setFormData(prev => ({
                            ...prev,
                            photos: [...prev.photos, compressedDataUrl]
                        }));
                    })
                    .catch((error) => {
                        console.error('[ClientDeliveryForm] Error compressing image:', error);
                        // Si falla la compresión, mostrar error
                        setErrors(prev => ({
                            ...prev,
                            photos: 'Error al procesar la foto. Intenta con otra imagen.'
                        }));
                    });
            }
        });

        // Limpiar errores
        if (errors.photos) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.photos;
                return newErrors;
            });
        }

        // Reset input para permitir capturar la misma foto otra vez
        e.target.value = '';
    };

    const validateStep = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (currentStep === 'info') {
            if (!formData.email.trim()) {
                newErrors.email = 'El email es requerido';
            } else if (!validateEmail(formData.email)) {
                newErrors.email = 'Email inválido';
            }

            if (!formData.firstName.trim()) {
                newErrors.firstName = 'El nombre es requerido';
            }

            if (!formData.lastName.trim()) {
                newErrors.lastName = 'El apellido es requerido';
            }

            if (!formData.phone.trim()) {
                newErrors.phone = 'El teléfono es requerido';
            }
        }

        if (currentStep === 'photos') {
            if (formData.photos.length === 0) {
                newErrors.photos = 'Debes subir al menos una foto';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInfoChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file: File) => {
            if (file.type.startsWith('image/')) {
                // Comprimir imagen antes de guardar
                compressImage(file)
                    .then((compressedDataUrl) => {
                        setFormData(prev => ({
                            ...prev,
                            photos: [...prev.photos, compressedDataUrl]
                        }));
                    })
                    .catch((error) => {
                        console.error('[ClientDeliveryForm] Error compressing image:', error);
                        setErrors(prev => ({
                            ...prev,
                            photos: 'Error al procesar la foto. Intenta con otra imagen.'
                        }));
                    });
            }
        });

        if (errors.photos) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.photos;
                return newErrors;
            });
        }
    };

    const removePhoto = (index: number) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
    };

    const handleNextStep = () => {
        if (!validateStep()) {
            return;
        }

        if (currentStep === 'info') {
            setCurrentStep('photos');
        } else if (currentStep === 'photos') {
            setCurrentStep('painting');
        } else if (currentStep === 'painting') {
            setCurrentStep('confirmation');
        }
    };

    const handlePreviousStep = () => {
        if (currentStep === 'photos') {
            setCurrentStep('info');
        } else if (currentStep === 'painting') {
            setCurrentStep('photos');
        } else if (currentStep === 'confirmation') {
            setCurrentStep('painting');
        }
    };

    const handleSubmit = async () => {
        if (!validateStep()) {
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');
        setSuccessMessage('Enviando información... esto puede tardar hasta 1 minuto.');

        try {
            console.log('[ClientDeliveryForm] Starting submission...');
            
            const userInfo: UserInfo = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                countryCode: formData.countryCode,
                birthday: null
            };

            console.log('[ClientDeliveryForm] Calling createDeliveryFromClient with:', {
                email: formData.email.trim(),
                firstName: formData.firstName.trim(),
                photosCount: formData.photos.length
            });

            // Calculate scheduled date: today + 15 days
            const today = new Date();
            const scheduledDate = new Date(today);
            scheduledDate.setDate(scheduledDate.getDate() + 15);
            const scheduledDateStr = scheduledDate.toISOString().split('T')[0];

            // Limit to 2 photos max to avoid 413 Payload Too Large error
            const photosToSend = formData.photos.length > 0 ? formData.photos.slice(0, 2) : null;
            
            console.log('[ClientDeliveryForm] Sending', formData.photos.length, 'photos (limited to 2 for payload size)');

            const result = await dataService.createDeliveryFromClient({
                email: formData.email.trim(),
                userInfo,
                description: formData.description.trim() || null,
                scheduledDate: scheduledDateStr,
                photos: photosToSend,
                wantsPainting: formData.wantsPainting || false,
                paintingPrice: formData.wantsPainting ? PAINTING_SERVICE_PRICE : null
            });

            console.log('[ClientDeliveryForm] API Response:', result);

            if (result.success) {
                console.log('[ClientDeliveryForm] Submission successful');
                setSuccessMessage('✅ ¡Gracias! Hemos recibido tu información y fotos. CeramicAlma se pondrá en contacto 1-2 días hábiles antes de tu fecha de recogida.');
                setTimeout(() => {
                    setFormData(INITIAL_STEP);
                    setCurrentStep('info');
                }, 2000);
            } else {
                console.error('[ClientDeliveryForm] API error:', result.error);
                setErrorMessage(result.error || 'Error al enviar la información. Intenta de nuevo.');
            }
        } catch (error) {
            console.error('[ClientDeliveryForm] Exception during submission:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setErrorMessage('Error al procesar tu solicitud. Por favor intenta de nuevo.');
            
            // Log to Vercel
            console.log('[ERROR_LOG_FOR_VERCEL]', JSON.stringify({
                timestamp: new Date().toISOString(),
                component: 'ClientDeliveryForm',
                action: 'handleSubmit',
                error: errorMessage,
                errorStack: error instanceof Error ? error.stack : 'No stack available',
                userAgent: navigator.userAgent
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
                {/* Logo/Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-text mb-2">
                    🎨 CeramicAlma
                </h1>
                <p className="text-brand-secondary text-xs sm:text-sm">
                    Seguimiento de Piezas
                </p>
            </div>                {/* Progress Indicator */}
                <div className="flex justify-between mb-8">
                    <div className={`flex-1 h-2 rounded-full mr-2 transition-colors ${currentStep === 'info' || currentStep === 'photos' || currentStep === 'painting' || currentStep === 'confirmation' ? 'bg-brand-primary' : 'bg-gray-300'}`} />
                    <div className={`flex-1 h-2 rounded-full mr-2 transition-colors ${currentStep === 'photos' || currentStep === 'painting' || currentStep === 'confirmation' ? 'bg-brand-primary' : 'bg-gray-300'}`} />
                    <div className={`flex-1 h-2 rounded-full mr-2 transition-colors ${currentStep === 'painting' || currentStep === 'confirmation' ? 'bg-brand-primary' : 'bg-gray-300'}`} />
                    <div className={`flex-1 h-2 rounded-full transition-colors ${currentStep === 'confirmation' ? 'bg-brand-primary' : 'bg-gray-300'}`} />
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <p className="text-green-700 text-sm font-semibold">✅ {successMessage}</p>
                    </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-700 text-sm font-semibold">❌ {errorMessage}</p>
                    </div>
                )}

                {/* Step 1: Personal & Delivery Info */}
                {currentStep === 'info' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-brand-text mb-4">Información Personal</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-brand-text mb-1">
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => handleInfoChange('firstName', e.target.value)}
                                    placeholder="Ej: Juan"
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-brand-text mb-1">
                                    Apellido *
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => handleInfoChange('lastName', e.target.value)}
                                    placeholder="Ej: Pérez"
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-brand-text mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInfoChange('email', e.target.value)}
                                placeholder="tu@email.com"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                                    errors.email ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-brand-text mb-1">
                                Teléfono *
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleInfoChange('phone', e.target.value)}
                                placeholder="+1 234 567 8900"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                                    errors.phone ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-brand-text mb-1">
                                Descripción (opcional)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleInfoChange('description', e.target.value)}
                                placeholder="Ej: 2 bowls de cerámica, una maceta..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-blue-900 mb-2">⏱️ Plazo de elaboración</p>
                            <p className="text-sm text-blue-800">
                                Nuestras piezas de cerámica tardan aproximadamente <strong>15 días</strong> en estar listas desde el llenado de este formulario.
                            </p>
                            <p className="text-xs text-blue-700 mt-2">
                                Te enviaremos un email de confirmación con la fecha exacta de entrega. 📧
                            </p>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleNextStep}
                                disabled={isSubmitting}
                                className="px-6 py-2 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50"
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Photo Upload */}
                {currentStep === 'photos' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-brand-text mb-4">Sube Fotos de tu Pieza</h3>
                        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            ℹ️ Máximo 2 fotos. Sube las más importantes (mejor vista de tu pieza).
                        </p>

                        {/* Camera Button - Opens native camera app */}
                        <button
                            type="button"
                            onClick={openCameraCapture}
                            disabled={isSubmitting}
                            className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            📷 Tomar Foto con Cámara
                        </button>

                        {/* Hidden camera input - triggers native camera app */}
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoCapture}
                            className="hidden"
                        />

                        {/* OR Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">O</span>
                            </div>
                        </div>

                        {/* Gallery Button - Opens native gallery */}
                        <button
                            type="button"
                            onClick={openGallery}
                            disabled={isSubmitting}
                            className="w-full px-4 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            🖼️ Selecciona desde Galería
                        </button>

                        {/* Hidden gallery input */}
                        <input
                            ref={galleryInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handlePhotoCapture}
                            className="hidden"
                        />

                        {/* Photo Preview Grid */}
                        {formData.photos.length > 0 && (
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                {formData.photos.map((photo, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={photo}
                                            alt={`Foto ${index + 1}`}
                                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index)}
                                            disabled={isSubmitting}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 flex items-center justify-center"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            💡 <strong>Consejo:</strong> Toma fotos desde diferentes ángulos para una mejor visualización de tu pieza.
                        </p>

                        <div className="flex justify-between pt-4">
                            <button
                                onClick={handlePreviousStep}
                                disabled={isSubmitting}
                                className="px-6 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                                ← Atrás
                            </button>
                            <button
                                onClick={handleNextStep}
                                disabled={isSubmitting || formData.photos.length === 0}
                                className="px-6 py-2 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50"
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Servicio de Pintura (Upsell) */}
                {currentStep === 'painting' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-brand-text mb-4">🎨 Servicio de Pintura</h3>
                        
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
                            <div className="text-center mb-4">
                                <span className="text-4xl">✨</span>
                                <h4 className="text-xl font-bold text-purple-900 mt-2">¿Te gustaría pintar esta pieza?</h4>
                                <p className="text-purple-700 text-sm mt-2">Dale vida y color a tu creación cuando esté lista</p>
                            </div>

                            <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-gray-700">Precio del servicio:</span>
                                    <span className="text-2xl font-bold text-brand-primary">$25 USD</span>
                                </div>
                                <p className="text-xs text-gray-600">Por pieza • Incluye todos los colores</p>
                            </div>

                            <div className="space-y-3 mb-4">
                                <p className="text-sm text-gray-700">✅ Elige entre nuestra paleta completa de colores</p>
                                <p className="text-sm text-gray-700">✅ Te contactaremos cuando la pieza esté lista</p>
                                <p className="text-sm text-gray-700">✅ Reserva tu horario para pintarla</p>
                            </div>

                            {formData.wantsPainting === null && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, wantsPainting: true }))}
                                        disabled={isSubmitting}
                                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50"
                                    >
                                        ✨ ¡Sí, quiero pintar!
                                    </button>
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, wantsPainting: false }))}
                                        disabled={isSubmitting}
                                        className="px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
                                    >
                                        No, gracias
                                    </button>
                                </div>
                            )}

                            {formData.wantsPainting === false && !formData.paintingConfirmed && (
                                <div className="mt-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                                    <p className="text-yellow-900 font-semibold mb-2">⚠️ ¿Estás seguro?</p>
                                    <p className="text-yellow-800 text-sm mb-3">
                                        Tu pieza se pintará con <strong>esmalte base brillante transparente</strong>. 
                                        No podrás agregar colores posteriormente.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wantsPainting: null }))}
                                            disabled={isSubmitting}
                                            className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
                                        >
                                            ← Volver a elegir
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, paintingConfirmed: true }));
                                                // Avanzar automáticamente al siguiente paso
                                                setTimeout(() => handleNextStep(), 100);
                                            }}
                                            disabled={isSubmitting}
                                            className="px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm"
                                        >
                                            Confirmar sin pintura
                                        </button>
                                    </div>
                                </div>
                            )}

                            {formData.wantsPainting === true && (
                                <div className="mt-4 bg-green-50 border-2 border-green-300 rounded-lg p-4">
                                    <p className="text-green-900 font-semibold mb-2">🎉 ¡Excelente elección!</p>
                                    <p className="text-green-800 text-sm mb-3">
                                        Cuando tu pieza esté lista para pintar, recibirás un correo para reservar tu horario. 
                                        El pago se coordina con el instructor antes de la sesión de pintura.
                                    </p>
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, wantsPainting: null }))}
                                        disabled={isSubmitting}
                                        className="w-full px-4 py-2 bg-white border-2 border-green-300 text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 text-sm"
                                    >
                                        ← Cambiar decisión
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between pt-4">
                            <button
                                onClick={handlePreviousStep}
                                disabled={isSubmitting}
                                className="px-6 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                                ← Atrás
                            </button>
                            <button
                                onClick={handleNextStep}
                                disabled={isSubmitting || formData.wantsPainting === null || (formData.wantsPainting === false && !formData.paintingConfirmed)}
                                className="px-6 py-2 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50"
                            >
                                Revisar →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Confirmation */}
                {currentStep === 'confirmation' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-brand-text mb-4">Confirmación</h3>

                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div>
                                <p className="text-xs text-gray-600">Nombre</p>
                                <p className="font-semibold text-brand-text">{formData.firstName} {formData.lastName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">Email</p>
                                <p className="font-semibold text-brand-text">{formData.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">Teléfono</p>
                                <p className="font-semibold text-brand-text">{formData.phone}</p>
                            </div>
                            {formData.description && (
                                <div>
                                    <p className="text-xs text-gray-600">Descripción</p>
                                    <p className="font-semibold text-brand-text">{formData.description}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-gray-600">Fecha Estimada de Recogida (Hoy + 15 días)</p>
                                <p className="font-semibold text-brand-text">
                                    {(() => {
                                        const today = new Date();
                                        const scheduledDate = new Date(today);
                                        scheduledDate.setDate(scheduledDate.getDate() + 15);
                                        return scheduledDate.toLocaleDateString('es-ES', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        });
                                    })()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">Fotos</p>
                                <p className="font-semibold text-brand-text">{formData.photos.length} foto(s)</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">Servicio de Pintura</p>
                                {formData.wantsPainting ? (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-green-700">✨ Sí, quiero pintar</span>
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">+$25</span>
                                    </div>
                                ) : (
                                    <p className="font-semibold text-gray-600">Esmalte base brillante</p>
                                )}
                            </div>
                        </div>

                        {formData.wantsPainting && (
                            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                                <p className="text-purple-900 font-semibold mb-2">🎨 Próximos pasos para pintura:</p>
                                <ul className="text-sm text-purple-800 space-y-1">
                                    <li>• Recibirás un email cuando tu pieza esté lista para pintar</li>
                                    <li>• Podrás reservar tu horario de pintura en línea</li>
                                    <li>• El pago de $25 se coordina antes de la sesión de pintura</li>
                                </ul>
                            </div>
                        )}

                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                📧 Recibirás un email de confirmación con los detalles de tu entrega. ¡Gracias por confiar en CeramicAlma!
                            </p>
                            <p className="text-sm text-gray-700 bg-green-50 border border-green-300 rounded-lg p-3 font-semibold">
                                📅 <strong>Nos pondremos en contacto contigo 1-2 días hábiles antes de la fecha de recogida</strong> para coordinar los detalles finales.
                            </p>
                        </div>

                        <div className="flex justify-between pt-4">
                            <button
                                onClick={handlePreviousStep}
                                disabled={isSubmitting}
                                className="px-6 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                                ← Atrás
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-6 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Enviando...' : 'Enviar ✓'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
