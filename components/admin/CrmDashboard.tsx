import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Customer, Booking, ClassPackage, TimeSlot, InvoiceRequest, AdminTab, UserInfo } from '../../types';
import * as dataService from '../../services/dataService';
import { generateCustomersFromBookings } from '../../services/dataService';
import { CustomerList } from './CustomerList';
import CustomerDetailView from './CustomerDetailView';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { UserIcon } from '../icons/UserIcon';
import { OpenStudioView } from './OpenStudioView';
import { DeliveryMetrics } from './DeliveryMetrics';
import { DeliveriesTab } from './DeliveriesTab';
import { COUNTRIES } from '../../constants';

interface NavigationState {
    tab: AdminTab;
    targetId: string;
}

interface CrmDashboardProps {
    navigateToEmail?: string;
    bookings: Booking[];
    customers?: Customer[]; // Add customers prop for direct use
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
    // Verificar si el cliente tiene bookings antes de continuar
    if (!customer || !Array.isArray(customer.bookings) || customer.bookings.length === 0) return null;
    
    const now = new Date();
    
    const validPackages = customer.bookings.filter(booking => {
        if (booking.productType !== 'CLASS_PACKAGE' || !Array.isArray(booking.slots) || booking.slots.length === 0) return false;
        
        const firstClassDate = Array.isArray(booking.slots) ? booking.slots.map(getSlotDateTime).sort((a,b) => a.getTime() - b.getTime())[0] : undefined;
        if (!firstClassDate) return false;
        
        const expiryDate = new Date(firstClassDate);
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        return now < expiryDate;

    }).sort((a, b) => {
        const expiryA = new Date(Array.isArray(a.slots) && a.slots.length > 0 ? a.slots.map(getSlotDateTime).sort((c, d) => c.getTime() - d.getTime())[0] : new Date());
        expiryA.setDate(expiryA.getDate() + 30);
        const expiryB = new Date(Array.isArray(b.slots) && b.slots.length > 0 ? b.slots.map(getSlotDateTime).sort((c, d) => c.getTime() - d.getTime())[0] : new Date());
        expiryB.setDate(expiryB.getDate() + 30);
        return expiryA.getTime() - expiryB.getTime();
    });
    
    if (validPackages.length === 0) return null;

    const mostRelevantPackage = validPackages[0];
    if (mostRelevantPackage.product.type !== 'CLASS_PACKAGE') return null;

    const product = mostRelevantPackage.product as ClassPackage;
    
    // Asegurarnos de que product.classes existe antes de usarlo
    if (typeof product.classes !== 'number') return null;
    
