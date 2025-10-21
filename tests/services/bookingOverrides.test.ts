import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as dataService from '../../services/dataService';

describe('booking overrides service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('getBookingOverrides returns overrides array', async () => {
    const fake = [{ id: 'ov1', overriddenBy: 'ops@example.com', reason: 'Test', createdAt: new Date().toISOString() }];
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fake), text: () => Promise.resolve(JSON.stringify(fake)), headers: { get: () => 'application/json' } })) as any;

    const res = await dataService.getBookingOverrides('booking-1');
    expect(res).toBeInstanceOf(Array);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('ov1');
  });

  it('authorizeBookingOverride posts and returns result', async () => {
    const apiResp = { success: true, override: { id: 'ov1' }, booking: { id: 'booking-1' } };
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(apiResp), text: () => Promise.resolve(JSON.stringify(apiResp)), headers: { get: () => 'application/json' } })) as any;

    const result = await dataService.authorizeBookingOverride('booking-1', 'ops@example.com', 'Test reason', { via: 'test' });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.override).toBeDefined();
    expect(result.override.id).toBe('ov1');
  });
});
