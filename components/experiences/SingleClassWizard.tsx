import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { GroupTechnique, TimeSlot, Piece, ExperiencePricing, AppData } from '../../types';
import * as dataService from '../../services/dataService';
import { parseLocalDate, getEcuadorDateYmd, isEcuadorSlotInPast } from '../../utils/formatters';
import { SocialBadge } from '../SocialBadge';
import {
  enumerateFixedScheduleDays,
} from '../../utils/fixedScheduleSlots';
import {
  CATALOG_HOME_ITEMS,
  CATALOG_INTRO,
  categoryNeedsOptionStep,
  formatMoney,
  formatSkuPriceLabel,
  getCategoryDisplay,
  getCreativeCategory,
  getCreativeSku,
  getSkuDisplay,
  skuNeedsParticipantsStep,
  skusForCategory,
  totalPriceCharged,
  unitPriceCharged,
  type CreativeCategoryId,
  type CreativeSku,
} from '../../config/creativeExperiences';
import { CatalogSlide, CreativeCatalogCard } from './CreativeCatalogCard';

export interface CreativeBookingMeta {
  serviceKind: string;
  productName: string;
  participants: number;
  skuId: string;
}

export interface SingleClassWizardProps {
  pieces: Piece[];
  availableSlots?: TimeSlot[];
  appData?: AppData;
  initialTechnique?: GroupTechnique;
  onConfirm: (
    pricing: ExperiencePricing,
    selectedSlot: TimeSlot | null,
    technique: GroupTechnique,
    meta: CreativeBookingMeta
  ) => void;
  onBack: () => void;
  isLoading?: boolean;
}

type Step = 'category' | 'option' | 'participants' | 'date' | 'confirmation';

function parseLocalDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Experiencias creativas — misma tubería que Clases Sueltas.
 * Categoría → opción (si aplica) → personas → horario → confirmación.
 */
