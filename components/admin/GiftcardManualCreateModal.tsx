import React, { useState } from 'react';
import { createGiftcardManual } from '../../services/dataService';

interface GiftcardManualCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    adminUser?: string;
}

export const GiftcardManualCreateModal: React.FC<GiftcardManualCreateModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    adminUser = 'admin'
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    const [form, setForm] = useState({
        buyerName: '',
        buyerEmail: '',
        recipientName: '',
        recipientEmail: '',
        amount: 50,
        message: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: name === 'amount' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Validaciones
            if (!form.buyerName.trim()) throw new Error('Nombre del comprador es requerido');
            if (!form.buyerEmail.trim()) throw new Error('Email del comprador es requerido');
            if (!form.recipientName.trim()) throw new Error('Nombre del destinatario es requerido');
            if (form.amount < 10 || form.amount > 500) throw new Error('Monto debe estar entre $10 y $500');

            const result = await createGiftcardManual(
                form.buyerName,
                form.buyerEmail,
                form.recipientName,
                form.amount,
                form.recipientEmail || undefined,
                undefined,
                form.message || undefined,
                adminUser
            );

            if (result.success) {
                setSuccess(true);
                setForm({
                    buyerName: '',
                    buyerEmail: '',
                    recipientName: '',
                    recipientEmail: '',
                    amount: 50,
                    message: ''
                });
                
                // Mostrar código generado
                if (result.giftcard?.code) {
                    alert(`✅ Giftcard creada exitosamente!\n\nCódigo: ${result.giftcard.code}\n\nYa puedes escribir este código en la tarjeta física.`);
                }
                
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                }, 2000);
            } else {
                setError(result.error || 'Error desconocido');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-brand-primary">Crear Giftcard</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                        disabled={loading}
                    >
                        ×
                    </button>
                </div>

                {success && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                        ✅ Giftcard creada exitosamente
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        ❌ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Buyer Info */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-primary mb-1">
                            Nombre del Comprador *
                        </label>
                        <input
                            type="text"
                            name="buyerName"
                            value={form.buyerName}
                            onChange={handleChange}
                            placeholder="Ej: Juan García"
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-brand-primary mb-1">
                            Email del Comprador *
                        </label>
                        <input
                            type="email"
                            name="buyerEmail"
                            value={form.buyerEmail}
                            onChange={handleChange}
                            placeholder="Ej: juan@example.com"
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={loading}
                        />
                    </div>

                    {/* Recipient Info */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-primary mb-1">
                            Nombre del Destinatario *
                        </label>
                        <input
                            type="text"
                            name="recipientName"
                            value={form.recipientName}
                            onChange={handleChange}
                            placeholder="Ej: María López"
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-brand-primary mb-1">
                            Email del Destinatario (Opcional)
                        </label>
                        <input
                            type="email"
                            name="recipientEmail"
                            value={form.recipientEmail}
                            onChange={handleChange}
                            placeholder="Ej: maria@example.com"
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={loading}
                        />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-primary mb-1">
                            Monto ($) *
                        </label>
                        <select
                            name="amount"
                            value={form.amount}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={loading}
                        >
                            <option value={25}>$25</option>
                            <option value={50}>$50</option>
                            <option value={75}>$75</option>
                            <option value={100}>$100</option>
                            <option value={150}>$150</option>
                            <option value={200}>$200</option>
                            <option value={300}>$300</option>
                            <option value={500}>$500</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Rango: $10 - $500</p>
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-primary mb-1">
                            Mensaje (Opcional)
                        </label>
                        <textarea
                            name="message"
                            value={form.message}
                            onChange={handleChange}
                            placeholder="Ej: ¡Espero disfrutes de esta experiencia!"
                            rows={3}
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                            disabled={loading}
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg border border-brand-border text-brand-primary font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Creando...' : 'Crear Giftcard'}
                        </button>
                    </div>
                </form>

                <p className="text-xs text-gray-500 mt-4 text-center">
                    El código se generará automáticamente y se enviará por email
                </p>
            </div>
        </div>
    );
};
