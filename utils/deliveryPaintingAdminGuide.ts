import type { Delivery, PaintingStatus } from '../types';

export type PaintingFlowStep = 1 | 2 | 3 | 4 | 5;

/**
 * Flujo admin entrega + pintura (5 pasos):
 * 1 Formulario · 2 Pago · 3 Pieza lista · 4 Pintura en taller · 5 Horneado y retiro
 */
export function getPaintingFlowStep(delivery: Delivery): PaintingFlowStep {
    const ps = delivery.paintingStatus;
    if (ps === 'pending_payment') return 2;
    if (!delivery.readyAt) return 3;
    if (ps !== 'completed') return 4;
    if (delivery.status !== 'completed') return 5;
    return 5;
}

export function paintingPaymentLabel(ps: PaintingStatus | null | undefined, price: number): string {
    switch (ps) {
        case 'pending_payment':
            return `Cobro pendiente · $${price}`;
        case 'deferred':
            return `Cobro acordado para después · $${price}`;
        case 'paid':
            return `Pagado · $${price}`;
        case 'scheduled':
            return `Cita agendada · revisar cobro si aplica`;
        case 'completed':
            return `Pintura realizada`;
        default:
            return 'Sin estado de cobro';
    }
}
