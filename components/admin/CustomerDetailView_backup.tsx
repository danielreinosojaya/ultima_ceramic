import React, { useState, useEffect } from 'react';
import type { 
    Booking,
    InvoiceRequest,
    ClassPackage,
    Delivery,
    PaymentDetails
} from '../../types';
import { ActivePackagesDisplay } from './ActivePackagesDisplay';
import { AcceptPaymentModal } from './AcceptPaymentModal';
import { InvoiceReminderModal } from './InvoiceReminderModal';
import { NewDeliveryModal } from './NewDeliveryModal';
import { CustomerAttendanceHistory } from './CustomerAttendanceHistory';
import { 
    MapIcon, 
    PhoneIcon,
    CurrencyDollarIcon,
    TrashIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import * as dataService from '../../services/dataService';

interface UserInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode: string;
    birthday: string | null;
}

interface Props {
    customer: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        bookings: Booking[];
        userInfo?: Partial<UserInfo>;
        packages?: ClassPackage[];
    } | null;
    onBack: () => void;
    onDataChange: () => void;
    invoiceRequests: InvoiceRequest[];
    setNavigateTo: (path: string) => void;
}

interface ComponentState {
    activeTab: string;
    bookingToPay: Booking | null;
    bookingForReminder: Booking | null;
    isInvoiceReminderOpen: boolean;
    currentPage: number;
    deliveriesPerPage: number;
    deliveries: Delivery[];
    searchTerm: string;
    deliveryToDelete: Delivery | null;
    isNewDeliveryModalOpen: boolean;
    isViewingAttendance: boolean;
    editMode: boolean;
    editInfo: UserInfo;
}

const formatDate = (dateInput: Date | string | undefined | null, options?: Intl.DateTimeFormatOptions): string => {
    if (!dateInput) return 'N/A';
    try {
        return new Date(dateInput).toLocaleDateString(undefined, options);
    } catch {
        return 'N/A';
    }
};

const getInitialState = (customer: Props['customer']): ComponentState => {
    const safeCustomer = customer || { userInfo: {}, email: '', name: '', id: '', bookings: [] };
    return {
        activeTab: 'history',
        bookingToPay: null,
        bookingForReminder: null,
        isInvoiceReminderOpen: false,
        currentPage: 1,
        deliveriesPerPage: 5,
        deliveries: [],
        searchTerm: '',
        deliveryToDelete: null,
        isNewDeliveryModalOpen: false,
        isViewingAttendance: false,
        editMode: false,
        editInfo: {
            firstName: safeCustomer.userInfo?.firstName || '',
            lastName: safeCustomer.userInfo?.lastName || '',
            email: safeCustomer.userInfo?.email || safeCustomer.email || '',
            phone: safeCustomer.userInfo?.phone || safeCustomer.phone || '',
            countryCode: safeCustomer.userInfo?.countryCode || '',
            birthday: safeCustomer.userInfo?.birthday || null
        }
    };
};

