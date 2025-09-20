import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Customer, Booking, ClassPackage, TimeSlot, InvoiceRequest, AdminTab } from '../../types';
import * as dataService from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';
import { CustomerList } from './CustomerList';
import { CustomerDetailView } from './CustomerDetailView';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { OpenStudioView } from './OpenStudioView';

interface NavigationState {
    tab: AdminTab;
    targetId: string;
}

interface CrmDashboardProps {
    navigateToEmail?: string;
    bookings: Booking[];
    invoiceRequests: InvoiceRequest[];
    onDataChange: () => void;
    onNavigationComplete: () => void;
    setNavigateTo: React.Dispatch<React.SetStateAction<NavigationState | null>>;
}

export type FilterType = 'all' | '1-left' | '2-left' | 'completed';

export interface RemainingClassesInfo {
    remaining: number;
    status: 'active' | 'completed';
}

export interface AugmentedCustomer extends Customer {
    remainingClassesInfo: RemainingClassesInfo | null;
    isBirthdayUpcoming: boolean;
}

const getSlotDateTime = (slot: TimeSlot) => {
    const [time, modifier] = slot.time.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier && modifier.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    const startDateTime = new Date(slot.date + 'T00:00:00');
    startDateTime.setHours(hours, minutes, 0, 0);
    return startDateTime;
};

const getRemainingClassesInfo = (customer: Customer): RemainingClassesInfo | null => {
    const now = new Date();
    
    const validPackages = customer.bookings.filter(booking => {
        if (booking.productType !== 'CLASS_PACKAGE' || !booking.slots || booking.slots.length === 0) return false;
        
        const firstClassDate = booking.slots.map(getSlotDateTime).sort((a,b) => a.getTime() - b.getTime())[0];
        if (!firstClassDate) return false;
        
        const expiryDate = new Date(firstClassDate);
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        return now < expiryDate;

    }).sort((a, b) => {
        const expiryA = new Date(a.slots.map(getSlotDateTime).sort((c, d) => c.getTime() - d.getTime())[0]);
        expiryA.setDate(expiryA.getDate() + 30);
        const expiryB = new Date(b.slots.map(getSlotDateTime).sort((c, d) => c.getTime() - d.getTime())[0]);
        expiryB.setDate(expiryB.getDate() + 30);
        return expiryA.getTime() - expiryB.getTime();
    });
    
    if (validPackages.length === 0) return null;

    const mostRelevantPackage = validPackages[0];
    if (mostRelevantPackage.product.type !== 'CLASS_PACKAGE') return null;

    const product = mostRelevantPackage.product as ClassPackage;
    const completedClasses = mostRelevantPackage.slots.filter(slot => getSlotDateTime(slot) < now).length;
    const remaining = product.classes - completedClasses;

    return {
        remaining,
        status: remaining > 0 ? 'active' : 'completed'
    };
};

const isBirthdayUpcoming = (birthday: string | null | undefined): boolean => {
    if (!birthday) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthdayDate = new Date(birthday + 'T00:00:00'); // Treat as local timezone
    if (isNaN(birthdayDate.getTime())) return false;
    
    const currentYear = today.getFullYear();
    const nextBirthday = new Date(currentYear, birthdayDate.getMonth(), birthdayDate.getDate());

    if (nextBirthday < today) {
        nextBirthday.setFullYear(currentYear + 1);
    }
    
    const diffTime = nextBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 && diffDays <= 30;
};


