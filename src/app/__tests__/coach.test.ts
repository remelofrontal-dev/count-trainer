import { describe, expect, test } from 'bun:test';
import { coachInsight } from '../coach';
import type { AnswerRecord } from '../drill';
import { c } from '../../engine/__tests__/helpers';
import type { Rank } from '../../engine/types';

function rec(rank: Rank, correct: boolean, latencyMs = 1000): AnswerRecord {
  return {
    question: { kind: 'card-tag', card: c(rank), expected: '1' },
    answer: correct ? '1' : '99',
    correct,
    latencyMs,
  };
}

describe('coachInsight v1', () => {
  test('empty session nudges to actually play', () => {
    const i = coachInsight({ answers: [], accuracy: 0, avgMsPerCard: 0, peeks: 0, gatePassed: false });
    expect(i.headline).toMatch(/real go/i);
  });

  test('clean fast gate-clearing run is celebrated and points forward', () => {
    const answers = Array.from({ length: 10 }, () => rec('5', true, 700));
    const i = coachInsight({ answers, accuracy: 1, avgMsPerCard: 700, peeks: 0, gatePassed: true });
    expect(i.headline).toMatch(/locked in/i);
  });

  test('disproportionate ace misses surface as the insight', () => {
    const answers: AnswerRecord[] = [
      rec('A', false), rec('A', false), rec('A', false),
      rec('5', true), rec('6', true), rec('7', true), rec('8', true),
    ];
    const i = coachInsight({ answers, accuracy: 0.57, avgMsPerCard: 1200, peeks: 0, gatePassed: false });
    expect(i.detail).toMatch(/aces/i);
  });

  test('ten-value misses surface as ten-value insight', () => {
    const answers: AnswerRecord[] = [
      rec('K', false), rec('Q', false), rec('10', false),
      rec('5', true), rec('6', true), rec('7', true),
    ];
    const i = coachInsight({ answers, accuracy: 0.5, avgMsPerCard: 1200, peeks: 0, gatePassed: false });
    expect(i.detail).toMatch(/ten-value/i);
  });

  test('speed decay in the back half is detected when no rank-class problem dominates', () => {
    const answers: AnswerRecord[] = [
      rec('5', true, 600), rec('6', true, 600), rec('7', true, 600),
      rec('8', true, 1600), rec('9', true, 1600), rec('2', true, 1600),
    ];
    const i = coachInsight({ answers, accuracy: 1, avgMsPerCard: 1100, peeks: 0, gatePassed: false });
    expect(i.headline).toMatch(/fade late/i);
  });

  test('peek reliance is called out', () => {
    const answers = Array.from({ length: 8 }, () => rec('7', true, 1000));
    const i = coachInsight({ answers, accuracy: 1, avgMsPerCard: 1000, peeks: 3, gatePassed: false });
    expect(i.headline).toMatch(/peek/i);
  });

  test('low accuracy fall-through prioritises accuracy over speed', () => {
    const answers = [rec('7', true), rec('8', false), rec('9', true), rec('7', false)];
    const i = coachInsight({ answers, accuracy: 0.5, avgMsPerCard: 1200, peeks: 0, gatePassed: false });
    expect(i.headline).toMatch(/accuracy/i);
  });

  test('accurate-but-slow fall-through nudges tempo', () => {
    const answers = Array.from({ length: 6 }, () => rec('7', true, 2000));
    const i = coachInsight({ answers, accuracy: 1, avgMsPerCard: 2000, peeks: 0, gatePassed: false });
    expect(i.headline).toMatch(/tempo/i);
  });

  test('solid round gets a steady, forward-looking close', () => {
    const answers = Array.from({ length: 6 }, () => rec('7', true, 1200));
    const i = coachInsight({ answers, accuracy: 0.95, avgMsPerCard: 1200, peeks: 0, gatePassed: false });
    expect(i.headline).toMatch(/steady/i);
  });

  test('every branch returns a non-empty headline and detail', () => {
    const samples = [
      coachInsight({ answers: [], accuracy: 0, avgMsPerCard: 0, peeks: 0, gatePassed: false }),
      coachInsight({ answers: [rec('7', true)], accuracy: 1, avgMsPerCard: 1000, peeks: 0, gatePassed: false }),
    ];
    for (const s of samples) {
      expect(s.headline.length).toBeGreaterThan(0);
      expect(s.detail.length).toBeGreaterThan(0);
    }
  });
});
