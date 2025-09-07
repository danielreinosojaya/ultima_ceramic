import React from 'react';
import type { ClassPackage, TimeSlot, Product, BookingMode } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { CalendarIcon } from './icons/CalendarIcon';
import { TrashIcon } from './icons/TrashIcon';

interface BookingSidebarProps {
  product: Product;
  selectedSlots: TimeSlot[];
  onRemoveSlot: (slot: TimeSlot) => void;
  onConfirm: () => void;
  bookingMode?: BookingMode;
}

export const BookingSidebar: React.FC<BookingSidebarProps> = ({ product, selectedSlots, onRemoveSlot, onConfirm, bookingMode }) => {
  const { t, language } = useLanguage();

  if (product.type !== 'CLASS_PACKAGE') {
    return null; // This sidebar is only for class packages
  }
  
  const classesRemaining = product.classes - selectedSlots.length;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return adjustedDate.toLocaleDateString(language, {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-brand-background p-6 rounded-lg sticky top-24 h-fit">
      <h3 className="text-xl font-serif text-brand-text mb-1">{t('summary.title')}</h3>
      <div className="border-t border-brand-border pt-4">
        <div className="flex justify-between items-baseline mb-4">
            <h4 className="font-bold text-brand-text">{product.name}</h4>
            <p className="font-semibold text-brand-text">${product.price.toFixed(2)}</p>
        </div>

        <div className="mb-4">
            <p className={`text-sm font-bold ${classesRemaining === 0 ? 'text-brand-success' : 'text-brand-text'}`}>
                 {classesRemaining > 0
                    ? t('schedule.classesRemaining', { count: classesRemaining })
                    : t('schedule.allClassesSelected')
                 }
            </p>
        </div>

        <div className="space-y-2 min-h-[50px]">
            {selectedSlots.map((slot, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-2 rounded-md animate-fade-in-fast">
                    <div>
                        <p className="text-sm font-semibold text-brand-text">{formatDate(slot.date)}</p>
                        <p className="text-xs text-brand-secondary">{slot.time}</p>
                    </div>
                    {bookingMode !== 'monthly' && (
                        <button onClick={() => onRemoveSlot(slot)} className="p-1 text-brand-secondary hover:text-red-500">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}
        </div>
        
        <button
          onClick={onConfirm}
          disabled={classesRemaining > 0}
          className="mt-6 w-full bg-brand-primary text-white font-bold py-3 px-6 rounded-lg disabled:bg-stone-400 disabled:cursor-not-allowed hover:bg-brand-text transition-colors duration-300"
        >
          {t('schedule.confirmButton', { selected: selectedSlots.length, total: product.classes })}
        </button>
      </div>
    </div>
  );
};