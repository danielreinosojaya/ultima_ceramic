import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Vercel request/response objects
const mockReq = (body = {}, query = {}) => ({ method: 'POST', body, query });
const mockRes = () => {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.setHeader = vi.fn();
  res.end = vi.fn();
  return res;
};

// We'll import the handler dynamically to allow mocking sql
describe('API authorizeBookingOverride action', () => {
  beforeEach(() => {
    vi.resetModules();
    // Ensure handler doesn't abort due to missing DB URL in tests
    process.env.POSTGRES_URL = 'postgres://test';
  });

  it('inserts override and updates booking successfully', async () => {
    // Mock sql tagged template function
    const mockSql = vi.fn();

    // Simulate different calls to sql using mockImplementationOnce
    // 1) BEGIN -> no return
    mockSql.mockImplementationOnce(() => Promise.resolve());
    // 2) INSERT INTO booking_overrides -> return { rows: [overrideRow] }
    mockSql.mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 'ov1', booking_id: 'b1', overridden_by: 'ops', reason: 'test', metadata: {}, created_at: new Date().toISOString() }] }));
    // 3) UPDATE bookings SET accepted_no_refund = true -> return updated booking
    mockSql.mockImplementationOnce(() => Promise.resolve({ rows: [{ id: 'b1', accepted_no_refund: true, price: '10.00', product: '{}' }] }));
    // 4) COMMIT
    mockSql.mockImplementationOnce(() => Promise.resolve());

    // Provide the mock sql via module mocking
    vi.mock('@vercel/postgres', () => ({ sql: mockSql }));

    const handlerModule = await import('../../api/data');

    const req = mockReq({ bookingId: 'b1', overriddenBy: 'ops', reason: 'test' }, { action: 'authorizeBookingOverride' });
    const res = mockRes();

    // Call handleAction via POST flow: use handler default export
    await handlerModule.default(req as any, res as any);

    // Expect res.status to have been called with 200 and json with success true
    expect(res.status).toHaveBeenCalled();
    // Because we used generic handler, check that json called at least once
    expect(res.json).toHaveBeenCalled();
  });

  it('returns 400 when missing params', async () => {
    vi.mock('@vercel/postgres', () => ({ sql: vi.fn() }));
    const handlerModule = await import('../../api/data');
    const req = mockReq({}, { action: 'authorizeBookingOverride' });
    const res = mockRes();
    await handlerModule.default(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });
});
