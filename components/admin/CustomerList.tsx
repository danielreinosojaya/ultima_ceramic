import React from 'react';
import type { AugmentedCustomer, RemainingClassesInfo } from './CrmDashboard';
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


export const CustomerList: React.FC<CustomerListProps> = ({ customers, onSelectCustomer }) => {
    return (
        <div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-brand-background">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Reservas</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider">Total gastado</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {customers.length > 0 ? customers.map((customer) => (
                            <tr key={customer.email} onClick={() => onSelectCustomer(customer)} className="hover:bg-brand-background cursor-pointer">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-brand-text">{customer.userInfo.firstName} {customer.userInfo.lastName}</span>
                                        {customer.isBirthdayUpcoming && (
                                            <span title="Cumpleaños próximo">
                                                <GiftIcon className="w-4 h-4 text-rose-500" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-brand-secondary">{customer.userInfo.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {customer.remainingClassesInfo && <StatusTag info={customer.remainingClassesInfo} />}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                    {customer.totalBookings}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text text-right font-semibold">
                                    ${customer.totalSpent.toFixed(2)}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center py-8 text-brand-secondary">
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
