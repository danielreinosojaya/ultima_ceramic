import type { Delivery, PaintingStatus } from '../types';

export type PaintingFlowStep = 1 | 2 | 3 | 4 | 5;

export type PaintingAdminActionId =
    | 'mark_ready'
    | 'defer_payment'
    | 'register_payment'
    | 'schedule_painting'
    | 'reschedule_painting'
    | 'mark_painting_completed'
    | 'skip_schedule_completed'
    | 'notify_pickup'
    | 'complete_delivery';

export interface PaintingAdminActionHint {
    id: PaintingAdminActionId;
    label: string;
    description: string;
    emphasis?: 'primary' | 'secondary';
}

export interface DeliveryPaintingAdminGuide {
    currentStep: PaintingFlowStep;
    stepTitle: string;
    paymentStatus: PaintingStatus | null;
    paymentBadge: string;
    summary: string;
    primaryAction: PaintingAdminActionHint | null;
    alsoAvailable: PaintingAdminActionHint[];
}

const priceLabel = (d: Delivery) => `$${d.paintingPrice ?? 20}`;

/** Paso operativo 1–5 del timeline de pintura (misma lógica que DeliveryTimeline). */
export function getPaintingFlowStep(delivery: Delivery): PaintingFlowStep {
    let step: PaintingFlowStep = 1;
    if (delivery.readyAt) step = 2;
    const ps = delivery.paintingStatus;
    if (ps === 'paid' || ps === 'deferred' || ps === 'scheduled') step = 3;
    if (ps === 'completed') step = 4;
    if (delivery.paintingPickupNotifiedAt || delivery.status === 'completed') step = 5;
    return step;
}

function paymentBadge(ps: PaintingStatus | null | undefined, d: Delivery): string {
    switch (ps) {
        case 'pending_payment':
            return `💰 Cobro pendiente (${priceLabel(d)})`;
        case 'deferred':
            return `📋 Cobro acordado para después (${priceLabel(d)})`;
        case 'paid':
            return `✅ Cobrado (${priceLabel(d)})`;
        case 'scheduled':
            return delivery.paintingBookingDate
                ? `📅 Cita agendada · ${priceLabel(d)}`
                : `📅 Agendado · ${priceLabel(d)}`;
        case 'completed':
            return `🎨 Pintura hecha · ${priceLabel(d)}`;
        default:
            return 'Sin estado de cobro';
    }
}

/**
 * Guía para admin: en qué paso está la entrega con pintura y qué botón usar primero.
 */
