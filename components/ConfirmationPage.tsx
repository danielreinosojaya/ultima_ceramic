import React, { useState } from 'react';
import { BankAccountsModal } from './BankAccountsModal';
import type { Booking, BankDetails, FooterInfo, Product, ClassPackage } from '../types';
// Eliminado useLanguage, la app ahora es monolingüe en español
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { BankIcon } from './icons/BankIcon';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { DocumentDuplicateIcon } from './icons/DocumentDuplicateIcon';
import { generateBookingPDF } from '../services/pdfService';
import { formatPrice } from '../utils/formatters';
import { DownloadIcon } from './icons/DownloadIcon';
import { SINGLE_CLASS_PRICE, VAT_RATE } from '../constants';
import { useEffect } from 'react';
import { FEATURE_FLAGS } from '../featureFlags.ts';
import type { GroupTechnique } from '../types';
import { uploadPaymentProof } from '../services/dataService';
import { getClassPackageValidityDescription, getClassPackageValidityLabel } from '../utils/classPackageValidity';
import { GiftcardApplyToBooking } from './giftcard/GiftcardApplyToBooking';
import { getBookingPaymentSplit } from '../utils/giftcardPayment';
import {
    getBookingDisplayName,
    getTechniqueDisplayName,
    isCreativeExperienceBooking,
    getBookingParticipantCount,
    formatParticipantsLabel,
    formatPriceBreakdown,
    getBookingDurationLabel,
} from '../utils/bookingDisplay';

