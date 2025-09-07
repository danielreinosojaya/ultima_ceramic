import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { BellIcon } from '../icons/BellIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import type { Notification } from '../../types';

export const NotificationToast: React.FC = () => {
    const { activeToast, clearToast } = useNotifications();
    const { t } = useLanguage();

    if (!activeToast) {
        return null;
    }

    return (
        <div 
            className="fixed top-6 right-6 z-50 w-full max-w-sm bg-white rounded-xl shadow-2xl border border-gray-200 p-4 animate-slide-in-right"
            role="alert"
            aria-live="assertive"
        >
            <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center">
                        <BellIcon className="h-6 w-6 text-brand-accent" />
                    </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-bold text-brand-text">
                        {t('admin.notifications.newNotificationTitle')}
                    </p>
                    <p className="mt-1 text-sm text-brand-secondary">
                        {t(`admin.notifications.template_${activeToast.type}`, { name: activeToast.userName, summary: activeToast.summary })}
                    </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button
                        onClick={clearToast}
                        className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                    >
                        <span className="sr-only">Close</span>
                        <XCircleIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
};
