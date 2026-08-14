import React, { useState } from 'react';
import { createGiftcardManual, registerPhysicalGiftcard } from '../../services/dataService';
import { formatPrice } from '../../utils/formatters';

interface GiftcardManualCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    adminUser?: string;
}

const MIN_AMOUNT = 10;
const MAX_AMOUNT = 500;
const EXPIRATION_MONTHS = 3;
const PRESETS = [
    { amount: 45, label: 'Modelado' },
    { amount: 55, label: 'Torno' },
    { amount: 180, label: 'Paquete 4' },
    { amount: 330, label: 'Paquete 8' },
];

type Mode = 'digital' | 'physical';

function implicitExpirationLabel(from: Date = new Date()): string {
    const expires = new Date(from);
    expires.setMonth(expires.getMonth() + EXPIRATION_MONTHS);
    return expires.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const GiftcardManualCreateModal: React.FC<GiftcardManualCreateModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    adminUser = 'admin',
}) => {
    const [mode, setMode] = useState<Mode>('digital');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<{
        code: string;
        amount: number;
        expiresAt?: string;
        emailed: boolean;
    } | null>(null);
    const [copied, setCopied] = useState(false);

    const [recipientName, setRecipientName] = useState('');
    const [amountInput, setAmountInput] = useState('55');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [recipientWhatsapp, setRecipientWhatsapp] = useState('');
    const [message, setMessage] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [buyerEmail, setBuyerEmail] = useState('');
    const [showBuyer, setShowBuyer] = useState(false);

    const implicitExpiresAt = implicitExpirationLabel();
    const parsedAmount = Number(amountInput.replace(/[^0-9.]/g, ''));

    const resetForm = () => {
        setMode('digital');
        setRecipientName('');
        setAmountInput('55');
        setRecipientEmail('');
        setRecipientWhatsapp('');
        setMessage('');
        setBuyerName('');
        setBuyerEmail('');
        setShowBuyer(false);
        setError(null);
        setCreated(null);
        setCopied(false);
    };

    const handleClose = () => {
        if (loading) return;
        resetForm();
        onClose();
    };

    const handleCopy = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const name = recipientName.trim();
            if (!name) throw new Error('El nombre del destinatario es requerido');
            if (!amountInput.trim()) throw new Error('El valor es requerido');
            if (!Number.isFinite(parsedAmount) || parsedAmount < MIN_AMOUNT || parsedAmount > MAX_AMOUNT) {
                throw new Error(`El valor debe estar entre $${MIN_AMOUNT} y $${MAX_AMOUNT}`);
            }

            if (mode === 'physical') {
                const result = await registerPhysicalGiftcard(name, parsedAmount, adminUser);
                if (!result.success) throw new Error(result.error || 'No se pudo registrar');
                setCreated({
                    code: result.giftcard?.code || '',
                    amount: parsedAmount,
                    expiresAt: result.giftcard?.expiresAt,
                    emailed: false,
                });
            } else {
                const result = await createGiftcardManual(
                    buyerName.trim() || 'CeramicAlma',
                    buyerEmail.trim() || undefined,
                    name,
                    parsedAmount,
                    recipientEmail.trim() || undefined,
                    recipientWhatsapp.trim() || undefined,
                    message.trim() || undefined,
                    adminUser
                );
                if (!result.success) throw new Error(result.error || 'No se pudo crear');
                setCreated({
                    code: result.giftcard?.code || '',
                    amount: parsedAmount,
                    expiresAt: result.giftcard?.expiresAt,
                    emailed: Boolean(recipientEmail.trim()),
                });
            }
            onSuccess?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const expiresLabel = created?.expiresAt
        ? new Date(created.expiresAt).toLocaleDateString('es-EC', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          })
        : implicitExpiresAt;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[92vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-bold text-brand-primary">Crear gift card</h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                        disabled={loading}
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </div>
                <p className="text-sm text-brand-secondary mb-4">
                    Sin pasar por el portal del cliente. El código GC se genera al instante y ya se puede canjear.
                </p>

                {created ? (
                    <div className="space-y-4">
                        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5 text-center">
                            <p className="text-sm font-semibold text-emerald-800 mb-1">Lista para usar</p>
                            <p className="font-mono text-3xl font-bold tracking-wider text-emerald-900">{created.code}</p>
                            <button
                                type="button"
                                onClick={() => handleCopy(created.code)}
                                className="mt-3 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800"
                            >
                                {copied ? 'Copiado' : 'Copiar código'}
                            </button>
                        </div>
                        <div className="text-sm text-brand-text space-y-1">
                            <p>Valor: <strong>{formatPrice(created.amount)}</strong></p>
                            <p>
                                Vence: <strong>{expiresLabel}</strong>
                                <span className="text-brand-secondary"> (3 meses desde la compra/registro)</span>
                            </p>
                            {created.emailed ? (
                                <p className="text-emerald-800">Se envió el código por correo al destinatario.</p>
                            ) : (
                                <p className="text-brand-secondary">
                                    {mode === 'physical'
                                        ? 'Escríbelo en la tarjeta física y entrégala.'
                                        : 'Compártelo por WhatsApp o en persona. El cliente lo redime en la reserva.'}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="flex-1 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:opacity-90"
                            >
                                Crear otra
                            </button>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2 rounded-lg border border-brand-border font-semibold hover:bg-gray-50"
                            >
                                Listo
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setMode('digital')}
                                className={`py-2 rounded-lg text-sm font-semibold ${
                                    mode === 'digital' ? 'bg-white shadow text-brand-primary' : 'text-gray-600'
                                }`}
                            >
                                Digital
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('physical')}
                                className={`py-2 rounded-lg text-sm font-semibold ${
                                    mode === 'physical' ? 'bg-white shadow text-brand-primary' : 'text-gray-600'
                                }`}
                            >
                                Tarjeta física
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-brand-primary mb-1">
                                {mode === 'physical' ? 'Nombre en la tarjeta *' : 'Para quién *'}
                            </label>
                            <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                placeholder="Ej: María López"
                                className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-brand-primary mb-1">Valor *</label>
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {PRESETS.map((p) => (
                                    <button
                                        key={p.amount}
                                        type="button"
                                        onClick={() => setAmountInput(String(p.amount))}
                                        className={`px-2 py-2 rounded-lg border text-xs font-semibold ${
                                            parsedAmount === p.amount
                                                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                                                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        ${p.amount}
                                        <span className="block font-normal opacity-70">{p.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    min={MIN_AMOUNT}
                                    max={MAX_AMOUNT}
                                    step={1}
                                    value={amountInput}
                                    onChange={(e) => setAmountInput(e.target.value)}
                                    className="w-full pl-7 pr-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    disabled={loading}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Entre ${MIN_AMOUNT} y ${MAX_AMOUNT}</p>
                        </div>

                        {mode === 'digital' && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-brand-primary mb-1">
                                        Email del destinatario (opcional)
                                    </label>
                                    <input
                                        type="email"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        placeholder="Si lo llenas, le enviamos el código"
                                        className="w-full px-3 py-2 border border-brand-border rounded-lg"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-brand-primary mb-1">
                                        WhatsApp (opcional)
                                    </label>
                                    <input
                                        type="tel"
                                        value={recipientWhatsapp}
                                        onChange={(e) => setRecipientWhatsapp(e.target.value)}
                                        placeholder="099..."
                                        className="w-full px-3 py-2 border border-brand-border rounded-lg"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-brand-primary mb-1">
                                        Mensaje (opcional)
                                    </label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-brand-border rounded-lg"
                                        disabled={loading}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowBuyer((v) => !v)}
                                    className="text-xs font-semibold text-brand-primary hover:underline"
                                >
                                    {showBuyer ? 'Ocultar datos de quien pagó' : '¿Quién pagó? (opcional, si no es el estudio)'}
                                </button>
                                {showBuyer && (
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            value={buyerName}
                                            onChange={(e) => setBuyerName(e.target.value)}
                                            placeholder="Nombre de quien pagó"
                                            className="px-3 py-2 border border-brand-border rounded-lg"
                                            disabled={loading}
                                        />
                                        <input
                                            type="email"
                                            value={buyerEmail}
                                            onChange={(e) => setBuyerEmail(e.target.value)}
                                            placeholder="Email de quien pagó"
                                            className="px-3 py-2 border border-brand-border rounded-lg"
                                            disabled={loading}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-600">
                            {mode === 'physical' ? (
                                <>
                                    Código GC al registrar · <strong>Vence {implicitExpiresAt}</strong>
                                    {' '}(3 meses desde hoy, día de la compra/registro)
                                </>
                            ) : (
                                <>Código GC se genera al crear · Vence {implicitExpiresAt} (3 meses)</>
                            )}
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2 rounded-lg border border-brand-border font-semibold hover:bg-gray-50 disabled:opacity-50"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? 'Creando…' : mode === 'physical' ? 'Registrar física' : 'Crear y emitir código'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
