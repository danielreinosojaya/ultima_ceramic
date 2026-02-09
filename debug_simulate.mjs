import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Load env
const envContent = readFileSync('.env.local', 'utf-8');
const dbUrl = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1];
const sql = neon(dbUrl);

// Copy helper functions from data.ts
const normalizeTime = (t) => {
    if (!t) return '';
    if (/^\d{2}:\d{2}$/.test(t)) return t;
    const match = t.match(/(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
    return t;
};

const timeToMinutes = (timeStr) => {
    const [hours, mins] = timeStr.split(':').map(Number);
    return hours * 60 + mins;
};

const isPottersFixedConflict = (candidateStart, fixedTimes) =>
    fixedTimes.some(fixedStart => {
        if (candidateStart === fixedStart) return false;
        return candidateStart >= fixedStart - 120 && candidateStart < fixedStart + 120;
    });

const getFixedSlotTimesForDate = (dateStr, dayKey, availability, scheduleOverrides, techniqueKey) => {
    const override = scheduleOverrides[dateStr];
    if (override && override.slots === null) return [];
    const baseSlots = override?.slots ?? availability[dayKey] ?? [];
    const times = baseSlots
        .filter((slot) => slot.technique === techniqueKey)
        .map((slot) => normalizeTime(slot.time));
    if (techniqueKey === 'potters_wheel') {
        if (dayKey === 'Tuesday') times.push('19:00');
        if (dayKey === 'Wednesday') times.push('11:00');
    }
    return [...new Set(times)].sort();
};

const deriveBookingTechnique = (booking) => {
    const productName = (booking.product?.name || '').toLowerCase();
    if (productName.includes('pintura') || productName.includes('painting')) return 'painting';
    if (productName.includes('torno') || productName.includes('wheel') || productName.includes('potter')) return 'potters_wheel';
    if (productName.includes('modelado') || productName.includes('molding') || productName.includes('hand')) return 'hand_modeling';
    if (booking.technique === 'potters_wheel') return 'potters_wheel';
    if (booking.technique === 'molding' || booking.technique === 'hand_modeling') return 'hand_modeling';
    if (booking.technique === 'painting') return 'painting';
    const detailsTechnique = booking.product?.details?.technique;
    if (detailsTechnique === 'potters_wheel') return 'potters_wheel';
    if (detailsTechnique === 'molding' || detailsTechnique === 'hand_modeling') return 'hand_modeling';
    if (detailsTechnique === 'painting') return 'painting';
    const productType = booking.productType || booking.product?.type;
    if (productType === 'INTRODUCTORY_CLASS') return 'potters_wheel';
    if (productType === 'WHEEL_COURSE') return 'potters_wheel';
    return undefined;
};

const getGroupClassBookingCounts = (booking) => {
    let potters = 0;
    let handWork = 0;
    if (booking.productType === 'GROUP_CLASS' && booking.groupClassMetadata?.techniqueAssignments?.length) {
        booking.groupClassMetadata.techniqueAssignments.forEach((assignment) => {
            if (assignment.technique === 'potters_wheel') potters += 1;
            else handWork += 1;
        });
        return { potters, handWork };
    }
    const bookingTechnique = deriveBookingTechnique(booking);
    const participantCount = booking.participants ?? booking.groupClassMetadata?.totalParticipants ?? 1;
    if (bookingTechnique === 'potters_wheel') potters = participantCount;
    else if (bookingTechnique === 'painting' || bookingTechnique === 'hand_modeling' || bookingTechnique === 'molding') handWork = participantCount;
    else { potters = participantCount; handWork = participantCount; }
    return { potters, handWork };
};

const toCamelCase = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    const newObj = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        newObj[camelKey] = typeof obj[key] === 'object' ? toCamelCase(obj[key]) : obj[key];
    }
    return newObj;
};

const parseBookingFromDB = (row) => {
    const booking = toCamelCase(row);
    if (typeof booking.slots === 'string') {
        try { booking.slots = JSON.parse(booking.slots); } catch { booking.slots = []; }
    }
    if (typeof booking.product === 'string') {
        try { booking.product = JSON.parse(booking.product); } catch { booking.product = {}; }
    }
    if (typeof booking.groupClassMetadata === 'string') {
        try { booking.groupClassMetadata = JSON.parse(booking.groupClassMetadata); } catch { booking.groupClassMetadata = null; }
    }
    return booking;
};

