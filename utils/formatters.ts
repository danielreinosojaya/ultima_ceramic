export function formatDate(date: string | Date): string {
    if (!date) return '';
    // Si es string tipo YYYY-MM-DD, formatear manualmente sin crear Date (evita desfase)
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [yyyy, mm, dd] = date.split('-');
        return `${dd} ${getMonthName(mm)} ${yyyy}`;
    }
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Fecha Inválida';
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });

function getMonthName(mm: string): string {
    const months = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
    const idx = parseInt(mm, 10) - 1;
    return months[idx] || mm;
}
}

export function formatCurrency(amount: number): string {
    return amount?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function normalizeHour(time: string): string {
    // Normaliza hora tipo "9:00" a "09:00:00" y "14:30" a "14:30:00"
    if (!time) return '00:00:00';
    const [h, m] = time.split(':');
    return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}:00`;
}
