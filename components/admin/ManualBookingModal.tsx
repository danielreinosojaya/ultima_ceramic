import React, { useState, useEffect, useMemo } from 'react';
import type { Product, UserInfo, Booking, AddBookingResult, Customer, TimeSlot, EnrichedAvailableSlot, Instructor, ClassPackage, IntroductoryClass, AppData, CapacityMessageSettings, Technique, SingleClass } from '../../types';
import * as dataService from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';
import { COUNTRIES, DAY_NAMES, SINGLE_CLASS_PRICE } from '@/constants';
import { InstructorTag } from '../InstructorTag';
import { CapacityIndicator } from '../CapacityIndicator';
import { ConflictWarningModal } from './ConflictWarningModal';

interface ManualBookingModalProps {
    onClose: () => void;
    onBookingAdded: () => void;
}

const TimeSlotModal: React.FC<{
  date: Date;
  onClose: () => void;
  onSelect: (slot: EnrichedAvailableSlot) => void;
  availableTimes: EnrichedAvailableSlot[];
  instructors: Instructor[];
  capacityMessages: CapacityMessageSettings;
}> = ({ date, onClose, onSelect, availableTimes, instructors, capacityMessages }) => {
  const { t, language } = useLanguage();
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-96 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-serif text-brand-text mb-2 text-center">{t('schedule.modal.title')}</h3>
        <p className="text-center text-brand-secondary mb-4">{date.toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-2 -mr-2">
          {availableTimes.length > 0 ? availableTimes.map(slot => (
            <button
              key={slot.time}
              onClick={() => onSelect(slot)}
              className="w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 bg-brand-background hover:bg-brand-primary/20"
            >
              <span className="font-semibold text-brand-text">{slot.time}</span>
              <div className="flex items-center gap-2">
                <InstructorTag instructorId={slot.instructorId} instructors={instructors} />
                <CapacityIndicator count={slot.paidBookingsCount} max={slot.maxCapacity} capacityMessages={capacityMessages} />
              </div>
            </button>
          )) : <p className="text-center text-brand-secondary">{t('schedule.modal.noClasses')}</p>}
        </div>
      </div>
    </div>
  );
};

