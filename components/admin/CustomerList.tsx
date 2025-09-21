import React from 'react';
import type { AugmentedCustomer, RemainingClassesInfo } from './CrmDashboard';
import { useLanguage } from '../../context/LanguageContext';
import { GiftIcon } from '../icons/GiftIcon';

interface CustomerListProps {
    customers: AugmentedCustomer[];
    onSelectCustomer: (customer: AugmentedCustomer) => void;
}

const StatusTag: React.FC<{ info: RemainingClassesInfo }> = ({ info }) => {
    const { t } = useLanguage();

    if (info.status === 'completed') {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                {t('admin.crm.filters.completed')}
            </span>
        );
    }

    if (info.remaining === 1) {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                {t('admin.crm.filters.1left')}
            </span>
        );
    }
    
    if (info.remaining === 2) {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                {t('admin.crm.filters.2left')}
            </span>
        );
    }

    return null;
}


export const CustomerList: React.FC<CustomerListProps> = ({ customers, onSelectCustomer }) => {
    const { t } = useLanguage();

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-brand-background">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.crm.customer')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.crm.status')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.crm.totalBookings')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.crm.totalSpent')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {customers.length > 0 ? customers.map((customer) => (
                            <tr key={customer.email} onClick={() => onSelectCustomer(customer)} className="hover:bg-brand-background cursor-pointer">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-brand-text">{customer.userInfo.firstName} {customer.userInfo.lastName}</span>
                                        {customer.isBirthdayUpcoming && (
                                            <span title={t('admin.crm.upcomingBirthday')}>
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
                                    {t('admin.crm.noCustomers')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
