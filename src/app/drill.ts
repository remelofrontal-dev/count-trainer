/**
 * Drill session state machine — pure, clock-injected, fully testable.
 * Two-minute loops (brief §4.2): hard cap at 120s.
 *
 * Generalized to four question kinds (one engine, many drills):
 *   card-tag / running-count → answer is the Hi-Lo tag (count zones)
 *   strategy                 → answer is a book action (Hit/Stand/Double/Split)
 *   true-count               → answer is the true count (a number)
 * Answers are normalized to strings so grading is uniform across kinds.
 */

import { Shoe, mulberry32 } from '../engine/deck';
import { countValue, runningCount, trueCountFloored } from '../engine/counting';
import { basicStrategyAction, resolveAction } from '../engine/basicStrategy';
import { isBlackjack } from '../engine/hand';
import { accuracy as accuracyRatio, applyPeekPenalty, casinoReadyV1 } from '../engine/scoring';
import { DEFAULT_RULES, RANKS, SUITS, type Card } from '../engine/types';
import type { DrillMode, LevelDef } from './levels';

export const SESSION_CAP_MS = 120_000;

/** Normalized answer: count "-1"/"0"/"1", action "H"/"S"/"D"/"P", true count "2"/"-1"… */
export type AnswerValue = string;

export interface DrillQuestion {
  kind: DrillMode;
  card?: Card; // count modes
  hand?: Card[]; // strategy
  dealerUp?: Card; // strategy
  runningCount?: number; // true-count
  decksRemaining?: number; // true-count
  expected: AnswerValue;
}

export interface AnswerRecord {
  question: DrillQuestion;
  answer: AnswerValue;
  correct: boolean;
  latencyMs: number;
}

export interface DrillState {
  status: 'running' | 'finished';
  level: LevelDef;
  questions: DrillQuestion[];
  index: number;
  answers: AnswerRecord[];
  peeks: number;
  startedAtMs: number;
  lastDealAtMs: number;
}

export interface SessionResult {
  levelId: string;
  accuracy: number;
  avgMsPerCard: number;
  peeks: number;
  /** Casino Ready v1 composite for this session, peek-penalized. */
  score: number;
  cardsAnswered: number;
  misses: number;
}

export function normalize(value: number | string): AnswerValue {
  return typeof value === 'number' ? String(value) : value;
}

/** Expected answer for the question at `index` (already normalized). */
export function expectedAnswer(state: DrillState, index: number): AnswerValue {
  const q = state.questions[index];
  if (q === undefined) {
    throw new Error(`No question at index ${index}`);
  }
  return q.expected;
}

/** Current question on the felt; undefined when finished. */
export function currentQuestion(state: DrillState): DrillQuestion | undefined {
  return state.status === 'running' ? state.questions[state.index] : undefined;
}

/** Current card (count modes only); undefined otherwise. */
export function currentCard(state: DrillState): Card | undefined {
  return currentQuestion(state)?.card;
}

/** Running count through the count-mode cards answered so far — what peek reveals. */
export function runningCountSoFar(state: DrillState): number {
  const cards = state.questions
    .slice(0, state.index)
    .map((q) => q.card)
    .filter((c): c is Card => c !== undefined);
  return runningCount(cards);
}

function randCard(rng: () => number): Card {
  const rank = RANKS[Math.floor(rng() * RANKS.length)] as Card['rank'];
  const suit = SUITS[Math.floor(rng() * SUITS.length)] as Card['suit'];
  return { rank, suit };
}

function buildQuestions(level: LevelDef, seed: number): DrillQuestion[] {
  const rng = mulberry32(seed);
  const n = level.cardsPerSession;
  const qs: DrillQuestion[] = [];

  if (level.mode === 'card-tag' || level.mode === 'running-count') {
    const shoe = new Shoe(1, { seed, penetration: 1 });
    for (let i = 0; i < n; i++) {
      const card = shoe.draw();
      qs.push({ kind: level.mode, card, expected: normalize(countValue(card.rank)) });
    }
    return qs;
  }

  if (level.mode === 'strategy') {
    for (let i = 0; i < n; i++) {
      let hand: Card[];
      do {
        hand = [randCard(rng), randCard(rng)];
      } while (isBlackjack(hand)); // skip naturals — no decision to make
      const dealerUp = randCard(rng);
      const action = resolveAction(basicStrategyAction(hand, dealerUp.rank, DEFAULT_RULES), {
        canDouble: true,
        canSurrender: false,
      });
      qs.push({ kind: 'strategy', hand, dealerUp, expected: action });
    }
    return qs;
  }

  // true-count
  for (let i = 0; i < n; i++) {
    let rc = 0;
    let decks = 1;
    let tc = 0;
    let tries = 0;
    do {
      rc = Math.floor(rng() * 25) - 12; // -12..+12
      decks = (Math.floor(rng() * 12) + 1) / 2; // 0.5..6.0 in half-deck steps
      tc = trueCountFloored(rc, decks);
      tries++;
    } while ((tc < -3 || tc > 5) && tries < 20); // keep answers in the button range
    qs.push({ kind: 'true-count', runningCount: rc, decksRemaining: decks, expected: normalize(tc) });
  }
  return qs;
}

export function createDrill(level: LevelDef, seed: number, nowMs: number): DrillState {
  return {
    status: 'running',
    level,
    questions: buildQuestions(level, seed),
    index: 0,
    answers: [],
    peeks: 0,
    startedAtMs: nowMs,
    lastDealAtMs: nowMs,
  };
}

/** Answer the current question. Grades, records latency, advances; finishes after the last. */
export function answer(state: DrillState, value: number | string, nowMs: number): DrillState {
  if (state.status !== 'running') {
    return state;
  }
  const q = state.questions[state.index] as DrillQuestion;
  const normalized = normalize(value);
  const record: AnswerRecord = {
    question: q,
    answer: normalized,
    correct: normalized === q.expected,
    latencyMs: Math.max(0, nowMs - state.lastDealAtMs),
  };
  const nextIndex = state.index + 1;
  const finished = nextIndex >= state.questions.length;
  return {
    ...state,
    status: finished ? 'finished' : 'running',
    index: nextIndex,
    answers: [...state.answers, record],
    lastDealAtMs: nowMs,
  };
}

/** "Count hidden — tap to peek (−5 pts)". */
export function peek(state: DrillState): DrillState {
  if (state.status !== 'running') {
    return state;
  }
  return { ...state, peeks: state.peeks + 1 };
}

/** Clock tick: enforce the 120s two-minute-loop cap. */
export function tick(state: DrillState, nowMs: number): DrillState {
  if (state.status === 'running' && nowMs - state.startedAtMs >= SESSION_CAP_MS) {
    return { ...state, status: 'finished' };
  }
  return state;
}

export function remainingMs(state: DrillState, nowMs: number): number {
  return Math.max(0, SESSION_CAP_MS - (nowMs - state.startedAtMs));
}

export function sessionResult(state: DrillState): SessionResult {
  const total = state.answers.length;
  const correct = state.answers.filter((a) => a.correct).length;
  const acc = accuracyRatio(correct, total);
  const avgMs = total === 0 ? 0 : state.answers.reduce((sum, a) => sum + a.latencyMs, 0) / total;
  const base = total === 0 ? 0 : casinoReadyV1({ accuracy: acc, avgMsPerCard: avgMs });
  return {
    levelId: state.level.id,
    accuracy: acc,
    avgMsPerCard: avgMs,
    peeks: state.peeks,
    score: applyPeekPenalty(base, state.peeks),
    cardsAnswered: total,
    misses: total - correct,
  };
}
