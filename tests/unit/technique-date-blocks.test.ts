import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isTechniqueFullyBlockedOnDate,
  isTechniqueSlotBlocked,
  isTechniqueBlockedOnDate,
} from '../../utils/techniqueDateBlocks.js';

describe('technique date blocks', () => {
  describe('regression oct 29-31 2026 full-day potters', () => {
    for (const date of ['2026-10-29', '2026-10-30', '2026-10-31']) {
      it(`blocks potters_wheel all day on ${date}`, () => {
        assert.equal(isTechniqueFullyBlockedOnDate(date, 'potters_wheel'), true);
        assert.equal(isTechniqueBlockedOnDate(date, 'potters_wheel'), true);
        assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '11:00'), true);
        assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '18:00'), true);
      });

      it(`does not block molding/painting on ${date}`, () => {
        assert.equal(isTechniqueFullyBlockedOnDate(date, 'molding'), false);
        assert.equal(isTechniqueSlotBlocked(date, 'molding', '11:00'), false);
        assert.equal(isTechniqueSlotBlocked(date, 'painting', '14:00'), false);
        assert.equal(isTechniqueSlotBlocked(date, 'hand_modeling', '16:00'), false);
      });
    }
  });

  it('leaves unrelated dates open', () => {
    assert.equal(isTechniqueFullyBlockedOnDate('2026-11-18', 'potters_wheel'), false);
    assert.equal(isTechniqueSlotBlocked('2026-11-18', 'potters_wheel', '13:00'), false);
  });

  describe('2026-11-19 only 11:00-13:00 and 18:00-20:00', () => {
    const date = '2026-11-19';
    it('is not a full-day block', () => {
      assert.equal(isTechniqueFullyBlockedOnDate(date, 'potters_wheel'), false);
    });
    it('allows 11:00 and 18:00; blocks 10:00, 10:30, 13:00 and 16:00', () => {
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '10:00'), true);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '10:30'), true);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '11:00'), false);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '13:00'), true);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '16:00'), true);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '18:00'), false);
    });
  });

  describe('2026-11-25 from 13:00 to end of day', () => {
    const date = '2026-11-25';
    it('allows last class ending at 13:00; blocks later starts', () => {
      assert.equal(isTechniqueFullyBlockedOnDate(date, 'potters_wheel'), false);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '11:00'), false);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '11:30'), true);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '13:00'), true);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '18:00'), true);
    });
  });

  describe('2026-11-26 and 2026-11-27 full day', () => {
    for (const date of ['2026-11-26', '2026-11-27']) {
      it(`fully blocks potters on ${date}`, () => {
        assert.equal(isTechniqueFullyBlockedOnDate(date, 'potters_wheel'), true);
        assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '10:00'), true);
        assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '15:00'), true);
        assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '18:00'), true);
      });
    }
  });

  describe('2026-11-28 until 15:00', () => {
    const date = '2026-11-28';
    it('blocks morning through 14:00; allows from 15:00', () => {
      assert.equal(isTechniqueFullyBlockedOnDate(date, 'potters_wheel'), false);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '13:00'), true);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '14:00'), true);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '15:00'), false);
      assert.equal(isTechniqueSlotBlocked(date, 'potters_wheel', '18:00'), false);
    });
  });

  describe('isolation from other techniques on nov blocks', () => {
    const dates = ['2026-11-19', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28'];
    for (const date of dates) {
      it(`does not block molding/painting/hand_modeling on ${date}`, () => {
        for (const tech of ['molding', 'painting', 'hand_modeling']) {
          assert.equal(isTechniqueFullyBlockedOnDate(date, tech), false);
          assert.equal(isTechniqueSlotBlocked(date, tech, '13:00'), false);
          assert.equal(isTechniqueSlotBlocked(date, tech, '16:00'), false);
        }
      });
    }
  });
});
