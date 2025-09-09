import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import * as dataService from '../services/dataService';
import type { GroupInquiry, FooterInfo } from '../types';
import { WhatsAppIcon } from './icons/WhatsAppIcon';

interface GroupInquiryFormProps {
  onBack: () => void;
  inquiryType: 'group' | 'couple';
  footerInfo: FooterInfo;
}

type FormData = Omit<GroupInquiry, 'id' | 'status' | 'createdAt' | 'inquiryType'>;

const EVENT_TYPE_KEYS = [
  'birthday', 'anniversary', 'team_building', 'bachelorette_party', 'family_gathering', 'other'
];

export const GroupInquiryForm: React.FC<GroupInquiryFormProps> = ({ onBack, inquiryType, footerInfo }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    countryCode: '+593',
    participants: inquiryType === 'group' ? 6 : 2,
    tentativeDate: null,
    tentativeTime: null,
    eventType: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const whatsappLink = footerInfo?.whatsapp ? `https://wa.me/${footerInfo.whatsapp.replace(/\D/g, '')}` : '';

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
          {inquiryType === 'group' ? t('inquiryForm.groupExperienceTitle') : t('inquiryForm.couplesExperienceTitle')}
        </h2>
        <p className="text-brand-secondary mt-2">
           {inquiryType === 'group' ? t('inquiryForm.groupExperienceSubtitle') : t('inquiryForm.couplesExperienceSubtitle')}
        </p>
      </div>
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
                min={inquiryType === 'group' ? 6 : 2}
                readOnly={inquiryType === 'couple'}
                className="w-full p-3 border border-brand-border rounded-lg"
            />
            {inquiryType === 'group' && <p className="text-xs text-brand-secondary mt-1 ml-1">{t('inquiryForm.minParticipantsInfo')}</p>}
          </div>
          <select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full p-3 border border-brand-border rounded-lg bg-white">
            <option value="">{t('inquiryForm.eventTypePlaceholder')}</option>
            {EVENT_TYPE_KEYS.map(key => (
              <option key={key} value={key}>{t(`groupInquiry.eventTypeOptions.${key}`)}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="date" name="tentativeDate" value={formData.tentativeDate || ''} onChange={handleChange} className="w-full p-3 border border-brand-border rounded-lg"/>
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