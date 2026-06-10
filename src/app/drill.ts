/**
 * Drill session state machine — pure, clock-injected, fully testable.
 * Two-minute loops (brief §4.2): hard cap at 120s.
 */

import { Shoe } from '../engine/deck';
import { countValue, runningCount } from '../engine/counting';
import { accuracy as accuracyRatio, applyPeekPenalty, casinoReadyV1 } from '../engine/scoring';
import type { Card } from '../engine/types';
import type { LevelDef } from './levels';

export const SESSION_CAP_MS = 120_000;

export interface AnswerRecord {
  card: Card;
  answer: number;
  correct: boolean;
  latencyMs: number;
}

export interface DrillState {
  status: 'running' | 'finished';
  level: LevelDef;
  cards: Card[];
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

/**
 * Expected answer for the card at `index`: the Hi-Lo tag, in every mode.
 * The count zones (−1/0/+1) are THE interaction (mockup screen 02) — in
 * running-count levels the user still taps tags; the app accumulates the
 * count, which stays hidden behind the peek (−5) affordance.
 */
export function expectedAnswer(state: DrillState, index: number): number {
  const card = state.cards[index];
  if (card === undefined) {
    throw new Error(`No card at index ${index}`);
  }
  return countValue(card.rank);
}

/** Running count through the cards answered so far — what peek reveals. */
export function runningCountSoFar(state: DrillState): number {
  return runningCount(state.cards.slice(0, state.index));
}

export function createDrill(level: LevelDef, seed: number, nowMs: number): DrillState {
  const shoe = new Shoe(1, { seed, penetration: 1 });
  const cards: Card[] = [];
  for (let i = 0; i < level.cardsPerSession; i++) {
    cards.push(shoe.draw());
  }
  return {
    status: 'running',
    level,
    cards,
    index: 0,
    answers: [],
    peeks: 0,
    startedAtMs: nowMs,
    lastDealAtMs: nowMs,
  };
}

/** Current card on the felt; undefined when finished. */
export function currentCard(state: DrillState): Card | undefined {
  return state.status === 'running' ? state.cards[state.index] : undefined;
}

/** Answer the current card. Grades, records latency, advances; finishes after the last card. */
export function answer(state: DrillState, value: number, nowMs: number): DrillState {
  if (state.status !== 'running') {
    return state;
  }
  const record: AnswerRecord = {
    card: state.cards[state.index] as Card,
    answer: value,
    correct: value === expectedAnswer(state, state.index),
    latencyMs: Math.max(0, nowMs - state.lastDealAtMs),
  };
  const nextIndex = state.index + 1;
  const finished = nextIndex >= state.cards.length;
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
  const avgMs =
    total === 0 ? 0 : state.answers.reduce((sum, a) => sum + a.latencyMs, 0) / total;
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
