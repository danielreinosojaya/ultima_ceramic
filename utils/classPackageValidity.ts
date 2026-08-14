/**
 * Ventana de validez para paquetes de clases (CLASS_PACKAGE).
 * Contada desde la primera clase agendada:
 * - 4 clases → 4 semanas (28 días)
 * - 8 clases → 2 meses (60 días)
 * - 12 clases → 3 meses (90 días)
 */

export function getClassPackageValidityDays(classes: number): number {
  const n = Number(classes) || 0;
  if (n <= 4) return 28;
  if (n <= 8) return 60;
  return 90;
}

export function getClassPackageValidityLabel(classes: number): string {
  const n = Number(classes) || 0;
  if (n <= 4) return '4 semanas';
  if (n <= 8) return '2 meses';
  return '3 meses';
}

/** Texto corto para UI / emails */
export function getClassPackageValidityDescription(classes: number): string {
  const n = Number(classes) || 0;
  const label = getClassPackageValidityLabel(n);
  const days = getClassPackageValidityDays(n);
  return `Debes agendar y completar tus ${n || ''} clases dentro de ${label} (máx. ${days} días) desde la fecha de tu primera clase.`.replace(
    /\s+/g,
    ' '
  ).trim();
}

/**
 * Fin de ventana inclusivo a partir de la primera fecha (Date a medianoche local).
 */
export function getClassPackageWindowEndDate(firstClassDate: Date, classes: number): Date {
  const end = new Date(firstClassDate);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + getClassPackageValidityDays(classes));
  return end;
}

/** True si todas las fechas YYYY-MM-DD caben en la ventana desde la primera. */
export function areClassPackageSlotsWithinValidity(
  slotDates: string[],
  classes: number
): { ok: boolean; firstDate?: string; endDate?: string; maxDays: number } {
  const maxDays = getClassPackageValidityDays(classes);
  if (!slotDates.length) return { ok: true, maxDays };
  const sorted = [...slotDates].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const [fy, fm, fd] = first.split('-').map(Number);
  const [ly, lm, ld] = last.split('-').map(Number);
  const firstDt = new Date(fy, fm - 1, fd);
  const lastDt = new Date(ly, lm - 1, ld);
  const end = getClassPackageWindowEndDate(firstDt, classes);
  const ok = lastDt.getTime() <= end.getTime();
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  return { ok, firstDate: first, endDate: endStr, maxDays };
}
