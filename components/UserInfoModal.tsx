import React, { useState, useMemo } from 'react';
import type { UserInfo } from '../types';
// Eliminado useLanguage, la app ahora es monolingüe en español
import { COUNTRIES } from '@/constants';
import { UserIcon } from './icons/UserIcon';
import { MailIcon } from './icons/MailIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { InfoCircleIcon } from './icons/InfoCircleIcon';
import { GiftIcon } from './icons/GiftIcon';
import { slotsRequireNoRefund } from '../utils/bookingPolicy';

interface InvoiceData {
    companyName: string;
    taxId: string;
    address: string;
    email: string;
}
interface UserInfoModalProps {
  onClose: () => void;
  onSubmit: (data: { userInfo: UserInfo, needsInvoice: boolean, invoiceData?: InvoiceData, acceptedNoRefund?: boolean }) => void;
  onShowPolicies: () => void;
  slots?: any[];
}

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
    disabled?: boolean;
}> = ({ id, name, label, value, onChange, placeholder, type = 'text', error, icon, required, disabled }) => (
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
                className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${error ? 'border-red-500' : 'border-brand-border'} disabled:bg-gray-100`}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                required={required}
                disabled={disabled}
            />
        </div>
        {error && <p id={`${id}-error`} className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
);

export const UserInfoModal: React.FC<UserInfoModalProps> = ({ onClose, onSubmit, onShowPolicies, slots = [] }) => {
    // Eliminado useLanguage, la app ahora es monolingüe en español
    // User info state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState(COUNTRIES[0]);
    const [birthday, setBirthday] = useState('');
    const [optOutBirthday, setOptOutBirthday] = useState(false);
    
    // Invoice state
    const [invoiceData, setInvoiceData] = useState<InvoiceData>({
        companyName: '', taxId: '', address: '', email: ''
    });

    // UI and validation state
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isPhoneFocused, setIsPhoneFocused] = useState(false);
    const [acceptedPolicies, setAcceptedPolicies] = useState(false);
    const [acceptedNoRefund, setAcceptedNoRefund] = useState(false);
    
    // Check if booking requires no-refund acceptance (48-hour policy)
    const requiresNoRefundAcceptance = useMemo(() => {
        return slotsRequireNoRefund(slots, 48);
    }, [slots]);
    const [submitDisabled, setSubmitDisabled] = useState(false);
    
    const validatePhone = (phoneNum: string): string | null => {
        const digits = phoneNum.replace(/\D/g, '');
        if (!digits) {
            return 'Este campo es obligatorio.';
        }

        if (country.code === '+593') {
            if (digits.length !== 9) {
                return 'El número debe tener 9 dígitos para Ecuador.';
            }
        } else {
            if (digits.length < 7 || digits.length > 15) {
                return 'El número de teléfono no es válido.';
            }
        }
        return null;
    };

    const handlePhoneBlur = () => {
        const phoneError = validatePhone(phone);
        setErrors(prev => ({...prev, phone: phoneError || '' }));
        setIsPhoneFocused(false);
    }

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!firstName.trim()) newErrors.firstName = 'Este campo es obligatorio.';
        if (!lastName.trim()) newErrors.lastName = 'Este campo es obligatorio.';
        if (!email.trim()) {
            newErrors.email = 'Este campo es obligatorio.';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'El correo electrónico no es válido.';
        }

        const phoneError = validatePhone(phone);
        if (phoneError) newErrors.phone = phoneError;

        if (!birthday && !optOutBirthday) newErrors.birthday = 'Este campo es obligatorio.';

        if (!invoiceData.companyName.trim()) newErrors.companyName = 'Este campo es obligatorio.';
        if (!invoiceData.taxId.trim()) newErrors.taxId = 'Este campo es obligatorio.';
        if (!invoiceData.address.trim()) newErrors.address = 'Este campo es obligatorio.';
        if (invoiceData.email && !/\S+@\S+\.\S+/.test(invoiceData.email)) newErrors.invoiceEmail = 'El correo electrónico no es válido.';

        if (!acceptedPolicies) newErrors.acceptedPolicies = 'Debes aceptar las políticas.';
        if (requiresNoRefundAcceptance && !acceptedNoRefund) newErrors.acceptedNoRefund = 'Debes aceptar la política de no reembolso ni reagendamiento.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
            if (submitDisabled) return;
            if (validate()) {
            setSubmitDisabled(true);
            onSubmit({
                userInfo: { 
                    firstName, 
                    lastName, 
                    email, 
                    phone, 
                    countryCode: country.code,
                    birthday: optOutBirthday ? null : birthday
                },
                needsInvoice: true,
                invoiceData: { ...invoiceData, email: invoiceData.email || email },
                acceptedNoRefund: requiresNoRefundAcceptance ? acceptedNoRefund : false
            });
        }
    };

    const handleInvoiceDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInvoiceData(prev => ({ ...prev, [name]: value }));
    }
    
        // El botón solo se deshabilita tras submit exitoso
        const isSaveDisabled = submitDisabled;

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-brand-surface rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl my-8 animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-brand-primary mb-2">Información del Cliente</h2>
                    <p className="text-brand-secondary text-base">Por favor, completa tus datos para generar el ticket de reserva.</p>
                </div>
                {/* Mensaje de error general */}
                {Object.keys(errors).length > 0 && (
                  <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-800 font-semibold text-center">
                    {'Por favor completa los campos obligatorios marcados en rojo.'}
                  </div>
                )}
                <form onSubmit={handleSubmit} noValidate>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <InputField 
                                id="firstName" label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Ej: Ana" error={errors.firstName} icon={<UserIcon className="w-5 h-5"/>} required
                            />
                            <InputField 
                                id="lastName" label="Apellidos" value={lastName} onChange={(e) => setLastName(e.target.value)}
                                placeholder="Ej: Pérez Gómez" error={errors.lastName} required
                            />
                        </div>
                        <InputField 
                            id="email" label="Correo Electrónico" value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com" type="email" error={errors.email} icon={<MailIcon className="w-5 h-5"/>} required
                        />
                        <div>
                            <label htmlFor="phone" className="block text-sm font-semibold text-brand-secondary mb-2">Número de Teléfono</label>
                            <div className={`flex items-center border-2 rounded-lg transition-colors ${isPhoneFocused ? 'ring-2 ring-brand-primary border-brand-primary' : (errors.phone ? 'border-red-500' : 'border-brand-border')}`}> 
                                <select 
                                    value={country.name} onChange={(e) => setCountry(COUNTRIES.find(c => c.name === e.target.value) || COUNTRIES[0])}
                                    onFocus={() => setIsPhoneFocused(true)} onBlur={() => setIsPhoneFocused(false)}
                                    className="pl-3 py-3 border-r border-brand-border rounded-l-lg bg-gray-50 focus:outline-none font-medium"
                                >
                                    {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.flag} {c.code}</option>)}
                                </select>
                                <div className="relative flex-grow">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-secondary"><PhoneIcon className="w-5 h-5"/></div>
                                    <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s-]/g, ''))}
                                        onFocus={() => setIsPhoneFocused(true)} onBlur={handlePhoneBlur} placeholder="99 123 4567"
                                        className="w-full pl-10 pr-4 py-3 rounded-r-lg focus:outline-none text-base" maxLength={20} required
                                    />
                                </div>
                            </div>
                            {errors.phone && <p className="text-red-600 text-xs mt-2">{errors.phone}</p>}
                            {country.code === '+593' && !errors.phone && <p className="text-brand-secondary text-xs mt-2">Ingresa tus 9 dígitos, sin el 0 inicial.</p>}
                        </div>

                        <div className="p-5 border-2 border-rose-200 rounded-lg bg-rose-50/70 space-y-4">
                            <div className="flex items-start gap-3">
                                <GiftIcon className="w-7 h-7 text-rose-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-base text-brand-text">¡Queremos celebrar contigo!</h4>
                                    <p className="text-sm text-brand-secondary mt-1">Comparte tu fecha de nacimiento y recibe sorpresas y descuentos especiales de nuestra parte.</p>
                                </div>
                            </div>
                            <InputField id="birthday" label="" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} disabled={optOutBirthday} error={errors.birthday} placeholder="dd/mm/yyyy" />
                            <label className="flex items-center gap-3 cursor-pointer text-sm text-brand-secondary hover:text-brand-text transition-colors">
                                <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors flex-shrink-0 ${optOutBirthday ? 'bg-brand-primary' : 'bg-gray-300'}`}>
                                    <span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${optOutBirthday ? 'translate-x-5' : 'translate-x-1'}`}/>
                                </div>
                                <input type="checkbox" checked={optOutBirthday} onChange={e => setOptOutBirthday(e.target.checked)} className="hidden" />
                                {'Prefiero no recibir regalos de cumpleaños.'}
                            </label>
                        </div>

                    </div>
                    <div className="mt-8 pt-6 border-t border-brand-border space-y-4">
                        <div className="flex items-start gap-3 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg text-blue-800">
                            <InfoCircleIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-base">La Facturación es Obligatoria</h4>
                                <p className="text-sm mt-2">De acuerdo a la legislación tributaria del SRI, todos nuestros servicios requieren la emisión de una factura. Por favor, completa los siguientes campos.</p>
                            </div>
                        </div>
                        <div className="space-y-5 mt-5 p-5 border-2 border-brand-border rounded-lg bg-brand-background">
                            <InputField id="companyName" name="companyName" label="Razón Social o Nombre Completo" value={invoiceData.companyName} onChange={handleInvoiceDataChange} error={errors.companyName} required />
                            <InputField id="taxId" name="taxId" label="RUC / Cédula" value={invoiceData.taxId} onChange={handleInvoiceDataChange} error={errors.taxId} required />
                            <InputField id="address" name="address" label="Dirección Fiscal" value={invoiceData.address} onChange={handleInvoiceDataChange} error={errors.address} required />
                            <InputField id="invoiceEmail" name="email" label="Email de Facturación (opcional)" value={invoiceData.email} onChange={handleInvoiceDataChange} type="email" placeholder="Dejar en blanco para usar el email principal" error={errors.invoiceEmail} />
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-brand-border space-y-5">
                        {requiresNoRefundAcceptance && (
                            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-5 flex items-start gap-3">
                                <InfoCircleIcon className="w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-700" />
                                <div className="flex-1">
                                    <h4 className="font-bold text-base text-yellow-900">Política de No Reembolso ni Reagendamiento</h4>
                                    <p className="text-sm mt-2 text-yellow-800">
                                        Has seleccionado una clase que inicia en menos de 48 horas. De acuerdo con nuestras políticas, 
                                        <strong> las reservas realizadas con menos de 48 horas de anticipación no son reembolsables ni reagendables</strong>.
                                    </p>
                                    <div className="flex items-start mt-4">
                                        <input 
                                            id="accept-no-refund" 
                                            type="checkbox" 
                                            checked={acceptedNoRefund} 
                                            onChange={(e) => setAcceptedNoRefund(e.target.checked)}
                                            className="h-5 w-5 text-brand-primary border-yellow-400 rounded focus:ring-brand-primary mt-0.5 flex-shrink-0"
                                        />
                                        <label htmlFor="accept-no-refund" className="ml-3 text-sm text-yellow-900 font-medium">
                                            Entiendo y acepto que esta reserva no es reembolsable ni reagendable
                                        </label>
                                    </div>
                                    {errors.acceptedNoRefund && <p className="text-red-600 text-xs mt-2 ml-8">{errors.acceptedNoRefund}</p>}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex items-start gap-3">
                            <input id="accept-policies" type="checkbox" checked={acceptedPolicies} onChange={(e) => setAcceptedPolicies(e.target.checked)}
                                className="h-5 w-5 text-brand-primary border-brand-border rounded focus:ring-brand-primary mt-1 flex-shrink-0"
                            />
                            <label htmlFor="accept-policies" className="text-sm text-brand-secondary">
                                {'He leído y acepto las '}<span className="font-semibold text-brand-primary">Políticas Internas y Proceso de Devoluciones</span>.
                            </label>
                        </div>
                        {errors.acceptedPolicies && <p className="text-red-600 text-xs mt-1 ml-8">{errors.acceptedPolicies}</p>}
                    </div>
                    <div className="mt-8 flex gap-3 justify-end">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-lg border-2 border-brand-border text-brand-text font-semibold hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button type="submit"
                                disabled={isSaveDisabled}
                            className="px-8 py-3 bg-brand-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {'Guardar y Continuar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};