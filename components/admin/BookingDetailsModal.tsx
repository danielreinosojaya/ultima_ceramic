import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { UserInfo, TimeSlot, PaymentDetails, AttendanceStatus, Product, Booking } from '../../types';
import * as dataService from '../../services/dataService';
import { UserIcon } from '../icons/UserIcon';
import { MailIcon } from '../icons/MailIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { EditIcon } from '../icons/EditIcon';
import { CurrencyDollarIcon } from '../icons/CurrencyDollarIcon';
import { CalendarEditIcon } from '../icons/CalendarEditIcon';

type AttendeeInfo = { userInfo: UserInfo; bookingId: string; isPaid: boolean; bookingCode?: string, paymentDetails?: PaymentDetails[] };

interface Attendee {
  id: string;
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    countryCode?: string;
  };
  bookingId: string;
  bookingCode?: string;
  paymentDetails?: PaymentDetails[];
  isPaid?: boolean;
}

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendees: Attendee[];
  date: string;
  time: string;
  product: Product;
  onBookingUpdate?: () => void;
  allBookings: Booking[];
  instructorId?: number;
  onRemoveAttendee?: (bookingId: string) => void;
  onAcceptPayment?: (bookingId: string) => void;
  onMarkAsUnpaid?: (bookingId: string) => void;
  onEditAttendee?: (bookingId: string) => void;
  onRescheduleAttendee?: (bookingId: string, slot: TimeSlot, attendeeName: string) => void;
}

const formatTimeForInput = (time12h: string): string => {
    const date = new Date(`1970-01-01 ${time12h}`);
    return date.toTimeString().slice(0, 5);
};

