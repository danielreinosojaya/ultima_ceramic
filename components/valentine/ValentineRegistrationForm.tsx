import React, { useState, useRef, useEffect } from 'react';
import { VALENTINE_WORKSHOPS, ValentineWorkshopType } from '../../types';
import { HeartIcon } from '@heroicons/react/24/solid';
import { PhotoIcon, CheckCircleIcon, ExclamationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface ValentineRegistrationFormProps {
    onSuccess: (registrationId: string) => void;
    onBack: () => void;
}

interface WorkshopAvailability {
    workshop: ValentineWorkshopType;
    maxCapacity: number;
    usedCapacity: number;
    availableSpots: number;
    isFull: boolean;
}

export const ValentineRegistrationForm: React.FC<ValentineRegistrationFormProps> = ({ onSuccess, onBack }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        birthDate: '',
        birthDay: '',
        birthMonth: '',
        birthYear: '',
        phone: '',
        email: '',
        workshop: '' as ValentineWorkshopType | '',
        participants: 1 as 1 | 2
    });
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Estado de disponibilidad de cupos
    const [availability, setAvailability] = useState<WorkshopAvailability[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(true);
    const [allWorkshopsFull, setAllWorkshopsFull] = useState(false);

    // Cargar disponibilidad al montar el componente
    useEffect(() => {
        fetchAvailability();
    }, []);

    const fetchAvailability = async () => {
        try {
            const response = await fetch('/api/valentine?action=availability');
            const result = await response.json();
            if (result.success) {
                setAvailability(result.data);
                // Verificar si todos los talleres están llenos
                const allFull = result.data.every((w: WorkshopAvailability) => w.isFull);
                setAllWorkshopsFull(allFull);
            }
        } catch (err) {
            console.error('Error fetching availability:', err);
        } finally {
            setLoadingAvailability(false);
        }
    };

    const getWorkshopAvailability = (workshopType: ValentineWorkshopType): WorkshopAvailability | undefined => {
        return availability.find(a => a.workshop === workshopType);
    };

    const selectedWorkshop = VALENTINE_WORKSHOPS.find(w => w.type === formData.workshop);
    const price = selectedWorkshop 
        ? (formData.participants === 2 ? selectedWorkshop.pricePair : selectedWorkshop.priceIndividual)
        : 0;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            
            // Construir birthDate cuando se seleccionan día/mes/año
            if (name === 'birthDay' || name === 'birthMonth' || name === 'birthYear') {
                const day = name === 'birthDay' ? value : updated.birthDay;
                const month = name === 'birthMonth' ? value : updated.birthMonth;
                const year = name === 'birthYear' ? value : updated.birthYear;
                
                if (day && month && year) {
                    updated.birthDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
            }
            
            return updated;
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validar tipo de archivo (solo imágenes)
            if (!file.type.startsWith('image/')) {
                setError('Por favor sube solo una imagen (JPG, PNG, WEBP)');
                return;
            }
            // Validar tamaño (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setError('El archivo no puede superar 10MB');
                return;
            }
            setPaymentProof(file);
            setError(null);
            
            // Preview para imágenes
            const reader = new FileReader();
            reader.onload = (e) => {
                setPaymentProofPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadPaymentProof = async (file: File): Promise<string> => {
        // Subir a un servicio de almacenamiento
        // Por ahora usamos base64 para simplificar, pero en producción usar Vercel Blob o similar
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validaciones
        if (!formData.fullName.trim()) {
            setError('Por favor ingresa tu nombre completo');
            return;
        }
        if (!formData.birthDate) {
            setError('Por favor ingresa tu fecha de nacimiento');
            return;
        }
        if (!formData.phone.trim()) {
            setError('Por favor ingresa tu número de celular');
            return;
        }
        if (!formData.email.trim() || !formData.email.includes('@')) {
            setError('Por favor ingresa un correo electrónico válido');
            return;
        }
        if (!formData.workshop) {
            setError('Por favor selecciona un taller');
            return;
        }
        // VALIDACIÓN CRÍTICA: El comprobante de pago es OBLIGATORIO
        if (!paymentProof) {
            setError('⚠️ OBLIGATORIO: Debes subir el comprobante de pago para completar tu inscripción');
            return;
        }
        
        // Validar que el taller seleccionado aún tenga cupos
        const workshopAvail = getWorkshopAvailability(formData.workshop);
        if (workshopAvail && workshopAvail.availableSpots < formData.participants) {
            setError(`El taller seleccionado ya no tiene cupos suficientes. Por favor selecciona otro.`);
            // Refrescar disponibilidad
            fetchAvailability();
            return;
        }

        setIsSubmitting(true);

        try {
            // Subir comprobante
            const paymentProofUrl = await uploadPaymentProof(paymentProof);

            // Enviar inscripción
            const response = await fetch('/api/valentine?action=register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: formData.fullName.trim(),
                    birthDate: formData.birthDate,
                    phone: formData.phone.trim(),
                    email: formData.email.trim().toLowerCase(),
                    workshop: formData.workshop,
                    participants: formData.participants,
                    paymentProofUrl
                })
            });

            const result = await response.json();

            if (result.success) {
                onSuccess(result.data.id);
            } else {
                // Si es error de capacidad, refrescar disponibilidad
                if (result.errorCode === 'CAPACITY_FULL' || result.errorCode === 'INSUFFICIENT_CAPACITY') {
                    fetchAvailability();
                }
                setError(result.error || 'Error al procesar la inscripción');
            }
        } catch (err) {
            console.error('Error submitting registration:', err);
            setError('Error de conexión. Por favor intenta de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Si todos los talleres están llenos, mostrar mensaje especial
    if (!loadingAvailability && allWorkshopsFull) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-rose-100 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="bg-gradient-to-r from-gray-400 to-gray-500 p-4 rounded-full shadow-lg">
                                <HeartIcon className="w-12 h-12 text-white" />
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                            San Valentín 2026
                        </h1>
                    </div>
                    
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-rose-100">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircleIcon className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            ¡Cupos Agotados! 😢
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Todos nuestros talleres de San Valentín 2026 se han llenado. 
                            ¡Gracias por el increíble interés!
                        </p>
                        <p className="text-gray-500 text-sm mb-6">
                            Si deseas que te notifiquemos sobre futuras ediciones o si se libera algún cupo, 
                            escríbenos a cmassuh@ceramicalma.com
                        </p>
                        <button
                            onClick={onBack}
                            className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                        >
                            ← Volver al inicio
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-rose-100 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="bg-gradient-to-r from-rose-400 to-pink-500 p-4 rounded-full shadow-lg">
                            <HeartIcon className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                        San Valentín 2026 💕
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Inscríbete a nuestros talleres especiales
                    </p>
                </div>

                {/* Información del evento */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-rose-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <HeartIcon className="w-5 h-5 text-rose-500" />
                        Save the Date - 14 de Febrero
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Creemos fielmente que todos los días son para celebrar el amor y la amistad, 
                        pero este 14 de febrero queremos hacerlo aún más especial y diferente.
                    </p>
                    <div className="bg-rose-50 rounded-lg p-4 text-sm text-gray-700">
                        <p className="font-medium mb-2">✨ Todas las actividades incluyen:</p>
                        <ul className="space-y-1 ml-4">
                            <li>• Clase guiada y acompañamiento de creación</li>
                            <li>• Materiales y herramientas</li>
                            <li>• Horneadas cerámicas de alta temperatura</li>
                            <li>• Pieza lista para su uso (apta para alimentos, microondas y lavavajillas)</li>
                            <li>• Entrega en aproximadamente 2 semanas</li>
                        </ul>
                        <p className="mt-3 text-rose-600 font-medium">💕 ¡Tendremos sorpresas y sorteos de premios increíbles!</p>
                    </div>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-rose-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">
                        📝 Datos de Inscripción
                    </h2>

                    {/* Error general */}
                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Nombre Completo */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre Completo *
                        </label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            placeholder="Ej: María García López"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
                            required
                        />
                    </div>

                    {/* Fecha de Nacimiento */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fecha de Nacimiento *
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {/* Día */}
                            <select
                                name="birthDay"
                                value={formData.birthDay}
                                onChange={handleInputChange}
                                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors text-base"
                                required
                            >
                                <option value="">Día</option>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                    <option key={day} value={day}>{day}</option>
                                ))}
                            </select>
                            
                            {/* Mes */}
                            <select
                                name="birthMonth"
                                value={formData.birthMonth}
                                onChange={handleInputChange}
                                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors text-base"
                                required
                            >
                                <option value="">Mes</option>
                                <option value="1">Enero</option>
                                <option value="2">Febrero</option>
                                <option value="3">Marzo</option>
                                <option value="4">Abril</option>
                                <option value="5">Mayo</option>
                                <option value="6">Junio</option>
                                <option value="7">Julio</option>
                                <option value="8">Agosto</option>
                                <option value="9">Septiembre</option>
                                <option value="10">Octubre</option>
                                <option value="11">Noviembre</option>
                                <option value="12">Diciembre</option>
                            </select>
                            
                            {/* Año */}
                            <select
                                name="birthYear"
                                value={formData.birthYear}
                                onChange={handleInputChange}
                                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors text-base"
                                required
                            >
                                <option value="">Año</option>
                                {Array.from({ length: 2016 - 1940 + 1 }, (_, i) => 2016 - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Teléfono */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Número de Celular *
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="Ej: 0991234567"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Correo Electrónico *
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="tu@email.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
                            required
                        />
                    </div>

                    {/* Selección de Taller */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Selecciona tu Taller *
                        </label>
                        
                        {loadingAvailability ? (
                            <div className="text-center py-8 text-gray-500">
                                <svg className="animate-spin w-6 h-6 mx-auto mb-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                                Cargando disponibilidad...
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {VALENTINE_WORKSHOPS.map((workshop) => {
                                    const workshopAvail = getWorkshopAvailability(workshop.type);
                                    const isFull = workshopAvail?.isFull ?? false;
                                    const availableSpots = workshopAvail?.availableSpots ?? workshop.maxCapacity;
                                    const isSelected = formData.workshop === workshop.type;
                                    
                                    // No permitir selección si está lleno
                                    const canSelect = !isFull && (availableSpots >= formData.participants);
                                    
                                    return (
                                        <label
                                            key={workshop.type}
                                            className={`block p-4 border-2 rounded-xl transition-all ${
                                                isFull 
                                                    ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                                                    : isSelected
                                                        ? 'border-rose-500 bg-rose-50 shadow-md cursor-pointer'
                                                        : 'border-gray-200 hover:border-rose-300 hover:bg-rose-50/50 cursor-pointer'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="radio"
                                                    name="workshop"
                                                    value={workshop.type}
                                                    checked={isSelected}
                                                    onChange={canSelect ? handleInputChange : undefined}
                                                    disabled={!canSelect}
                                                    className="mt-1 text-rose-500 focus:ring-rose-500 disabled:opacity-50"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`font-semibold ${isFull ? 'text-gray-500' : 'text-gray-800'}`}>
                                                            {workshop.name}
                                                        </span>
                                                        <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                                                            {workshop.time}
                                                        </span>
                                                        {/* Indicador de disponibilidad - SOLO AGOTADO */}
                                                        {isFull && (
                                                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                                <XCircleIcon className="w-3 h-3" />
                                                                AGOTADO
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`text-sm mt-1 ${isFull ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {workshop.description}
                                                    </p>
                                                    <p className={`text-sm font-medium mt-2 ${isFull ? 'text-gray-400' : 'text-rose-600'}`}>
                                                        ${workshop.priceIndividual} individual · ${workshop.pricePair} para dos
                                                    </p>
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Número de Participantes */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            ¿Cuántas personas? *
                        </label>
                        <div className="flex gap-4">
                            <label className={`flex-1 p-4 border-2 rounded-xl cursor-pointer text-center transition-all ${
                                formData.participants === 1
                                    ? 'border-rose-500 bg-rose-50 shadow-md'
                                    : 'border-gray-200 hover:border-rose-300'
                            }`}>
                                <input
                                    type="radio"
                                    name="participants"
                                    value={1}
                                    checked={formData.participants === 1}
                                    onChange={(e) => setFormData(prev => ({ ...prev, participants: 1 }))}
                                    className="sr-only"
                                />
                                <div className="text-2xl mb-1">👤</div>
                                <div className="font-semibold text-gray-800">Individual</div>
                                {selectedWorkshop && (
                                    <div className="text-rose-600 font-medium mt-1">
                                        ${selectedWorkshop.priceIndividual}
                                    </div>
                                )}
                            </label>
                            <label className={`flex-1 p-4 border-2 rounded-xl cursor-pointer text-center transition-all ${
                                formData.participants === 2
                                    ? 'border-rose-500 bg-rose-50 shadow-md'
                                    : 'border-gray-200 hover:border-rose-300'
                            }`}>
                                <input
                                    type="radio"
                                    name="participants"
                                    value={2}
                                    checked={formData.participants === 2}
                                    onChange={(e) => setFormData(prev => ({ ...prev, participants: 2 }))}
                                    className="sr-only"
                                />
                                <div className="text-2xl mb-1">👥</div>
                                <div className="font-semibold text-gray-800">Pareja / Duo</div>
                                {selectedWorkshop && (
                                    <div className="text-rose-600 font-medium mt-1">
                                        ${selectedWorkshop.pricePair}
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Precio Total */}
                    {selectedWorkshop && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-rose-100 to-pink-100 rounded-xl border border-rose-200">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-medium">Total a pagar:</span>
                                <span className="text-2xl font-bold text-rose-600">${price}</span>
                            </div>
                        </div>
                    )}

                    {/* Subir Comprobante - OBLIGATORIO */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Comprobante de Pago * <span className="text-red-500 font-bold">(OBLIGATORIO)</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                            📸 Toma una foto o screenshot de tu comprobante de transferencia. 
                            <strong className="text-red-600"> Sin comprobante no se procesará tu inscripción.</strong>
                        </p>
                        
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                paymentProof 
                                    ? 'border-green-400 bg-green-50' 
                                    : 'border-red-300 bg-red-50/30 hover:border-rose-400 hover:bg-rose-50'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                                required
                            />
                            
                            {paymentProof ? (
                                <div className="flex flex-col items-center gap-3">
                                    {paymentProofPreview ? (
                                        <img 
                                            src={paymentProofPreview} 
                                            alt="Preview" 
                                            className="max-h-32 rounded-lg shadow"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center">
                                            <CheckCircleIcon className="w-8 h-8 text-green-600" />
                                        </div>
                                    )}
                                    <div className="text-green-700 font-medium">
                                        ✓ {paymentProof.name}
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPaymentProof(null);
                                            setPaymentProofPreview(null);
                                        }}
                                        className="text-sm text-gray-500 hover:text-rose-600 underline"
                                    >
                                        Cambiar archivo
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <PhotoIcon className="w-12 h-12 text-rose-400" />
                                    <span className="text-rose-600 font-medium">
                                        📸 Toca para abrir tu galería
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        Selecciona una foto de tu comprobante (máx. 10MB)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                        >
                            ← Volver
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !paymentProof || !formData.workshop}
                            className="flex-1 py-3 px-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                    </svg>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <HeartIcon className="w-5 h-5" />
                                    Inscribirme
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer */}
                <div className="text-center mt-8 text-gray-500 text-sm">
                    <p>¿Preguntas? Contáctanos</p>
                    <p className="mt-1">📧 cmassuh@ceramicalma.com · 📱 +593 98 581 3327</p>
                </div>
            </div>
        </div>
    );
};
