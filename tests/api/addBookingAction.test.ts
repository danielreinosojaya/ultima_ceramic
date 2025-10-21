import { describe, it, expect, vi, beforeEach } from 'vitest';

// Ensure DB env var exists to avoid api/db module throwing during import
process.env.POSTGRES_URL = process.env.POSTGRES_URL || 'postgres://localhost/fake';

// Mock @vercel/postgres sql export used in api/data.ts
vi.mock('@vercel/postgres', () => {
  const sql = (...args: any[]) => {
    const text = String(args[0] || '') + (args[1] || '');
    // If inserting into bookings, return a fake booking row
    if (text.includes('INSERT INTO bookings')) {
      const fakeRow = {
        id: 'fake-booking-id',
        product_id: 'p1',
        product_type: 'SINGLE_CLASS',
        slots: JSON.stringify([]),
        user_info: JSON.stringify({ firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '123', countryCode: '+1' }),
        created_at: new Date().toISOString(),
        is_paid: false,
        price: 10,
        booking_mode: 'flexible',
        product: JSON.stringify({ id: 'p1', type: 'SINGLE_CLASS', name: 'S', price: 10 }),
        booking_code: 'C-ALMA-FAKE'
      };
      return { rows: [fakeRow] };
    }
    return { rows: [] };
  };
  return { sql };
});

// Mock emailService to avoid side effects
vi.mock('../../api/emailService.js', () => ({
  sendPreBookingConfirmationEmail: vi.fn(),
  sendPaymentReceiptEmail: vi.fn(),
  sendClassReminderEmail: vi.fn()
}));

// Import the function under test after mocks are set
import { addBookingAction } from '../../api/data.js';

describe('addBookingAction integration-like tests (mocked DB)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects booking when slot is <48h and acceptedNoRefund not provided', async () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const slot = { date: in24h.toISOString().split('T')[0], time: `${in24h.getHours().toString().padStart(2,'0')}:00`, instructorId: 1 };

    const payload: any = {
      productId: 'p1',
      product: { id: 'p1', type: 'SINGLE_CLASS', name: 'S', description: '', isActive: true, classes:1, price: 10, details: { duration: '1', durationHours: 1, activities: [], generalRecommendations: '', materials: '', technique: 'potters_wheel' } },
      productType: 'SINGLE_CLASS',
      slots: [slot],
      userInfo: { firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '123', countryCode: '+1'},
      isPaid: false,
      price: 10,
      bookingMode: 'flexible'
    };

    const res = await addBookingAction(payload);
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/menos de 48 horas/i);
  });

  it('accepts booking when slot is <48h and acceptedNoRefund true', async () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const slot = { date: in24h.toISOString().split('T')[0], time: `${in24h.getHours().toString().padStart(2,'0')}:00`, instructorId: 1 };

    const payload: any = {
      productId: 'p1',
      product: { id: 'p1', type: 'SINGLE_CLASS', name: 'S', description: '', isActive: true, classes:1, price: 10, details: { duration: '1', durationHours: 1, activities: [], generalRecommendations: '', materials: '', technique: 'potters_wheel' } },
      productType: 'SINGLE_CLASS',
      slots: [slot],
      userInfo: { firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '123', countryCode: '+1'},
      isPaid: false,
      price: 10,
      bookingMode: 'flexible',
      acceptedNoRefund: true
    };

    const res = await addBookingAction(payload);
    // With mocked sql, the insertion returns rows: [] => parse may create fallback booking
    expect(res.success).toBe(true);
    expect(res.booking).toBeDefined();
  });
});
