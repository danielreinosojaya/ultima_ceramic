import React, { useState } from 'react';
import type { ExperiencePricing, TimeSlot } from '../../types';
import type { SpecialEventConfig, SpecialEventPricingOption } from '../../config/specialEventConfigs';
import { getSpecialEventPricing } from '../../config/specialEventConfigs';

export interface SpecialEventBookingProps {
  config: SpecialEventConfig;
  onConfirm: (
    pricing: ExperiencePricing,
    selectedSlot: TimeSlot,
    technique: SpecialEventConfig['technique'],
    selectedOption?: SpecialEventPricingOption
  ) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const SpecialEventBooking: React.FC<SpecialEventBookingProps> = ({
  config,
  onConfirm,
  onBack,
  isLoading = false,
}) => {
  const [step, setStep] = useState<'landing' | 'confirm'>('landing');
  const [selectedOption, setSelectedOption] = useState<SpecialEventPricingOption | null>(
    config.pricingOptions?.[0] ?? null
  );

  const tierPricing = getSpecialEventPricing(config);
  const resolvedPrice = config.pricingOptions
    ? selectedOption?.price ?? 0
    : tierPricing.price;
  const resolvedPriceLabel = config.pricingOptions
    ? selectedOption?.label ?? 'Selecciona una opción'
    : tierPricing.tierLabel;

  const handleReserve = () => {
    if (config.pricingOptions && !selectedOption) return;
    setStep('confirm');
  };

  const handleBackToLanding = () => {
    setStep('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step === 'confirm') {
      handleBackToLanding();
      return;
    }
    onBack();
  };

  const handleConfirm = () => {
    const pricing: ExperiencePricing = {
      pieces: [],
      guidedOption: 'none',
      subtotalPieces: resolvedPrice,
      total: resolvedPrice,
    };

    const slot: TimeSlot = {
      date: config.eventDate,
      time: config.eventTime,
      instructorId: 0,
    };

    onConfirm(pricing, slot, config.technique, selectedOption ?? undefined);
  };

  return (
    <div className="min-h-screen bg-[#FAF5EE]">
      <div className="relative overflow-hidden" style={{ minHeight: '340px', background: '#1a1209' }}>
        <img
          src={config.image}
          alt={config.title}
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(15,8,2,0.95) 0%, rgba(15,8,2,0.4) 50%, transparent 100%)',
          }}
        />

        <button
          type="button"
          onClick={handleBack}
          className="absolute top-4 left-4 z-20 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'rgba(250,245,238,0.15)', color: '#FAF5EE', backdropFilter: 'blur(8px)' }}
        >
          ← Volver
        </button>

        <div className="relative z-10 p-6 pt-16 flex flex-col justify-end pointer-events-none" style={{ minHeight: '340px' }}>
          <span
            className="self-start text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-3"
            style={{ background: '#C4704E', color: '#FAF5EE' }}
          >
            Evento Especial
          </span>
          <h1 className="text-3xl font-bold mb-2 leading-tight" style={{ color: '#FAF5EE' }}>
            {config.title}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(250,245,238,0.7)' }}>
            {config.subtitle}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {step === 'landing' && (
          <>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <p className="text-sm leading-relaxed text-[#7A5C45]">{config.tagline}</p>

              <h2 className="text-lg font-bold text-[#3D2410]">Detalles del evento</h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FAF5EE] rounded-xl p-3">
                  <p className="text-xs text-[#A08060] font-medium">Fecha</p>
                  <p className="text-sm font-bold text-[#3D2410]">{config.dateLabel}</p>
                </div>
                <div className="bg-[#FAF5EE] rounded-xl p-3">
                  <p className="text-xs text-[#A08060] font-medium">Horario</p>
                  <p className="text-sm font-bold text-[#3D2410]">{config.timeLabel}</p>
                </div>
                <div className="bg-[#FAF5EE] rounded-xl p-3">
                  <p className="text-xs text-[#A08060] font-medium">Duración</p>
                  <p className="text-sm font-bold text-[#3D2410]">{config.duration}</p>
                </div>
                <div className="bg-[#FAF5EE] rounded-xl p-3">
                  <p className="text-xs text-[#A08060] font-medium">Actividad</p>
                  <p className="text-sm font-bold text-[#3D2410]">{config.techniqueLabel}</p>
                </div>
              </div>

              {config.scheduleNote && (
                <div className="bg-[#FAF5EE] rounded-xl p-3 text-sm text-[#7A5C45]">
                  {config.scheduleNote}
                </div>
              )}

              {config.pricingOptions ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#A08060] font-medium">Elige tu opción</p>
                  {config.pricingOptions.map((option) => {
                    const isSelected = selectedOption?.id === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedOption(option)}
                        className="w-full text-left rounded-xl p-4 border-2 transition-all"
                        style={{
                          borderColor: isSelected ? '#C4704E' : 'rgba(196,112,78,0.2)',
                          background: isSelected ? 'rgba(196,112,78,0.08)' : '#FAF5EE',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-[#3D2410]">{option.label}</p>
                            {option.description && (
                              <p className="text-xs text-[#7A5C45] mt-1">{option.description}</p>
                            )}
                          </div>
                          <p className="text-lg font-bold text-[#C4704E]">${option.price}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#FAF5EE] rounded-xl p-3 space-y-2">
                  {tierPricing.tier === 'presale' && (
                    <span
                      className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(196,112,78,0.15)', color: '#C4704E' }}
                    >
                      {tierPricing.tierLabel}
                    </span>
                  )}
                  <p className="text-xs text-[#A08060] font-medium">
                    {tierPricing.tier === 'presale' ? 'Precio preventa' : 'Precio'}
                  </p>
                  <p className="text-2xl font-bold text-[#C4704E]">
                    ${resolvedPrice}{' '}
                    <span className="text-sm font-normal text-[#A08060]">por persona</span>
                  </p>
                  {tierPricing.pricingNote && (
                    <p className="text-sm text-[#7A5C45] leading-relaxed font-medium">{tierPricing.pricingNote}</p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-[#3D2410] mb-3">¿Qué incluye?</h2>
              <ul className="space-y-2 text-sm text-[#7A5C45]">
                {config.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#C4704E] mt-0.5">✦</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleReserve}
              disabled={isLoading || (config.pricingOptions && !selectedOption)}
              className="w-full py-4 rounded-xl text-base font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#C4704E', color: '#FAF5EE' }}
            >
              {config.pricingOptions
                ? `Reservar — ${resolvedPriceLabel} · $${resolvedPrice}`
                : tierPricing.tier === 'presale'
                ? `Reservar preventa $${resolvedPrice} — ${tierPricing.tierLabel.toLowerCase()}`
                : `Reservar mi lugar — $${resolvedPrice}`}
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-xl font-bold text-[#3D2410]">✓ Confirma tu reserva</h2>
              <p className="text-sm text-[#7A5C45]">Revisa los detalles antes de continuar</p>

              <div className="space-y-3">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-[#7A5C45]">Evento</span>
                  <span className="text-sm font-bold text-[#3D2410] text-right max-w-[60%]">
                    {config.title}
                  </span>
                </div>
                {selectedOption && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-[#7A5C45]">Opción</span>
                    <span className="text-sm font-bold text-[#3D2410]">{selectedOption.label}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-[#7A5C45]">Fecha</span>
                  <span className="text-sm font-bold text-[#3D2410] text-right max-w-[60%]">
                    {config.dateLabel}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-[#7A5C45]">Horario</span>
                  <span className="text-sm font-bold text-[#3D2410] text-right max-w-[60%]">
                    {config.timeLabel}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-[#7A5C45]">Duración</span>
                  <span className="text-sm font-bold text-[#3D2410]">{config.duration}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-[#7A5C45]">Precio</span>
                  <span className="text-sm font-bold text-[#3D2410] text-right max-w-[60%]">
                    ${resolvedPrice} por persona
                    {tierPricing.tier === 'presale' && (
                      <span className="block text-xs font-normal text-[#A08060] mt-0.5">
                        {tierPricing.tierLabel}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between pt-4">
                  <span className="text-base font-bold text-[#3D2410]">Total a pagar</span>
                  <span className="text-2xl font-bold text-[#C4704E]">${resolvedPrice}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBackToLanding}
                className="px-5 py-3 rounded-xl border border-gray-300 text-sm font-medium text-[#7A5C45] hover:bg-gray-50 transition-colors"
              >
                ← Atrás
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl text-base font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                style={{ background: '#C4704E', color: '#FAF5EE' }}
              >
                {isLoading ? 'Procesando...' : 'Confirmar y continuar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SpecialEventBooking;
