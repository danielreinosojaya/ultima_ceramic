import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizeSlotOccupancy } from '../../utils/slotOccupancy.js';

describe('summarizeSlotOccupancy', () => {
  const ten = 10 * 60;
  const tenThirty = 10 * 60 + 30;
  const eleven = 11 * 60;

  it('keeps exact badge count separate from overlapping capacity', () => {
    // 11:00 has 2 people; they overlap 10:00 window but must NOT show as booked at 10:00
    const entries = [
      { startMinutes: eleven, participants: 1 },
      { startMinutes: eleven, participants: 1 },
    ];
    const at10 = summarizeSlotOccupancy(entries, ten);
    assert.equal(at10.exactBooked, 0);
    assert.equal(at10.overlappingBooked, 2);

    const at11 = summarizeSlotOccupancy(entries, eleven);
    assert.equal(at11.exactBooked, 2);
    assert.equal(at11.overlappingBooked, 2);
  });

  it('counts a 10:00 booking only on the exact hour for the badge', () => {
    const entries = [{ startMinutes: ten, participants: 1 }];
    assert.deepEqual(summarizeSlotOccupancy(entries, ten), {
      exactBooked: 1,
      overlappingBooked: 1,
    });
    assert.deepEqual(summarizeSlotOccupancy(entries, tenThirty), {
      exactBooked: 0,
      overlappingBooked: 1,
    });
    assert.deepEqual(summarizeSlotOccupancy(entries, eleven), {
      exactBooked: 0,
      overlappingBooked: 1,
    });
  });

  it('shows empty slots with zero exact bookings (no phantom +1)', () => {
    assert.deepEqual(summarizeSlotOccupancy([], ten), {
      exactBooked: 0,
      overlappingBooked: 0,
    });
  });

  it('allows back-to-back classes without overlap (13:00 after 11:00-13:00)', () => {
    const entries = [{ startMinutes: eleven, participants: 2 }];
    const thirteen = 13 * 60;
    assert.deepEqual(summarizeSlotOccupancy(entries, thirteen), {
      exactBooked: 0,
      overlappingBooked: 0,
    });
  });
});
