import React, { useState } from 'react';
import type { Booking, AppData } from '../types';
import { RescheduleClientFlow } from './RescheduleClientFlow';
import { formatDate } from '../utils/formatters';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ClientBookingsViewProps {
    bookings: Booking[];
    appData: AppData | null;
    onDataRefresh?: () => void;
}

/**
 * ClientBookingsView
 * 
 * Displays a list of client bookings with options to reschedule.
 * Shows upcoming and past classes.
 */
export const ClientBookingsView: React.FC<ClientBookingsViewProps> = ({ bookings, appData, onDataRefresh }) => {
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    const handleRescheduleClick = (booking: Booking) => {
        setSelectedBooking(booking);
        setRescheduleModalOpen(true);
    };

    const handleRescheduleComplete = () => {
        setRescheduleModalOpen(false);
        setSelectedBooking(null);
        if (onDataRefresh) {
            onDataRefresh();
        }
    };

    if (!bookings || bookings.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-brand-secondary text-lg">No tienes clases programadas aún</p>
            </div>
        );
    }

    // Separate upcoming and past bookings
    const now = new Date();
    const upcomingBookings = bookings.filter(b => {
        if (!b.slots || b.slots.length === 0) return false;
        const lastSlot = b.slots[b.slots.length - 1];
        if (!lastSlot || !lastSlot.date) return false;
        const slotDate = new Date(lastSlot.date);
        return slotDate > now;
    });

    const pastBookings = bookings.filter(b => {
        if (!b.slots || b.slots.length === 0) return true;
        const lastSlot = b.slots[b.slots.length - 1];
        if (!lastSlot || !lastSlot.date) return true;
        const slotDate = new Date(lastSlot.date);
        return slotDate <= now;
    });

    return (
        <div className="space-y-8">
            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-brand-text mb-4">Próximas Clases</h2>
                    <div className="grid gap-4">
                        {upcomingBookings.map((booking) => (
                            <div key={booking.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-brand-text">
                                            {booking.product?.name || 'Clase'}
                                        </h3>
                                        <p className="text-sm text-brand-secondary mt-1">
                                            Código: {booking.bookingCode}
                                        </p>
                                    </div>
                                    <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                        Confirmado
                                    </span>
                                </div>

                                {/* Class Slots */}
                                {booking.slots && booking.slots.length > 0 && (
                                    <div className="mb-4 space-y-2">
                                        {booking.slots.map((slot, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-brand-secondary">
                                                <CalendarIcon className="w-4 h-4" />
                                                <span>{formatDate(slot.date)}</span>
                                                {slot.time && (
                                                    <>
                                                        <ClockIcon className="w-4 h-4" />
                                                        <span>{slot.time}</span>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Reschedule Button */}
                                <button
                                    onClick={() => handleRescheduleClick(booking)}
                                    className="mt-4 px-4 py-2 bg-brand-accent text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Reagendar Clase
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-brand-text mb-4">Clases Pasadas</h2>
                    <div className="grid gap-4 opacity-75">
                        {pastBookings.map((booking) => (
                            <div key={booking.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-lg font-bold text-brand-text">
                                        {booking.product?.name || 'Clase'}
                                    </h3>
                                    <span className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold">
                                        Completada
                                    </span>
                                </div>
                                <p className="text-sm text-brand-secondary">
                                    Código: {booking.bookingCode}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reschedule Modal */}
            {rescheduleModalOpen && selectedBooking && (
                <RescheduleClientFlow
                    booking={selectedBooking}
                    appData={appData}
                    onClose={() => {
                        setRescheduleModalOpen(false);
                        setSelectedBooking(null);
                    }}
                    onRescheduleComplete={handleRescheduleComplete}
                />
            )}
        </div>
    );
};
