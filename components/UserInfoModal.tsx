import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { UserInfo } from '../types';
// Eliminado useLanguage, la app ahora es monolingüe en español
import { COUNTRIES } from '@/constants';
import { UserIcon } from './icons/UserIcon';
import { MailIcon } from './icons/MailIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { InfoCircleIcon } from './icons/InfoCircleIcon';
import { GiftIcon } from './icons/GiftIcon';
import { slotsRequireNoRefund } from '../utils/bookingPolicy';
import { BirthdaySelector } from './common/BirthdaySelector';

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
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitDisabled) return;
        if (validate()) {
            setSubmitDisabled(true);
            try {
                await Promise.resolve(onSubmit({
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
                }));
            } catch (error) {
                console.error('Error submitting user info:', error);
                setSubmitDisabled(false);
                setErrors(prev => ({
                    ...prev,
                    submit: error instanceof Error ? error.message : 'Error al guardar. Intenta de nuevo.'
                }));
            }
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
            className="fixed inset-0 bg-black/60 z-50 overflow-y-auto animate-fade-in"
            onClick={onClose}
        >
            <div className="min-h-screen flex items-center justify-center p-3 sm:p-6">
                <div
                    className="bg-brand-surface rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-2xl my-4 animate-fade-in-up"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-center mb-4 sm:mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-brand-primary mb-1">Información del Cliente</h2>
                        <p className="text-brand-secondary text-sm">Completa tus datos para continuar.</p>
                    </div>
                    {/* Mensaje de error general */}
                    {Object.keys(errors).length > 0 && (
                      <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-800 font-semibold text-center text-sm">
                        {errors.submit || 'Por favor completa los campos obligatorios.'}
                      </div>
                    )}
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                            <label htmlFor="phone" className="block text-sm font-semibold text-brand-secondary mb-1">Número de Teléfono</label>
                            <div className={`flex items-center border-2 rounded-lg transition-colors ${isPhoneFocused ? 'ring-2 ring-brand-primary border-brand-primary' : (errors.phone ? 'border-red-500' : 'border-brand-border')}`}> 
                                <select 
                                    value={country.name} onChange={(e) => setCountry(COUNTRIES.find(c => c.name === e.target.value) || COUNTRIES[0])}
                                    onFocus={() => setIsPhoneFocused(true)} onBlur={() => setIsPhoneFocused(false)}
                                    className="pl-2 py-2 border-r border-brand-border rounded-l-lg bg-gray-50 focus:outline-none text-sm"
                                >
                                    {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.flag} {c.code}</option>)}
                                </select>
                                <div className="relative flex-grow">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-secondary"><PhoneIcon className="w-4 h-4"/></div>
                                    <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s-]/g, ''))}
                                        onFocus={() => setIsPhoneFocused(true)} onBlur={handlePhoneBlur} placeholder="99 123 4567"
                                        className="w-full pl-9 pr-3 py-2 rounded-r-lg focus:outline-none text-base" maxLength={20} required
                                    />
                                </div>
                            </div>
                            {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
                            {country.code === '+593' && !errors.phone && <p className="text-brand-secondary text-xs mt-1">Ingresa tus 9 dígitos, sin el 0 inicial.</p>}
                        </div>

                        <div className="p-3 sm:p-4 border-2 border-rose-200 rounded-lg bg-rose-50/70 space-y-3">
                            <div className="flex items-start gap-2">
                                <GiftIcon className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-brand-text">¡Queremos celebrar contigo!</h4>
                                    <p className="text-xs text-brand-secondary mt-1">Comparte tu fecha de nacimiento.</p>
                                </div>
                            </div>
                            <BirthdaySelector value={birthday} onChange={setBirthday} disabled={optOutBirthday} error={errors.birthday} />
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-secondary hover:text-brand-text transition-colors">
                                <div className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors flex-shrink-0 ${optOutBirthday ? 'bg-brand-primary' : 'bg-gray-300'}`}>
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${optOutBirthday ? 'translate-x-4' : 'translate-x-0.5'}`}/>
                                </div>
                                <input type="checkbox" checked={optOutBirthday} onChange={e => setOptOutBirthday(e.target.checked)} className="hidden" />
                                {'Prefiero no recibir regalos de cumpleaños.'}
                            </label>
                        </div>

                    </div>
                    <div className="mt-6 pt-4 border-t border-brand-border space-y-3">
                        <div className="flex items-start gap-2 bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg text-blue-800">
                            <InfoCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-sm">Facturación Obligatoria</h4>
                                <p className="text-xs mt-1">Completa los datos para emitir tu factura.</p>
                            </div>
                        </div>
                        <div className="space-y-3 p-3 sm:p-4 border-2 border-brand-border rounded-lg bg-brand-background">
                            <InputField id="companyName" name="companyName" label="Razón Social o Nombre Completo" value={invoiceData.companyName} onChange={handleInvoiceDataChange} error={errors.companyName} required />
                            <InputField id="taxId" name="taxId" label="RUC / Cédula" value={invoiceData.taxId} onChange={handleInvoiceDataChange} error={errors.taxId} required />
                            <InputField id="address" name="address" label="Dirección Fiscal" value={invoiceData.address} onChange={handleInvoiceDataChange} error={errors.address} required />
                            <InputField id="invoiceEmail" name="email" label="Email de Facturación (opcional)" value={invoiceData.email} onChange={handleInvoiceDataChange} type="email" placeholder="Dejar en blanco para usar el email principal" error={errors.invoiceEmail} />
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-brand-border space-y-3">
                        {requiresNoRefundAcceptance && (
                            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 flex items-start gap-2">
                                <InfoCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-700" />
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-yellow-900">No Reembolsable</h4>
                                    <p className="text-xs mt-1 text-yellow-800">
                                        Esta reserva <strong>no es reembolsable ni reagendable</strong> (menos de 48h).
                                    </p>
                                    <div className="flex items-start mt-2">
                                        <input 
                                            id="accept-no-refund" 
                                            type="checkbox" 
                                            checked={acceptedNoRefund} 
                                            onChange={(e) => setAcceptedNoRefund(e.target.checked)}
                                            className="h-4 w-4 text-brand-primary border-yellow-400 rounded focus:ring-brand-primary mt-0.5 flex-shrink-0"
                                        />
                                        <label htmlFor="accept-no-refund" className="ml-2 text-xs text-yellow-900 font-medium">
                                            Entiendo y acepto
                                        </label>
                                    </div>
                                    {errors.acceptedNoRefund && <p className="text-red-600 text-xs mt-1 ml-6">{errors.acceptedNoRefund}</p>}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex items-start gap-2">
                            <input id="accept-policies" type="checkbox" checked={acceptedPolicies} onChange={(e) => setAcceptedPolicies(e.target.checked)}
                                className="h-4 w-4 text-brand-primary border-brand-border rounded focus:ring-brand-primary mt-0.5 flex-shrink-0"
                            />
                            <label htmlFor="accept-policies" className="text-xs text-brand-secondary">
                                {'Acepto las '}<span className="font-semibold text-brand-primary">Políticas y Devoluciones</span>.
                            </label>
                        </div>
                        {errors.acceptedPolicies && <p className="text-red-600 text-xs mt-1 ml-6">{errors.acceptedPolicies}</p>}
                    </div>
                    <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="order-2 sm:order-1 px-5 py-2.5 rounded-lg border-2 border-brand-border text-brand-text font-semibold hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-sm active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button type="submit"
                                disabled={isSaveDisabled}
                            className="order-1 sm:order-2 flex-1 px-6 py-2.5 bg-brand-primary text-white font-bold rounded-lg hover:shadow-lg hover:opacity-95 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none text-sm active:scale-95"
                        >
                            {'Guardar y Continuar'}
                        </button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    );
};