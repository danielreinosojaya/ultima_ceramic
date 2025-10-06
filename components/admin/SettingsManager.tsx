import React, { useState, useEffect, useCallback } from 'react';
// import { useLanguage } from '../../context/LanguageContext';
import * as dataService from '../../services/dataService';
// ...other existing imports...

const BankAccountsManager: React.FC = () => {
    // const { t } = useLanguage();
    const [accounts, setAccounts] = useState([]);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ bankName: '', accountHolder: '', accountNumber: '', accountType: '', taxId: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAccounts = async () => {
            setLoading(true);
            const details = await dataService.getBankDetails();
            setAccounts(Array.isArray(details) ? details : [details]);
            setLoading(false);
        };
        fetchAccounts();
    }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const handleEdit = (acc, idx) => { setEditing(idx); setForm(acc); };
    const handleDelete = async (idx) => {
        const updated = accounts.filter((_, i) => i !== idx);
        setAccounts(updated);
        await dataService.updateBankDetails(updated);
    };
    const handleSave = async () => {
        let updated;
        if (editing !== null) {
            updated = accounts.map((acc, i) => (i === editing ? form : acc));
        } else {
            updated = [...accounts, form];
        }
        setAccounts(updated);
        await dataService.updateBankDetails(updated);
        setEditing(null);
        setForm({ bankName: '', accountHolder: '', accountNumber: '', accountType: '', taxId: '' });
    };
    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">Cuentas Bancarias</h3>
            <p className="text-xs text-brand-secondary mb-4">Administra las cuentas bancarias que se mostrarán a los clientes.</p>
            <div className="space-y-4">
                {accounts.map((acc, idx) => (
                    <div key={idx} className="bg-white rounded-lg shadow p-4 flex flex-col gap-2 border border-brand-border">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-brand-primary">{acc.bankName}</span>
                            <div className="flex gap-2">
                                <button className="text-xs text-brand-accent underline" onClick={() => handleEdit(acc, idx)}>Editar</button>
                                <button className="text-xs text-red-500 underline" onClick={() => handleDelete(idx)}>Eliminar</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="font-semibold text-brand-secondary">Titular:</span> {acc.accountHolder}</div>
                            <div><span className="font-semibold text-brand-secondary">Número:</span> {acc.accountNumber}</div>
                            <div><span className="font-semibold text-brand-secondary">Tipo:</span> {acc.accountType}</div>
                            <div><span className="font-semibold text-brand-secondary">RUC:</span> {acc.taxId}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-6">
                <h4 className="font-bold text-brand-text mb-2">{editing !== null ? 'Editar Cuenta' : 'Agregar Nueva Cuenta'}</h4>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <input name="bankName" value={form.bankName} onChange={handleChange} placeholder="Banco" className="p-2 rounded border border-brand-border" />
                    <input name="accountHolder" value={form.accountHolder} onChange={handleChange} placeholder="Titular" className="p-2 rounded border border-brand-border" />
                    <input name="accountNumber" value={form.accountNumber} onChange={handleChange} placeholder="Número" className="p-2 rounded border border-brand-border" />
                    <input name="accountType" value={form.accountType} onChange={handleChange} placeholder="Tipo" className="p-2 rounded border border-brand-border" />
                    <input name="taxId" value={form.taxId} onChange={handleChange} placeholder="RUC" className="p-2 rounded border border-brand-border" />
                </div>
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent mt-2">{editing !== null ? 'Guardar Cambios' : 'Agregar Cuenta'}</button>
                {editing !== null && <button onClick={() => { setEditing(null); setForm({ bankName: '', accountHolder: '', accountNumber: '', accountType: '', taxId: '' }); }} className="ml-4 text-xs text-brand-secondary underline">Cancelar</button>}
            </div>
        </div>
    );
};
// ...existing code...
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
    // const { t } = useLanguage();
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
                Automatización de Comunicaciones
            </h3>
            <p className="text-xs text-brand-secondary mb-4">
                Configura los recordatorios y notificaciones automáticas para los clientes.
            </p>

            <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-r-lg mb-6">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-bold">Variables de entorno necesarias</h3>
                        <div className="mt-2 text-sm">
                            <p>Para enviar correos automáticos, asegúrate de definir las siguientes variables de entorno:</p>
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
                    <span className="font-semibold text-sm">Confirmación de pre-reserva</span>
                    <button onClick={() => handleToggle('preBookingConfirmation')} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.preBookingConfirmation.enabled ? 'bg-brand-success' : 'bg-gray-300'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.preBookingConfirmation.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                 <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Recibo de pago</span>
                    <button onClick={() => handleToggle('paymentReceipt')} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.paymentReceipt.enabled ? 'bg-brand-success' : 'bg-gray-300'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.paymentReceipt.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                 <div>
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Recordatorio de clase</span>
                        <button onClick={() => handleToggle('classReminder')} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.classReminder.enabled ? 'bg-brand-success' : 'bg-gray-300'}`}>
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.classReminder.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    {settings.classReminder.enabled && (
                        <div className="flex items-center gap-2 mt-2 pl-4 animate-fade-in-fast">
                            <span className="text-sm">Enviar recordatorio</span>
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
                                <option value="hours">Horas</option>
                                <option value="days">Días</option>
                            </select>
                             <span className="text-sm">antes de la clase</span>
                        </div>
                    )}
                </div>
            </div>
             <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (
                    <p className="text-sm font-semibold text-brand-success animate-fade-in">
                        Guardado correctamente
                    </p>
                )}
                <button
                    onClick={handleSave}
                    className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent"
                >
                    Guardar
                </button>
            </div>
        </div>
    );
};

const BankDetailsEditor: React.FC = () => {
    // const { t } = useLanguage();
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
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">Detalles Bancarios</h3>
            <p className="text-xs text-brand-secondary mb-4">Edita los detalles bancarios que se mostrarán a los clientes.</p>
            <div className="space-y-4">
                <SettingsInputField name="bankName" label="Banco *" value={details.bankName} onChange={handleChange} required />
                <SettingsInputField name="accountHolder" label="Titular *" value={details.accountHolder} onChange={handleChange} required />
                <SettingsInputField name="accountNumber" label="Número *" value={details.accountNumber} onChange={handleChange} required />
                <SettingsInputField name="accountType" label="Tipo" value={details.accountType} onChange={handleChange} />
                <SettingsInputField name="taxId" label="RUC" value={details.taxId} onChange={handleChange} />
                <div>
                    <label htmlFor="details" className="block text-xs font-bold text-gray-500 mb-1">Detalles adicionales</label>
                    <textarea id="details" name="details" value={details.details || ''} onChange={handleChange} rows={3} className="w-full p-2 border border-gray-300 rounded-lg"/>
                </div>
            </div>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">Guardado correctamente</p>)}
                                <button 
                                    onClick={handleSave} 
                                    disabled={isSaveDisabled}
                                    className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                        Guardar
                                </button>
            </div>
        </div>
    );
};

const PrerequisiteMessageEditor: React.FC = () => {
    // const { t, language } = useLanguage();
    const [texts, setTexts] = useState({ title: '', message: '', confirmButton: '', goToIntroButton: '' });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchTexts = async () => {
            const uiTexts = await dataService.getUITexts('es');
            const prerequisiteTexts = (uiTexts as any)?.prerequisiteModal || {};
            setTexts({
                title: prerequisiteTexts.title || '',
                message: prerequisiteTexts.message || '',
                confirmButton: prerequisiteTexts.confirmButton || '',
                goToIntroButton: prerequisiteTexts.goToIntroButton || '',
            });
        };
        fetchTexts();
    }, []);

    const handleSave = async () => {
    const allTexts = await dataService.getUITexts('es');
        if (!allTexts.prerequisiteModal || typeof allTexts.prerequisiteModal !== 'object') {
            allTexts.prerequisiteModal = {};
        }
        (allTexts.prerequisiteModal as any).title = texts.title;
        (allTexts.prerequisiteModal as any).message = texts.message;
        (allTexts.prerequisiteModal as any).confirmButton = texts.confirmButton;
        (allTexts.prerequisiteModal as any).goToIntroButton = texts.goToIntroButton;

    await dataService.updateUITexts('es', allTexts);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        window.dispatchEvent(new CustomEvent('ui-text-changed'));
    };

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">Mensaje de prerrequisito</h3>
            <p className="text-xs text-brand-secondary mb-4">Edita el mensaje que se muestra cuando un usuario no cumple los requisitos.</p>
            <div className="space-y-4">
                <SettingsInputField name="prereq_title" label="Título" value={texts.title} onChange={(e) => setTexts(t => ({...t, title: e.target.value}))}/>
                <div>
                    <label htmlFor="prereq_message" className="block text-xs font-bold text-gray-500 mb-1">Mensaje</label>
                    <textarea id="prereq_message" value={texts.message} onChange={(e) => setTexts(t => ({...t, message: e.target.value}))} rows={5} className="w-full p-2 border border-gray-300 rounded-lg"/>
                </div>
                <SettingsInputField name="prereq_confirm_button" label="Botón de confirmación" value={texts.confirmButton} onChange={(e) => setTexts(t => ({...t, confirmButton: e.target.value}))}/>
                <SettingsInputField name="prereq_redirect_button" label="Botón para ir a introducción" value={texts.goToIntroButton} onChange={(e) => setTexts(t => ({...t, goToIntroButton: e.target.value}))}/>
            </div>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">Guardado correctamente</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">Guardar</button>
            </div>
        </div>
    )
};


const NotificationTemplateEditor: React.FC = () => {
    // const { t, language } = useLanguage();
    const [templates, setTemplates] = useState({ booking: '', inquiry: '' });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchTemplates = async () => {
            const texts = await dataService.getUITexts('es');
            const bookingTemplate = (texts as any)?.admin?.notifications?.template_new_booking || '';
            const inquiryTemplate = (texts as any)?.admin?.notifications?.template_new_inquiry || '';
            setTemplates({ booking: bookingTemplate, inquiry: inquiryTemplate });
        };
        fetchTemplates();
    }, []);
    
    const handleSave = async () => {
    const allTexts = await dataService.getUITexts('es');
        if (!allTexts.admin) allTexts.admin = {};
        if (typeof allTexts.admin !== 'object') allTexts.admin = {};
        if (!allTexts.admin.notifications) allTexts.admin.notifications = {};
        if (typeof allTexts.admin.notifications !== 'object') allTexts.admin.notifications = {};
        (allTexts.admin.notifications as any).template_new_booking = templates.booking;
        (allTexts.admin.notifications as any).template_new_inquiry = templates.inquiry;
        
    await dataService.updateUITexts('es', allTexts);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        window.dispatchEvent(new CustomEvent('ui-text-changed'));
    };

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">Plantillas de notificación</h3>
            <p className="text-xs text-brand-secondary mb-4">Edita las plantillas de notificación para reservas y consultas.</p>
            <div className="space-y-4">
                <SettingsInputField name="booking_template" label="Plantilla de reserva" value={templates.booking} onChange={(e) => setTemplates(t => ({...t, booking: e.target.value}))}/>
                <SettingsInputField name="inquiry_template" label="Plantilla de consulta" value={templates.inquiry} onChange={(e) => setTemplates(t => ({...t, inquiry: e.target.value}))}/>
            </div>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">Guardado correctamente</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">Guardar</button>
            </div>
        </div>
    )
}

const PoliciesEditor: React.FC = () => {
    // const { t } = useLanguage();
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
            <label htmlFor="policies" className="block text-sm font-bold text-brand-secondary mb-1">Políticas</label>
            <textarea id="policies" value={policiesText} onChange={(e) => setPoliciesText(e.target.value)} rows={10} className="w-full p-2 border border-gray-300 rounded-lg"/>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">Guardado correctamente</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">Guardar</button>
            </div>
        </div>
    );
};

const FooterInfoEditor: React.FC = () => {
    // const { t } = useLanguage();
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
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">Información de pie de página</h3>
            <p className="text-xs text-brand-secondary mb-4">Edita la información de contacto y redes sociales que aparece en el pie de página.</p>
            <div className="space-y-4">
                <SettingsInputField name="address" label="Dirección" value={footerInfo.address} onChange={handleChange} />
                <SettingsInputField name="email" label="Correo electrónico" value={footerInfo.email} onChange={handleChange} />
                <SettingsInputField name="whatsapp" label="WhatsApp" value={footerInfo.whatsapp} onChange={handleChange} />
                <SettingsInputField name="googleMapsLink" label="Enlace de Google Maps" value={footerInfo.googleMapsLink} onChange={handleChange} />
                <SettingsInputField name="instagramHandle" label="Instagram" value={footerInfo.instagramHandle} onChange={handleChange} />
            </div>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">Guardado correctamente</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">Guardar</button>
            </div>
        </div>
    );
};


const UITextEditor: React.FC = () => {
    // const { t, language } = useLanguage();
    const [texts, setTexts] = useState<UITexts>({});
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const loadTexts = async () => {
            try {
                // Evitar requests innecesarios a archivos de traducciones
                // Solo usar datos del servidor para reducir network requests
                const storedTexts = await dataService.getUITexts('es');
                setTexts(storedTexts || {});
                console.log('Loaded texts without extra file requests');
            } catch (error) { 
                console.error("Failed to load texts:", error);
                setTexts({});
            }
        };
        loadTexts();
    }, []);
    
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
    await dataService.updateUITexts('es', texts);
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
             <h3 className="block text-sm font-bold text-brand-secondary mb-1">Textos de la interfaz</h3>
             <p className="text-xs text-brand-secondary mb-4">Edita los textos personalizados de la interfaz de usuario.</p>
             <div className="max-h-96 overflow-y-auto pr-4 -mr-4">{renderFields(texts)}</div>
             <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">Guardado correctamente</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">Guardar</button>
            </div>
        </div>
    );
};

const ConfirmationEditor: React.FC = () => {
    // const { t } = useLanguage();
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
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">Mensaje de confirmación</h3>
            <div className="space-y-4">
                <SettingsInputField name="confirmation_title" label="Título" value={message.title} onChange={(e) => setMessage(m => ({...m!, title: e.target.value}))}/>
                <SettingsInputField name="confirmation_message" label="Mensaje" value={message.message} onChange={(e) => setMessage(m => ({...m!, message: e.target.value}))}/>
            </div>
            <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">Guardado correctamente</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">Guardar</button>
            </div>
        </div>
    );
};

const CapacityEditor: React.FC = () => {
    // const { t } = useLanguage();
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
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">Mensajes de capacidad</h3>
            <div className="space-y-3">
                {messages.thresholds.map((tItem, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-2 text-xs font-semibold capitalize">{tItem.level === 'low' ? 'Bajo' : tItem.level === 'medium' ? 'Medio' : 'Alto'}:</span>
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
                {saved && (<p className="text-sm font-semibold text-brand-success animate-fade-in">Guardado correctamente</p>)}
                <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">Guardar</button>
            </div>
        </div>
    );
};

export const SettingsManager: React.FC = () => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-serif text-brand-text mb-2 flex items-center gap-3">
                        <CogIcon className="w-6 h-6 text-brand-accent" />
                        Configuración
                    </h2>
                    <p className="text-brand-secondary">Administra la configuración general del sistema.</p>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-start gap-4">
                        <DocumentTextIcon className="w-8 h-8 text-brand-primary mt-1" />
                        <div className="flex-grow">
                            <h3 className="text-xl font-semibold text-brand-text">Gestión de contenido</h3>
                            <p className="text-brand-secondary text-sm mb-6">Administra los textos, políticas y mensajes que se muestran a los usuarios.</p>
                            <div className="relative pl-6">
                                <div className="absolute top-0 left-0 h-full w-0.5 bg-brand-primary/20 rounded-full"></div>
                                <div className="space-y-6">
                                    <BankAccountsManager />
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
                            <h3 className="text-xl font-semibold text-brand-text">Automatización</h3>
                             <p className="text-brand-secondary text-sm mb-6">Configura los recordatorios y notificaciones automáticas.</p>
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
                            <h3 className="text-xl font-semibold text-brand-text">Pagos</h3>
                             <p className="text-brand-secondary text-sm mb-6">Edita la información bancaria y métodos de pago.</p>
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