
import React from 'react';
import type { Booking, ClassPackage, IntroductoryClass, OpenStudioSubscription } from '../../types.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { CalendarIcon } from '../icons/CalendarIcon.js';
import { ClockIcon } from '../icons/ClockIcon.js';

export interface AugmentedPackage extends Booking {
    status: 'Active' | 'Expired' | 'Pending Payment' | 'Completed';
    progressPercent: number;
    completedCount: number;
    totalCount: number;
    expiryDate: Date | null;
    nextClassDate: Date | null;
}

interface ActivePackagesDisplayProps {
  packages: AugmentedPackage[];
}

const ProgressBar: React.FC<{ percent: number }> = ({ percent }) => (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
            className="bg-brand-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        ></div>
    </div>
);

const StatusTag: React.FC<{ status: AugmentedPackage['status'] }> = ({ status }) => {
    const { t } = useLanguage();
    const styles = {
        'Active': 'bg-green-100 text-green-800',
        'Pending Payment': 'bg-yellow-100 text-yellow-800',
        'Expired': 'bg-red-100 text-red-800',
        'Completed': 'bg-blue-100 text-blue-800'
    };
    const key = status.replace(/\s/g, '');
    return (
         <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>
            {t(`admin.customerDetail.status${key}`)}
        </span>
    );
}

export const ActivePackagesDisplay: React.FC<ActivePackagesDisplayProps> = ({ packages }) => {
    const { t, language } = useLanguage();
    
    const formatFullDateTime = (date: Date | null) => {
        if (!date) return '---';
        return date.toLocaleString(language, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
    };

    const formatDate = (date: Date | null) => {
        if (!date) return '---';
        return date.toLocaleDateString(language, {
             month: 'long', day: 'numeric', year: 'numeric'
        });
    }

    return (
        <div>
            <h3 className="text-xl font-bold text-brand-text mb-4">{t('admin.customerDetail.activePackages')}</h3>
            {packages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {packages.map(pkg => {
                        const isPackageOrIntro = pkg.productType === 'CLASS_PACKAGE' || pkg.productType === 'INTRODUCTORY_CLASS';
                        const isSubscription = pkg.productType === 'OPEN_STUDIO_SUBSCRIPTION';
                        return (
                            <div key={pkg.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-brand-text">{pkg.product.name}</h4>
                                        <p className="text-xs text-gray-500 font-mono">{pkg.bookingCode}</p>
                                    </div>
                                    <StatusTag status={pkg.status} />
                                </div>

                                {(isPackageOrIntro && pkg.status !== 'Pending Payment') && (
                                    <div>
                                        <div className="flex justify-between items-baseline text-sm mb-1">
                                            <span className="font-semibold text-brand-secondary">{t('admin.customerDetail.progress')}</span>
                                            <span className="font-bold text-brand-text">
                                                {t('admin.customerDetail.progressText', { completed: pkg.completedCount, total: pkg.totalCount })}
                                            </span>
                                        </div>
                                        <ProgressBar percent={pkg.progressPercent} />
                                    </div>
                                )}
                                
                                <div className="text-xs bg-gray-50 p-3 rounded-md grid grid-cols-2 gap-3">
                                    <div className="flex items-start gap-2">
                                        <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-gray-500 uppercase tracking-wider">{isPackageOrIntro ? t('admin.customerDetail.nextClass') : t('admin.customerDetail.nextClass')}</p>
                                            <p className="font-semibold text-brand-text">{formatFullDateTime(pkg.nextClassDate)}</p>
                                        </div>
                                    </div>
                                     <div className="flex items-start gap-2">
                                        <ClockIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-gray-500 uppercase tracking-wider">{t('admin.customerDetail.expiresOn')}</p>
                                            <p className="font-semibold text-brand-text">{formatDate(pkg.expiryDate)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right text-[10px] text-gray-400 border-t pt-2 mt-auto">
                                    {t('admin.customerDetail.bookedOn')} {new Date(pkg.createdAt).toLocaleDateString(language)}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-8 bg-brand-background rounded-lg">
                    <p className="text-brand-secondary">{t('admin.customerDetail.noActivePackages')}</p>
                </div>
            )}
        </div>
    );
};