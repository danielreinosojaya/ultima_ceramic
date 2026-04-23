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

// Helper para obtener nombre de técnica desde metadata
const getTechniqueName = (technique: GroupTechnique): string => {
  const names: Record<GroupTechnique, string> = {
    'potters_wheel': 'Torno Alfarero',
    'hand_modeling': 'Modelado a Mano',
    'painting': 'Pintura de piezas'
  };
  return names[technique] || technique;
};

// Helper para traducir productType a nombre legible
const getProductTypeName = (productType?: string): string => {
  const typeNames: Record<string, string> = {
    'SINGLE_CLASS': 'Clase Suelta',
    'CLASS_PACKAGE': 'Paquete de Clases',
    'INTRODUCTORY_CLASS': 'Clase Introductoria',
    'GROUP_CLASS': 'Clase Grupal',
    'COUPLES_EXPERIENCE': 'Experiencia de Parejas',
    'OPEN_STUDIO': 'Estudio Abierto'
  };
  return typeNames[productType || ''] || 'Clase';
};

// Helper para obtener el nombre del producto/técnica de un booking
const getBookingDisplayName = (booking: Booking): string => {
    // 0. Para experiencia grupal personalizada, priorizar técnica sobre nombre genérico
    if (
        booking.technique &&
        (booking.productType === 'CUSTOM_GROUP_EXPERIENCE' || booking.product?.name === 'Experiencia Grupal Personalizada')
    ) {
    return getTechniqueName(booking.technique);
  }
  
  // 1. Si tiene groupClassMetadata con techniqueAssignments (GROUP_CLASS)
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    
    if (uniqueTechniques.length === 1) {
      return getTechniqueName(uniqueTechniques[0]);
    } else {
      return `Clase Grupal (mixto)`;
    }
  }
  
  // 2. Prioridad: product.name (es la fuente más confiable)
  const productName = booking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown' && productName !== null) {
    return productName;
  }
  
  // 3. Fallback: technique directamente (solo si product.name no existe)
  if (booking.technique) {
    return getTechniqueName(booking.technique);
  }
  
  // 4. Último fallback: productType
  return getProductTypeName(booking.productType);
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

    // � DEBUG: Verificar que booking llegó correctamente a ConfirmationPage
    console.log('✅ ConfirmationPage mounted with booking:', {
        bookingCode: booking?.bookingCode,
        productType: booking?.productType,
        price: booking?.price,
        technique: booking?.technique,
        slots: booking?.slots?.length || 0
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
                        setProofError('Tu reserva fue protegida. El archivo no pudo guardarse en línea — envíalo también por WhatsApp para que el equipo lo revise.');
                    }
                } else {
                    setProofError(result.error || 'Error al subir el comprobante. Intenta por WhatsApp.');
                }
            } catch {
                setProofError('Error al subir el comprobante. Intenta por WhatsApp.');
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
    
    const whatsappParticipants = typeof booking.participants === 'number' && booking.participants > 0
        ? `${booking.participants} ${booking.participants === 1 ? 'persona' : 'personas'}`
        : 'personas por confirmar';
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

    const whatsappMessage = `¡Hola! Mi código de pre-reserva es *${booking.bookingCode}*. Reservé *${whatsappActivity}* para *${whatsappParticipants}* el *${whatsappDate}${whatsappTime}*. Adjunto el comprobante de pago para validar mi reserva.`;
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

        return (
            <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-brand-surface rounded-xl shadow-lifted animate-fade-in-up">
            {/* Header */}
            <div className="text-center mb-6">
                <CheckCircleIcon className="w-16 h-16 text-brand-success mx-auto mb-3" />
                <h2 className="text-3xl font-bold text-brand-text mb-2">¡Cupo guardado!</h2>
                <p className="text-brand-secondary text-sm">Completa el pago para confirmar tu reserva.</p>
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
                        <p className="text-lg font-bold text-brand-text">{getBookingDisplayName(booking)}</p>
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
            <div className="mb-5 bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 border-2 border-brand-primary rounded-lg p-5 text-center">
                <p className="text-xs font-semibold text-brand-secondary uppercase tracking-wider mb-2">Tu Código de Pre-Reserva</p>
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
                <p className="text-xs text-brand-secondary mt-2">Inclúyelo como referencia en tu transferencia.</p>
            </div>

            {/* Aviso de expiración compacto */}
            <div className="mb-5 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg flex items-start gap-3">
                <span className="text-yellow-600 text-xl font-bold mt-0.5">⏰</span>
                <div>
                    <p className="font-bold text-yellow-900 text-sm">Válida por 2 horas · 15 min tolerancia el día de la clase</p>
                    {(() => {
                        const expirationTime = new Date(new Date(booking.createdAt).getTime() + 2 * 60 * 60 * 1000);
                        const diffMs = expirationTime.getTime() - Date.now();
                        if (diffMs <= 0) return <p className="text-xs text-red-600 font-mono font-bold mt-1">⚠️ EXPIRÓ</p>;
                        return <p className="text-xs text-yellow-700 font-mono mt-1">Expira a las {expirationTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>;
                    })()}
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

            {/* Próximos pasos (compacto) */}
            <div className="mb-5 bg-brand-background p-4 rounded-lg border border-brand-border">
                <h3 className="text-sm font-bold text-brand-text mb-3">¿Qué hacer ahora?</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white text-xs font-bold flex-shrink-0">1</span>
                        <p className="text-brand-secondary"><strong className="text-brand-text">Transfiere {formatPrice(booking.price)}</strong> a cualquiera de las cuentas y usa <span className="font-mono text-brand-primary font-bold">{booking.bookingCode}</span> como referencia.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white text-xs font-bold flex-shrink-0">2</span>
                        <p className="text-brand-secondary"><strong className="text-brand-text">Sube el comprobante</strong> usando el botón de abajo o el enlace enviado a tu correo.</p>
                    </div>
                </div>
            </div>

            {/* Botón de WhatsApp */}
            <div className="mb-5">
                <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 bg-green-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-green-600 transition-all duration-300 shadow-md text-base"
                >
                    <WhatsAppIcon className="w-6 h-6" />
                    Enviar Comprobante por WhatsApp
                </a>
            </div>

            {/* Upload comprobante de pago */}
            {booking.id && (
                !proofUploaded ? (
                    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <h4 className="font-bold text-amber-900 mb-1 flex items-center gap-2">
                            <span>📎</span> Sube tu comprobante aquí
                        </h4>
                        <p className="text-sm text-amber-800 mb-3">
                            También puedes subir tu comprobante directamente. Tu reserva quedará en revisión y <strong>no expirará</strong> mientras validamos tu pago.
                        </p>
                        <label className={`flex flex-col items-center justify-center w-full py-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                            proofUploading ? 'border-amber-300 bg-amber-100 cursor-not-allowed' : 'border-amber-300 hover:border-amber-400 hover:bg-amber-100'
                        }`}>
                            <span className="text-2xl mb-1">{proofUploading ? '⏳' : '⬆️'}</span>
                            <span className="text-sm font-semibold text-amber-800">
                                {proofUploading ? 'Subiendo comprobante...' : 'Seleccionar JPG, PNG o PDF (máx 5MB)'}
                            </span>
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
                    <div className="mb-6 bg-green-50 border border-green-300 rounded-xl p-5 flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">✅</span>
                        <div>
                            <p className="font-bold text-green-900">¡Comprobante recibido!</p>
                            <p className="text-sm text-green-800 mt-1">Tu reserva está en revisión. El equipo validará tu pago y recibirás confirmación por correo. Tu lugar no expirará durante este proceso.</p>
                        </div>
                    </div>
                )
            )}

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