/** Solo mostrar "Técnica" si el cliente eligió torno/modelado/pintura, no el código interno. */
const getCustomerFacingTechniqueLabel = (booking: Booking): string | null => {
    if (!booking.technique || isCreativeExperienceBooking(booking)) return null;

    const typesWhereTechniqueIsAChoice = new Set([
        'COUPLES_EXPERIENCE',
        'CUSTOM_GROUP_EXPERIENCE',
        'GROUP_CLASS',
        'CLASS_PACKAGE',
    ]);
    if (!typesWhereTechniqueIsAChoice.has(booking.productType || '')) return null;

    const label = getTechniqueDisplayName(booking.technique as GroupTechnique);
    const experienceName = getBookingDisplayName(booking);
    if (experienceName && label && experienceName.toLowerCase() === label.toLowerCase()) return null;
    return label;
};

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
    const [proofUploading, setProofUploading] = useState(false);
    const [proofUploaded, setProofUploaded] = useState(booking.status === 'pending_verification');
    const [proofError, setProofError] = useState<string | null>(null);
    const [localBooking, setLocalBooking] = useState(booking);

    useEffect(() => {
        setLocalBooking(booking);
    }, [booking]);

    // � DEBUG: Verificar que booking llegó correctamente a ConfirmationPage
    console.log('✅ ConfirmationPage mounted with booking:', {
        bookingCode: booking?.bookingCode,
        productType: booking?.productType,
        price: booking?.price,
        technique: booking?.technique,
        slots: booking?.slots?.length || 0
    });

    const isPackage = localBooking.product.type === 'CLASS_PACKAGE';
    const originalPrice = isPackage ? localBooking.product.price : localBooking.price;
    const subtotal = localBooking.price / (1 + VAT_RATE);
    const vat = localBooking.price - subtotal;
    const discount = originalPrice - subtotal;

    // Prefer the explicit prop from App; fallback to booking.appliedGiftcardHold if present
    const appliedHold = appliedGiftcardHold ?? (localBooking as any).appliedGiftcardHold ?? null;
    const paymentSplit = getBookingPaymentSplit(localBooking);
    const holdExtra =
        appliedHold && paymentSplit.giftcardApplied < (appliedHold.amount || 0) - 0.009
            ? Number(appliedHold.amount) || 0
            : 0;
    const amountDue = Math.max(0, localBooking.price - paymentSplit.paid - holdExtra);
    const isFullyPaid = localBooking.isPaid || amountDue <= 0.009;
    const techniqueLabel = getCustomerFacingTechniqueLabel(localBooking);
    const participantCount = getBookingParticipantCount(localBooking);
    const participantLabel = formatParticipantsLabel(participantCount);
    const durationLabel = getBookingDurationLabel(localBooking);
    const priceBreakdown = formatPriceBreakdown(localBooking.price, participantCount);

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

    const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setProofError('El archivo es muy grande. Máximo 5MB.');
            return;
        }
        const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowed.includes(file.type)) {
            setProofError('Solo se aceptan imágenes JPG, PNG o archivos PDF.');
            return;
        }
        setProofUploading(true);
        setProofError(null);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const base64Data = ev.target?.result as string;
                const result = await uploadPaymentProof(booking.id!, base64Data, file.name);
                if (result.success) {
                    // success = true even when Bunny is unavailable: status was still protected from expiry
                    setProofUploaded(true);
                    if (!result.bunnyAvailable) {
                        setProofError('Tu reserva fue protegida. El archivo no pudo guardarse en línea — por favor contáctanos si el problema persiste.');
                    }
                } else {
                    setProofError(result.error || 'Error al subir el comprobante. Por favor intenta de nuevo.');
                }
            } catch {
                setProofError('Error al subir el comprobante. Por favor intenta de nuevo.');
            } finally {
                setProofUploading(false);
            }
        };
        reader.onerror = () => {
            setProofError('Error leyendo el archivo.');
            setProofUploading(false);
        };
        reader.readAsDataURL(file);
    };
    
    const whatsappSlot = booking.slots && booking.slots.length > 0 ? booking.slots[0] : null;
    const whatsappDate = whatsappSlot?.date
        ? (() => {
            const [year, month, day] = whatsappSlot.date.split('-').map(Number);
            const localDate = new Date(year, month - 1, day);
            return localDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        })()
        : 'fecha por confirmar';
    const whatsappTime = whatsappSlot?.time ? ` (${whatsappSlot.time})` : '';
    const whatsappActivity = getBookingDisplayName(booking);

    const whatsappMessage = `¡Hola! Tengo una pregunta sobre mi reserva con código *${booking.bookingCode}* — *${whatsappActivity}* para *${participantLabel}* el *${whatsappDate}${whatsappTime}*.`;
    const whatsappLink = `https://wa.me/${footerInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
    
    const handleDownloadTicket = async () => {
        const product = booking.product as Product & { details: any };
        const pdfTranslations = {
            title: 'Comprobante de Reserva',
            schoolName: 'CeramicAlma',
            customerInfoTitle: 'Datos del Cliente',
            statusNotPaid: 'No Pagado',
            bookingCode: 'Código de Reserva',
            packageName: getBookingDisplayName(booking),
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

    const expirationTime = new Date(new Date(booking.createdAt).getTime() + 2 * 60 * 60 * 1000);
    const expirationDiffMs = expirationTime.getTime() - Date.now();
    const expirationLabel = expirationDiffMs <= 0
        ? null
        : expirationTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const proofUploadBlock = !isFullyPaid && booking.id ? (
        !proofUploaded ? (
            <div className="mb-6 bg-amber-50 border-2 border-amber-400 rounded-xl p-5 shadow-md ring-2 ring-amber-200/60">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">
                    Siguiente y último paso
                </p>
                <h4 className="font-bold text-amber-950 text-lg mb-2 flex items-center gap-2">
                    <span>📎</span> Sube tu comprobante aquí
                </h4>
                <p className="text-sm text-amber-900 mb-2 leading-relaxed">
                    Después de transferir, <strong>sube el comprobante en esta página</strong>.
                    No lo envíes por WhatsApp: con subirlo aquí tu reserva queda en revisión y <strong>no expirará</strong> mientras validamos el pago.
                </p>
                <p className="text-sm text-amber-800 mb-4 leading-relaxed">
                    Si no subes el comprobante en <strong>2 horas</strong>
                    {expirationLabel ? <> (antes de las {expirationLabel})</> : ''},
                    la pre-reserva <strong>expira</strong> y tendrás que repetir el proceso desde el inicio.
                </p>
                <label className={`flex flex-col items-center justify-center w-full py-7 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    proofUploading ? 'border-amber-300 bg-amber-100 cursor-not-allowed' : 'border-amber-500 bg-white hover:border-amber-600 hover:bg-amber-100'
                }`}>
                    <span className="text-3xl mb-2">{proofUploading ? '⏳' : '⬆️'}</span>
                    <span className="text-base font-bold text-amber-900">
                        {proofUploading ? 'Subiendo comprobante...' : 'Seleccionar JPG, PNG o PDF'}
                    </span>
                    <span className="text-xs text-amber-700 mt-1">Máximo 5MB</span>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        className="hidden"
                        onChange={handleProofUpload}
                        disabled={proofUploading}
                    />
                </label>
                {proofError && (
                    <p className="text-sm text-red-600 mt-2 font-semibold">❌ {proofError}</p>
                )}
            </div>
        ) : (
            <div className="mb-6 bg-green-50 border-2 border-green-400 rounded-xl p-5 flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">✅</span>
                <div>
                    <p className="font-bold text-green-900">¡Comprobante recibido!</p>
                    <p className="text-sm text-green-800 mt-1">Tu reserva está en revisión. El equipo validará tu pago y recibirás confirmación por correo. Tu lugar no expirará durante este proceso.</p>
                </div>
            </div>
        )
    ) : null;

        return (
            <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-brand-surface rounded-xl shadow-lifted animate-fade-in-up">
            {/* Header */}
            <div className="text-center mb-5">
                <CheckCircleIcon className="w-14 h-14 text-brand-success mx-auto mb-3" />
                <h2 className="text-3xl font-bold text-brand-text mb-2">¡Cupo guardado!</h2>
                {isFullyPaid ? (
                    <p className="text-brand-secondary text-sm">Tu reserva está confirmada. Guarda tu código abajo.</p>
                ) : (
                    <p className="text-brand-text text-sm font-medium">
                        Transfiere y <strong className="text-amber-800">sube el comprobante abajo</strong> — es el último paso para confirmar.
                    </p>
                )}
            </div>

            {/* Expiración — visible de inmediato */}
            {!isFullyPaid && !proofUploaded && (
                <div className="mb-5 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg flex items-start gap-3">
                    <span className="text-yellow-600 text-xl font-bold mt-0.5">⏰</span>
                    <div>
                        <p className="font-bold text-yellow-900 text-sm">
                            Tienes 2 horas para pagar y subir el comprobante
                        </p>
                        <p className="text-xs text-yellow-800 mt-1 leading-relaxed">
                            Si no lo haces a tiempo, el cupo se libera y tendrás que reservar de nuevo.
                            {expirationDiffMs <= 0
                                ? <span className="block text-red-600 font-mono font-bold mt-1">⚠️ EXPIRÓ</span>
                                : <span className="block font-mono mt-1">Expira a las {expirationLabel}</span>}
                        </p>
                    </div>
                </div>
            )}

            {/* Código + monto — lo mínimo para transferir */}
            <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 border-2 border-brand-primary rounded-lg p-4 text-center">
                    <p className="text-xs font-semibold text-brand-secondary uppercase tracking-wider mb-1">Código (referencia)</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        <p className="text-xl sm:text-2xl font-bold text-brand-primary font-mono tracking-wider break-all">{booking.bookingCode}</p>
                        <button
                            onClick={() => handleCopy(booking.bookingCode)}
                            className="p-2 bg-white rounded-full text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-md"
                            title="Copiar código"
                        >
                            {copied ? <CheckCircleIcon className="w-5 h-5 text-brand-success" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                <div className="bg-gradient-to-r from-brand-primary/5 to-brand-accent/5 border-2 border-brand-primary rounded-lg p-4 text-center">
                    <p className="text-xs font-semibold text-brand-secondary uppercase tracking-wider mb-1">
                        {isFullyPaid ? 'Total' : 'Monto a transferir'}
                    </p>
                    <p className="text-3xl font-bold text-brand-primary">{formatPrice(isFullyPaid ? localBooking.price : amountDue)}</p>
                    {priceBreakdown && !isFullyPaid && amountDue >= localBooking.price - 0.009 && (
                        <p className="text-xs font-semibold text-brand-text mt-1">{priceBreakdown}</p>
                    )}
                </div>
            </div>

            {/* Datos bancarios — necesarios antes de subir */}
            {!isFullyPaid && bankAccounts && bankAccounts.length > 0 && (
                <div className="mb-5 bg-white p-5 rounded-lg border-2 border-brand-border shadow-md">
                    <h3 className="text-base font-bold text-brand-text mb-3 flex items-center gap-2">
                        <BankIcon className="w-5 h-5 text-brand-primary" />
                        1. Transfiere a una de estas cuentas
                    </h3>
                    <div className="space-y-3">
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

            {/* Upload — acción principal, justo después de transferir */}
            {proofUploadBlock}

            {/* Giftcard summary */}
            {(paymentSplit.giftcardApplied > 0.009 || appliedHold || isFullyPaid) && (
                <div className="mb-5 bg-green-50 border-2 border-green-400 p-5 rounded-lg">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🎁</span>
                        <div className="flex-1">
                            <h4 className="font-bold text-green-900 mb-3">
                                {isFullyPaid ? 'Pago con gift card / cubierto' : 'Gift card aplicada'}
                            </h4>
                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-green-800">Precio total:</span>
                                    <span className="font-bold text-green-900">{formatPrice(localBooking.price)}</span>
                                </div>
                                {(paymentSplit.giftcardApplied > 0 || appliedHold) && (
                                    <div className="flex justify-between items-center bg-white p-2 rounded">
                                        <span className="text-green-700">Cubierto por gift card:</span>
                                        <span className="font-bold text-green-600">
                                            {formatPrice(Math.max(paymentSplit.giftcardApplied, appliedHold?.amount || 0))}
                                        </span>
                                    </div>
                                )}
                                <div className="border-t border-green-300 pt-2 flex justify-between items-center font-bold">
                                    <span className="text-green-900">{isFullyPaid ? 'Saldo a pagar:' : 'Faltante:'}</span>
                                    <span className={`text-lg ${isFullyPaid ? 'text-green-600' : 'text-orange-600'}`}>
                                        {formatPrice(amountDue)}
                                    </span>
                                </div>
                            </div>
                            {isFullyPaid ? (
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full font-bold text-sm">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    ¡Reserva pagada!
                                </div>
                            ) : (
                                <p className="text-sm text-green-800">
                                    Transfiere el faltante ({formatPrice(amountDue)}) o aplica otra gift card.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!isFullyPaid && (
                <div className="mb-5">
                    <GiftcardApplyToBooking
                        bookingCode={localBooking.bookingCode}
                        pendingAmount={amountDue}
                        onApplied={(result) => {
                            setLocalBooking((prev) => ({
                                ...prev,
                                isPaid: result.isPaid,
                                status: result.isPaid ? 'confirmed' : prev.status,
                                giftcardRedeemedAmount: (prev.giftcardRedeemedAmount || 0) + result.appliedAmount,
                                paymentDetails: [
                                    ...(prev.paymentDetails || []),
                                    {
                                        id: `gc_${Date.now()}`,
                                        amount: result.appliedAmount,
                                        method: 'Giftcard',
                                        receivedAt: new Date().toISOString(),
                                    },
                                ],
                                pendingBalance: result.pendingBalance,
                            }));
                        }}
                    />
                </div>
            )}

            {/* Resumen — debajo de la acción principal */}
            <div className="mb-5 bg-white border border-brand-border rounded-lg p-5">
                <h3 className="text-sm font-bold text-brand-secondary uppercase tracking-wider mb-3">
                    Resumen de tu reserva
                </h3>

                <div className="space-y-3 mb-4">
                    <div className="pb-3 border-b border-brand-border">
                        <p className="text-xs text-brand-secondary font-semibold uppercase mb-1">Experiencia</p>
                        <p className="text-base font-bold text-brand-text">{getBookingDisplayName(booking)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {booking.slots && booking.slots.length > 0 && (
                            <>
                                <div>
                                    <p className="text-xs text-brand-secondary font-semibold mb-1">Fecha</p>
                                    <p className="text-sm font-bold text-brand-text">{(() => {
                                        const dateStr = booking.slots[0].date;
                                        const [year, month, day] = dateStr.split('-').map(Number);
                                        const localDate = new Date(year, month - 1, day);
                                        return localDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    })()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-brand-secondary font-semibold mb-1">Hora</p>
                                    <p className="text-sm font-bold text-brand-text">{booking.slots[0].time} - {(() => {
                                        const [h, m] = booking.slots[0].time.split(':').map(Number);
                                        return `${String((h + 2) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                    })()}</p>
                                </div>
                            </>
                        )}

                        <div>
                            <p className="text-xs text-brand-secondary font-semibold mb-1">Participantes</p>
                            <p className="text-sm font-bold text-brand-text">{participantLabel}</p>
                        </div>

                        <div>
                            <p className="text-xs text-brand-secondary font-semibold mb-1">Duración</p>
                            <p className="text-sm font-bold text-brand-text">{durationLabel}</p>
                        </div>
                    </div>

                    {techniqueLabel && (
                        <div className="pt-1">
                            <p className="text-xs text-brand-secondary font-semibold mb-1">Técnica</p>
                            <p className="text-sm font-bold text-brand-text">{techniqueLabel}</p>
                        </div>
                    )}
                </div>

                <div className="text-xs text-brand-secondary space-y-1 border-t border-brand-border pt-3">
                    <p>Precio total: <span className="font-semibold text-brand-text">{formatPrice(booking.price)}</span></p>
                    <p>Subtotal: {formatPrice(subtotal)} · IVA ({(VAT_RATE * 100).toFixed(0)}%): {formatPrice(vat)}</p>
                </div>

                {isPackage && typeof (booking.product as ClassPackage).classes === 'number' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left mt-3">
                        <p className="text-sm font-bold text-amber-900 mb-1">
                            Plazo del paquete: {getClassPackageValidityLabel((booking.product as ClassPackage).classes)}
                        </p>
                        <p className="text-xs text-amber-800 leading-relaxed">
                            {getClassPackageValidityDescription((booking.product as ClassPackage).classes)}
                        </p>
                    </div>
                )}
            </div>

            {/* WhatsApp — dudas, no comprobante */}
            <div className="mb-5">
                <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 bg-green-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-green-600 transition-all duration-300 shadow-md text-base"
                >
                    <WhatsAppIcon className="w-6 h-6" />
                    ¿Dudas? Contáctanos por WhatsApp
                </a>
                {!isFullyPaid && !proofUploaded && (
                    <p className="text-xs text-center text-brand-secondary mt-2">
                        Solo para preguntas. El comprobante súbelo arriba en esta página.
                    </p>
                )}
            </div>

            <BankAccountsModal open={modalOpen} onClose={() => setModalOpen(false)} accounts={bankAccounts} />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 pt-6 border-t border-brand-border">
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