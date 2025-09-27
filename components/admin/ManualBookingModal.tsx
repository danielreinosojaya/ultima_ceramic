import React, { useState, useEffect, useMemo } from 'react';
import type { Product, UserInfo, Booking, AddBookingResult, Customer, TimeSlot, EnrichedAvailableSlot, Instructor, ClassPackage, IntroductoryClass, AppData, CapacityMessageSettings, Technique, SingleClass, GroupClass } from '../../types';
import * as dataService from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';
import { COUNTRIES, DAY_NAMES } from '@/constants';
import { InstructorTag } from '../InstructorTag';
import { CapacityIndicator } from '../CapacityIndicator';
import { SparklesIcon } from '../icons/SparklesIcon';
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
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
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

const normalizeTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const date = new Date(`1970-01-01 ${timeStr}`);
    if (isNaN(date.getTime())) {
        return timeStr;
    }
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const formatToAmPm = (time24: string): string => {
    if (!time24) return '';
    const [hoursStr, minutesStr] = time24.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const finalMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${finalMinutes} ${ampm}`;
};

export const ManualBookingModal: React.FC<ManualBookingModalProps> = ({ onClose, onBookingAdded }) => {
    // Campo para novedad/comentario
    const [clientNote, setClientNote] = useState('');
    // Validation state
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
    const [submitDisabled, setSubmitDisabled] = useState(false);
    const { t, language } = useLanguage();
    const [step, setStep] = useState(1);

    const [products, setProducts] = useState<Product[]>([]);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [appData, setAppData] = useState<Pick<AppData, 'bookings' | 'availability' | 'scheduleOverrides' | 'classCapacity' | 'instructors' | 'capacityMessages'> | null>(null);
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [price, setPrice] = useState<number | string>('');
    const [userInfo, setUserInfo] = useState<UserInfo>({ firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code, birthday: '' });
    const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [optOutBirthday, setOptOutBirthday] = useState(false);


    const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [modalState, setModalState] = useState<{ isOpen: boolean; date: Date | null }>({ isOpen: false, date: null });
    const [availableTimesForModal, setAvailableTimesForModal] = useState<EnrichedAvailableSlot[]>([]);

    const [singleClassDate, setSingleClassDate] = useState(formatDateToYYYYMMDD(new Date()));
    const [singleClassTime, setSingleClassTime] = useState('10:00');
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [conflictDetails, setConflictDetails] = useState<{ count: number; time: string } | null>(null);
    const [slotToConfirm, setSlotToConfirm] = useState<TimeSlot | null>(null);

    const [minParticipants, setMinParticipants] = useState<number>(2);
    const [groupClassPricePerPerson, setGroupClassPricePerPerson] = useState<number | string>('');

    const virtualProducts: Product[] = useMemo(() => [
        {
            id: -1,
            type: 'SINGLE_CLASS',
            name: t('admin.manualBookingModal.singleClassPottersWheel'),
            description: t('admin.manualBookingModal.singleClassDescription'),
            isActive: true,
            classes: 1,
            price: 55,
            details: {
                technique: 'potters_wheel',
                duration: '2 hours',
                durationHours: 2,
                activities: [],
                generalRecommendations: '',
                materials: ''
            }
        },
        {
            id: -2,
            type: 'SINGLE_CLASS',
            name: t('admin.manualBookingModal.singleClassMolding'),
            description: t('admin.manualBookingModal.singleClassDescription'),
            isActive: true,
            classes: 1,
            price: 55,
            details: {
                technique: 'molding',
                duration: '2 hours',
                durationHours: 2,
                activities: [],
                generalRecommendations: '',
                materials: ''
            }
        },
        {
            id: -3,
            type: 'GROUP_CLASS',
            name: t('admin.manualBookingModal.groupClassTitle'),
            description: t('admin.manualBookingModal.groupClassDescription'),
            isActive: true,
            minParticipants: 2,
            pricePerPerson: 40,
            details: {
                technique: 'potters_wheel',
                duration: '2 hours',
                durationHours: 2,
                activities: [],
                generalRecommendations: '',
                materials: ''
            }
        }
    ], [t]);

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
          const activeProducts = allProducts.filter(p => p.isActive && p.type !== 'GROUP_EXPERIENCE' && p.type !== 'COUPLES_EXPERIENCE');
          setProducts([...virtualProducts, ...activeProducts]);
          setAllCustomers(dataService.getCustomers(bookings));
          setAppData({ bookings, availability, scheduleOverrides, classCapacity, instructors, capacityMessages });
        };
        loadData();
    }, [virtualProducts]);
    
    useEffect(() => {
        if (selectedProduct?.type === 'GROUP_CLASS') {
            setPrice(0);
            setMinParticipants((selectedProduct as GroupClass).minParticipants);
            setGroupClassPricePerPerson((selectedProduct as GroupClass).pricePerPerson);
        } else if (selectedProduct && 'price' in selectedProduct) {
            setPrice(selectedProduct.price);
        } else {
            setPrice('');
        }
        setSelectedSlots([]);
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
        setUserInfo({ firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code, birthday: '' });
    };

    const handleSubmitBooking = async () => {
        // Validación de campos obligatorios para reserva manual
        const requiredFields = [
            { key: 'firstName', label: 'Nombre' },
            { key: 'lastName', label: 'Apellidos' },
            { key: 'email', label: 'Correo Electrónico' },
            { key: 'phone', label: 'Número de Teléfono' }
        ];
        let errors: { [key: string]: string } = {};
        requiredFields.forEach(field => {
            if (!userInfo[field.key] || userInfo[field.key].trim() === '') {
                errors[field.key] = `El campo "${field.label}" es obligatorio.`;
            }
        });
        if (!selectedProduct) {
            errors['product'] = 'Debes seleccionar un producto.';
        }
        // Validar slots seleccionados
        if (selectedSlots.length === 0) {
            errors['slots'] = 'Debes seleccionar al menos un horario.';
        }
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setSubmitDisabled(false);
            return;
        }
        setFormErrors({});
        setSubmitDisabled(true);
        const finalUserInfo = { ...userInfo, birthday: optOutBirthday ? null : userInfo.birthday };
        let finalPrice = Number(price) || 0;
        let productToSave = selectedProduct;
        if (selectedProduct.type === 'GROUP_CLASS') {
            const pricePerPerson = Number(groupClassPricePerPerson) || 0;
            finalPrice = pricePerPerson * minParticipants;
            productToSave = { ...selectedProduct, pricePerPerson, minParticipants, price: finalPrice };
        }
        const bookingData = {
            product: productToSave,
            productId: selectedProduct!.id,
            productType: selectedProduct!.type,
            slots: selectedSlots,
            userInfo: finalUserInfo,
            isPaid: false,
            price: finalPrice,
            bookingMode: 'flexible',
            bookingDate: new Date().toISOString(),
            participants: selectedProduct.type === 'GROUP_CLASS' ? minParticipants : 1,
            clientNote: clientNote || null
        };
        const result = await dataService.addBooking(bookingData);
        if (result.success) {
            onBookingAdded();
        } else {
            alert(`Error: ${result.message}`);
            setSubmitDisabled(false);
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
        let technique: Technique | undefined;
        if (selectedProduct.type === 'GROUP_CLASS') {
             technique = (selectedProduct as GroupClass).details.technique;
        } else if (selectedProduct.type === 'CLASS_PACKAGE' || selectedProduct.type === 'SINGLE_CLASS') {
            technique = (selectedProduct as ClassPackage | SingleClass).details.technique;
        } else if (selectedProduct.type === 'INTRODUCTORY_CLASS') {
            technique = (selectedProduct as IntroductoryClass).details.technique;
        }
        
        if (selectedProduct.type === 'INTRODUCTORY_CLASS') {
            const dateStr = formatDateToYYYYMMDD(date);
            const sessions = dataService.generateIntroClassSessions(selectedProduct as IntroductoryClass, appData, { includeFull: true, generationLimitInDays: 90 });
            return sessions
                .filter(s => s.date === dateStr)
                .map(s => ({
                    time: s.time,
                    instructorId: s.instructorId,
                    technique: technique!,
                    paidBookingsCount: s.paidBookingsCount,
                    totalBookingsCount: s.totalBookingsCount,
                    maxCapacity: s.capacity,
                }));
        } else if (technique) {
            return dataService.getAvailableTimesForDate(date, appData, technique);
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
    
    const handleSlotSelect = (slot: EnrichedAvailableSlot) => {
        if (!modalState.date) return;
        const dateStr = formatDateToYYYYMMDD(modalState.date);
        const newSlot: TimeSlot = { date: dateStr, time: slot.time, instructorId: slot.instructorId };
        
        const isSelected = selectedSlots.some(s => s.date === newSlot.date && s.time === newSlot.time);
        if(isSelected) {
            setSelectedSlots(prev => prev.filter(s => s.date !== newSlot.date || s.time !== newSlot.time));
        } else {
            const productType = selectedProduct?.type;
            if (productType === 'GROUP_CLASS' || productType === 'INTRODUCTORY_CLASS') {
                setSelectedSlots([newSlot]);
            } else if (productType === 'CLASS_PACKAGE' || productType === 'SINGLE_CLASS') {
                const productWithClasses = selectedProduct as ClassPackage | SingleClass;
                if (selectedSlots.length < productWithClasses.classes) {
                     setSelectedSlots(prev => [...prev, newSlot].sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
                }
            }
        }
        setModalState({ isOpen: false, date: null });
    };

    const handleRemoveSlot = (slotToRemove: TimeSlot) => {
        setSelectedSlots(prev => prev.filter(s => s !== slotToRemove));
    };

    const confirmAddSlot = (slot: TimeSlot) => {
        setSelectedSlots([slot]);
        setIsConflictModalOpen(false);
        setConflictDetails(null);
        setSlotToConfirm(null);
    };
    
    const handleAddGroupClassSlot = () => {
        if (!selectedProduct || !appData || selectedProduct.type !== 'GROUP_CLASS') return;

        const { instructors, availability, scheduleOverrides, bookings, classCapacity } = appData;
        const date = new Date(singleClassDate + 'T00:00:00');
        const dayKey = DAY_NAMES[date.getDay()];
        const override = scheduleOverrides[date.toISOString().split('T')[0]];
        const weeklySlots = override?.slots ?? availability[dayKey];
        
        const technique = (selectedProduct as GroupClass).details.technique;
        const matchingSlots = weeklySlots.filter(s => s.technique === technique);
        
        let instructorId = 0;
        if (matchingSlots.length > 0) {
            const normalizedInputTime = normalizeTime(singleClassTime);
            const slotAtTime = matchingSlots.find(s => normalizeTime(s.time) === normalizedInputTime);
            instructorId = slotAtTime ? slotAtTime.instructorId : matchingSlots[0].instructorId;
        } else if (instructors.length > 0) {
            instructorId = instructors[0].id;
        }

        const displayTime = formatToAmPm(singleClassTime);
        const newSlot: TimeSlot = { date: singleClassDate, time: displayTime, instructorId };
        
        const normalizedNewSlotTime = normalizeTime(newSlot.time);
        const bookingsForSlot = bookings.filter(booking => 
            booking.slots.some(slot => 
                slot.date === newSlot.date && normalizeTime(slot.time) === normalizedNewSlotTime
            )
        );
        
        const slotConfig = matchingSlots.find(s => normalizeTime(s.time) === normalizedNewSlotTime);
        const maxCapacity = override?.capacity ?? (slotConfig?.technique === 'molding' ? classCapacity.molding : classCapacity.potters_wheel);

        if (bookingsForSlot.length > 0) {
             setConflictDetails({ count: bookingsForSlot.length, time: displayTime });
            setSlotToConfirm(newSlot);
            setIsConflictModalOpen(true);
        } else {
            confirmAddSlot(newSlot);
        }
    };
    
    const handleAddSingleClassSlot = () => {
        if (!selectedProduct || !appData || selectedProduct.type !== 'SINGLE_CLASS') return;

        const { instructors, availability, scheduleOverrides, bookings } = appData;
        const date = new Date(singleClassDate + 'T00:00:00');
        const dayKey = DAY_NAMES[date.getDay()];
        const override = scheduleOverrides[date.toISOString().split('T')[0]];
        const weeklySlots = override?.slots ?? availability[dayKey];
        
        const technique = (selectedProduct as SingleClass).details.technique;
        const matchingSlots = weeklySlots.filter(s => s.technique === technique);
        
        let instructorId = 0;
        if (matchingSlots.length > 0) {
            const normalizedInputTime = normalizeTime(singleClassTime);
            const slotAtTime = matchingSlots.find(s => normalizeTime(s.time) === normalizedInputTime);
            instructorId = slotAtTime ? slotAtTime.instructorId : matchingSlots[0].instructorId;
        } else if (instructors.length > 0) {
            instructorId = instructors[0].id;
        }

        const displayTime = formatToAmPm(singleClassTime);
        const newSlot: TimeSlot = { date: singleClassDate, time: displayTime, instructorId };
        
        const normalizedNewSlotTime = normalizeTime(newSlot.time);
        const bookingsForSlot = bookings.filter(booking => 
            booking.slots.some(slot => 
                slot.date === newSlot.date && normalizeTime(slot.time) === normalizedNewSlotTime
            )
        );
        
        if (bookingsForSlot.length > 0) {
            setConflictDetails({ count: bookingsForSlot.length, time: displayTime });
            setSlotToConfirm(newSlot);
            setIsConflictModalOpen(true);
        } else {
            confirmAddSlot(newSlot);
        }
    };
    
    const slotsNeeded = useMemo(() => {
        if (selectedProduct?.type === 'GROUP_CLASS' || selectedProduct?.type === 'INTRODUCTORY_CLASS') {
            return 1;
        }
        if (selectedProduct?.type === 'CLASS_PACKAGE' || selectedProduct?.type === 'SINGLE_CLASS') {
            return (selectedProduct as ClassPackage | SingleClass).classes;
        }
        return 0;
    }, [selectedProduct]);

    const areSlotsSelected = slotsNeeded === 0 || selectedSlots.length === slotsNeeded;

    const isNextDisabled = !selectedProduct || 
                           (!selectedCustomer && !isCreatingNewCustomer) || 
                           (isCreatingNewCustomer && (!userInfo.firstName || !userInfo.lastName || !userInfo.email)) ||
                           (isCreatingNewCustomer && !optOutBirthday && !userInfo.birthday);
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
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
             <ConflictWarningModal
                isOpen={isConflictModalOpen}
                onClose={() => setIsConflictModalOpen(false)}
                onConfirm={() => slotToConfirm && confirmAddSlot(slotToConfirm)}
                details={conflictDetails}
            />
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
                                    <div className="p-4 border border-rose-200 rounded-lg bg-rose-50/50 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <SparklesIcon className="w-6 h-6 text-rose-500" />
                                            <div>
                                                <h4 className="font-bold text-brand-text">{t('admin.manualBookingModal.birthdayTitle')}</h4>
                                                <p className="text-xs text-brand-secondary">{t('admin.manualBookingModal.birthdaySubtitle')}</p>
                                            </div>
                                        </div>
                                        <input id="birthday" name="birthday" type="date" value={userInfo.birthday || ''} onChange={handleUserInputChange} disabled={optOutBirthday} className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100" />
                                        <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-secondary">
                                            <div className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${optOutBirthday ? 'bg-brand-primary' : 'bg-gray-300'}`}>
                                                <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${optOutBirthday ? 'translate-x-5' : 'translate-x-1'}`}/>
                                            </div>
                                            <input type="checkbox" checked={optOutBirthday} onChange={e => setOptOutBirthday(e.target.checked)} className="hidden" />
                                            {t('admin.manualBookingModal.birthdayOptOut')}
                                        </label>
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
                                <select 
                                    value={selectedProduct?.id ?? ''}
                                    onChange={(e) => {
                                        const productId = Number(e.target.value);
                                        setSelectedProduct(products.find(p => p.id === productId) || null);
                                    }} 
                                    className="w-full p-2 border rounded-lg bg-white"
                                >
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
                            <button type="button" onClick={handleGoToStep2} disabled={isNextDisabled} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent disabled:bg-gray-400">
                                { selectedProduct && (selectedProduct.type === 'OPEN_STUDIO_SUBSCRIPTION') ? t('admin.manualBookingModal.saveButton') : t('admin.manualBookingModal.nextButton') }
                            </button>
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div className="animate-fade-in-fast">
                        {/* Campo para novedad/comentario del cliente */}
                        <div className="mb-4">
                            <label htmlFor="clientNote" className="block text-sm font-bold text-brand-secondary mb-1">
                                {t('admin.manualBookingModal.clientNoteLabel') || 'Novedad / Comentario sobre el cliente'}
                            </label>
                            <textarea
                                id="clientNote"
                                value={clientNote}
                                onChange={e => setClientNote(e.target.value)}
                                className="w-full p-2 border rounded-lg"
                                rows={3}
                                placeholder={t('admin.manualBookingModal.clientNotePlaceholder') || 'Escribe cualquier novedad, comentario o información relevante sobre el cliente...'}
                            />
                        </div>
                         <h3 className="font-bold text-brand-text mb-2 text-center">{t('admin.manualBookingModal.scheduleSectionTitle')}</h3>
                        
                        {(selectedProduct?.type === 'SINGLE_CLASS' || selectedProduct?.type === 'GROUP_CLASS') ? (
                            <div className="p-4 bg-brand-background rounded-lg">
                                 {selectedProduct?.type === 'GROUP_CLASS' && (
                                     <div className="bg-blue-100 p-2 rounded-md text-sm text-blue-800 mb-4 animate-fade-in-fast">
                                        {t('admin.manualBookingModal.groupClassInfo', { 
                                            min: minParticipants,
                                            price: Number(groupClassPricePerPerson) || 0,
                                            totalPrice: (Number(groupClassPricePerPerson) || 0) * (minParticipants || 0)
                                        })}
                                     </div>
                                 )}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                    <div>
                                        <label htmlFor="single-class-date" className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.manualBookingModal.dateLabel')}</label>
                                        <input id="single-class-date" type="date" value={singleClassDate} onChange={e => setSingleClassDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                                    </div>
                                    <div>
                                        <label htmlFor="single-class-time" className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.manualBookingModal.timeLabel')}</label>
                                        <input id="single-class-time" type="time" value={singleClassTime} onChange={e => setSingleClassTime(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                                    </div>
                                    <button 
                                        onClick={selectedProduct?.type === 'GROUP_CLASS' ? handleAddGroupClassSlot : handleAddSingleClassSlot} 
                                        className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg h-10"
                                    >
                                        {t('admin.manualBookingModal.addSlotButton')}
                                    </button>
                                </div>
                                 {selectedProduct?.type === 'GROUP_CLASS' && (
                                     <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="min-participants" className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.manualBookingModal.participantsLabel')}</label>
                                            <input id="min-participants" type="number" min={2} value={minParticipants} onChange={e => setMinParticipants(parseInt(e.target.value) || 2)} className="w-full px-3 py-2 border rounded-lg" />
                                        </div>
                                         <div>
                                            <label htmlFor="price-per-person" className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.manualBookingModal.pricePerPersonLabel')}</label>
                                            <input id="price-per-person" type="number" step="0.01" value={groupClassPricePerPerson} onChange={e => setGroupClassPricePerPerson(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                                        </div>
                                     </div>
                                 )}
                            </div>
                        ) : (
                            <>
                                <p className="text-center text-sm text-brand-secondary mb-4">{t('schedule.classesRemaining', { count: slotsNeeded - selectedSlots.length })}</p>
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
                                        <span>
                                            {new Date(slot.date + 'T00:00:00').toLocaleDateString(language, { weekday: 'short', month: 'short', day: 'numeric' })} @ {slot.time}
                                            {selectedProduct?.type === 'GROUP_CLASS' && (
                                                <span className="ml-2 text-brand-accent font-bold">({minParticipants} personas)</span>
                                            )}
                                        </span>
                                        <button onClick={() => handleRemoveSlot(slot)} className="text-red-500 font-bold">X</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                         <div className="mt-6 flex justify-between items-center gap-3">
                            <button type="button" onClick={() => setStep(1)} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">{t('admin.manualBookingModal.backButton')}</button>
                            <button type="button" onClick={handleSubmitBooking} disabled={!areSlotsSelected || submitDisabled} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent disabled:bg-gray-400">
                                {t('admin.manualBookingModal.saveButton')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};