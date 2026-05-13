import React, { useEffect, useMemo, useState } from 'react';
import type { Booking, CorporateEvent, CorporateEventStage, NavigationState } from '../../types';
import * as dataService from '../../services/dataService';
import { useAdminData } from '../../context/AdminDataContext';

const STAGES: { id: CorporateEventStage; label: string }[] = [
    { id: 'lead', label: 'Lead' },
    { id: 'quoted', label: 'Cotizado' },
    { id: 'deposit_received', label: 'Anticipo recibido' },
    { id: 'scheduled', label: 'Confirmado en agenda' },
    { id: 'in_progress', label: 'En curso' },
    { id: 'closed', label: 'Cerrado' },
    { id: 'cancelled', label: 'Cancelado' },
];

const STAGE_BADGE: Record<CorporateEventStage, string> = {
    lead: 'bg-slate-100 text-slate-800',
    quoted: 'bg-amber-100 text-amber-900',
    deposit_received: 'bg-emerald-100 text-emerald-900',
    scheduled: 'bg-blue-100 text-blue-900',
    in_progress: 'bg-violet-100 text-violet-900',
    closed: 'bg-gray-200 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
};

interface CorporateEventsPanelProps {
    onDataChange: () => void;
    navigateToId?: string;
    setNavigateTo?: React.Dispatch<React.SetStateAction<NavigationState | null>>;
    onNavigationComplete?: () => void;
}

const emptyForm = (): Omit<CorporateEvent, 'id' | 'createdAt' | 'updatedAt'> => ({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    countryCode: '+593',
    stage: 'lead',
    locationType: 'studio',
    locationNotes: '',
    allowFood: false,
    allowDecoration: false,
    allowEscort: false,
    groupDynamicsNotes: '',
    specialRequirements: '',
    participantsEstimate: 0,
    depositAmount: null,
    depositDueDate: null,
    depositReceived: false,
    activityLog: [],
    sourceInquiryId: null,
});

