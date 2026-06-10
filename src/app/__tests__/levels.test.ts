import { describe, expect, test } from 'bun:test';
import { LEVELS, evaluateGate, isLevelUnlocked, levelById } from '../levels';

describe('ISC-46: level definitions', () => {
  test('L1–L3 exist in order with 95% gates and tightening speed thresholds', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['card-values', 'running-count-slow', 'running-count-speed']);
    expect(LEVELS.map((l) => l.order)).toEqual([1, 2, 3]);
    for (const level of LEVELS) {
      expect(level.gate.minAccuracy).toBe(0.95);
    }
    expect(LEVELS.map((l) => l.gate.maxAvgMsPerCard)).toEqual([2500, 2000, 1500]);
    expect(levelById('card-values').title).toBe('Card values');
    expect(() => levelById('nope')).toThrow('Unknown level');
  });
});

describe('ISC-47: gate evaluation — both axes must clear', () => {
  const speed = levelById('running-count-speed'); // 95% @ 1500ms — the brief's example gate

  test('passes exactly at the boundaries', () => {
    expect(evaluateGate(speed, 0.95, 1500).passed).toBe(true);
    expect(evaluateGate(speed, 1, 100).passed).toBe(true);
  });

  test('accuracy below 95% fails even when fast', () => {
    const r = evaluateGate(speed, 0.949, 800);
    expect(r.passed).toBe(false);
    expect(r.accuracyOk).toBe(false);
    expect(r.speedOk).toBe(true);
  });

  test('speed above threshold fails even at 100% accuracy', () => {
    const r = evaluateGate(speed, 1, 1501);
    expect(r.passed).toBe(false);
    expect(r.accuracyOk).toBe(true);
    expect(r.speedOk).toBe(false);
  });
});

describe('ISC-48: sequential unlock', () => {
  test('L1 always unlocked; L2/L3 require prior gates', () => {
    const none = new Set<string>();
    expect(isLevelUnlocked('card-values', none)).toBe(true);
    expect(isLevelUnlocked('running-count-slow', none)).toBe(false);
    expect(isLevelUnlocked('running-count-speed', none)).toBe(false);

    const l1 = new Set(['card-values']);
    expect(isLevelUnlocked('running-count-slow', l1)).toBe(true);
    expect(isLevelUnlocked('running-count-speed', l1)).toBe(false);

    const l1l2 = new Set(['card-values', 'running-count-slow']);
    expect(isLevelUnlocked('running-count-speed', l1l2)).toBe(true);
  });

  test('skipping a gate keeps later levels locked', () => {
    const onlyL2 = new Set(['running-count-slow']);
    expect(isLevelUnlocked('running-count-speed', onlyL2)).toBe(false);
  });
});
