import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import * as dataService from '../services/dataService';
import type { GroupInquiry, FooterInfo } from '../types';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { InfoCircleIcon } from './icons/InfoCircleIcon';

interface GroupInquiryFormProps {
  onBack: () => void;
  inquiryType: 'group' | 'couple' | 'team_building';
  footerInfo: FooterInfo;
}

type FormData = Omit<GroupInquiry, 'id' | 'status' | 'createdAt' | 'inquiryType'>;

const EVENT_TYPE_KEYS = [
  'birthday', 'anniversary', 'bachelorette_party', 'family_gathering', 'other'
];

export const GroupInquiryForm: React.FC<GroupInquiryFormProps> = ({ onBack, inquiryType, footerInfo }) => {
  const { t } = useLanguage();
  
  const formConfig = {
    group: {
      minParticipants: 6,
      titleKey: 'inquiryForm.groupExperienceTitle',
      subtitleKey: 'inquiryForm.groupExperienceSubtitle',
    },
    couple: {
      minParticipants: 2,
      titleKey: 'inquiryForm.couplesExperienceTitle',
      subtitleKey: 'inquiryForm.couplesExperienceSubtitle',
    },
    team_building: {
      minParticipants: 6,
      titleKey: 'inquiryForm.teamBuildingExperienceTitle',
      subtitleKey: 'inquiryForm.teamBuildingExperienceSubtitle',
    }
  };

  const currentConfig = formConfig[inquiryType];

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    countryCode: '+593',
    participants: currentConfig.minParticipants,
    tentativeDate: null,
    tentativeTime: null,
    eventType: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const generateWhatsappLink = () => {
    if (!footerInfo?.whatsapp) return '';

    const inquiryTypeText = t(`groupInquiry.inquiryType_${inquiryType}`);
    
    const messageDetails = {
      inquiryType: inquiryTypeText,
      participants: formData.participants,
      name: formData.name,
      eventType: formData.eventType ? t(`groupInquiry.eventTypeOptions.${formData.eventType}`) : t('admin.inquiryManager.notSpecified'),
      date: formData.tentativeDate || t('admin.inquiryManager.notSpecified'),
      time: formData.tentativeTime || t('admin.inquiryManager.notSpecified')
    };

    const message = t('groupInquiry.whatsappMessage', messageDetails);

    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = footerInfo.whatsapp.replace(/\D/g, '');
    return `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dataService.addGroupInquiry({ ...formData, inquiryType });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit inquiry:", error);
      alert(t('inquiryForm.submitError'));
    }
  };

  if (isSubmitted) {
    const whatsappLink = generateWhatsappLink();
    return (
      <div className="text-center p-8 bg-brand-surface rounded-xl shadow-subtle animate-fade-in-up max-w-lg mx-auto">
        <h2 className="text-3xl font-semibold text-brand-text mb-4">{t('groupInquiry.successTitle')}</h2>
        <p className="text-brand-secondary mb-8">{t('groupInquiry.successMessage')}</p>
         <div className="mb-6">
            <p className="text-sm text-brand-secondary">{t('groupInquiry.whatsappPrompt')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
                onClick={onBack}
                className="w-full sm:w-auto bg-transparent border border-brand-secondary text-brand-secondary font-bold py-3 px-8 rounded-lg hover:bg-brand-secondary hover:text-white transition-colors duration-300"
            >
                {t('groupInquiry.backToHomeButton')}
            </button>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-600 transition-colors duration-300"
              >
                <WhatsAppIcon className="w-5 h-5" />
                {t('groupInquiry.whatsappButton')}
              </a>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-brand-surface rounded-xl shadow-subtle animate-fade-in-up max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm font-semibold text-brand-secondary hover:text-brand-text mb-4 transition-colors">
        &larr; {t('inquiryForm.backButton')}
      </button>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-semibold text-brand-text">
          {t(currentConfig.titleKey)}
        </h2>
        <p className="text-brand-secondary mt-2">
           {t(currentConfig.subtitleKey)}
        </p>
      </div>

       {inquiryType === 'couple' && (
            <div className="mb-6 p-4 bg-amber-100 border-l-4 border-amber-500 rounded-r-lg animate-fade-in">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <InfoCircleIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-md font-bold text-amber-900">
                            {t('inquiryForm.couplesPriceInfoTitle')}
                        </h3>
                        <div className="mt-2 text-sm text-amber-800">
                            <p>{t('inquiryForm.couplesPriceInfoText')}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {inquiryType === 'group' && (
            <div className="mb-6 p-4 bg-amber-100 border-l-4 border-amber-500 rounded-r-lg animate-fade-in">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <InfoCircleIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-md font-bold text-amber-900">
                            {t('inquiryForm.groupPriceInfoTitle')}
                        </h3>
                        <div className="mt-2 text-sm text-amber-800">
                            <p>{t('inquiryForm.groupPriceInfoText')}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {inquiryType === 'team_building' && (
             <div className="mb-6 p-4 bg-blue-100 border-l-4 border-blue-500 rounded-r-lg animate-fade-in">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <InfoCircleIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-md font-bold text-blue-900">
                            {t('inquiryForm.teamBuildingDescriptionTitle')}
                        </h3>
                        <div className="mt-2 text-sm text-blue-800">
                            <p>{t('inquiryForm.teamBuildingDescriptionText')}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="name" placeholder={t('inquiryForm.namePlaceholder')} value={formData.name} onChange={handleChange} required className="w-full p-3 border border-brand-border rounded-lg"/>
          <input type="email" name="email" placeholder={t('inquiryForm.emailPlaceholder')} value={formData.email} onChange={handleChange} required className="w-full p-3 border border-brand-border rounded-lg"/>
        </div>
        <input type="tel" name="phone" placeholder={t('inquiryForm.phonePlaceholder')} value={formData.phone} onChange={handleChange} required className="w-full p-3 border border-brand-border rounded-lg"/>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input 
                type="number" name="participants" 
                placeholder={t('inquiryForm.participantsPlaceholder')} 
                value={formData.participants} 
                onChange={handleChange} 
                required 
                min={currentConfig.minParticipants}
                readOnly={inquiryType === 'couple'}
                className="w-full p-3 border border-brand-border rounded-lg"
            />
            {inquiryType !== 'couple' && <p className="text-xs text-brand-secondary mt-1 ml-1">{t('inquiryForm.minParticipantsInfo')}</p>}
          </div>
          {inquiryType !== 'team_building' && (
            <select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full p-3 border border-brand-border rounded-lg bg-white">
              <option value="">{t('inquiryForm.eventTypePlaceholder')}</option>
              {EVENT_TYPE_KEYS.map(key => (
                <option key={key} value={key}>{t(`groupInquiry.eventTypeOptions.${key}`)}</option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="date" name="tentativeDate" value={formData.tentativeDate || ''} onChange={handleChange} required className="w-full p-3 border border-brand-border rounded-lg"/>
            <input type="time" name="tentativeTime" value={formData.tentativeTime || ''} onChange={handleChange} className="w-full p-3 border border-brand-border rounded-lg"/>
        </div>

        <textarea name="message" placeholder={t('inquiryForm.messagePlaceholder')} value={formData.message} onChange={handleChange} rows={4} className="w-full p-3 border border-brand-border rounded-lg"></textarea>
        
        <div className="flex justify-end pt-4">
          <button type="submit" className="bg-brand-primary text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity">
            {t('inquiryForm.submitButton')}
          </button>
        </div>
      </form>
    </div>
  );
};