
import React, { useMemo } from 'react';
import type { CapacityMessageSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CapacityIndicatorProps {
    count: number;
    max: number;
    capacityMessages: CapacityMessageSettings;
}

export const CapacityIndicator: React.FC<CapacityIndicatorProps> = ({ count, max, capacityMessages }) => {
    const { t } = useLanguage();
    const percentage = max > 0 ? (count / max) * 100 : 0;

    const { colorClass, textColorClass } = useMemo(() => {
        const remaining = max - count;
        
        if (remaining <= 0) return { colorClass: 'bg-red-500', textColorClass: 'text-red-600' };
        if (remaining === 1) return { colorClass: 'bg-red-500', textColorClass: 'text-red-600' };
        if (remaining <= max * 0.25) return { colorClass: 'bg-amber-500', textColorClass: 'text-amber-600' };
        return { colorClass: 'bg-green-500', textColorClass: 'text-green-600' };

    }, [count, max]);

    return (
        <div className="flex flex-col items-end w-20">
            <span className={`text-xs font-bold ${textColorClass}`}>
                {count} / {max} Cupos
            </span>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div 
                    className={`${colorClass} h-1.5 rounded-full transition-all duration-300`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};
