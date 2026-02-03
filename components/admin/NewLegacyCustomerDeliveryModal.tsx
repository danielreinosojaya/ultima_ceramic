import React, { useState } from 'react';
import type { Delivery, UserInfo } from '../../types';
import { COUNTRIES } from '../../constants';

interface NewLegacyCustomerDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (payload: {
        userInfo: UserInfo;
        deliveryData: Omit<Delivery, 'id' | 'createdAt'>;
        customerName: string;
    }) => Promise<void>;
}

export const NewLegacyCustomerDeliveryModal: React.FC<NewLegacyCustomerDeliveryModalProps> = ({
    isOpen,
    onClose,
    onSave
}) => {
    const [userInfo, setUserInfo] = useState<UserInfo>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        countryCode: COUNTRIES[0].code,
        birthday: ''
    });
    const [scheduledDate, setScheduledDate] = useState('');
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState('');
    const [wantsPainting, setWantsPainting] = useState(true);
    const [paintingPrice, setPaintingPrice] = useState(25);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    if (!isOpen) return null;

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!userInfo.firstName.trim()) newErrors.firstName = 'Nombre es requerido';
        if (!userInfo.lastName.trim()) newErrors.lastName = 'Apellido es requerido';
        if (!userInfo.email.trim()) newErrors.email = 'Email es requerido';
        if (!userInfo.phone.trim()) newErrors.phone = 'Teléfono es requerido';
        if (!scheduledDate) newErrors.scheduledDate = 'Fecha de recogida es requerida';

        if (scheduledDate) {
            const selectedDate = new Date(scheduledDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) newErrors.scheduledDate = 'La fecha no puede ser anterior a hoy';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setUserInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            const customerName = `${userInfo.firstName} ${userInfo.lastName}`.trim();
            await onSave({
                userInfo,
                customerName,
                deliveryData: {
                    customerEmail: userInfo.email,
                    description: description.trim() ? description.trim() : undefined,
                    scheduledDate,
                    status: 'pending',
                    notes: notes.trim() ? notes.trim() : undefined,
                    completedAt: null,
                    deliveredAt: null,
                    photos: null,
                    wantsPainting: wantsPainting,
                    paintingPrice: wantsPainting ? paintingPrice : null,
                    paintingStatus: wantsPainting ? 'pending_payment' : null,
                    paintingBookingDate: null,
                    paintingPaidAt: null,
                    paintingCompletedAt: null
                }
            });

            setUserInfo({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                countryCode: COUNTRIES[0].code,
                birthday: ''
            });
            setScheduledDate('');
            setDescription('');
            setNotes('');
            setWantsPainting(true);
            setPaintingPrice(25);
            setErrors({});
            onClose();
        } catch (error) {
            setErrors({ submit: 'Error al crear cliente y entrega. Intenta nuevamente.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-brand-text mb-4">Alta rápida de cliente (sin reserva)</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-brand-text mb-1">Nombre *</label>
                            <input
                                name="firstName"
                                value={userInfo.firstName}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                disabled={isSubmitting}
                            />
                            {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-brand-text mb-1">Apellido *</label>
                            <input
                                name="lastName"
                                value={userInfo.lastName}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                disabled={isSubmitting}
                            />
                            {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-brand-text mb-1">Email *</label>
                        <input
                            name="email"
                            type="email"
                            value={userInfo.email}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            disabled={isSubmitting}
                        />
                        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-brand-text mb-1">Código País</label>
                            <select
                                name="countryCode"
                                value={userInfo.countryCode}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                disabled={isSubmitting}
                            >
                                {COUNTRIES.map(country => (
                                    <option key={`${country.code}-${country.name}`} value={country.code}>
                                        {country.name} ({country.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-brand-text mb-1">Teléfono *</label>
                            <input
                                name="phone"
                                value={userInfo.phone}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                disabled={isSubmitting}
                            />
                            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-brand-text mb-1">Fecha de recogida *</label>
                        <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            min={tomorrowStr}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            disabled={isSubmitting}
                        />
                        {errors.scheduledDate && <p className="text-xs text-red-600 mt-1">{errors.scheduledDate}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-brand-text mb-1">Descripción (opcional)</label>
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-brand-text mb-1">Notas (opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-purple-900">🎨 Servicio de pintura</p>
                                <p className="text-xs text-purple-700">Crea seguimiento desde pendiente de pago</p>
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm font-semibold">
                                <input
                                    type="checkbox"
                                    checked={wantsPainting}
                                    onChange={(e) => setWantsPainting(e.target.checked)}
                                    disabled={isSubmitting}
                                />
                                Incluir
                            </label>
                        </div>
                        {wantsPainting && (
                            <div className="mt-3">
                                <label className="block text-sm font-semibold text-purple-900 mb-1">Precio de pintura</label>
                                <input
                                    type="number"
                                    value={paintingPrice}
                                    onChange={(e) => setPaintingPrice(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-purple-200 rounded-lg"
                                    disabled={isSubmitting}
                                />
                            </div>
                        )}
                    </div>

                    {errors.submit && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-600 text-sm">{errors.submit}</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-secondary"
                        >
                            {isSubmitting ? 'Guardando...' : 'Crear cliente y entrega'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewLegacyCustomerDeliveryModal;
