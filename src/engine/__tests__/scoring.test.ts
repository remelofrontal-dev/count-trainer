import { describe, expect, test } from 'bun:test';
import {
  PEEK_PENALTY,
  SPEED_CEILING_MS,
  SPEED_FLOOR_MS,
  accuracy,
  applyPeekPenalty,
  casinoReadyV1,
  speedScore,
} from '../scoring';

describe('accuracy', () => {
  test('ISC-37a: correct/total ratio; zero attempts → 0, never NaN', () => {
    expect(accuracy(9, 10)).toBe(0.9);
    expect(accuracy(0, 0)).toBe(0);
    expect(Number.isNaN(accuracy(0, 0))).toBe(false);
    expect(accuracy(12, 10)).toBe(1); // clamped
    expect(accuracy(-1, 10)).toBe(0); // clamped
  });
});

describe('speedScore', () => {
  test('ISC-37b: monotonic in ms-per-card and bounded 0–100', () => {
    expect(speedScore(SPEED_FLOOR_MS)).toBe(100);
    expect(speedScore(100)).toBe(100); // faster than floor still 100
    expect(speedScore(SPEED_CEILING_MS)).toBe(0);
    expect(speedScore(10000)).toBe(0); // slower than ceiling still 0
    expect(speedScore(600)).toBeGreaterThan(speedScore(1200));
    expect(speedScore(1200)).toBeGreaterThan(speedScore(2400));
    expect(speedScore(1750)).toBe(50); // midpoint
  });
});

describe('casinoReadyV1', () => {
  test('ISC-38a: 60/40 accuracy/speed composite bounded 0–100', () => {
    expect(casinoReadyV1({ accuracy: 1, avgMsPerCard: 400 })).toBe(100);
    expect(casinoReadyV1({ accuracy: 0, avgMsPerCard: 5000 })).toBe(0);
    expect(casinoReadyV1({ accuracy: 1, avgMsPerCard: 5000 })).toBe(60); // accuracy only
    expect(casinoReadyV1({ accuracy: 0, avgMsPerCard: 400 })).toBe(40); // speed only
    expect(casinoReadyV1({ accuracy: 0.9, avgMsPerCard: 1750 })).toBe(74); // 54 + 20
    expect(casinoReadyV1({ accuracy: 2, avgMsPerCard: 0 })).toBe(100); // clamped inputs
  });
});

describe('peek penalty', () => {
  test('ISC-38b: −5 per peek, floors at 0, caps at 100', () => {
    expect(PEEK_PENALTY).toBe(5);
    expect(applyPeekPenalty(80, 1)).toBe(75);
    expect(applyPeekPenalty(80, 3)).toBe(65);
    expect(applyPeekPenalty(7, 2)).toBe(0); // floor
    expect(applyPeekPenalty(120, 0)).toBe(100); // cap
  });
});
