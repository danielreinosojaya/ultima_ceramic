/**
 * Utility functions for delivery date calculations
 * Supports two expiry scenarios:
 * 1. Scheduled finalization date (fecha estimada de finalización)
 * 2. Ready + 3 months policy (pintura y retiro)
 */

/** Plazo para agendar pintura o recoger pieza, desde el día de la notificación. */
export const PIECE_HOLD_MONTHS = 3;

export const addCalendarMonths = (from: Date, months: number): Date => {
  const next = new Date(from.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
};

export const toLocalYmd = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getPieceHoldDeadline = (fromIso: string): Date =>
  addCalendarMonths(new Date(fromIso), PIECE_HOLD_MONTHS);

export const getPieceHoldDeadlineYmd = (fromIso: string): string =>
  toLocalYmd(getPieceHoldDeadline(fromIso));

export const formatPieceHoldDeadlineEs = (fromIso: string): string =>
  getPieceHoldDeadline(fromIso).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export const hasPieceHoldExpired = (fromIso: string, now: Date = new Date()): boolean =>
  toLocalYmd(now) > getPieceHoldDeadlineYmd(fromIso);

export const isYmdAfterPieceHoldDeadline = (candidateYmd: string, fromIso: string): boolean =>
  candidateYmd > getPieceHoldDeadlineYmd(fromIso);

/**
 * Calculates days until a given date
 * @param date - ISO date string
 * @returns number of days (positive=future, negative=past)
 */
export const daysUntilDate = (date: string): number => {
  const msPerDay = 1000 * 60 * 60 * 24;
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const todayBase = new Date();
  todayBase.setHours(0, 0, 0, 0);
  return Math.ceil((targetDate.getTime() - todayBase.getTime()) / msPerDay);
};

/**
 * Calculates expiration date for "ready" deliveries (readyAt + 3 months)
 */
export const calculateReadyExpiration = (readyAt: string): string =>
  getPieceHoldDeadline(readyAt).toISOString();

export const daysUntilReadyExpiration = (readyAt: string): number =>
  daysUntilDate(calculateReadyExpiration(readyAt));

/**
 * Returns a human-readable status label for scheduled date countdown
 * @param days - number of days until scheduled date
 * @returns label object with icon, text, and color
 */
export const getScheduledDateStatus = (days: number) => {
  if (days > 1) {
    return { icon: '⏳', text: `Finalizar en ${days} días`, color: 'blue' };
  }
  if (days === 1) {
    return { icon: '⚠️', text: 'Finalizar MAÑANA', color: 'amber' };
  }
  if (days === 0) {
    return { icon: '⚠️', text: 'Finalizar HOY', color: 'amber' };
  }
  // negative = past
  const overdueDays = Math.abs(days);
  return { 
    icon: '🔴', 
    text: `VENCIDA: Hace ${overdueDays} día${overdueDays > 1 ? 's' : ''} (no finalizada)`, 
    color: 'red' 
  };
};

/**
 * Returns a human-readable status label for ready expiration countdown (3 months)
 */
export const getReadyExpirationStatus = (days: number) => {
  if (days <= 0) {
    return { 
      icon: '🟠', 
      text: 'EXPIRADA: Política de 3 meses vencida (no retirada)', 
      color: 'orange-red' 
    };
  }
  if (days <= 30) {
    return { 
      icon: '⏰', 
      text: `Retira en ${days} días (límite 3 meses)`, 
      color: 'orange' 
    };
  }
  return { 
    icon: '✅', 
    text: `Falta ${days} días (límite 3 meses)`, 
    color: 'green' 
  };
};

/**
 * Determines if a delivery is "critically urgent"
 * Critical if: scheduled date is past OR (ready exists AND expiration < 30 days)
 */
export const isCriticallyUrgent = (delivery: {
  scheduledDate: string;
  readyAt?: string | null;
  status: string;
}): boolean => {
  if (daysUntilDate(delivery.scheduledDate) < 0 && delivery.status === 'pending') {
    return true;
  }

  if (delivery.readyAt) {
    const daysLeft = daysUntilReadyExpiration(delivery.readyAt);
    return daysLeft <= 30 && daysLeft > 0;
  }

  return false;
};
