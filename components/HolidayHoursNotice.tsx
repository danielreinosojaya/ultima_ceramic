import React, { useEffect } from 'react';
import { getEcuadorDateYmd } from '../utils/formatters';
import { HOLIDAY_HOURS_ACTIVE, HOLIDAY_NOTICE_UNTIL } from '../utils/holidayHours';

export const HOLIDAY_NOTICE_STORAGE_KEY = 'holidayHoursNoticeDismissed';

const ROWS: { when: string; hours: string; closed?: boolean }[] = [
    { when: 'Lunes 21 de diciembre', hours: '10:00 a 20:00' },
    { when: 'Martes 22 de diciembre', hours: 'Horario habitual' },
    { when: 'Miércoles 23 de diciembre', hours: '10:00 a 17:00' },
    { when: 'Jueves 24 y viernes 25', hours: 'Cerrado', closed: true },
    { when: 'Sábado 26 al martes 29', hours: '10:00 a 20:00' },
    { when: 'Miércoles 30 al lunes 4 de enero', hours: 'Cerrado', closed: true },
    { when: 'Desde el martes 5 de enero', hours: 'Horario habitual' },
];

export function shouldOfferHolidayNotice(todayYmd?: string): boolean {
    try {
        if (!HOLIDAY_HOURS_ACTIVE) return false;
        const today = todayYmd || getEcuadorDateYmd();
        return today <= HOLIDAY_NOTICE_UNTIL;
    } catch {
        return false;
    }
}

export function wasHolidayNoticeDismissed(): boolean {
    try {
        return sessionStorage.getItem(HOLIDAY_NOTICE_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

export function dismissHolidayNotice(): void {
    try {
        sessionStorage.setItem(HOLIDAY_NOTICE_STORAGE_KEY, '1');
    } catch {
        // Si el navegador bloquea el almacenamiento, el aviso igual se cierra.
    }
}

function Mark() {
    return (
        <svg width="36" height="36" viewBox="0 0 100 100" aria-hidden="true">
            <path
                d="M50,10 C75,10 90,30 90,50 C90,70 75,90 50,90 C25,90 10,70 10,50 C10,30 25,10 50,10 Z"
                fill="none"
                className="stroke-brand-border"
                strokeWidth="1"
            />
            <path
                d="M10,50 C10,30 25,10 50,10 C75,10 90,30 90,50"
                fill="none"
                className="stroke-brand-text"
                strokeWidth="4"
            />
            <path
                d="M50,30 C58,30 65,40 65,50 C65,60 58,70 50,70 C42,70 35,60 35,50 C35,40 42,30 50,30 Z"
                className="fill-brand-accent"
            />
        </svg>
    );
}

export const HolidayHoursNotice: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="holiday-hours-title"
                className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-fade-in-up"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center">
                    <Mark />
                    <p className="mt-4 text-xs tracking-[0.18em] uppercase text-brand-secondary">CeramicAlma</p>
                    <h2 id="holiday-hours-title" className="mt-2 font-serif text-2xl text-brand-accent">
                        Horarios de fiestas
                    </h2>
                    <p className="mt-2 text-sm text-brand-secondary">
                        Durante Navidad y fin de año el estudio abre en estos horarios.
                    </p>
                </div>

                <ul className="mt-6 divide-y divide-brand-border/70">
                    {ROWS.map((row) => (
                        <li key={row.when} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                            <span className="text-brand-text text-left">{row.when}</span>
                            <span className={row.closed ? 'text-brand-secondary shrink-0' : 'text-brand-text font-semibold shrink-0'}>
                                {row.hours}
                            </span>
                        </li>
                    ))}
                </ul>

                <p className="mt-5 text-xs text-brand-secondary text-center">
                    La última clase termina a la hora de cierre.
                </p>

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-5 w-full bg-brand-primary text-white font-bold py-2.5 rounded-lg hover:bg-brand-accent transition-colors"
                >
                    Entendido
                </button>
            </div>
        </div>
    );
};
