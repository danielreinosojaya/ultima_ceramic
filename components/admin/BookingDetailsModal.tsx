import React, { useState, useEffect, useMemo } from 'react';
import type { UserInfo, TimeSlot, PaymentDetails, AttendanceStatus, Product, Booking } from '../../types';
import * as dataService from '../../services/dataService';
import { UserIcon } from '../icons/UserIcon';
import { MailIcon } from '../icons/MailIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { EditIcon } from '../icons/EditIcon';
import { CurrencyDollarIcon } from '../icons/CurrencyDollarIcon';
import { CalendarEditIcon } from '../icons/CalendarEditIcon';
import { AuthorizeOverrideModal } from './AuthorizeOverrideModal';

type Attendee = { userInfo: UserInfo; bookingId: string; isPaid: boolean; bookingCode?: string; paymentDetails?: PaymentDetails[] };

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendees: Attendee[];
  date: string;
  time: string;
  product: Product;
  onBookingUpdate?: () => void;
  allBookings?: Booking[]; // Pass bookings as prop (optional)
  // Callbacks used in this component
  onRemoveAttendee?: (bookingId: string) => void;
  onAcceptPayment?: (bookingId: string) => void;
  onMarkAsUnpaid?: (bookingId: string) => void;
  onEditAttendee?: (bookingId: string) => void;
  onRescheduleAttendee?: (bookingId: string, oldSlot: any, label?: string) => void;
  instructorId?: string | number;
}

