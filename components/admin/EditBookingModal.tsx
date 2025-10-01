import React, { useState, useEffect } from 'react';
import type { Booking, EditableBooking, UserInfo } from '../../types';
import { COUNTRIES } from '@/constants';

interface EditBookingModalProps {
    booking: Booking;
    onClose: () => void;
    onSave: (updatedData: EditableBooking) => void;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({ booking, onClose, onSave }) => {
    const [userInfo, setUserInfo] = useState<UserInfo>({ ...booking.userInfo! });
    const [price, setPrice] = useState<number | string>(booking.price);
    
    useEffect(() => {
        setUserInfo({ ...booking.userInfo! });
        setPrice(booking.price);
    }, [booking]);

    const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setUserInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalPrice = typeof price === 'string' ? parseFloat(price) : price;
        if (!userInfo.firstName || !userInfo.lastName || !userInfo.email || isNaN(finalPrice)) {
            alert('Por favor, completa todos los campos requeridos y asegúrate de que el precio sea un número válido.');
            return;
        }

        onSave({
            userInfo,
            price: finalPrice,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-serif text-brand-accent mb-4 text-center">Editar reserva</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="firstName" value={userInfo.firstName} onChange={handleUserInputChange} placeholder="Nombre" className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                    <input type="text" name="lastName" value={userInfo.lastName} onChange={handleUserInputChange} placeholder="Apellido" className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                    <input type="email" name="email" value={userInfo.email} onChange={handleUserInputChange} placeholder="Correo electrónico" className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                    <div className="flex gap-2">
                        <select name="countryCode" value={userInfo.countryCode} onChange={handleUserInputChange} className="border border-gray-300 rounded-lg bg-gray-50">
                             {COUNTRIES.map(c => <option key={c.name} value={c.code}>{c.flag} {c.code}</option>)}
                        </select>
                        <input type="tel" name="phone" value={userInfo.phone} onChange={handleUserInputChange} placeholder="Teléfono" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label htmlFor="price" className="block text-sm font-bold text-brand-secondary mb-1">Precio</label>
                        <input type="number" step="0.01" name="price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">
                            Cancelar
                        </button>
                        <button type="submit" className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
