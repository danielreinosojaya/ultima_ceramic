import React, { useState, useEffect } from 'react';
import type { GroupInquiry } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { COUNTRIES } from '@/constants';

interface GroupInquiryFormProps {
    inquiryType: 'group' | 'couple';
    onSubmit: (inquiryData: Omit<GroupInquiry, 'id' | 'status' | 'createdAt' | 'inquiryType'>) => void;
    isSubmitted: boolean;
    onReset: () => void;
}

export const GroupInquiryForm: React.FC<GroupInquiryFormProps> = ({ inquiryType, onSubmit, isSubmitted, onReset }) => {
    const { t } = useLanguage();
    const isCouples = inquiryType === 'couple';

    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', countryCode: COUNTRIES[0].code,
        participants: isCouples ? 2 : 6,
        tentativeDate: '',
        tentativeTime: '',
        eventType: '', message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (isCouples) {
            setFormData(prev => ({ ...prev, participants: 2 }));
        }
    }, [isCouples]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Basic validation could be added here
        setTimeout(() => {
            onSubmit({
                ...formData,
                participants: Number(formData.participants)
            });
            setIsSubmitting(false);
        }, 1000);
    };

    if (isSubmitted) {
        return (
            <div className="fixed inset-0 bg-brand-surface z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="text-center max-w-lg mx-auto">
                    <h2 className="text-3xl font-semibold text-brand-primary mb-4">{t('groupInquiry.successTitle')}</h2>
                    <p className="text-brand-secondary mb-8">{t('groupInquiry.successMessage')}</p>
                    <button
                        onClick={onReset}
                        className="bg-brand-primary text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        {t('groupInquiry.backButton')}
                    </button>
                </div>
            </div>
        );
    }

    const title = isCouples ? t('couplesInquiry.title') : t('groupInquiry.title');
    const subtitle = isCouples ? t('couplesInquiry.subtitle') : t('groupInquiry.subtitle');

    return (
        <div className="fixed inset-0 bg-brand-surface z-50 overflow-y-auto p-4 sm:p-8 animate-fade-in">
            <div className="max-w-3xl mx-auto">
                <div className="text-center">
                    <h2 className="text-3xl md:text-4xl font-semibold text-brand-text mb-2">{title}</h2>
                    <p className="text-brand-secondary mb-10 max-w-2xl mx-auto">{subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-brand-background p-6 sm:p-8 rounded-xl shadow-subtle space-y-4">
                    <h3 className="text-xl font-bold text-brand-accent border-b border-brand-border pb-3 mb-6">{t('groupInquiry.formTitle')}</h3>
                    
                    <InputField label={t('groupInquiry.nameLabel')} name="name" value={formData.name} onChange={handleChange} placeholder={t('groupInquiry.namePlaceholder')} required />
                    <InputField label={t('groupInquiry.emailLabel')} name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@email.com" required />
                    
                    <div>
                        <label className="block text-sm font-semibold text-brand-secondary mb-1">{t('groupInquiry.phoneLabel')}</label>
                        <div className="flex">
                           <select name="countryCode" value={formData.countryCode} onChange={handleChange} className="border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 focus:outline-none px-2">
                               {COUNTRIES.map(c => <option key={c.name} value={c.code}>{c.flag} {c.code}</option>)}
                           </select>
                           <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="99 123 4567" className="w-full px-3 py-2 border border-gray-300 rounded-r-lg" required />
                        </div>
                    </div>

                     <div>
                        <InputField label={t('groupInquiry.participantsLabel')} name="participants" type="number" min={isCouples ? "2" : "6"} value={formData.participants} onChange={handleChange} required disabled={isCouples} />
                        {!isCouples && (
                            <p className="text-xs text-brand-secondary mt-1">{t('groupInquiry.participantsInfo')}</p>
                        )}
                     </div>
                     <InputField label={t('groupInquiry.eventTypeLabel')} name="eventType" type="select" value={formData.eventType} onChange={handleChange}>
                        <option value="">-- {t('groupInquiry.eventTypePlaceholder')} --</option>
                        <option value="birthday">{t('groupInquiry.eventTypeOptions.birthday')}</option>
                        <option value="anniversary">{t('groupInquiry.eventTypeOptions.anniversary')}</option>
                        <option value="team">{t('groupInquiry.eventTypeOptions.team')}</option>
                        <option value="friends">{t('groupInquiry.eventTypeOptions.friends')}</option>
                        <option value="other">{t('groupInquiry.eventTypeOptions.other')}</option>
                     </InputField>

                    <InputField label={t('groupInquiry.dateLabel')} name="tentativeDate" type="date" value={formData.tentativeDate} onChange={handleChange} required />
                    <InputField label={t('groupInquiry.timeLabel')} name="tentativeTime" type="time" value={formData.tentativeTime} onChange={handleChange} required />

                    <div>
                        <label htmlFor="message" className="block text-sm font-semibold text-brand-secondary mb-1">{t('groupInquiry.messageLabel')}</label>
                        <textarea id="message" name="message" value={formData.message} onChange={handleChange} rows={4} placeholder={t('groupInquiry.messagePlaceholder')} className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-6 border-t border-brand-border">
                        <button type="button" onClick={onReset} className="text-brand-secondary font-semibold hover:underline">
                            {t('admin.productManager.cancelButton')}
                        </button>
                        <button type="submit" disabled={isSubmitting} className="bg-brand-primary text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 disabled:bg-gray-400">
                            {isSubmitting ? t('groupInquiry.submittingButton') : t('groupInquiry.submitButton')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, children?: React.ReactNode }> = ({ label, type, children, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-semibold text-brand-secondary mb-1">{label}</label>
        {type === 'select' ? (
             <select {...props} id={props.name} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                {children}
             </select>
        ) : (
            <input {...props} type={type} id={props.name} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed" />
        )}
    </div>
);