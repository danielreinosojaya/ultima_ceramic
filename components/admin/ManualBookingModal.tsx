import React, { useState, useEffect, useMemo } from 'react';
import type { Product, UserInfo, Booking, AddBookingResult, Customer, TimeSlot, EnrichedAvailableSlot, Instructor, ClassPackage, IntroductoryClass, AppData, CapacityMessageSettings, Technique } from '../../types';
import * as dataService from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';
import { COUNTRIES } from '@/constants';
import { InstructorTag } from '../InstructorTag';
import { CapacityIndicator } from '../CapacityIndicator';

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
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
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
          setProducts(allProducts.filter(p => p.isActive && p.type !== 'GROUP_EXPERIENCE' && p.type !== 'COUPLES_EXPERIENCE'));
          setAllCustomers(dataService.getCustomers(bookings));
          setAppData({ bookings, availability, scheduleOverrides, classCapacity, instructors, capacityMessages });
        };
        loadData();
    }, []);
    
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
        setIsCreatingNewCustomer(false);
    };

    const handleGoToStep2 = () => {
        if ((selectedCustomer || isCreatingNewCustomer) && selectedProduct) {
            setStep(2);
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
        if (selectedProduct.type === 'CLASS_PACKAGE') {
            return dataService.getAvailableTimesForDate(date, appData, selectedProduct.details.technique);
        }
        if (selectedProduct.type === 'INTRODUCTORY_CLASS') {
            const dateStr = formatDateToYYYYMMDD(date);
            const allSessions = dataService.generateIntroClassSessions(selectedProduct, { bookings: appData.bookings });
            const sessionsForDate = allSessions.filter(s => s.date === dateStr);
            return sessionsForDate.map(s => ({
                time: s.time,
                instructorId: s.instructorId,
                technique: selectedProduct.details.technique,
                paidBookingsCount: s.paidBookingsCount,
                totalBookingsCount: s.totalBookingsCount,
                maxCapacity: s.capacity
            }));
        }
        return [];
    };

    const handleDayClick = (day: number) => {
        if (!selectedProduct) return;
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        date.setHours(0, 0, 0, 0);
        
        const timesForDay = getTimesForDate(date);
        if (date < today || timesForDay.length === 0) return;
        
        const dateStr = formatDateToYYYYMMDD(date);
        const classesNeeded = selectedProduct.type === 'CLASS_PACKAGE' ? selectedProduct.classes : 1;
        
        if (selectedProduct.type === 'CLASS_PACKAGE') {
            if (selectedSlots.some(s => s.date === dateStr)) {
                setSelectedSlots(selectedSlots.filter(s => s.date !== dateStr));
            } else if (selectedSlots.length < classesNeeded) {
                setAvailableTimesForModal(timesForDay);
                setModalState({ isOpen: true, date });
            }
        } else { // Introductory Class
            setAvailableTimesForModal(timesForDay);
            setModalState({ isOpen: true, date });
        }
    };
    
    const handleSlotSelect = (slot: EnrichedAvailableSlot) => {
        if (!modalState.date || !selectedProduct) return;
        const dateStr = formatDateToYYYYMMDD(modalState.date);
        const newSlot: TimeSlot = { date: dateStr, time: slot.time, instructorId: slot.instructorId };
        
        if (selectedProduct.type === 'CLASS_PACKAGE') {
            const classesNeeded = (selectedProduct as ClassPackage).classes;
            if (selectedSlots.length < classesNeeded) {
                setSelectedSlots([...selectedSlots, newSlot].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
            }
        } else { // Introductory Class - only one slot is selected
            setSelectedSlots([newSlot]);
        }
        setModalState({ isOpen: false, date: null });
    };
    
    const classesNeeded = selectedProduct ? (selectedProduct.type === 'CLASS_PACKAGE' ? (selectedProduct as ClassPackage).classes : 1) : 0;
    const classesRemaining = classesNeeded - selectedSlots.length;
    const translatedDayNames = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(dayIndex => new Date(2024, 0, dayIndex + 7).toLocaleDateString(language, { weekday: 'short' })), [language]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalPrice = typeof price === 'string' ? parseFloat(price) : price;
        if (!selectedProduct || !userInfo.firstName || !userInfo.email || isNaN(finalPrice) || (classesNeeded > 0 && selectedSlots.length !== classesNeeded)) {
            alert('Please complete all steps.');
            return;
        }

        const newBookingData = {
            product: selectedProduct,
            productId: selectedProduct.id,
            productType: selectedProduct.type as 'CLASS_PACKAGE' | 'INTRODUCTORY_CLASS' | 'OPEN_STUDIO_SUBSCRIPTION',
            slots: selectedSlots,
            userInfo,
            isPaid: false,
            price: finalPrice,
            bookingMode: 'flexible' as const,
            bookingDate: new Date().toISOString(),
        };

        const result = await dataService.addBooking(newBookingData);
        if (result.success) onBookingAdded();
        else alert(t(`admin.errors.${result.message}`));
    };

    if (!appData) {
      return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface rounded-xl p-6">Loading data...</div>
        </div>
      );
    }

    const renderStep1 = () => (
        <>
            <h2 className="text-2xl font-serif text-brand-accent mb-6 text-center">{t('admin.manualBookingModal.step1Title')}</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleGoToStep2(); }} className="space-y-4">
                 {/* Customer Selection */}
                 <div className="bg-brand-background p-4 rounded-lg">
                    {!selectedCustomer && !isCreatingNewCustomer && (
                         <div>
                            <input 
                                type="text"
                                placeholder={t('admin.manualBookingModal.searchCustomerPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            {filteredCustomers.length > 0 && (
                                <ul className="border border-gray-300 rounded-lg mt-1 max-h-32 overflow-y-auto bg-white">
                                    {filteredCustomers.map(c => (
                                        <li key={c.email} onClick={() => handleSelectCustomer(c)} className="p-2 hover:bg-brand-primary/20 cursor-pointer">
                                            {c.userInfo.firstName} {c.userInfo.lastName} ({c.userInfo.email})
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="text-center my-2">
                                <button type="button" onClick={() => setIsCreatingNewCustomer(true)} className="text-sm font-semibold text-brand-accent hover:underline">
                                    {t('admin.manualBookingModal.orCreateNew')}
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {(selectedCustomer || isCreatingNewCustomer) && (
                         <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-brand-secondary">
                                    {selectedCustomer ? t('admin.manualBookingModal.customerSelected') : t('admin.manualBookingModal.createNewCustomer')}
                                </h3>
                                <button type="button" onClick={resetCustomerSelection} className="text-sm font-semibold text-brand-accent hover:underline">
                                    {t('admin.manualBookingModal.changeCustomer')}
                                </button>
                            </div>
                            <div className="space-y-3 p-3 border border-gray-200 rounded-md bg-white">
                                <input type="text" name="firstName" value={userInfo.firstName} onChange={handleUserInputChange} placeholder={t('userInfoModal.firstNamePlaceholder')} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100" required disabled={!!selectedCustomer} />
                                <input type="text" name="lastName" value={userInfo.lastName} onChange={handleUserInputChange} placeholder={t('userInfoModal.lastNamePlaceholder')} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100" required disabled={!!selectedCustomer} />
                                <input type="email" name="email" value={userInfo.email} onChange={handleUserInputChange} placeholder={t('userInfoModal.emailPlaceholder')} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100" required disabled={!!selectedCustomer} />
                                <div className="flex gap-2">
                                    <select name="countryCode" value={userInfo.countryCode} onChange={handleUserInputChange} className="border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 disabled:bg-gray-100" disabled={!!selectedCustomer}>
                                        {COUNTRIES.map(c => <option key={c.name} value={c.code}>{c.flag} {c.code}</option>)}
                                    </select>
                                    <input type="tel" name="phone" value={userInfo.phone} onChange={handleUserInputChange} placeholder={t('userInfoModal.phonePlaceholder')} className="w-full px-3 py-2 border border-gray-300 rounded-r-lg" required disabled={!!selectedCustomer} />
                                </div>
                            </div>
                         </div>
                    )}
                </div>
                {/* Product & Price */}
                <div>
                    <label htmlFor="product" className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.manualBookingModal.selectPackage')}</label>
                    <select id="product" value={selectedProduct?.id || ''} onChange={(e) => setSelectedProduct(products.find(p => p.id === parseInt(e.target.value)) || null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                        <option value="" disabled>-- {t('admin.manualBookingModal.selectPackage')} --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="price" className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.manualBookingModal.priceLabel')}</label>
                    <input type="number" step="0.01" name="price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button type="button" onClick={onClose} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">
                        {t('admin.productManager.cancelButton')}
                    </button>
                    <button type="submit" disabled={!((selectedCustomer || isCreatingNewCustomer) && selectedProduct)} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent disabled:bg-gray-400">
                        {t('admin.manualBookingModal.nextButton')}
                    </button>
                </div>
            </form>
        </>
    );
    
    const renderStep2 = () => (
      selectedProduct && (
        <>
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setStep(1)} className="text-brand-secondary hover:text-brand-accent transition-colors font-semibold">
                    &larr; {t('admin.manualBookingModal.backButton')}
                </button>
                <h2 className="text-xl font-serif text-brand-accent text-center">{t('admin.manualBookingModal.step2Title')}</h2>
                <div className="w-20"></div>
            </div>
            <div className="text-center mb-4 p-2 bg-brand-background rounded-md">
                <p className="text-sm text-brand-secondary">{t('admin.manualBookingModal.scheduleFor')} <span className="font-bold">{userInfo.firstName} {userInfo.lastName}</span></p>
                <p className="text-sm text-brand-secondary">Product: <span className="font-bold">{selectedProduct.name}</span></p>
                <div className={`mt-2 text-md font-bold ${classesRemaining === 0 ? 'text-brand-success' : 'text-brand-text'}`}>
                  {classesRemaining > 0 ? t('schedule.classesRemaining', { count: classesRemaining }) : t('schedule.allClassesSelected')}
                </div>
            </div>

            {/* Calendar UI */}
            <div className="w-full max-w-md mx-auto">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} disabled={currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()} className="p-2 rounded-full hover:bg-brand-background disabled:opacity-50">&larr;</button>
                    <h3 className="text-lg font-bold text-brand-text capitalize">{currentDate.toLocaleString(language, { month: 'long', year: 'numeric' })}</h3>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-brand-background">&rarr;</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-brand-secondary mb-1">
                  {translatedDayNames.map(day => <div key={day} className="font-bold">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                        if (!day) return <div key={`blank-${index}`}></div>;
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day); date.setHours(0,0,0,0);
                        const isPast = date < today;
                        const isUnavailable = getTimesForDate(date).length === 0;
                        const dayIsSelected = selectedSlots.some(s => s.date === formatDateToYYYYMMDD(date));
                        const isDisabled = isPast || isUnavailable || (classesNeeded > 0 && selectedSlots.length >= classesNeeded && !dayIsSelected);
                        return <button key={day} onClick={() => handleDayClick(day)} disabled={isDisabled} className={`w-full aspect-square rounded-full text-sm font-semibold transition-all ${isDisabled && !dayIsSelected ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'hover:bg-brand-primary/20'} ${dayIsSelected ? 'bg-brand-primary text-white shadow-md' : 'bg-white'}`}>{day}</button>
                    })}
                </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={onClose} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">
                    {t('admin.productManager.cancelButton')}
                </button>
                <button type="button" onClick={handleSubmit} disabled={classesRemaining > 0} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent disabled:bg-gray-400">
                    {t('admin.manualBookingModal.addBookingButton')}
                </button>
            </div>
        </>
      )
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            {modalState.isOpen && modalState.date && appData && (
              <TimeSlotModal date={modalState.date} onClose={() => setModalState({ isOpen: false, date: null })} onSelect={handleSlotSelect} availableTimes={availableTimesForModal} instructors={appData.instructors} capacityMessages={appData.capacityMessages} />
            )}
            <div className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                {step === 1 ? renderStep1() : renderStep2()}
            </div>
        </div>
    );
};