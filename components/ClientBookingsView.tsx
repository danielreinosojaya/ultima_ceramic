import React, { useState } from 'react';
import type { Booking, AppData, TimeSlot, GroupTechnique } from '../types';
import { RescheduleClientFlow } from './RescheduleClientFlow';
import { formatDate } from '../utils/formatters';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

// Helper para obtener nombre de técnica desde metadata
const getTechniqueName = (technique: GroupTechnique | string): string => {
    const names: Record<string, string> = {
    'potters_wheel': 'Torno Alfarero',
    'hand_modeling': 'Modelado a Mano',
        'painting': 'Pintura de piezas',
        'molding': 'Modelado a Mano'
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
        'CUSTOM_GROUP_EXPERIENCE': 'Experiencia Grupal Personalizada',
    'COUPLES_EXPERIENCE': 'Experiencia de Parejas',
    'OPEN_STUDIO': 'Estudio Abierto'
  };
  return typeNames[productType || ''] || 'Clase';
};

// Helper para obtener el nombre del producto/técnica de un booking
// CRÍTICO: Para SINGLE_CLASS, SIEMPRE mostrar técnica, nunca "Clase Suelta"
const getBookingDisplayName = (booking: Booking): string => {
    // 0. Para SINGLE_CLASS, SIEMPRE mostrar técnica
    if (booking.productType === 'SINGLE_CLASS') {
        if (booking.technique) {
            return getTechniqueName(booking.technique as any);
        }
        // Fallback: derivar de product.name
        const productName = booking.product?.name?.toLowerCase() || '';
        if (productName.includes('torno')) return 'Torno Alfarero';
        if (productName.includes('modelado')) return 'Modelado a Mano';
        if (productName.includes('pintura')) return 'Pintura de piezas';
        return 'Clase';
    }

    // 1. Para experiencia grupal personalizada, priorizar técnica sobre nombre genérico
    if (
        booking.technique &&
        (booking.productType === 'CUSTOM_GROUP_EXPERIENCE' || booking.product?.name === 'Experiencia Grupal Personalizada')
    ) {
        return getTechniqueName(booking.technique);
    }

  // 2. Si tiene groupClassMetadata con techniqueAssignments (GROUP_CLASS)
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    if (uniqueTechniques.length === 1) {
      return getTechniqueName(uniqueTechniques[0]);
    }
    return 'Clase Grupal (mixto)';
  }
  
  // 3. Prioridad: product.name (es la fuente más confiable)
  const productName = booking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown' && productName !== null) {
    return productName;
  }
  
  // 4. Fallback: technique directamente (solo si product.name no existe)
  if (booking.technique) {
    return getTechniqueName(booking.technique);
  }
  
  // 5. Último fallback: productType
  return getProductTypeName(booking.productType);
};

interface ClientBookingsViewProps {
    bookings: Booking[];
    appData: AppData | null;
    onDataRefresh?: () => void;
}

interface ClassCard {
    booking: Booking;
    slot: TimeSlot;
    index: number;
}

/**
 * ClientBookingsView - Option A: Modal Detail View
 * 
 * Displays each CLASS SLOT as an independent card with individual "Reagendar" button.
 * Each class opens a modal when reagendar is clicked.
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

    // Create class cards from all slots in all bookings
    const allClasses: ClassCard[] = [];
    bookings.forEach(booking => {
        if (booking.slots && booking.slots.length > 0) {
            booking.slots.forEach((slot, idx) => {
                allClasses.push({ booking, slot, index: idx });
            });
        }
    });

    // Separate upcoming and past classes
    const now = new Date();
    const upcomingClasses = allClasses.filter(cls => {
        if (!cls.slot || !cls.slot.date) return false;
        const slotDate = new Date(cls.slot.date);
        return slotDate > now;
    });

    const pastClasses = allClasses.filter(cls => {
        if (!cls.slot || !cls.slot.date) return true;
        const slotDate = new Date(cls.slot.date);
        return slotDate <= now;
    });

    return (
        <div className="space-y-8">
            {/* Upcoming Classes */}
            {upcomingClasses.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-brand-text mb-4">Próximas Clases</h2>
                    <div className="grid gap-4">
                        {upcomingClasses.map((classCard, idx) => (
                            <div key={`${classCard.booking.id}-${classCard.index}`} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-brand-text">
                                            {getBookingDisplayName(classCard.booking)}
                                        </h3>
                                        <p className="text-sm text-brand-secondary mt-1">
                                            Código: {classCard.booking.bookingCode}
                                        </p>
                                    </div>
                                    <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                        Confirmado
                                    </span>
                                </div>

                                {/* Individual Class Date/Time */}
                                <div className="mb-4 space-y-2">
                                    <div className="flex items-center gap-2 text-brand-secondary">
                                        <CalendarIcon className="w-4 h-4" />
                                        <span className="font-semibold">{formatDate(classCard.slot.date)}</span>
                                        {classCard.slot.time && (
                                            <>
                                                <ClockIcon className="w-4 h-4" />
                                                <span className="font-semibold">{classCard.slot.time}</span>
                                            </>
                                        )}
                                    </div>
                                    {classCard.booking.slots && classCard.booking.slots.length > 1 && (
                                        <p className="text-xs text-gray-500">
                                            Clase {classCard.index + 1} de {classCard.booking.slots.length}
                                        </p>
                                    )}
                                </div>

                                {/* Reschedule Button - Per Class */}
                                <button
                                    onClick={() => handleRescheduleClick(classCard.booking)}
                                    className="mt-4 px-4 py-2 bg-brand-accent text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Reagendar esta Clase
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Past Classes */}
            {pastClasses.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-brand-text mb-4">Clases Pasadas</h2>
                    <div className="grid gap-4 opacity-75">
                        {pastClasses.map((classCard) => (
                            <div key={`${classCard.booking.id}-${classCard.index}`} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-lg font-bold text-brand-text">
                                        {getBookingDisplayName(classCard.booking)}
                                    </h3>
                                    <span className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold">
                                        Completada
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-brand-secondary mt-1">
                                    <CalendarIcon className="w-4 h-4" />
                                    <span>{formatDate(classCard.slot.date)}</span>
                                    {classCard.slot.time && (
                                        <>
                                            <ClockIcon className="w-4 h-4" />
                                            <span>{classCard.slot.time}</span>
                                        </>
                                    )}
                                </div>
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
