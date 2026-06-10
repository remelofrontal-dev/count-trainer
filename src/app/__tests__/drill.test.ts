import { describe, expect, test } from 'bun:test';
import {
  SESSION_CAP_MS,
  answer,
  createDrill,
  currentCard,
  expectedAnswer,
  peek,
  remainingMs,
  runningCountSoFar,
  sessionResult,
  tick,
} from '../drill';
import { levelById } from '../levels';
import { countValue, runningCount } from '../../engine/counting';

const L1 = levelById('card-values');
const L3 = levelById('running-count-speed');
const T0 = 1_000_000;

describe('ISC-49: drill machine deals, grades, records latency', () => {
  test('deals cardsPerSession cards and starts at index 0', () => {
    const drill = createDrill(L1, 42, T0);
    expect(drill.cards).toHaveLength(L1.cardsPerSession);
    expect(drill.index).toBe(0);
    expect(drill.status).toBe('running');
    expect(currentCard(drill)).toEqual(drill.cards[0]);
  });

  test('correct and incorrect answers are graded against the Hi-Lo tag', () => {
    let drill = createDrill(L1, 42, T0);
    const tag0 = countValue((drill.cards[0]!).rank);
    drill = answer(drill, tag0, T0 + 800);
    expect(drill.answers[0]!.correct).toBe(true);
    expect(drill.answers[0]!.latencyMs).toBe(800);

    const wrong = countValue((drill.cards[1]!).rank) === 1 ? -1 : 1;
    drill = answer(drill, wrong, T0 + 1500);
    expect(drill.answers[1]!.correct).toBe(false);
    expect(drill.answers[1]!.latencyMs).toBe(700); // measured from previous deal
  });

  test('finishes after the last card; further answers are no-ops', () => {
    let drill = createDrill(L1, 7, T0);
    for (let i = 0; i < L1.cardsPerSession; i++) {
      drill = answer(drill, expectedAnswer(drill, drill.index), T0 + (i + 1) * 500);
    }
    expect(drill.status).toBe('finished');
    const frozen = answer(drill, 1, T0 + 99_999);
    expect(frozen).toBe(drill);
    expect(currentCard(drill)).toBeUndefined();
  });
});

describe('ISC-52: tags are the answer in every mode; running count tracked for peek', () => {
  test('expectedAnswer is the Hi-Lo tag in running-count mode too', () => {
    const drill = createDrill(L3, 11, T0);
    for (let i = 0; i < 5; i++) {
      expect(expectedAnswer(drill, i)).toBe(countValue((drill.cards[i]!).rank));
    }
  });

  test('runningCountSoFar matches engine runningCount over answered cards', () => {
    let drill = createDrill(L3, 11, T0);
    drill = answer(drill, 0, T0 + 1);
    drill = answer(drill, 0, T0 + 2);
    drill = answer(drill, 0, T0 + 3);
    expect(runningCountSoFar(drill)).toBe(runningCount(drill.cards.slice(0, 3)));
  });

  test('expectedAnswer throws past the deck', () => {
    const drill = createDrill(L1, 1, T0);
    expect(() => expectedAnswer(drill, 999)).toThrow('No card');
  });
});

describe('ISC-50: peek recording', () => {
  test('peek increments; ignored after finish', () => {
    let drill = createDrill(L1, 3, T0);
    drill = peek(drill);
    drill = peek(drill);
    expect(drill.peeks).toBe(2);
    const done = { ...drill, status: 'finished' as const };
    expect(peek(done)).toBe(done);
  });
});

describe('ISC-51: two-minute cap', () => {
  test('tick before cap keeps running; at cap finishes', () => {
    let drill = createDrill(L1, 5, T0);
    drill = tick(drill, T0 + SESSION_CAP_MS - 1);
    expect(drill.status).toBe('running');
    expect(remainingMs(drill, T0 + SESSION_CAP_MS - 1)).toBe(1);
    drill = tick(drill, T0 + SESSION_CAP_MS);
    expect(drill.status).toBe('finished');
    expect(tick(drill, T0 + SESSION_CAP_MS + 1)).toBe(drill);
    expect(remainingMs(drill, T0 + SESSION_CAP_MS * 2)).toBe(0);
  });
});

describe('session result math', () => {
  test('ISC-50: peek penalty lands in the session score', () => {
    let drill = createDrill(L1, 99, T0);
    for (let i = 0; i < L1.cardsPerSession; i++) {
      drill = answer(drill, expectedAnswer(drill, drill.index), T0 + (i + 1) * 600);
    }
    const clean = sessionResult(drill);
    const peeked = sessionResult({ ...drill, peeks: 2 });
    expect(clean.accuracy).toBe(1);
    expect(peeked.score).toBe(Math.max(0, clean.score - 10));
    expect(peeked.peeks).toBe(2);
  });

  test('zero-answer session scores 0 without NaN', () => {
    const drill = createDrill(L1, 5, T0);
    const result = sessionResult({ ...drill, status: 'finished' });
    expect(result.score).toBe(0);
    expect(result.accuracy).toBe(0);
    expect(result.avgMsPerCard).toBe(0);
    expect(Number.isNaN(result.avgMsPerCard)).toBe(false);
  });

  test('misses and avg latency computed correctly', () => {
    let drill = createDrill(L1, 5, T0);
    drill = answer(drill, expectedAnswer(drill, 0), T0 + 1000);
    drill = answer(drill, 99, T0 + 2000); // guaranteed miss
    const result = sessionResult({ ...drill, status: 'finished' });
    expect(result.cardsAnswered).toBe(2);
    expect(result.misses).toBe(1);
    expect(result.accuracy).toBe(0.5);
    expect(result.avgMsPerCard).toBe(1000);
  });
});
