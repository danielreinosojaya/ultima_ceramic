import React, { useState } from 'react';
import type { Booking, BankDetails, FooterInfo, Product, ClassPackage } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { DocumentDuplicateIcon } from './icons/DocumentDuplicateIcon';
import { InfoCircleIcon } from './icons/InfoCircleIcon';
import { generateBookingPDF } from '../services/pdfService';
import { DownloadIcon } from './icons/DownloadIcon';
import { SINGLE_CLASS_PRICE, VAT_RATE } from '../constants';

interface ConfirmationPageProps {
    booking: Booking;
    bankDetails: BankDetails;
    footerInfo: FooterInfo;
    policies: string;
    onFinish: () => void;
}

export const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ booking, bankDetails, footerInfo, policies, onFinish }) => {
    const { t, language } = useLanguage();
    const [copied, setCopied] = useState(false);

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
    
    const whatsappMessage = t('confirmation.whatsappPreffiledMessage', { code: booking.bookingCode });
    const whatsappLink = `https://wa.me/${footerInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
    
    const handleDownloadTicket = async () => {
        const product = booking.product as Product & { details: any };
        
        const pdfTranslations = {
            title: t('pdf.title'),
            schoolName: t('pdf.schoolName'),
            customerInfoTitle: t('pdf.customerInfoTitle'),
            statusNotPaid: t('pdf.statusNotPaid'),
            bookingCode: t('pdf.bookingCode'),
            packageName: product.name,
            packageDetailsTitle: t('pdf.packageDetailsTitle'),
            durationLabel: t('pdf.durationLabel'),
            durationValue: product.details?.duration || '-',
            activitiesLabel: t('pdf.activitiesLabel'),
            activitiesValue: product.details?.activities || [],
            generalRecommendationsLabel: t('pdf.generalRecommendationsLabel'),
            generalRecommendationsValue: product.details?.generalRecommendations || '-',
            materialsLabel: t('pdf.materialsLabel'),
            materialsValue: product.details?.materials || '-',
            scheduleTitle: t('pdf.scheduleTitle'),
            dateHeader: t('pdf.dateHeader'),
            timeHeader: t('pdf.timeHeader'),
            instructorHeader: t('pdf.instructorHeader'),
            importantInfoTitle: t('pdf.importantInfoTitle'),
            policy: policies,
            addressLabel: t('pdf.addressLabel'),
            emailLabel: t('pdf.emailLabel'),
            whatsappLabel: t('pdf.whatsappLabel'),
            googleMapsLabel: t('pdf.googleMapsLabel'),
            instagramLabel: t('pdf.instagramLabel')
        };
        
        await generateBookingPDF(booking, pdfTranslations, footerInfo, language);
    };

    return (
        <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-brand-surface rounded-xl shadow-lifted animate-fade-in-up">
            <div className="text-center">
                <CheckCircleIcon className="w-16 h-16 text-brand-success mx-auto" />
                <h2 className="text-3xl font-semibold text-brand-text mt-4">{t('confirmation.title')}</h2>
                <p className="text-brand-secondary mt-2">{t('confirmation.subtitle')}</p>
            </div>

            <div className="mt-8 bg-brand-background p-6 rounded-lg text-center">
                <p className="text-sm font-semibold text-brand-secondary uppercase tracking-wider">{t('confirmation.bookingCodeLabel')}</p>
                <div className="flex items-center justify-center gap-3 mt-2">
                    <p className="text-3xl font-bold text-brand-primary font-mono tracking-widest">{booking.bookingCode}</p>
                    <button onClick={() => handleCopy(booking.bookingCode)} className="p-2 text-brand-secondary hover:text-brand-primary transition-colors" title={t('confirmation.copyCode')}>
                        {copied ? <CheckCircleIcon className="w-5 h-5 text-brand-success" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
            
            {booking.product.type === 'OPEN_STUDIO_SUBSCRIPTION' && (
                <div className="mt-6 flex items-start gap-3 bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-md text-blue-800 text-left animate-fade-in">
                    <InfoCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-xs">{t('summary.activationNotice')}</p>
                </div>
            )}
            
            <div className="mt-8">
                <div className="mt-4 bg-brand-background p-6 rounded-lg space-y-2 text-sm">
                    {isPackage && discount > 0 && (
                        <>
                            <div className="flex justify-between">
                                <span className="text-brand-secondary">{t('summary.originalPrice')} ({(booking.product as ClassPackage).classes} x ${SINGLE_CLASS_PRICE})</span>
                                <span className="text-brand-secondary line-through">${originalPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-green-600 font-semibold">{t('summary.packageDiscount')}</span>
                                <span className="text-green-600 font-semibold">-${discount.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-brand-border/50 my-2"></div>
                        </>
                    )}
                    <div className="flex justify-between">
                        <span className="text-brand-secondary">{t('summary.subtotal')}</span>
                        <span className="font-semibold text-brand-text">${subtotal.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-brand-secondary">{t('summary.vat')}</span>
                        <span className="font-semibold text-brand-text">${vat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-xl border-t-2 border-brand-border pt-2 mt-2">
                        <span className="text-brand-text">{t('summary.totalToPay')}</span>
                        <span className="text-brand-text">${booking.price.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold text-brand-text text-center">{t('confirmation.paymentInstructionsTitle')}</h3>
                <div className="mt-4 bg-brand-background p-6 rounded-lg space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-brand-secondary">{t('confirmation.bankName')}:</span>
                        <span className="font-semibold text-brand-text">{bankDetails.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-brand-secondary">{t('confirmation.accountHolder')}:</span>
                        <span className="font-semibold text-brand-text">{bankDetails.accountHolder}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-brand-secondary">{t('confirmation.accountNumber')}:</span>
                        <span className="font-semibold text-brand-text">{bankDetails.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-brand-secondary">{t('confirmation.accountType')}:</span>
                        <span className="font-semibold text-brand-text">{bankDetails.accountType}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-brand-secondary">{t('confirmation.taxId')}:</span>
                        <span className="font-semibold text-brand-text">{bankDetails.taxId}</span>
                    </div>
                </div>
                 <p className="text-center text-sm text-brand-secondary mt-4 italic">{t('confirmation.whatsappInstruction', { code: booking.bookingCode })}</p>
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
                        {t('confirmation.whatsappButton')}
                    </a>
                    <button
                        onClick={handleDownloadTicket}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-primary text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity duration-300"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        {t('confirmation.downloadTicket')}
                    </button>
                 </div>
                <button
                    onClick={onFinish}
                    className="w-full sm:w-auto bg-transparent border border-brand-secondary text-brand-secondary font-bold py-2 px-8 rounded-lg hover:bg-brand-secondary hover:text-white transition-colors duration-300"
                >
                    {t('confirmation.finishButton')}
                </button>
            </div>
        </div>
    );
};