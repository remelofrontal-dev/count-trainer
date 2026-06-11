import { describe, expect, test } from 'bun:test';
import {
  DEVIATIONS,
  INSURANCE_INDEX,
  deviationAwareAction,
  findDeviation,
  indexReached,
  shouldTakeInsurance,
} from '../deviations';
import { DEFAULT_RULES } from '../types';
import { c } from './helpers';

describe('indexReached', () => {
  test('at_or_above deviates when TC ≥ index', () => {
    const dev = DEVIATIONS.find((d) => d.id === '16v10')!; // index 0
    expect(indexReached(dev, 0)).toBe(true);
    expect(indexReached(dev, 1)).toBe(true);
    expect(indexReached(dev, -1)).toBe(false);
  });

  test('at_or_below deviates when TC ≤ index', () => {
    const dev = DEVIATIONS.find((d) => d.id === '13v2')!; // index -1
    expect(indexReached(dev, -1)).toBe(true);
    expect(indexReached(dev, -2)).toBe(true);
    expect(indexReached(dev, 0)).toBe(false);
  });
});

describe('findDeviation', () => {
  test('matches 16 vs 10 by total + upcard', () => {
    const dev = findDeviation([c('10'), c('6')], '10');
    expect(dev?.id).toBe('16v10');
  });

  test('returns undefined when no deviation applies', () => {
    expect(findDeviation([c('10'), c('9')], '7')).toBeUndefined(); // 19 vs 7 — no index play
  });
});

describe('deviationAwareAction', () => {
  test('16 vs 10: stand at TC ≥ 0, hit below (basic strategy)', () => {
    expect(deviationAwareAction([c('10'), c('6')], '10', 0, DEFAULT_RULES)).toBe('S'); // deviate
    expect(deviationAwareAction([c('10'), c('6')], '10', -1, DEFAULT_RULES)).toBe('H'); // basic
  });

  test('15 vs 10: stand only at TC ≥ 4', () => {
    expect(deviationAwareAction([c('10'), c('5')], '10', 4, DEFAULT_RULES)).toBe('S');
    expect(deviationAwareAction([c('10'), c('5')], '10', 3, DEFAULT_RULES)).toBe('H');
  });

  test('a non-deviation hand falls through to basic strategy', () => {
    // 20 vs 6 → always stand, no index
    expect(deviationAwareAction([c('10'), c('10')], '6', 5, DEFAULT_RULES)).toBe('S');
  });
});

describe('insurance', () => {
  test('take insurance only vs an ace at TC ≥ +3', () => {
    expect(INSURANCE_INDEX).toBe(3);
    expect(shouldTakeInsurance('A', 3)).toBe(true);
    expect(shouldTakeInsurance('A', 2)).toBe(false);
    expect(shouldTakeInsurance('10', 5)).toBe(false); // not an ace
  });
});

describe('data integrity', () => {
  test('every deviation has a valid direction and action', () => {
    for (const d of DEVIATIONS) {
      expect(['at_or_above', 'at_or_below']).toContain(d.direction);
      expect(['H', 'S', 'D', 'P', 'R']).toContain(d.deviationAction);
      expect(d.id.length).toBeGreaterThan(0);
    }
  });
});