export const SingleClassWizard: React.FC<SingleClassWizardProps> = ({
  availableSlots = [],
  initialTechnique,
  onConfirm,
  onBack,
  isLoading = false,
}) => {
  const [step, setStep] = useState<Step>('category');
  const [categoryId, setCategoryId] = useState<CreativeCategoryId | null>(null);
  const [sku, setSku] = useState<CreativeSku | null>(null);
  const [pickedSkuFromHome, setPickedSkuFromHome] = useState(false);
  const [participants, setParticipants] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [pricing, setPricing] = useState<ExperiencePricing | null>(null);
  const [error, setError] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [slotAvailabilityCache, setSlotAvailabilityCache] = useState<Record<string, any>>({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<Record<string, any> | null>(null);
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, any>>({});
  const [scheduleSlots, setScheduleSlots] = useState<dataService.AvailableSlotResult[]>([]);
  const [loadingScheduleSlots, setLoadingScheduleSlots] = useState(false);

  const technique: GroupTechnique = sku?.capacityTechnique || 'hand_modeling';
  // Torno con 1-2 personas: solo horarios fijos / slots abiertos por 3+.
  const restrictToFixedSchedule = technique === 'potters_wheel' && participants < 3;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Prefill cerámica desde deep-link de técnica (si viene)
  useEffect(() => {
    if (!initialTechnique || sku) return;
    const map: Partial<Record<GroupTechnique, string>> = {
      painting: 'ceramics_painting',
      hand_modeling: 'ceramics_hand_modeling',
      potters_wheel: 'ceramics_potters_wheel',
    };
    const matchId = map[initialTechnique];
    const match = matchId ? skusForCategory('ceramics').find((s) => s.id === matchId) : undefined;
    if (match) {
      setCategoryId('ceramics');
      setSku(match);
      setParticipants(match.minParticipants);
      setStep(skuNeedsParticipantsStep(match) ? 'participants' : 'date');
    }
  }, [initialTechnique, sku]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [availabilityResult, scheduleOverridesResult] = await Promise.all([
          dataService.getAvailability(),
          dataService.getScheduleOverrides(),
        ]);
        setAvailability(availabilityResult);
        setScheduleOverrides(scheduleOverridesResult || {});
      } catch (err) {
        console.error('[SingleClassWizard] Error loading availability:', err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (availableSlots.length > 0 && !selectedDate && !restrictToFixedSchedule) {
      const uniqueDates = [...new Set(availableSlots.map((s) => s.date))].sort();
      if (uniqueDates.length > 0) setSelectedDate(uniqueDates[0]);
    }
  }, [availableSlots, selectedDate, restrictToFixedSchedule]);

  useEffect(() => {
    if (step !== 'date' || !sku || !restrictToFixedSchedule) return;

    let cancelled = false;
    setLoadingScheduleSlots(true);

    dataService
      .getAvailableSlotsForExperience({
        technique,
        participants,
        startDate: getEcuadorDateYmd(),
        daysAhead: 90,
      })
      .then(async (slots) => {
        if (cancelled) return;
        let bookable = (slots || []).filter(
          (s) => s.canBook && !isEcuadorSlotInPast(s.date, s.time)
        );

        const fallbackDays = enumerateFixedScheduleDays(technique, availability, scheduleOverrides, 90);
        if (bookable.length === 0 && fallbackDays.length > 0) {
          const candidates = fallbackDays
            .flatMap((day) => day.times.map((time) => ({ date: day.date, time })))
            .slice(0, 80);

          const checks = await Promise.allSettled(
            candidates.map((c) =>
              dataService.checkSlotAvailability(c.date, c.time, technique, participants)
            )
          );
          if (cancelled) return;

          bookable = candidates.flatMap((c, index) => {
            const result = checks[index];
            if (result.status !== 'fulfilled') return [];
            const val = result.value;
            if (!val) return [];
            if (isEcuadorSlotInPast(c.date, c.time)) return [];
            if (!val.fetchError && !val.available) return [];
            return [{
              date: c.date,
              time: c.time,
              available: val.capacity?.available ?? 8,
              total: val.capacity?.max ?? 8,
              canBook: true,
              instructor: 'Instructor',
              instructorId: 0,
              technique,
              openedByLargeGroup: val.openedByLargeGroup ?? false,
            }];
          });

          const checksFailed = checks.every((result) => result.status !== 'fulfilled');
          if (bookable.length === 0 && checksFailed) {
            bookable = candidates
              .filter((c) => !isEcuadorSlotInPast(c.date, c.time))
              .map((c) => ({
                date: c.date,
                time: c.time,
                available: 8,
                total: 8,
                canBook: true,
                instructor: 'Instructor',
                instructorId: 0,
                technique,
              }));
          }
        }

        if (cancelled) return;
        setScheduleSlots(bookable);

        const uniqueDates = [...new Set(bookable.map((s) => s.date))].sort();
        if (uniqueDates.length > 0) {
          setSelectedDate((prev) => (prev && uniqueDates.includes(prev) ? prev : uniqueDates[0]));
          const first = parseLocalDateStr(uniqueDates[0]);
          setCurrentMonth(new Date(first.getFullYear(), first.getMonth(), 1));
        } else {
          setSelectedDate('');
        }
      })
      .catch((err) => {
        console.error('[SingleClassWizard] Error loading individual slots:', err);
        if (cancelled) return;
        const fallbackDays = enumerateFixedScheduleDays(technique, availability, scheduleOverrides, 90);
        setScheduleSlots(
          fallbackDays.flatMap((day) =>
            day.times.map((time) => ({
              date: day.date,
              time,
              available: 8,
              total: 8,
              canBook: true,
              instructor: 'Instructor',
              instructorId: 0,
              technique,
            }))
          )
        );
        if (fallbackDays.length > 0) {
          setSelectedDate((prev) =>
            prev && fallbackDays.some((d) => d.date === prev) ? prev : fallbackDays[0].date
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingScheduleSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, sku, technique, participants, restrictToFixedSchedule, availability, scheduleOverrides]);

  useEffect(() => {
    if (!sku) {
      setPricing(null);
      return;
    }
    const total = totalPriceCharged(sku, participants);
    setPricing({
      pieces: [],
      guidedOption: 'none',
      subtotalPieces: total,
      total,
    });
  }, [sku, participants]);

  const previousRestrictRef = useRef(restrictToFixedSchedule);
  useEffect(() => {
    if (previousRestrictRef.current !== restrictToFixedSchedule) {
      setSelectedSlot(null);
      setSelectedDate('');
    }
    previousRestrictRef.current = restrictToFixedSchedule;
  }, [restrictToFixedSchedule]);

  useEffect(() => {
    if (restrictToFixedSchedule) {
      const newCache: Record<string, any> = {};
      scheduleSlots.forEach((slot) => {
        newCache[`${slot.date}-${slot.time}`] = {
          available: slot.available,
          total: slot.total,
          canBook: slot.canBook,
          message: slot.canBook ? 'Disponible' : 'Sin cupos',
          openedByLargeGroup: slot.openedByLargeGroup ?? false,
        };
      });
      setSlotAvailabilityCache(newCache);
      setCheckingAvailability(false);
      return;
    }

    const verifySlotAvailability = async () => {
      if (!selectedDate || !sku) return;

      setCheckingAvailability(true);
      const slotsForDate = availableSlots.filter((s) => s.date === selectedDate);
      const allTimes = [...new Set(slotsForDate.map((s) => s.time))].sort();

      const results = await Promise.allSettled(
        allTimes.map((time) =>
          dataService.checkSlotAvailability(selectedDate, time, technique, participants)
        )
      );

      const newCache: Record<string, any> = {};
      results.forEach((result, index) => {
        const time = allTimes[index];
        const slotKey = `${selectedDate}-${time}`;
        if (result.status === 'fulfilled') {
          newCache[slotKey] = {
            available: result.value.capacity?.available ?? 0,
            total: result.value.capacity?.max ?? 22,
            canBook: result.value.available,
            message: result.value.message,
            openedByLargeGroup: result.value.openedByLargeGroup ?? false,
          };
        } else {
          newCache[slotKey] = {
            available: 0,
            total: 22,
            canBook: false,
            message: 'Error verificando disponibilidad',
            openedByLargeGroup: false,
          };
        }
      });

      setSlotAvailabilityCache(newCache);
      setCheckingAvailability(false);
    };

    verifySlotAvailability();
  }, [selectedDate, technique, availableSlots, participants, sku, restrictToFixedSchedule, scheduleSlots]);

  const categoryOptions = useMemo(
    () => (categoryId ? skusForCategory(categoryId) : []),
    [categoryId]
  );

  const selectCategory = (id: CreativeCategoryId) => {
    setCategoryId(id);
    setSku(null);
    setSelectedSlot(null);
    setPickedSkuFromHome(false);
    setError('');
    const options = skusForCategory(id);
    if (options.length === 1) {
      const only = options[0];
      setSku(only);
      setParticipants(only.minParticipants);
      setStep(skuNeedsParticipantsStep(only) ? 'participants' : 'date');
    } else {
      setStep('option');
    }
  };

  const selectSku = (next: CreativeSku, fromHome = false) => {
    setSku(next);
    setCategoryId(next.categoryId);
    setParticipants(next.minParticipants);
    setSelectedSlot(null);
    setPickedSkuFromHome(fromHome);
    setError('');
    if (skuNeedsParticipantsStep(next)) setStep('participants');
    else setStep('date');
  };

  const handleNext = () => {
    if (step === 'participants') {
      if (!sku || participants < sku.minParticipants) {
        setError(`Mínimo ${sku?.minParticipants || 4} personas`);
        return;
      }
      if (sku && participants > sku.maxParticipants) {
        setError(`Máximo ${sku.maxParticipants} personas`);
        return;
      }
      setError('');
      setStep('date');
      return;
    }
    if (step === 'date') {
      if (!selectedSlot) {
        setError('Selecciona un horario');
        return;
      }
      setError('');
      setStep('confirmation');
    }
  };

  const handleBack = () => {
    if (step === 'category') {
      onBack();
      return;
    }
    if (step === 'option') {
      setStep('category');
      setCategoryId(null);
      setPickedSkuFromHome(false);
      return;
    }
    if (step === 'participants') {
      if (pickedSkuFromHome) {
        setStep('category');
        setCategoryId(null);
        setSku(null);
        setPickedSkuFromHome(false);
      } else if (categoryId && categoryNeedsOptionStep(categoryId)) setStep('option');
      else {
        setStep('category');
        setCategoryId(null);
        setSku(null);
      }
      return;
    }
    if (step === 'date') {
      if (sku && skuNeedsParticipantsStep(sku)) setStep('participants');
      else if (!pickedSkuFromHome && categoryId && categoryNeedsOptionStep(categoryId)) setStep('option');
      else {
        setStep('category');
        setCategoryId(null);
        setSku(null);
        setPickedSkuFromHome(false);
      }
      return;
    }
    if (step === 'confirmation') setStep('date');
  };

  const handleConfirm = () => {
    if (!pricing || !sku || !selectedSlot) {
      setError('Revisa actividad y horario');
      return;
    }
    onConfirm(pricing, selectedSlot, technique, {
      serviceKind: sku.id,
      productName: sku.label,
      participants,
      skuId: sku.id,
    });
  };

  const stepOrder: Step[] = useMemo(() => {
    const steps: Step[] = ['category'];
    if (!pickedSkuFromHome && categoryId && categoryNeedsOptionStep(categoryId)) steps.push('option');
    if (sku && skuNeedsParticipantsStep(sku)) steps.push('participants');
    steps.push('date', 'confirmation');
    return steps;
  }, [categoryId, sku, pickedSkuFromHome]);

  const currentStepIndex = Math.max(0, stepOrder.indexOf(step));
  const progressPercent =
    stepOrder.length <= 1 ? 0 : (currentStepIndex / (stepOrder.length - 1)) * 100;

  const showExtrasNote = !!sku?.showsExtrasNote;
  const isPaintingPieces = sku?.id === 'ceramics_painting';
  const skuDisplay = sku ? getSkuDisplay(sku) : null;

  const localFixedDays = useMemo(() => {
    if (!restrictToFixedSchedule) return [];
    return enumerateFixedScheduleDays(technique, availability, scheduleOverrides, 90);
  }, [restrictToFixedSchedule, technique, availability, scheduleOverrides]);

  const bookableByDate = useMemo(() => {
    const grouped: Record<string, dataService.AvailableSlotResult[]> = {};
    scheduleSlots.forEach((slot) => {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    });
    Object.values(grouped).forEach((slots) => slots.sort((a, b) => a.time.localeCompare(b.time)));
    return grouped;
  }, [scheduleSlots]);

  const bookableDates = useMemo(() => Object.keys(bookableByDate).sort(), [bookableByDate]);

  const upcomingBookableDates = useMemo(() => bookableDates.slice(0, 8), [bookableDates]);

  const selectTimeSlot = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedSlot({ date, time, instructorId: 0 });
    setError('');
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {step !== 'category' && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              Paso {currentStepIndex + 1} de {stepOrder.length}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-brand-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {step === 'category' && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-subtle">
            <CatalogSlide src={CATALOG_INTRO.imageUrl} alt={CATALOG_INTRO.headline} />
            <div className="p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-secondary">Catálogo</p>
              <h3 className="text-2xl font-bold text-brand-text mt-1">{CATALOG_INTRO.headline}</h3>
              <p className="text-brand-secondary mt-2">{CATALOG_INTRO.tagline}</p>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-brand-text mb-2">¿Qué quieres hacer?</h3>
            <p className="text-brand-secondary">
              Elige una experiencia. Después dices si vienes con más gente.
            </p>
          </div>
          <div className="space-y-4">
            {CATALOG_HOME_ITEMS.map((item) => {
              if (item.type === 'sku') {
                const homeSku = getCreativeSku(item.skuId);
                if (!homeSku) return null;
                return (
                  <CreativeCatalogCard
                    key={homeSku.id}
                    display={getSkuDisplay(homeSku)}
                    priceLabel={formatSkuPriceLabel(homeSku)}
                    onClick={() => selectSku(homeSku, true)}
                  />
                );
              }
              const category = getCreativeCategory(item.categoryId);
              if (!category) return null;
              const categorySkus = skusForCategory(category.id);
              const cheapest = categorySkus.reduce<CreativeSku | undefined>((best, current) => {
                if (!best) return current;
                return unitPriceCharged(current) < unitPriceCharged(best) ? current : best;
              }, undefined);
              const priceLabel = cheapest
                ? (categorySkus.length > 1 ? `Desde ${formatSkuPriceLabel(cheapest).replace(/^Desde /, '')}` : formatSkuPriceLabel(cheapest))
                : undefined;
              return (
                <CreativeCatalogCard
                  key={category.id}
                  display={getCategoryDisplay(category)}
                  priceLabel={priceLabel}
                  onClick={() => selectCategory(category.id)}
                />
              );
            })}
          </div>
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
        </div>
      )}

      {step === 'option' && categoryId && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-brand-text mb-2">Elige tu opción</h3>
            <p className="text-brand-secondary">
              {getCreativeCategory(categoryId)?.label}
            </p>
          </div>
          <div className="space-y-4">
            {categoryOptions.map((option) => (
              <CreativeCatalogCard
                key={option.id}
                display={getSkuDisplay(option)}
                priceLabel={formatSkuPriceLabel(option)}
                selected={sku?.id === option.id}
                onClick={() => selectSku(option)}
              />
            ))}
          </div>
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
        </div>
      )}

      {step === 'participants' && sku && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-brand-text mb-2">¿Cuántas personas van?</h3>
            <p className="text-brand-secondary">{sku.label}</p>
            {skuDisplay && (
              <p className="mt-1 text-sm text-brand-secondary">
                Duración: {skuDisplay.duration} · {skuDisplay.schedule}
              </p>
            )}
          </div>

          {sku.minParticipants < 3 && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={participants === 1}
                onClick={() => setParticipants(Math.max(sku.minParticipants, 1))}
                className={`min-h-[52px] rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                  participants === 1
                    ? 'border-brand-primary bg-brand-primary text-white shadow-md'
                    : 'border-gray-200 bg-white text-brand-secondary hover:border-brand-primary/40'
                }`}
              >
                Solo yo
              </button>
              <button
                type="button"
                aria-pressed={participants === 2}
                onClick={() => setParticipants(Math.min(sku.maxParticipants, Math.max(sku.minParticipants, 2)))}
                className={`min-h-[52px] rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                  participants === 2
                    ? 'border-brand-primary bg-brand-primary text-white shadow-md'
                    : 'border-gray-200 bg-white text-brand-secondary hover:border-brand-primary/40'
                }`}
              >
                Somos 2
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              className="w-12 h-12 rounded-xl border border-brand-border text-xl font-bold disabled:opacity-40"
              disabled={participants <= sku.minParticipants}
              onClick={() => setParticipants((p) => Math.max(sku.minParticipants, p - 1))}
            >
              −
            </button>
            <div className="text-3xl font-bold text-brand-text w-16 text-center">{participants}</div>
            <button
              type="button"
              className="w-12 h-12 rounded-xl border border-brand-border text-xl font-bold disabled:opacity-40"
              disabled={participants >= sku.maxParticipants}
              onClick={() => setParticipants((p) => Math.min(sku.maxParticipants, p + 1))}
            >
              +
            </button>
          </div>
          <p className="text-center text-xs text-brand-secondary">
            {sku.minParticipants > 1
              ? `Mínimo ${sku.minParticipants} · máximo ${sku.maxParticipants}`
              : `Máximo ${sku.maxParticipants}`}
          </p>
          <p className="text-center text-brand-secondary text-sm">
            Total: ${formatMoney(totalPriceCharged(sku, participants))}
            {sku.vatMode === 'plus' ? ' (IVA incluido en el total)' : ''}
          </p>
          <div className="rounded-xl border border-brand-border bg-brand-surface p-4 text-sm text-brand-secondary leading-relaxed">
            Tú haces la reserva. Confirmaciones, recordatorios y notificaciones llegan a tu correo.
            El resto del grupo no necesita cuenta.
          </div>
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
        </div>
      )}

      {step === 'date' && sku && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-brand-text mb-2">Elige tu horario</h3>
            <p className="text-brand-secondary">{sku.label}</p>
            {participants === 1 ? (
              <p className="mt-2 text-sm font-semibold text-brand-primary">1 persona</p>
            ) : (
              <p className="mt-2 text-sm font-semibold text-brand-primary">{participants} personas</p>
            )}
          </div>

          <div className="rounded-xl border border-brand-border bg-brand-surface p-4 text-sm text-brand-secondary">
            Esta experiencia dura <span className="font-semibold text-brand-text">{skuDisplay?.duration || 'hasta 2 horas'}</span>.
            Gracias por tu puntualidad.
          </div>

          {isPaintingPieces && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">Desde $25 (IVA incluido)</p>
              <p>Es el mínimo. En el taller eliges la pieza; si cuesta más, pagas la diferencia ahí.</p>
            </div>
          )}

          {showExtrasNote && (
            <div className="rounded-lg border border-brand-border bg-brand-primary/5 p-4 text-sm text-brand-secondary">
              El precio incluye lo básico. Charms, patches u otros extras se pagan en el local al terminar.
            </div>
          )}

          {restrictToFixedSchedule ? (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="font-semibold text-amber-900 text-sm">
                  Torno: horarios de clase
                </p>
                <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                  Con {participants === 1 ? '1 persona' : '2 personas'} solo aparecen horarios fijos de torno,
                  o un slot que ya abrió un grupo de 3+.
                  Si son 3 o más, pueden abrir cualquier horario con cupo.
                </p>
              </div>

              {loadingScheduleSlots ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 bg-gray-50 rounded-2xl">
                  <div className="animate-spin w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full" />
                  <p className="text-sm text-gray-600 text-center px-4">Buscando horarios disponibles…</p>
                  {localFixedDays.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Hay {localFixedDays.length} fecha{localFixedDays.length === 1 ? '' : 's'} de clase en el calendario
                    </p>
                  )}
                </div>
              ) : bookableDates.length === 0 ? (
                <div className="text-center py-10 px-4 bg-gray-50 rounded-2xl">
                  <p className="font-semibold text-gray-700">No hay clase individual disponible ahora</p>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    En los próximos días no hay horarios fijos con cupo, ni grupos de 3+ a los que unirte.
                    Prueba más adelante o escribe por WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-brand-text mb-3">Próximos horarios</h4>
                    <div className="space-y-3">
                      {upcomingBookableDates.map((date) => {
                        const slots = bookableByDate[date] || [];
                        const isDateSelected = selectedDate === date;
                        return (
                          <div
                            key={date}
                            className={`rounded-2xl border p-3 sm:p-4 ${
                              isDateSelected ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="text-sm font-semibold text-brand-text capitalize mb-2">
                              {parseLocalDateStr(date).toLocaleDateString('es-ES', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              })}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {slots.map((slot) => {
                                const isSelected =
                                  selectedSlot?.date === slot.date && selectedSlot?.time === slot.time;
                                return (
                                  <button
                                    key={`${slot.date}-${slot.time}`}
                                    type="button"
                                    onClick={() => selectTimeSlot(slot.date, slot.time)}
                                    className={`min-h-[44px] min-w-[76px] px-3 rounded-xl border-2 font-bold text-sm transition-all ${
                                      isSelected
                                        ? 'border-brand-primary bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-md'
                                        : 'border-gray-200 bg-white text-gray-800 hover:border-brand-primary'
                                    }`}
                                  >
                                    <span className="block">{slot.time}</span>
                                    {slot.openedByLargeGroup && (
                                      <span className={`block text-[10px] font-medium ${isSelected ? 'text-white/90' : 'text-brand-secondary'}`}>
                                        Grupo abierto
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {bookableDates.length > upcomingBookableDates.length && (
                      <p className="text-xs text-gray-500 mt-2">
                        Hay más fechas: usa el calendario para ver el resto.
                      </p>
                    )}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCurrentMonth(newDate);
                        }}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        aria-label="Mes anterior"
                      >
                        ←
                      </button>
                      <h3 className="text-base sm:text-xl font-bold text-brand-text capitalize text-center px-2">
                        {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCurrentMonth(newDate);
                        }}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        aria-label="Mes siguiente"
                      >
                        →
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
                        <div key={d} className="text-center text-[10px] sm:text-xs font-bold text-gray-500 py-1">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const availableDatesSet = new Set(bookableDates);
                        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
                        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                        const cells = [];
                        for (let i = 0; i < firstDay; i++) {
                          cells.push(<div key={`empty-${i}`} />);
                        }
                        for (let day = 1; day <= daysInMonth; day++) {
                          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const isAvailable = availableDatesSet.has(dateStr);
                          const isSelected = selectedDate === dateStr;
                          cells.push(
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                if (!isAvailable) return;
                                setSelectedDate(dateStr);
                                setSelectedSlot(null);
                              }}
                              disabled={!isAvailable}
                              className={`min-h-[40px] sm:min-h-[44px] rounded-xl font-semibold text-sm transition-all ${
                                isSelected && isAvailable
                                  ? 'bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-md'
                                  : isAvailable
                                    ? 'bg-brand-primary/10 text-brand-text hover:bg-brand-primary/20'
                                    : 'bg-transparent text-gray-300 cursor-not-allowed'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-3 text-center">
                      Los días en color tienen clase individual. El resto no está disponible.
                    </p>
                  </div>

                  {selectedDate &&
                    bookableByDate[selectedDate] &&
                    !upcomingBookableDates.includes(selectedDate) && (
                    <div>
                      <div className="text-sm font-bold text-gray-700 capitalize mb-3">
                        {parseLocalDateStr(selectedDate).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {bookableByDate[selectedDate].map((slot) => {
                          const isSelected =
                            selectedSlot?.time === slot.time && selectedSlot?.date === slot.date;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => selectTimeSlot(slot.date, slot.time)}
                              className={`min-h-[52px] rounded-xl border-2 font-bold text-sm transition-all ${
                                isSelected
                                  ? 'border-brand-primary bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-md'
                                  : 'border-gray-200 bg-white text-gray-800 hover:border-brand-primary'
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="space-y-6">
              {(() => {
                const uniqueDates = [...new Set(availableSlots.map((s) => s.date))].sort();
                const allMonths: { key: string; dates: string[]; date: Date }[] = [];
                const groupedByMonth: Record<string, string[]> = {};
                uniqueDates.forEach((date) => {
                  const d = parseLocalDateStr(date);
                  const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
                  groupedByMonth[monthKey].push(date);
                });
                Object.entries(groupedByMonth).forEach(([monthKey, dates]) => {
                  const [year, month] = monthKey.split('-').map(Number);
                  allMonths.push({ key: monthKey, dates, date: new Date(year, month - 1, 1) });
                });
                const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
                const currentMonthData = allMonths.find((m) => m.key === currentMonthKey);
                const canGoPrev = currentMonth > new Date();
                const canGoNext = allMonths.some((m) => m.date > currentMonth);

                return (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <button
                        type="button"
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCurrentMonth(newDate);
                        }}
                        disabled={!canGoPrev}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40"
                      >
                        ←
                      </button>
                      <h3 className="text-xl font-bold text-brand-text capitalize">
                        {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCurrentMonth(newDate);
                        }}
                        disabled={!canGoNext}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40"
                      >
                        →
                      </button>
                    </div>

                    {currentMonthData ? (
                      <div>
                        <div className="grid grid-cols-7 gap-1.5 mb-3">
                          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
                            <div key={d} className="text-center text-xs font-bold text-gray-500 py-1">
                              {d}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                          {(() => {
                            const dates = currentMonthData.dates;
                            const firstDayOfMonth = new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth(),
                              1
                            );
                            const firstDay = firstDayOfMonth.getDay();
                            const availableDatesSet = new Set(dates);
                            const cells = [];
                            for (let i = 0; i < firstDay; i++) {
                              cells.push(<div key={`empty-${i}`} />);
                            }
                            const daysInMonth = new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() + 1,
                              0
                            ).getDate();
                            for (let day = 1; day <= daysInMonth; day++) {
                              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const isAvailable = availableDatesSet.has(dateStr);
                              const isSelected = selectedDate === dateStr;
                              cells.push(
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    if (isAvailable) {
                                      setSelectedDate(dateStr);
                                      setSelectedSlot(null);
                                    }
                                  }}
                                  disabled={!isAvailable}
                                  className={`aspect-square rounded-xl font-semibold text-sm transition-all ${
                                    isSelected && isAvailable
                                      ? 'bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-lg scale-105'
                                      : !isAvailable
                                        ? 'bg-transparent text-gray-300 cursor-not-allowed'
                                        : 'bg-gray-50 text-brand-text hover:bg-brand-primary/10 border border-transparent hover:border-brand-primary/20'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            }
                            return cells;
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">No hay fechas este mes</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedDate && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                      {parseLocalDateStr(selectedDate).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </div>
                    {checkingAvailability && (
                      <div className="text-xs text-gray-500">Verificando…</div>
                    )}
                  </div>

                  {(() => {
                    const slotsForDate = availableSlots.filter((s) => s.date === selectedDate);
                    let allTimes = [...new Set(slotsForDate.map((s) => s.time))].sort();
                    const overrideForDate = scheduleOverrides?.[selectedDate];
                    const isSpecialDayNoRules = overrideForDate?.disableRules === true;

                    if (
                      !isSpecialDayNoRules &&
                      technique === 'potters_wheel' &&
                      participants === 1 &&
                      availability &&
                      !checkingAvailability
                    ) {
                      const date = parseLocalDate(selectedDate);
                      const dayKeys = [
                        'Sunday',
                        'Monday',
                        'Tuesday',
                        'Wednesday',
                        'Thursday',
                        'Friday',
                        'Saturday',
                      ];
                      const dayKey = dayKeys[date.getDay()] as string;
                      const slotsForRules = overrideForDate?.slots ?? availability[dayKey] ?? [];
                      const fixedSlots =
                        slotsForRules
                          .filter((s: any) => s.technique === 'potters_wheel')
                          .map((s: any) => s.time) || [];
                      allTimes = allTimes.filter((time) => {
                        const slotKey = `${selectedDate}-${time}`;
                        const isFixedSlot = fixedSlots.includes(time);
                        const isOpenedByLargeGroup =
                          slotAvailabilityCache[slotKey]?.openedByLargeGroup === true;
                        return isFixedSlot || isOpenedByLargeGroup;
                      });
                    }

                    if (allTimes.length === 0) {
                      return (
                        <div className="text-center py-6 bg-gray-50 rounded-lg">
                          <p className="text-gray-600">No hay horarios este día</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                        {allTimes.map((time) => {
                          const slotKey = `${selectedDate}-${time}`;
                          const slotInfo = slotAvailabilityCache[slotKey];
                          const isSelected =
                            selectedSlot?.time === time && selectedSlot?.date === selectedDate;
                          const available = slotInfo?.available ?? 22;
                          const total = slotInfo?.total ?? 22;
                          const canBook = slotInfo?.canBook ?? available >= participants;

                          return (
                            <button
                              key={time}
                              type="button"
                              onClick={() => {
                                if (canBook) {
                                  setSelectedSlot({
                                    date: selectedDate,
                                    time,
                                    instructorId: 0,
                                  });
                                }
                              }}
                              disabled={!canBook}
                              className={`relative p-3.5 rounded-xl border-2 font-bold text-sm transition-all ${
                                isSelected
                                  ? 'border-brand-primary bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-lg scale-105'
                                  : canBook
                                    ? 'border-gray-200 bg-white text-gray-700 hover:border-brand-primary hover:bg-brand-primary/5'
                                    : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span>{time}</span>
                                {canBook && (
                                  <SocialBadge
                                    currentCount={total - available}
                                    maxCapacity={total}
                                    variant="compact"
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No hay horarios disponibles</p>
            </div>
          )}

          {selectedSlot && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-400">
              <div className="text-xs font-bold text-green-700 uppercase">Horario elegido</div>
              <div className="text-xl font-bold text-gray-800 mt-2">
                {selectedSlot.time} ·{' '}
                {parseLocalDateStr(selectedSlot.date).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <div className="text-xs text-gray-600 mt-1">Duración: {skuDisplay?.duration || 'hasta 2 horas'}</div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border-l-4 border-red-500">
              {error}
            </div>
          )}
        </div>
      )}

      {step === 'confirmation' && pricing && sku && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-brand-text mb-2">Confirma tu reserva</h3>
            <p className="text-brand-secondary">Revisa los detalles</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-brand-border space-y-4 shadow-subtle">
            {skuDisplay?.imageUrl && (
              <div className="overflow-hidden rounded-xl">
                <CatalogSlide src={skuDisplay.imageUrl} alt={sku.label} compact />
              </div>
            )}
            <div className="flex justify-between pb-4 border-b border-brand-border">
              <span className="text-brand-secondary">Actividad</span>
              <span className="font-semibold text-brand-text text-right">{sku.label}</span>
            </div>
            {skuDisplay?.includes && (
              <p className="text-sm text-brand-secondary -mt-2">
                <span className="font-semibold text-brand-text">Incluye: </span>
                {skuDisplay.includes}
              </p>
            )}
            {skuDisplay?.important && (
              <div className="text-sm text-amber-800 bg-amber-50 p-3 rounded-lg">
                {skuDisplay.important}
              </div>
            )}
            <div className="flex justify-between pb-4 border-b border-brand-border">
              <span className="text-brand-secondary">Personas</span>
              <span className="font-semibold text-brand-text">{participants}</span>
            </div>
            <p className="text-xs text-brand-secondary -mt-2">
              Las notificaciones llegan a quien reserva (siguiente paso: tus datos).
            </p>
            <div className="flex justify-between pb-4 border-b border-brand-border">
              <span className="text-brand-secondary">Precio</span>
              <span className="font-semibold text-brand-text text-right">
                {sku.vatMode === 'included'
                  ? formatSkuPriceLabel(sku)
                  : `${formatSkuPriceLabel(sku)} → $${formatMoney(unitPriceCharged(sku))}/persona`}
              </span>
            </div>
            {isPaintingPieces && (
              <div className="text-sm text-amber-800 bg-amber-50 p-3 rounded-lg">
                La pieza final se elige en el taller.
              </div>
            )}
            {showExtrasNote && (
              <div className="text-sm text-brand-secondary bg-brand-primary/5 p-3 rounded-lg">
                Extras (charms, patches adicionales, etc.) se pagan en el local.
              </div>
            )}
            <div className="flex justify-between pb-4 border-b border-brand-border">
              <span className="text-brand-secondary">Horario</span>
              <span className="font-semibold text-brand-text text-right">
                {selectedSlot?.time} ·{' '}
                {parseLocalDate(selectedSlot?.date || '').toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>
            <div className="flex justify-between pt-2 text-brand-primary">
              <span className="font-bold">Total</span>
              <span className="text-2xl font-bold">${formatMoney(pricing.total)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mt-8">
        <button
          type="button"
          onClick={handleBack}
          disabled={isLoading}
          className="px-6 py-3 rounded-xl border border-brand-border text-brand-text hover:bg-brand-surface disabled:opacity-50 font-semibold"
        >
          ← Atrás
        </button>
        {step === 'category' || step === 'option' ? null : step !== 'confirmation' ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={
              isLoading ||
              (step === 'date' && !selectedSlot) ||
              (step === 'participants' && (!sku || participants < sku.minParticipants))
            }
            className="flex-1 px-6 py-3 bg-brand-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50 font-semibold"
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !selectedSlot}
            className="flex-1 px-6 py-3 bg-brand-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50 font-semibold"
          >
            {isLoading ? 'Procesando…' : 'Continuar'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SingleClassWizard;