const formatDateToYYYYMMDD = (d: Date): string => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const ManualBookingModal: React.FC<ManualBookingModalProps> = ({ onClose, onBookingAdded }) => {
    const { t, language } = useLanguage();
    const [step, setStep] = useState(1);

    const [products, setProducts] = useState<Product[]>([]);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [appData, setAppData] = useState<Pick<AppData, 'bookings' | 'availability' | 'scheduleOverrides' | 'classCapacity' | 'instructors' | 'capacityMessages'> | null>(null);
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [price, setPrice] = useState<number | string>('');
    const [userInfo, setUserInfo] = useState<UserInfo>({ firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code });
    const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [modalState, setModalState] = useState<{ isOpen: boolean; date: Date | null }>({ isOpen: false, date: null });
    const [availableTimesForModal, setAvailableTimesForModal] = useState<EnrichedAvailableSlot[]>([]);

    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [conflictDetails, setConflictDetails] = useState<{ count: number; time: string } | null>(null);
    const [pendingSlot, setPendingSlot] = useState<TimeSlot | null>(null);
    const [manualDate, setManualDate] = useState('');
    const [manualTime, setManualTime] = useState('');

    const singleClassPottersWheel: SingleClass = useMemo(() => ({
        id: -1,
        type: 'SINGLE_CLASS',
        name: t('admin.manualBookingModal.singleClassPottersWheel'),
        classes: 1,
        price: SINGLE_CLASS_PRICE,
        description: t('admin.manualBookingModal.singleClassDescription'),
        isActive: true,
        details: { technique: 'potters_wheel', duration: '', durationHours: 0, activities: [], generalRecommendations: '', materials: '' }
    }), [t]);

    const singleClassMolding: SingleClass = useMemo(() => ({
        id: -2,
        type: 'SINGLE_CLASS',
        name: t('admin.manualBookingModal.singleClassMolding'),
        classes: 1,
        price: SINGLE_CLASS_PRICE,
        description: t('admin.manualBookingModal.singleClassDescription'),
        isActive: true,
        details: { technique: 'molding', duration: '', durationHours: 0, activities: [], generalRecommendations: '', materials: '' }
    }), [t]);

    useEffect(() => {
        const loadData = async () => {
          const [
            allProducts, bookings, availability, scheduleOverrides, 
            classCapacity, instructors, capacityMessages
          ] = await Promise.all([
            dataService.getProducts(), dataService.getBookings(), dataService.getAvailability(),
            dataService.getScheduleOverrides(), dataService.getClassCapacity(),
            dataService.getInstructors(), dataService.getCapacityMessageSettings()
          ]);
          const availableProducts = allProducts.filter(p => p.isActive && p.type !== 'GROUP_EXPERIENCE' && p.type !== 'COUPLES_EXPERIENCE');
          setProducts([singleClassPottersWheel, singleClassMolding, ...availableProducts]);
          setAllCustomers(dataService.getCustomers(bookings));
          setAppData({ bookings, availability, scheduleOverrides, classCapacity, instructors, capacityMessages });
        };
        loadData();
    }, [singleClassMolding, singleClassPottersWheel]);
    
    useEffect(() => {
        if (selectedProduct && 'price' in selectedProduct) {
            setPrice(selectedProduct.price);
        } else {
            setPrice('');
        }
        setSelectedSlots([]); // Reset slots when product changes
    }, [selectedProduct]);

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return [];
        return allCustomers.filter(c => 
            c.userInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.userInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.userInfo.email.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5);
    }, [allCustomers, searchTerm]);

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setUserInfo(customer.userInfo);
        setSearchTerm('');
    };

    const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setUserInfo(prev => ({ ...prev, [name]: value }));
    };

    const resetCustomerSelection = () => {
        setSelectedCustomer(null);
        setUserInfo({ firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code });
    };

    const handleSubmitBooking = async () => {
        if (!selectedProduct || !userInfo.firstName) return;
        
        const bookingData = {
            product: selectedProduct!,
            productId: selectedProduct!.id,
            productType: selectedProduct!.type,
            slots: selectedSlots,
            userInfo,
            isPaid: false, // Manual bookings are unpaid by default
            price: Number(price) || 0,
            bookingMode: 'flexible',
            bookingDate: new Date().toISOString()
        };

        const result = await dataService.addBooking(bookingData);
        if (result.success) {
            onBookingAdded();
        } else {
            alert(`Error: ${result.message}`);
        }
    };

    const handleGoToStep2 = () => {
        if ((selectedCustomer || (isCreatingNewCustomer && userInfo.firstName)) && selectedProduct) {
             if (selectedProduct.type === 'OPEN_STUDIO_SUBSCRIPTION') {
                handleSubmitBooking();
             } else {
                setStep(2);
             }
        }
    }
    
    const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const blanks = Array(firstDayOfMonth.getDay()).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        return [...blanks, ...days];
    }, [currentDate]);
    
    const getTimesForDate = (date: Date): EnrichedAvailableSlot[] => {
        if (!selectedProduct || !appData) return [];
        if (selectedProduct.type === 'CLASS_PACKAGE' || selectedProduct.type === 'SINGLE_CLASS') {
             const productWithTechnique = selectedProduct as ClassPackage | SingleClass;
            return dataService.getAvailableTimesForDate(date, appData, productWithTechnique.details.technique);
        }
        if (selectedProduct.type === 'INTRODUCTORY_CLASS') {
            const dateStr = formatDateToYYYYMMDD(date);
            const sessions = dataService.generateIntroClassSessions(selectedProduct as IntroductoryClass, appData, { includeFull: true, generationLimitInDays: 90 });
            return sessions
                .filter(s => s.date === dateStr)
                .map(s => ({
                    time: s.time,
                    instructorId: s.instructorId,
                    technique: (selectedProduct as IntroductoryClass).details.technique,
                    paidBookingsCount: s.paidBookingsCount,
                    totalBookingsCount: s.totalBookingsCount,
                    maxCapacity: s.capacity,
                }));
        }
        return [];
    };

    const handleDayClick = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        date.setHours(0, 0, 0, 0);
        if (date < today) return;
        
        const availableTimes = getTimesForDate(date);
        if(availableTimes.length > 0) {
            setAvailableTimesForModal(availableTimes);
            setModalState({ isOpen: true, date });
        }
    };
    
    const addSlotToSelection = (slot: TimeSlot) => {
        const isSelected = selectedSlots.some(s => s.date === slot.date && s.time === slot.time);
        if(isSelected) {
            setSelectedSlots(prev => prev.filter(s => s.date !== slot.date || s.time !== slot.time));
        } else {
            if (selectedProduct?.type === 'CLASS_PACKAGE' && selectedSlots.length < (selectedProduct as ClassPackage).classes) {
                 setSelectedSlots(prev => [...prev, slot].sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
            } else if ((selectedProduct?.type === 'INTRODUCTORY_CLASS' || selectedProduct?.type === 'SINGLE_CLASS') && selectedSlots.length < 1) {
                setSelectedSlots([slot]);
            }
        }
    };
    
    const handleSlotSelect = (slot: EnrichedAvailableSlot) => {
        if (!modalState.date) return;
        const newSlot: TimeSlot = { date: formatDateToYYYYMMDD(modalState.date), time: slot.time, instructorId: slot.instructorId };
        addSlotToSelection(newSlot);
        setModalState({ isOpen: false, date: null });
    };

    const handleRemoveSlot = (slotToRemove: TimeSlot) => {
        setSelectedSlots(prev => prev.filter(s => s !== slotToRemove));
    };
    
    const handleAddManualSlot = () => {
        if (!manualDate || !manualTime || !selectedProduct || !appData || selectedProduct.type !== 'SINGLE_CLASS') return;

        const dateObj = new Date(manualDate + 'T00:00:00');
        const dayKey = DAY_NAMES[dateObj.getUTCDay()];
        const technique = selectedProduct.details.technique;
        const overrideForDate = appData.scheduleOverrides[manualDate];
        let instructorId: number | undefined;

        if (overrideForDate) {
            if (overrideForDate.slots === null) {
                alert("This day is marked as closed/cancelled in the schedule overrides.");
                return;
            }
            instructorId = overrideForDate.slots.find(s => s.time === manualTime && s.technique === technique)?.instructorId;
        }

        if (!instructorId) {
            const defaultSlots = appData.availability[dayKey] || [];
            instructorId = defaultSlots.find(s => s.time === manualTime && s.technique === technique)?.instructorId;
        }

        if (!instructorId) {
            alert("No instructor is scheduled for this time and technique. Please choose a scheduled time or adjust the weekly schedule settings.");
            return;
        }
        
        const newSlot: TimeSlot = { date: manualDate, time: manualTime, instructorId };

        let conflictingBookingsCount = 0;
        appData.bookings.forEach(booking => {
            let bookingTechnique: Technique | undefined;
            if (booking.productType === 'CLASS_PACKAGE' || booking.productType === 'SINGLE_CLASS' || booking.productType === 'INTRODUCTORY_CLASS') {
                const productDetails = (booking.product as (ClassPackage | SingleClass | IntroductoryClass)).details;
                if (productDetails) bookingTechnique = productDetails.technique;
            }
            if (bookingTechnique === technique) {
                if (booking.slots.some(s => s.date === newSlot.date && s.time === newSlot.time)) {
                    conflictingBookingsCount++;
                }
            }
        });

        if (conflictingBookingsCount > 0) {
            setPendingSlot(newSlot);
            setConflictDetails({ count: conflictingBookingsCount, time: newSlot.time });
            setIsConflictModalOpen(true);
        } else {
            addSlotToSelection(newSlot);
            setManualDate('');
            setManualTime('');
        }
    };
    
    const handleConfirmOverbook = () => {
        if (pendingSlot) {
            addSlotToSelection(pendingSlot);
        }
        setIsConflictModalOpen(false);
        setPendingSlot(null);
        setConflictDetails(null);
        setManualDate('');
        setManualTime('');
    };
    
    const slotsNeeded = selectedProduct?.type === 'CLASS_PACKAGE' 
        ? (selectedProduct as ClassPackage).classes 
        : (selectedProduct?.type === 'INTRODUCTORY_CLASS' || selectedProduct?.type === 'SINGLE_CLASS') 
        ? 1 : 0;
    const areSlotsSelected = slotsNeeded === 0 || selectedSlots.length === slotsNeeded;
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <ConflictWarningModal 
                isOpen={isConflictModalOpen}
                onClose={() => setIsConflictModalOpen(false)}
                onConfirm={handleConfirmOverbook}
                details={conflictDetails}
            />
            {modalState.isOpen && modalState.date && appData && (
                <TimeSlotModal 
                    date={modalState.date}
                    onClose={() => setModalState({ isOpen: false, date: null })}
                    onSelect={handleSlotSelect}
                    availableTimes={availableTimesForModal}
                    instructors={appData.instructors}
                    capacityMessages={appData.capacityMessages}
                />
            )}
            <div className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-serif text-brand-accent mb-4 text-center">{t('admin.manualBookingModal.title')}</h2>
                {step === 1 && (
                    <div className="space-y-4">
                        {/* Customer selection */}
                        <div>
                             <h3 className="font-bold text-brand-text mb-2">{t('admin.manualBookingModal.customerSectionTitle')}</h3>
                             <div className="flex items-center gap-4 mb-2">
                                <button onClick={() => {setIsCreatingNewCustomer(false); resetCustomerSelection();}} className={`px-4 py-2 rounded-md text-sm font-semibold ${!isCreatingNewCustomer ? 'bg-brand-primary text-white' : 'bg-gray-200'}`}>{t('admin.manualBookingModal.existingCustomer')}</button>
                                <button onClick={() => {setIsCreatingNewCustomer(true); resetCustomerSelection();}} className={`px-4 py-2 rounded-md text-sm font-semibold ${isCreatingNewCustomer ? 'bg-brand-primary text-white' : 'bg-gray-200'}`}>{t('admin.manualBookingModal.newCustomer')}</button>
                            </div>

                             {isCreatingNewCustomer ? (
                                <div className="p-4 border rounded-lg bg-gray-50 space-y-3 animate-fade-in-fast">
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" name="firstName" value={userInfo.firstName} onChange={handleUserInputChange} placeholder={t('userInfoModal.firstNamePlaceholder')} className="w-full px-3 py-2 border rounded-lg" required />
                                        <input type="text" name="lastName" value={userInfo.lastName} onChange={handleUserInputChange} placeholder={t('userInfoModal.lastNamePlaceholder')} className="w-full px-3 py-2 border rounded-lg" required />
                                    </div>
                                    <input type="email" name="email" value={userInfo.email} onChange={handleUserInputChange} placeholder={t('userInfoModal.emailPlaceholder')} className="w-full px-3 py-2 border rounded-lg" required />
                                    <div className="flex gap-2">
                                        <select name="countryCode" value={userInfo.countryCode} onChange={handleUserInputChange} className="border border-gray-300 rounded-lg bg-gray-50">
                                            {COUNTRIES.map(c => <option key={c.name} value={c.code}>{c.flag} {c.code}</option>)}
                                        </select>
                                        <input type="tel" name="phone" value={userInfo.phone} onChange={handleUserInputChange} placeholder={t('userInfoModal.phonePlaceholder')} className="w-full px-3 py-2 border rounded-lg" />
                                    </div>
                                </div>
                            ) : (
                                <div className="relative animate-fade-in-fast">
                                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('admin.manualBookingModal.searchPlaceholder')} className="w-full p-2 border rounded-lg" />
                                    {filteredCustomers.length > 0 && (
                                        <ul className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                                            {filteredCustomers.map(c => (
                                                <li key={c.email} onClick={() => handleSelectCustomer(c)} className="p-2 hover:bg-gray-100 cursor-pointer">{c.userInfo.firstName} {c.userInfo.lastName} ({c.userInfo.email})</li>
                                            ))}
                                        </ul>
                                    )}
                                    {selectedCustomer && (
                                        <div className="mt-2 p-2 bg-blue-100 rounded-lg text-sm flex justify-between items-center">
                                            <span>{t('admin.manualBookingModal.selected')}: {selectedCustomer.userInfo.firstName} {selectedCustomer.userInfo.lastName}</span>
                                            <button onClick={resetCustomerSelection} className="text-red-500 font-bold">X</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Product selection */}
                        <div>
                            <h3 className="font-bold text-brand-text mb-2">{t('admin.manualBookingModal.productSectionTitle')}</h3>
                             <div className="grid grid-cols-2 gap-4">
                                <select onChange={(e) => setSelectedProduct(products.find(p => p.id === Number(e.target.value)) || null)} className="w-full p-2 border rounded-lg bg-white">
                                    <option value="">{t('admin.manualBookingModal.selectProduct')}</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <div>
                                    <label htmlFor="price" className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.manualBookingModal.priceLabel')}</label>
                                    <input type="number" step="0.01" name="price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" required />
                                </div>
                            </div>
                        </div>

                         <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">{t('admin.productManager.cancelButton')}</button>
                            <button type="button" onClick={handleGoToStep2} disabled={!selectedProduct || (!selectedCustomer && !isCreatingNewCustomer) || (isCreatingNewCustomer && !userInfo.firstName)} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent disabled:bg-gray-400">
                                { selectedProduct && (selectedProduct.type === 'OPEN_STUDIO_SUBSCRIPTION') ? t('admin.manualBookingModal.saveButton') : t('admin.manualBookingModal.nextButton') }
                            </button>
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div className="animate-fade-in-fast">
                        <h3 className="font-bold text-brand-text mb-2 text-center">{t('admin.manualBookingModal.scheduleSectionTitle')}</h3>
                        <p className="text-center text-sm text-brand-secondary mb-4">{t('schedule.classesRemaining', { count: slotsNeeded - selectedSlots.length })}</p>
                        
                        {selectedProduct?.type === 'SINGLE_CLASS' ? (
                        <div className="p-4 bg-gray-50 border rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="md:col-span-1">
                                <label htmlFor="manual_date" className="block text-sm font-semibold text-brand-secondary mb-1">{t('admin.manualBookingModal.dateLabel')}</label>
                                <input type="date" id="manual_date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div className="md:col-span-1">
                                <label htmlFor="manual_time" className="block text-sm font-semibold text-brand-secondary mb-1">{t('admin.manualBookingModal.timeLabel')}</label>
                                <input type="time" id="manual_time" value={manualTime} onChange={e => setManualTime(e.target.value)} className="w-full p-2 border rounded-lg" step="1800" />
                            </div>
                            <div className="md:col-span-1">
                                <button onClick={handleAddManualSlot} disabled={!manualDate || !manualTime} className="w-full bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent disabled:bg-gray-400">
                                {t('admin.manualBookingModal.addSlotButton')}
                                </button>
                            </div>
                            </div>
                        </div>
                        ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} disabled={currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()} className="p-2 rounded-full hover:bg-brand-background disabled:opacity-50">&larr;</button>
                                <h4 className="text-lg font-bold text-brand-text capitalize">{currentDate.toLocaleString(language, { month: 'long', year: 'numeric' })}</h4>
                                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-brand-background">&rarr;</button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-xs text-brand-secondary mb-1">
                                {DAY_NAMES.map(day => <div key={day} className="font-bold">{day.substring(0,3)}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day, index) => {
                                    if (!day) return <div key={`blank-${index}`}></div>;
                                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                    date.setHours(0,0,0,0);
                                    const isPast = date < today;
                                    const hasSlots = getTimesForDate(date).length > 0;
                                    const isDisabled = isPast || !hasSlots;

                                    return <button key={day} onClick={() => handleDayClick(day)} disabled={isDisabled} className={`w-full aspect-square rounded-full text-sm font-semibold transition-all ${isDisabled ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'hover:bg-brand-primary/20 bg-white'}`}>{day}</button>
                                })}
                            </div>
                        </>
                        )}

                        <div className="mt-4 p-2 bg-brand-background rounded-lg min-h-[50px]">
                            <h4 className="text-sm font-bold text-brand-secondary mb-2">{t('admin.manualBookingModal.selectedSlots')}</h4>
                             <div className="space-y-1">
                                {selectedSlots.map(slot => (
                                    <div key={`${slot.date}-${slot.time}`} className="flex justify-between items-center bg-white p-2 rounded text-sm">
                                        <span>{new Date(slot.date + 'T00:00:00').toLocaleDateString(language, { weekday: 'short', month: 'short', day: 'numeric' })} @ {slot.time}</span>
                                        <button onClick={() => handleRemoveSlot(slot)} className="text-red-500 font-bold">X</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                         <div className="mt-6 flex justify-between items-center gap-3">
                            <button type="button" onClick={() => setStep(1)} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">{t('admin.manualBookingModal.backButton')}</button>
                            <button type="button" onClick={handleSubmitBooking} disabled={!areSlotsSelected} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent disabled:bg-gray-400">
                                {t('admin.manualBookingModal.saveButton')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};