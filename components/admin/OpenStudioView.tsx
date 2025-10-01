import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Booking, OpenStudioSubscription } from '../../types';

// Define a consistent type for the status
export type SubscriptionStatus = 'Active' | 'Expired' | 'Pending Payment';

// Define the shape of an augmented subscription object
export interface AugmentedOpenStudioSubscription extends Booking {
    product: OpenStudioSubscription;
    status: SubscriptionStatus;
    startDate: Date | null;
    expiryDate: Date | null;
}

// Countdown Timer Component: Calculates and displays remaining time
const CountdownTimer: React.FC<{ expiryDate: Date | null }> = ({ expiryDate }) => {

    const calculateTimeLeft = useCallback(() => {
        if (!expiryDate) {
            return null;
        }
        const difference = +new Date(expiryDate) - +new Date();
        
        if (difference > 0) {
            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }, [expiryDate]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        // No need to run timer if it's already expired
        if (!timeLeft || (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0)) {
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [calculateTimeLeft, timeLeft]);

    if (!timeLeft) {
        return <span>-</span>;
    }

    const pad = (num: number) => num.toString().padStart(2, '0');

    return (
        <div className="font-mono text-sm tracking-tighter text-brand-text">
            <span>{pad(timeLeft.days)}d </span>
            <span className="tabular-nums">{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}</span>
        </div>
    );
};

// Main OpenStudioView Component
interface OpenStudioViewProps {
    bookings: Booking[];
    onNavigateToCustomer: (email: string) => void;
}

// Robust timestamp formatting utility
const formatTimestamp = (dateInput: Date | string | null | undefined): string => {
    if (!dateInput) {
        return '---';
    }

    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

    if (isNaN(date.getTime())) {
        return '---';
    }

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const OpenStudioView: React.FC<OpenStudioViewProps> = ({ bookings, onNavigateToCustomer }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000 * 30); // Update "now" every 30s for status check
        return () => clearInterval(timer);
    }, []);

    const augmentedSubscriptions = useMemo((): AugmentedOpenStudioSubscription[] => {
        const openStudioBookings = bookings.filter(
            (b): b is Booking & { product: OpenStudioSubscription } => b.productType === 'OPEN_STUDIO_SUBSCRIPTION'
        );

        return openStudioBookings.map(booking => {
            let status: SubscriptionStatus = 'Pending Payment';
            let startDate: Date | null = null;
            let expiryDate: Date | null = null;

            if (booking.isPaid && booking.paymentDetails?.receivedAt) {
                startDate = new Date(booking.paymentDetails.receivedAt);
                if (!isNaN(startDate.getTime())) {
                    expiryDate = new Date(startDate);
                    expiryDate.setDate(expiryDate.getDate() + booking.product.details.durationDays);
                    status = now < expiryDate ? 'Active' : 'Expired';
                } else {
                    // Handle case where receivedAt might be invalid
                    startDate = null; 
                }
            }

            return { ...booking, status, startDate, expiryDate };
        }).sort((a, b) => (b.startDate?.getTime() || 0) - (a.startDate?.getTime() || 0));
    }, [bookings, now]);
    
    const STATUS_COLORS: Record<SubscriptionStatus, string> = {
        Active: 'bg-green-100 text-green-800',
        Expired: 'bg-gray-100 text-gray-800',
        'Pending Payment': 'bg-yellow-100 text-yellow-800',
    };
    
    return (
        <div className="overflow-x-auto animate-fade-in">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-brand-background">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Start Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Remaining Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Purchase Date</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {augmentedSubscriptions.length > 0 ? augmentedSubscriptions.map((sub) => (
                        <tr key={sub.id} onClick={() => onNavigateToCustomer(sub.userInfo.email)} className="hover:bg-brand-background cursor-pointer">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-bold text-brand-text">{sub.userInfo.firstName} {sub.userInfo.lastName}</div>
                                <div className="text-sm text-brand-secondary">{sub.userInfo.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[sub.status]}`}>
                                    {sub.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                {formatTimestamp(sub.startDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {sub.status === 'Active' ? <CountdownTimer expiryDate={sub.expiryDate} /> : <span className="text-sm text-gray-400">---</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-secondary">
                                {formatTimestamp(sub.createdAt)}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={5} className="text-center py-8 text-brand-secondary">
                                No open studio subscriptions found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};