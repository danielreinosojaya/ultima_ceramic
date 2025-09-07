

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import type { Notification } from '../types';
import * as dataService from '../services/dataService';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    activeToast: Notification | null;
    markAllAsRead: () => void;
    clearToast: () => void;
    dataVersion: number;
    forceRefresh: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const safeGetTime = (timestamp: string | null) => {
    if (!timestamp) return 0; // Treat null/undefined as very old
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 0 : date.getTime();
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeToast, setActiveToast] = useState<Notification | null>(null);
    const [dataVersion, setDataVersion] = useState(0);

    const forceRefresh = useCallback(() => setDataVersion(v => v + 1), []);

    const loadNotifications = useCallback(async () => {
        const storedNotifications = await dataService.getNotifications();
        setNotifications(storedNotifications.sort((a, b) => safeGetTime(b.timestamp) - safeGetTime(a.timestamp)));
    }, []);

    // Poll for new data every 30 seconds and on window focus
    useEffect(() => {
        const intervalId = setInterval(() => {
            forceRefresh();
        }, 30000);

        const handleFocus = () => {
            forceRefresh();
        };
        
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
        };
    }, [forceRefresh]);

    // Refetch notifications when dataVersion changes
    useEffect(() => {
        loadNotifications();
    }, [dataVersion, loadNotifications]);
    
    // Logic to show toast for new notifications
    useEffect(() => {
        const newUnread = notifications.filter(n => !n.read).length;
        if (newUnread > unreadCount && notifications.length > 0) {
            const latestUnread = notifications.find(n => !n.read && n.id !== activeToast?.id);
            if (latestUnread) {
                setActiveToast(latestUnread);
            }
        }
        setUnreadCount(newUnread);
    }, [notifications, unreadCount, activeToast]);
    
    // Logic to hide toast after a delay
    useEffect(() => {
        if (activeToast) {
            const timer = setTimeout(() => {
                setActiveToast(null);
            }, 7000); // Toast disappears after 7 seconds
            return () => clearTimeout(timer);
        }
    }, [activeToast]);

    const markAllAsRead = async () => {
        const updatedNotifications = await dataService.markAllNotificationsAsRead();
        setNotifications(updatedNotifications.sort((a, b) => safeGetTime(b.timestamp) - safeGetTime(a.timestamp)));
        setUnreadCount(0);
    };
    
    const clearToast = () => {
        setActiveToast(null);
    }

    const value = {
        notifications,
        unreadCount,
        activeToast,
        markAllAsRead,
        clearToast,
        dataVersion,
        forceRefresh,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};