export const CorporateEventsPanel: React.FC<CorporateEventsPanelProps> = ({
    onDataChange,
    navigateToId,
    setNavigateTo,
    onNavigationComplete,
}) => {
    const { corporateEvents, bookings, optimisticPatchBooking } = useAdminData();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [stageFilter, setStageFilter] = useState<CorporateEventStage | 'all'>('all');
    const [saving, setSaving] = useState(false);
    const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState(emptyForm());
    const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});

    useEffect(() => {
        if (navigateToId) {
            setExpandedId(navigateToId);
            const el = document.getElementById(`corp-event-${navigateToId}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            onNavigationComplete?.();
        }
    }, [navigateToId, onNavigationComplete]);

    const filtered = useMemo(() => {
        if (stageFilter === 'all') return corporateEvents;
        return corporateEvents.filter((e) => e.stage === stageFilter);
    }, [corporateEvents, stageFilter]);

    const bookingsForLink = useMemo(() => {
        return [...bookings].sort((a, b) => (b.bookingCode || '').localeCompare(a.bookingCode || ''));
    }, [bookings]);

    const handleCreate = async () => {
        setSaving(true);
        try {
            await dataService.addCorporateEvent({
                ...createForm,
                activityLog: [],
            });
            setCreateForm(emptyForm());
            setShowCreate(false);
            onDataChange();
        } catch (e) {
            console.error(e);
            alert('No se pudo crear el evento.');
        } finally {
            setSaving(false);
        }
    };

    const handleStage = async (ev: CorporateEvent, stage: CorporateEventStage) => {
        setSaving(true);
        try {
            await dataService.updateCorporateEvent({ id: ev.id, stage });
            onDataChange();
        } catch (e) {
            console.error(e);
            alert('No se pudo actualizar la etapa.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveFields = async (ev: CorporateEvent, patch: Partial<CorporateEvent>) => {
        setSaving(true);
        try {
            await dataService.updateCorporateEvent({ id: ev.id, ...patch });
            onDataChange();
        } catch (e) {
            console.error(e);
            alert('No se pudo guardar.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddNote = async (evId: string) => {
        const text = (noteDrafts[evId] || '').trim();
        if (!text) return;
        setSaving(true);
        try {
            await dataService.addCorporateEventActivity(evId, text);
            setNoteDrafts((d) => ({ ...d, [evId]: '' }));
            onDataChange();
        } catch (e) {
            console.error(e);
            alert('No se pudo guardar la nota.');
        } finally {
            setSaving(false);
        }
    };

    const handleLinkBooking = async (evId: string) => {
        const bookingId = (linkDrafts[evId] || '').trim();
        if (!bookingId) {
            alert('Elige una reserva.');
            return;
        }
        setSaving(true);
        try {
            const res = await dataService.linkBookingCorporateEvent(bookingId, evId);
            if (res.booking) {
                optimisticPatchBooking(bookingId, { corporateEventId: evId });
            }
            setLinkDrafts((d) => ({ ...d, [evId]: '' }));
            onDataChange();
        } catch (e) {
            console.error(e);
            alert('No se pudo vincular la reserva.');
        } finally {
            setSaving(false);
        }
    };

    const handleUnlinkBooking = async (b: Booking) => {
        if (!b.corporateEventId) return;
        if (!window.confirm('¿Quitar la vinculación de esta reserva con el evento corporativo?')) return;
        setSaving(true);
        try {
            await dataService.linkBookingCorporateEvent(b.id, null);
            optimisticPatchBooking(b.id, { corporateEventId: undefined });
            onDataChange();
        } catch (e) {
            console.error(e);
            alert('No se pudo desvincular.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!window.confirm('¿Eliminar este evento corporativo? Las reservas quedarán sin vincular.')) return;
        setSaving(true);
        try {
            await dataService.deleteCorporateEvent(id);
            if (expandedId === id) setExpandedId(null);
            onDataChange();
        } catch (e) {
            console.error(e);
            alert('No se pudo eliminar.');
        } finally {
            setSaving(false);
        }
    };

    const linkedBookings = (evId: string) => bookings.filter((b) => b.corporateEventId === evId);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-serif text-brand-text">Eventos corporativos especiales</h2>
                    <p className="text-brand-secondary text-sm mt-1 max-w-2xl">
                        Proyectos B2B con ubicación, permisos, anticipos y seguimiento. Las reservas en agenda se vinculan aquí para
                        mantener la misma caja y calendario.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowCreate((v) => !v)}
                    className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent transition-colors"
                >
                    {showCreate ? 'Cerrar formulario' : 'Nuevo evento'}
                </button>
            </div>

            {showCreate && (
                <div className="border border-brand-border rounded-lg p-4 bg-brand-background space-y-3">
                    <h3 className="font-bold text-brand-text">Crear evento</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <label className="block text-sm">
                            <span className="text-brand-secondary">Empresa / nombre del evento</span>
                            <input
                                className="mt-1 w-full border rounded px-2 py-1"
                                value={createForm.companyName}
                                onChange={(e) => setCreateForm((f) => ({ ...f, companyName: e.target.value }))}
                            />
                        </label>
                        <label className="block text-sm">
                            <span className="text-brand-secondary">Contacto</span>
                            <input
                                className="mt-1 w-full border rounded px-2 py-1"
                                value={createForm.contactName}
                                onChange={(e) => setCreateForm((f) => ({ ...f, contactName: e.target.value }))}
                            />
                        </label>
                        <label className="block text-sm">
                            <span className="text-brand-secondary">Email</span>
                            <input
                                className="mt-1 w-full border rounded px-2 py-1"
                                type="email"
                                value={createForm.email}
                                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                            />
                        </label>
                        <label className="block text-sm">
                            <span className="text-brand-secondary">Teléfono</span>
                            <input
                                className="mt-1 w-full border rounded px-2 py-1"
                                value={createForm.phone}
                                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                            />
                        </label>
                        <label className="block text-sm">
                            <span className="text-brand-secondary">Participantes (estimado)</span>
                            <input
                                className="mt-1 w-full border rounded px-2 py-1"
                                type="number"
                                min={0}
                                value={createForm.participantsEstimate}
                                onChange={(e) =>
                                    setCreateForm((f) => ({ ...f, participantsEstimate: parseInt(e.target.value, 10) || 0 }))
                                }
                            />
                        </label>
                        <label className="block text-sm">
                            <span className="text-brand-secondary">Ubicación</span>
                            <select
                                className="mt-1 w-full border rounded px-2 py-1"
                                value={createForm.locationType}
                                onChange={(e) =>
                                    setCreateForm((f) => ({ ...f, locationType: e.target.value as CorporateEvent['locationType'] }))
                                }
                            >
                                <option value="studio">En el estudio</option>
                                <option value="external">Externa / otra sede</option>
                            </select>
                        </label>
                    </div>
                    <label className="block text-sm">
                        <span className="text-brand-secondary">Notas de ubicación / dirección</span>
                        <textarea
                            className="mt-1 w-full border rounded px-2 py-1 text-sm"
                            rows={2}
                            value={createForm.locationNotes}
                            onChange={(e) => setCreateForm((f) => ({ ...f, locationNotes: e.target.value }))}
                        />
                    </label>
                    <div className="flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={createForm.allowFood}
                                onChange={(e) => setCreateForm((f) => ({ ...f, allowFood: e.target.checked }))}
                            />
                            Permite alimentos
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={createForm.allowDecoration}
                                onChange={(e) => setCreateForm((f) => ({ ...f, allowDecoration: e.target.checked }))}
                            />
                            Permite decoración
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={createForm.allowEscort}
                                onChange={(e) => setCreateForm((f) => ({ ...f, allowEscort: e.target.checked }))}
                            />
                            Permite acompañante / maneje
                        </label>
                    </div>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={handleCreate}
                        className="bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                    >
                        Guardar evento
                    </button>
                </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-bold text-brand-secondary">Filtrar etapa:</span>
                <button
                    type="button"
                    onClick={() => setStageFilter('all')}
                    className={`text-xs font-bold px-2 py-1 rounded ${stageFilter === 'all' ? 'bg-brand-primary text-white' : 'bg-gray-100'}`}
                >
                    Todas
                </button>
                {STAGES.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => setStageFilter(s.id)}
                        className={`text-xs font-bold px-2 py-1 rounded ${stageFilter === s.id ? 'bg-brand-primary text-white' : STAGE_BADGE[s.id]}`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <ul className="space-y-3">
                {filtered.map((ev) => {
                    const open = expandedId === ev.id;
                    return (
                        <li
                            key={ev.id}
                            id={`corp-event-${ev.id}`}
                            className="border border-brand-border rounded-lg bg-white overflow-hidden"
                        >
                            <button
                                type="button"
                                className="w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-2 hover:bg-brand-background/80"
                                onClick={() => setExpandedId(open ? null : ev.id)}
                            >
                                <div>
                                    <div className="font-bold text-brand-text">{ev.companyName || '(Sin nombre)'}</div>
                                    <div className="text-sm text-brand-secondary">
                                        {ev.contactName} · {ev.email}
                                    </div>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${STAGE_BADGE[ev.stage]}`}>
                                    {STAGES.find((s) => s.id === ev.stage)?.label || ev.stage}
                                </span>
                            </button>
                            {open && (
                                <div className="px-4 pb-4 pt-0 border-t border-brand-border space-y-4">
                                    <div className="flex flex-wrap gap-2 pt-3">
                                        <span className="text-xs font-bold text-brand-secondary w-full">Cambiar etapa</span>
                                        {STAGES.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                disabled={saving || ev.stage === s.id}
                                                onClick={() => handleStage(ev, s.id)}
                                                className={`text-xs font-bold px-2 py-1 rounded ${ev.stage === s.id ? 'ring-2 ring-brand-primary' : ''} ${STAGE_BADGE[s.id]}`}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                        <label className="block">
                                            Empresa
                                            <input
                                                className="mt-1 w-full border rounded px-2 py-1"
                                                defaultValue={ev.companyName}
                                                key={`cn-${ev.id}-${ev.updatedAt}`}
                                                onBlur={(e) => {
                                                    if (e.target.value !== ev.companyName) {
                                                        handleSaveFields(ev, { companyName: e.target.value });
                                                    }
                                                }}
                                            />
                                        </label>
                                        <label className="block">
                                            Contacto
                                            <input
                                                className="mt-1 w-full border rounded px-2 py-1"
                                                defaultValue={ev.contactName}
                                                key={`ct-${ev.id}-${ev.updatedAt}`}
                                                onBlur={(e) => {
                                                    if (e.target.value !== ev.contactName) {
                                                        handleSaveFields(ev, { contactName: e.target.value });
                                                    }
                                                }}
                                            />
                                        </label>
                                        <label className="block">
                                            Email
                                            <input
                                                className="mt-1 w-full border rounded px-2 py-1"
                                                defaultValue={ev.email}
                                                key={`em-${ev.id}-${ev.updatedAt}`}
                                                onBlur={(e) => {
                                                    if (e.target.value !== ev.email) {
                                                        handleSaveFields(ev, { email: e.target.value });
                                                    }
                                                }}
                                            />
                                        </label>
                                        <label className="block">
                                            Teléfono
                                            <input
                                                className="mt-1 w-full border rounded px-2 py-1"
                                                defaultValue={ev.phone}
                                                key={`ph-${ev.id}-${ev.updatedAt}`}
                                                onBlur={(e) => {
                                                    if (e.target.value !== ev.phone) {
                                                        handleSaveFields(ev, { phone: e.target.value });
                                                    }
                                                }}
                                            />
                                        </label>
                                        <label className="block">
                                            Participantes (est.)
                                            <input
                                                className="mt-1 w-full border rounded px-2 py-1"
                                                type="number"
                                                defaultValue={ev.participantsEstimate}
                                                key={`pe-${ev.id}-${ev.updatedAt}`}
                                                onBlur={(e) => {
                                                    const n = parseInt(e.target.value, 10) || 0;
                                                    if (n !== ev.participantsEstimate) handleSaveFields(ev, { participantsEstimate: n });
                                                }}
                                            />
                                        </label>
                                        <label className="block">
                                            Ubicación
                                            <select
                                                className="mt-1 w-full border rounded px-2 py-1"
                                                defaultValue={ev.locationType}
                                                key={`lt-${ev.id}-${ev.updatedAt}`}
                                                onChange={(e) =>
                                                    handleSaveFields(ev, { locationType: e.target.value as CorporateEvent['locationType'] })
                                                }
                                            >
                                                <option value="studio">En el estudio</option>
                                                <option value="external">Externa</option>
                                            </select>
                                        </label>
                                        <label className="block sm:col-span-2">
                                            Notas ubicación
                                            <textarea
                                                className="mt-1 w-full border rounded px-2 py-1"
                                                rows={2}
                                                defaultValue={ev.locationNotes}
                                                key={`ln-${ev.id}-${ev.updatedAt}`}
                                                onBlur={(e) => {
                                                    if (e.target.value !== ev.locationNotes) {
                                                        handleSaveFields(ev, { locationNotes: e.target.value });
                                                    }
                                                }}
                                            />
                                        </label>
                                        <label className="block sm:col-span-2">
                                            Dinámica grupal
                                            <textarea
                                                className="mt-1 w-full border rounded px-2 py-1"
                                                rows={2}
                                                defaultValue={ev.groupDynamicsNotes}
                                                key={`gd-${ev.id}-${ev.updatedAt}`}
                                                onBlur={(e) => {
                                                    if (e.target.value !== ev.groupDynamicsNotes) {
                                                        handleSaveFields(ev, { groupDynamicsNotes: e.target.value });
                                                    }
                                                }}
                                            />
                                        </label>
                                        <label className="block sm:col-span-2">
                                            Requisitos especiales
                                            <textarea
                                                className="mt-1 w-full border rounded px-2 py-1"
                                                rows={2}
                                                defaultValue={ev.specialRequirements}
                                                key={`sr-${ev.id}-${ev.updatedAt}`}
                                                onBlur={(e) => {
                                                    if (e.target.value !== ev.specialRequirements) {
                                                        handleSaveFields(ev, { specialRequirements: e.target.value });
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                defaultChecked={ev.allowFood}
                                                onChange={(e) => handleSaveFields(ev, { allowFood: e.target.checked })}
                                            />
                                            Alimentos
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                defaultChecked={ev.allowDecoration}
                                                onChange={(e) => handleSaveFields(ev, { allowDecoration: e.target.checked })}
                                            />
                                            Decoración
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                defaultChecked={ev.allowEscort}
                                                onChange={(e) => handleSaveFields(ev, { allowEscort: e.target.checked })}
                                            />
                                            Acompañante / maneje
                                        </label>
                                    </div>

                                    <div className="grid sm:grid-cols-3 gap-3 text-sm border-t pt-3">
                                        <label className="block">
                                            Anticipo (monto)
                                            <input
                                                className="mt-1 w-full border rounded px-2 py-1"
                                                type="number"
                                                step="0.01"
                                                defaultValue={ev.depositAmount ?? ''}
                                                key={`da-${ev.id}-${ev.updatedAt}`}
                                                onBlur={(e) => {
                                                    const v = e.target.value === '' ? null : parseFloat(e.target.value);
                                                    if (v !== ev.depositAmount) handleSaveFields(ev, { depositAmount: v });
                                                }}
                                            />
                                        </label>
                                        <label className="block">
                                            Fecha límite anticipo
                                            <input
                                                className="mt-1 w-full border rounded px-2 py-1"
                                                type="date"
                                                defaultValue={ev.depositDueDate || ''}
                                                key={`dd-${ev.id}-${ev.updatedAt}`}
                                                onBlur={(e) => {
                                                    const v = e.target.value || null;
                                                    if (v !== ev.depositDueDate) handleSaveFields(ev, { depositDueDate: v });
                                                }}
                                            />
                                        </label>
                                        <label className="flex items-end gap-2 pb-1">
                                            <input
                                                type="checkbox"
                                                defaultChecked={ev.depositReceived}
                                                onChange={(e) => handleSaveFields(ev, { depositReceived: e.target.checked })}
                                            />
                                            Anticipo recibido
                                        </label>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-brand-text mb-2">Reservas vinculadas (agenda)</h4>
                                        <ul className="text-sm space-y-1 mb-2">
                                            {linkedBookings(ev.id).length === 0 ? (
                                                <li className="text-brand-secondary">Ninguna aún.</li>
                                            ) : (
                                                linkedBookings(ev.id).map((b) => (
                                                    <li key={b.id} className="flex flex-wrap items-center gap-2">
                                                        <span className="font-mono text-xs">{b.bookingCode}</span>
                                                        <span>
                                                            {b.userInfo?.firstName} {b.userInfo?.lastName}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="text-red-600 text-xs underline"
                                                            onClick={() => handleUnlinkBooking(b)}
                                                        >
                                                            Quitar vínculo
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="text-brand-accent text-xs underline"
                                                            onClick={() =>
                                                                setNavigateTo?.({
                                                                    tab: 'schedule',
                                                                    targetId: b.id,
                                                                })
                                                            }
                                                        >
                                                            Ver en calendario
                                                        </button>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <select
                                                className="border rounded px-2 py-1 text-sm min-w-[200px]"
                                                value={linkDrafts[ev.id] || ''}
                                                onChange={(e) => setLinkDrafts((d) => ({ ...d, [ev.id]: e.target.value }))}
                                            >
                                                <option value="">Seleccionar reserva…</option>
                                                {bookingsForLink.map((b) => (
                                                    <option key={b.id} value={b.id}>
                                                        {b.bookingCode} — {b.userInfo?.firstName} {b.userInfo?.lastName}
                                                        {b.corporateEventId ? ' (ya vinculada)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => handleLinkBooking(ev.id)}
                                                className="bg-brand-primary text-white text-sm font-bold px-3 py-1 rounded"
                                            >
                                                Vincular
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-brand-text mb-2">Bitácora</h4>
                                        <ul className="space-y-2 max-h-48 overflow-y-auto text-sm mb-2">
                                            {[...ev.activityLog].reverse().map((a) => (
                                                <li key={a.id} className="bg-brand-background p-2 rounded border-l-4 border-brand-accent">
                                                    <div className="text-xs text-brand-secondary">
                                                        {new Date(a.at).toLocaleString('es-EC')}
                                                        {a.author ? ` · ${a.author}` : ''}
                                                    </div>
                                                    <div className="whitespace-pre-wrap">{a.body}</div>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="flex gap-2">
                                            <textarea
                                                className="flex-1 border rounded px-2 py-1 text-sm"
                                                rows={2}
                                                placeholder="Nueva nota interna…"
                                                value={noteDrafts[ev.id] || ''}
                                                onChange={(e) => setNoteDrafts((d) => ({ ...d, [ev.id]: e.target.value }))}
                                            />
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => handleAddNote(ev.id)}
                                                className="self-end bg-brand-secondary text-white text-sm font-bold px-3 py-2 rounded"
                                            >
                                                Añadir
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-end border-t pt-3">
                                        <button
                                            type="button"
                                            className="text-red-600 text-sm font-bold underline"
                                            onClick={() => handleDeleteEvent(ev.id)}
                                        >
                                            Eliminar evento
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            {filtered.length === 0 && (
                <p className="text-center text-brand-secondary py-8">No hay eventos en este filtro.</p>
            )}
        </div>
    );
};
