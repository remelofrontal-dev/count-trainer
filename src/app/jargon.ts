/**
 * Progressive jargon (sibling of the cardName display layer). Every term has a
 * FULL and a SHORT form plus a one-to-two-line definition. Show the full form
 * until the player has either passed the level that teaches the concept OR seen
 * the term ~10 times; then collapse to the short form. Exposure is tracked in the
 * local profile so the app gets more concise as the player gets more fluent.
 */

import { gatesPassed, type ProgressState } from './progress';

export type Term = 'runningCount' | 'trueCount' | 'book' | 'record' | 'push' | 'chips';

export interface TermDef {
  full: string;
  short: string;
  /** Level whose mastery means the player "knows" this term (instant collapse). */
  teachingLevelId?: string;
  /** Tap-to-explain definition — max two lines. */
  define: string;
}

/** Collapse full→short after this many exposures (or on teaching-level mastery). */
export const JARGON_THRESHOLD = 10;

export const TERMS: Record<Term, TermDef> = {
  runningCount: {
    full: 'Running Count',
    short: 'RC',
    teachingLevelId: 'running-count-slow',
    define: 'Running Count — your running tally: +1 for low cards, −1 for tens and aces.',
  },
  trueCount: {
    full: 'True Count',
    short: 'TC',
    teachingLevelId: 'true-count',
    define: 'True Count — the running count divided by the decks left. This is what you bet on.',
  },
  book: {
    full: 'Book says',
    short: 'Book',
    teachingLevelId: 'basic-strategy',
    define: 'Book — the mathematically best basic-strategy play for this exact hand.',
  },
  record: {
    full: 'Wins · Losses · Pushes',
    short: 'W · L · P',
    define: 'Hands you won, lost, and pushed (tied) this session.',
  },
  push: {
    full: 'Push',
    short: 'Push',
    define: 'Push — a tie with the dealer. Your bet comes back; no win, no loss.',
  },
  chips: {
    full: 'Chips',
    short: 'Chips',
    define: 'Chips — your fictional practice bankroll. No real money is ever involved.',
  },
};

export function jargonForm(term: Term, progress: ProgressState): 'full' | 'short' {
  const def = TERMS[term];
  const known = def.teachingLevelId !== undefined && gatesPassed(progress).has(def.teachingLevelId);
  const seen = progress.jargonSeen[term] ?? 0;
  return known || seen >= JARGON_THRESHOLD ? 'short' : 'full';
}

/** The label to show right now (full until fluent, then short). */
export function jargonText(term: Term, progress: ProgressState): string {
  return jargonForm(term, progress) === 'short' ? TERMS[term].short : TERMS[term].full;
}

export function jargonDefinition(term: Term): string {
  return TERMS[term].define;
}
