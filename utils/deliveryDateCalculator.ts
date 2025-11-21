/**
 * Utility functions for delivery date calculations
 * Supports two expiry scenarios:
 * 1. Scheduled finalization date (fecha estimada de finalización)
 * 2. Ready + 60 days policy (política de retiro)
 */

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
 * Calculates expiration date for "ready" deliveries (readyAt + 60 days)
 * @param readyAt - ISO date string when delivery was marked as ready
 * @returns ISO date string of expiration (60 days later)
 */
export const calculateReadyExpiration = (readyAt: string): string => {
  const date = new Date(readyAt);
  date.setDate(date.getDate() + 60);
  return date.toISOString();
};

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
 * Returns a human-readable status label for ready expiration countdown (60 days policy)
 * @param days - number of days until ready expiration
 * @returns label object with icon, text, and color
 */
export const getReadyExpirationStatus = (days: number) => {
  if (days <= 0) {
    return { 
      icon: '🟠', 
      text: 'EXPIRADA: Política de 60 días vencida (no retirada)', 
      color: 'orange-red' 
    };
  }
  if (days <= 30) {
    return { 
      icon: '⏰', 
      text: `Retira en ${days} días (límite 60 días)`, 
      color: 'orange' 
    };
  }
  return { 
    icon: '✅', 
    text: `Falta ${days} días (límite 60 días)`, 
    color: 'green' 
  };
};

/**
 * Determines if a delivery is "critically urgent"
 * Critical if: scheduled date is past OR (ready exists AND expiration < 30 days)
 * @param delivery - Delivery object
 * @returns boolean
 */
export const isCriticallyUrgent = (delivery: {
  scheduledDate: string;
  readyAt?: string | null;
  status: string;
}): boolean => {
  // Scheduled date passed
  if (daysUntilDate(delivery.scheduledDate) < 0 && delivery.status === 'pending') {
    return true;
  }

  // Ready + expiration within 30 days
  if (delivery.readyAt) {
    const expiration = calculateReadyExpiration(delivery.readyAt);
    return daysUntilDate(expiration) <= 30 && daysUntilDate(expiration) > 0;
  }

  return false;
};
