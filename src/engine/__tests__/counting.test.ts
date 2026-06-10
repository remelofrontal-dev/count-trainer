import { describe, expect, test } from 'bun:test';
import { buildDeck, buildShoe, shuffle } from '../deck';
import { HI_LO, countValue, runningCount, trueCount, trueCountFloored } from '../counting';
import { hand } from './helpers';
import type { Rank } from '../types';

describe('Hi-Lo tags', () => {
  test('ISC-20: +1 for each of 2,3,4,5,6', () => {
    for (const rank of ['2', '3', '4', '5', '6'] as Rank[]) {
      expect(countValue(rank)).toBe(1);
    }
  });

  test('ISC-21: 0 for each of 7,8,9', () => {
    for (const rank of ['7', '8', '9'] as Rank[]) {
      expect(countValue(rank)).toBe(0);
    }
  });

  test('ISC-22: −1 for each of 10,J,Q,K,A', () => {
    for (const rank of ['10', 'J', 'Q', 'K', 'A'] as Rank[]) {
      expect(countValue(rank)).toBe(-1);
    }
  });

  test('explicit system parameter works (system-agnostic API)', () => {
    expect(countValue('5', HI_LO)).toBe(1);
    expect(HI_LO.balanced).toBe(true);
    expect(HI_LO.name).toBe('Hi-Lo');
  });
});

describe('running count', () => {
  test('ISC-23: balanced — full deck and full 6-deck shoe sum to 0', () => {
    expect(runningCount(buildDeck())).toBe(0);
    expect(runningCount(buildShoe(6))).toBe(0);
    // order-invariance: shuffled shoe still sums to 0
    expect(runningCount(shuffle(buildShoe(6), 99))).toBe(0);
  });

  test('counts a known sequence correctly', () => {
    // 2(+1) K(−1) 5(+1) 9(0) A(−1) 6(+1) = +1
    expect(runningCount(hand('2', 'K', '5', '9', 'A', '6'))).toBe(1);
  });
});

describe('true count', () => {
  test('ISC-24: exact division — RC +6 across 3 decks → +2.0', () => {
    expect(trueCount(6, 3)).toBe(2);
    expect(trueCount(-4, 2)).toBe(-2);
    expect(trueCount(5, 2)).toBe(2.5);
  });

  test('ISC-25: floored TC truncates toward zero (+5/2 → +2, −5/2 → −2)', () => {
    expect(trueCountFloored(5, 2)).toBe(2);
    expect(trueCountFloored(-5, 2)).toBe(-2);
    expect(trueCountFloored(7, 2)).toBe(3);
  });

  test('ISC-26: sub-one-deck division — RC +2 with 26 cards (0.5 decks) → +4.0', () => {
    expect(trueCount(2, 0.5)).toBe(4);
  });

  test('ISC-27: zero or negative decks remaining throws', () => {
    expect(() => trueCount(3, 0)).toThrow('decksRemaining');
    expect(() => trueCount(3, -1)).toThrow('decksRemaining');
  });
});
