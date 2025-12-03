import React, { useState, useEffect } from 'react';
import type { Booking } from '../types';
import * as dataService from '../services/dataService';
import { ClientBookingsView } from './ClientBookingsView';
import { ClientLogin } from './ClientLogin';

interface ClientDashboardProps {
    onClose?: () => void;
}

/**
 * Cliente Dashboard
 * 
 * This component is shown to clients who have successfully booked classes.
 * It displays:
 * - Their upcoming/scheduled classes
 * - Option to reschedule each class (if eligible)
 * - Past classes
 * - Package renewal notifications
 */
export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onClose }) => {
    const [clientBookings, setClientBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Get client bookings from localStorage (stored when booking is created)
    useEffect(() => {
        const loadClientBookings = async () => {
            const clientEmail = localStorage.getItem('clientEmail');
            const clientBookingCode = localStorage.getItem('clientBookingCode');
            const lastBookingId = localStorage.getItem('lastBookingId');

            // Check if already authenticated
            if (clientEmail && clientBookingCode) {
                setIsAuthenticated(true);
                loadBookings(lastBookingId);
            }
        };

        const loadBookings = async (bookingId: string | null) => {
            setLoading(true);
            try {
                if (bookingId) {
                    const booking = await dataService.getBookingById(bookingId);
                    if (booking) {
                        setClientBookings([booking]);
                    }
                }
            } catch (err) {
                setError('No se pudieron cargar tus clases');
                console.error('Error loading client bookings:', err);
            } finally {
                setLoading(false);
            }
        };

        loadClientBookings();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    // If not authenticated, show login form
    if (!isAuthenticated) {
        return (
            <ClientLogin
                onSuccess={(booking) => {
                    setIsAuthenticated(true);
                    setClientBookings([booking]);
                }}
                onBack={() => onClose?.()}
            />
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-brand-text mb-2">Mi Panel de Clases</h1>
                <p className="text-brand-secondary">Gestiona tus reservas y reagenda cuando sea necesario</p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {error}
                </div>
            )}

            {/* Bookings View */}
            {clientBookings.length > 0 ? (
                <ClientBookingsView
                    bookings={clientBookings}
                    appData={null}
                    onDataRefresh={() => {
                        // Refresh bookings after reschedule
                        const storedBookingId = localStorage.getItem('lastBookingId');
                        if (storedBookingId) {
                            dataService.getBookingById(storedBookingId).then(booking => {
                                if (booking) {
                                    setClientBookings([booking]);
                                }
                            });
                        }
                    }}
                />
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-brand-secondary text-lg">No tienes clases programadas aún</p>
                    <p className="text-brand-secondary text-sm mt-2">
                        {onClose ? (
                            <>
                                <button
                                    onClick={onClose}
                                    className="text-brand-primary hover:text-brand-secondary font-semibold underline"
                                >
                                    Volver a reservar
                                </button>
                            </>
                        ) : null}
                    </p>
                </div>
            )}

            {/* Close Button */}
            {onClose && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-brand-border rounded-lg text-brand-text hover:bg-gray-50 font-semibold transition-colors"
                    >
                        ← Volver
                    </button>
                </div>
            )}
        </div>
    );
};
