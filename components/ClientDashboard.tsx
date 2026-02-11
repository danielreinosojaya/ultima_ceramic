import React, { useState, useEffect } from 'react';
import type { Booking, GroupTechnique } from '../types';
import * as dataService from '../services/dataService';
import { ClientBookingsView } from './ClientBookingsView';
import { ClientLogin } from './ClientLogin';
import { ClientSessionOptions } from './ClientSessionOptions';
import { CreateSessionForm } from './CreateSessionForm';
import { useAuth } from '../context/AuthContext';

// Helper para obtener nombre de técnica desde metadata
const getTechniqueName = (technique: GroupTechnique): string => {
  const names: Record<GroupTechnique, string> = {
    'potters_wheel': 'Torno Alfarero',
    'hand_modeling': 'Modelado a Mano',
    'painting': 'Pintura de piezas'
  };
  return names[technique] || technique;
};

// Helper para traducir productType a nombre legible
const getProductTypeName = (productType?: string): string => {
  const typeNames: Record<string, string> = {
    'SINGLE_CLASS': 'Clase Suelta',
    'CLASS_PACKAGE': 'Paquete de Clases',
    'INTRODUCTORY_CLASS': 'Clase Introductoria',
    'GROUP_CLASS': 'Clase Grupal',
    'COUPLES_EXPERIENCE': 'Experiencia de Parejas',
    'OPEN_STUDIO': 'Estudio Abierto'
  };
  return typeNames[productType || ''] || 'Clase';
};

// Helper para obtener el nombre del producto/técnica de un booking
const getBookingDisplayName = (booking: Booking): string => {
  // 1. Si tiene groupClassMetadata con techniqueAssignments (GROUP_CLASS)
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    if (uniqueTechniques.length === 1) {
      return getTechniqueName(uniqueTechniques[0]);
    }
    return 'Clase Grupal (mixto)';
  }
  
  // 2. Prioridad: product.name (es la fuente más confiable)
  const productName = booking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown' && productName !== null) {
    return productName;
  }
  
  // 3. Fallback: technique directamente (solo si product.name no existe)
  if (booking.technique) {
    return getTechniqueName(booking.technique);
  }
  
  // 4. Último fallback: productType
  return getProductTypeName(booking.productType);
};

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
                <div className="bg-gradient-to-br from-white/95 to-gray-50 rounded-2xl shadow-2xl border-2 border-white p-8">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <svg className="w-16 h-16 text-brand-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent mb-3">Tus Reservas</h1>
                        <p className="text-brand-secondary font-semibold text-base">Selecciona una para ver y reagendar tus clases</p>
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
                                className="w-full p-5 border-2 border-gray-300 rounded-lg hover:border-brand-primary hover:bg-gradient-to-r hover:from-brand-primary/10 hover:to-brand-accent/10 hover:shadow-md text-left transition-all duration-200"
                            >
                                <p className="font-bold text-lg text-brand-primary">
                                    {getBookingDisplayName(booking)}
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
            <div className="mb-10">
                <h1 className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent mb-4">Mi Panel de Clases</h1>
                <p className="text-brand-secondary font-semibold text-lg">Gestiona tus reservas y reagenda cuando sea necesario</p>
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
                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200">
                    <p className="text-brand-secondary font-semibold text-base sm:text-lg md:text-xl">No tienes clases programadas aún</p>
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
                    className="px-8 py-3 border-2 border-brand-primary text-brand-primary font-bold rounded-lg hover:bg-brand-primary/10 hover:shadow-md transition-all duration-200"
                >
                    ← Volver
                </button>
            </div>
        </div>
    );
};
