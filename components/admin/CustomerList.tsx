import React from 'react';
import type { AugmentedCustomer, RemainingClassesInfo } from './CrmDashboard';
import type { Delivery } from '../../types';
import { GiftIcon } from '../icons/GiftIcon';

interface CustomerListProps {
    customers: AugmentedCustomer[];
    onSelectCustomer: (customer: AugmentedCustomer) => void;
}

const StatusTag: React.FC<{ info: RemainingClassesInfo }> = ({ info }) => {
    if (info.status === 'completed') {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                Completado
            </span>
        );
    }

    if (info.remaining === 1) {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                1 clase restante
            </span>
        );
    }
    
    if (info.remaining === 2) {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                2 clases restantes
            </span>
        );
    }

    return null;
}

const DeliveryBadges: React.FC<{ deliveries?: Delivery[] }> = ({ deliveries }) => {
    if (!deliveries || deliveries.length === 0) {
        return null;
    }

    const pendingCount = deliveries.filter(d => d.status === 'pending').length;
    const overdueCount = deliveries.filter(d => {
        const today = new Date();
        const scheduledDate = new Date(d.scheduledDate);
        return d.status === 'pending' && scheduledDate < today;
    }).length;
    const completedCount = deliveries.filter(d => d.status === 'completed').length;

    return (
        <div className="flex items-center gap-1 ml-2">
            {overdueCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800">
                    {overdueCount} vencida{overdueCount > 1 ? 's' : ''}
                </span>
            )}
            {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
                    {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                </span>
            )}
            {completedCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-800">
                    {completedCount} entregada{completedCount > 1 ? 's' : ''}
                </span>
            )}
        </div>
    );
};

export const CustomerList: React.FC<CustomerListProps> = ({ customers, onSelectCustomer }) => {
    console.log('CustomerList - Received customers prop:', customers);
    console.log('CustomerList - Customers count:', customers.length);
    console.log('CustomerList - Customers array:', customers);
    
    // Look for Daniel Reinoso specifically
    const danielCustomer = customers.find(c => 
        c.userInfo?.firstName?.toLowerCase()?.includes('daniel') ||
        c.userInfo?.lastName?.toLowerCase()?.includes('reinoso') ||
        c.email?.toLowerCase()?.includes('daniel')
    );
    console.log('CustomerList - Daniel Reinoso found:', danielCustomer);
    
    return (
        <div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-brand-background">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Entregas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Reservas</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider">Total gastado</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {customers.length > 0 ? customers.map((customer, index) => {
                            console.log(`CustomerList - Rendering row ${index} for customer:`, customer);
                            console.log(`CustomerList - Customer ${index} name: ${customer?.userInfo?.firstName} ${customer?.userInfo?.lastName}`);
                            console.log(`CustomerList - Customer ${index} email: ${customer?.userInfo?.email || customer.email}`);
                            
                            return (
                            <tr key={customer.email} onClick={() => onSelectCustomer(customer)} className="hover:bg-brand-background cursor-pointer">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-brand-text">
                                            {customer?.userInfo?.firstName || 'N/A'} {customer?.userInfo?.lastName || ''}
                                        </span>
                                        {customer.isBirthdayUpcoming && (
                                            <span title="Cumpleaños próximo">
                                                <GiftIcon className="w-4 h-4 text-rose-500" />
                                            </span>
                                        )}
                                        <DeliveryBadges deliveries={customer.deliveries} />
                                    </div>
                                    <div className="text-sm text-brand-secondary">{customer?.userInfo?.email || customer.email || 'Sin email'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {customer.remainingClassesInfo && <StatusTag info={customer.remainingClassesInfo} />}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                    {customer.deliveries?.length || 0} entrega{(customer.deliveries?.length || 0) !== 1 ? 's' : ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                    {customer.totalBookings || 0}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text text-right font-semibold">
                                    ${(customer.totalSpent || 0).toFixed(2)}
                                </td>
                            </tr>
                        )} ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-brand-secondary">
                                    No hay clientes registrados
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
