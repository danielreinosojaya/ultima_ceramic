import React, { useState } from 'react';
import { BankAccountsModal } from './BankAccountsModal';
import type { Booking, BankDetails, FooterInfo, Product, ClassPackage } from '../types';
// Eliminado useLanguage, la app ahora es monolingüe en español
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { BankIcon } from './icons/BankIcon';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { DocumentDuplicateIcon } from './icons/DocumentDuplicateIcon';
import { InfoCircleIcon } from './icons/InfoCircleIcon';
import { generateBookingPDF } from '../services/pdfService';
import { formatPrice } from '../utils/formatters';
import { DownloadIcon } from './icons/DownloadIcon';
import { SINGLE_CLASS_PRICE, VAT_RATE } from '../constants';

interface ConfirmationPageProps {
    booking: Booking;
    bankDetails: BankDetails[];
    footerInfo: FooterInfo;
    policies: string;
    onFinish: () => void;
}

export const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ booking, bankDetails, footerInfo, policies, onFinish }) => {
    // Eliminado useLanguage, la app ahora es monolingüe en español
    const language = 'es-ES';
    const [copied, setCopied] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    const isPackage = booking.product.type === 'CLASS_PACKAGE';
    const originalPrice = isPackage ? (booking.product as ClassPackage).classes * SINGLE_CLASS_PRICE : booking.price;
    const subtotal = booking.price / (1 + VAT_RATE);
    const vat = booking.price - subtotal;
    const discount = originalPrice - subtotal;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    const whatsappMessage = `¡Hola! Mi código de reserva es ${booking.bookingCode}.`;
    const whatsappLink = `https://wa.me/${footerInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
    
    const handleDownloadTicket = async () => {
        const product = booking.product as Product & { details: any };
        const pdfTranslations = {
            title: 'Comprobante de Reserva',
            schoolName: 'CeramicAlma',
            customerInfoTitle: 'Datos del Cliente',
            statusNotPaid: 'No Pagado',
            bookingCode: 'Código de Reserva',
            packageName: product.name,
            packageDetailsTitle: 'Detalles del Paquete',
            durationLabel: 'Duración',
            durationValue: product.details?.duration || '-',
            activitiesLabel: 'Actividades',
            activitiesValue: product.details?.activities || [],
            generalRecommendationsLabel: 'Recomendaciones Generales',
            generalRecommendationsValue: product.details?.generalRecommendations || '-',
            materialsLabel: 'Materiales',
            materialsValue: product.details?.materials || '-',
            scheduleTitle: 'Horario',
            dateHeader: 'Fecha',
            timeHeader: 'Hora',
            instructorHeader: 'Instructor',
            importantInfoTitle: 'Información Importante',
            policyTitle: 'Política',
            addressLabel: 'Dirección',
            emailLabel: 'Correo Electrónico',
            whatsappLabel: 'WhatsApp',
            googleMapsLabel: 'Google Maps',
            instagramLabel: 'Instagram',
            accessDurationLabel: 'Duración de Acceso',
            accessIncludesLabel: 'Incluye Acceso',
            howItWorksLabel: 'Cómo Funciona',
            days: 'Días',
        };
        await generateBookingPDF(booking, pdfTranslations, footerInfo, policies, language);
    };

    // Use the array from admin settings, fallback to [] if not array
    const bankAccounts = Array.isArray(bankDetails) ? bankDetails : (bankDetails ? [bankDetails] : []);

        return (
            <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-brand-surface rounded-xl shadow-lifted animate-fade-in-up">
            <div className="text-center">
                <CheckCircleIcon className="w-16 h-16 text-brand-success mx-auto" />
                <h2 className="text-3xl font-semibold text-brand-text mt-4">¡Pre-reserva Confirmada!</h2>
                <p className="text-brand-secondary mt-2">Tu cupo está guardado. Sigue las instrucciones de pago para completar tu reserva.</p>
            </div>

            {/* Sección de pasos a seguir */}
            <div className="mt-8 bg-brand-background p-6 rounded-lg shadow-subtle">
                <h3 className="text-lg font-semibold text-brand-text mb-4">¿Qué sigue?</h3>
                <ol className="space-y-4 text-left">
                    <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary text-white font-bold">1</span>
                        <div>
                            <span className="text-brand-text font-semibold">Realiza el pago</span>
                            <p className="text-brand-secondary text-sm">Utiliza cualquiera de las cuentas bancarias disponibles para transferir el monto total de tu reserva.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary text-white font-bold">2</span>
                        <div>
                            <span className="text-brand-text font-semibold">Envía el comprobante por WhatsApp</span>
                            <p className="text-brand-secondary text-sm">Comparte el comprobante de pago al número de WhatsApp indicado para validar tu reserva.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary text-white font-bold">3</span>
                        <div>
                            <span className="text-brand-text font-semibold">Validación interna</span>
                            <p className="text-brand-secondary text-sm">Nuestro equipo revisará tu comprobante y validará el pago en el sistema.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary text-white font-bold">4</span>
                        <div>
                            <span className="text-brand-text font-semibold">Recibe tu confirmación final</span>
                            <p className="text-brand-secondary text-sm">Una vez validado el pago, recibirás un correo electrónico confirmando tu reserva final.</p>
                        </div>
                    </li>
                </ol>
            </div>

            <div className="mt-8 bg-brand-background p-6 rounded-lg text-center">
                <p className="text-sm font-semibold text-brand-secondary uppercase tracking-wider">TU CÓDIGO DE RESERVA</p>
                <div className="flex items-center justify-center gap-3 mt-2">
                    <p className="text-3xl font-bold text-brand-primary font-mono tracking-widest">{booking.bookingCode}</p>
                    <button onClick={() => handleCopy(booking.bookingCode)} className="p-2 text-brand-secondary hover:text-brand-primary transition-colors" title="Copiar código">
                        {copied ? <CheckCircleIcon className="w-5 h-5 text-brand-success" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <div className="mt-8 bg-brand-background p-6 rounded-lg">
                <div className="flex justify-between text-brand-secondary">
                    <span>Subtotal</span>
                    <span>${formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-brand-secondary">
                    <span>IVA (15%)</span>
                    <span>${formatPrice(vat)}</span>
                </div>
                <div className="flex justify-between font-bold text-xl border-t-2 border-brand-border pt-2 mt-2">
                    <span className="text-brand-text">Total a Pagar</span>
                    <span className="text-brand-text">${formatPrice(booking.price)}</span>
                </div>
            </div>

            <div className="mt-8 flex flex-col items-center justify-center">
                <button
                    onClick={() => setModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:scale-105 transition-transform text-lg mb-2"
                    style={{ aspectRatio: '4/1', minHeight: '64px' }}
                >
                    <BankIcon className="w-7 h-7" />
                    Ver todas las cuentas bancarias
                </button>
                <BankAccountsModal open={modalOpen} onClose={() => setModalOpen(false)} accounts={bankAccounts} />
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
                <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-600 transition-colors duration-300"
                    >
                        <WhatsAppIcon className="w-5 h-5" />
                        Enviar comprobante
                    </a>
                    <button
                        onClick={handleDownloadTicket}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-primary text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity duration-300"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Descargar Ticket de Reserva
                    </button>
                </div>
                <button
                    onClick={onFinish}
                    className="w-full sm:w-auto bg-transparent border border-brand-secondary text-brand-secondary font-bold py-2 px-8 rounded-lg hover:bg-brand-secondary hover:text-white transition-colors duration-300"
                >
                    Volver al Inicio
                </button>
            </div>
        </div>
    );
};