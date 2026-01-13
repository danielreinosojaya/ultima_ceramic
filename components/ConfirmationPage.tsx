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
import { useEffect } from 'react';
import { FEATURE_FLAGS } from '../featureFlags.ts';

interface ConfirmationPageProps {
    booking: Booking;
    bankDetails: BankDetails[];
    footerInfo: FooterInfo;
    policies: string;
    onFinish: () => void;
    onNavigateToMyClasses?: () => void;
    appliedGiftcardHold?: { holdId: string; expiresAt?: string; amount: number } | null;
}

export const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ booking, bankDetails, footerInfo, policies, onFinish, onNavigateToMyClasses, appliedGiftcardHold }) => {
    // Eliminado useLanguage, la app ahora es monolingüe en español
    const language = 'es-ES';
    const [copied, setCopied] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    // 🔴 CRÍTICO: Verificar si booking está completamente vacío
    console.error('🔴 CRITICO ConfirmationPage mounting:', {
        bookingExists: !!booking,
        bookingType: typeof booking,
        bookingKeys: booking ? Object.keys(booking) : 'NULL',
        bookingCodeExists: !!(booking && booking.bookingCode),
        bookingCodeValue: booking?.bookingCode,
        bookingCodeType: typeof booking?.bookingCode,
        fullBooking: JSON.stringify(booking, null, 2)
    });

    const isPackage = booking.product.type === 'CLASS_PACKAGE';
    const originalPrice = isPackage ? booking.product.price : booking.price;
    const subtotal = booking.price / (1 + VAT_RATE);
    const vat = booking.price - subtotal;
    const discount = originalPrice - subtotal;

    // Prefer the explicit prop from App; fallback to booking.appliedGiftcardHold if present
    const appliedHold = appliedGiftcardHold ?? (booking as any).appliedGiftcardHold ?? null;

    // Limpiar pre-reservas expiradas cuando se muestra la confirmación
    useEffect(() => {
        // OPTIMIZACIÓN: Esta llamada es redundante con ExpiredBookingsManager que ya limpia
        // automáticamente las reservas expiradas cada 5 minutos con smart polling.
        // Comentado para reducir network calls en 1 request por confirmación.
        // const expireOldBookings = async () => {
        //     try {
        //         await fetch('/api/data?action=expireOldBookings', { method: 'GET' });
        //     } catch (error) {
        //         console.error('[ConfirmationPage] Error expiring bookings:', error);
        //     }
        // };
        // expireOldBookings();
    }, []);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    const whatsappMessage = `¡Hola! Mi código de pre-reserva es *${booking.bookingCode}*. Adjunto el comprobante de pago para validar mi reserva.`;
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

    // DEBUG: Runtime logging
    console.log('🔍 DEBUG ConfirmationPage:', {
        bookingCode: booking.bookingCode,
        bankDetailsProp: bankDetails,
        isArray: Array.isArray(bankDetails),
        length: bankAccounts.length,
        data: bankAccounts
    });

        return (
            <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-brand-surface rounded-xl shadow-lifted animate-fade-in-up">
            {/* Header */}
            <div className="text-center mb-6">
                <CheckCircleIcon className="w-20 h-20 text-brand-success mx-auto mb-4" />
                <h2 className="text-4xl font-bold text-brand-text mb-3">¡Pre-Reserva Confirmada!</h2>
                <p className="text-brand-secondary text-base">Tu cupo está guardado. Sigue las instrucciones de pago para completar tu reserva.</p>
            </div>

            {/* Resumen de Reserva - CLARO Y PROMINENTE */}
            <div className="mb-6 bg-white border-2 border-brand-primary rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-bold text-brand-primary mb-4 flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    Resumen de tu Reserva
                </h3>
                
                <div className="space-y-4 mb-6">
                    {/* Producto/Técnica */}
                    <div className="pb-4 border-b border-brand-border">
                        <p className="text-xs text-brand-secondary font-semibold uppercase mb-1">Experiencia</p>
                        <p className="text-lg font-bold text-brand-text">{booking.product.name}</p>
                    </div>
                    
                    {/* Detalles de la reserva */}
                    <div className="grid grid-cols-2 gap-4">
                        {booking.slots && booking.slots.length > 0 && (
                            <>
                                <div>
                                    <p className="text-xs text-brand-secondary font-semibold mb-1">📅 Fecha</p>
                                    <p className="text-sm font-bold text-brand-text">{(() => {
                                        const dateStr = booking.slots[0].date;
                                        const [year, month, day] = dateStr.split('-').map(Number);
                                        const localDate = new Date(year, month - 1, day);
                                        return localDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    })()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-brand-secondary font-semibold mb-1">🕐 Hora</p>
                                    <p className="text-sm font-bold text-brand-text">{booking.slots[0].time} - {(() => {
                                        const [h, m] = booking.slots[0].time.split(':').map(Number);
                                        return `${String((h + 2) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                    })()}</p>
                                </div>
                            </>
                        )}
                        
                        <div>
                            <p className="text-xs text-brand-secondary font-semibold mb-1">👥 Participantes</p>
                            <p className="text-sm font-bold text-brand-text">{booking.participants || 1} {(booking.participants || 1) === 1 ? 'persona' : 'personas'}</p>
                        </div>
                        
                        <div>
                            <p className="text-xs text-brand-secondary font-semibold mb-1">⏱️ Duración</p>
                            <p className="text-sm font-bold text-brand-text">2 horas</p>
                        </div>
                    </div>
                    
                    {/* Técnica si está disponible */}
                    {(booking as any).technique && (
                        <div className="pt-2">
                            <p className="text-xs text-brand-secondary font-semibold mb-1">🎨 Técnica</p>
                            <p className="text-sm font-bold text-brand-text capitalize">{(booking as any).technique}</p>
                        </div>
                    )}
                </div>

                {/* PRECIO PROMINENTE */}
                <div className="bg-gradient-to-r from-brand-primary/5 to-brand-accent/5 border-2 border-brand-primary rounded-lg p-5 text-center mb-4">
                    <p className="text-xs font-semibold text-brand-secondary uppercase tracking-wider mb-2">Monto a Pagar</p>
                    <p className="text-5xl font-bold text-brand-primary mb-1">{formatPrice(booking.price)}</p>
                    <div className="text-xs text-brand-secondary space-y-1">
                        <p>Subtotal: {formatPrice(subtotal)}</p>
                        <p>IVA ({(VAT_RATE * 100).toFixed(0)}%): {formatPrice(vat)}</p>
                    </div>
                </div>
            </div>

            {/* Código de Pre-Reserva */}
            <div className="mb-6 bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 border-2 border-brand-primary rounded-lg p-6 text-center">
                <p className="text-xs font-semibold text-brand-secondary uppercase tracking-wider mb-3">Tu Código de Pre-Reserva</p>
                <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                    <p className="text-2xl sm:text-4xl font-bold text-brand-primary font-mono tracking-wider break-all" style={{ letterSpacing: '0.1em' }}>{booking.bookingCode}</p>
                    <button 
                        onClick={() => handleCopy(booking.bookingCode)} 
                        className="p-3 bg-white rounded-full text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-md hover:shadow-lg" 
                        title="Copiar código"
                    >
                        {copied ? <CheckCircleIcon className="w-6 h-6 text-brand-success" /> : <DocumentDuplicateIcon className="w-6 h-6" />}
                    </button>
                </div>
                <p className="text-xs text-brand-secondary mt-3">Guarda este código. Lo necesitarás al enviar tu comprobante de pago.</p>
            </div>

            {/* Advertencia de expiración en 2 horas */}
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-5 rounded-r-lg">
                <div className="flex items-start gap-3">
                    <span className="text-yellow-600 text-2xl font-bold">⏰</span>
                    <div>
                        <h3 className="font-bold text-yellow-900 mb-2">Pre-reserva válida por 2 horas</h3>
                        <p className="text-sm text-yellow-800 mb-2">
                            Esta pre-reserva estará disponible solo durante las próximas <strong>2 horas</strong>. Si no realizas el pago en este tiempo, 
                            tu lugar será liberado y tendrás que volver a hacer el proceso de reserva.
                        </p>
                        {(() => {
                            const createdDate = new Date(booking.createdAt);
                            const expirationTime = new Date(createdDate.getTime() + (2 * 60 * 60 * 1000));
                            const now = new Date();
                            const diffMs = expirationTime.getTime() - now.getTime();
                            
                            if (diffMs <= 0) {
                                return <p className="text-xs text-red-600 font-mono font-bold">⚠️ EXPIRÓ</p>;
                            }
                            
                            return (
                                <p className="text-sm text-yellow-700 font-mono font-semibold">
                                    ⏱️ Expira a las: {expirationTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Advertencia de tolerancia de 15 minutos */}
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-5 rounded-r-lg">
                <div className="flex items-start gap-3">
                    <InfoCircleIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="font-bold text-blue-900 mb-2">Tolerancia el día de la clase</h3>
                        <p className="text-sm text-blue-800">
                            Tienes <strong>15 minutos de tolerancia</strong> desde la hora de inicio de la clase. Después de este tiempo, no se permiten ingresos tardíos.
                        </p>
                    </div>
                </div>
            </div>

            {/* Datos para tu Transferencia - Cuentas Bancarias */}
            {bankAccounts && bankAccounts.length > 0 && (
                <div className="mb-6 bg-white p-6 rounded-lg border-2 border-brand-border shadow-md">
                    <h3 className="text-lg font-bold text-brand-text mb-4 flex items-center gap-2">
                        <BankIcon className="w-6 h-6 text-brand-primary" />
                        Datos para tu Transferencia
                    </h3>
                    <div className="space-y-4">
                        {bankAccounts.map((acc, idx) => (
                            <div key={idx} className="bg-brand-background rounded-lg p-4 border-l-4 border-brand-primary">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-xs text-brand-secondary font-semibold uppercase mb-1">Banco</p>
                                        <p className="font-bold text-brand-text text-base">{acc.bankName}</p>
                                    </div>
                                    <button
                                        className="text-xs bg-brand-primary text-white px-4 py-2 rounded-full shadow hover:bg-brand-accent transition-colors font-semibold"
                                        onClick={() => {
                                            navigator.clipboard.writeText(acc.accountNumber);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        title="Copiar número de cuenta"
                                    >
                                        {copied ? '¡Copiado!' : 'Copiar Nº'}
                                    </button>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <p className="text-xs text-brand-secondary font-semibold">Titular:</p>
                                        <p className="text-brand-text font-medium">{acc.accountHolder}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-brand-secondary font-semibold">Número de Cuenta:</p>
                                        <p className="text-brand-primary font-mono font-bold text-lg">{acc.accountNumber}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <p className="text-brand-secondary font-semibold">Tipo:</p>
                                            <p className="text-brand-text">{acc.accountType}</p>
                                        </div>
                                        <div>
                                            <p className="text-brand-secondary font-semibold">Cédula:</p>
                                            <p className="text-brand-text font-mono">{acc.taxId}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {bankAccounts.length > 2 && (
                        <button
                            onClick={() => setModalOpen(true)}
                            className="w-full text-sm text-brand-primary font-semibold hover:text-brand-accent transition-colors py-2 border-t border-brand-border pt-4 mt-4"
                        >
                            Ver todas las {bankAccounts.length} cuentas bancarias →
                        </button>
                    )}
                </div>
            )}

            {/* Giftcard summary block */}
            {appliedHold && (
                <div className="mb-6 bg-green-50 border-2 border-green-400 p-5 rounded-lg">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🎁</span>
                        <div className="flex-1">
                            <h4 className="font-bold text-green-900 mb-3">Pago Parcial con Giftcard</h4>
                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-green-800">Precio total:</span>
                                    <span className="font-bold text-green-900">{formatPrice(booking.price)}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white p-2 rounded">
                                    <span className="text-green-700">Cubierto por Giftcard:</span>
                                    <span className="font-bold text-green-600">{formatPrice(appliedHold.amount || 0)}</span>
                                </div>
                                <div className="border-t border-green-300 pt-2 flex justify-between items-center font-bold">
                                    <span className="text-green-900">Aún debes pagar:</span>
                                    <span className={`text-lg ${(booking.price - (appliedHold.amount || 0)) <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                        {formatPrice(Math.max(0, booking.price - (appliedHold.amount || 0)))}
                                    </span>
                                </div>
                            </div>
                            { (booking.price - (appliedHold.amount || 0)) <= 0 ? (
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full font-bold text-sm">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    ¡Reserva completamente pagada!
                                </div>
                            ) : (
                                <p className="text-sm text-green-800"><strong>Importante:</strong> Debes pagar el monto restante ({formatPrice(Math.max(0, booking.price - (appliedHold.amount || 0)))}) para completar tu reserva.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ¿Qué sigue? - Próximos pasos */}
            <div className="mb-6 bg-brand-background p-6 rounded-lg">
                <h3 className="text-lg font-bold text-brand-text mb-4">¿Qué sigue ahora?</h3>
                <ol className="space-y-4 text-left">
                    <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary text-white font-bold flex-shrink-0">1</span>
                        <div>
                            <span className="text-brand-text font-semibold">Realiza el pago de {formatPrice(booking.price)}</span>
                            <p className="text-brand-secondary text-sm">Transfiere <strong>exactamente {formatPrice(booking.price)}</strong> a cualquiera de las cuentas bancarias mostradas arriba. <strong>Incluye tu código {booking.bookingCode} en la descripción</strong> para una validación más rápida.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary text-white font-bold flex-shrink-0">2</span>
                        <div>
                            <span className="text-brand-text font-semibold">Envía tu código + comprobante por WhatsApp</span>
                            <p className="text-brand-secondary text-sm">Usa el botón de abajo para enviar tu código <span className="font-mono font-bold text-brand-primary">{booking.bookingCode}</span> junto al comprobante de pago.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary text-white font-bold flex-shrink-0">3</span>
                        <div>
                            <span className="text-brand-text font-semibold">Validación interna</span>
                            <p className="text-brand-secondary text-sm">Nuestro equipo revisará tu comprobante y validará el pago en el sistema.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary text-white font-bold flex-shrink-0">4</span>
                        <div>
                            <span className="text-brand-text font-semibold">Recibe tu confirmación final</span>
                            <p className="text-brand-secondary text-sm">Una vez validado el pago, recibirás un correo electrónico confirmando tu reserva final.</p>
                        </div>
                    </li>
                </ol>
            </div>

            {/* Botón de WhatsApp */}
            <div className="mb-6">
                <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 bg-green-500 text-white font-bold py-4 px-8 rounded-xl hover:bg-green-600 transition-all duration-300 shadow-lg text-lg hover:scale-105"
                >
                    <WhatsAppIcon className="w-7 h-7" />
                    Enviar Código y Comprobante por WhatsApp
                </a>
                <p className="text-xs text-brand-secondary text-center mt-2">
                    Haz click arriba para abrir WhatsApp con tu código prellenado
                </p>
            </div>

            <BankAccountsModal open={modalOpen} onClose={() => setModalOpen(false)} accounts={bankAccounts} />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 pt-6 border-t border-brand-border">
                <button
                    onClick={onFinish}
                    className="w-full sm:w-auto bg-brand-primary text-white font-bold py-3 px-10 rounded-lg hover:opacity-90 transition-opacity duration-300 shadow-md text-base"
                >
                    Volver al Inicio
                </button>
                {onNavigateToMyClasses && FEATURE_FLAGS.CURSO_TORNO && (
                    <button
                        onClick={onNavigateToMyClasses}
                        className="w-full sm:w-auto bg-brand-accent text-white font-bold py-3 px-10 rounded-lg hover:opacity-90 transition-opacity duration-300 shadow-md text-base"
                    >
                        Ver mis Clases
                    </button>
                )}
            </div>
        </div>
    );
};