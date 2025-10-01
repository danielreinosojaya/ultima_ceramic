import React from 'react';
import type { Booking, Customer } from '../../types';
import { XIcon } from '../icons/XIcon';
import { CalendarIcon } from '../icons/CalendarIcon';

interface CustomerSearchResultsPanelProps {
    customer: Customer | null;
    onClose: () => void;
    onNavigate: (booking: Booking) => void;
}

export const CustomerSearchResultsPanel: React.FC<CustomerSearchResultsPanelProps> = ({ customer, onClose, onNavigate }) => {
    const language = 'es-ES';

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        // Ajuste de zona horaria
        const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
        return adjustedDate.toLocaleDateString(language, {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    };

    const sortedBookings = customer ? [...customer.bookings].sort((a, b) => {
        const dateA = a.bookingDate ? new Date(a.bookingDate).getTime() : 0;
        const dateB = b.bookingDate ? new Date(b.bookingDate).getTime() : 0;
        return dateB - dateA;
    }) : [];

    return (
        <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in-fast" onClick={onClose}>
            <div 
                className="fixed top-0 right-0 h-full w-full max-w-md bg-brand-surface shadow-lg flex flex-col animate-slide-in-right"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-brand-border">
                    <h3 className="text-lg font-bold text-brand-text">
                        {customer ? `Resultados para ${customer.userInfo.firstName} ${customer.userInfo.lastName}` : 'Sin resultados'}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-brand-background">
                        <XIcon className="w-6 h-6 text-brand-secondary" />
                    </button>
                </div>
                {customer ? (
                    <div className="flex-grow overflow-y-auto p-4 space-y-3">
                        {sortedBookings.map(booking => (
                             <div key={booking.id} className="bg-brand-background p-3 rounded-lg border border-brand-border">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-brand-text">{booking.product.name}</p>
                                        <p className="text-xs text-brand-secondary font-mono">{booking.bookingCode}</p>
                                        <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${booking.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {booking.isPaid ? 'Pagado' : 'Pendiente'}
                                        </span>
                                    </div>
                                    {booking.slots && booking.slots.length > 0 && (
                                        <button 
                                            onClick={() => onNavigate(booking)}
                                            className="flex-shrink-0 flex items-center gap-1.5 bg-white text-brand-secondary text-xs font-bold py-1 px-2.5 rounded-md hover:bg-gray-100 border border-brand-border transition-colors"
                                            title="Ir a semana"
                                        >
                                            <CalendarIcon className="w-4 h-4" />
                                            Ir a semana
                                        </button>
                                    )}
                                </div>
                                {booking.slots && booking.slots.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-brand-border/50">
                                        <p className="text-sm font-semibold">Clases reservadas:</p>
                                        <ul className="text-xs text-brand-secondary space-y-1 mt-1">
                                            {booking.slots.map(slot => (
                                                <li key={`${slot.date}-${slot.time}`}>{formatDate(slot.date)} @ {slot.time}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center">
                        <p className="text-brand-secondary">No se encontraron resultados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};