async function simulate() {
    const dateStr = '2026-02-12';
    const pottersCount = 4;
    const handWorkCount = 0;
    const totalParticipants = 4;

    // Get settings
    const settingsResult = await sql`SELECT * FROM settings WHERE key IN ('availability', 'scheduleOverrides', 'classCapacity')`;
    const availability = settingsResult.find(s => s.key === 'availability')?.value || {};
    const scheduleOverrides = settingsResult.find(s => s.key === 'scheduleOverrides')?.value || {};

    const dayKey = 'Thursday';

    const fixedPottersTimes = getFixedSlotTimesForDate(dateStr, dayKey, availability, scheduleOverrides, 'potters_wheel');
    const fixedPottersMinutes = fixedPottersTimes.map(timeToMinutes);

    console.log('=== FIXED POTTERS TIMES FOR THURSDAY ===');
    console.log('Times:', fixedPottersTimes);
    console.log('Minutes:', fixedPottersMinutes);

    // Get bookings
    const bookingsResult = await sql`SELECT * FROM bookings WHERE status != 'expired' ORDER BY created_at DESC`;
    const allBookings = bookingsResult.map(parseBookingFromDB);
    const bookingsOnDate = allBookings.filter(b => {
        if (!b.slots || !Array.isArray(b.slots)) return false;
        return b.slots.some(s => s.date === dateStr);
    });

    console.log('\n=== BOOKINGS ON', dateStr, '===');
    console.log('Total bookings in DB:', allBookings.length);
    console.log('Bookings with slots on', dateStr + ':', bookingsOnDate.length);
    bookingsOnDate.forEach(b => {
        const technique = deriveBookingTechnique(b);
        const counts = getGroupClassBookingCounts(b);
        console.log({
            id: b.id,
            productType: b.productType,
            technique,
            counts,
            productName: b.product?.name,
            slots: b.slots?.filter(s => s.date === dateStr)
        });
    });

    // Simulate slot evaluation for 10:00, 10:30, 11:00, 11:30
    const testTimes = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00'];
    console.log('\n=== SLOT EVALUATION FOR', dateStr, '===');
    console.log('totalParticipants:', totalParticipants, '| pottersCount:', pottersCount);

    for (const slotTime of testTimes) {
        const normalizedTime = normalizeTime(slotTime);
        const slotStartMinutes = timeToMinutes(normalizedTime);

        let blockedReason = null;
        let pottersBlocked = false;
        let pottersBooked = 0;

        // Fixed class conflict check
        if (totalParticipants < 3 && !fixedPottersTimes.includes(normalizedTime)) {
            pottersBlocked = true;
            blockedReason = blockedReason || 'fixed_class_conflict (not in fixed times, <3 participants)';
        }

        if (totalParticipants >= 3 && isPottersFixedConflict(slotStartMinutes, fixedPottersMinutes)) {
            pottersBlocked = true;
            blockedReason = blockedReason || 'fixed_class_conflict (overlaps fixed class)';
        }

        // Booking overlap check
        bookingsOnDate.forEach(booking => {
            const { potters: bookingPotters } = getGroupClassBookingCounts(booking);
            if (bookingPotters <= 0) return;

            if (booking.slots && Array.isArray(booking.slots)) {
                booking.slots.forEach(s => {
                    if (s.date !== dateStr) return;
                    const bookingStart = timeToMinutes(normalizeTime(s.time));
                    if (Number.isNaN(bookingStart)) return;
                    if (bookingStart === slotStartMinutes) {
                        pottersBooked += bookingPotters;
                    } else if (slotStartMinutes >= bookingStart - 120 && slotStartMinutes < bookingStart + 120) {
                        pottersBlocked = true;
                        blockedReason = blockedReason || `booking_overlap (booking at ${s.time}, potter count: ${bookingPotters})`;
                    }
                });
            }
        });

        const pottersTotal = 8;
        const pottersAvailable = Math.max(0, pottersTotal - pottersBooked);
        if (pottersBlocked) blockedReason = blockedReason || 'fixed_class_conflict';
        if (pottersAvailable < pottersCount) blockedReason = blockedReason || 'capacity';

        const canBook = !blockedReason && pottersAvailable >= pottersCount;

        console.log(`  ${slotTime} → canBook: ${canBook}, blocked: ${pottersBlocked}, booked: ${pottersBooked}, available: ${pottersAvailable}, reason: ${blockedReason || 'NONE'}`);
    }
}

simulate().catch(console.error);
