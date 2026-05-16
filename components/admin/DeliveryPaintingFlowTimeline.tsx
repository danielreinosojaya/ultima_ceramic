import React from 'react';
import type { Delivery } from '../../types';
import { getPaintingFlowStep, paintingPaymentLabel } from '../../utils/deliveryPaintingAdminGuide';

export interface DeliveryPaintingFlowActions {
    onDeferPayment: () => void;
    onRegisterPayment: () => void;
    onMarkReady: () => void;
    onResendReadyEmail: () => void;
    onOpenScheduleModal: () => void;
    onMarkPaintingCompleted: () => void;
    onForcePaintingCompleted: () => void;
    onNotifyPickup: (resend: boolean) => void;
    onCompleteDelivery: () => void;
}

interface DeliveryPaintingFlowTimelineProps {
    delivery: Delivery;
    formatDate: (date: string) => string;
    /** Si no se pasan acciones, el timeline es solo lectura (p. ej. modal de edición). */
    actions?: DeliveryPaintingFlowActions;
}

const StepBtn: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    variant?: 'primary' | 'sky' | 'yellow' | 'blue' | 'purple' | 'green' | 'amber' | 'outline';
    className?: string;
}> = ({ onClick, children, variant = 'primary', className = '' }) => {
    const variants: Record<string, string> = {
        primary: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700',
        sky: 'bg-sky-600 hover:bg-sky-700 text-white border-sky-700',
        yellow: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600',
        blue: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700',
        purple: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white border-fuchsia-700',
        green: 'bg-green-600 hover:bg-green-700 text-white border-green-700',
        amber: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700',
        outline: 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300',
    };
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border shadow-sm transition-colors ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

const StepShell: React.FC<{
    stepNum: number;
    title: string;
    done: boolean;
    active: boolean;
    children: React.ReactNode;
}> = ({ stepNum, title, done, active, children }) => (
    <div className={`relative flex gap-4 rounded-lg p-3 border-2 shadow-sm transition-all ${
        active
            ? 'bg-white border-indigo-500 ring-2 ring-indigo-200'
            : done
              ? 'bg-white border-purple-400'
              : 'bg-gray-50 border-gray-300 opacity-80'
    }`}>
        <div className="flex flex-col items-center flex-shrink-0">
            <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md z-10 ${
                    done
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
                        : active
                          ? 'bg-indigo-600 text-white scale-110'
                          : 'bg-gray-300 text-gray-600'
                }`}
            >
                {done ? '✓' : stepNum}
            </div>
        </div>
        <div className="flex-1 min-w-0 space-y-2">{children}</div>
    </div>
);

export const DeliveryPaintingFlowTimeline: React.FC<DeliveryPaintingFlowTimelineProps> = ({
    delivery,
    formatDate,
    actions,
}) => {
    const act = actions;
    const current = getPaintingFlowStep(delivery);
    const ps = delivery.paintingStatus;
    const price = delivery.paintingPrice ?? 20;
    const canSchedule =
        Boolean(delivery.readyAt) &&
        (ps === 'deferred' || ps === 'paid' || ps === 'pending_payment');
    const isScheduled = ps === 'scheduled' && Boolean(delivery.paintingBookingDate);

    return (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-300 shadow-sm">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-sm font-bold text-purple-900">🎨 Entrega + pintura (5 pasos)</span>
                <span className="text-xs bg-white px-2 py-1 rounded-full border border-purple-300 text-purple-800 font-semibold">
                    Paso actual: {current}/5
                </span>
            </div>
            <p className="text-[11px] text-purple-800 mb-4 bg-purple-100/80 border border-purple-200 rounded-lg px-3 py-2">
                Sigue los pasos en orden. Los botones de cada paso están aquí mismo — no hace falta buscar abajo en la tarjeta.
            </p>

            <div className="relative space-y-3 pl-1">
                <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-purple-200" />

                {/* 1 — Formulario */}
                <StepShell
                    stepNum={1}
                    title="Entrega creada"
                    done
                    active={current === 1}
                >
                    <div className="font-bold text-blue-900">📦 1. Cliente subió piezas (formulario)</div>
                    <p className="text-xs text-gray-700">
                        {delivery.createdByClient ? '👤 Cliente usó el formulario/QR' : 'Creada en admin'} ·{' '}
                        {formatDate(delivery.createdAt)}
                    </p>
                    <p className="text-xs text-purple-800 font-medium">
                        Eligió <strong>pintar en taller</strong> · sesión ~2 h · ${price}
                    </p>
                </StepShell>

                {/* 2 — Pago */}
                <StepShell
                    stepNum={2}
                    title="Pago pintura"
                    done={ps !== 'pending_payment'}
                    active={current === 2}
                >
                    <div className="font-bold text-amber-900">💰 2. Pago del servicio de pintura</div>
                    <p className="text-xs text-gray-700">
                        El cliente debería pagar antes de agendar. Si no pagó, podés seguir el flujo sin marcar como cobrado.
                    </p>
                    <span
                        className={`inline-block text-xs font-bold px-2 py-1 rounded border ${
                            ps === 'pending_payment'
                                ? 'bg-yellow-100 text-yellow-900 border-yellow-300'
                                : ps === 'deferred'
                                  ? 'bg-sky-100 text-sky-900 border-sky-300'
                                  : 'bg-green-100 text-green-900 border-green-300'
                        }`}
                    >
                        {paintingPaymentLabel(ps, price)}
                    </span>
                    {act && (ps === 'pending_payment' || (ps === 'deferred' && !delivery.paintingPaidAt)) && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {ps === 'pending_payment' && (
                                <>
                                    <StepBtn variant="sky" onClick={act.onDeferPayment}>
                                        📋 Acordar cobro después
                                    </StepBtn>
                                    <StepBtn variant="yellow" onClick={act.onRegisterPayment}>
                                        💰 Registrar cobro ${price}
                                    </StepBtn>
                                </>
                            )}
                            {ps === 'deferred' && !delivery.paintingPaidAt && (
                                <StepBtn variant="yellow" onClick={act.onRegisterPayment}>
                                    💰 Registrar cobro ${price}
                                </StepBtn>
                            )}
                        </div>
                    )}
                </StepShell>

                {/* 3 — Pieza lista */}
                <StepShell
                    stepNum={3}
                    title="Pieza lista"
                    done={Boolean(delivery.readyAt)}
                    active={current === 3}
                >
                    <div className="font-bold text-purple-900">✨ 3. Pieza lista → cliente agenda pintura</div>
                    {delivery.readyAt ? (
                        <p className="text-xs text-purple-700">
                            Lista desde {formatDate(delivery.readyAt)}. Email enviado con enlace para reservar horario
                            {(ps === 'pending_payment' || ps === 'deferred') &&
                                ' (incluye recordatorio de pago / comprobante o pago el día de la cita)'}
                            .
                        </p>
                    ) : (
                        <p className="text-xs text-orange-800 font-semibold">
                            Cuando la pieza esté terminada en taller, notificá al cliente para que agende su sesión.
                        </p>
                    )}
                    {act && delivery.status !== 'completed' && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {!delivery.readyAt ? (
                                <StepBtn variant="primary" onClick={act.onMarkReady}>
                                    ✨ Pieza lista → Notificar cliente
                                </StepBtn>
                            ) : (
                                <StepBtn variant="outline" onClick={act.onResendReadyEmail}>
                                    📧 Reenviar email «lista para pintar»
                                </StepBtn>
                            )}
                        </div>
                    )}
                </StepShell>

                {/* 4 — Sesión / pintura */}
                <StepShell
                    stepNum={4}
                    title="Pintura en taller"
                    done={ps === 'completed'}
                    active={current === 4}
                >
                    <div className="font-bold text-pink-900">🎨 4. Cliente agenda y pinta</div>
                    {!delivery.readyAt && (
                        <p className="text-xs text-gray-500 italic">Disponible después del paso 3 (pieza lista).</p>
                    )}
                    {delivery.readyAt && ps === 'pending_payment' && (
                        <p className="text-xs text-amber-800">
                            El cliente aún no pagó: puede agendar desde el email, pero recordá cobrar o usar «cobro después» arriba.
                        </p>
                    )}
                    {isScheduled && delivery.paintingBookingDate && (
                        <p className="text-xs text-blue-800 font-medium">
                            📅 Cita: {formatDate(delivery.paintingBookingDate)}
                        </p>
                    )}
                    {ps === 'paid' && !delivery.paintingBookingDate && (
                        <p className="text-xs text-orange-800">👉 Agendar sesión (admin) o esperar reserva del cliente por web.</p>
                    )}
                    {ps === 'deferred' && !delivery.paintingBookingDate && (
                        <p className="text-xs text-orange-800">👉 Agendar sesión en calendario (cobro después).</p>
                    )}
                    {act && delivery.readyAt && ps !== 'completed' && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {canSchedule && !isScheduled && (
                                <StepBtn variant="blue" onClick={act.onOpenScheduleModal}>
                                    📅 Agendar pintura (agenda)
                                </StepBtn>
                            )}
                            {isScheduled && (
                                <>
                                    <StepBtn variant="purple" onClick={act.onMarkPaintingCompleted}>
                                        🎉 Pintura completada
                                    </StepBtn>
                                    <StepBtn variant="blue" onClick={act.onOpenScheduleModal}>
                                        📅 Corregir / reagendar
                                    </StepBtn>
                                </>
                            )}
                            {(ps === 'paid' || ps === 'deferred') && !isScheduled && (
                                <StepBtn variant="amber" onClick={act.onForcePaintingCompleted}>
                                    Ya pintó (sin cita en sistema)
                                </StepBtn>
                            )}
                        </div>
                    )}
                </StepShell>

                {/* 5 — Horneado y retiro */}
                <StepShell
                    stepNum={5}
                    title="Horneado y retiro"
                    done={delivery.status === 'completed'}
                    active={current === 5}
                >
                    <div className="font-bold text-green-900">🔥 5. Horneado final y retiro</div>
                    {delivery.paintingPickupNotifiedAt ? (
                        <p className="text-xs text-green-700">
                            Cliente avisado {formatDate(delivery.paintingPickupNotifiedAt)} · email de retiro enviado.
                        </p>
                    ) : ps === 'completed' ? (
                        <p className="text-xs text-amber-800">Pieza pintada. Avisá cuando salga del horno.</p>
                    ) : (
                        <p className="text-xs text-gray-500 italic">Después de marcar pintura completada.</p>
                    )}
                    {act && ps === 'completed' && delivery.status !== 'completed' && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {!delivery.paintingPickupNotifiedAt ? (
                                <StepBtn variant="green" onClick={() => act.onNotifyPickup(false)}>
                                    🔥 Horneado listo → Avisar cliente
                                </StepBtn>
                            ) : (
                                <>
                                    <StepBtn variant="outline" onClick={() => act.onNotifyPickup(true)}>
                                        📧 Reenviar email retiro
                                    </StepBtn>
                                    <StepBtn variant="green" onClick={act.onCompleteDelivery}>
                                        ✅ Cliente retiró pieza
                                    </StepBtn>
                                </>
                            )}
                        </div>
                    )}
                </StepShell>
            </div>
        </div>
    );
};
