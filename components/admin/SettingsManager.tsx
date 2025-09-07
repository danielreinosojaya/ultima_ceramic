import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import * as dataService from '../../services/dataService';
import { CogIcon } from '../icons/CogIcon';
import type { ConfirmationMessage, ClassCapacity, CapacityMessageSettings, CapacityThreshold, UITexts, FooterInfo, AutomationSettings, BankDetails } from '../../types';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CurrencyDollarIcon } from '../icons/CurrencyDollarIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';

const SettingsInputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
        <input
            id={props.name}
            type="text"
            {...props}
            className="w-full p-2 border border-gray-300 rounded-lg"
        />
    </div>
);

const CommunicationAutomationManager: React.FC = () => {
    const { t } = useLanguage();
    const [settings, setSettings] = useState<AutomationSettings | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => setSettings(await dataService.getAutomationSettings());
        fetchSettings();
    }, []);

    const handleToggle = (key: keyof AutomationSettings) => {
        if (!settings) return;
        setSettings(prev => ({
            ...prev!,
            [key]: { ...prev![key], enabled: !prev![key].enabled }
        }));
    };

    const handleReminderChange = (field: 'value' | 'unit', value: string | number) => {
        if (!settings) return;
        setSettings(prev => ({
            ...prev!,
            classReminder: { ...prev!.classReminder, [field]: value }
        }));
    };
    
    const handleSave = async () => {
        if (!settings) return;
        await dataService.updateAutomationSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };
    
    if (!settings) return <div>Loading...</div>;

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">
                {t('admin.settingsManager.automation.title')}
            </h3>
            <p className="text-xs text-brand-secondary mb-4">
                {t('admin.settingsManager.automation.subtitle')}
            </p>

            <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-r-lg mb-6">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-bold">{t('admin.settingsManager.automation.envVarTitle')}</h3>
                        <div className="mt-2 text-sm">
                            <p>{t('admin.settingsManager.automation.envVarMessage')}</p>
                            <ul className="list-disc list-inside mt-2 space-y-1 font-mono text-xs">
                                <li>RESEND_API_KEY</li>
                                <li>EMAIL_FROM</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>


            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{t('admin.settingsManager.automation.preBookingConfirmation')}</span>
                    <button onClick={() => handleToggle('preBookingConfirmation')} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.preBookingConfirmation.enabled ? 'bg-brand-success' : 'bg-gray-300'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.preBookingConfirmation.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                 <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{t('admin.settingsManager.automation.paymentReceipt')}</span>
                    <button onClick={() => handleToggle('paymentReceipt')} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.paymentReceipt.enabled ? 'bg-brand-success' : 'bg-gray-300'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.paymentReceipt.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                 <div>
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{t('admin.settingsManager.automation.classReminder')}</span>
                        <button onClick={() => handleToggle('classReminder')} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.classReminder.enabled ? 'bg-brand-success' : 'bg-gray-300'}`}>
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.classReminder.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    {settings.classReminder.enabled && (
                        <div className="flex items-center gap-2 mt-2 pl-4 animate-fade-in-fast">
                            <span className="text-sm">{t('admin.settingsManager.automation.sendReminder')}</span>
                            <input
                                type="number"
                                value={settings.classReminder.value}
                                onChange={e => handleReminderChange('value', parseInt(e.target.value) || 1)}
                                className="w-16 p-1 border rounded-md text-sm"
                            />
                            <select
                                value={settings.classReminder.unit}
                                onChange={e => handleReminderChange('unit', e.target.value)}
                                className="p-1 border rounded-md text-sm bg-white"
                            >
                                <option value="hours">{t('admin.settingsManager.automation.hours')}</option>
                                <option value="days">{t('admin.settingsManager.automation.days')}</option>
                            </select>
                             <span className="text-sm">{t('admin.settingsManager.automation.beforeClass')}</span>
                        </div>
                    )}
                </div>
            </div>
             <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (
                    <p className="text-sm font-semibold text-brand-success animate-fade-in">
                        {t('admin.settingsManager.automation.savedMessage')}
                    </p>
                )}
                <button
                    onClick={handleSave}
                    className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent"
                >
                    {t('admin.settingsManager.automation.saveButton')}
                </button>
            </div>
        </div>
    );
};

const BankDetailsEditor: React.FC = () => {
    const { t } = useLanguage();
    const [details, setDetails] = useState<BankDetails | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => setDetails(await dataService.getBankDetails());
        fetchDetails();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!details) return;
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev!, [name]: value }));
    };

    const handleSave = async () => {
        if (!details) return;
        await dataService.updateBankDetails(details);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (!details) return <div>Loading...</div>;
    
    const isSaveDisabled = !details.bankName || !details.accountHolder || !details.accountNumber;

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.settingsManager.bankDetails.title')}</h3>
            <p className="text-xs text-brand-secondary mb-4">{t('admin.settingsManager.bankDetails.subtitle')}</p>
            <div className="space-y-4">
                <SettingsInputField name="bankName" label={`${t('admin.settingsManager.bankDetails.bankName')} ${t('admin.settingsManager.requiredFieldIndicator')}`} value={details.bankName} onChange={handleChange} required />
                <SettingsInputField name="accountHolder" label={`${t('admin.settingsManager.bankDetails.accountHolder')} ${t('admin.settingsManager.requiredFieldIndicator')}`} value={details.accountHolder} onChange={handleChange} required />
                <SettingsInputField name="accountNumber" label={`${t('admin.settingsManager.bankDetails.accountNumber')} ${t('admin.settingsManager.requiredFieldIndicator')}`} value={details.accountNumber} onChange={handleChange} required />
                <SettingsInputField name="accountType" label={t('admin.settingsManager.bankDetails.accountType')} value={details.accountType} onChange={handleChange} />
                <SettingsInputField name="taxId" label={t('admin.settingsManager.bankDetails.taxId')} value={details.taxId} onChange={handleChange} />
                <div>
                    <label htmlFor="details" className="block text-xs font-bold text-gray-500 mb-1">{t('admin.settingsManager.bankDetails.details')}</label>
                    <textarea id="details" name="details" value={details.details || ''} onChange={handleChange} rows={3} className="w-full p-2 border border-gray-300 rounded-lg"/>
                </div>
            </div>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">{t('admin.settingsManager.bankDetails.savedMessage')}</p>)}
                <button 
                  onClick={handleSave} 
                  disabled={isSaveDisabled}
                  className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {t('admin.settingsManager.bankDetails.saveButton')}
                </button>
            </div>
        </div>
    );
};

const PrerequisiteMessageEditor: React.FC = () => {
    const { t, language } = useLanguage();
    const [texts, setTexts] = useState({ title: '', message: '', confirmButton: '', goToIntroButton: '' });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchTexts = async () => {
            const uiTexts = await dataService.getUITexts(language);
            const prerequisiteTexts = (uiTexts as any)?.prerequisiteModal || {};
            setTexts({
                title: prerequisiteTexts.title || '',
                message: prerequisiteTexts.message || '',
                confirmButton: prerequisiteTexts.confirmButton || '',
                goToIntroButton: prerequisiteTexts.goToIntroButton || '',
            });
        };
        fetchTexts();
    }, [language]);

    const handleSave = async () => {
        const allTexts = await dataService.getUITexts(language);
        if (!allTexts.prerequisiteModal || typeof allTexts.prerequisiteModal !== 'object') {
            allTexts.prerequisiteModal = {};
        }
        (allTexts.prerequisiteModal as any).title = texts.title;
        (allTexts.prerequisiteModal as any).message = texts.message;
        (allTexts.prerequisiteModal as any).confirmButton = texts.confirmButton;
        (allTexts.prerequisiteModal as any).goToIntroButton = texts.goToIntroButton;

        await dataService.updateUITexts(language, allTexts);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        window.dispatchEvent(new CustomEvent('ui-text-changed'));
    };

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.settingsManager.prerequisiteMessageTitle')}</h3>
            <p className="text-xs text-brand-secondary mb-4">{t('admin.settingsManager.prerequisiteMessageSubtitle')}</p>
            <div className="space-y-4">
                <SettingsInputField name="prereq_title" label={t('admin.settingsManager.prerequisiteModalTitleLabel')} value={texts.title} onChange={(e) => setTexts(t => ({...t, title: e.target.value}))}/>
                <div>
                    <label htmlFor="prereq_message" className="block text-xs font-bold text-gray-500 mb-1">{t('admin.settingsManager.prerequisiteModalMessageLabel')}</label>
                    <textarea id="prereq_message" value={texts.message} onChange={(e) => setTexts(t => ({...t, message: e.target.value}))} rows={5} className="w-full p-2 border border-gray-300 rounded-lg"/>
                </div>
                <SettingsInputField name="prereq_confirm_button" label={t('admin.settingsManager.prerequisiteConfirmButtonLabel')} value={texts.confirmButton} onChange={(e) => setTexts(t => ({...t, confirmButton: e.target.value}))}/>
                <SettingsInputField name="prereq_redirect_button" label={t('admin.settingsManager.prerequisiteGoToIntroButtonLabel')} value={texts.goToIntroButton} onChange={(e) => setTexts(t => ({...t, goToIntroButton: e.target.value}))}/>
            </div>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">{t('admin.settingsManager.prerequisiteSavedMessage')}</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">{t('admin.settingsManager.savePrerequisiteButton')}</button>
            </div>
        </div>
    )
};


const NotificationTemplateEditor: React.FC = () => {
    const { t, language } = useLanguage();
    const [templates, setTemplates] = useState({ booking: '', inquiry: '' });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchTemplates = async () => {
            const texts = await dataService.getUITexts(language);
            const bookingTemplate = (texts as any)?.admin?.notifications?.template_new_booking || '';
            const inquiryTemplate = (texts as any)?.admin?.notifications?.template_new_inquiry || '';
            setTemplates({ booking: bookingTemplate, inquiry: inquiryTemplate });
        };
        fetchTemplates();
    }, [language]);
    
    const handleSave = async () => {
        const allTexts = await dataService.getUITexts(language);
        if (!allTexts.admin) allTexts.admin = {};
        if (typeof allTexts.admin !== 'object') allTexts.admin = {};
        if (!allTexts.admin.notifications) allTexts.admin.notifications = {};
        if (typeof allTexts.admin.notifications !== 'object') allTexts.admin.notifications = {};
        (allTexts.admin.notifications as any).template_new_booking = templates.booking;
        (allTexts.admin.notifications as any).template_new_inquiry = templates.inquiry;
        
        await dataService.updateUITexts(language, allTexts);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        window.dispatchEvent(new CustomEvent('ui-text-changed'));
    };

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.settingsManager.notificationTemplatesTitle')}</h3>
            <p className="text-xs text-brand-secondary mb-4">{t('admin.settingsManager.notificationTemplatesSubtitle')}</p>
            <div className="space-y-4">
                <SettingsInputField name="booking_template" label={t('admin.settingsManager.bookingTemplateLabel')} value={templates.booking} onChange={(e) => setTemplates(t => ({...t, booking: e.target.value}))}/>
                <SettingsInputField name="inquiry_template" label={t('admin.settingsManager.inquiryTemplateLabel')} value={templates.inquiry} onChange={(e) => setTemplates(t => ({...t, inquiry: e.target.value}))}/>
            </div>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">{t('admin.settingsManager.notificationTemplatesSavedMessage')}</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">{t('admin.settingsManager.saveNotificationTemplatesButton')}</button>
            </div>
        </div>
    )
}

const PoliciesEditor: React.FC = () => {
    const { t } = useLanguage();
    const [policiesText, setPoliciesText] = useState('');
    const [saved, setSaved] = useState(false);
    
    useEffect(() => {
        const fetchPolicies = async () => setPoliciesText(await dataService.getPolicies());
        fetchPolicies();
    }, []);

    const handleSave = async () => {
        await dataService.updatePolicies(policiesText);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <label htmlFor="policies" className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.settingsManager.policiesLabel')}</label>
            <textarea id="policies" value={policiesText} onChange={(e) => setPoliciesText(e.target.value)} rows={10} className="w-full p-2 border border-gray-300 rounded-lg"/>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">{t('admin.settingsManager.savedMessage')}</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">{t('admin.settingsManager.saveButton')}</button>
            </div>
        </div>
    );
};

const FooterInfoEditor: React.FC = () => {
    const { t } = useLanguage();
    const [footerInfo, setFooterInfo] = useState<FooterInfo | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchInfo = async () => setFooterInfo(await dataService.getFooterInfo());
        fetchInfo();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!footerInfo) return;
        const { name, value } = e.target;
        setFooterInfo(prev => ({ ...prev!, [name]: value }));
    };

    const handleSave = async () => {
        if (!footerInfo) return;
        await dataService.updateFooterInfo(footerInfo);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };
    
    if(!footerInfo) return <div>Loading...</div>

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.settingsManager.footerInfoTitle')}</h3>
            <p className="text-xs text-brand-secondary mb-4">{t('admin.settingsManager.footerInfoSubtitle')}</p>
            <div className="space-y-4">
                <SettingsInputField name="address" label={t('admin.settingsManager.addressLabel')} value={footerInfo.address} onChange={handleChange} />
                <SettingsInputField name="email" label={t('admin.settingsManager.emailLabel')} value={footerInfo.email} onChange={handleChange} />
                <SettingsInputField name="whatsapp" label={t('admin.settingsManager.whatsappLabel')} value={footerInfo.whatsapp} onChange={handleChange} />
                <SettingsInputField name="googleMapsLink" label={t('admin.settingsManager.googleMapsLabel')} value={footerInfo.googleMapsLink} onChange={handleChange} />
                <SettingsInputField name="instagramHandle" label={t('admin.settingsManager.instagramLabel')} value={footerInfo.instagramHandle} onChange={handleChange} />
            </div>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">{t('admin.settingsManager.footerSavedMessage')}</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">{t('admin.settingsManager.saveFooterButton')}</button>
            </div>
        </div>
    );
};


const UITextEditor: React.FC = () => {
    const { t, language } = useLanguage();
    const [texts, setTexts] = useState<UITexts>({});
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const loadTexts = async () => {
            try {
                const response = await fetch(`./locales/${language}.json`);
                const defaultTexts = await response.json();
                const storedTexts = await dataService.getUITexts(language);
                const mergedTexts = { ...defaultTexts, ...storedTexts };
                setTexts(mergedTexts);
            } catch (error) { console.error("Failed to load texts:", error); }
        };
        loadTexts();
    }, [language]);
    
    const handleTextChange = (keyPath: string, value: string) => {
        setTexts(prev => {
            const keys = keyPath.split('.');
            const newTexts = JSON.parse(JSON.stringify(prev));
            let current = newTexts;
            keys.slice(0, -1).forEach(key => current = current[key] = current[key] || {});
            current[keys[keys.length - 1]] = value;
            return newTexts;
        });
    };

    const handleSave = async () => {
        await dataService.updateUITexts(language, texts);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        window.dispatchEvent(new CustomEvent('ui-text-changed'));
    };

    const renderFields = (obj: any, path = '') => Object.keys(obj).map(key => {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            return (
                <div key={currentPath} className="pl-4 border-l-2 border-brand-primary/20">
                    <h4 className="font-bold text-brand-accent capitalize mt-4 mb-2">{key.replace(/([A-Z])/g, ' $1')}</h4>
                    {renderFields(obj[key], currentPath)}
                </div>
            );
        }
        return (
            <div key={currentPath} className="mb-3">
                <label htmlFor={currentPath} className="block text-xs font-semibold text-gray-500 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                <input id={currentPath} type="text" value={obj[key]} onChange={(e) => handleTextChange(currentPath, e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm"/>
            </div>
        );
    });

    return (
        <div className="bg-brand-background p-4 rounded-lg">
             <h3 className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.settingsManager.uiTextTitle')}</h3>
             <p className="text-xs text-brand-secondary mb-4">{t('admin.settingsManager.uiTextSubtitle')}</p>
             <div className="max-h-96 overflow-y-auto pr-4 -mr-4">{renderFields(texts)}</div>
             <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">{t('admin.settingsManager.uiTextSavedMessage')}</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">{t('admin.settingsManager.saveUiTextButton')}</button>
            </div>
        </div>
    );
};

const ConfirmationEditor: React.FC = () => {
    const { t } = useLanguage();
    const [message, setMessage] = useState<ConfirmationMessage | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchMsg = async () => setMessage(await dataService.getConfirmationMessage());
        fetchMsg();
    }, []);

    const handleSave = async () => {
        if (!message) return;
        await dataService.updateConfirmationMessage(message);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (!message) return <div>Loading...</div>;

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.settingsManager.confirmationMessageTitle')}</h3>
            <div className="space-y-4">
                <SettingsInputField name="confirmation_title" label={t('admin.settingsManager.confirmationHeaderLabel')} value={message.title} onChange={(e) => setMessage(m => ({...m!, title: e.target.value}))}/>
                <SettingsInputField name="confirmation_message" label={t('admin.settingsManager.confirmationMessageLabel')} value={message.message} onChange={(e) => setMessage(m => ({...m!, message: e.target.value}))}/>
            </div>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">{t('admin.settingsManager.confirmationSavedMessage')}</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">{t('admin.settingsManager.saveConfirmationButton')}</button>
            </div>
        </div>
    );
};

const CapacityEditor: React.FC = () => {
    const { t } = useLanguage();
    const [messages, setMessages] = useState<CapacityMessageSettings | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => setMessages(await dataService.getCapacityMessageSettings());
        fetchSettings();
    }, []);

    const handleThresholdChange = (index: number, field: keyof CapacityThreshold, value: string | number) => {
        if (!messages) return;
        const newThresholds = [...messages.thresholds];
        (newThresholds[index] as any)[field] = value;
        setMessages({ thresholds: newThresholds });
    };
    
    const handleSave = async () => {
        if (!messages) return;
        await dataService.updateCapacityMessageSettings(messages);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };
    
    if(!messages) return <div>Loading...</div>;

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.settingsManager.capacityMessagesTitle')}</h3>
            <div className="space-y-3">
                {messages.thresholds.map((tItem, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-2 text-xs font-semibold capitalize">{t(`admin.settingsManager.level${tItem.level.charAt(0).toUpperCase() + tItem.level.slice(1)}`)}:</span>
                        <div className="col-span-3">
                            <input type="number" value={tItem.threshold} onChange={(e) => handleThresholdChange(index, 'threshold', parseInt(e.target.value, 10) || 0)} className="w-full p-1 border border-gray-300 rounded-md text-xs" max="100" min="0"/>
                        </div>
                        <div className="col-span-7">
                            <input type="text" value={tItem.message} onChange={(e) => handleThresholdChange(index, 'message', e.target.value)} className="w-full p-1 border border-gray-300 rounded-md text-xs"/>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">{t('admin.settingsManager.messagesSavedMessage')}</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">{t('admin.settingsManager.saveMessagesButton')}</button>
            </div>
        </div>
    );
};

export const SettingsManager: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-serif text-brand-text mb-2 flex items-center gap-3">
                        <CogIcon className="w-6 h-6 text-brand-accent" />
                        {t('admin.settingsManager.title')}
                    </h2>
                    <p className="text-brand-secondary">{t('admin.settingsManager.subtitle')}</p>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-start gap-4">
                        <DocumentTextIcon className="w-8 h-8 text-brand-primary mt-1" />
                        <div className="flex-grow">
                            <h3 className="text-xl font-semibold text-brand-text">{t('admin.settingsManager.contentManagerTitle')}</h3>
                            <p className="text-brand-secondary text-sm mb-6">{t('admin.settingsManager.contentManagerSubtitle')}</p>
                            <div className="relative pl-6">
                                <div className="absolute top-0 left-0 h-full w-0.5 bg-brand-primary/20 rounded-full"></div>
                                <div className="space-y-6">
                                    <PoliciesEditor />
                                    <ConfirmationEditor />
                                    <CapacityEditor />
                                    <NotificationTemplateEditor />
                                    <PrerequisiteMessageEditor />
                                    <FooterInfoEditor />
                                    <UITextEditor />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-start gap-4">
                        <SparklesIcon className="w-8 h-8 text-brand-primary mt-1" />
                        <div className="flex-grow">
                            <h3 className="text-xl font-semibold text-brand-text">{t('admin.settingsManager.automation.managerTitle')}</h3>
                             <p className="text-brand-secondary text-sm mb-6">{t('admin.settingsManager.automation.managerSubtitle')}</p>
                            <div className="relative pl-6">
                                <div className="absolute top-0 left-0 h-full w-0.5 bg-brand-primary/20 rounded-full"></div>
                                <div className="space-y-6">
                                    <CommunicationAutomationManager />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-start gap-4">
                        <CurrencyDollarIcon className="w-8 h-8 text-brand-primary mt-1" />
                        <div className="flex-grow">
                            <h3 className="text-xl font-semibold text-brand-text">{t('admin.settingsManager.paymentSettings.title')}</h3>
                             <p className="text-brand-secondary text-sm mb-6">{t('admin.settingsManager.paymentSettings.subtitle')}</p>
                            <div className="relative pl-6">
                                <div className="absolute top-0 left-0 h-full w-0.5 bg-brand-primary/20 rounded-full"></div>
                                <div className="space-y-6">
                                    <BankDetailsEditor />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};