/**
 * Admin Validator Service
 * Provides validation with admin override capabilities
 * Returns warnings (instead of blocking errors) that admin can choose to ignore
 */

import * as dataService from './dataService';
import type { Product } from '../types';

export interface ValidationWarning {
  rule: string;
  severity: 'warning' | 'error';
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  canContinueWithWarnings: boolean;
}

/**
 * Valida una reserva de admin con capacidad de override
 * Retorna warnings en lugar de bloquear directamente
 */
export async function validateAdminBooking(
  bookingData: {
    date: string;
    time: string;
    technique?: string;
    participants: number;
    productType?: string;
    product?: Product;
  }
): Promise<ValidationResult> {
  const warnings: ValidationWarning[] = [];

  try {
    // 1. Validar domingo (warning)
    const bookingDate = new Date(`${bookingData.date}T00:00:00`);
    const dayOfWeek = bookingDate.getDay();
    
    if (dayOfWeek === 0) {
      // Domingo = 0
      warnings.push({
        rule: 'sunday_reservation',
        severity: 'warning',
        message: '📅 Domingo: Normalmente no se aceptan reservas en este día. ¿Estás seguro?',
        code: 'SUNDAY_BOOKING'
      });
    }

    // 2. Validar lunes + pintura - pero PERMITIR si hay scheduleOverride
    if (dayOfWeek === 1 && (bookingData.technique === 'painting' || bookingData.product?.details?.technique === 'painting')) {
      // Revisar si hay excepción/override para este lunes específico
      const scheduleOverrides = await dataService.getScheduleOverrides();
      const hasExceptionForThisDay = scheduleOverrides && scheduleOverrides[bookingData.date];
      
      // Si NO hay excepción para este día, entonces bloquear pintura en lunes
      if (!hasExceptionForThisDay) {
        warnings.push({
          rule: 'monday_painting',
          severity: 'error',
          message: '🎨 Pintura los lunes está bloqueada por defecto. Excepto en semanas especiales con excepción configurada.',
          code: 'MONDAY_PAINTING_BLOCKED'
        });
      }
      // Si SÍ hay excepción, permitir que continúe
    }

    // 3. Validar horario no fijo para SINGLE_CLASS (warning)
    if (bookingData.productType === 'SINGLE_CLASS') {
      const isFixedScheduleSlot = await checkIfFixedScheduleTime(bookingData.date, bookingData.time, bookingData.technique);
      
      if (!isFixedScheduleSlot) {
        warnings.push({
          rule: 'non_fixed_hour_single_class',
          severity: 'warning',
          message: `⏰ ${bookingData.time} no es un horario fijo en el calendario. Abierto como excepción de admin.`,
          code: 'NON_FIXED_HOUR'
        });
      }
    }

    // 4. Validar capacidad (error si sobrecapacidad)
    const capacityCheck = await checkCapacityWithDetail(
      bookingData.date,
      bookingData.time,
      bookingData.technique || 'potters_wheel',
      bookingData.participants
    );

    if (!capacityCheck.available) {
      warnings.push({
        rule: 'over_capacity',
        severity: 'error',
        message: `👥 Sobrecapacidad: Solo hay ${capacityCheck.availableCapacity} cupos disponibles, pero solicitas ${bookingData.participants}. No se puede hacer override.`,
        code: 'OVER_CAPACITY'
      });
    }

    // 5. Validar conflicto con cursos (error)
    const courseConflict = await checkCourseConflict(bookingData.date, bookingData.time);
    if (courseConflict) {
      warnings.push({
        rule: 'course_conflict',
        severity: 'error',
        message: `📚 Conflictúa con curso activo: ${courseConflict}. No se puede hacer override.`,
        code: 'COURSE_CONFLICT'
      });
    }

    // 6. Validar regla hand_modeling + 1 persona (warning)
    if (bookingData.technique === 'hand_modeling' && bookingData.participants === 1) {
      const isFixedHandTime = await checkIfFixedScheduleTime(bookingData.date, bookingData.time, 'hand_modeling');
      
      if (!isFixedHandTime) {
        warnings.push({
          rule: 'hand_modeling_single_person',
          severity: 'warning',
          message: '✋ Modelado a Mano con 1 persona: Normalmente solo en horarios fijos. Abierto como excepción de admin.',
          code: 'HAND_MOD_SINGLE_PERSON'
        });
      }
    }

  } catch (error) {
    console.error('[adminValidator] Error during validation:', error);
    warnings.push({
      rule: 'validation_error',
      severity: 'warning',
      message: 'Error al validar la reserva. Procede bajo tu responsabilidad.',
      code: 'VALIDATION_ERROR'
    });
  }

  // Determinar si puede continuar
  const hasErrors = warnings.some(w => w.severity === 'error');
  const canContinueWithWarnings = !hasErrors;

  return {
    isValid: warnings.length === 0,
    warnings,
    canContinueWithWarnings
  };
}

