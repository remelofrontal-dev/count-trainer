import { describe, expect, test } from 'bun:test';
import {
  SESSION_CAP_MS,
  answer,
  createDrill,
  currentCard,
  currentQuestion,
  expectedAnswer,
  peek,
  remainingMs,
  runningCountSoFar,
  sessionResult,
  tick,
} from '../drill';
import { levelById } from '../levels';
import { countValue, runningCount, trueCountFloored } from '../../engine/counting';
import { basicStrategyAction, resolveAction } from '../../engine/basicStrategy';
import { DEFAULT_RULES, type Card } from '../../engine/types';

const L1 = levelById('card-values');
const L3 = levelById('running-count-speed');
const STRAT = levelById('basic-strategy');
const TC = levelById('true-count');
const T0 = 1_000_000;

function qCards(drill: ReturnType<typeof createDrill>): Card[] {
  return drill.questions.map((q) => q.card).filter((c): c is Card => c !== undefined);
}

describe('ISC-49: drill machine deals, grades, records latency', () => {
  test('deals cardsPerSession questions and starts at index 0', () => {
    const drill = createDrill(L1, 42, T0);
    expect(drill.questions).toHaveLength(L1.cardsPerSession);
    expect(drill.index).toBe(0);
    expect(drill.status).toBe('running');
    expect(currentCard(drill)).toEqual(drill.questions[0]!.card);
  });

  test('correct and incorrect answers are graded against the expected', () => {
    let drill = createDrill(L1, 42, T0);
    const tag0 = countValue((drill.questions[0]!.card!).rank);
    drill = answer(drill, tag0, T0 + 800);
    expect(drill.answers[0]!.correct).toBe(true);
    expect(drill.answers[0]!.latencyMs).toBe(800);

    const wrong = countValue((drill.questions[1]!.card!).rank) === 1 ? -1 : 1;
    drill = answer(drill, wrong, T0 + 1500);
    expect(drill.answers[1]!.correct).toBe(false);
    expect(drill.answers[1]!.latencyMs).toBe(700); // measured from previous deal
  });

  test('finishes after the last question; further answers are no-ops', () => {
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

describe('ISC-52: count modes grade the Hi-Lo tag; running count tracked for peek', () => {
  test('expected is the normalized Hi-Lo tag in running-count mode too', () => {
    const drill = createDrill(L3, 11, T0);
    for (let i = 0; i < 5; i++) {
      expect(expectedAnswer(drill, i)).toBe(String(countValue((drill.questions[i]!.card!).rank)));
    }
  });

  test('runningCountSoFar matches engine runningCount over answered cards', () => {
    let drill = createDrill(L3, 11, T0);
    drill = answer(drill, 0, T0 + 1);
    drill = answer(drill, 0, T0 + 2);
    drill = answer(drill, 0, T0 + 3);
    expect(runningCountSoFar(drill)).toBe(runningCount(qCards(drill).slice(0, 3)));
  });

  test('expectedAnswer throws past the end', () => {
    const drill = createDrill(L1, 1, T0);
    expect(() => expectedAnswer(drill, 999)).toThrow('No question');
  });
});

describe('ISC-105: strategy drill', () => {
  test('each question carries a hand + dealer upcard and the book action as expected', () => {
    const drill = createDrill(STRAT, 77, T0);
    expect(drill.questions).toHaveLength(STRAT.cardsPerSession);
    for (const q of drill.questions) {
      expect(q.kind).toBe('strategy');
      expect(q.hand).toHaveLength(2);
      expect(q.dealerUp).toBeDefined();
      const expected = resolveAction(basicStrategyAction(q.hand!, q.dealerUp!.rank, DEFAULT_RULES), {
        canDouble: true,
        canSurrender: false,
      });
      expect(q.expected).toBe(expected);
      expect(['H', 'S', 'D', 'P']).toContain(q.expected);
    }
  });

  test('answering the book action scores correct', () => {
    let drill = createDrill(STRAT, 5, T0);
    const q = currentQuestion(drill)!;
    drill = answer(drill, q.expected, T0 + 1000);
    expect(drill.answers[0]!.correct).toBe(true);
  });
});

describe('ISC-105: true-count drill', () => {
  test('each question gives RC + decks and the floored true count, kept in button range', () => {
    const drill = createDrill(TC, 33, T0);
    expect(drill.questions).toHaveLength(TC.cardsPerSession);
    for (const q of drill.questions) {
      expect(q.kind).toBe('true-count');
      expect(q.runningCount).toBeDefined();
      expect(q.decksRemaining).toBeGreaterThan(0);
      expect(q.expected).toBe(String(trueCountFloored(q.runningCount!, q.decksRemaining!)));
      const n = Number(q.expected);
      expect(n).toBeGreaterThanOrEqual(-3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  test('tapping the right number scores correct, wrong number misses', () => {
    let drill = createDrill(TC, 9, T0);
    const q = currentQuestion(drill)!;
    drill = answer(drill, Number(q.expected), T0 + 1000);
    expect(drill.answers[0]!.correct).toBe(true);
    const q2 = currentQuestion(drill)!;
    drill = answer(drill, Number(q2.expected) + 1, T0 + 2000);
    expect(drill.answers[1]!.correct).toBe(false);
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
