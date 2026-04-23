import React, { useEffect, useState } from 'react';
import { getBookingByCode, uploadPaymentProof } from '../services/dataService';
import type { BookingPublicInfo } from '../services/dataService';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface ProofUploadPageProps {
    bookingCode: string;
    onDone: () => void;
}

const formatSlotDate = (date: string): string => {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const ProofUploadPage: React.FC<ProofUploadPageProps> = ({ bookingCode, onDone }) => {
    const [pageStatus, setPageStatus] = useState<'loading' | 'not_found' | 'expired' | 'confirmed' | 'pending_verification' | 'upload_ready'>('loading');
    const [booking, setBooking] = useState<BookingPublicInfo | null>(null);
    const [proofUploading, setProofUploading] = useState(false);
    const [proofUploaded, setProofUploaded] = useState(false);
    const [proofError, setProofError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const result = await getBookingByCode(bookingCode);
            if (!result.success || !result.booking) {
                setPageStatus('not_found');
                return;
            }
            const b = result.booking;
            setBooking(b);
            if (b.status === 'confirmed' || b.isPaid) {
                setPageStatus('confirmed');
            } else if (b.status === 'pending_verification') {
                setPageStatus('pending_verification');
            } else if (b.status === 'expired') {
                setPageStatus('expired');
            } else {
                setPageStatus('upload_ready');
            }
        };
        load();
    }, [bookingCode]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !booking) return;

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
                const result = await uploadPaymentProof(booking.id, base64Data, file.name);
                if (result.success) {
                    setProofUploaded(true);
                    setPageStatus('pending_verification');
                    if (!result.bunnyAvailable) {
                        setProofError('Tu reserva fue protegida. Envía también el comprobante por WhatsApp para que podamos verificarlo.');
                    }
                } else {
                    setProofError(result.error || 'Error al subir. Por favor intenta de nuevo.');
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

    const renderContent = () => {
        if (pageStatus === 'loading') {
            return (
                <div className="text-center py-16">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary mb-4"></div>
                    <p className="text-brand-secondary">Buscando tu reserva...</p>
                </div>
            );
        }

        if (pageStatus === 'not_found') {
            return (
                <div className="text-center py-12">
                    <span className="text-5xl">🔍</span>
                    <h2 className="text-xl font-bold text-brand-text mt-4 mb-2">Reserva no encontrada</h2>
                    <p className="text-brand-secondary mb-6">No encontramos ninguna reserva con el código <strong className="font-mono">{bookingCode}</strong>. Verifica que sea el código correcto.</p>
                    <button onClick={onDone} className="px-6 py-3 bg-brand-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity">
                        Volver al inicio
                    </button>
                </div>
            );
        }

        if (pageStatus === 'confirmed') {
            return (
                <div className="text-center py-12">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
                    <h2 className="text-xl font-bold text-brand-text mt-4 mb-2">¡Reserva confirmada!</h2>
                    <p className="text-brand-secondary mb-2">Tu pago ya fue verificado. No necesitas subir ningún comprobante.</p>
                    {booking && (
                        <p className="text-sm text-brand-secondary mb-6">
                            <strong>{booking.productName}</strong>
                            {booking.slots?.[0] && ` — ${formatSlotDate(booking.slots[0].date)}`}
                        </p>
                    )}
                    <button onClick={onDone} className="px-6 py-3 bg-brand-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity">
                        Volver al inicio
                    </button>
                </div>
            );
        }

        if (pageStatus === 'expired') {
            return (
                <div className="text-center py-12">
                    <span className="text-5xl">⏰</span>
                    <h2 className="text-xl font-bold text-brand-text mt-4 mb-2">Esta pre-reserva expiró</h2>
                    <p className="text-brand-secondary mb-6">Tu lugar fue liberado. Si ya realizaste el pago, contáctanos por WhatsApp para resolver el inconveniente.</p>
                    <button onClick={onDone} className="px-6 py-3 bg-brand-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity">
                        Volver a reservar
                    </button>
                </div>
            );
        }

        if (pageStatus === 'pending_verification') {
            return (
                <div className="text-center py-12">
                    <span className="text-5xl">✅</span>
                    <h2 className="text-xl font-bold text-brand-text mt-4 mb-2">
                        {proofUploaded ? '¡Comprobante recibido!' : 'Comprobante en revisión'}
                    </h2>
                    <p className="text-brand-secondary mb-2">
                        Tu reserva está siendo revisada. El equipo validará tu pago y recibirás confirmación por correo.
                        <strong className="text-green-700"> Tu lugar no expirará durante este proceso.</strong>
                    </p>
                    {booking && (
                        <p className="text-sm text-brand-secondary mt-3 mb-6">
                            <strong>{booking.productName}</strong>
                            {booking.slots?.[0] && ` — ${formatSlotDate(booking.slots[0].date)}`}
                        </p>
                    )}
                    <button onClick={onDone} className="px-6 py-3 bg-brand-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity">
                        Volver al inicio
                    </button>
                </div>
            );
        }

        // upload_ready — the main flow
        return (
            <div>
                {/* Booking Summary */}
                {booking && (
                    <div className="bg-brand-background rounded-xl p-5 mb-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <p className="text-xs font-semibold text-brand-secondary uppercase tracking-wider mb-1">Tu pre-reserva</p>
                                <p className="font-mono font-bold text-brand-primary text-lg">{booking.bookingCode}</p>
                                <p className="font-semibold text-brand-text mt-1">{booking.productName}</p>
                                {booking.slots?.length > 0 && (
                                    <p className="text-sm text-brand-secondary mt-0.5">
                                        📅 {formatSlotDate(booking.slots[0].date)}{booking.slots[0].time ? ` a las ${booking.slots[0].time}` : ''}
                                    </p>
                                )}
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs text-brand-secondary">Total a pagar</p>
                                <p className="text-2xl font-bold text-brand-primary">${booking.price.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Section */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
                    <h3 className="font-bold text-amber-900 mb-1 flex items-center gap-2">
                        <span>📎</span> Sube tu comprobante de pago
                    </h3>
                    <p className="text-sm text-amber-800 mb-4">
                        Una vez subido, tu reserva quedará en estado <strong>"En Revisión"</strong> y <strong>no expirará</strong> mientras verificamos tu pago.
                    </p>

                    <label className={`flex flex-col items-center justify-center w-full py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        proofUploading ? 'border-amber-300 bg-amber-100 cursor-not-allowed' : 'border-amber-300 hover:border-brand-primary hover:bg-amber-100'
                    }`}>
                        <span className="text-3xl mb-2">{proofUploading ? '⏳' : '⬆️'}</span>
                        <span className="text-sm font-semibold text-amber-900">
                            {proofUploading ? 'Subiendo...' : 'Seleccionar JPG, PNG o PDF (máx 5MB)'}
                        </span>
                        <span className="text-xs text-amber-700 mt-1">Haz click aquí para seleccionar el archivo</span>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={proofUploading}
                        />
                    </label>

                    {proofError && (
                        <p className="text-sm text-red-600 mt-3 font-semibold">❌ {proofError}</p>
                    )}
                </div>

                {/* Contact for help */}
                <p className="text-center text-sm text-brand-secondary">
                    ¿Tienes alguna duda? Puedes contactarnos por WhatsApp y con gusto te ayudamos.
                </p>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-brand-background py-12 px-4">
            <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-brand-primary px-6 py-5">
                    <h1 className="text-xl font-bold text-white">Subir Comprobante de Pago</h1>
                    <p className="text-sm text-white/80 mt-0.5">CeramicAlma</p>
                </div>

                <div className="p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
