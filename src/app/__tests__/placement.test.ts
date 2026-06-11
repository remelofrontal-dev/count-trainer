import { describe, expect, test } from 'bun:test';
import { checkPassed, evaluatePlacement } from '../placement';

describe('checkPassed', () => {
  test('requires both accuracy ≥85% and pace ≤2200ms; 0 total fails', () => {
    expect(checkPassed(7, 8, 1500)).toBe(true);
    expect(checkPassed(6, 8, 1500)).toBe(false); // 75% accuracy
    expect(checkPassed(8, 8, 2300)).toBe(false); // too slow
    expect(checkPassed(0, 0, 1000)).toBe(false);
  });
});

describe('evaluatePlacement', () => {
  test("'new' starts at the beginning, nothing tested out", () => {
    const o = evaluatePlacement('new', null);
    expect(o.startLevelId).toBe('card-values');
    expect(o.testedOut).toEqual([]);
    expect(o.seededCasinoReady).toBe(0);
  });

  test("'knows-play' passing tests out card values and opens at running count", () => {
    const o = evaluatePlacement('knows-play', { correct: 8, total: 8, avgMsPerCard: 1400 });
    expect(o.testedOut).toEqual(['card-values']);
    expect(o.startLevelId).toBe('running-count-slow');
    expect(o.seededCasinoReady).toBe(20);
  });

  test("'knows-play' failing fast-tracks but never claims tested-out, no 'failed' framing", () => {
    const o = evaluatePlacement('knows-play', { correct: 4, total: 8, avgMsPerCard: 1400 });
    expect(o.testedOut).toEqual([]);
    expect(o.startLevelId).toBe('card-values');
    expect(o.framing).not.toMatch(/fail/i);
  });

  test("'counts' passing tests out two levels, opens at speed, seeds a hook score", () => {
    const o = evaluatePlacement('counts', { correct: 8, total: 8, avgMsPerCard: 1200 });
    expect(o.testedOut).toEqual(['card-values', 'running-count-slow']);
    expect(o.startLevelId).toBe('running-count-speed');
    expect(o.seededCasinoReady).toBe(55);
  });

  test("'counts' failing still places mid-path with a non-negative seed", () => {
    const o = evaluatePlacement('counts', { correct: 5, total: 8, avgMsPerCard: 2500 });
    expect(o.startLevelId).toBe('running-count-slow');
    expect(o.testedOut).toEqual(['card-values']);
    expect(o.seededCasinoReady).toBe(35);
  });
});
