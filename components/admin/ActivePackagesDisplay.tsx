
import React from 'react';
import type { Booking, ClassPackage, IntroductoryClass, OpenStudioSubscription } from '../../types.js';
// Eliminado useLanguage, la app ahora es monolingüe en español
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
    // Eliminado useLanguage, la app ahora es monolingüe en español
    const styles = {
        'Active': 'bg-green-100 text-green-800',
        'Pending Payment': 'bg-yellow-100 text-yellow-800',
        'Expired': 'bg-red-100 text-red-800',
        'Completed': 'bg-blue-100 text-blue-800'
    };
    return (
         <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>
            {status === 'Active' ? 'Activo' : status === 'Pending Payment' ? 'Pago pendiente' : status === 'Expired' ? 'Vencido' : 'Completado'}
        </span>
    );
}

export const ActivePackagesDisplay: React.FC<ActivePackagesDisplayProps> = ({ packages }) => {
    // Eliminado useLanguage, la app ahora es monolingüe en español
    const language = 'es-ES';
    
    const formatFullDateTime = (date: Date | string | null, time?: string) => {
        if (!date) return '---';
        let d = typeof date === 'string' ? new Date(date) : date;
        if (time) {
            // If time is provided, combine date and time
            const [hour, minute] = time.split(':');
            d.setHours(Number(hour), Number(minute), 0, 0);
        }
        return d.toLocaleString(language, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const formatDate = (date: Date | string | null) => {
        if (!date) return '---';
        let d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString(language, {
             month: 'long', day: 'numeric', year: 'numeric'
        });
    }

    return (
        <div>
            <h3 className="text-xl font-bold text-brand-text mb-4">Paquetes activos</h3>
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
                                            <span className="font-semibold text-brand-secondary">Progreso</span>
                                            <span className="font-bold text-brand-text">
                                                {`Completadas: ${pkg.completedCount} / ${pkg.totalCount}`}
                                            </span>
                                        </div>
                                        <ProgressBar percent={pkg.progressPercent} />
                                    </div>
                                )}
                                <div className="text-xs bg-gray-50 p-3 rounded-md grid grid-cols-2 gap-3">
                                    <div className="flex items-start gap-2">
                                        <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-gray-500 uppercase tracking-wider">Próxima clase</p>
                                            <p className="font-semibold text-brand-text">{formatFullDateTime(pkg.nextClassDate)}</p>
                                        </div>
                                    </div>
                                     <div className="flex items-start gap-2">
                                        <ClockIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-gray-500 uppercase tracking-wider">Vence el</p>
                                            <p className="font-semibold text-brand-text">{formatDate(pkg.expiryDate)}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Show all class dates/times for this package */}
                                {isPackageOrIntro && pkg.slots && pkg.slots.length > 0 && (
                                  <div className="mt-2">
                                    <div className="font-bold text-xs text-brand-secondary mb-1">Todas las clases</div>
                                    <ul className="text-xs text-brand-text grid grid-cols-2 gap-2">
                                      {pkg.slots.map((slot, idx) => (
                                        <li key={idx} className="flex gap-2 items-center">
                                          <CalendarIcon className="w-3 h-3 text-gray-400" />
                                          <span>{formatFullDateTime(slot.date, slot.time)}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                <div className="text-right text-[10px] text-gray-400 border-t pt-2 mt-auto">
                                  {`Reservado el ${formatDate(pkg.bookingDate)}`}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-8 bg-brand-background rounded-lg">
                    <p className="text-brand-secondary">No hay paquetes activos</p>
                </div>
            )}
        </div>
    );
};