import React, { useState, useMemo } from 'react';
import type { Customer, Booking, TimeSlot, AttendanceStatus } from '../../types';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';

interface CustomerAttendanceHistoryProps {
    customer: Customer;
    onBack: () => void;
}

type PastSlot = {
    date: Date;
    productName: string;
    status: AttendanceStatus | 'not-marked';
};

const formatDateToYYYYMMDD = (d: Date): string => d.toISOString().split('T')[0];

export const CustomerAttendanceHistory: React.FC<CustomerAttendanceHistoryProps> = ({ customer, onBack }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const allPastSlots = useMemo((): PastSlot[] => {
        const now = new Date();
        const slots: PastSlot[] = [];
        customer.bookings.forEach(booking => {
            booking.slots.forEach(slot => {
                const slotDateTime = new Date(`${slot.date}T${slot.time}`);
                if (slotDateTime < now) {
                    const slotIdentifier = `${slot.date}_${slot.time}`;
                    slots.push({
                        date: slotDateTime,
                        productName: booking.product.name,
                        status: booking.attendance?.[slotIdentifier] || 'not-marked'
                    });
                }
            });
        });
        return slots.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [customer.bookings]);

    const attendanceByDate = useMemo(() => {
        const map = new Map<string, { attended: boolean, noShow: boolean }>();
        allPastSlots.forEach(slot => {
            const dateStr = formatDateToYYYYMMDD(slot.date);
            if (!map.has(dateStr)) {
                map.set(dateStr, { attended: false, noShow: false });
            }
            const dayStatus = map.get(dateStr)!;
            if (slot.status === 'attended') dayStatus.attended = true;
            if (slot.status === 'no-show') dayStatus.noShow = true;
        });
        return map;
    }, [allPastSlots]);

    const slotsForCurrentMonth = useMemo(() => {
        return allPastSlots.filter(slot => 
            slot.date.getFullYear() === currentDate.getFullYear() &&
            slot.date.getMonth() === currentDate.getMonth()
        );
    }, [allPastSlots, currentDate]);

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const calendarDays = useMemo(() => {
        const blanks = Array(firstDayOfMonth.getDay()).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        return [...blanks, ...days];
    }, [currentDate]);

    const translatedDayNames = useMemo(() => 
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], []);

    return (
        <div className="animate-fade-in">
            <button onClick={onBack} className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold">
                &larr; Back
            </button>
            <h2 className="text-2xl font-bold text-brand-text mb-1">Attendance History</h2>
            <p className="text-brand-secondary mb-6">Attendance history for {customer.userInfo?.firstName || 'Cliente'} {customer.userInfo?.lastName || ''}</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-brand-background p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeftIcon className="w-5 h-5" /></button>
                        <h4 className="text-lg font-bold text-brand-text capitalize">{currentDate.toLocaleString('en', { month: 'long', year: 'numeric' })}</h4>
                        <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-gray-200"><ArrowRightIcon className="w-5 h-5" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-brand-secondary mb-2">
                        {translatedDayNames.map((day, i) => <div key={i} className="font-bold">{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, index) => {
                            if (!day) return <div key={`blank-${index}`}></div>;
                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                            const dateStr = formatDateToYYYYMMDD(date);
                            const status = attendanceByDate.get(dateStr);
                            return (
                                <div key={day} className="w-full aspect-square bg-white rounded-md text-sm font-semibold flex flex-col items-center justify-center relative">
                                    <span>{day}</span>
                                    {status && (
                                        <div className="absolute bottom-1.5 flex gap-1">
                                            {status.attended && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                                            {status.noShow && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                     <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span>Attended</div>
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span>No Show</div>
                    </div>
                </div>
                <div className="h-96 overflow-y-auto">
                    {slotsForCurrentMonth.length > 0 ? (
                        <table className="min-w-full">
                             <thead className="sticky top-0 bg-brand-background z-10">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">Class</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-brand-secondary uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {slotsForCurrentMonth.map((slot, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-text">
                                            {slot.date.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                            <div className="text-xs text-gray-500">{slot.date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit'})}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-text">{slot.productName}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                slot.status === 'attended' ? 'bg-green-100 text-green-800' :
                                                slot.status === 'no-show' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {slot.status === 'attended' ? 'Attended' : slot.status === 'no-show' ? 'No Show' : 'Not Marked'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="h-full flex items-center justify-center text-brand-secondary">
                            No attendance records for this month.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
