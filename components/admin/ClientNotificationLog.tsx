import React, { useState, useEffect, useMemo } from 'react';
import type { ClientNotification, ClientNotificationType } from '../../types';
import * as dataService from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';

const NOTIFICATION_TYPE_OPTIONS: ClientNotificationType[] = ['PRE_BOOKING_CONFIRMATION', 'PAYMENT_RECEIPT', 'CLASS_REMINDER'];
const ITEMS_PER_PAGE = 15;

export const ClientNotificationLog: React.FC = () => {
    const { t, language } = useLanguage();
    const [notifications, setNotifications] = useState<ClientNotification[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<ClientNotificationType | 'all'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const loadNotifications = async () => {
            setIsLoading(true);
            // This now triggers the backend to generate and send reminders
            await dataService.triggerScheduledNotifications();
            const fetchedNotifications = await dataService.getClientNotifications();
            setNotifications(fetchedNotifications);
            setIsLoading(false);
        };
        loadNotifications();
    }, []);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType]);

    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            const searchTermLower = searchTerm.toLowerCase();
            const matchesSearch = n.clientName.toLowerCase().includes(searchTermLower) || n.clientEmail.toLowerCase().includes(searchTermLower);
            const matchesType = filterType === 'all' || n.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [notifications, searchTerm, filterType]);

    const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
    const paginatedNotifications = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredNotifications.slice(startIndex, endIndex);
    }, [filteredNotifications, currentPage]);

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-serif text-brand-text mb-2 flex items-center gap-3">
                        <PaperAirplaneIcon className="w-6 h-6 text-brand-accent" />
                        {t('admin.clientNotificationLog.title')}
                    </h2>
                    <p className="text-brand-secondary">{t('admin.clientNotificationLog.subtitle')}</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex items-center gap-4 flex-wrap">
                <input
                    type="text"
                    placeholder={t('admin.clientNotificationLog.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-primary focus:border-brand-primary"
                />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-brand-primary focus:border-brand-primary"
                >
                    <option value="all">{t('admin.clientNotificationLog.allTypes')}</option>
                    {NOTIFICATION_TYPE_OPTIONS.map(type => (
                        <option key={type} value={type}>
                            {t(`admin.clientNotificationLog.type_${type}`)}
                        </option>
                    ))}
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-brand-background">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.clientNotificationLog.date')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.clientNotificationLog.client')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.clientNotificationLog.type')}</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.clientNotificationLog.status')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                             <tr>
                                <td colSpan={4} className="text-center py-10 text-brand-secondary">
                                    {t('app.loading')}...
                                </td>
                            </tr>
                        ) : paginatedNotifications.length > 0 ? paginatedNotifications.map((n) => (
                            <tr key={n.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                    {new Date(n.createdAt).toLocaleString(language, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-bold text-brand-text">{n.clientName}</div>
                                    <div className="text-sm text-brand-secondary">{n.clientEmail}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                    {t(`admin.clientNotificationLog.type_${n.type}`)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${n.status === 'Sent' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {t(`admin.clientNotificationLog.status_${n.status}`)}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center py-10 text-brand-secondary">
                                    {t('admin.clientNotificationLog.noNotifications')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
             {totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center text-sm">
                    <button onClick={handlePrevPage} disabled={currentPage === 1} className="font-semibold text-brand-primary disabled:text-gray-400 disabled:cursor-not-allowed">
                        &larr; {t('admin.crm.previous')}
                    </button>
                    <span className="text-brand-secondary font-semibold">
                        {t('admin.crm.page')} {currentPage} {t('admin.crm.of')} {totalPages}
                    </span>
                    <button onClick={handleNextPage} disabled={currentPage >= totalPages} className="font-semibold text-brand-primary disabled:text-gray-400 disabled:cursor-not-allowed">
                        {t('admin.crm.next')} &rarr;
                    </button>
                </div>
            )}
        </div>
    );
};