const formatTimeForInput = (time12h: string): string => {
    const date = new Date(`1970-01-01 ${time12h}`);
    return date.toTimeString().slice(0, 5);
};

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ date, time, attendees, instructorId, onClose, onRemoveAttendee, onAcceptPayment, onMarkAsUnpaid, onEditAttendee, onRescheduleAttendee }) => {
  // Fallbacks para evitar errores si no se pasan como función
  const safeOnRemoveAttendee = typeof onRemoveAttendee === 'function' ? onRemoveAttendee : () => {};
  const safeOnAcceptPayment = typeof onAcceptPayment === 'function' ? onAcceptPayment : () => {};
  const safeOnMarkAsUnpaid = typeof onMarkAsUnpaid === 'function' ? onMarkAsUnpaid : () => {};
  const safeOnEditAttendee = typeof onEditAttendee === 'function' ? onEditAttendee : () => {};
  const safeOnRescheduleAttendee = typeof onRescheduleAttendee === 'function' ? onRescheduleAttendee : () => {};
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [isPastClass, setIsPastClass] = useState(false);
  const [isAttendanceTaken, setIsAttendanceTaken] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideBookingId, setOverrideBookingId] = useState<string | null>(null);

  const slotIdentifier = useMemo(() => `${date}_${time}`, [date, time]);
  // Fecha en formato español
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Find the booking object for the first attendee (all attendees share the same booking)
  const [bookingsMap, setBookingsMap] = useState<Record<string, any>>({});
  const [overridesMap, setOverridesMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const fetchAllBookings = async () => {
      if (attendees.length === 0) return;
      // Use cached data from dataService instead of fresh fetch
      const cachedBookings = await dataService.getBookings();
      // Map bookingId to booking object for fast lookup
      const map: Record<string, any> = {};
      cachedBookings.forEach((b: any) => {
        map[b.id] = b;
      });
      setBookingsMap(map);
      // Preload overrides for each booking
      for (const a of attendees) {
        try {
          const ovs = await dataService.getBookingOverrides(a.bookingId);
          setOverridesMap(prev => ({ ...prev, [a.bookingId]: ovs }));
        } catch (e) {
          // ignore
        }
      }
    };
    // Only fetch once when component mounts
    if (Object.keys(bookingsMap).length === 0) {
      fetchAllBookings();
    }
  }, [attendees.length]); // Only depend on length, not full attendees array

  // ...existing code...

  useEffect(() => {
    const init = async () => {
      const time24h = formatTimeForInput(time);
      const [hours, minutes] = time24h.split(':').map(Number);
      const [year, month, day] = date.split('-').map(Number);
      const sessionDateTime = new Date(year, month - 1, day, hours, minutes);
      setIsPastClass(sessionDateTime < new Date());

      // Use bookingsMap instead of fetching again
      const initialAttendance: Record<string, AttendanceStatus> = {};
      let attendanceTaken = false;
      attendees.forEach(attendee => {
          const booking = bookingsMap[attendee.bookingId];
          const status = booking?.attendance?.[slotIdentifier];
          if (status) {
              initialAttendance[attendee.bookingId] = status;
              attendanceTaken = true;
          } else {
              initialAttendance[attendee.bookingId] = 'attended';
          }
      });
      setAttendanceData(initialAttendance);
      setIsAttendanceTaken(attendanceTaken);
    };
    // Only run when we have bookingsMap data
    if (Object.keys(bookingsMap).length > 0) {
      init();
    }
  }, [date, time, attendees, slotIdentifier, bookingsMap]);

  const handleAttendanceChange = (bookingId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({ ...prev, [bookingId]: status }));
  };

  const handleSaveAttendance = () => {
    Object.entries(attendanceData).forEach(([bookingId, status]) => {
        dataService.updateAttendanceStatus(bookingId, { date, time, instructorId }, status as AttendanceStatus);
    });
    setIsAttendanceTaken(true);
    alert("Attendance saved!");
    onClose();
  };

  const handleRemoveClick = (bookingId: string, userName: string) => {
    const confirmationMessage = `¿Seguro que quieres eliminar la reserva de ${userName}?`;
    if (window.confirm(confirmationMessage)) {
      safeOnRemoveAttendee(bookingId);
    }
  };
  
  return (
    <>
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >

        {attendees.length > 0 ? (
      <ul className="space-y-3">
      {attendees.map((attendee) => {
        const totalPaid = (attendee.paymentDetails || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        const firstPayment = (attendee.paymentDetails || [])[0];
        const attendeeBooking = bookingsMap[attendee.bookingId];
        const participantCount = attendeeBooking?.participants || 1;
        const manualNote = attendeeBooking?.clientNote || attendeeBooking?.manualNote || attendeeBooking?.note || attendeeBooking?.message || attendeeBooking?.comments || null;
  const bookingOverrides = overridesMap[attendee.bookingId] || [];

        return (
          <li key={attendee.bookingId} className="bg-brand-background p-3 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <UserIcon className="w-5 h-5 mr-2 text-brand-secondary" />
                  <p className="font-bold text-brand-text">{attendee.userInfo.firstName} {attendee.userInfo.lastName}</p>
                </div>
                {attendee.bookingCode && (
                <div className="text-xs font-mono text-brand-accent mb-2">
                  Código: {attendee.bookingCode}
                </div>
                )}
                <div className="flex items-center text-sm">
                  <MailIcon className="w-4 h-4 mr-2 text-brand-secondary" />
                  <a href={`mailto:${attendee.userInfo.email}`} className="text-brand-accent hover:underline">{attendee.userInfo.email}</a>
                </div>
                <div className="flex items-center text-sm mt-1">
                  <PhoneIcon className="w-4 h-4 mr-2 text-brand-secondary" />
                  <span className="text-brand-secondary">{attendee.userInfo.countryCode} {attendee.userInfo.phone}</span>
                </div>
                {/* Participant count and manual note inside card */}
                <div className="mt-2 text-xs font-bold text-brand-secondary">
                  {`Participantes: ${participantCount}`}
                </div>
                {manualNote && (
                  <div className="mt-1 p-1 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-900 text-xs rounded">
                  <span className="font-bold">Nota: </span>{manualNote}
                  </div>
                )}
                {bookingOverrides.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-50 border rounded text-xs">
                    <div className="font-bold text-sm mb-1">Excepciones registradas</div>
                    <ul className="space-y-1">
                      {bookingOverrides.map((o: any) => (
                        <li key={o.id} className="text-xs text-gray-700">
                          <div className="font-semibold">{o.overriddenBy}</div>
                          <div className="text-gray-600">{new Date(o.createdAt).toLocaleString()}</div>
                          <div className="mt-1">{o.reason}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className={`mt-2 text-xs font-bold px-2 py-0.5 rounded-full inline-block ${attendee.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}> 
                  {attendee.isPaid ? 'Pagado' : 'Pendiente de pago'}
                </div>
                {firstPayment && (
                  <div className="text-xs text-gray-500 mt-1">
                    {`Pagado: $${totalPaid.toFixed(2)} | Método: ${firstPayment.method} | Fecha: ${new Date(firstPayment.receivedAt).toLocaleDateString('es-ES')}`}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <button onClick={() => safeOnEditAttendee(attendee.bookingId)} title="Editar asistente" className="text-brand-secondary hover:text-brand-accent p-2 rounded-full hover:bg-gray-200 transition-colors">
                <EditIcon className="w-5 h-5" />
                </button>
                <button onClick={() => safeOnRescheduleAttendee(attendee.bookingId, { date, time, instructorId }, `${attendee.userInfo.firstName} ${attendee.userInfo.lastName}`)} title="Reagendar asistente" className="text-brand-secondary hover:text-brand-accent p-2 rounded-full hover:bg-gray-200 transition-colors">
                <CalendarEditIcon className="w-5 h-5" />
                </button>
                <button onClick={() => { setOverrideBookingId(attendee.bookingId); setOverrideModalOpen(true); }} title="Autorizar excepción" className="text-yellow-600 hover:text-yellow-800 p-2 rounded-full hover:bg-yellow-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.785.57-1.84-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z"/></svg>
                </button>
                <button onClick={() => handleRemoveClick(attendee.bookingId, `${attendee.userInfo.firstName} ${attendee.userInfo.lastName}`)} title="Eliminar asistente" className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition-colors">
                  <TrashIcon className="w-5 h-5" />
                </button>
                {attendee.isPaid ? (
                  <button onClick={() => safeOnMarkAsUnpaid(attendee.bookingId)} title="Marcar como no pagado" className="p-2 rounded-full text-brand-success hover:bg-green-100 transition-colors">
                    <CurrencyDollarIcon className="w-5 h-5"/>
                  </button>
                ) : (
                  <button onClick={() => safeOnAcceptPayment(attendee.bookingId)} title="Aceptar pago" className="p-2 rounded-full text-gray-400 hover:text-brand-success hover:bg-green-100 transition-colors">
                    <CurrencyDollarIcon className="w-5 h-5"/>
                  </button>
                )}
              </div>
            </div>
            {isPastClass && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-brand-secondary">Asistencia:</span>
                  {isAttendanceTaken ? (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${attendanceData[attendee.bookingId] === 'attended' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}> 
                      {attendanceData[attendee.bookingId] === 'attended' ? 'Asistió' : 'No asistió'}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${attendanceData[attendee.bookingId] === 'no-show' ? 'text-gray-400' : 'text-brand-text'}`}>Asistió</span>
                      <button
                        onClick={() => handleAttendanceChange(attendee.bookingId, attendanceData[attendee.bookingId] === 'attended' ? 'no-show' : 'attended')}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${attendanceData[attendee.bookingId] === 'attended' ? 'bg-brand-success' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${attendanceData[attendee.bookingId] === 'attended' ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <span className={`text-sm font-semibold ${attendanceData[attendee.bookingId] === 'attended' ? 'text-gray-400' : 'text-brand-text'}`}>No asistió</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
      </ul>
        ) : (
          <p className="text-center text-brand-secondary py-4">No hay asistentes</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
           {isPastClass && !isAttendanceTaken && attendees.length > 0 && (
             <button
                onClick={handleSaveAttendance}
                className="bg-brand-secondary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-text transition-colors"
             >
                Guardar asistencia
             </button>
           )}
          <button
            onClick={onClose}
            className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
    {overrideModalOpen && overrideBookingId && (
      <AuthorizeOverrideModal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        bookingId={overrideBookingId}
        onSaved={() => {
          // Refresh bookings map by clearing and re-fetching
          setBookingsMap({});
        }}
      />
    )}
    </>
  );
};
