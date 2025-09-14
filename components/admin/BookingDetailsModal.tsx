
import React, { useState, useEffect, useMemo } from 'react';
import type { UserInfo, TimeSlot, Booking, PaymentDetails, AttendanceStatus } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import * as dataService from '../../services/dataService';
import { UserIcon } from '../icons/UserIcon';
import { MailIcon } from '../icons/MailIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { EditIcon } from '../icons/EditIcon';
import { CurrencyDollarIcon } from '../icons/CurrencyDollarIcon';
import { CalendarEditIcon } from '../icons/CalendarEditIcon';

type AttendeeInfo = { userInfo: UserInfo; bookingId: string; isPaid: boolean; bookingCode?: string, paymentDetails?: PaymentDetails };

interface BookingDetailsModalProps {
  date: string;
  time: string;
  attendees: AttendeeInfo[];
  instructorId: number;
  onClose: () => void;
  onRemoveAttendee: (bookingId: string) => void;
  onAcceptPayment: (bookingId: string) => void;
  onMarkAsUnpaid: (bookingId: string) => void;
  onEditAttendee: (bookingId: string) => void;
  onRescheduleAttendee: (bookingId: string, slot: TimeSlot, attendeeName: string) => void;
}

const formatTimeForInput = (time12h: string): string => {
    const date = new Date(`1970-01-01 ${time12h}`);
    return date.toTimeString().slice(0, 5);
};

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ date, time, attendees, instructorId, onClose, onRemoveAttendee, onAcceptPayment, onMarkAsUnpaid, onEditAttendee, onRescheduleAttendee }) => {
  const { t, language } = useLanguage();
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [isPastClass, setIsPastClass] = useState(false);
  const [isAttendanceTaken, setIsAttendanceTaken] = useState(false);

  const slotIdentifier = useMemo(() => `${date}_${time}`, [date, time]);
  
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString(language, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  useEffect(() => {
    const init = async () => {
      const time24h = formatTimeForInput(time);
      const [hours, minutes] = time24h.split(':').map(Number);
      const [year, month, day] = date.split('-').map(Number);
      const sessionDateTime = new Date(year, month - 1, day, hours, minutes);
      setIsPastClass(sessionDateTime < new Date());

      const allBookings = await dataService.getBookings();
      const initialAttendance: Record<string, AttendanceStatus> = {};
      let attendanceTaken = false;
      attendees.forEach(attendee => {
          const booking = allBookings.find(b => b.id === attendee.bookingId);
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
    init();
  }, [date, time, attendees, slotIdentifier]);

  const handleAttendanceChange = (bookingId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({ ...prev, [bookingId]: status }));
    // Allow editing, so we don't set isAttendanceTaken to true here.
    // It should be considered editable until closed.
  };

  const handleSaveAttendance = () => {
    Object.entries(attendanceData).forEach(([bookingId, status]) => {
        // FIX: Explicitly cast 'status' to AttendanceStatus to resolve type inference issue.
        dataService.updateAttendanceStatus(bookingId, { date, time, instructorId }, status as AttendanceStatus);
    });
    setIsAttendanceTaken(true);
    // Give feedback to user
    alert("Attendance saved!");
    onClose();
  };

  const handleRemoveClick = (bookingId: string, userName: string) => {
    const confirmationMessage = t('admin.bookingModal.removeConfirmText', { name: userName });
    if (window.confirm(confirmationMessage)) {
      onRemoveAttendee(bookingId);
    }
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
        <div className="text-center mb-4">
          <h2 className="text-xl font-serif text-brand-accent">{t('admin.bookingModal.title')} {time}</h2>
          <p className="text-brand-secondary">{formattedDate}</p>
        </div>

        {attendees.length > 0 ? (
          <ul className="space-y-3">
            {attendees.map((attendee) => (
              <li key={attendee.bookingId} className="bg-brand-background p-3 rounded-lg">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center mb-2">
                            <UserIcon className="w-5 h-5 mr-2 text-brand-secondary" />
                            <p className="font-bold text-brand-text">{attendee.userInfo.firstName} {attendee.userInfo.lastName}</p>
                        </div>
                        {attendee.bookingCode && (
                           <div className="text-xs font-mono text-brand-accent mb-2">
                              Code: {attendee.bookingCode}
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
                        <div className={`mt-2 text-xs font-bold px-2 py-0.5 rounded-full inline-block ${attendee.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {attendee.isPaid ? t('admin.bookingModal.paidStatus') : t('admin.bookingModal.unpaidStatus')}
                        </div>
                        {attendee.isPaid && attendee.paymentDetails && (
                            <div className="text-xs text-gray-500 mt-1">
                                Paid ${attendee.paymentDetails.amount.toFixed(2)} via {attendee.paymentDetails.method} on {new Date(attendee.paymentDetails.receivedAt).toLocaleDateString(language)}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <button onClick={() => onEditAttendee(attendee.bookingId)} title={t('admin.bookingModal.editAttendee')} className="text-brand-secondary hover:text-brand-accent p-2 rounded-full hover:bg-gray-200 transition-colors">
                          <EditIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => onRescheduleAttendee(attendee.bookingId, { date, time, instructorId }, `${attendee.userInfo.firstName} ${attendee.userInfo.lastName}`)} title={t('admin.bookingModal.rescheduleAttendee')} className="text-brand-secondary hover:text-brand-accent p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <CalendarEditIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleRemoveClick(attendee.bookingId, `${attendee.userInfo.firstName} ${attendee.userInfo.lastName}`)} title={t('admin.bookingModal.removeAttendee')} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition-colors">
                          <TrashIcon className="w-5 h-5" />
                      </button>
                      {attendee.isPaid ? (
                         <button onClick={() => onMarkAsUnpaid(attendee.bookingId)} title="Mark as Unpaid" className="p-2 rounded-full text-brand-success hover:bg-green-100 transition-colors">
                            <CurrencyDollarIcon className="w-5 h-5"/>
                        </button>
                      ) : (
                        <button onClick={() => onAcceptPayment(attendee.bookingId)} title="Accept Payment" className="p-2 rounded-full text-gray-400 hover:text-brand-success hover:bg-green-100 transition-colors">
                            <CurrencyDollarIcon className="w-5 h-5"/>
                        </button>
                      )}
                    </div>
                </div>
                {isPastClass && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-brand-secondary">{t('admin.bookingModal.attendance')}:</span>
                             {isAttendanceTaken ? (
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${attendanceData[attendee.bookingId] === 'attended' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {attendanceData[attendee.bookingId] === 'attended' ? t('admin.bookingModal.attended') : t('admin.bookingModal.noShow')}
                                </span>
                             ) : (
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-semibold ${attendanceData[attendee.bookingId] === 'no-show' ? 'text-gray-400' : 'text-brand-text'}`}>{t('admin.bookingModal.attended')}</span>
                                    <button
                                        onClick={() => handleAttendanceChange(attendee.bookingId, attendanceData[attendee.bookingId] === 'attended' ? 'no-show' : 'attended')}
                                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${attendanceData[attendee.bookingId] === 'attended' ? 'bg-brand-success' : 'bg-gray-300'}`}
                                    >
                                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${attendanceData[attendee.bookingId] === 'attended' ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                    <span className={`text-sm font-semibold ${attendanceData[attendee.bookingId] === 'attended' ? 'text-gray-400' : 'text-brand-text'}`}>{t('admin.bookingModal.noShow')}</span>
                                </div>
                             )}
                        </div>
                    </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-brand-secondary py-4">{t('admin.bookingModal.noAttendees')}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
           {isPastClass && !isAttendanceTaken && attendees.length > 0 && (
             <button
                onClick={handleSaveAttendance}
                className="bg-brand-secondary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-text transition-colors"
             >
                {t('admin.bookingModal.saveAttendance')}
             </button>
           )}
          <button
            onClick={onClose}
            className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};