export const slotToDate = (s: any): Date => {
    try {
        const time = (s.time || '').trim();
        // If time is in HH:mm format
        const hhmm = /^\d{1,2}:\d{2}$/.test(time);
        let iso: string;
        if (hhmm) {
            // Ensure two-digit hour
            const parts = time.split(':').map((p: string) => p.padStart(2, '0'));
            iso = `${s.date}T${parts[0]}:${parts[1]}:00`;
        } else if (time) {
            iso = `${s.date}T${time}`;
        } else {
            iso = `${s.date}T00:00:00`;
        }
        const dt = new Date(iso);
        if (isNaN(dt.getTime())) return new Date(`${s.date}T00:00:00`);
        return dt;
    } catch {
        return new Date(`${s.date}T00:00:00`);
    }
};

export const slotsRequireNoRefund = (slots: any[], horizonHours = 48): boolean => {
    if (!Array.isArray(slots) || slots.length === 0) return false;
    const now = new Date();
    for (const s of slots) {
        const dt = slotToDate(s);
        const diffHours = (dt.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (diffHours < horizonHours) return true;
    }
    return false;
};

export default { slotToDate, slotsRequireNoRefund };
