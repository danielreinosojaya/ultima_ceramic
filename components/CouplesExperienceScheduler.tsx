import React, { useState, useEffect } from 'react';
import type { CouplesExperience, IntroClassSession, AppData, Technique, Booking } from '../types.js';
import * as dataService from '../services/dataService.js';
import { InstructorTag } from './InstructorTag.js';
import { CapacityIndicator } from './CapacityIndicator.js';
import { ClockIcon } from './icons/ClockIcon.js';
import { InfoCircleIcon } from './icons/InfoCircleIcon.js';

interface CouplesExperienceSchedulerProps {
  product: CouplesExperience;
  technique: Technique;
  onConfirm: (session: IntroClassSession & { technique: Technique }) => void;
  onBack: () => void;
  appData: AppData;
  onAppDataUpdate?: (updates: Partial<AppData>) => void;
}

export const CouplesExperienceScheduler: React.FC<CouplesExperienceSchedulerProps> = ({
  product,
  technique,
  onConfirm,
  onBack,
  appData,
  onAppDataUpdate,
}) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Load bookings if needed
  useEffect(() => {
    const loadBookingsIfNeeded = async () => {
      if (appData.bookings.length === 0 && onAppDataUpdate) {
        try {
          const bookings = await dataService.getBookings();
          onAppDataUpdate({ bookings });
        } catch (error) {
          console.error('Failed to load bookings:', error);
        }
      }
    };
    loadBookingsIfNeeded();
  }, [appData.bookings.length, onAppDataUpdate]);

  // Generate sessions filtered by technique
  useEffect(() => {
    try {
      // Generar sesiones del producto (reutilizar dataService)
      const allSessions = dataService.generateIntroClassSessions(
        product as any,
        { bookings: appData.bookings },
        { includeFull: false, generationLimitInDays: 90 }
      );

      // Filtrar por técnica seleccionada
      const filteredSessions = allSessions.filter((session: any) => {
        const rule = product.schedulingRules.find(
          (r) => r.dayOfWeek === new Date(session.date).getDay() && r.time === session.time
        );
        return rule?.technique === technique;
      });

      // Enriquecer con información de capacidad
      const enrichedSessions = filteredSessions.map((session: any) => {
        const rule = product.schedulingRules.find(
          (r) => r.dayOfWeek === new Date(session.date).getDay() && r.time === session.time
        );

        // Contar bookings parejas para esta sesión
        const pairBookings = appData.bookings.filter(
          (b: Booking) =>
            b.productType === 'COUPLES_EXPERIENCE' &&
            b.technique === technique &&
            b.slots?.[0]?.date === session.date &&
            b.slots?.[0]?.time === session.time &&
            b.isPaid
        ).length;

        // Capacidad en parejas (dividir entre 2)
        const capacityInPairs = Math.floor((rule?.capacity || 6) / 2);
        const available = Math.max(0, capacityInPairs - pairBookings);

        return {
          ...session,
          capacityInPairs,
          pairBookings,
          available,
          isAvailable: available > 0,
        };
      });

      setSessions(enrichedSessions);
    } catch (error) {
      console.error('Error generating couples sessions:', error);
      setSessions([]);
    }
  }, [product, technique, appData.bookings]);

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session && session.isAvailable) {
      setSelectedSessionId(sessionId);
    }
  };

  const handleConfirm = () => {
    const session = sessions.find((s) => s.id === selectedSessionId);
    if (session) {
      onConfirm({
        date: session.date,
        time: session.time,
        instructorId: session.instructorId,
        technique: technique,
      });
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-brand-surface rounded-xl shadow-subtle animate-fade-in-up max-w-4xl mx-auto w-full">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-sm font-semibold text-brand-secondary hover:text-brand-text mb-6 transition-colors flex items-center gap-1"
      >
        ← Cambiar Técnica
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-brand-text mb-2">Elige tu Fecha y Hora</h2>
        <p className="text-brand-secondary mb-4">
          Selecciona una sesión disponible para tu experiencia en pareja
        </p>
        <div className="inline-block bg-brand-primary/10 px-4 py-2 rounded-full">
          <p className="text-sm font-semibold text-brand-primary">
            Técnica: {technique === 'potters_wheel' ? '🎯 Torno Alfarero' : '✋ Moldeo a Mano'}
          </p>
        </div>
      </div>

      {/* Info Box - Pago Anticipado */}
      <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4 mb-8">
        <div className="flex gap-3">
          <InfoCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 mb-1">⚠️ Pago Anticipado Requerido</p>
            <p className="text-sm text-amber-800">
              Tu disponibilidad se confirma una vez recibamos el pago de $190. 
              Te notificaremos en 24 horas.
            </p>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-brand-background/50 rounded-lg">
          <p className="text-brand-secondary text-lg">
            No hay sesiones disponibles para {technique === 'potters_wheel' ? 'Torno' : 'Moldeo'} en este momento.
          </p>
          <button
            onClick={onBack}
            className="mt-4 text-brand-primary font-semibold hover:underline"
          >
            Intentar otra técnica
          </button>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {sessions.map((session) => {
            const isSelected = selectedSessionId === session.id;
            const isFull = !session.isAvailable;

            return (
              <div
                key={session.id}
                onClick={() => !isFull && handleSelectSession(session.id)}
                className={`
                  border-2 rounded-lg p-5 transition-all duration-200 cursor-pointer
                  ${
                    isFull
                      ? 'border-gray-300 bg-gray-50 opacity-50 cursor-not-allowed'
                      : isSelected
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'border-brand-border hover:border-brand-primary hover:shadow-lifted'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  {/* Left: Date & Time */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2 text-lg font-semibold text-brand-text">
                        <span>📅</span>
                        {new Date(session.date).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-lg font-semibold text-brand-primary">
                        <ClockIcon className="w-4 h-4" />
                        {session.time}
                      </div>
                    </div>

                    {/* Instructor & Capacity */}
                    <div className="flex items-center gap-4 text-sm">
                      <InstructorTag
                        instructorId={session.instructorId}
                        instructors={appData.instructors || []}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-brand-secondary">Capacidad:</span>
                        <span className="font-semibold text-brand-text">
                          {session.available} {session.available === 1 ? 'cupo' : 'cupos'} de pareja
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status */}
                  <div className="ml-4 flex flex-col items-end gap-2">
                    {isFull ? (
                      <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                        COMPLETO
                      </div>
                    ) : (
                      <div
                        className={`
                          px-3 py-1 rounded-full text-xs font-semibold
                          ${isSelected ? 'bg-brand-primary text-white' : 'bg-green-100 text-green-700'}
                        `}
                      >
                        {isSelected ? '✓ SELECCIONADO' : 'DISPONIBLE'}
                      </div>
                    )}

                    {/* Checkbox */}
                    <div
                      className={`
                        w-6 h-6 border-2 rounded-lg flex items-center justify-center
                        ${isSelected ? 'border-brand-primary bg-brand-primary' : 'border-brand-border'}
                        ${isFull ? 'opacity-50' : ''}
                      `}
                    >
                      {isSelected && <span className="text-white font-bold">✓</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Button */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 border border-brand-secondary text-brand-secondary rounded-lg hover:bg-brand-secondary hover:text-white transition-colors font-semibold"
        >
          Atrás
        </button>
        <button
          onClick={handleConfirm}
          disabled={!selectedSessionId || !sessions.find((s) => s.id === selectedSessionId)?.isAvailable}
          className={`
            flex-1 px-6 py-3 rounded-lg font-semibold transition-opacity
            ${
              selectedSessionId && sessions.find((s) => s.id === selectedSessionId)?.isAvailable
                ? 'bg-brand-primary text-white hover:opacity-90'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Continuar al Resumen
        </button>
      </div>
    </div>
  );
};
