import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext.js';
// ...existing code...
import { BellIcon } from '../icons/BellIcon.js';
import type { Notification } from '../../types.js';
import { formatDistanceToNow } from 'date-fns';



const calculateTimeAgo = (isoDate: string | null): string => {
    if (!isoDate || typeof isoDate !== 'string') {
        return '---';
    }
    const date = new Date(isoDate);
    if (isNaN(date.getTime()) || date.getTime() === 0) {
        return '---';
    }
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Clock skew fix. A small negative number is likely due to client/server clock differences.
    if (seconds < -60) {
        return '---';
    }
    
    // Treat small negative values or 0 as "just now"
    const displaySeconds = Math.max(0, seconds);

    let interval = displaySeconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y`;
    interval = displaySeconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo`;
    interval = displaySeconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d`;
    interval = displaySeconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h`;
    interval = displaySeconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m`;
    return `${Math.floor(displaySeconds)}s`;
};

const TimeAgo: React.FC<{ isoDate: string | null }> = ({ isoDate }) => {
    const [timeAgo, setTimeAgo] = useState(() => calculateTimeAgo(isoDate));

    useEffect(() => {
        setTimeAgo(calculateTimeAgo(isoDate)); // Recalculate when isoDate changes

        const timer = setInterval(() => {
            setTimeAgo(calculateTimeAgo(isoDate));
        }, 60000); // Update every minute
        
        return () => clearInterval(timer);
    }, [isoDate]);

    return <span className="text-xs text-brand-secondary">{timeAgo}</span>;
};

interface NotificationBellProps {
    onNotificationClick: (notification: Notification) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNotificationClick }) => {
    const { notifications, unreadCount, markAllAsRead } = useNotifications();
    // Traducción eliminada, usar texto en español directamente
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleToggle = () => {
        if (!isOpen && unreadCount > 0) {
            markAllAsRead();
        }
        setIsOpen(!isOpen);
    };
    
    const handleItemClick = (notification: Notification) => {
        onNotificationClick(notification);
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={handleToggle} 
                className="relative p-2 rounded-full hover:bg-brand-background text-brand-secondary hover:text-brand-accent transition-colors"
                aria-label="Notificaciones"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-brand-surface flex items-center justify-center text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-80 max-w-xs sm:max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 z-30 animate-fade-in-fast"
                    role="menu"
                    aria-label="Lista de notificaciones"
                    tabIndex={-1}
                >
                    <div className="p-3 border-b border-gray-200">
                        <h3 className="font-bold text-brand-text">Notificaciones</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map(notif => (
                                <button
                                  key={notif.id}
                                  onClick={() => handleItemClick(notif)}
                                  role="menuitem"
                                  tabIndex={0}
                                  className={`w-full text-left p-3 border-b border-gray-100 transition-colors ${!notif.read ? 'bg-brand-background' : 'hover:bg-gray-50'}`}
                                  aria-label={notif.summary || 'Notificación'}
                                >
                                <div className="text-xs text-gray-500">
                                    {notif.timestamp ? formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true }) : 'Hora desconocida'}
                                </div>
                                    <p className="text-xs text-brand-secondary mt-1">
                                        {notif.summary || 'Notificación'}
                                    </p>
                                </button>
                            ))
                        ) : (
                            <p className="text-center text-brand-secondary text-sm p-6">No hay notificaciones.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};