import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Instructor, Booking, IntroductoryClass, Product, EditableBooking, RescheduleSlotInfo, PaymentDetails, AppData, InvoiceRequest, AdminTab } from '../../types';
import * as dataService from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';
import { DAY_NAMES, PALETTE_COLORS } from '../../constants.js';
import { InstructorTag } from '../InstructorTag';
import { BookingDetailsModal } from './BookingDetailsModal';
import { generateWeeklySchedulePDF } from '../../services/pdfService';
import { DocumentDownloadIcon } from '../icons/DocumentDownloadIcon';
import { AcceptPaymentModal } from './AcceptPaymentModal';
import { EditBookingModal } from './EditBookingModal';
import { RescheduleModal } from './RescheduleModal';
import { InvoiceReminderModal } from './InvoiceReminderModal';

const colorMap = PALETTE_COLORS.reduce((acc, color) => {
    acc[color.name] = { bg: color.bg.replace('bg-', ''), text: color.text.replace('text-', '') };
    return acc;
}, {} as Record<string, { bg: string, text: string }>);
const defaultColorName = 'secondary';

interface NavigationState {
    tab: AdminTab;
    targetId: string;
}

type EnrichedSlot = {
    time: string;
    product: Product;
    bookings: Booking[];
    capacity: number;
    instructorId: number;
    isOverride: boolean;
};

type ScheduleData = Map<number, { instructor: Instructor, schedule: Record<string, EnrichedSlot[]> }>;

const formatDateToYYYYMMDD = (d: Date): string => d.toISOString().split('T')[0];

const getWeekStartDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
};

