import React from 'react';
// ...existing code...
import { ArrowPathIcon } from '../icons/ArrowPathIcon';

interface SyncButtonProps {
    hasNewData: boolean;
    isSyncing: boolean;
    onClick: () => void;
}

export const SyncButton: React.FC<SyncButtonProps> = ({ hasNewData, isSyncing, onClick }) => {
    // Traducción eliminada, usar texto en español directamente
    const title = hasNewData ? '¡Datos nuevos disponibles!' : 'Sincronizar';

    return (
        <div className="relative" title={title}>
            <button
                onClick={onClick}
                disabled={isSyncing}
                className={`relative p-2 rounded-full transition-colors duration-300
                    ${hasNewData ? 'text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20' : 'text-brand-secondary hover:bg-brand-background'}
                    ${isSyncing ? 'cursor-not-allowed' : ''}
                `}
                aria-label={title}
            >
                <ArrowPathIcon className={`w-6 h-6 ${isSyncing ? 'animate-spin' : ''}`} />
                {hasNewData && !isSyncing && (
                    <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-brand-surface animate-pulse"></span>
                )}
            </button>
        </div>
    );
};