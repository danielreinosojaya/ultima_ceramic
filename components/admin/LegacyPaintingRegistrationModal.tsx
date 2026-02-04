import React, { useMemo, useState } from 'react';
import type { Delivery } from '../../types';
import * as dataService from '../../services/dataService';

export type DeliveryWithCustomer = Delivery & { customerEmail?: string; customerName?: string };

interface LegacyPaintingRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    deliveries: DeliveryWithCustomer[];
    onSaved: (delivery: Delivery) => void;
    onFallbackRefresh: () => void;
}

export const LegacyPaintingRegistrationModal: React.FC<LegacyPaintingRegistrationModalProps> = ({
    isOpen,
    onClose,
    deliveries,
    onSaved,
    onFallbackRefresh
}) => {
    const [search, setSearch] = useState('');
    const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);

    const [wantsPainting, setWantsPainting] = useState(true);
    const [paintingPrice, setPaintingPrice] = useState<number>(20);
    const [markPaidNow, setMarkPaidNow] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string>('');

    const selectedDelivery = useMemo(() => {
        if (!selectedDeliveryId) return null;
        return deliveries.find(d => d.id === selectedDeliveryId) || null;
    }, [deliveries, selectedDeliveryId]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return deliveries.slice(0, 25);

        const results = deliveries.filter(d => {
            const haystack = [
                d.id,
                d.customerEmail,
                (d as any).customerName,
                d.description,
                d.status,
                d.paintingStatus
            ]
                .filter(Boolean)
                .map(v => String(v).toLowerCase())
                .join(' | ');
            return haystack.includes(q);
        });

        return results.slice(0, 25);
    }, [deliveries, search]);

    if (!isOpen) return null;

    const applySelectionDefaults = (delivery: DeliveryWithCustomer) => {
        const existingWantsPainting = Boolean(delivery.wantsPainting);
        setWantsPainting(existingWantsPainting || true);
        setPaintingPrice(typeof delivery.paintingPrice === 'number' ? delivery.paintingPrice : 20);
        setMarkPaidNow(Boolean(delivery.paintingStatus === 'paid' || delivery.paintingPaidAt));
        setError('');
    };

    const handleSelect = (delivery: DeliveryWithCustomer) => {
        setSelectedDeliveryId(delivery.id);
        applySelectionDefaults(delivery);
    };

    const handleSave = async () => {
        if (!selectedDelivery) {
            setError('Selecciona una entrega.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            const nowIso = new Date().toISOString();

            const updates: Record<string, any> = {};

            if (!wantsPainting) {
                updates.wantsPainting = false;
                updates.paintingPrice = null;
                updates.paintingStatus = null;
                updates.paintingBookingDate = null;
                updates.paintingPaidAt = null;
                updates.paintingCompletedAt = null;
            } else {
                updates.wantsPainting = true;
                updates.paintingPrice = Number.isFinite(paintingPrice) ? paintingPrice : 20;
                updates.paintingStatus = markPaidNow ? 'paid' : 'pending_payment';
                if (markPaidNow) {
                    updates.paintingPaidAt = selectedDelivery.paintingPaidAt || nowIso;
                }
            }

            const result = await dataService.updateDelivery(selectedDelivery.id, updates as any);
            if (result?.success && result.delivery) {
                onSaved(result.delivery);
                onClose();
                return;
            }

            // Fallback: si por alguna razón no retorna delivery (o falla), forzar refresh crítico
            onFallbackRefresh();
            onClose();
        } catch (e: any) {
            console.error('[LegacyPaintingRegistrationModal] Error saving:', e);
            setError(e?.message || 'Error guardando.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-brand-text">🎨 Registrar pintura (legacy)</h3>
                        <p className="text-xs text-brand-secondary">
                            Carga clientes que dijeron que sí a pintar, aunque la entrega ya exista.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-sm font-bold rounded-md border text-brand-secondary hover:bg-gray-100 transition-colors"
                        disabled={isSubmitting}
                    >
                        Cerrar
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-brand-text mb-1">Buscar entrega</label>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Email, nombre, descripción, id..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            disabled={isSubmitting}
                        />

                        <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                            <div className="max-h-[360px] overflow-auto divide-y divide-gray-100">
                                {filtered.length === 0 ? (
                                    <div className="p-4 text-sm text-brand-secondary">No hay coincidencias.</div>
                                ) : (
                                    filtered.map(d => {
                                        const isSelected = d.id === selectedDeliveryId;
                                        const customerName = (d as any).customerName || '';
                                        const customerEmail = d.customerEmail || (d as any).customerEmail || '';
                                        return (
                                            <button
                                                key={d.id}
                                                type="button"
                                                onClick={() => handleSelect(d)}
                                                className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-purple-50' : ''}`}
                                                disabled={isSubmitting}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold text-brand-text truncate">
                                                            {customerName || customerEmail || 'Cliente'}
                                                        </div>
                                                        <div className="text-xs text-brand-secondary truncate">
                                                            {customerEmail || '—'} · {d.description || 'Sin descripción'}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 mt-0.5">
                                                            Estado entrega: <span className="font-semibold">{d.status}</span>{' '}
                                                            {d.wantsPainting ? (
                                                                <span className="ml-2">🎨 {d.paintingStatus || 'sin estado'}</span>
                                                            ) : (
                                                                <span className="ml-2">(sin pintura)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-mono">{d.id.slice(0, 8)}…</div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <p className="text-[11px] text-gray-500 mt-2">
                            Si el cliente no tiene entrega, usa “Cliente sin reserva” para crearla.
                        </p>
                    </div>

                    <div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <p className="text-sm font-bold text-purple-900">Configuración de pintura</p>
                            <p className="text-xs text-purple-700">Se guardará en la entrega seleccionada.</p>

                            <div className="mt-3 space-y-3">
                                <label className="inline-flex items-center gap-2 text-sm font-semibold text-purple-900">
                                    <input
                                        type="checkbox"
                                        checked={wantsPainting}
                                        onChange={(e) => setWantsPainting(e.target.checked)}
                                        disabled={isSubmitting || !selectedDelivery}
                                    />
                                    El cliente quiere pintar
                                </label>

                                {wantsPainting && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-semibold text-purple-900 mb-1">Precio pintura</label>
                                            <input
                                                type="number"
                                                value={paintingPrice}
                                                onChange={(e) => setPaintingPrice(parseFloat(e.target.value) || 0)}
                                                className="w-full px-3 py-2 border border-purple-200 rounded-lg"
                                                disabled={isSubmitting || !selectedDelivery}
                                            />
                                        </div>

                                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-purple-900">
                                            <input
                                                type="checkbox"
                                                checked={markPaidNow}
                                                onChange={(e) => setMarkPaidNow(e.target.checked)}
                                                disabled={isSubmitting || !selectedDelivery}
                                            />
                                            Marcar como pagado ahora
                                        </label>

                                        <div className="text-xs text-purple-700">
                                            Estado resultante: <strong>{markPaidNow ? 'paid' : 'pending_payment'}</strong>
                                        </div>
                                    </>
                                )}

                                {selectedDelivery && (
                                    <div className="text-xs text-gray-700 bg-white/70 border border-purple-200 rounded p-2">
                                        <div><span className="font-semibold">Entrega:</span> {selectedDelivery.description || 'Sin descripción'}</div>
                                        <div><span className="font-semibold">Email:</span> {selectedDelivery.customerEmail}</div>
                                    </div>
                                )}

                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded p-2">
                                        <p className="text-red-700 text-sm">{error}</p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm font-bold rounded-md border text-brand-secondary hover:bg-gray-100 transition-colors"
                                        disabled={isSubmitting}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${
                                            isSubmitting || !selectedDelivery
                                                ? 'bg-gray-400 cursor-not-allowed text-white'
                                                : 'bg-brand-primary text-white hover:bg-brand-accent'
                                        }`}
                                        disabled={isSubmitting || !selectedDelivery}
                                    >
                                        {isSubmitting ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