export const CustomerDetailView: React.FC<Props> = ({
    customer,
    onBack,
    onDataChange,
    invoiceRequests,
    setNavigateTo
}) => {
    const [state, setState] = useState<ComponentState>(() => getInitialState(customer));

    if (!customer) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg text-gray-600">Loading customer data...</div>
            </div>
        );
    }

    const handleTabChange = (tab: string) => {
        setState(prev => ({ ...prev, activeTab: tab }));
    };

    const handlePaymentClick = (booking: Booking) => {
        setState(prev => ({ ...prev, bookingToPay: booking }));
    };

    const handlePaymentClose = () => {
        setState(prev => ({ ...prev, bookingToPay: null }));
    };

    const handleReminderClick = (booking: Booking) => {
        setState(prev => ({ ...prev, bookingForReminder: booking }));
    };

    const handleReminderClose = () => {
        setState(prev => ({ ...prev, bookingForReminder: null }));
    };

    const handleCreateDelivery = async (deliveryData: Omit<Delivery, 'id' | 'createdAt'>) => {
        if (!customer?.email) {
            console.error('Customer information is missing');
            return;
        }
        try {
            const newDelivery = await dataService.createDelivery({
                ...deliveryData,
                customerEmail: customer.userInfo?.email || customer.email
            });
            
            if (newDelivery) {
                setState(prev => ({
                    ...prev,
                    deliveries: [...(prev.deliveries || []), newDelivery],
                    isNewDeliveryModalOpen: false
                }));
                onDataChange();
            }
        } catch (error) {
            console.error('Error creating delivery:', error);
        }
    };

    const handleDeleteDelivery = async (deliveryId: string) => {
        try {
            const result = await dataService.deleteDelivery(deliveryId);
            if (result?.success) {
                setState(prev => ({
                    ...prev,
                    deliveries: (prev.deliveries || []).filter(d => d?.id !== deliveryId),
                    deliveryToDelete: null
                }));
                onDataChange();
            }
        } catch (error) {
            console.error('Error deleting delivery:', error);
        }
    };

    const handleEditModeToggle = () => {
        setState(prev => ({ ...prev, editMode: !prev.editMode }));
    };

    const handleEditInfoChange = (field: keyof UserInfo, value: string) => {
        setState(prev => ({
            ...prev,
            editInfo: {
                ...prev.editInfo,
                [field]: value
            }
        }));
    };

    const handleSaveUserInfo = async () => {
        if (!customer?.id) return;
        try {
            await dataService.updateCustomerInfo(customer.id, state.editInfo);
            setState(prev => ({ ...prev, editMode: false }));
            onDataChange();
        } catch (error) {
            console.error('Error updating customer info:', error);
        }
    };

    useEffect(() => {
        if (!customer?.email) {
            setState(prev => ({ ...prev, deliveries: [] }));
            return;
        }

        const loadDeliveries = async () => {
            try {
                const deliveries = await dataService.getDeliveriesByCustomer(customer.email);
                setState(prev => ({ ...prev, deliveries: Array.isArray(deliveries) ? deliveries : [] }));
            } catch (error) {
                console.error('Error loading deliveries:', error);
                setState(prev => ({ ...prev, deliveries: [] }));
            }
        };

        loadDeliveries();
    }, [customer?.email]);

    const renderContent = () => {
        switch (state.activeTab) {
            case 'history':
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Booking History</h3>
                            <button
                                onClick={() => setState(prev => ({ ...prev, isViewingAttendance: !prev.isViewingAttendance }))}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                {state.isViewingAttendance ? 'View Bookings' : 'View Attendance'}
                            </button>
                        </div>
                        {state.isViewingAttendance ? (
                            <CustomerAttendanceHistory customerId={customer.id} />
                        ) : (
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {(customer.bookings || []).map((booking) => (
                                        <li key={booking.id} className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-indigo-600 truncate">
                                                        {booking.type} - {formatDate(booking.date)}
                                                    </p>
                                                    <p className="mt-2 flex items-center text-sm text-gray-500">
                                                        <CalendarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                                        {booking.status}
                                                    </p>
                                                </div>
                                                <div className="ml-4 flex-shrink-0 space-x-2">
                                                    {booking.status !== 'paid' && (
                                                        <>
                                                            <button
                                                                onClick={() => handlePaymentClick(booking)}
                                                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                                                            >
                                                                <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                                                                Payment
                                                            </button>
                                                            <button
                                                                onClick={() => handleReminderClick(booking)}
                                                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                                                            >
                                                                <MapIcon className="h-4 w-4 mr-1" />
                                                                Reminder
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            case 'deliveries':
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Deliveries</h3>
                            <button
                                onClick={() => setState(prev => ({ ...prev, isNewDeliveryModalOpen: true }))}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                            >
                                New Delivery
                            </button>
                        </div>
                        <div className="bg-white shadow overflow-hidden sm:rounded-md">
                            <ul className="divide-y divide-gray-200">
                                {(state.deliveries || []).map((delivery) => (
                                    <li key={delivery.id} className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-indigo-600">
                                                    {delivery.type}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {formatDate(delivery.date)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setState(prev => ({ ...prev, deliveryToDelete: delivery }))}
                                                className="inline-flex items-center p-1 border border-transparent rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
            case 'packages':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Active Packages</h3>
                        <ActivePackagesDisplay 
                            customerId={customer.id}
                            packages={customer.packages || []}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-6">
                <div className="bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold">{customer.name}</h2>
                                <div className="space-y-2">
                                    <p className="flex items-center text-gray-600">
                                        <MapIcon className="h-5 w-5 mr-2" />
                                        {customer.email}
                                    </p>
                                    {customer.phone && (
                                        <p className="flex items-center text-gray-600">
                                            <PhoneIcon className="h-5 w-5 mr-2" />
                                            {customer.phone}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onBack}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Back
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {['history', 'deliveries', 'packages'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                className={`
                                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                                    ${state.activeTab === tab
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </nav>
                </div>

                {renderContent()}
            </div>

            {state.bookingToPay && (
                <AcceptPaymentModal
                    booking={state.bookingToPay}
                    onClose={handlePaymentClose}
                    onSuccess={() => {
                        handlePaymentClose();
                        onDataChange();
                    }}
                />
            )}
            
            {state.bookingForReminder && (
                <InvoiceReminderModal
                    booking={state.bookingForReminder}
                    onClose={handleReminderClose}
                    onSuccess={() => {
                        handleReminderClose();
                        onDataChange();
                    }}
                />
            )}

            {state.isNewDeliveryModalOpen && (
                <NewDeliveryModal
                    onClose={() => setState(prev => ({ ...prev, isNewDeliveryModalOpen: false }))}
                    onCreate={handleCreateDelivery}
                    customerId={customer.id}
                />
            )}

            {state.deliveryToDelete && (
                <div className="fixed z-10 inset-0 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
                        <div className="relative bg-white rounded-lg p-8 max-w-lg w-full">
                            <h3 className="text-lg font-medium mb-4">Delete Delivery</h3>
                            <p className="text-gray-500 mb-4">
                                Are you sure you want to delete this delivery? This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-4">
                                <button
                                    onClick={() => setState(prev => ({ ...prev, deliveryToDelete: null }))}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => state.deliveryToDelete && handleDeleteDelivery(state.deliveryToDelete.id)}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