const normalizeTime = (timeStr: string): string => {
    if (!timeStr) return '';
    // This works for both "18:00" and "6:00 PM"
    const date = new Date(`1970-01-01 ${timeStr}`);
    if (isNaN(date.getTime())) {
        console.warn(`Could not normalize time: ${timeStr}`);
        return timeStr; // Fallback
    }
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

interface ScheduleManagerProps extends AppData {
    initialDate: Date;
    onBackToMonth: () => void;
    onDataChange: () => void;
    invoiceRequests: InvoiceRequest[];
    setNavigateTo: React.Dispatch<React.SetStateAction<NavigationState | null>>;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({ initialDate, onBackToMonth, onDataChange, invoiceRequests, setNavigateTo, ...appData }) => {
    const { t, language } = useLanguage();
    const [currentDate, setCurrentDate] = useState(getWeekStartDate(initialDate));
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ date: string, time: string, attendees: any[], instructorId: number } | null>(null);
    const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
    const [now, setNow] = useState(new Date());

    // State for action modals
    const [bookingToManageId, setBookingToManageId] = useState<string | null>(null);
    const [isAcceptPaymentModalOpen, setIsAcceptPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [rescheduleInfo, setRescheduleInfo] = useState<RescheduleSlotInfo | null>(null);
    const [isInvoiceReminderOpen, setIsInvoiceReminderOpen] = useState(false);
    const [bookingIdForReminder, setBookingIdForReminder] = useState<string | null>(null);

     useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute for the time indicator
        return () => clearInterval(timer);
    }, []);

    // Syncronize if the initialDate prop changes
    useEffect(() => {
        setCurrentDate(getWeekStartDate(initialDate));
    }, [initialDate]);

    const { weekDates, scheduleData } = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const dates: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            dates.push(date);
        }

        const { instructors, bookings, products, availability, scheduleOverrides } = appData;
        const introClassProducts = products.filter(p => p.type === 'INTRODUCTORY_CLASS') as IntroductoryClass[];
        const packageClassProduct = products.find(p => p.type === 'CLASS_PACKAGE'); 

        const data: ScheduleData = new Map();

        for (const instructor of instructors) {
            const dailySchedule: Record<string, EnrichedSlot[]> = {};
            for (const date of dates) {
                const dateStr = formatDateToYYYYMMDD(date);
                const dayKey = DAY_NAMES[date.getDay()];
                
                let todaysSlots: any[] = [];
                const overrideForDate = scheduleOverrides[dateStr];
                const hasOverride = overrideForDate !== undefined;

                if (packageClassProduct) {
                    const packageSlotsSource = hasOverride ? overrideForDate.slots : availability[dayKey];
                    const capacityForDay = hasOverride && overrideForDate.capacity ? overrideForDate.capacity : appData.classCapacity.max;

                    if (packageSlotsSource) {
                        todaysSlots.push(...packageSlotsSource
                            .filter(s => s.instructorId === instructor.id)
                            .map(s => ({ ...s, product: packageClassProduct, isOverride: hasOverride, capacity: capacityForDay }))
                        );
                    }
                }

                for (const introProduct of introClassProducts) {
                    const introSessions = dataService.generateIntroClassSessions(introProduct, appData, { includeFull: true });
                    const sessionsForDay = introSessions.filter(s => s.date === dateStr && s.instructorId === instructor.id);
                    todaysSlots.push(...sessionsForDay.map(s => ({ ...s, product: introProduct, isOverride: s.isOverride })));
                }
                
                todaysSlots.sort((a,b) => normalizeTime(a.time).localeCompare(normalizeTime(b.time)));

                const enrichedSlots = todaysSlots.map(slot => {
                    const normalizedSlotTime = normalizeTime(slot.time);
                    const bookingsForSlot = bookings.filter(b => 
                        b.productId === slot.product.id &&
                        b.slots.some(s => 
                            s.date === dateStr && 
                            normalizeTime(s.time) === normalizedSlotTime && 
                            s.instructorId === instructor.id
                        )
                    );
                    return { ...slot, bookings: bookingsForSlot };
                });

                dailySchedule[dateStr] = enrichedSlots;
            }
            data.set(instructor.id, { instructor, schedule: dailySchedule });
        }

        return { weekDates: dates, scheduleData: data };
    }, [currentDate, appData]);
    
    const todayStr = useMemo(() => formatDateToYYYYMMDD(new Date()), []);
    const todayIndex = useMemo(() => weekDates.findIndex(d => formatDateToYYYYMMDD(d) === todayStr), [weekDates, todayStr]);
    const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex !== -1 ? todayIndex : 0);

    useEffect(() => {
        const newTodayIndex = weekDates.findIndex(d => formatDateToYYYYMMDD(d) === todayStr);
        setSelectedDayIndex(newTodayIndex !== -1 ? newTodayIndex : 0);
    }, [weekDates, todayStr]);

    const bookingToManage = useMemo(() => {
        if (!bookingToManageId) return null;
        return appData.bookings.find(b => b.id === bookingToManageId);
    }, [bookingToManageId, appData.bookings]);

    const bookingForReminder = useMemo(() => {
        if (!bookingIdForReminder) return null;
        return appData.bookings.find(b => b.id === bookingIdForReminder);
    }, [bookingIdForReminder, appData.bookings]);


    const closeAllModals = () => {
        setIsDetailsModalOpen(false);
        setIsAcceptPaymentModalOpen(false);
        setIsEditModalOpen(false);
        setIsRescheduleModalOpen(false);
        setModalData(null);
        setBookingToManageId(null);
        setRescheduleInfo(null);
        setIsInvoiceReminderOpen(false);
        setBookingIdForReminder(null);
    };
    
    const handleShiftClick = (date: string, slot: EnrichedSlot) => {
        setModalData({
            date: date,
            time: slot.time,
            instructorId: slot.instructorId,
            attendees: slot.bookings.map(b => ({ userInfo: b.userInfo, bookingId: b.id, isPaid: b.isPaid, bookingCode: b.bookingCode, paymentDetails: b.paymentDetails }))
        });
        setIsDetailsModalOpen(true);
    };

    const handleAcceptPayment = (bookingId: string) => {
        const pendingInvoiceRequest = invoiceRequests.find(
            req => req.bookingId === bookingId && req.status === 'Pending'
        );

        if (pendingInvoiceRequest) {
            setBookingIdForReminder(bookingId);
            setIsInvoiceReminderOpen(true);
        } else {
            setBookingToManageId(bookingId);
            setIsAcceptPaymentModalOpen(true);
        }
    };
    
    const handleConfirmPayment = async (details: Omit<PaymentDetails, 'receivedAt'>) => {
        if (bookingToManageId) {
            await dataService.markBookingAsPaid(bookingToManageId, details);
            closeAllModals();
            onDataChange();
        }
    };

    const handleMarkAsUnpaid = async (bookingId: string) => {
        await dataService.markBookingAsUnpaid(bookingId);
        closeAllModals();
        onDataChange();
    };

    const handleEditAttendee = (bookingId: string) => {
        setBookingToManageId(bookingId);
        setIsEditModalOpen(true);
    };

    const handleSaveEditedBooking = async (updatedData: EditableBooking) => {
        if (bookingToManage) {
            const updatedBooking = { ...bookingToManage, ...updatedData };
            await dataService.updateBooking(updatedBooking);
            closeAllModals();
            onDataChange();
        }
    };
    
    const handleRescheduleAttendee = (bookingId: string, slot: any, attendeeName: string) => {
        setRescheduleInfo({ bookingId, slot, attendeeName });
        setIsRescheduleModalOpen(true);
    };

    const handleConfirmReschedule = async (newSlot: any) => {
        if (rescheduleInfo) {
            const result = await dataService.rescheduleBookingSlot(rescheduleInfo.bookingId, rescheduleInfo.slot, newSlot);
            if (!result.success) {
                alert(t(`admin.errors.${result.message}`));
            }
            closeAllModals();
            onDataChange();
        }
    };
    
    const handleRemoveAttendee = async (bookingId: string) => {
        if (modalData) {
            const slotToRemove = { date: modalData.date, time: modalData.time, instructorId: modalData.instructorId };
            await dataService.removeBookingSlot(bookingId, slotToRemove);
            closeAllModals();
            onDataChange();
        }
    };

    const handleGoToInvoicing = () => {
        if (!bookingForReminder) return;
        const request = invoiceRequests.find(req => req.bookingId === bookingForReminder.id);
        if (request) {
            setNavigateTo({ tab: 'invoicing', targetId: request.id });
        }
        closeAllModals();
    };

    const handleProceedWithPayment = () => {
        if (bookingIdForReminder) {
            setBookingToManageId(bookingIdForReminder);
            setIsAcceptPaymentModalOpen(true);
        }
        setIsInvoiceReminderOpen(false);
        setBookingIdForReminder(null);
    };
    
    const handleNextWeek = () => {
        setCurrentDate(prevDate => {
            const nextWeek = new Date(prevDate);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return nextWeek;
        });
    };

    const handlePrevWeek = () => {
        setCurrentDate(prevDate => {
            const prevWeek = new Date(prevDate);
            prevWeek.setDate(prevWeek.getDate() - 7);
            return prevWeek;
        });
    };

    const handleDownloadPdf = () => {
        const dataToExport = showUnpaidOnly ? filteredScheduleData : scheduleData;
        const subtitle = showUnpaidOnly ? t('admin.pdfReport.filteredSubtitle') : undefined;
        generateWeeklySchedulePDF(weekDates, dataToExport, language, showUnpaidOnly, subtitle);
    };

    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    
    const filteredScheduleData = useMemo(() => {
        if (!showUnpaidOnly) {
            return scheduleData;
        }
        const filtered: ScheduleData = new Map();
        for (const [instructorId, data] of scheduleData.entries()) {
            const newSchedule: Record<string, EnrichedSlot[]> = {};
            let instructorHasUnpaid = false;
            for (const [dateStr, slots] of Object.entries(data.schedule)) {
                const unpaidSlots = slots.filter(slot => slot.bookings.some(b => !b.isPaid));
                if (unpaidSlots.length > 0) {
                    newSchedule[dateStr] = unpaidSlots;
                    instructorHasUnpaid = true;
                } else {
                    newSchedule[dateStr] = []; // Keep day for grid structure
                }
            }
            if (instructorHasUnpaid) {
                filtered.set(instructorId, { ...data, schedule: newSchedule });
            }
        }
        return filtered;
    }, [showUnpaidOnly, scheduleData]);

    const hasVisibleSlotsInFilter = useMemo(() => {
        if (!showUnpaidOnly) return true;
        for (const { schedule } of filteredScheduleData.values()) {
            for (const slots of Object.values(schedule)) {
                if (slots.length > 0) return true;
            }
        }
        return false;
    }, [showUnpaidOnly, filteredScheduleData]);

    const isTodayInView = weekDates.some(d => formatDateToYYYYMMDD(d) === todayStr);

    const dayStartHour = 8; // 8 AM
    const dayEndHour = 22; // 10 PM
    const totalMinutesInDay = (dayEndHour - dayStartHour) * 60;
    const currentMinutes = (now.getHours() - dayStartHour) * 60 + now.getMinutes();
    const progressPercent = (currentMinutes / totalMinutesInDay) * 100;
    const showTimeIndicator = isTodayInView && progressPercent >= 0 && progressPercent <= 100;

    return (
      <div className="animate-fade-in">
        {isDetailsModalOpen && modalData && (
            <BookingDetailsModal
                date={modalData.date}
                time={modalData.time}
                attendees={modalData.attendees}
                instructorId={modalData.instructorId}
                onClose={closeAllModals}
                onRemoveAttendee={handleRemoveAttendee}
                onAcceptPayment={handleAcceptPayment}
                onMarkAsUnpaid={handleMarkAsUnpaid}
                onEditAttendee={handleEditAttendee}
                onRescheduleAttendee={handleRescheduleAttendee}
            />
        )}
        {isAcceptPaymentModalOpen && bookingToManage && (
            <AcceptPaymentModal
                isOpen={isAcceptPaymentModalOpen}
                onClose={closeAllModals}
                onConfirm={handleConfirmPayment}
                booking={bookingToManage}
            />
        )}
        {isEditModalOpen && bookingToManage && (
            <EditBookingModal
                booking={bookingToManage}
                onClose={closeAllModals}
                onSave={handleSaveEditedBooking}
            />
        )}
        {isRescheduleModalOpen && rescheduleInfo && (
            <RescheduleModal
                isOpen={isRescheduleModalOpen}
                onClose={closeAllModals}
                onSave={handleConfirmReschedule}
                slotInfo={rescheduleInfo}
                appData={appData}
            />
        )}
        {isInvoiceReminderOpen && (
            <InvoiceReminderModal
                isOpen={isInvoiceReminderOpen}
                onClose={closeAllModals}
                onProceed={handleProceedWithPayment}
                onGoToInvoicing={handleGoToInvoicing}
            />
        )}

        <div className="flex justify-between items-center mb-6">
            <div>
                 <button onClick={onBackToMonth} className="text-brand-secondary hover:text-brand-accent mb-2 transition-colors font-semibold">
                    &larr; Volver al Mes
                </button>
                <h2 className="text-2xl font-serif text-brand-text">Vista Semanal</h2>
            </div>
            <div className="flex items-center gap-4">
                 <button 
                    onClick={handleDownloadPdf}
                    className="flex items-center justify-center gap-2 bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-4 rounded-lg hover:bg-brand-secondary hover:text-white transition-colors text-sm"
                >
                    <DocumentDownloadIcon className="w-4 h-4" />
                    Descargar PDF
                </button>
                 <button onClick={() => setCurrentDate(new Date())} className="text-sm font-bold bg-brand-background py-2 px-4 rounded-lg hover:bg-brand-primary/20 transition-colors">Hoy</button>
                <button onClick={handlePrevWeek} className="p-2 rounded-full hover:bg-gray-100">
                    &lt;
                </button>
                <div className="font-semibold text-brand-text text-center">
                    {weekStart.toLocaleDateString(language, { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <button onClick={handleNextWeek} className="p-2 rounded-full hover:bg-gray-100">
                    &gt;
                </button>
            </div>
        </div>

        <div className="flex justify-end mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-brand-secondary">
                 <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${showUnpaidOnly ? 'bg-brand-primary' : 'bg-gray-200'}`}>
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${showUnpaidOnly ? 'translate-x-6' : 'translate-x-1'}`}/>
                </div>
                <input type="checkbox" checked={showUnpaidOnly} onChange={() => setShowUnpaidOnly(!showUnpaidOnly)} className="hidden" />
                {t('admin.weeklyView.filterUnpaid')}
            </label>
        </div>

        {/* --- DESKTOP VIEW --- */}
        <div className="hidden lg:block border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48">
                                Instructor
                            </th>
                            {weekDates.map(date => {
                                const isToday = formatDateToYYYYMMDD(date) === todayStr;
                                return (
                                <th key={date.toISOString()} scope="col" className={`px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-1/7 transition-colors ${isToday ? 'bg-brand-primary/10' : ''}`}>
                                    {date.toLocaleDateString(language, { weekday: 'short' })}
                                    <span className="block font-normal text-lg text-gray-900">{date.getDate()}</span>
                                </th>
                            )})}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                       {[...filteredScheduleData.values()].map(({ instructor, schedule }, instructorIndex) => (
                            <tr key={instructor.id} className="divide-x divide-gray-200">
                                <th scope="row" className="sticky left-0 bg-white px-4 py-3 text-left w-48 align-top">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-${colorMap[instructor.colorScheme]?.bg || colorMap[defaultColorName].bg} text-${colorMap[instructor.colorScheme]?.text || colorMap[defaultColorName].text}`}>
                                            {instructor.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-brand-text">{instructor.name}</div>
                                        </div>
                                    </div>
                                </th>
                                {weekDates.map(date => {
                                    const dateStr = formatDateToYYYYMMDD(date);
                                    const isToday = dateStr === todayStr;
                                    const slots = schedule[dateStr] || [];
                                    return (
                                        <td key={dateStr} className={`px-2 py-2 align-top w-1/7 min-h-[100px] relative transition-colors ${isToday ? 'bg-brand-primary/5' : ''}`}>
                                            {isToday && showTimeIndicator && instructorIndex === 0 && (
                                                <div className="absolute inset-x-0" style={{ top: `${progressPercent}%`, zIndex: 10 }} aria-hidden="true">
                                                    <div className="relative h-px bg-red-500">
                                                        <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500"></div>
                                                        <div className="absolute left-2 -top-2.5 text-xs font-bold text-red-600 bg-white/80 backdrop-blur-sm px-1 rounded">
                                                            {now.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                {slots.map((slot, index) => {
                                                    const unpaidBookingsCount = slot.bookings.filter(b => !b.isPaid).length;
                                                    const hasUnpaidBookings = unpaidBookingsCount > 0;
                                                    return (
                                                        <button 
                                                            key={index} 
                                                            onClick={() => handleShiftClick(dateStr, slot)}
                                                            className={`w-full text-left p-2 rounded-md shadow-sm border-l-4 bg-${colorMap[instructor.colorScheme]?.bg || colorMap[defaultColorName].bg} border-${colorMap[instructor.colorScheme]?.text || colorMap[defaultColorName].text}/50 hover:shadow-md transition-shadow relative overflow-hidden`}>
                                                            {hasUnpaidBookings && <div className="absolute inset-0 unpaid-booking-stripe opacity-70"></div>}
                                                            <div className="relative z-10">
                                                                <div className={`font-bold text-xs text-${colorMap[instructor.colorScheme]?.text || colorMap[defaultColorName].text}`}>
                                                                    {slot.time}
                                                                </div>
                                                                <div className="text-xs font-semibold text-gray-800 mt-1 truncate">
                                                                    {slot.product.name}
                                                                </div>
                                                                <div className="text-xs text-gray-600 mt-1">
                                                                    {slot.bookings.length}/{slot.capacity} booked
                                                                    {hasUnpaidBookings && <span className="font-bold text-brand-primary ml-1">({t('admin.weeklyView.unpaid', { count: unpaidBookingsCount })})</span>}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                       ))}
                    </tbody>
                </table>
                {!hasVisibleSlotsInFilter && (
                    <div className="text-center py-10 text-brand-secondary">
                        {t('admin.weeklyView.noUnpaidFound')}
                    </div>
                )}
            </div>
        </div>
        
        {/* --- MOBILE VIEW --- */}
        <div className="block lg:hidden">
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Days">
                    {weekDates.map((date, index) => {
                        const isSelected = index === selectedDayIndex;
                        return (
                            <button
                                key={date.toISOString()}
                                onClick={() => setSelectedDayIndex(index)}
                                className={`flex-shrink-0 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm text-center w-14 transition-colors duration-200 ${
                                isSelected
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <span className="block">{date.toLocaleDateString(language, { weekday: 'short' })}</span>
                                <span className="text-lg font-bold">{date.getDate()}</span>
                            </button>
                        )
                    })}
                </nav>
            </div>

            <div className="space-y-6">
                {[...filteredScheduleData.values()].map(({ instructor, schedule }) => {
                    const selectedDate = weekDates[selectedDayIndex];
                    const dateStr = formatDateToYYYYMMDD(selectedDate);
                    const slots = schedule[dateStr] || [];

                    if (slots.length === 0) return null;

                    return (
                        <div key={instructor.id}>
                            <InstructorTag instructorId={instructor.id} instructors={appData.instructors} />
                            <div className="space-y-2 mt-2 border-l-2 pl-4 ml-3 border-gray-200">
                                {slots.map((slot, index) => {
                                    const unpaidBookingsCount = slot.bookings.filter(b => !b.isPaid).length;
                                    const hasUnpaidBookings = unpaidBookingsCount > 0;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleShiftClick(dateStr, slot)}
                                            className="w-full text-left p-3 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden border border-gray-200"
                                        >
                                            {hasUnpaidBookings && <div className="absolute inset-0 unpaid-booking-stripe opacity-70"></div>}
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-bold text-sm text-brand-text">{slot.time}</div>
                                                        <div className="text-xs font-semibold text-gray-600 mt-1 truncate">{slot.product.name}</div>
                                                    </div>
                                                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${slot.bookings.length >= slot.capacity ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {slot.bookings.length}/{slot.capacity}
                                                    </div>
                                                </div>
                                                {hasUnpaidBookings && 
                                                    <div className="text-xs text-brand-primary font-bold mt-2">
                                                        {t('admin.weeklyView.unpaid', { count: unpaidBookingsCount })}
                                                    </div>
                                                }
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {!hasVisibleSlotsInFilter && (
                    <div className="text-center py-10 text-brand-secondary">
                        {t('admin.weeklyView.noUnpaidFound')}
                    </div>
                )}
                
                {![...filteredScheduleData.values()].some(({ schedule }) => (schedule[formatDateToYYYYMMDD(weekDates[selectedDayIndex])] || []).length > 0) && (
                  <div className="text-center py-10 text-brand-secondary">
                    No classes scheduled for this day.
                  </div>
                )}
            </div>
        </div>
      </div>
    );
};