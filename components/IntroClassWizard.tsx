import React, { useState, useMemo } from 'react';
import type { Product, IntroductoryClass, EnrichedIntroClassSession, IntroClassSession, AppData } from '../types.js';
// Eliminado useLanguage, la app ahora es monolingüe en español
import { InstructorTag } from './InstructorTag.js';
import { CapacityIndicator } from './CapacityIndicator.js';
import { ClockIcon } from './icons/ClockIcon.js';
import { SparklesIcon } from './icons/SparklesIcon.js';
import { InfoCircleIcon } from './icons/InfoCircleIcon.js';
import { PaintBrushIcon } from './icons/PaintBrushIcon.js';

type WizardStep = 'month' | 'day' | 'time';

interface IntroClassWizardProps {
  product: IntroductoryClass;
  sessions: EnrichedIntroClassSession[];
  onConfirm: (product: Product, session: IntroClassSession) => void;
  appData: AppData;
  onBack: () => void;
}

const StepIndicator: React.FC<{ currentStep: number, totalSteps: number, stepTitles: string[] }> = ({ currentStep, totalSteps, stepTitles }) => (
    <div className="flex items-center justify-between mb-4">
        {stepTitles.map((title, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            return (
                <React.Fragment key={title}>
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${isActive ? 'bg-brand-primary text-white' : isCompleted ? 'bg-brand-success text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {isCompleted ? '✓' : stepNumber}
                        </div>
                        <p className={`mt-1 text-xs text-center font-semibold transition-colors duration-300 ${isActive || isCompleted ? 'text-brand-text' : 'text-gray-400'}`}>{title}</p>
                    </div>
                    {stepNumber < totalSteps && <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-brand-success' : 'bg-gray-200'}`}></div>}
                </React.Fragment>
            )
        })}
    </div>
);

export const IntroClassWizard: React.FC<IntroClassWizardProps> = ({ product, sessions, onConfirm, appData, onBack }) => {
    
    const [step, setStep] = useState<WizardStep>('month');
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null); // YYYY-MM format
    const [selectedDay, setSelectedDay] = useState<string | null>(null); // YYYY-MM-DD format
    const [selectedTime, setSelectedTime] = useState<EnrichedIntroClassSession | null>(null);

    const sessionsByMonth = useMemo(() => {
        return sessions.reduce((acc, session) => {
            const monthKey = session.date.substring(0, 7); // YYYY-MM
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(session);
            return acc;
        }, {} as Record<string, EnrichedIntroClassSession[]>);
    }, [sessions]);

    const availableMonths = useMemo(() => Object.keys(sessionsByMonth).sort(), [sessionsByMonth]);

    const sessionsForSelectedMonth = useMemo(() => {
        if (!selectedMonth) return [];
        return sessionsByMonth[selectedMonth] || [];
    }, [selectedMonth, sessionsByMonth]);

    const sessionsForSelectedDay = useMemo(() => {
        if (!selectedDay) return [];
        return sessions.filter(s => s.date === selectedDay);
    }, [selectedDay, sessions]);

    const handleMonthSelect = (month: string) => {
        setSelectedMonth(month);
        setStep('day');
    };

    const handleDaySelect = (day: string) => {
        setSelectedDay(day);
        setStep('time');
    };
    
    const handleTimeSelect = (session: EnrichedIntroClassSession) => {
        setSelectedTime(session);
    };

    const handleConfirm = () => {
        if (selectedTime) {
            onConfirm(product, selectedTime);
        }
    };
    
    const renderContent = () => {
        switch(step) {
            case 'month':
                return (
                    <div className="space-y-3 animate-fade-in-fast">
                        {availableMonths.map(month => {
                            const dateObj = new Date(`${month}-02T00:00:00`);
                            const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
                            const mes = meses[dateObj.getMonth()];
                            const año = dateObj.getFullYear();
                            return (
                                <button key={month} onClick={() => handleMonthSelect(month)} className="w-full text-center p-4 bg-white rounded-lg font-semibold text-brand-text shadow-sm hover:shadow-md hover:bg-brand-primary/10 border border-brand-border transition-all">
                                    {`${mes.charAt(0).toUpperCase() + mes.slice(1)} ${año}`}
                                </button>
                            );
                        })}
                    </div>
                );
            case 'day':
                const year = parseInt(selectedMonth!.split('-')[0], 10);
                const month = parseInt(selectedMonth!.split('-')[1], 10) - 1;
                const firstDayOfMonth = new Date(year, month, 1);
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const blanks = Array(firstDayOfMonth.getDay()).fill(null);
                const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                const calendarDays = [...blanks, ...days];
                const availableDaysInMonth = new Set(sessionsForSelectedMonth.map(s => new Date(s.date + 'T00:00:00').getDate()));

                return (
                     <div className="animate-fade-in-fast">
                        <div className="grid grid-cols-7 gap-2 text-center text-xs text-brand-secondary">
                             {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => <div key={i} className="font-bold">{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-2 mt-2">
                             {calendarDays.map((day, index) => {
                                 if (!day) return <div key={`blank-${index}`}></div>;
                                 const isAvailable = availableDaysInMonth.has(day);
                                 return (
                                     <button 
                                         key={day} 
                                         onClick={() => isAvailable && handleDaySelect(`${selectedMonth}-${String(day).padStart(2, '0')}`)}
                                         disabled={!isAvailable}
                                         className={`w-full aspect-square rounded-full font-semibold transition-all ${isAvailable ? 'bg-white text-brand-text hover:bg-brand-primary/20 ring-1 ring-brand-border' : 'bg-transparent text-gray-300'}`}
                                     >{day}</button>
                                 )
                             })}
                        </div>
                    </div>
                );
            case 'time':
                return (
                    <div className="space-y-3 animate-fade-in-fast">
                        {sessionsForSelectedDay.map(session => {
                            const isFull = session.paidBookingsCount >= session.capacity;
                            const isSelected = selectedTime?.id === session.id;
                            return (
                                <button
                                    key={session.id}
                                    onClick={() => !isFull && handleTimeSelect(session)}
                                    disabled={isFull}
                                    className={`relative w-full p-3 rounded-lg text-left transition-all duration-200 overflow-hidden flex flex-col items-start gap-2 ${
                                        isSelected ? 'bg-brand-primary/10 ring-2 ring-offset-1 ring-brand-primary shadow-md' : 'bg-white hover:shadow-subtle'
                                    } ${isFull ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                     {isFull && (
                                        <div className="absolute -top-1 -right-7 bg-red-600 text-white text-[10px] font-bold px-6 py-0.5 transform rotate-45">
                                            Agotado
                                        </div>
                                    )}
                                    <p className={`font-semibold text-lg ${isSelected ? 'text-brand-primary' : 'text-brand-text'}`}>{session.time}</p>
                                    <div className="flex items-center gap-2 w-full justify-between">
                                        <InstructorTag instructorId={session.instructorId} instructors={appData.instructors} />
                                        <CapacityIndicator count={session.paidBookingsCount} max={session.capacity} capacityMessages={appData.capacityMessages} />
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                );
        }
    }

    const stepTitles = ["Mes", "Día", "Hora"];
    const currentStepIndex = step === 'month' ? 1 : step === 'day' ? 2 : 3;
    
    const goBack = () => {
        if (step === 'time') {
            setSelectedDay(null);
            setSelectedTime(null);
            setStep('day');
        } else if (step === 'day') {
            setSelectedMonth(null);
            setStep('month');
        } else {
            onBack();
        }
    }

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <h3 className="text-xl font-semibold text-brand-text text-center">{product.name}</h3>
            <p className="text-center text-brand-secondary text-sm">${product.price}</p>
            <p className="text-center text-brand-secondary text-sm my-4">{product.description}</p>
            
            <div className="space-y-4 text-sm mb-6 text-left border-t border-b border-gray-200 py-4">
                <div className="flex items-start"><ClockIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-primary flex-shrink-0" /> <div><span className="font-bold text-brand-text">Duración:</span> {product.details.duration}</div></div>
                 <div className="flex items-start"><SparklesIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-primary flex-shrink-0" />
                    <div>
                        <span className="font-bold text-brand-text">Qué Haremos:</span>
                        <ul className="list-disc list-inside ml-1">
                            {product.details.activities.map((activity, index) => <li key={index}>{activity}</li>)}
                        </ul>
                    </div>
                </div>
                <div className="flex items-start"><InfoCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-primary flex-shrink-0" /> <div><span className="font-bold text-brand-text">Recomendaciones Generales:</span> {product.details.generalRecommendations}</div></div>
                <div className="flex items-start"><PaintBrushIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-primary flex-shrink-0" /> <div><span className="font-bold text-brand-text">Materiales:</span> {product.details.materials}</div></div>
            </div>
            
            <StepIndicator currentStep={currentStepIndex} totalSteps={3} stepTitles={stepTitles} />

            <div className="mt-6 min-h-[200px]">
                {renderContent()}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                 <button onClick={goBack} className="text-brand-secondary font-semibold hover:underline">
                    Atrás
                </button>
                 <button
                    onClick={handleConfirm}
                    disabled={!selectedTime}
                    className="bg-brand-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-accent transition-colors duration-300 disabled:bg-gray-400"
                >
                    Continuar con la Selección
                </button>
            </div>
        </div>
    );
};
