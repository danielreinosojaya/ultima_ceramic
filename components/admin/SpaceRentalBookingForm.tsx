import React, { useEffect, useMemo, useState } from 'react';
import type { Customer, Booking } from '../../types';
import { getEcuadorToday, formatDateToYYYYMMDD } from '../../utils/formatters';
import { addHoursToTime, formatSpaceRentalLabel, type SpaceRentalHours } from '../../utils/spaceRental';
import * as dataService from '../../services/dataService';
import type { SpaceRentalAvailabilityResult } from '../../services/dataService';

interface SpaceRentalBookingFormProps {
  selectedCustomer: Customer;
  onBack: () => void;
  onSuccess: (booking: Booking | null, message: string) => void;
}

type Step = 'form' | 'confirm';
type TechniqueOption = 'potters_wheel' | 'hand_modeling' | 'painting' | null;

const HOUR_OPTIONS: SpaceRentalHours[] = [2, 3, 4, 5];

const timeOptions = Array.from({ length: 25 }, (_, i) => {
  const hour = 9 + Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${min}`;
});

const techniqueLabels: Record<string, string> = {
  potters_wheel: 'Torno Alfarero',
  hand_modeling: 'Modelado a Mano',
  painting: 'Pintura de piezas',
};

const kindStyles: Record<string, string> = {
  class: 'bg-sky-100 text-sky-900 border-sky-200',
  rental: 'bg-rose-100 text-rose-900 border-rose-200',
  course: 'bg-violet-100 text-violet-900 border-violet-200',
  private_block: 'bg-amber-100 text-amber-950 border-amber-200',
  proposed: 'bg-emerald-100 text-emerald-900 border-emerald-300',
};

const kindDot: Record<string, string> = {
  class: 'bg-sky-500',
  rental: 'bg-rose-500',
  course: 'bg-violet-500',
  private_block: 'bg-amber-500',
  proposed: 'bg-emerald-500',
};

const kindLabel: Record<string, string> = {
  class: 'Clase',
  rental: 'Privado',
  course: 'Curso',
  private_block: 'Bloqueo',
  proposed: 'Tu alquiler',
};

export const SpaceRentalBookingForm: React.FC<SpaceRentalBookingFormProps> = ({
  selectedCustomer,
  onBack,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>('form');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [hours, setHours] = useState<SpaceRentalHours>(3);
  const [participants, setParticipants] = useState('8');
  const [price, setPrice] = useState('');
  const [technique, setTechnique] = useState<TechniqueOption>(null);
  const [includeCeramic, setIncludeCeramic] = useState(false);
  const [clientNote, setClientNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<SpaceRentalAvailabilityResult | null>(null);
  const [checking, setChecking] = useState(false);

  const endTime = useMemo(
    () => (startTime ? addHoursToTime(startTime, hours) : ''),
    [startTime, hours]
  );

  const participantCount = Math.max(1, parseInt(participants, 10) || 1);
  const priceNumber = Number(price);
  const hasScheduleSelection = Boolean(date && startTime);
  const isAvailable = availability?.available === true;
  const hasConflict = availability?.available === false;
  const canProceedToConfirm = hasScheduleSelection && isAvailable && !checking;

  useEffect(() => {
    if (!date) {
      setAvailability(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setChecking(true);
      const result = await dataService.checkSpaceRentalAvailability({
        date,
        time: startTime || undefined,
        hours: startTime ? hours : undefined,
      });
      if (!cancelled) {
        setAvailability(result);
        setChecking(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [date, startTime, hours]);

  const validateForm = (): string | null => {
    if (!date) return 'Elige el día del evento.';
    if (!startTime) return 'Elige la hora de inicio.';
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) return 'Indica el precio acordado (mayor a 0).';
    if (!selectedCustomer?.userInfo?.email) return 'El cliente no tiene email. Agrégalo antes de continuar.';
    if (checking) return 'Espera un momento: estamos validando el horario.';
    if (!isAvailable) {
      return 'Ese horario se solapa con otra reserva. Cambia día u hora antes de continuar.';
    }
    return null;
  };

  const goToConfirm = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStep('confirm');
  };

  const handleConfirmAndSend = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setStep('form');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      // Re-check just before save (race condition guard)
      const live = await dataService.checkSpaceRentalAvailability({
        date,
        time: startTime,
        hours,
      });
      if (!live.success || live.available !== true) {
        setAvailability(live);
        throw new Error(
          live.conflicts?.length
            ? `Horario ocupado: se solapa con “${live.conflicts[0].label}”.`
            : live.error || 'El horario ya no está libre. Vuelve a elegir.'
        );
      }

      const result = await dataService.createSpaceRentalBooking({
        date,
        time: startTime,
        hours,
        participants: participantCount,
        totalPrice: priceNumber,
        technique: includeCeramic ? technique : null,
        clientNote: clientNote.trim() || null,
        userInfo: {
          firstName: selectedCustomer.userInfo.firstName,
          lastName: selectedCustomer.userInfo.lastName,
          email: selectedCustomer.userInfo.email || selectedCustomer.email,
          phone: selectedCustomer.userInfo.phone || '',
          countryCode: selectedCustomer.userInfo.countryCode || '',
          birthday: selectedCustomer.userInfo.birthday || null,
        },
      });

      if (!result.success) {
        throw new Error(result.error || 'No se pudo guardar el alquiler');
      }

      const msg = result.emailSent
        ? `Alquiler guardado. Se envió un correo a ${selectedCustomer.userInfo.email || selectedCustomer.email} con los detalles.`
        : `Alquiler guardado (código ${result.bookingCode}), pero el correo no se envió. Revisa el email del cliente.`;

      onSuccess(result.booking ?? null, msg);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el alquiler');
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderAvailabilityPanel = () => {
    if (!date) {
      return (
        <div className="rounded-2xl border border-dashed border-brand-border bg-brand-surface/60 p-4 text-sm text-brand-secondary">
          Elige un día para ver qué hay agendado en el taller.
        </div>
      );
    }

    const schedule = availability?.daySchedule || [];
    const conflicts = availability?.conflicts || [];

    return (
      <div className="space-y-3">
        {/* Status banner */}
        {!startTime ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 items-center rounded-full bg-sky-600 px-2.5 text-[11px] font-bold uppercase tracking-wide text-white">
              Día
            </span>
            <div>
              <p className="text-sm font-semibold text-sky-950">Vista del día {date}</p>
              <p className="text-sm text-sky-900/80 mt-0.5">
                Elige hora y duración para validar si tu alquiler cabe sin solapes.
              </p>
            </div>
          </div>
        ) : checking ? (
          <div className="rounded-2xl border border-brand-border bg-white px-4 py-3 flex items-center gap-3">
            <span className="h-4 w-4 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
            <p className="text-sm text-brand-text">Validando disponibilidad…</p>
          </div>
        ) : hasConflict ? (
          <div className="rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-50 to-orange-50 px-4 py-3.5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                No disponible
              </span>
              <span className="text-sm font-semibold text-rose-950">
                Hay solape en {formatSpaceRentalLabel(hours, startTime)}
              </span>
            </div>
            <p className="text-sm text-rose-900/90 mb-2">
              No puedes continuar con este horario. Cambia la hora o el día.
            </p>
            <ul className="space-y-1.5">
              {conflicts.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-2 rounded-xl border border-rose-200/80 bg-white/80 px-3 py-2 text-sm"
                >
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${kindDot[c.kind] || 'bg-rose-500'}`} />
                  <div>
                    <p className="font-semibold text-rose-950">{c.label}</p>
                    <p className="text-xs text-rose-800/80">
                      {c.startTime} – {c.endTime}
                      {c.subtitle ? ` · ${c.subtitle}` : ''}
                      {c.kind ? ` · ${kindLabel[c.kind] || c.kind}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : isAvailable ? (
          <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 px-4 py-3.5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                Libre
              </span>
              <span className="text-sm font-semibold text-emerald-950">
                Puedes proceder · {formatSpaceRentalLabel(hours, startTime)}
              </span>
            </div>
            <p className="text-sm text-emerald-900/85 mt-1.5">
              No hay clases, cursos ni alquileres que se crucen con este horario.
            </p>
          </div>
        ) : availability && !availability.success ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {availability.error || 'No se pudo validar. Intenta de nuevo.'}
          </div>
        ) : null}

        {/* Day timeline overview */}
        <div className="rounded-2xl border border-brand-border bg-white p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className="text-sm font-semibold text-brand-text">Agenda del día</h4>
            <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
              <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-0.5">Clase</span>
              <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5">Privado</span>
              <span className="rounded-full bg-violet-100 text-violet-800 px-2 py-0.5">Curso</span>
            </div>
          </div>

          {startTime && (
            <div className={`mb-3 rounded-xl border px-3 py-2 text-sm ${kindStyles.proposed}`}>
              <span className="font-semibold">Tu alquiler propuesto: </span>
              {startTime} – {endTime} ({hours} h)
            </div>
          )}

          {schedule.length === 0 ? (
            <p className="text-sm text-brand-secondary py-2">
              Este día está vacío en el calendario. Ideal para un alquiler privado.
            </p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {schedule.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-xl border px-3 py-2.5 text-sm transition-all ${
                    item.overlapsProposed
                      ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200'
                      : kindStyles[item.kind] || 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${kindDot[item.kind] || 'bg-gray-400'}`} />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{item.label}</p>
                        <p className="text-xs opacity-80">
                          {item.startTime} – {item.endTime}
                          {item.subtitle ? ` · ${item.subtitle}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                        {kindLabel[item.kind] || item.kind}
                      </span>
                      {item.overlapsProposed && (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          Solapa
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  if (step === 'confirm') {
    const email = selectedCustomer.userInfo.email || selectedCustomer.email;
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setStep('form')}
          className="text-sm font-semibold text-brand-secondary hover:text-brand-text"
        >
          ← Volver a editar
        </button>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              Horario validado
            </span>
            <span className="text-sm font-semibold text-emerald-950">Libre de solapes</span>
          </div>
          <p className="text-sm text-emerald-900/90 leading-relaxed">
            Al confirmar, el taller queda bloqueado en privado y se enviará un correo a{' '}
            <strong className="font-semibold">{email}</strong> con estos datos.
            Si algo está mal, vuelve a editar ahora.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-3">
          <h3 className="text-lg font-semibold text-brand-text">Resumen del alquiler</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-brand-secondary">Cliente</dt>
              <dd className="font-medium text-brand-text">
                {selectedCustomer.userInfo.firstName} {selectedCustomer.userInfo.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary">Email</dt>
              <dd className="font-medium text-brand-text break-all">{email}</dd>
            </div>
            <div>
              <dt className="text-brand-secondary">Día</dt>
              <dd className="font-medium text-brand-text">{date}</dd>
            </div>
            <div>
              <dt className="text-brand-secondary">Horario</dt>
              <dd className="font-medium text-brand-text">
                {formatSpaceRentalLabel(hours, startTime)}
              </dd>
            </div>
            <div>
              <dt className="text-brand-secondary">Personas</dt>
              <dd className="font-medium text-brand-text">{participantCount}</dd>
            </div>
            <div>
              <dt className="text-brand-secondary">Precio</dt>
              <dd className="font-medium text-brand-primary">${priceNumber.toFixed(2)}</dd>
            </div>
            {includeCeramic && technique && (
              <div>
                <dt className="text-brand-secondary">Actividad</dt>
                <dd className="font-medium text-brand-text">{techniqueLabels[technique]}</dd>
              </div>
            )}
            {clientNote.trim() && (
              <div className="sm:col-span-2">
                <dt className="text-brand-secondary">Notas</dt>
                <dd className="font-medium text-brand-text">{clientNote}</dd>
              </div>
            )}
          </dl>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setStep('form')}
            disabled={submitting}
            className="rounded-xl border border-brand-border px-5 py-2.5 text-sm font-semibold text-brand-secondary hover:bg-gray-50"
          >
            Volver a editar
          </button>
          <button
            type="button"
            onClick={handleConfirmAndSend}
            disabled={submitting}
            className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:bg-gray-400"
          >
            {submitting ? 'Guardando y enviando…' : 'Confirmar y enviar correo al cliente'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-semibold text-brand-secondary hover:text-brand-text"
      >
        ← Volver a tipos de reserva
      </button>

      <div>
        <h3 className="text-xl font-semibold text-brand-text">Alquiler de espacio</h3>
        <p className="text-sm text-brand-secondary mt-1">
          Evento privado. Primero validamos que el horario esté libre; luego confirmas y se envía el correo.
        </p>
      </div>

      <div className="rounded-xl border border-brand-primary/15 bg-brand-primary/[0.05] p-3 text-sm text-brand-text">
        Cliente: <strong>{selectedCustomer.userInfo.firstName} {selectedCustomer.userInfo.lastName}</strong>
        <span className="text-brand-secondary"> · {selectedCustomer.userInfo.email || selectedCustomer.email}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-1">Día del evento</label>
              <input
                type="date"
                value={date}
                min={formatDateToYYYYMMDD(getEcuadorToday())}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-brand-border px-3 py-2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-1">Empieza a las</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-brand-border px-3 py-2.5 bg-white"
              >
                <option value="">Elegir hora</option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-text mb-2">Cuántas horas</label>
            <div className="flex flex-wrap gap-2">
              {HOUR_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHours(h)}
                  className={`min-w-[4.5rem] rounded-full px-4 py-2 text-sm font-semibold border transition-all ${
                    hours === h
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-brand-border bg-white text-brand-text hover:border-brand-primary/40'
                  }`}
                >
                  {h} h
                </button>
              ))}
            </div>
            {startTime && (
              <p className="mt-2 text-sm text-brand-secondary">
                Termina a las <strong className="text-brand-text">{endTime}</strong> (calculado automáticamente)
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-1">Personas</label>
              <input
                type="text"
                inputMode="numeric"
                value={participants}
                onChange={(e) => setParticipants(e.target.value.replace(/\D/g, '').slice(0, 3))}
                className="w-full rounded-xl border border-brand-border px-3 py-2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-1">Precio acordado ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-brand-border px-3 py-2.5"
              />
            </div>
          </div>

          <div className="rounded-xl border border-brand-border p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-brand-text cursor-pointer">
              <input
                type="checkbox"
                checked={includeCeramic}
                onChange={(e) => {
                  setIncludeCeramic(e.target.checked);
                  if (!e.target.checked) setTechnique(null);
                  else if (!technique) setTechnique('painting');
                }}
                className="rounded border-brand-border"
              />
              ¿También harán cerámica durante el alquiler?
            </label>
            {includeCeramic && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    ['potters_wheel', 'Torno'],
                    ['hand_modeling', 'Modelado'],
                    ['painting', 'Pintura'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTechnique(id)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                      technique === id
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                        : 'border-brand-border bg-white hover:border-brand-primary/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-text mb-1">Notas internas (opcional)</label>
            <input
              type="text"
              value={clientNote}
              onChange={(e) => setClientNote(e.target.value)}
              placeholder="Ej. decoración, horario especial, contacto…"
              className="w-full rounded-xl border border-brand-border px-3 py-2.5"
            />
            <p className="text-xs text-brand-secondary mt-1">
              Se guarda en la reserva y aparece en el calendario / PDF. En el correo del alquiler también se muestra al cliente.
            </p>
          </div>
        </div>

        <div>{renderAvailabilityPanel()}</div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-brand-border px-5 py-2.5 text-sm font-semibold text-brand-secondary hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={goToConfirm}
          disabled={!canProceedToConfirm}
          className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed"
          title={
            !hasScheduleSelection
              ? 'Elige día y hora'
              : hasConflict
                ? 'Hay solape: cambia el horario'
                : checking
                  ? 'Validando…'
                  : 'Continuar'
          }
        >
          {hasConflict
            ? 'Horario ocupado'
            : checking
              ? 'Validando…'
              : 'Revisar y confirmar →'}
        </button>
      </div>
    </div>
  );
};
