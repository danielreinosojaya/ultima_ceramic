import React, { useState, useMemo } from 'react';
import type { UserInfo, InvoiceRequest } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { COUNTRIES } from '@/constants';
import { UserIcon } from './icons/UserIcon';
import { MailIcon } from './icons/MailIcon';
import { PhoneIcon } from './icons/PhoneIcon';

interface InvoiceData {
    companyName: string;
    taxId: string;
    address: string;
    email: string;
}
interface UserInfoModalProps {
  onClose: () => void;
  onSubmit: (data: { userInfo: UserInfo, needsInvoice: boolean, invoiceData?: InvoiceData }) => void;
  onShowPolicies: () => void;
}

// FIX: Added optional 'name' prop and made 'placeholder' optional to fix type errors.
const InputField: React.FC<{
    id: string;
    name?: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    error?: string;
    icon?: React.ReactNode;
    required?: boolean;
}> = ({ id, name, label, value, onChange, placeholder, type = 'text', error, icon, required }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-semibold text-brand-secondary mb-1">{label}</label>
        <div className="relative">
            {icon && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-secondary">
                  {icon}
              </div>
            )}
            <input
                id={id}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${error ? 'border-red-500' : 'border-brand-border'}`}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                required={required}
            />
        </div>
        {error && <p id={`${id}-error`} className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
);

export const UserInfoModal: React.FC<UserInfoModalProps> = ({ onClose, onSubmit, onShowPolicies }) => {
    const { t } = useLanguage();
    // User info state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState(COUNTRIES[0]);
    
    // Invoice state
    const [needsInvoice, setNeedsInvoice] = useState(false);
    const [invoiceData, setInvoiceData] = useState<InvoiceData>({
        companyName: '', taxId: '', address: '', email: ''
    });

    // UI and validation state
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isPhoneFocused, setIsPhoneFocused] = useState(false);
    const [acceptedPolicies, setAcceptedPolicies] = useState(false);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!firstName.trim()) newErrors.firstName = t('userInfoModal.validationRequired');
        if (!lastName.trim()) newErrors.lastName = t('userInfoModal.validationRequired');
        if (!email.trim()) {
            newErrors.email = t('userInfoModal.validationRequired');
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = t('userInfoModal.validationEmail');
        }
        if (!phone.trim()) {
            newErrors.phone = t('userInfoModal.validationRequired');
        } else if (!/^[0-9\s-]{7,15}$/.test(phone)) {
            newErrors.phone = t('userInfoModal.validationPhone');
        }
        if (needsInvoice) {
            if (!invoiceData.companyName.trim()) newErrors.companyName = t('userInfoModal.validationRequired');
            if (!invoiceData.taxId.trim()) newErrors.taxId = t('userInfoModal.validationRequired');
            if (!invoiceData.address.trim()) newErrors.address = t('userInfoModal.validationRequired');
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSubmit({
                userInfo: { firstName, lastName, email, phone, countryCode: country.code },
                needsInvoice,
                invoiceData: needsInvoice ? { ...invoiceData, email: invoiceData.email || email } : undefined
            });
        }
    };

    const handleInvoiceDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInvoiceData(prev => ({ ...prev, [name]: value }));
    }
    
    const isFormValid = useMemo(() => {
        const baseValid = firstName.trim() && lastName.trim() && email.trim() && phone.trim();
        const invoiceValid = !needsInvoice || (invoiceData.companyName.trim() && invoiceData.taxId.trim() && invoiceData.address.trim());
        return baseValid && invoiceValid && Object.keys(errors).length === 0;
    }, [firstName, lastName, email, phone, needsInvoice, invoiceData, errors]);

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-brand-surface rounded-xl shadow-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-semibold text-brand-primary">{t('userInfoModal.title')}</h2>
                    <p className="text-brand-secondary mt-1">{t('userInfoModal.subtitle')}</p>
                </div>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField 
                                id="firstName" label={t('userInfoModal.firstNameLabel')} value={firstName} onChange={(e) => setFirstName(e.target.value)}
                                placeholder={t('userInfoModal.firstNamePlaceholder')} error={errors.firstName} icon={<UserIcon className="w-5 h-5"/>} required
                            />
                            <InputField 
                                id="lastName" label={t('userInfoModal.lastNameLabel')} value={lastName} onChange={(e) => setLastName(e.target.value)}
                                placeholder={t('userInfoModal.lastNamePlaceholder')} error={errors.lastName} required
                            />
                        </div>
                        <InputField 
                            id="email" label={t('userInfoModal.emailLabel')} value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('userInfoModal.emailPlaceholder')} type="email" error={errors.email} icon={<MailIcon className="w-5 h-5"/>} required
                        />
                        <div>
                            <label htmlFor="phone" className="block text-sm font-semibold text-brand-secondary mb-1">{t('userInfoModal.phoneLabel')}</label>
                            <div className={`flex items-center border rounded-lg transition-colors ${isPhoneFocused ? 'ring-2 ring-brand-primary border-brand-primary' : (errors.phone ? 'border-red-500' : 'border-brand-border')}`}>
                                <select 
                                    value={country.name} onChange={(e) => setCountry(COUNTRIES.find(c => c.name === e.target.value) || COUNTRIES[0])}
                                    onFocus={() => setIsPhoneFocused(true)} onBlur={() => setIsPhoneFocused(false)}
                                    className="pl-3 py-2 border-r border-brand-border rounded-l-lg bg-gray-50 focus:outline-none"
                                >
                                    {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.flag} {c.code}</option>)}
                                </select>
                                <div className="relative flex-grow">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-secondary"><PhoneIcon className="w-5 h-5"/></div>
                                    <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s-]/g, ''))}
                                        onFocus={() => setIsPhoneFocused(true)} onBlur={() => setIsPhoneFocused(false)} placeholder={t('userInfoModal.phonePlaceholder')}
                                        className="w-full pl-10 pr-3 py-2 rounded-r-lg focus:outline-none" maxLength={15} required
                                    />
                                </div>
                            </div>
                            {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
                        </div>
                    </div>
                     <div className="mt-6 pt-4 border-t border-brand-border space-y-4">
                        <div className="flex items-start">
                            <input id="needs-invoice" type="checkbox" checked={needsInvoice} onChange={(e) => setNeedsInvoice(e.target.checked)} className="h-4 w-4 text-brand-primary border-brand-border rounded focus:ring-brand-primary mt-1"/>
                            <label htmlFor="needs-invoice" className="ml-3 text-sm text-brand-secondary">{t('userInfoModal.needsInvoice')}</label>
                        </div>
                        {needsInvoice && (
                            <div className="space-y-4 mt-4 p-4 border border-brand-border rounded-lg animate-fade-in-fast bg-brand-background">
                                <h4 className="font-semibold text-brand-text">{t('userInfoModal.invoiceDataTitle')}</h4>
                                <InputField id="companyName" name="companyName" label={t('userInfoModal.invoiceCompanyName')} value={invoiceData.companyName} onChange={handleInvoiceDataChange} error={errors.companyName} required />
                                <InputField id="taxId" name="taxId" label={t('userInfoModal.invoiceTaxId')} value={invoiceData.taxId} onChange={handleInvoiceDataChange} error={errors.taxId} required />
                                <InputField id="address" name="address" label={t('userInfoModal.invoiceAddress')} value={invoiceData.address} onChange={handleInvoiceDataChange} error={errors.address} required />
                                <InputField id="invoiceEmail" name="email" label={t('userInfoModal.invoiceEmail')} value={invoiceData.email} onChange={handleInvoiceDataChange} type="email" placeholder={t('userInfoModal.invoiceEmailPlaceholder')} error={errors.invoiceEmail} />
                            </div>
                        )}
                    </div>
                    <div className="mt-6 pt-4 border-t border-brand-border">
                        <div className="flex items-start">
                            <input id="accept-policies" type="checkbox" checked={acceptedPolicies} onChange={(e) => setAcceptedPolicies(e.target.checked)}
                                className="h-4 w-4 text-brand-primary border-brand-border rounded focus:ring-brand-primary mt-1"
                            />
                            <label htmlFor="accept-policies" className="ml-3 text-sm text-brand-secondary">
                                {t('userInfoModal.acceptPolicies')}{' '}
                                <button type="button" onClick={onShowPolicies} className="font-semibold text-brand-primary hover:underline">
                                    {t('userInfoModal.readPoliciesLink')}
                                </button>.
                            </label>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button type="submit" onClick={handleSubmit} disabled={!isFormValid || !acceptedPolicies}
                            className="w-full sm:w-auto bg-brand-primary text-white font-bold py-2 px-8 rounded-lg hover:opacity-90 transition-opacity duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {t('userInfoModal.saveAndContinueButton')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};