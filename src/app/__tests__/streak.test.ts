import { describe, expect, test } from 'bun:test';
import { EMPTY_STREAK, effectiveStreak, localDay, recordCompletion } from '../streak';

describe('ISC-53: streak increments, repeats, resets', () => {
  test('first completion starts at 1', () => {
    expect(recordCompletion(EMPTY_STREAK, '2026-06-10')).toEqual({ count: 1, lastDay: '2026-06-10' });
  });

  test('same-day repeat does not double-count', () => {
    const s = recordCompletion(EMPTY_STREAK, '2026-06-10');
    expect(recordCompletion(s, '2026-06-10')).toEqual(s);
  });

  test('consecutive day increments', () => {
    let s = recordCompletion(EMPTY_STREAK, '2026-06-10');
    s = recordCompletion(s, '2026-06-11');
    expect(s.count).toBe(2);
  });

  test('a missed day resets to 1', () => {
    let s = recordCompletion(EMPTY_STREAK, '2026-06-10');
    s = recordCompletion(s, '2026-06-12');
    expect(s).toEqual({ count: 1, lastDay: '2026-06-12' });
  });
});

describe('ISC-54: local-date rollover boundaries', () => {
  test('month boundary counts as consecutive', () => {
    let s = recordCompletion(EMPTY_STREAK, '2026-06-30');
    s = recordCompletion(s, '2026-07-01');
    expect(s.count).toBe(2);
  });

  test('year boundary counts as consecutive', () => {
    let s = recordCompletion(EMPTY_STREAK, '2026-12-31');
    s = recordCompletion(s, '2027-01-01');
    expect(s.count).toBe(2);
  });

  test('localDay formats local midnight boundary dates correctly', () => {
    expect(localDay(new Date(2026, 5, 10, 23, 59, 59))).toBe('2026-06-10');
    expect(localDay(new Date(2026, 5, 11, 0, 0, 1))).toBe('2026-06-11');
    expect(localDay(new Date(2026, 0, 2))).toBe('2026-01-02'); // zero-padding
  });

  test('effectiveStreak shows count today/next-day, 0 after a gap', () => {
    const s = { count: 5, lastDay: '2026-06-10' };
    expect(effectiveStreak(s, '2026-06-10')).toBe(5);
    expect(effectiveStreak(s, '2026-06-11')).toBe(5); // still alive, not yet broken
    expect(effectiveStreak(s, '2026-06-12')).toBe(0);
    expect(effectiveStreak(EMPTY_STREAK, '2026-06-10')).toBe(0);
  });
});
