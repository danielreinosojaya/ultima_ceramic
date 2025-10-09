import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Booking, TimeSlot, UserInfo, EditableBooking, RescheduleSlotInfo, PaymentDetails, Product } from '../../types';
import * as dataService from '../../services/dataService';
// Eliminado useLanguage, la app ahora es monolingüe en español
import { ManualBookingModal } from './ManualBookingModal';
import { ScheduleReportModal } from './ScheduleReportModal';
import { ClearScheduleModal } from './ClearScheduleModal';
import { UserPlusIcon } from '../icons/UserPlusIcon';
import { DocumentDownloadIcon } from '../icons/DocumentDownloadIcon';
import { CalendarClearIcon } from '../icons/CalendarClearIcon';
import { AcceptPaymentModal } from './AcceptPaymentModal';

type AttendeeInfo = { userInfo: UserInfo; bookingId: string; isPaid: boolean; bookingCode?: string; paymentDetails?: PaymentDetails; };
type SlotInfo = { attendees: AttendeeInfo[]; instructorId: number; };
type BookingsByDate = Record<string, Record<string, SlotInfo>>;

interface CalendarOverviewProps {
  onDateSelect: (date: Date) => void;
  bookings: Booking[];
  onDataChange: () => void;
  products: Product[];
}

export const CalendarOverview: React.FC<CalendarOverviewProps> = ({ onDateSelect, bookings, onDataChange, products }) => {
  console.log('CalendarOverview received bookings:', bookings?.length || 0);
  
  // Monolingüe español, textos hardcodeados
  const language = 'es-ES';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isManualBookingModalOpen, setIsManualBookingModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isClearScheduleModalOpen, setIsClearScheduleModalOpen] = useState(false);

  const { bookingsByDate, unpaidDates } = useMemo(() => {
    console.log('CalendarOverview processing bookings:', bookings?.length || 0);
    if (!bookings || bookings.length === 0) {
      console.log('No bookings to process');
      return { bookingsByDate: {}, unpaidDates: new Set<string>() };
    }
    
    const acc: BookingsByDate = {};
    const unpaid = new Set<string>();
    
    bookings.forEach((booking, index) => {
      console.log(`Processing booking ${index}:`, {
        id: booking.id,
        isPaid: booking.isPaid,
        slots: booking.slots?.length || 0,
        userInfo: !!booking.userInfo
      });
      
      if (!booking.isPaid) {
        booking.slots?.forEach(slot => unpaid.add(slot.date));
      }
      
      booking.slots?.forEach(slot => {
        if (!booking.userInfo) {
          console.log('Booking missing userInfo:', booking.id);
          return;
        }
        if (!acc[slot.date]) acc[slot.date] = {};
        if (!acc[slot.date][slot.time]) acc[slot.date][slot.time] = { attendees: [], instructorId: slot.instructorId };
        acc[slot.date][slot.time].attendees.push({ 
          userInfo: booking.userInfo, 
          bookingId: booking.id, 
          isPaid: booking.isPaid, 
          bookingCode: booking.bookingCode, 
          paymentDetails: booking.paymentDetails 
        });
      });
    });
    
    console.log('Final bookingsByDate:', Object.keys(acc).length, 'dates with bookings');
    return { bookingsByDate: acc, unpaidDates: unpaid };
  }, [bookings]);
  
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const blanks = Array(firstDayOfMonth.getDay()).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  const formatDateToYYYYMMDD = (d: Date): string => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const handleManualBookingAdded = () => {
    onDataChange();
    setIsManualBookingModalOpen(false);
  };

  const handleClearSchedule = () => {
    onDataChange();
    setIsClearScheduleModalOpen(false);
  };

  return (
    <div>
      {isManualBookingModalOpen && (
        <ManualBookingModal
          isOpen={isManualBookingModalOpen}
          onClose={() => setIsManualBookingModalOpen(false)}
          onBookingAdded={handleManualBookingAdded}
          existingBookings={bookings}
          availableProducts={products}
        />
      )}
      {isReportModalOpen && (
          <ScheduleReportModal
              isOpen={isReportModalOpen}
              onClose={() => setIsReportModalOpen(false)}
              allBookings={bookings}
          />
      )}
      {isClearScheduleModalOpen && (
        <ClearScheduleModal
          isOpen={isClearScheduleModalOpen}
          onClose={() => setIsClearScheduleModalOpen(false)}
          allBookings={bookings}
          onConfirm={handleClearSchedule}
        />
      )}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div>
            <h2 className="text-2xl font-serif text-brand-text mb-2">Calendario de Reservas</h2>
            <p className="text-brand-secondary">Visualiza y gestiona las reservas del mes. Haz clic en un día para ver el detalle semanal.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => setIsClearScheduleModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-red-100 border border-red-500 text-red-600 font-bold py-2 px-4 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
            >
              <CalendarClearIcon className="w-5 h-5" />
              Limpiar Horario
            </button>
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-4 rounded-lg hover:bg-brand-secondary hover:text-white transition-colors"
            >
              <DocumentDownloadIcon className="w-5 h-5" />
              Descargar Reporte
            </button>
            <button 
              onClick={() => setIsManualBookingModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent transition-colors"
            >
              <UserPlusIcon className="w-5 h-5" />
              Agregar Reserva Manual
            </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="p-2 rounded-full hover:bg-brand-background"
          >&larr;</button>
          <h3 className="text-xl font-bold text-brand-text capitalize">
            {currentDate.toLocaleString(language, { month: 'long', year: 'numeric' })}
          </h3>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="p-2 rounded-full hover:bg-brand-background"
          >&rarr;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm text-brand-secondary">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => <div key={day} className="font-bold">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 mt-2">
          {calendarDays.map((day, index) => {
            if (!day) return <div key={`blank-${index}`} className="border rounded-md border-gray-100 bg-gray-50 aspect-square"></div>;
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateStr = formatDateToYYYYMMDD(date);
            const hasBookings = !!bookingsByDate[dateStr];
            const hasUnpaidBookings = unpaidDates.has(dateStr);
            // Check if any booking for this day is a group class (manual booking or not)
            const isGroupClassDay = hasBookings && Object.values(bookingsByDate[dateStr]).some(slotInfo => (slotInfo as SlotInfo).attendees.some(att => att.bookingId && bookings.find(b => b.id === att.bookingId && b.productType === 'GROUP_CLASS')));
            return (
              <div 
                key={day}
                className="relative"
              >
                <button
                  onClick={() => onDateSelect(date)}
                  className={`w-full aspect-square border rounded-md flex flex-col items-center justify-center text-sm font-semibold transition-all duration-200 p-1 group
                    ${hasBookings ? (isGroupClassDay ? 'bg-blue-100 hover:bg-blue-200 cursor-pointer' : 'bg-brand-primary/20 hover:bg-brand-primary/30 cursor-pointer') : 'bg-white'}
                  `}
                >
                  <span className="transition-transform duration-200 group-hover:scale-110">{day}</span>
                  {hasBookings && <div className={`w-2 h-2 rounded-full mt-1 ${hasUnpaidBookings ? 'border-2 border-brand-accent bg-white' : 'bg-brand-accent'}`}></div>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};