/** undefined = nunca guardado en servidor para este turno */
type SavedAttendanceMap = Record<string, AttendanceStatus | undefined>;

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  date,
  time,
  attendees,
  instructorId,
  onClose,
  onBookingUpdate,
  onRemoveAttendee,
  onAcceptPayment,
  onMarkAsUnpaid,
  onEditAttendee,
  onRescheduleAttendee,
  allBookings = [],
}) => {
  const safeOnEditAttendee = typeof onEditAttendee === 'function' ? onEditAttendee : () => {};
  const safeOnRescheduleAttendee = typeof onRescheduleAttendee === 'function' ? onRescheduleAttendee : () => {};

  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [savedAttendance, setSavedAttendance] = useState<SavedAttendanceMap>({});
  const [isPastClass, setIsPastClass] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const slotIdentifier = useMemo(() => `${date}_${time}`, [date, time]);

  const [bookingsMap, setBookingsMap] = useState<Record<string, any>>({});

  useEffect(() => {
    let cancelled = false;
    const loadMap = async () => {
      if (attendees.length === 0) return;
      const map: Record<string, any> = {};
      if (Array.isArray(allBookings) && allBookings.length > 0) {
        allBookings.forEach((b: any) => {
          map[b.id] = b;
        });
        if (!cancelled) setBookingsMap(map);
        return;
      }
      const cachedBookings = await dataService.getBookings();
      if (cancelled) return;
      cachedBookings.forEach((b: any) => {
        map[b.id] = b;
      });
      setBookingsMap(map);
    };
    loadMap();
    return () => {
      cancelled = true;
    };
  }, [date, time, attendees, allBookings]);

  useEffect(() => {
    const time24h = formatTimeForInput(time);
    const [hours, minutes] = time24h.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    const sessionDateTime = new Date(year, month - 1, day, hours, minutes);
    setIsPastClass(sessionDateTime < new Date());

    const initialAttendance: Record<string, AttendanceStatus> = {};
    const initialSaved: SavedAttendanceMap = {};

    attendees.forEach(attendee => {
      const booking = bookingsMap[attendee.bookingId];
      const status = booking?.attendance?.[slotIdentifier] as AttendanceStatus | undefined;
      if (status === 'attended' || status === 'no-show') {
        initialAttendance[attendee.bookingId] = status;
        initialSaved[attendee.bookingId] = status;
      } else {
        initialAttendance[attendee.bookingId] = 'attended';
        initialSaved[attendee.bookingId] = undefined;
      }
    });

    setAttendanceData(initialAttendance);
    setSavedAttendance(initialSaved);
    setSaveError(null);
    setSaveMessage(null);
  }, [date, time, attendees, slotIdentifier, bookingsMap]);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = setTimeout(() => setSaveMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [saveMessage]);

  const hasUnsavedChanges = useMemo(() => {
    return attendees.some(attendee => {
      const saved = savedAttendance[attendee.bookingId];
      const current = attendanceData[attendee.bookingId];
      if (saved === undefined) return true;
      return saved !== current;
    });
  }, [attendees, savedAttendance, attendanceData]);

  const handleAttendanceChange = (bookingId: string, status: AttendanceStatus) => {
    setSaveError(null);
    setAttendanceData(prev => ({ ...prev, [bookingId]: status }));
  };

  const handleSaveAttendance = useCallback(async () => {
    const toSave = attendees
      .map(attendee => {
        const bookingId = attendee.bookingId;
        const status = attendanceData[bookingId];
        const saved = savedAttendance[bookingId];
        if (saved !== undefined && saved === status) return null;
        return { bookingId, status };
      })
      .filter((entry): entry is { bookingId: string; status: AttendanceStatus } => entry !== null);

    if (toSave.length === 0) return;

    setIsSavingAttendance(true);
    setSaveError(null);
    setSaveMessage(null);

    const results = await Promise.allSettled(
      toSave.map(({ bookingId, status }) =>
        dataService.updateAttendanceStatus(bookingId, { date, time, instructorId }, status)
      )
    );

    const failed: string[] = [];
    const succeeded: { bookingId: string; status: AttendanceStatus }[] = [];

    results.forEach((result, index) => {
      const { bookingId, status } = toSave[index];
      const ok =
        result.status === 'fulfilled' &&
        result.value &&
        result.value.success !== false;
      if (ok) {
        succeeded.push({ bookingId, status });
      } else {
        failed.push(bookingId);
      }
    });

    if (succeeded.length > 0) {
      setSavedAttendance(prev => {
        const next = { ...prev };
        succeeded.forEach(({ bookingId, status }) => {
          next[bookingId] = status;
        });
        return next;
      });

      setBookingsMap(prev => {
        const next = { ...prev };
        succeeded.forEach(({ bookingId, status }) => {
          if (next[bookingId]) {
            next[bookingId] = {
              ...next[bookingId],
              attendance: { ...(next[bookingId].attendance || {}), [slotIdentifier]: status },
            };
          }
        });
        return next;
      });

      onBookingUpdate?.();
    }

    setIsSavingAttendance(false);

    if (failed.length > 0) {
      const label = failed.length === toSave.length
        ? 'No se pudo guardar la asistencia. Verifica tu conexión e intenta de nuevo.'
        : `Se guardaron ${succeeded.length} de ${toSave.length} registros. ${failed.length} fallaron — intenta guardar de nuevo.`;
      setSaveError(label);
      return;
    }

    setSaveMessage(
      succeeded.length === 1
        ? 'Asistencia guardada correctamente.'
        : `Asistencia guardada para ${succeeded.length} asistentes.`
    );
  }, [attendees, attendanceData, savedAttendance, date, time, instructorId, slotIdentifier, onBookingUpdate]);

  const handleRemoveClick = (bookingId: string, userName: string) => {
    const confirmationMessage = `¿Seguro que quieres eliminar la reserva de ${userName}?`;
    if (window.confirm(confirmationMessage)) {
      onRemoveAttendee?.(bookingId);
    }
  };

  const getAttendanceSaveState = (bookingId: string): 'saved' | 'pending' | 'unsaved' => {
    const saved = savedAttendance[bookingId];
    const current = attendanceData[bookingId];
    if (saved === undefined) return 'unsaved';
    if (saved !== current) return 'pending';
    return 'saved';
  };

  return (
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
        const attendanceSaveState = getAttendanceSaveState(attendee.bookingId);

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
                {attendeeBooking?.corporateEventId && (
                  <div className="text-xs font-bold uppercase bg-violet-100 text-violet-900 inline-block px-2 py-0.5 rounded mb-2">
                    Evento corporativo
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
                <div className="mt-2 text-xs font-bold text-brand-secondary">
                  {`Participantes: ${participantCount}`}
                </div>
                {manualNote && (
                  <div className="mt-1 p-1 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-900 text-xs rounded">
                  <span className="font-bold">Nota: </span>{manualNote}
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
                <button onClick={() => handleRemoveClick(attendee.bookingId, `${attendee.userInfo.firstName} ${attendee.userInfo.lastName}`)} title="Eliminar asistente" className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition-colors">
                  <TrashIcon className="w-5 h-5" />
                </button>
                {attendee.isPaid ? (
                  <button onClick={() => onMarkAsUnpaid?.(attendee.bookingId)} title="Marcar como no pagado" className="p-2 rounded-full text-brand-success hover:bg-green-100 transition-colors">
                    <CurrencyDollarIcon className="w-5 h-5"/>
                  </button>
                ) : (
                  <button onClick={() => onAcceptPayment?.(attendee.bookingId)} title="Aceptar pago" className="p-2 rounded-full text-gray-400 hover:text-brand-success hover:bg-green-100 transition-colors">
                    <CurrencyDollarIcon className="w-5 h-5"/>
                  </button>
                )}
              </div>
            </div>
            {isPastClass && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-brand-secondary">Asistencia:</span>
                    {attendanceSaveState === 'saved' && (
                      <span className="text-[10px] font-semibold text-green-700">Guardado</span>
                    )}
                    {attendanceSaveState === 'pending' && (
                      <span className="text-[10px] font-semibold text-amber-700">Cambio sin guardar</span>
                    )}
                    {attendanceSaveState === 'unsaved' && (
                      <span className="text-[10px] font-semibold text-gray-500">Sin registrar</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${attendanceData[attendee.bookingId] === 'no-show' ? 'text-gray-400' : 'text-brand-text'}`}>Asistió</span>
                    <button
                      type="button"
                      disabled={isSavingAttendance}
                      onClick={() => handleAttendanceChange(
                        attendee.bookingId,
                        attendanceData[attendee.bookingId] === 'attended' ? 'no-show' : 'attended'
                      )}
                      aria-label={attendanceData[attendee.bookingId] === 'attended' ? 'Marcar como no asistió' : 'Marcar como asistió'}
                      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors disabled:opacity-50 ${attendanceData[attendee.bookingId] === 'attended' ? 'bg-brand-success' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${attendanceData[attendee.bookingId] === 'attended' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-semibold ${attendanceData[attendee.bookingId] === 'attended' ? 'text-gray-400' : 'text-brand-text'}`}>No asistió</span>
                  </div>
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

        {(saveError || saveMessage) && (
          <div className={`mt-4 px-4 py-3 rounded-lg text-sm font-medium ${saveError ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
            {saveError || saveMessage}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
           {isPastClass && attendees.length > 0 && hasUnsavedChanges && (
             <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSavingAttendance}
                className="bg-brand-secondary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-text transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
             >
                {isSavingAttendance ? 'Guardando…' : 'Guardar asistencia'}
             </button>
           )}
          <button
            type="button"
            onClick={onClose}
            disabled={isSavingAttendance}
            className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent transition-colors disabled:opacity-60"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
