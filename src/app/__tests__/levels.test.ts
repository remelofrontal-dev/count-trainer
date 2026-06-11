import { describe, expect, test } from 'bun:test';
import { LEVELS, evaluateGate, isLevelUnlocked, levelById } from '../levels';

describe('ISC-46/105: level definitions', () => {
  test('the path is the 5 levels in brief order with stable ids', () => {
    expect(LEVELS.map((l) => l.id)).toEqual([
      'card-values',
      'running-count-slow',
      'running-count-speed',
      'basic-strategy',
      'true-count',
    ]);
    expect(LEVELS.map((l) => l.order)).toEqual([1, 2, 3, 4, 5]);
    expect(levelById('card-values').title).toBe('Card values');
    expect(() => levelById('nope')).toThrow('Unknown level');
  });

  test('the counting levels gate at 95% with tightening speed', () => {
    const counting = ['card-values', 'running-count-slow', 'running-count-speed'].map(levelById);
    for (const level of counting) expect(level.gate.minAccuracy).toBe(0.95);
    expect(counting.map((l) => l.gate.maxAvgMsPerCard)).toEqual([2500, 2000, 1500]);
  });

  test('tier map (handoff §4): Basic Strategy is FREE, True Count is the first premium gate', () => {
    expect(levelById('card-values').tier).toBe('free');
    expect(levelById('basic-strategy').tier).toBe('free');
    expect(levelById('true-count').tier).toBe('premium');
  });
});

describe('ISC-47: gate evaluation — all three axes must clear', () => {
  const speed = levelById('running-count-speed'); // 95% @ 1500ms — the brief's example gate
  const full = speed.cardsPerSession;

  test('passes exactly at the boundaries (with the full deck answered)', () => {
    expect(evaluateGate(speed, 0.95, 1500, full).passed).toBe(true);
    expect(evaluateGate(speed, 1, 100, full).passed).toBe(true);
  });

  test('accuracy below 95% fails even when fast', () => {
    const r = evaluateGate(speed, 0.949, 800, full);
    expect(r.passed).toBe(false);
    expect(r.accuracyOk).toBe(false);
    expect(r.speedOk).toBe(true);
  });

  test('speed above threshold fails even at 100% accuracy', () => {
    const r = evaluateGate(speed, 1, 1501, full);
    expect(r.passed).toBe(false);
    expect(r.accuracyOk).toBe(true);
    expect(r.speedOk).toBe(false);
  });

  test('ISC-70: incomplete session fails the gate even at perfect accuracy + speed (timeout bypass closed)', () => {
    const r = evaluateGate(speed, 1, 400, 1); // one card, then the clock expired
    expect(r.passed).toBe(false);
    expect(r.completionOk).toBe(false);
    expect(r.accuracyOk).toBe(true);
    expect(r.speedOk).toBe(true);
    // answering one short of the full deck still fails
    expect(evaluateGate(speed, 1, 400, full - 1).passed).toBe(false);
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