/**
 * Verifica si una hora es un horario fijo en el calendario
 */
async function checkIfFixedScheduleTime(
  dateStr: string,
  timeStr: string,
  technique?: string
): Promise<boolean> {
  try {
    const date = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = date.getDay();
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayKey = DAY_NAMES[dayOfWeek];

    // Obtener availability del backend
    const response = await fetch('/api/data?key=availability');
    const availability = await response.json();

    if (!availability || !availability[dayKey]) {
      return false;
    }

    // Normalizar tiempo
    const normalizedTime = normalizeTime(timeStr);
    
    // Buscar horarios de la técnica solicitada
    const techToCheck = technique === 'hand_modeling' || technique === 'molding' ? 'molding' : 'potters_wheel';
    const daySlots = availability[dayKey] || [];
    
    const hasFixedSlot = daySlots.some((slot: any) => {
      const slotTime = normalizeTime(slot.time || '');
      return slotTime === normalizedTime && slot.technique === techToCheck;
    });

    return hasFixedSlot;
  } catch (error) {
    console.error('[adminValidator] Error checking fixed schedule:', error);
    return false;
  }
}

/**
 * Verifica capacidad detallada
 */
async function checkCapacityWithDetail(
  dateStr: string,
  timeStr: string,
  technique: string,
  requestedParticipants: number
): Promise<{ available: boolean; availableCapacity: number; maxCapacity: number }> {
  try {
    const response = await fetch(
      `/api/data?action=checkSlotAvailability&date=${dateStr}&time=${timeStr}&technique=${technique}&participants=${requestedParticipants}`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      return { available: false, availableCapacity: 0, maxCapacity: 0 };
    }
    
    const data = await response.json();
    
    return {
      available: data.available === true,
      availableCapacity: data.capacity?.available || 0,
      maxCapacity: data.capacity?.max || 0
    };
  } catch (error) {
    console.error('[adminValidator] Error checking capacity:', error);
    return { available: false, availableCapacity: 0, maxCapacity: 0 };
  }
}

/**
 * Verifica conflicto con cursos
 */
async function checkCourseConflict(dateStr: string, timeStr: string): Promise<string | null> {
  try {
    // Primero intentar con el endpoint específico
    const normalizedTime = normalizeTime(timeStr);
    const startMinutes = timeToMinutes(normalizedTime);
    const endMinutes = startMinutes + (2 * 60); // 2 horas

    // Llamar al endpoint checkSlotAvailability que incluye validación de cursos
    const response = await fetch(
      `/api/data?action=checkSlotAvailability&date=${dateStr}&time=${timeStr}&technique=potters_wheel&participants=1`,
      { method: 'GET' }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.blockedReason === 'course_conflict') {
        return 'Hay un curso programado en este horario';
      }
    }

    return null;
  } catch (error) {
    console.error('[adminValidator] Error checking course conflicts:', error);
    return null;
  }
}

/**
 * Normaliza un tiempo al formato HH:MM
 */
function normalizeTime(t: string): string {
  if (!t) return '';
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  const match = t.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return t;
}

/**
 * Convierte tiempo HH:MM a minutos
 */
function timeToMinutes(timeStr: string): number {
  const [hours, mins] = timeStr.split(':').map(Number);
  return hours * 60 + mins;
}
