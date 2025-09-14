
import React from 'react';
import type { BookingDetails, Product, AppData } from '../types.js';
import { CalendarIcon } from './icons/CalendarIcon.js';
import { DownloadIcon } from './icons/DownloadIcon.js';
import { useLanguage } from '../context/LanguageContext.js';
import { InstructorTag } from './InstructorTag.js';
import { UserIcon } from './icons/UserIcon.js';
import { MailIcon } from './icons/MailIcon.js';
import { PhoneIcon } from './icons/PhoneIcon.js';
import { InfoCircleIcon } from './icons/InfoCircleIcon.js';

interface BookingSummaryProps {
  bookingDetails: BookingDetails;
  onProceedToConfirmation: () => void;
  onBack: () => void;
  appData: AppData;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  bookingDetails,
  onProceedToConfirmation,
  onBack,
  appData,
}) => {
  const { t, language } = useLanguage();
  const { product, slots, userInfo } = bookingDetails;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return adjustedDate.toLocaleDateString(language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const sortedSlots = [...slots].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    return a.time.localeCompare(b.time);
  });

  return (
    <div className="p-8 bg-brand-surface rounded-xl shadow-subtle animate-fade-in-up max-w-2xl mx-auto">
      <button onClick={onBack} className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold">
        &larr; {t('summary.backButton')}
      </button>
      <div className="text-center">
        <h2 className="text-3xl font-semibold text-brand-text mb-2">{t('summary.title')}</h2>
        <p className="text-brand-secondary mb-8">{t('summary.subtitle')}</p>
      </div>

      <div className="bg-brand-background rounded-lg p-6 mb-6">
        <h3 className="text-xl font-bold text-brand-text border-b border-brand-border pb-2 mb-4">{product.name}</h3>
        <div className="flex justify-between items-center text-lg">
          <span className="text-brand-secondary">
             {product.type === 'CLASS_PACKAGE' 
                ? `${product.classes} ${t('summary.classes')}`
                : product.type === 'OPEN_STUDIO_SUBSCRIPTION'
                ? `${product.details.durationDays} ${t('summary.daysAccess')}`
                : `1 ${t('summary.class')}`
              }
          </span>
          {/* FIX: Check if price exists on product before rendering, as GroupExperience does not have a price. */}
          <span className="font-bold text-brand-text">{'price' in product && product.price ? `$${product.price.toFixed(2)}` : ''}</span>
        </div>
         {product.type === 'OPEN_STUDIO_SUBSCRIPTION' && (
            <div className="mt-4 flex items-start gap-3 bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-md text-blue-800">
                <InfoCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-xs">{t('summary.activationNotice')}</p>
            </div>
        )}
      </div>
      
      {userInfo && (
        <div className="bg-brand-background rounded-lg p-6 mb-6 animate-fade-in">
          <h3 className="text-xl font-bold text-brand-text border-b border-brand-border pb-2 mb-4">{t('pdf.customerInfoTitle')}</h3>
          <div className="space-y-2 text-sm">
             <div className="flex items-center"><UserIcon className="w-4 h-4 mr-3 text-brand-secondary" /> {userInfo.firstName} {userInfo.lastName}</div>
             <div className="flex items-center"><MailIcon className="w-4 h-4 mr-3 text-brand-secondary" /> {userInfo.email}</div>
             <div className="flex items-center"><PhoneIcon className="w-4 h-4 mr-3 text-brand-secondary" /> {userInfo.countryCode} {userInfo.phone}</div>
          </div>
        </div>
      )}
      
      {slots && slots.length > 0 && (
        <div className="bg-brand-background rounded-lg p-6">
          <h3 className="text-xl font-bold text-brand-text border-b border-brand-border pb-2 mb-4">{t('summary.scheduleTitle')}</h3>
          <ul className="space-y-2">
            {sortedSlots.map((slot, index) => (
              <li key={index} className="flex items-center text-brand-text py-2">
                <CalendarIcon className="w-5 h-5 mr-4 text-brand-secondary flex-shrink-0" />
                <div className="flex-grow flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{formatDate(slot.date)}</p>
                    <p className="text-sm text-brand-secondary">{slot.time}</p>
                  </div>
                  {/* FIX: Pass appData.instructors to InstructorTag */}
                  <InstructorTag instructorId={slot.instructorId} instructors={appData.instructors} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-4 justify-center">
        <button
            onClick={onProceedToConfirmation}
            className="w-full md:w-auto bg-brand-primary text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity duration-300"
        >
            {t('summary.proceedToConfirmButton')}
        </button>
      </div>
    </div>
  );
};