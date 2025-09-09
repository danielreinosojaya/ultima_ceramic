import React, { useState, useEffect, useMemo } from 'react';
import type { InvoiceRequest, InvoiceRequestStatus, NavigationState } from '../../types';
import * as dataService from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { MailIcon } from '../icons/MailIcon';
import { UserIcon } from '../icons/UserIcon';

type FilterType = 'all' | 'Pending' | 'Processed';

const STATUS_COLORS: Record<InvoiceRequestStatus, string> = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Processed: 'bg-green-100 text-green-800',
};

interface InvoiceManagerProps {
    navigateToId?: string;
    invoiceRequests: InvoiceRequest[];
    onDataChange: () => void;
    setNavigateTo: React.Dispatch<React.SetStateAction<NavigationState | null>>;
}

export const InvoiceManager: React.FC<InvoiceManagerProps> = ({ navigateToId, invoiceRequests = [], onDataChange, setNavigateTo }) => {
    const { t, language } = useLanguage();
    const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('all');

    useEffect(() => {
        if (navigateToId) {
            setHighlightedRequestId(navigateToId);
            const row = document.getElementById(`invoice-request-${navigateToId}`);
            row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => setHighlightedRequestId(null), 2500); // Highlight for 2.5 seconds
        }
    }, [navigateToId]);

    const handleMarkAsProcessed = async (id: string) => {
        await dataService.markInvoiceAsProcessed(id);
        onDataChange();
    };
    
    const formatDate = (dateInput: string | Date | null | undefined): string => {
        if (!dateInput) return '---';
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '---';
        return date.toLocaleString(language, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const filteredRequests = useMemo(() => {
        if (filter === 'all') return invoiceRequests;
        return invoiceRequests.filter(req => req.status === filter);
    }, [filter, invoiceRequests]);

    const FilterButton: React.FC<{ filterType: FilterType; children: React.ReactNode; }> = ({ filterType, children }) => (
        <button
            onClick={() => setFilter(filterType)}
            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${filter === filterType ? 'bg-brand-primary text-white' : 'bg-brand-background hover:bg-brand-primary/20'}`}
        >
            {children}
        </button>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-serif text-brand-text mb-2 flex items-center gap-3">
                        <DocumentTextIcon className="w-6 h-6 text-brand-accent" />
                        {t('admin.invoiceManager.title')}
                    </h2>
                    <p className="text-brand-secondary">{t('admin.invoiceManager.subtitle')}</p>
                </div>
            </div>

            <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center gap-2 flex-wrap mb-4">
                <FilterButton filterType="all">{t('admin.invoiceManager.filterAll')}</FilterButton>
                <FilterButton filterType="Pending">{t('admin.invoiceManager.filterPending')}</FilterButton>
                <FilterButton filterType="Processed">{t('admin.invoiceManager.filterProcessed')}</FilterButton>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-brand-background">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.invoiceManager.requestedAt')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.invoiceManager.customer')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.invoiceManager.company')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.invoiceManager.status')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.invoiceManager.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                            <tr key={req.id} id={`invoice-request-${req.id}`} className={`transition-colors duration-500 ${highlightedRequestId === req.id ? 'bg-yellow-100' : ''}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                    {formatDate(req.requestedAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-brand-text">{req.userInfo?.firstName} {req.userInfo?.lastName}</div>
                                            <div className="text-sm text-brand-secondary font-mono">CODE: {req.bookingCode}</div>
                                        </div>
                                        <button
                                            onClick={() => req.userInfo?.email && setNavigateTo({ tab: 'customers', targetId: req.userInfo.email })}
                                            className="ml-auto p-2 rounded-full text-brand-secondary hover:bg-gray-100 hover:text-brand-accent transition-colors"
                                            title={t('admin.invoiceManager.goToCustomer')}
                                        >
                                            <UserIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-semibold text-brand-text">{req.companyName}</div>
                                    <div className="text-sm text-brand-secondary">RUC/ID: {req.taxId}</div>
                                    <div className="text-sm text-brand-secondary">{req.address}</div>
                                    {req.email && (
                                        <div className="flex items-center gap-2 mt-1 text-sm text-brand-accent">
                                            <MailIcon className="w-4 h-4" />
                                            <a href={`mailto:${req.email}`} className="hover:underline">{req.email}</a>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full inline-block text-center ${STATUS_COLORS[req.status]}`}>
                                            {t(`admin.invoiceManager.status${req.status}`)}
                                        </span>
                                        {req.processedAt && (
                                            <span className="text-xs text-gray-500 mt-1">{formatDate(req.processedAt)}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {req.status === 'Pending' && (
                                        <button
                                            onClick={() => handleMarkAsProcessed(req.id)}
                                            className="flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-bold py-1 px-2.5 rounded-md hover:bg-green-200 transition-colors"
                                        >
                                            <CheckCircleIcon className="w-4 h-4"/>
                                            {t('admin.invoiceManager.markAsProcessed')}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-brand-secondary">
                                    {t('admin.invoiceManager.noRequests')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};