export function getDeliveryPaintingAdminGuide(delivery: Delivery): DeliveryPaintingAdminGuide {
    const step = getPaintingFlowStep(delivery);
    const ps = delivery.paintingStatus ?? null;
    const price = priceLabel(delivery);

    const stepTitles: Record<PaintingFlowStep, string> = {
        1: 'Paso 1/5 · Entrega creada',
        2: 'Paso 2/5 · Pieza lista para pintar',
        3: 'Paso 3/5 · Sesión de pintura',
        4: 'Paso 4/5 · Horneado final',
        5: 'Paso 5/5 · Retiro de pieza pintada',
    };

    const base: DeliveryPaintingAdminGuide = {
        currentStep: step,
        stepTitle: stepTitles[step],
        paymentStatus: ps,
        paymentBadge: paymentBadge(ps, delivery),
        summary: '',
        primaryAction: null,
        alsoAvailable: [],
    };

    if (delivery.status === 'completed' && step >= 5) {
        return {
            ...base,
            summary: 'Entrega cerrada. Flujo de pintura finalizado.',
            primaryAction: null,
            alsoAvailable: [],
        };
    }

    // —— Paso 1–2: pieza aún no lista ——
    if (!delivery.readyAt) {
        return {
            ...base,
            currentStep: step < 2 ? 1 : 2,
            stepTitle: step < 2 ? stepTitles[1] : stepTitles[2],
            summary:
                ps === 'pending_payment'
                    ? `La pieza no está marcada como lista. Primero termina la pieza y usa «Pieza lista → Notificar cliente». El cobro de ${price} puede acordarse después.`
                    : `Marca la pieza como lista para continuar (email al cliente).`,
            primaryAction: {
                id: 'mark_ready',
                label: 'Pieza lista → Notificar cliente',
                description: 'Paso 2: avisa al cliente que puede agendar pintura cuando corresponda.',
                emphasis: 'primary',
            },
            alsoAvailable:
                ps === 'pending_payment'
                    ? [
                          {
                              id: 'defer_payment',
                              label: 'Acordar cobro después',
                              description: `Opcional ahora: cliente pagará ${price} más tarde; podrás agendar sin marcar como pagado.`,
                              emphasis: 'secondary',
                          },
                          {
                              id: 'register_payment',
                              label: `Registrar cobro ${price}`,
                              description: 'Solo si ya recibiste el pago del upsell de pintura.',
                              emphasis: 'secondary',
                          },
                      ]
                    : ps === 'deferred'
                      ? [
                            {
                                id: 'register_payment',
                                label: `Registrar cobro ${price}`,
                                description: 'Cuando el cliente pague el upsell.',
                                emphasis: 'secondary',
                            },
                        ]
                      : [],
        };
    }

    // —— Pieza lista, cobro pendiente ——
    if (ps === 'pending_payment') {
        return {
            ...base,
            currentStep: 2,
            stepTitle: stepTitles[2],
            summary: `Pieza lista. El cliente aún no pagó ${price}. Podés acordar cobro después y agendar la cita, o registrar el cobro si ya pagó.`,
            primaryAction: {
                id: 'defer_payment',
                label: 'Acordar cobro después',
                description: 'Permite agendar pintura sin marcar como pagado (cobrás en otro momento).',
                emphasis: 'primary',
            },
            alsoAvailable: [
                {
                    id: 'register_payment',
                    label: `Registrar cobro ${price}`,
                    description: 'Marca el upsell como cobrado (no inventes el pago si aún no pagó).',
                    emphasis: 'secondary',
                },
                {
                    id: 'schedule_painting',
                    label: 'Agendar pintura (agenda)…',
                    description: 'Requiere antes «Acordar cobro después» o registrar cobro.',
                    emphasis: 'secondary',
                },
            ],
        };
    }

    // —— Cobro diferido: agendar ——
    if (ps === 'deferred' && !delivery.paintingBookingDate) {
        return {
            ...base,
            currentStep: 3,
            stepTitle: stepTitles[3],
            summary: `Cobro ${price} acordado para después. Siguiente: agendar la sesión en la agenda.`,
            primaryAction: {
                id: 'schedule_painting',
                label: 'Agendar pintura (agenda)…',
                description: 'Crea la cita en calendario y envía correo al cliente.',
                emphasis: 'primary',
            },
            alsoAvailable: [
                {
                    id: 'register_payment',
                    label: `Registrar cobro ${price}`,
                    description: 'Si el cliente pagó antes de la cita.',
                    emphasis: 'secondary',
                },
            ],
        };
    }

    // —— Pagado sin cita ——
    if (ps === 'paid' && !delivery.paintingBookingDate) {
        return {
            ...base,
            currentStep: 3,
            stepTitle: stepTitles[3],
            summary: `Pago registrado. Agendá la sesión de pintura con el cliente.`,
            primaryAction: {
                id: 'schedule_painting',
                label: 'Agendar pintura (agenda)…',
                description: 'Crea la reserva en agenda y notifica al cliente.',
                emphasis: 'primary',
            },
            alsoAvailable: [
                {
                    id: 'skip_schedule_completed',
                    label: 'Ya pintó (sin cita en sistema)',
                    description: 'Solo si ya pintó y nunca hubo cita guardada.',
                    emphasis: 'secondary',
                },
            ],
        };
    }

    // —— Cita agendada ——
    if (ps === 'scheduled' && delivery.paintingBookingDate) {
        const also: PaintingAdminActionHint[] = [
            {
                id: 'reschedule_painting',
                label: 'Corregir / reagendar pintura…',
                description: 'Si la fecha u hora estuvo mal.',
                emphasis: 'secondary',
            },
        ];
        if (!delivery.paintingPaidAt) {
            also.unshift({
                id: 'register_payment',
                label: `Registrar cobro ${price}`,
                description: 'Cobro aún pendiente (acordado para después).',
                emphasis: 'secondary',
            });
        }
        return {
            ...base,
            currentStep: 3,
            stepTitle: stepTitles[3],
            summary: `Sesión agendada. Cuando pinte, marcá «Pintura completada».`,
            primaryAction: {
                id: 'mark_painting_completed',
                label: 'Pintura completada',
                description: 'Paso 3 → 4: cliente terminó de pintar.',
                emphasis: 'primary',
            },
            alsoAvailable: also,
        };
    }

    // —— Pintura completada, falta horno / retiro ——
    if (ps === 'completed' && !delivery.paintingPickupNotifiedAt) {
        return {
            ...base,
            currentStep: 4,
            stepTitle: stepTitles[4],
            summary: 'Pieza pintada. Cuando salga del horno, notificá al cliente para retiro.',
            primaryAction: {
                id: 'notify_pickup',
                label: 'Horneado completo → Avisar cliente',
                description: 'Email: pieza pintada lista para retirar.',
                emphasis: 'primary',
            },
            alsoAvailable: [],
        };
    }

    if (ps === 'completed' && delivery.paintingPickupNotifiedAt && delivery.status !== 'completed') {
        return {
            ...base,
            currentStep: 5,
            stepTitle: stepTitles[5],
            summary: 'Cliente notificado. Cuando retire, cerrá la entrega.',
            primaryAction: {
                id: 'complete_delivery',
                label: 'Marcar entrega completada',
                description: 'Paso 5: cliente retiró la pieza.',
                emphasis: 'primary',
            },
            alsoAvailable: [
                {
                    id: 'notify_pickup',
                    label: 'Reenviar email de retiro',
                    description: 'Si hace falta repetir el aviso.',
                    emphasis: 'secondary',
                },
            ],
        };
    }

    return {
        ...base,
        summary: 'Revisá el timeline y los botones de abajo.',
        primaryAction: null,
        alsoAvailable: [],
    };
}