const CrmDashboard: React.FC<CrmDashboardProps> = ({ navigateToEmail, bookings, invoiceRequests, onDataChange, onNavigationComplete, setNavigateTo }) => {
    const { t } = useLanguage();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterByClassesRemaining, setFilterByClassesRemaining] = useState<FilterType>('all');
    const [activeTab, setActiveTab] = useState<'all' | 'openStudio'>('all');

    const loadCustomers = useCallback(() => {
        setCustomers(dataService.getCustomers(bookings));
    }, [bookings]);

    useEffect(() => {
        loadCustomers();
        setLoading(false);
    }, [loadCustomers]);
    
    useEffect(() => {
        if (navigateToEmail) {
            const customer = customers.find(c => c.userInfo.email === navigateToEmail);
            if (customer) {
                setSelectedCustomer(customer);
                setSearchTerm('');
            }
            onNavigationComplete();
        }
    }, [navigateToEmail, customers, onNavigationComplete]);

    useEffect(() => {
      if (selectedCustomer) {
        const updatedCustomer = dataService.getCustomers(bookings).find(c => c.email === selectedCustomer.email);
        setSelectedCustomer(updatedCustomer || null);
      }
    }, [bookings, selectedCustomer]);


    const augmentedAndFilteredCustomers = useMemo((): AugmentedCustomer[] => {
        const augmented = customers.map(c => ({
            ...c,
            remainingClassesInfo: getRemainingClassesInfo(c),
            isBirthdayUpcoming: isBirthdayUpcoming(c.userInfo.birthday)
        }));

        let filtered = augmented;
        
        if (filterByClassesRemaining !== 'all') {
            filtered = filtered.filter(c => {
                if (!c.remainingClassesInfo) return false;
                if (filterByClassesRemaining === '1-left') return c.remainingClassesInfo.remaining === 1 && c.remainingClassesInfo.status === 'active';
                if (filterByClassesRemaining === '2-left') return c.remainingClassesInfo.remaining === 2 && c.remainingClassesInfo.status === 'active';
                if (filterByClassesRemaining === 'completed') return c.remainingClassesInfo.status === 'completed';
                return false;
            });
        }
        
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(c => 
                c.userInfo.firstName.toLowerCase().includes(lowercasedTerm) ||
                c.userInfo.lastName.toLowerCase().includes(lowercasedTerm) ||
                c.userInfo.email.toLowerCase().includes(lowercasedTerm) ||
                c.bookings.some(b => b.bookingCode?.toLowerCase().includes(lowercasedTerm))
            );
        }

        return filtered;
    }, [customers, searchTerm, filterByClassesRemaining]);

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
    };
    
    const handleNavigateToCustomer = (email: string) => {
        const customer = customers.find(c => c.userInfo.email === email);
        if (customer) {
            setSelectedCustomer(customer);
        }
    };

    const handleBackToList = () => {
        setSelectedCustomer(null);
    };
    
    const FilterButton: React.FC<{ filter: FilterType; children: React.ReactNode; }> = ({ filter, children }) => (
        <button
            onClick={() => setFilterByClassesRemaining(filter)}
            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${filterByClassesRemaining === filter ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20'}`}
        >
            {children}
        </button>
    );

    if (loading) {
        return <div>Loading customers...</div>
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-serif text-brand-text mb-2 flex items-center gap-3">
                        <UserGroupIcon className="w-6 h-6 text-brand-accent" />
                        {t('admin.crm.title')}
                    </h2>
                    <p className="text-brand-secondary">{t('admin.crm.subtitle')}</p>
                </div>
            </div>

            {selectedCustomer ? (
                <CustomerDetailView 
                  customer={selectedCustomer} 
                  onBack={handleBackToList} 
                  onDataChange={onDataChange} 
                  invoiceRequests={invoiceRequests}
                  setNavigateTo={setNavigateTo}
                />
            ) : (
              <>
                <div className="border-b border-gray-200 mb-4">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'all' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('admin.crm.allCustomersTab')}
                        </button>
                        <button
                            onClick={() => setActiveTab('openStudio')}
                            className={`px-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'openStudio' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('admin.crm.openStudioTab')}
                        </button>
                    </nav>
                </div>
                
                {activeTab === 'all' && (
                    <div className="animate-fade-in">
                        <div className="md:flex justify-between items-center mb-4 gap-4">
                            <input 
                                type="text"
                                placeholder={t('admin.crm.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-primary focus:border-brand-primary"
                            />
                            <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center gap-2 flex-wrap mt-4 md:mt-0">
                                <span className="text-sm font-bold text-brand-secondary mr-2">{t('admin.crm.filters.title')}:</span>
                                <FilterButton filter="all">{t('admin.crm.filters.all')}</FilterButton>
                                <FilterButton filter="2-left">{t('admin.crm.filters.2left')}</FilterButton>
                                <FilterButton filter="1-left">{t('admin.crm.filters.1left')}</FilterButton>
                                <FilterButton filter="completed">{t('admin.crm.filters.completed')}</FilterButton>
                            </div>
                        </div>
                        <CustomerList customers={augmentedAndFilteredCustomers} onSelectCustomer={handleSelectCustomer} />
                    </div>
                )}
                
                {activeTab === 'openStudio' && (
                    <OpenStudioView bookings={bookings} onNavigateToCustomer={handleNavigateToCustomer} />
                )}
              </>
            )}
        </div>
    );
};

export default CrmDashboard;