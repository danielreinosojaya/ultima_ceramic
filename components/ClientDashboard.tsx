import React, { useState, useEffect } from 'react';
import type { Booking } from '../types';
import * as dataService from '../services/dataService';
import { ClientBookingsView } from './ClientBookingsView';
import { ClientLogin } from './ClientLogin';
import { ClientSessionOptions } from './ClientSessionOptions';
import { CreateSessionForm } from './CreateSessionForm';
import { useAuth } from '../context/AuthContext';

interface ClientDashboardProps {
    onClose?: () => void;
}

type DashboardView = 'options' | 'login' | 'create' | 'select-booking' | 'bookings' | 'loading';

/**
 * ClientDashboard
 * 
 * Main entry point for clients:
 * 1. No session → Show options: Login OR Create New
 * 2. Has session → Show bookings view
 * 
 * Uses AuthContext for JWT authentication
 */
export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onClose }) => {
    const { isAuthenticated, booking: authBooking, loading: authLoading } = useAuth();
    const [currentView, setCurrentView] = useState<DashboardView>('options');
    const [clientBookings, setClientBookings] = useState<Booking[]>([]);
    const [selectedBookingIndex, setSelectedBookingIndex] = useState(0);

    // Determine which view to show
    useEffect(() => {
        if (authLoading) {
            setCurrentView('loading');
            return;
        }

        if (isAuthenticated && authBooking) {
            // User has booking → show bookings view
            setClientBookings([authBooking]);
            setSelectedBookingIndex(0);
            setCurrentView('bookings');
        } else if (isAuthenticated && !authBooking) {
            // User has session but no booking → show bookings view (can create new)
            setCurrentView('bookings');
        } else {
            // No authentication → show options
            setCurrentView('options');
        }
    }, [isAuthenticated, authBooking, authLoading]);

    // Loading state
    if (currentView === 'loading') {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    // Option 1: Choose between Login or Create
    if (currentView === 'options') {
        return (
            <ClientSessionOptions
                onLogin={() => setCurrentView('login')}
                onCreateNew={() => setCurrentView('create')}
            />
        );
    }

    // Option 2: Login with existing booking
    if (currentView === 'login') {
        return (
            <ClientLogin
                onSuccess={(booking) => {
                    // After login, fetch ALL bookings for this email
                    const email = booking.userInfo?.email;
                    if (email) {
                        fetch('/api/auth?action=list-bookings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email })
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.success && data.bookings && data.bookings.length > 0) {
                                    // Set all bookings and go to SELECT view (not bookings)
                                    setClientBookings(data.bookings);
                                    setCurrentView('select-booking');
                                } else {
                                    // Fallback to single booking
                                    setClientBookings([booking]);
                                    setSelectedBookingIndex(0);
                                    setCurrentView('bookings');
                                }
                            })
                            .catch(err => {
                                console.error('Error fetching all bookings:', err);
                                // Fallback to single booking
                                setClientBookings([booking]);
                                setSelectedBookingIndex(0);
                                setCurrentView('bookings');
                            });
                    } else {
                        // No email in booking info, use single booking
                        setClientBookings([booking]);
                        setSelectedBookingIndex(0);
                        setCurrentView('bookings');
                    }
                }}
                onBack={() => setCurrentView('options')}
                showBackButton={true}
            />
        );
    }

    // Option 3: Create new session
    if (currentView === 'create') {
        return (
            <CreateSessionForm
                onSuccess={() => {
                    // Session created → show bookings view
                    setCurrentView('bookings');
                }}
                onBack={() => setCurrentView('options')}
            />
        );
    }

    // Option 4: Select booking (after login with multiple bookings)
    if (currentView === 'select-booking') {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <svg className="w-12 h-12 text-brand-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-brand-text mb-2">Tus Reservas</h1>
                        <p className="text-brand-secondary text-sm">Selecciona una para ver y reagendar tus clases</p>
                    </div>

                    <button
                        onClick={() => setCurrentView('login')}
                        className="flex items-center gap-2 text-brand-primary text-sm hover:underline mb-6"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Cambiar email
                    </button>

                    <p className="text-sm text-brand-secondary mb-4">
                        Tienes {clientBookings.length} reserva{clientBookings.length !== 1 ? 's' : ''} activa{clientBookings.length !== 1 ? 's' : ''}:
                    </p>

                    <div className="space-y-3">
                        {clientBookings.map((booking, index) => (
                            <button
                                key={booking.id || index}
                                onClick={() => {
                                    setSelectedBookingIndex(index);
                                    setCurrentView('bookings');
                                }}
                                className="w-full p-4 border-2 border-brand-border rounded-lg hover:border-brand-primary hover:bg-blue-50 text-left transition-colors"
                            >
                                <p className="font-semibold text-brand-text">
                                    {booking.product?.name || 'Experiencia'}
                                </p>
                                {booking.bookingDate && (
                                    <p className="text-sm text-brand-secondary mt-1">
                                        Reservada: {booking.bookingDate}
                                    </p>
                                )}
                                {booking.slots && booking.slots.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {booking.slots.length} clase{booking.slots.length !== 1 ? 's' : ''}
                                    </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">Código: {booking.bookingCode}</p>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentView('options')}
                        className="w-full text-brand-primary text-sm hover:underline mt-6"
                    >
                        Ingresa el código manualmente
                    </button>
                </div>
            </div>
        );
    }

    // Main view: Show bookings (single booking selected)
    const currentBooking = clientBookings.length > 0 ? clientBookings[selectedBookingIndex] : null;
    
    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-brand-text mb-2">Mi Panel de Clases</h1>
                <p className="text-brand-secondary">Gestiona tus reservas y reagenda cuando sea necesario</p>
            </div>

            {/* Bookings View - Pass ONLY current booking */}
            {currentBooking ? (
                <ClientBookingsView
                    bookings={[currentBooking]}
                    appData={null}
                    onDataRefresh={() => {
                        // Refresh bookings after reschedule
                        fetch('/api/auth?action=list-bookings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: currentBooking.userInfo?.email })
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.success && data.bookings) {
                                    setClientBookings(data.bookings);
                                }
                            })
                            .catch(err => console.error('Error refreshing bookings:', err));
                    }}
                />
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-brand-secondary text-sm sm:text-base md:text-lg">No tienes clases programadas aún</p>
                    <p className="text-brand-secondary text-xs sm:text-sm mt-2">
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

            {/* Back Button */}
            <div className="mt-8 flex justify-center">
                <button
                    onClick={() => {
                        if (clientBookings.length > 1) {
                            // If multiple bookings, go back to selection screen
                            setCurrentView('select-booking');
                        } else {
                            // If only 1 booking, go to options
                            setCurrentView('options');
                        }
                    }}
                    className="px-6 py-2 border border-brand-border rounded-lg text-brand-text hover:bg-gray-50 font-semibold transition-colors"
                >
                    ← Volver
                </button>
            </div>
        </div>
    );
};