    const completedClasses = Array.isArray(mostRelevantPackage.slots) ? mostRelevantPackage.slots.filter(slot => getSlotDateTime(slot) < now).length : 0;
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


// Simple Modal Component for Adding Customer
const CustomerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (userInfo: UserInfo) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [userInfo, setUserInfo] = useState<UserInfo>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        countryCode: COUNTRIES[0].code,
        birthday: ''
    });
    
    if (!isOpen) return null;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setUserInfo(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(userInfo);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
                <h2 className="text-xl font-bold mb-4">Agregar Nuevo Cliente</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre</label>
                        <input
                            type="text"
                            name="firstName"
                            value={userInfo.firstName}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Apellido</label>
                        <input
                            type="text"
                            name="lastName"
                            value={userInfo.lastName}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={userInfo.email}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Código País</label>
                            <select
                                name="countryCode"
                                value={userInfo.countryCode}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            >
                                {COUNTRIES.map(country => (
                                    <option key={`${country.code}-${country.name}`} value={country.code}>{country.name} ({country.code})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Teléfono</label>
                            <input
                                type="text"
                                name="phone"
                                value={userInfo.phone}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Cumpleaños (opcional)</label>
                        <input
                            type="date"
                            name="birthday"
                            value={userInfo.birthday || ''}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-brand-primary text-white py-2 rounded font-semibold hover:bg-brand-secondary transition-colors"
                    >
                        Guardar Cliente
                    </button>
                </form>
            </div>
        </div>
    );
};

// FilterButton component for UX/UI consistency
const FilterButton: React.FC<{
    filter: FilterType;
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ filter, active, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
            active
                ? 'bg-brand-primary text-white shadow'
                : 'bg-brand-background hover:bg-brand-primary/20 text-brand-text'
        }`}
        aria-pressed={active}
    >
        {children}
    </button>
);

const CrmDashboard: React.FC<CrmDashboardProps> = ({ 
    navigateToEmail, 
    bookings, 
    customers: propCustomers, 
    invoiceRequests, 
    onDataChange, 
    onNavigationComplete, 
    setNavigateTo 
}) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterByClassesRemaining, setFilterByClassesRemaining] = useState<FilterType>('all');
    const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'with-pending' | 'with-ready' | 'with-overdue' | 'with-completed' | 'none'>('all');
    const [activeTab, setActiveTab] = useState<'all' | 'openStudio' | 'entregas'>('all');
    // Customer creation modal state
    const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
    // FIX: Move these hooks to top level to avoid hook order errors
    const [studioFilter, setStudioFilter] = useState<'all' | 'active' | 'expiring' | 'unpaid'>('all');
    const [studioSort, setStudioSort] = useState<'expiry' | 'name'>('expiry');

    // CORRECCIÓN: El hook de efecto que causa el bucle infinito en CrmDashboard.tsx:162 se debe
    // a una actualización de estado sin dependencias adecuadas. La lógica de carga de datos
    // se ha movido a una función `useCallback` que se ejecutará solo cuando `bookings` cambie.
    const loadCustomers = useCallback(async () => {
        console.log('CrmDashboard: Loading customers...');
        console.log('PropCustomers available:', propCustomers?.length || 0);
        console.log('Bookings available:', bookings?.length || 0);
        
        // Use propCustomers if available, otherwise combine standalone + booking customers
        if (propCustomers && propCustomers.length > 0) {
            console.log('CrmDashboard: Using propCustomers');
            setCustomers(propCustomers);
            setLoading(false);
            return;
        }
        
        try {
            console.log('CrmDashboard: Loading standalone customers and merging with booking customers');
            
            // Get standalone customers from customers table
            const standaloneCustomers = await dataService.getStandaloneCustomers();
            console.log('CrmDashboard: Standalone customers loaded:', standaloneCustomers.length);
            
            // Get customers from bookings
            const customersFromBookings = bookings && bookings.length > 0 
                ? generateCustomersFromBookings(bookings) 
                : [];
            console.log('CrmDashboard: Customers from bookings:', customersFromBookings.length);
            
            // Merge customers: prioritize booking customers (they have more data), then add standalone without bookings
            const customerMap = new Map<string, Customer>();
            
            // First add customers from bookings (they have complete booking data)
            customersFromBookings.forEach(customer => {
                customerMap.set(customer.email, customer);
            });
            
            // Then add standalone customers that don't have bookings
            standaloneCustomers.forEach(standaloneCustomer => {
                if (!customerMap.has(standaloneCustomer.email)) {
                    customerMap.set(standaloneCustomer.email, standaloneCustomer);
                }
            });
            
            const allCustomers = Array.from(customerMap.values());
            console.log('CrmDashboard: Total combined customers:', allCustomers.length);
            setCustomers(allCustomers);
            
        } catch (error) {
            console.error('CrmDashboard: Error loading customers:', error);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [bookings, propCustomers]);    // CORRECCIÓN: Llamamos a la función de carga de datos en un useEffect con la dependencia `loadCustomers`.
    // Esto asegura que la lógica se ejecuta solo cuando los datos de `bookings` cambian, evitando el bucle.
    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);
    
    // CORRECCIÓN: Este hook también puede causar un bucle si no se maneja correctamente.
    // La dependencia `customers` ya no causa un bucle porque su estado se actualiza de forma controlada.
    useEffect(() => {
        if (navigateToEmail) {
            const customer = customers.find(c => c.userInfo?.email === navigateToEmail);
            if (customer) {
                setSelectedCustomer(customer);
                setSearchTerm('');
            }
            onNavigationComplete();
        }
    }, [navigateToEmail, customers, onNavigationComplete]);

    // CORRECCIÓN: Este hook también puede contribuir al bucle.
    // Se ha corregido la lógica para que solo se actualice si el cliente seleccionado es diferente.
    useEffect(() => {
      if (selectedCustomer) {
        // Use the current customers state instead of fetching again
        const updatedCustomer = customers.find(c => c.email === selectedCustomer.email);
        if (updatedCustomer && JSON.stringify(updatedCustomer) !== JSON.stringify(selectedCustomer)) {
            setSelectedCustomer(updatedCustomer);
        }
      }
    }, [bookings, selectedCustomer, customers]);


    const augmentedAndFilteredCustomers = useMemo((): AugmentedCustomer[] => {
        
        const augmented = customers.map(c => ({
            ...c,
            remainingClassesInfo: getRemainingClassesInfo(c),
            isBirthdayUpcoming: c.userInfo && c.userInfo.birthday ? isBirthdayUpcoming(c.userInfo.birthday) : false
        }));


        let filtered = augmented;
        
        if (filterByClassesRemaining !== 'all') {
            const beforeFilter = filtered.length;
            filtered = filtered.filter(c => {
                if (!c.remainingClassesInfo) return false;
                if (filterByClassesRemaining === '1-left') return c.remainingClassesInfo.remaining === 1 && c.remainingClassesInfo.status === 'active';
                if (filterByClassesRemaining === '2-left') return c.remainingClassesInfo.remaining === 2 && c.remainingClassesInfo.status === 'active';
                if (filterByClassesRemaining === 'completed') return c.remainingClassesInfo.status === 'completed';
                return false;
            });
        }

        // Apply delivery filter
        if (deliveryFilter !== 'all') {
            const beforeFilter = filtered.length;
            filtered = filtered.filter(c => {
                const deliveries = Array.isArray(c.deliveries) ? c.deliveries : [];
                const today = new Date();
                
                if (deliveryFilter === 'none') {
                    return deliveries.length === 0;
                }
                
                if (deliveryFilter === 'with-pending') {
                    // Pending: status is pending AND NOT ready yet
                    return deliveries.some(d => d?.status === 'pending' && !d?.readyAt);
                }
                
                if (deliveryFilter === 'with-ready') {
                    return deliveries.some(d => d?.readyAt && d?.status !== 'completed');
                }
                
                if (deliveryFilter === 'with-overdue') {
                    return deliveries.some(d => {
                        if (!d || !d.scheduledDate) return false;
                        const scheduledDate = new Date(d.scheduledDate);
                        // Overdue: pending (not ready) and scheduled date is past
                        return d.status === 'pending' && !d?.readyAt && scheduledDate < today;
                    });
                }
                
                if (deliveryFilter === 'with-completed') {
                    return deliveries.some(d => d?.status === 'completed');
                }
                
                return true;
            });
        }
        
        if (searchTerm) {
            const beforeFilter = filtered.length;
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(c => 
                (c.userInfo?.firstName?.toLowerCase().includes(lowercasedTerm) ?? false) ||
                (c.userInfo?.lastName?.toLowerCase().includes(lowercasedTerm) ?? false) ||
                (c.userInfo?.email?.toLowerCase().includes(lowercasedTerm) ?? false) ||
                (Array.isArray(c.bookings) && c.bookings.some(b => b?.bookingCode?.toLowerCase?.().includes(lowercasedTerm)))
            );
        }

        
        // Check specifically for Daniel Reinoso
        const danielCustomer = filtered.find(c => 
            (c.userInfo?.firstName?.toLowerCase() === 'daniel' && c.userInfo?.lastName?.toLowerCase() === 'reinoso') ||
            c.email?.toLowerCase().includes('daniel') ||
            c.email?.toLowerCase().includes('reinoso')
        );

        return filtered;
    }, [customers, searchTerm, filterByClassesRemaining, deliveryFilter]);

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
    };
    
    const handleNavigateToCustomer = (email: string) => {
        const customer = customers.find(c => c.userInfo?.email === email);
        if (customer) {
            setSelectedCustomer(customer);
        }
    };

    const handleBackToList = () => {
        setSelectedCustomer(null);
    };
    
    const handleCreateCustomer = async (userInfo: UserInfo) => {
        try {
            // Create the new customer
            const newCustomer = await dataService.createCustomer(userInfo);
            console.log('Customer created successfully:', newCustomer);

            // Force reload all customers regardless of propCustomers
            setLoading(true);

            try {
                // Get standalone customers from customers table
                const standaloneCustomers = await dataService.getStandaloneCustomers();
                // Get customers from bookings
                const customersFromBookings = bookings && bookings.length > 0
                    ? generateCustomersFromBookings(bookings)
                    : [];
                // Merge customers: prioritize booking customers, then add standalone
                const customerMap = new Map<string, Customer>();
                customersFromBookings.forEach(customer => {
                    customerMap.set(customer.email, customer);
                });
                standaloneCustomers.forEach(standaloneCustomer => {
                    if (!customerMap.has(standaloneCustomer.email)) {
                        customerMap.set(standaloneCustomer.email, standaloneCustomer);
                    }
                });
                const allCustomers = Array.from(customerMap.values());
                setCustomers(allCustomers);

                // Select the newly created customer
                const createdCustomer = allCustomers.find(c => c.email === newCustomer.email);
                if (createdCustomer) {
                    setSelectedCustomer(createdCustomer);
                } else {
                    setSelectedCustomer(newCustomer);
                }
            } catch (loadError) {
                setCustomers(prev => {
                    const filtered = prev.filter(c => c.email !== newCustomer.email);
                    return [...filtered, newCustomer];
                });
                setSelectedCustomer(newCustomer);
            } finally {
                setLoading(false);
            }
            setIsNewCustomerModalOpen(false);
        } catch (error) {
            console.error('Error creating customer:', error);
            setLoading(false);
            setIsNewCustomerModalOpen(false);
        }
    };

    // MAIN RETURN STATEMENT ADDED HERE
    return (
        <div className="crm-dashboard-container">
            {/* Modal for adding new customer */}
            <CustomerModal
                isOpen={isNewCustomerModalOpen}
                onClose={() => setIsNewCustomerModalOpen(false)}
                onSave={handleCreateCustomer}
            />

            {/* Tabs navigation - restaurar iconos pequeños y alineados */}
            <div className="flex gap-2 mb-6 items-center">
                <button
                    className={`flex items-center px-3 py-1.5 rounded-md font-semibold transition-colors text-base ${
                        activeTab === 'all' ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20 text-brand-text'
                    }`}
                    onClick={() => setActiveTab('all')}
                >
                    <UserGroupIcon className="w-5 h-5 mr-2 text-brand-secondary" />
                    Clientes
                </button>
                <button
                    className={`flex items-center px-3 py-1.5 rounded-md font-semibold transition-colors text-base ${
                        activeTab === 'openStudio' ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20 text-brand-text'
                    }`}
                    onClick={() => setActiveTab('openStudio')}
                >
                    <UserIcon className="w-5 h-5 mr-2 text-brand-secondary" />
                    Open Studio
                </button>
                <button
                    className={`flex items-center px-3 py-1.5 rounded-md font-semibold transition-colors text-base ${
                        activeTab === 'entregas' ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20 text-brand-text'
                    }`}
                    onClick={() => setActiveTab('entregas')}
                >
                    📦 Entregas
                </button>
                <button
                    className="ml-auto flex items-center px-4 py-2 bg-brand-secondary text-white rounded-md font-semibold hover:bg-brand-primary transition-colors text-base"
                    onClick={() => setIsNewCustomerModalOpen(true)}
                >
                    <UserIcon className="w-5 h-5 mr-2 text-white" />
                    Agregar Cliente
                </button>
            </div>

            {/* Main content */}
            {selectedCustomer ? (
                <CustomerDetailView
                    customer={selectedCustomer}
                    onBack={handleBackToList}
                    invoiceRequests={invoiceRequests}
                    onDataChange={onDataChange}
                    setNavigateTo={setNavigateTo}
                />
            ) : (
                <>
                    {activeTab === 'all' && (
                        <div className="animate-fade-in">
                            <DeliveryMetrics customers={customers} />
                            <div className="md:flex justify-between items-center mb-4 gap-4">
                                <input 
                                    type="text"
                                    placeholder="Buscar cliente por nombre, apellido, correo o código de reserva"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-primary focus:border-brand-primary"
                                />
                                <div className="flex flex-col gap-2 mt-4 md:mt-0">
                                    <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-brand-secondary mr-2">Clases:</span>
                                        <FilterButton filter="all" active={filterByClassesRemaining === 'all'} onClick={() => setFilterByClassesRemaining('all')}>Todos</FilterButton>
                                        <FilterButton filter="2-left" active={filterByClassesRemaining === '2-left'} onClick={() => setFilterByClassesRemaining('2-left')}>2 clases restantes</FilterButton>
                                        <FilterButton filter="1-left" active={filterByClassesRemaining === '1-left'} onClick={() => setFilterByClassesRemaining('1-left')}>1 clase restante</FilterButton>
                                        <FilterButton filter="completed" active={filterByClassesRemaining === 'completed'} onClick={() => setFilterByClassesRemaining('completed')}>Completados</FilterButton>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-brand-secondary mr-2">Entregas:</span>
                                        <button
                                            onClick={() => setDeliveryFilter('all')}
                                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${deliveryFilter === 'all' ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20'}`}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            onClick={() => setDeliveryFilter('with-pending')}
                                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${deliveryFilter === 'with-pending' ? 'bg-yellow-500 text-white' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'}`}
                                        >
                                            Con pendientes
                                        </button>
                                        <button
                                            onClick={() => setDeliveryFilter('with-ready')}
                                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${deliveryFilter === 'with-ready' ? 'bg-blue-500 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'}`}
                                        >
                                            Listos para recoger
                                        </button>
                                        <button
                                            onClick={() => setDeliveryFilter('with-overdue')}
                                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${deliveryFilter === 'with-overdue' ? 'bg-red-500 text-white' : 'bg-red-100 hover:bg-red-200 text-red-800'}`}
                                        >
                                            Con vencidas
                                        </button>
                                        <button
                                            onClick={() => setDeliveryFilter('with-completed')}
                                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${deliveryFilter === 'with-completed' ? 'bg-green-500 text-white' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
                                        >
                                            Con completadas
                                        </button>
                                        <button
                                            onClick={() => setDeliveryFilter('none')}
                                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${deliveryFilter === 'none' ? 'bg-gray-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                                        >
                                            Sin entregas
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <CustomerList customers={augmentedAndFilteredCustomers} onSelectCustomer={handleSelectCustomer} />
                        </div>
                    )}
                    
                    {activeTab === 'openStudio' && (
                        <div className="animate-fade-in">
                            {/* --- Open Studio Summary & Controls --- */}
                            {(() => {
                                // Calculate summary metrics for open studio subscriptions
                                const openStudioBookings = bookings.filter(b => b.productType === 'OPEN_STUDIO_SUBSCRIPTION');
                                const now = new Date();
                                const active = openStudioBookings.filter(b => {
                                    const paymentDetail = b.paymentDetails?.[0]; // Access the first payment detail
                                    if (!paymentDetail?.receivedAt || !b.product?.details) return false;

                                    const start = new Date(paymentDetail.receivedAt);
                                    const duration = 'durationDays' in b.product.details ? b.product.details.durationDays : 0;
                                    const expiry = new Date(start);
                                    expiry.setDate(expiry.getDate() + duration);
                                    return now <= expiry;
                                });
                                const expiringSoon = active.filter(b => {
                                    const paymentDetail = b.paymentDetails?.[0];
                                    const start = new Date(paymentDetail?.receivedAt || 0);
                                    const duration = 'durationDays' in b.product.details ? b.product.details.durationDays : 0;
                                    const expiry = new Date(start);
                                    expiry.setDate(expiry.getDate() + duration);
                                    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                    return daysLeft <= 7 && daysLeft > 0;
                                });
                                const unpaid = openStudioBookings.filter(b => !b.isPaid);

                                // --- Filtered and Sorted Bookings ---
                                let filteredBookings = openStudioBookings;
                                if (studioFilter === 'active') filteredBookings = active;
                                if (studioFilter === 'expiring') filteredBookings = expiringSoon;
                                if (studioFilter === 'unpaid') filteredBookings = unpaid;

                                filteredBookings = [...filteredBookings];
                                if (studioSort === 'expiry') {
                                    filteredBookings.sort((a, b) => {
                                        const aPaymentDetail = a.paymentDetails?.[0];
                                        const bPaymentDetail = b.paymentDetails?.[0];

                                        const aStart = aPaymentDetail?.receivedAt ? new Date(aPaymentDetail.receivedAt) : new Date(0);
                                        const aDuration = 'durationDays' in a.product.details ? a.product.details.durationDays : 0;
                                        const aExpiry = new Date(aStart);
                                        aExpiry.setDate(aExpiry.getDate() + aDuration);

                                        const bStart = bPaymentDetail?.receivedAt ? new Date(bPaymentDetail.receivedAt) : new Date(0);
                                        const bDuration = 'durationDays' in b.product.details ? b.product.details.durationDays : 0;
                                        const bExpiry = new Date(bStart);
                                        bExpiry.setDate(bExpiry.getDate() + bDuration);

                                        return aExpiry.getTime() - bExpiry.getTime();
                                    });
                                } else if (studioSort === 'name') {
                                    filteredBookings.sort((a, b) => {
                                        const aName = a.customer?.userInfo?.firstName || '';
                                        const bName = b.customer?.userInfo?.firstName || '';
                                        return aName.localeCompare(bName);
                                    });
                                }

                                // --- Controls UI ---
                                return (
                                    <>
                                        <div className="flex flex-wrap gap-4 mb-6">
                                            <div className="bg-brand-background p-4 rounded-lg">
                                                <div className="text-xs font-semibold text-brand-secondary">Suscripciones activas</div>
                                                <div className="text-2xl font-bold text-brand-text">{active.length}</div>
                                            </div>
                                            <div className="bg-brand-background p-4 rounded-lg">
                                                <div className="text-xs font-semibold text-brand-secondary">Por vencer (&le;7 días)</div>
                                                <div className="text-2xl font-bold text-brand-text">{expiringSoon.length}</div>
                                            </div>
                                            <div className="bg-brand-background p-4 rounded-lg">
                                                <div className="text-xs font-semibold text-brand-secondary">Pendientes de pago</div>
                                                <div className="text-2xl font-bold text-brand-text">{unpaid.length}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 mb-4 flex-wrap items-center">
                                            <span className="text-sm font-bold text-brand-secondary">Filtrar:</span>
                                            <button className={`px-3 py-1.5 text-sm rounded-md ${studioFilter === 'all' ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20'}`} onClick={() => setStudioFilter('all')}>Todos</button>
                                            <button className={`px-3 py-1.5 text-sm rounded-md ${studioFilter === 'active' ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20'}`} onClick={() => setStudioFilter('active')}>Activos</button>
                                            <button className={`px-3 py-1.5 text-sm rounded-md ${studioFilter === 'expiring' ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20'}`} onClick={() => setStudioFilter('expiring')}>Por vencer</button>
                                            <button className={`px-3 py-1.5 text-sm rounded-md ${studioFilter === 'unpaid' ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20'}`} onClick={() => setStudioFilter('unpaid')}>Pendientes de pago</button>
                                            <span className="ml-6 text-sm font-bold text-brand-secondary">Ordenar por:</span>
                                            <button className={`px-3 py-1.5 text-sm rounded-md ${studioSort === 'expiry' ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20'}`} onClick={() => setStudioSort('expiry')}>Vencimiento</button>
                                            <button className={`px-3 py-1.5 text-sm rounded-md ${studioSort === 'name' ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20'}`} onClick={() => setStudioSort('name')}>Nombre</button>
                                        </div>
                                        {/* --- Open Studio List --- */}
                                        <OpenStudioView bookings={filteredBookings} onNavigateToCustomer={handleNavigateToCustomer} />
                                    </>
                                );
                            })()}
                        </div>
                    )}
                    
                    {activeTab === 'entregas' && (
                        <div className="animate-fade-in">
                            <DeliveriesTab customers={customers} onDataChange={onDataChange} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CrmDashboard;
