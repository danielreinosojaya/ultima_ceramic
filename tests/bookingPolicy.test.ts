import { slotsRequireNoRefund, slotToDate } from '../utils/bookingPolicy';

describe('bookingPolicy utils', () => {
  test('slotToDate parses HH:mm correctly', () => {
    const slot = { date: '2025-10-22', time: '09:30' };
    const dt = slotToDate(slot);
    expect(dt instanceof Date).toBeTruthy();
    expect(dt.getFullYear()).toBe(2025);
    expect(dt.getMonth()).toBe(9); // October is month 9 (0-indexed)
    expect(dt.getDate()).toBe(22);
  });

  test('slotsRequireNoRefund detects near slots', () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dateStr = in24h.toISOString().split('T')[0];
    const slot = { date: dateStr, time: `${in24h.getHours().toString().padStart(2, '0')}:00` };
    expect(slotsRequireNoRefund([slot], 48)).toBe(true);
  });

  test('slotsRequireNoRefund returns false for far slots', () => {
    const now = new Date();
    const in5days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const dateStr = in5days.toISOString().split('T')[0];
    const slot = { date: dateStr, time: '10:00' };
    expect(slotsRequireNoRefund([slot], 48)).toBe(false);
  });
});
