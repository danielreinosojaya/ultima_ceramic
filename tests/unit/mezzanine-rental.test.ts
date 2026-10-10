import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  balanceDue,
  derivePaymentStatus,
  findMezzanineOverlap,
  normalizeMezzanineInput,
  windowsOverlap,
} from '../../utils/mezzanineRental.js';

describe('mezzanine rental', () => {
  it('allows back-to-back hours and blocks a real overlap', () => {
    assert.equal(windowsOverlap('10:00', '13:00', '13:00', '16:00'), false);
    assert.equal(windowsOverlap('10:00', '13:00', '12:30', '14:00'), true);
  });

  it('derives payment status from the amounts', () => {
    assert.equal(derivePaymentStatus(80, 0), 'pending');
    assert.equal(derivePaymentStatus(80, 30), 'partial');
    assert.equal(derivePaymentStatus(80, 80), 'paid');
    assert.equal(balanceDue(80, 30), 50);
  });

  it('ignores cancelled rentals and other days when checking the mezzanine', () => {
    const existing = [
      { id: 'a', contactName: 'Ana', rentalDate: '2026-10-20', startTime: '10:00', endTime: '13:00', status: 'confirmed' },
      { id: 'b', contactName: 'Luis', rentalDate: '2026-10-20', startTime: '15:00', endTime: '18:00', status: 'cancelled' },
      { id: 'c', contactName: 'Mara', rentalDate: '2026-10-21', startTime: '10:00', endTime: '13:00', status: 'confirmed' },
    ];
    assert.equal(
      findMezzanineOverlap(existing, { rentalDate: '2026-10-20', startTime: '15:00', endTime: '18:00' }),
      null
    );
    assert.equal(
      findMezzanineOverlap(existing, { rentalDate: '2026-10-21', startTime: '11:00', endTime: '12:00' })?.id,
      'c'
    );
    assert.equal(
      findMezzanineOverlap(existing, { rentalDate: '2026-10-20', startTime: '10:00', endTime: '12:00' }, 'a'),
      null
    );
  });

  it('rejects an end time that is not after the start', () => {
    const result = normalizeMezzanineInput({
      contactName: 'Ana',
      rentalDate: '2026-10-20',
      startTime: '18:00',
      endTime: '16:00',
    });
    assert.equal(result.ok, false);
  });
});
