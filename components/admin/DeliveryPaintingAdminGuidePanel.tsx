import React from 'react';
import type { Delivery } from '../../types';
import { getDeliveryPaintingAdminGuide } from '../../utils/deliveryPaintingAdminGuide';

interface DeliveryPaintingAdminGuidePanelProps {
    delivery: Delivery;
}

/** Panel fijo: paso actual del flujo entrega+pintura y qué hacer ahora. */
export const DeliveryPaintingAdminGuidePanel: React.FC<DeliveryPaintingAdminGuidePanelProps> = ({
    delivery,
}) => {
    if (!delivery.wantsPainting) return null;

    const guide = getDeliveryPaintingAdminGuide(delivery);

    return (
        <div className="rounded-lg border-2 border-indigo-300 bg-indigo-50/90 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                    Guía admin · entrega + pintura
                </span>
                <span className="text-xs font-semibold text-indigo-800 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    {guide.stepTitle}
                </span>
                <span className="text-xs text-indigo-700">{guide.paymentBadge}</span>
            </div>
            <p className="text-sm text-indigo-950 leading-snug">{guide.summary}</p>
            {guide.primaryAction && (
                <div className="bg-white border border-indigo-200 rounded-md px-3 py-2">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase">Acción recomendada ahora</p>
                    <p className="text-sm font-bold text-indigo-900">{guide.primaryAction.label}</p>
                    <p className="text-xs text-indigo-800">{guide.primaryAction.description}</p>
                </div>
            )}
            {guide.alsoAvailable.length > 0 && (
                <div className="text-xs text-indigo-800 space-y-1">
                    <p className="font-semibold">También disponible:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                        {guide.alsoAvailable.map((a) => (
                            <li key={a.id}>
                                <span className="font-medium">{a.label}</span>
                                <span className="text-indigo-700"> — {a.description}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
