import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
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
     // Si no hay timestamp, devuelve null para que la ordenación lo ignore
    if (!timestamp || typeof timestamp !== 'string') return null;
    const date = new Date(timestamp);
    // Si la fecha es inválida, devuelve null
    return isNaN(date.getTime()) ? null : date.getTime();
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeToast, setActiveToast] = useState<Notification | null>(null);
    const [dataVersion, setDataVersion] = useState(0);
    
    // Throttling para forceRefresh
    const lastRefreshTime = useRef<number>(0);
    const REFRESH_THROTTLE = 2000; // 2 segundos

    const forceRefresh = useCallback(() => {
        const now = Date.now();
        if (now - lastRefreshTime.current < REFRESH_THROTTLE) {
            console.log('Refresh throttled, skipping...');
            return;
        }
        lastRefreshTime.current = now;
        setDataVersion(v => v + 1);
    }, []);

    const loadNotifications = useCallback(async () => {
        const storedNotifications = await dataService.getNotifications();
        setNotifications(storedNotifications.sort((a, b) => safeGetTime(b.timestamp) - safeGetTime(a.timestamp)));
    }, []);

    // Refetch notifications when dataVersion changes (e.g., manual sync)
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
