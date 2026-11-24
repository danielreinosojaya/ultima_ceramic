import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAvailableTimesForDate } from '../../services/dataService.ts';

const availability = {
  Sunday: [{ time: '10:00', instructorId: 1, technique: 'potters_wheel' as const }],
  Monday: [{ time: '10:00', instructorId: 1, technique: 'potters_wheel' as const }],
  Tuesday: [
    { time: '10:00', instructorId: 1, technique: 'potters_wheel' as const },
    { time: '16:00', instructorId: 1, technique: 'potters_wheel' as const },
  ],
  Wednesday: [{ time: '10:00', instructorId: 1, technique: 'potters_wheel' as const }],
  Thursday: [],
  Friday: [],
  Saturday: [{ time: '10:00', instructorId: 1, technique: 'potters_wheel' as const }],
};

const appData = {
  availability,
  scheduleOverrides: {},
  classCapacity: { potters_wheel: 8, molding: 8, introductory_class: 6 },
  bookings: [],
};

function timesOn(year: number, monthIndex: number, day: number, technique: 'potters_wheel' | 'molding' = 'potters_wheel') {
  const slots = getAvailableTimesForDate(new Date(year, monthIndex, day), appData as any, technique);
  return slots.map((slot) => slot.time).sort();
}

describe('package calendar hides blocked holiday torno', () => {
  it('drops potters wheel on the closed holiday days', () => {
    assert.deepEqual(timesOn(2026, 11, 21), []);
    assert.deepEqual(timesOn(2026, 11, 23), []);
    assert.deepEqual(timesOn(2026, 11, 26), []);
    assert.deepEqual(timesOn(2026, 11, 27), []);
    assert.deepEqual(timesOn(2026, 11, 29), []);
  });

  it('keeps only 16:00 on Dec 28', () => {
    assert.deepEqual(timesOn(2026, 11, 28), ['16:00']);
  });

  it('leaves a normal Tuesday and molding on a closed torno day', () => {
    assert.deepEqual(timesOn(2026, 11, 22), ['10:00', '16:00']);
    assert.ok(timesOn(2026, 11, 21, 'molding').includes('10:00'));
  });
});
